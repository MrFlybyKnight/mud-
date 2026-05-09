package com.mud.wear

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.KeyEvent
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.runtime.Composable
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color as ComposeColor
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.wear.compose.material.Icon
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text

/**
 * Tiny Wear OS face for MūD.
 *  - Shows current emotion (color + name) pushed from the phone.
 *  - Shows latest BPM read from the local sensor service.
 *  - Long-press the bezel/crown (KEYCODE_STEM_PRIMARY held > 1s) to send a distress signal.
 *  - Vibrates whenever the emotion changes.
 */
class WearMainActivity : ComponentActivity() {

    private var emotionName by mutableStateOf("Calm")
    private var emotionColor by mutableStateOf(colorForEmotion("calm"))
    private var bpm by mutableStateOf(0)
    private var distressActive by mutableStateOf(false)
    private var dndActive by mutableStateOf(false)
    private var lastEmotionPayload: String = ""

    private var stemDownAt: Long = 0

    private val receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            when (intent.action) {
                DataLayerService.ACTION_EMOTION -> {
                    val payload = intent.getStringExtra(DataLayerService.EXTRA_EMOTION) ?: return
                    if (payload != lastEmotionPayload) {
                        lastEmotionPayload = payload
                        val parts = payload.split("|")
                        val name = parts.getOrNull(0) ?: emotionName
                        emotionName = name
                        // Prefer canonical map by emotion name; fall back to phone-supplied hex.
                        emotionColor = colorForEmotion(name)
                            ?: runCatching { ComposeColor(Color.parseColor(parts.getOrNull(1) ?: "")) }
                                .getOrDefault(emotionColor)
                        vibrate(40)
                    }
                }
                DataLayerService.ACTION_COMMAND -> {
                    when (intent.getStringExtra(DataLayerService.EXTRA_COMMAND)) {
                        "ack_distress" -> distressActive = false
                        "dnd_on" -> dndActive = true
                        "dnd_off" -> dndActive = false
                    }
                }
                ACTION_BPM -> bpm = intent.getIntExtra(EXTRA_BPM, bpm)
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make sure the sensor service is running while the watch face is active.
        HeartRateService.start(this)

        setContent {
            MaterialTheme {
                MudWatchFace(
                    name = emotionName,
                    color = emotionColor,
                    bpm = bpm,
                    distress = distressActive,
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter().apply {
            addAction(DataLayerService.ACTION_EMOTION)
            addAction(DataLayerService.ACTION_COMMAND)
            addAction(ACTION_BPM)
        }
        ContextCompat.registerReceiver(this, receiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    override fun onPause() {
        super.onPause()
        runCatching { unregisterReceiver(receiver) }
    }

    // ------------------------------------------------------------------ crown long press

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        if (isStemKey(keyCode)) {
            if (stemDownAt == 0L) stemDownAt = System.currentTimeMillis()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    override fun onKeyUp(keyCode: Int, event: KeyEvent): Boolean {
        if (isStemKey(keyCode)) {
            val held = System.currentTimeMillis() - stemDownAt
            stemDownAt = 0
            if (held > 1000) {
                DataLayerService.sendDistress(this)
                distressActive = true
                vibrate(250)
            }
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    private fun isStemKey(keyCode: Int) = keyCode == KeyEvent.KEYCODE_STEM_PRIMARY ||
        keyCode == KeyEvent.KEYCODE_STEM_1 ||
        keyCode == KeyEvent.KEYCODE_STEM_2 ||
        keyCode == KeyEvent.KEYCODE_STEM_3

    private fun vibrate(ms: Long) {
        val v = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            v.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION") v.vibrate(ms)
        }
    }

    companion object {
        const val ACTION_BPM = "com.mud.wear.BPM"
        const val EXTRA_BPM = "bpm"
    }
}

@Composable
private fun MudWatchFace(name: String, color: ComposeColor, bpm: Int, distress: Boolean) {
    // Smooth color transition between emotions (~700 ms cross-fade).
    val ringColor by animateColorAsState(
        targetValue = color,
        animationSpec = tween(durationMillis = 700, easing = LinearEasing),
        label = "ringColor",
    )

    // Slow pulse (alpha + stroke width) only while distress is active.
    val pulse = rememberInfiniteTransition(label = "distressPulse")
    val pulseAlpha by pulse.animateFloat(
        initialValue = 0.45f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulseAlpha",
    )
    val pulseStroke by pulse.animateFloat(
        initialValue = 1f,
        targetValue = 1.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulseStroke",
    )

    val baseStrokeDp = 8.dp
    val effectiveAlpha = if (distress) pulseAlpha else 1f
    val effectiveStrokeMul = if (distress) pulseStroke else 1f

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ComposeColor.Black),
        contentAlignment = Alignment.Center
    ) {
        // Full-screen circular bezel ring.
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokePx = baseStrokeDp.toPx() * effectiveStrokeMul
            val inset = strokePx / 2f
            val diameter = minOf(size.width, size.height) - strokePx
            val topLeft = Offset(
                x = (size.width - diameter) / 2f,
                y = (size.height - diameter) / 2f,
            )
            // Dim base ring so the active color reads even at low alpha.
            drawArc(
                color = ringColor.copy(alpha = 0.18f),
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = Size(diameter, diameter),
                style = Stroke(width = strokePx),
            )
            drawArc(
                color = ringColor.copy(alpha = effectiveAlpha),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = Size(diameter, diameter),
                style = Stroke(width = strokePx),
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            // MūD cow icon tinted with current emotion color.
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(ringColor, shape = androidx.compose.foundation.shape.CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("MūD", color = ComposeColor.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
            Text(name, color = ringColor, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
            Row(bpm)
        }
    }
}

@Composable
private fun Row(bpm: Int) {
    androidx.compose.foundation.layout.Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(Icons.Filled.Favorite, contentDescription = null, tint = ComposeColor(0xFFFF5C7A), modifier = Modifier.size(16.dp))
        Text(if (bpm > 0) "$bpm bpm" else "-- bpm", color = ComposeColor.White, fontSize = 16.sp)
    }
}
