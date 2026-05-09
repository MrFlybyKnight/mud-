/**
 * Phone-side bridge that listens for biometric packets pushed from the MūD
 * Wear OS companion over the Android Wearable Data Layer.
 *
 * The native Android shell is expected to expose a small JS-bridge under
 * `window.MudWearBridge` with the following shape:
 *
 *   interface MudWearBridge {
 *     isWatchConnected(): boolean;
 *     sendCommand(cmd: string): void;
 *     // The bridge dispatches incoming packets via a global event.
 *   }
 *
 * Incoming biometric packets arrive as `CustomEvent<BiometricPacket>` on
 * `window` with the type `mud:biometrics`. Distress signals from the watch
 * arrive as `mud:distress`.
 *
 * If the bridge or watch is unavailable the receiver remains inert and the
 * caller's existing simulation (generateHeartRate / determineEmotion) keeps
 * running unchanged.
 */

import {
  BIOMETRICS_PATH,
  COMMANDS_PATH,
  DISTRESS_PATH,
  SPEECH_DATA_PATH,
  VOICE_PROFILE_PATH,
  type BiometricPacket,
  type SpeechDataPacket,
  type VoiceProfile,
  type WatchCommand,
} from './DataLayerPaths';

type BiometricListener = (packet: BiometricPacket) => void;
type SpeechListener = (packet: SpeechDataPacket) => void;
type DistressListener = () => void;

interface MudWearBridge {
  isWatchConnected?: () => boolean;
  sendCommand?: (path: string, cmd: string) => void;
  putDataItem?: (path: string, payload: Record<string, unknown>) => void;
}

declare global {
  interface Window {
    MudWearBridge?: MudWearBridge;
  }
}

const STALE_PACKET_MS = 90_000; // a packet older than 90s is considered stale

class WearDataReceiver {
  private bioListeners = new Set<BiometricListener>();
  private speechListeners = new Set<SpeechListener>();
  private distressListeners = new Set<DistressListener>();
  private lastPacket: BiometricPacket | null = null;
  private lastSpeech: SpeechDataPacket | null = null;
  private bound = false;

  /** Whether the watch is currently reachable. */
  isConnected(): boolean {
    if (typeof window === 'undefined') return false;
    if (!window.MudWearBridge?.isWatchConnected?.()) return false;
    if (!this.lastPacket) return false;
    return Date.now() - this.lastPacket.timestamp < STALE_PACKET_MS;
  }

  /** Latest biometric packet, or null when none/stale. */
  getLatest(): BiometricPacket | null {
    if (!this.lastPacket) return null;
    if (Date.now() - this.lastPacket.timestamp > STALE_PACKET_MS) return null;
    return this.lastPacket;
  }

  /** Latest filtered-speech packet from the watch, or null when none/stale. */
  getLatestSpeech(): SpeechDataPacket | null {
    if (!this.lastSpeech) return null;
    if (Date.now() - this.lastSpeech.timestamp > STALE_PACKET_MS) return null;
    return this.lastSpeech;
  }

  onBiometrics(cb: BiometricListener): () => void {
    this.ensureBound();
    this.bioListeners.add(cb);
    return () => this.bioListeners.delete(cb);
  }

  onSpeech(cb: SpeechListener): () => void {
    this.ensureBound();
    this.speechListeners.add(cb);
    return () => this.speechListeners.delete(cb);
  }

  onDistress(cb: DistressListener): () => void {
    this.ensureBound();
    this.distressListeners.add(cb);
    return () => this.distressListeners.delete(cb);
  }

  /** Send a control command down to the watch (start/stop monitoring, DND…). */
  sendCommand(cmd: WatchCommand): boolean {
    const bridge = typeof window !== 'undefined' ? window.MudWearBridge : undefined;
    if (!bridge?.sendCommand) return false;
    try {
      bridge.sendCommand(COMMANDS_PATH, cmd);
      return true;
    } catch (err) {
      console.warn('[wearDataReceiver] sendCommand failed', err);
      return false;
    }
  }

  /**
   * Push the user's voice fingerprint to the watch so VoiceFilterService can
   * decide which mic frames belong to the user. Call this whenever calibration
   * completes or the profile changes.
   */
  pushVoiceProfile(profile: VoiceProfile): boolean {
    const bridge = typeof window !== 'undefined' ? window.MudWearBridge : undefined;
    if (!bridge?.putDataItem) return false;
    try {
      bridge.putDataItem(VOICE_PROFILE_PATH, profile as unknown as Record<string, unknown>);
      return true;
    } catch (err) {
      console.warn('[wearDataReceiver] pushVoiceProfile failed', err);
      return false;
    }
  }

  // -------------------------------------------------------------- internals

  private ensureBound() {
    if (this.bound || typeof window === 'undefined') return;
    this.bound = true;

    window.addEventListener('mud:biometrics', (ev: Event) => {
      const packet = (ev as CustomEvent<BiometricPacket>).detail;
      if (!packet || typeof packet.heartRate !== 'number') return;
      this.lastPacket = packet;
      this.bioListeners.forEach((cb) => {
        try { cb(packet); } catch (err) { console.warn('[wearDataReceiver] listener error', err); }
      });
    });

    window.addEventListener('mud:speech', (ev: Event) => {
      const packet = (ev as CustomEvent<SpeechDataPacket>).detail;
      if (!packet || typeof packet.speechPercentage !== 'number') return;
      this.lastSpeech = packet;
      this.speechListeners.forEach((cb) => {
        try { cb(packet); } catch (err) { console.warn('[wearDataReceiver] speech listener error', err); }
      });
    });

    window.addEventListener('mud:distress', () => {
      this.distressListeners.forEach((cb) => {
        try { cb(); } catch (err) { console.warn('[wearDataReceiver] distress listener error', err); }
      });
    });
  }
}

export const wearDataReceiver = new WearDataReceiver();

// Re-export path constants for convenience so callers don't have to import twice.
export { BIOMETRICS_PATH, COMMANDS_PATH, DISTRESS_PATH, SPEECH_DATA_PATH, VOICE_PROFILE_PATH };
export type { BiometricPacket, SpeechDataPacket, VoiceProfile, WatchCommand };

/**
 * Convenience helper for MonitoringContext: subscribe to live watch data.
 * Returns an unsubscribe fn plus an `isConnected()` probe so the caller can
 * fall back to simulation when the watch is unreachable.
 */
export function subscribeToWatchBiometrics(cb: BiometricListener) {
  const off = wearDataReceiver.onBiometrics(cb);
  return {
    unsubscribe: off,
    isConnected: () => wearDataReceiver.isConnected(),
    latest: () => wearDataReceiver.getLatest(),
  };
}

/**
 * Subscribe to filtered speech-percentage packets streamed by the watch's
 * VoiceFilterService. Only frames matching the user's voice fingerprint are
 * counted, so this replaces the phone mic's unfiltered detection for the
 * Moo Meter when the watch is connected.
 */
export function subscribeToWatchSpeech(cb: SpeechListener) {
  const off = wearDataReceiver.onSpeech(cb);
  return {
    unsubscribe: off,
    isConnected: () => wearDataReceiver.isConnected(),
    latest: () => wearDataReceiver.getLatestSpeech(),
  };
}

