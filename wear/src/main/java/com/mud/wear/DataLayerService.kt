package com.mud.wear

import android.content.Intent
import android.util.Log
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.MessageEvent
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import com.google.android.gms.wearable.WearableListenerService

/**
 * Receives commands from the phone and forwards control events to [HeartRateService].
 *
 * Supported commands (sent as messages on [DataLayerPaths.COMMANDS_PATH]):
 *  - "start"   begin foreground monitoring
 *  - "stop"    tear down the foreground service
 *  - "dnd_on"  / "dnd_off"  toggle haptic feedback
 *  - "ack_distress"  acknowledge a distress signal originated from the watch
 */
class DataLayerService : WearableListenerService() {

    override fun onMessageReceived(event: MessageEvent) {
        val payload = String(event.data)
        Log.d(TAG, "msg ${event.path} = $payload")
        when (event.path) {
            DataLayerPaths.COMMANDS_PATH -> handleCommand(payload)
            DataLayerPaths.EMOTION_PATH -> broadcastEmotion(payload)
        }
    }

    override fun onDataChanged(events: DataEventBuffer) {
        events.forEach { ev ->
            if (ev.type == DataEvent.TYPE_CHANGED && ev.dataItem.uri.path == DataLayerPaths.EMOTION_PATH) {
                val map = DataMapItem.fromDataItem(ev.dataItem).dataMap
                val color = map.getString("color") ?: "#888"
                val name = map.getString("name") ?: "Calm"
                broadcastEmotion("$name|$color")
            }
        }
    }

    override fun onPeerDisconnected(peer: com.google.android.gms.wearable.Node) {
        Log.w(TAG, "Phone disconnected: ${peer.displayName}")
    }

    override fun onPeerConnected(peer: com.google.android.gms.wearable.Node) {
        Log.i(TAG, "Phone connected: ${peer.displayName}")
    }

    // ------------------------------------------------------------------ helpers

    private fun handleCommand(cmd: String) {
        when (cmd) {
            "start" -> HeartRateService.start(this)
            "stop" -> HeartRateService.stop(this)
            "dnd_on", "dnd_off", "ack_distress" -> {
                sendBroadcast(Intent(ACTION_COMMAND).putExtra(EXTRA_COMMAND, cmd).setPackage(packageName))
            }
        }
    }

    private fun broadcastEmotion(payload: String) {
        sendBroadcast(Intent(ACTION_EMOTION).putExtra(EXTRA_EMOTION, payload).setPackage(packageName))
    }

    companion object {
        private const val TAG = "MudDataLayer"
        const val ACTION_COMMAND = "com.mud.wear.COMMAND"
        const val ACTION_EMOTION = "com.mud.wear.EMOTION"
        const val EXTRA_COMMAND = "cmd"
        const val EXTRA_EMOTION = "emotion"

        /** Send a distress signal to the phone. */
        fun sendDistress(ctx: android.content.Context) {
            val req = PutDataMapRequest.create(DataLayerPaths.DISTRESS_PATH).apply {
                dataMap.putLong("timestamp", System.currentTimeMillis())
                dataMap.putString("source", "watch_long_press")
            }.asPutDataRequest().setUrgent()
            Wearable.getDataClient(ctx).putDataItem(req)
        }
    }
}
