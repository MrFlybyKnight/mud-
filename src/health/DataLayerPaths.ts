/**
 * Wearable Data Layer paths shared between the phone app and the watch.
 * Must stay in sync with wear/src/main/java/com/mud/wear/DataLayerPaths.kt.
 */

export const BIOMETRICS_PATH = '/mud/biometrics';
export const COMMANDS_PATH = '/mud/commands';
export const DISTRESS_PATH = '/mud/distress';
export const EMOTION_PATH = '/mud/emotion';
export const DISPLAY_MODE_PATH = '/mud/display_mode';
export const VOICE_PROFILE_PATH = '/mud/voice-profile';
export const SPEECH_DATA_PATH = '/mud/speech-data';

export interface VoiceProfile {
  /** Mean log-energy of the calibrated voice (dBFS-ish). */
  energyMean: number;
  /** Energy standard deviation. */
  energyStd: number;
  /** Dominant pitch in Hz from the calibration sample. */
  pitchHz: number;
  /** Pitch tolerance window in Hz. */
  pitchTolerance: number;
  /** Spectral centroid (Hz) of the user's voice. */
  centroidHz: number;
  /** When the profile was captured. */
  capturedAt: number;
}

export interface SpeechDataPacket {
  /** 0–100 — share of the last window classified as the user speaking. */
  speechPercentage: number;
  /** Total audio analysed in the window, ms. */
  windowMs: number;
  /** Audio milliseconds attributed to the user. */
  userSpeechMs: number;
  /** Unix epoch ms. */
  timestamp: number;
}

export type WatchDisplayMode = 'minimal' | 'standard' | 'full';
export type WatchActivityState = 'still' | 'walking' | 'running';

export interface BiometricPacket {
  /** Beats per minute, freshly sampled. */
  heartRate: number;
  /** Heart-rate variability (RMSSD) in milliseconds. */
  hrv: number;
  /** Unix epoch milliseconds. */
  timestamp: number;
  /** Coarse activity classification supplied by the watch. */
  activityState: WatchActivityState;
}

export type WatchCommand = 'start' | 'stop' | 'dnd_on' | 'dnd_off' | 'ack_distress';
