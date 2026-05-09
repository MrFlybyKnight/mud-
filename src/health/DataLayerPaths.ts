/**
 * Wearable Data Layer paths shared between the phone app and the watch.
 * Must stay in sync with wear/src/main/java/com/mud/wear/DataLayerPaths.kt.
 */

export const BIOMETRICS_PATH = '/mud/biometrics';
export const COMMANDS_PATH = '/mud/commands';
export const DISTRESS_PATH = '/mud/distress';
export const EMOTION_PATH = '/mud/emotion';

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
