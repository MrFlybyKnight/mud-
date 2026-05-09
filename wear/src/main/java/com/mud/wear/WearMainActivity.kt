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
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.ui.input.pointer.pointerInput
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
    private var emotionColor by mutableStateOf(colorForEmotion("calm") ?: ComposeColor(0xFF3FB984))
    private var bpm by mutableStateOf(0)
    private var hrv by mutableStateOf(0)
    private var distressActive by mutableStateOf(false)
    private var dndActive by mutableStateOf(false)
    private var displayMode by mutableStateOf("standard") // minimal | standard | full
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
                        emotionColor = colorForEmotion(name)
                            ?: runCatching { ComposeColor(Color.parseColor(parts.getOrNull(1) ?: "")) }
                                .getOrDefault(emotionColor)
                        if (!dndActive) vibrate(40)
                    }
                }
                DataLayerService.ACTION_COMMAND -> {
                    when (intent.getStringExtra(DataLayerService.EXTRA_COMMAND)) {
                        "ack_distress" -> distressActive = false
                        "dnd_on" -> dndActive = true
                        "dnd_off" -> dndActive = false
                    }
                }
                DataLayerService.ACTION_DISPLAY_MODE -> {
                    val mode = intent.getStringExtra(DataLayerService.EXTRA_DISPLAY_MODE)
                    if (mode in setOf("minimal", "standard", "full")) displayMode = mode!!
                }
                ACTION_BPM -> {
                    bpm = intent.getIntExtra(EXTRA_BPM, bpm)
                    hrv = intent.getIntExtra(EXTRA_HRV, hrv)
                }
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HeartRateService.start(this)

        setContent {
            MaterialTheme {
                MudWatchFace(
                    name = emotionName,
                    color = emotionColor,
                    bpm = bpm,
                    hrv = hrv,
                    distress = distressActive,
                    dnd = dndActive,
                    mode = displayMode,
                    onSwipeDown = { dndActive = !dndActive },
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        val filter = IntentFilter().apply {
            addAction(DataLayerService.ACTION_EMOTION)
            addAction(DataLayerService.ACTION_COMMAND)
            addAction(DataLayerService.ACTION_DISPLAY_MODE)
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
        const val EXTRA_HRV = "hrv"
    }
}

@Composable
private fun MudWatchFace(
    name: String,
    color: ComposeColor,
    bpm: Int,
    hrv: Int,
    distress: Boolean,
    dnd: Boolean,
    mode: String,
    onSwipeDown: () -> Unit,
) {
    val ringColor by animateColorAsState(
        targetValue = color,
        animationSpec = tween(durationMillis = 300, easing = LinearEasing),
        label = "ringColor",
    )

    val pulse = rememberInfiniteTransition(label = "distressPulse")
    val pulseAlpha by pulse.animateFloat(
        initialValue = 0.35f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "pulseAlpha",
    )

    val baseStrokeDp = 8.dp
    val dndMul = if (dnd) 0.4f else 1f
    val activeAlpha = (if (distress) pulseAlpha else 1f) * dndMul

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ComposeColor.Black)
            .pointerInput(Unit) {
                detectVerticalDragGestures { _, dragY ->
                    if (dragY > 18f) onSwipeDown()
                }
            },
        contentAlignment = Alignment.Center
    ) {
        // Bezel ring — always shown (this is the "minimal" mode)
        Canvas(modifier = Modifier.fillMaxSize()) {
            val strokePx = baseStrokeDp.toPx()
            val diameter = minOf(size.width, size.height) - strokePx
            val topLeft = Offset(
                x = (size.width - diameter) / 2f,
                y = (size.height - diameter) / 2f,
            )
            drawArc(
                color = ringColor.copy(alpha = activeAlpha),
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = Size(diameter, diameter),
                style = Stroke(width = strokePx),
            )
        }

        when (mode) {
            "minimal" -> {
                // Bezel only — keep center clean.
            }
            "full" -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .background(ringColor, shape = androidx.compose.foundation.shape.CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("MūD", color = ComposeColor.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(name, color = ringColor, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    BpmRow(bpm)
                    Text(
                        if (hrv > 0) "HRV ${hrv}ms" else "HRV --",
                        color = ComposeColor.White.copy(alpha = 0.8f),
                        fontSize = 12.sp,
                    )
                    if (dnd) Text("Silent", color = ComposeColor.White.copy(alpha = 0.6f), fontSize = 10.sp)
                }
            }
            else -> { // standard
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .background(ringColor, shape = androidx.compose.foundation.shape.CircleShape),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("MūD", color = ComposeColor.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    }
                    Text(name, color = ringColor, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    if (dnd) Text("Silent", color = ComposeColor.White.copy(alpha = 0.6f), fontSize = 10.sp)
                }
            }
        }
    }
}

private fun colorForEmotion(name: String?): ComposeColor? = when (name?.trim()?.lowercase()) {
    "calm" -> ComposeColor(0xFF3FB984)
    "excited" -> ComposeColor(0xFFFFD23F)
    "anxious", "anxiety" -> ComposeColor(0xFFFF8A3D)
    "stressed", "stress" -> ComposeColor(0xFFE5484D)
    "focused", "focus" -> ComposeColor(0xFF3D7CFF)
    "sad", "sadness" -> ComposeColor(0xFF6B7F99)
    "angry", "anger" -> ComposeColor(0xFFB3261E)
    "content" -> ComposeColor(0xFF8FBF6B)
    "neutral" -> ComposeColor(0xFF9AA0A6)
    else -> null
}

@Composable
private fun BpmRow(bpm: Int) {
    androidx.compose.foundation.layout.Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Icon(Icons.Filled.Favorite, contentDescription = null, tint = ComposeColor(0xFFFF5C7A), modifier = Modifier.size(16.dp))
        Text(if (bpm > 0) "$bpm bpm" else "-- bpm", color = ComposeColor.White, fontSize = 16.sp)
    }
}
