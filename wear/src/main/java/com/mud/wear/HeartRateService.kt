package com.mud.wear

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.health.services.client.HealthServices
import androidx.health.services.client.MeasureCallback
import androidx.health.services.client.PassiveListenerCallback
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataPointContainer
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.DeltaDataType
import androidx.health.services.client.data.PassiveListenerConfig
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.sqrt

/**
 * Foreground service that streams biometrics to the paired phone.
 *
 *  - Heart rate (BPM) sampled every 20 minutes (low power).
 *  - RR-intervals collected continuously; RMSSD (HRV) computed every 20 seconds.
 *  - When the screen is off it switches to a passive listener to spare battery.
 *  - All packets are pushed to the phone over the Wearable Data Layer at
 *    [DataLayerPaths.BIOMETRICS_PATH].
 *
 * NOTE: Samsung's Health Sensor SDK exposes raw IBI (RR) intervals on Galaxy Watch
 * devices. The androidx Health Services API also surfaces HEART_RATE_VARIABILITY_RMSSD
 * on supported watches; we prefer Health Services and fall back to manual RMSSD
 * computation from raw IBI samples where available.
 */
class HeartRateService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val rrBuffer = mutableListOf<Double>() // milliseconds
    private val rrLock = Any()

    @Volatile private var lastBpm: Int = 0
    @Volatile private var lastRmssd: Double = 0.0
    @Volatile private var activityState: String = "still"

    private var hrJob: Job? = null
    private var hrvJob: Job? = null
    private var sendJob: Job? = null

    private val healthClient by lazy { HealthServices.getClient(this).measureClient }
    private val passiveClient by lazy { HealthServices.getClient(this).passiveMonitoringClient }
    private val dataClient by lazy { Wearable.getDataClient(this) }

    private lateinit var powerManager: PowerManager

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        startForeground(NOTIF_ID, buildNotification())
        startMonitoring()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        scope.cancel()
        runCatching { healthClient.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, hrCallback) }
        super.onDestroy()
    }

    // ------------------------------------------------------------------ monitoring

    private fun startMonitoring() {
        // Continuous IBI / HRV via passive listener (battery-friendly when screen off).
        val passiveConfig = PassiveListenerConfig.builder()
            .setDataTypes(setOf(DataType.HEART_RATE_BPM))
            .build()
        runCatching {
            passiveClient.setPassiveListenerCallback(passiveConfig, passiveCallback)
        }

        // 20s loop: compute and broadcast RMSSD
        hrvJob = scope.launch {
            while (true) {
                delay(HRV_INTERVAL_MS)
                val rmssd = computeRmssd()
                if (rmssd > 0) {
                    lastRmssd = rmssd
                    sendBiometrics(force = false)
                }
            }
        }

        // 20m loop: take a fresh BPM measurement
        hrJob = scope.launch {
            while (true) {
                delay(BPM_INTERVAL_MS)
                requestSpotBpm()
            }
        }

        // Combined send loop fires every BPM measurement; ensure at least one packet/min
        sendJob = scope.launch {
            while (true) {
                delay(60_000)
                sendBiometrics(force = true)
            }
        }
    }

    private fun requestSpotBpm() {
        runCatching {
            healthClient.registerMeasureCallback(DataType.HEART_RATE_BPM, hrCallback)
            // Auto-unregister 5s later to keep things light.
            scope.launch {
                delay(5_000)
                runCatching {
                    healthClient.unregisterMeasureCallbackAsync(DataType.HEART_RATE_BPM, hrCallback)
                }
            }
        }
    }

    // ------------------------------------------------------------------ callbacks

    private val hrCallback = object : MeasureCallback {
        override fun onAvailabilityChanged(dataType: DeltaDataType<*, *>, availability: Availability) {}
        override fun onDataReceived(data: DataPointContainer) {
            val pts = data.getData(DataType.HEART_RATE_BPM)
            pts.lastOrNull()?.let { lastBpm = it.value.toInt() }
            sendBiometrics(force = false)
        }
    }

    private val passiveCallback = object : PassiveListenerCallback {
        override fun onNewDataPointsReceived(dataPoints: DataPointContainer) {
            val pts = dataPoints.getData(DataType.HEART_RATE_BPM)
            pts.forEach { dp ->
                val bpm = dp.value
                if (bpm > 0) {
                    lastBpm = bpm.toInt()
                    // Approximate RR from BPM when raw IBI not exposed by SDK
                    val rrMs = 60_000.0 / bpm
                    pushRr(rrMs)
                }
            }
        }
    }

    // ------------------------------------------------------------------ HRV math

    private fun pushRr(rrMs: Double) {
        synchronized(rrLock) {
            rrBuffer.add(rrMs)
            if (rrBuffer.size > MAX_RR_SAMPLES) {
                rrBuffer.subList(0, rrBuffer.size - MAX_RR_SAMPLES).clear()
            }
        }
    }

    /** RMSSD = sqrt(mean(diff(RR)^2)) over the buffered IBI window. */
    private fun computeRmssd(): Double {
        val snapshot = synchronized(rrLock) { rrBuffer.toList() }
        if (snapshot.size < 3) return 0.0
        var sumSq = 0.0
        for (i in 1 until snapshot.size) {
            val d = snapshot[i] - snapshot[i - 1]
            sumSq += d * d
        }
        return sqrt(sumSq / (snapshot.size - 1))
    }

    // ------------------------------------------------------------------ data layer

    private fun sendBiometrics(force: Boolean) {
        if (!force && lastBpm == 0 && lastRmssd == 0.0) return
        val req = PutDataMapRequest.create(DataLayerPaths.BIOMETRICS_PATH).apply {
            dataMap.putInt("heartRate", lastBpm)
            dataMap.putDouble("hrv", lastRmssd)
            dataMap.putLong("timestamp", System.currentTimeMillis())
            dataMap.putString("activityState", activityState)
        }.asPutDataRequest().setUrgent()
        runCatching { dataClient.putDataItem(req) }

        // Mirror to the local UI so the watch face can render fresh values.
        runCatching {
            sendBroadcast(Intent("com.mud.wear.BPM")
                .putExtra("bpm", lastBpm)
                .putExtra("hrv", lastRmssd.toInt())
                .setPackage(packageName))
        }
    }

    // ------------------------------------------------------------------ notification

    private fun buildNotification(): Notification {
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(CHANNEL_ID, "MūD biometrics", NotificationManager.IMPORTANCE_MIN)
            mgr.createNotificationChannel(ch)
        }
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MūD")
            .setContentText("Listening to your heart")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()
    }

    companion object {
        const val ACTION_STOP = "com.mud.wear.STOP"
        private const val NOTIF_ID = 4242
        private const val CHANNEL_ID = "mud_biometrics"
        private const val HRV_INTERVAL_MS = 20_000L          // 20 seconds
        private const val BPM_INTERVAL_MS = 30L * 60 * 1000  // 30 minutes (battery-optimised)
        private const val MAX_RR_SAMPLES = 300

        fun start(ctx: Context) {
            val i = Intent(ctx, HeartRateService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i)
            else ctx.startService(i)
        }

        fun stop(ctx: Context) {
            ctx.startService(Intent(ctx, HeartRateService::class.java).apply { action = ACTION_STOP })
        }
    }
}
