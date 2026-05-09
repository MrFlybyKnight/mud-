package com.mud.wear

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.google.android.gms.wearable.DataMap
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.ln
import kotlin.math.sqrt

/**
 * On-device voice fingerprint filter.
 *
 *  - Captures mic audio in short 50ms frames using [AudioRecord] (16kHz mono).
 *  - Computes per-frame log-energy, dominant pitch (via autocorrelation) and
 *    spectral centroid (via a tiny Goertzel sweep).
 *  - Compares each frame against the user's calibration profile pulled from
 *    the phone over the Wearable Data Layer at [DataLayerPaths.VOICE_PROFILE_PATH].
 *  - Frames matching the user's voice fingerprint are counted as "user speech";
 *    everything else (other speakers, ambient noise) is suppressed and never
 *    forwarded.
 *  - Every [WINDOW_MS] window we publish a [SpeechDataPacket] to
 *    [DataLayerPaths.SPEECH_DATA_PATH] so the phone can drive the Moo Meter.
 *
 * Raw audio NEVER leaves the watch — only an aggregate percentage is sent.
 */
class VoiceFilterService : Service() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val dataClient by lazy { Wearable.getDataClient(this) }

    @Volatile private var profile: VoiceProfile? = null
    @Volatile private var enabled: Boolean = true
    private var captureJob: Job? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIF_ID, buildNotification())
        loadProfileFromPhone()
        startCapture()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> { stopSelf(); return START_NOT_STICKY }
            ACTION_RELOAD_PROFILE -> loadProfileFromPhone()
            ACTION_PAUSE -> enabled = false
            ACTION_RESUME -> enabled = true
        }
        return START_STICKY
    }

    override fun onDestroy() {
        captureJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    // -------------------------------------------------------- voice profile

    /**
     * Pulls the user's voice fingerprint from the phone via the Data Layer.
     * The phone is expected to have written a DataItem at [VOICE_PROFILE_PATH]
     * after the user finished voice calibration.
     */
    private fun loadProfileFromPhone() {
        scope.launch {
            runCatching {
                val items = Wearable.getDataClient(this@VoiceFilterService)
                    .getDataItems(android.net.Uri.parse("wear://*${DataLayerPaths.VOICE_PROFILE_PATH}"))
                    .await()
                items.firstOrNull()?.let { item ->
                    val map = com.google.android.gms.wearable.DataMapItem.fromDataItem(item).dataMap
                    profile = VoiceProfile(
                        energyMean = map.getDouble("energyMean", -50.0),
                        energyStd = map.getDouble("energyStd", 6.0),
                        pitchHz = map.getDouble("pitchHz", 140.0),
                        pitchTolerance = map.getDouble("pitchTolerance", 35.0),
                        centroidHz = map.getDouble("centroidHz", 1500.0),
                    )
                }
            }
        }
    }

    // ----------------------------------------------------------- capture loop

    private fun startCapture() {
        captureJob = scope.launch {
            val minBuf = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT,
            ).coerceAtLeast(FRAME_SAMPLES * 2)

            val recorder = try {
                AudioRecord(
                    MediaRecorder.AudioSource.VOICE_RECOGNITION,
                    SAMPLE_RATE,
                    AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,
                    minBuf,
                )
            } catch (sec: SecurityException) {
                // RECORD_AUDIO not granted — bail quietly.
                stopSelf(); return@launch
            }

            if (recorder.state != AudioRecord.STATE_INITIALIZED) {
                recorder.release(); stopSelf(); return@launch
            }
            recorder.startRecording()

            val buf = ShortArray(FRAME_SAMPLES)
            var windowStart = System.currentTimeMillis()
            var userMs = 0
            var totalMs = 0

            try {
                while (isActive) {
                    val n = recorder.read(buf, 0, FRAME_SAMPLES)
                    if (n <= 0) continue
                    totalMs += FRAME_MS
                    if (enabled && matchesUserVoice(buf, n)) {
                        userMs += FRAME_MS
                    }
                    val now = System.currentTimeMillis()
                    if (now - windowStart >= WINDOW_MS) {
                        publishWindow(userMs, totalMs, now)
                        windowStart = now; userMs = 0; totalMs = 0
                    }
                }
            } finally {
                runCatching { recorder.stop() }
                recorder.release()
            }
        }
    }

    // -------------------------------------------------------- fingerprinting

    /**
     * Returns true if the frame's energy + pitch + centroid all sit inside the
     * user's calibrated tolerance window. If no profile is loaded yet we err
     * on the side of "unknown speaker" and suppress the frame.
     */
    private fun matchesUserVoice(buf: ShortArray, n: Int): Boolean {
        val p = profile ?: return false

        // Log-energy (dB-ish).
        var sumSq = 0.0
        for (i in 0 until n) { val v = buf[i].toDouble(); sumSq += v * v }
        val rms = sqrt(sumSq / n).coerceAtLeast(1.0)
        val energyDb = 20.0 * (ln(rms) / ln(10.0))

        // Below silence floor — not speech at all.
        if (energyDb < SILENCE_DB) return false
        if (abs(energyDb - p.energyMean) > 2.5 * p.energyStd) return false

        val pitch = estimatePitch(buf, n)
        if (pitch <= 0.0 || abs(pitch - p.pitchHz) > p.pitchTolerance) return false

        val centroid = spectralCentroid(buf, n)
        if (abs(centroid - p.centroidHz) > CENTROID_TOLERANCE) return false

        return true
    }

    /** Cheap autocorrelation pitch estimator over the typical voice range. */
    private fun estimatePitch(buf: ShortArray, n: Int): Double {
        val minLag = SAMPLE_RATE / 400 // 400 Hz
        val maxLag = SAMPLE_RATE / 70  // 70 Hz
        var bestLag = 0
        var bestScore = 0.0
        var lag = minLag
        while (lag <= maxLag && lag < n) {
            var acc = 0.0
            var i = 0
            while (i + lag < n) {
                acc += buf[i].toDouble() * buf[i + lag].toDouble(); i++
            }
            if (acc > bestScore) { bestScore = acc; bestLag = lag }
            lag++
        }
        return if (bestLag == 0) 0.0 else SAMPLE_RATE.toDouble() / bestLag
    }

    /** Approximate spectral centroid via Goertzel sweep across voice band. */
    private fun spectralCentroid(buf: ShortArray, n: Int): Double {
        var num = 0.0; var den = 0.0
        var f = 100; while (f <= 4000) {
            val mag = goertzel(buf, n, f.toDouble())
            num += mag * f; den += mag
            f += 100
        }
        return if (den == 0.0) 0.0 else num / den
    }

    private fun goertzel(buf: ShortArray, n: Int, freq: Double): Double {
        val w = 2.0 * Math.PI * freq / SAMPLE_RATE
        val coeff = 2.0 * Math.cos(w)
        var s0 = 0.0; var s1 = 0.0; var s2 = 0.0
        for (i in 0 until n) { s0 = buf[i] + coeff * s1 - s2; s2 = s1; s1 = s0 }
        return sqrt(s1 * s1 + s2 * s2 - coeff * s1 * s2)
    }

    // -------------------------------------------------------- data layer out

    private fun publishWindow(userMs: Int, totalMs: Int, ts: Long) {
        if (totalMs <= 0) return
        val pct = (userMs.toDouble() / totalMs * 100.0).coerceIn(0.0, 100.0)
        val req = PutDataMapRequest.create(DataLayerPaths.SPEECH_DATA_PATH).apply {
            dataMap.putDouble("speechPercentage", pct)
            dataMap.putInt("windowMs", totalMs)
            dataMap.putInt("userSpeechMs", userMs)
            dataMap.putLong("timestamp", ts)
        }.asPutDataRequest().setUrgent()
        runCatching { dataClient.putDataItem(req) }

        // Mirror locally so the watch face can show the live Moo Meter %.
        runCatching {
            sendBroadcast(Intent("com.mud.wear.SPEECH")
                .putExtra("pct", pct)
                .setPackage(packageName))
        }
    }

    // --------------------------------------------------------- notification

    private fun buildNotification(): Notification {
        val mgr = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            mgr.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "MūD voice filter", NotificationManager.IMPORTANCE_MIN)
            )
        }
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("MūD")
            .setContentText("Active Listening")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .build()
    }

    /** Local mirror of the phone-side VoiceProfile shape. */
    data class VoiceProfile(
        val energyMean: Double,
        val energyStd: Double,
        val pitchHz: Double,
        val pitchTolerance: Double,
        val centroidHz: Double,
    )

    companion object {
        const val ACTION_STOP = "com.mud.wear.voice.STOP"
        const val ACTION_RELOAD_PROFILE = "com.mud.wear.voice.RELOAD"
        const val ACTION_PAUSE = "com.mud.wear.voice.PAUSE"
        const val ACTION_RESUME = "com.mud.wear.voice.RESUME"

        private const val NOTIF_ID = 4243
        private const val CHANNEL_ID = "mud_voice_filter"
        private const val SAMPLE_RATE = 16_000
        private const val FRAME_MS = 50
        private const val FRAME_SAMPLES = SAMPLE_RATE * FRAME_MS / 1000 // 800
        private const val WINDOW_MS = 5_000L
        private const val SILENCE_DB = 35.0
        private const val CENTROID_TOLERANCE = 600.0

        fun start(ctx: Context) {
            val i = Intent(ctx, VoiceFilterService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(i)
            else ctx.startService(i)
        }

        fun stop(ctx: Context) {
            ctx.startService(Intent(ctx, VoiceFilterService::class.java).apply { action = ACTION_STOP })
        }

        fun reloadProfile(ctx: Context) {
            ctx.startService(Intent(ctx, VoiceFilterService::class.java).apply { action = ACTION_RELOAD_PROFILE })
        }
    }
}

// Tiny await() helper for Play Services Tasks used above.
private suspend fun <T> com.google.android.gms.tasks.Task<T>.await(): T =
    kotlinx.coroutines.tasks.await(this)
