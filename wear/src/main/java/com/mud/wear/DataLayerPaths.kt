package com.mud.wear

/**
 * Shared Data Layer paths between the watch and the phone.
 * Must stay in sync with src/health/DataLayerPaths.ts on the phone side.
 */
object DataLayerPaths {
    const val BIOMETRICS_PATH = "/mud/biometrics"
    const val COMMANDS_PATH = "/mud/commands"
    const val DISTRESS_PATH = "/mud/distress"
    const val EMOTION_PATH = "/mud/emotion"
    const val DISPLAY_MODE_PATH = "/mud/display_mode"
    const val VOICE_PROFILE_PATH = "/mud/voice-profile"
    const val SPEECH_DATA_PATH = "/mud/speech-data"
}
