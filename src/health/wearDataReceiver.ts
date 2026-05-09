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
  type BiometricPacket,
  type WatchCommand,
} from './DataLayerPaths';

type BiometricListener = (packet: BiometricPacket) => void;
type DistressListener = () => void;

interface MudWearBridge {
  isWatchConnected?: () => boolean;
  sendCommand?: (path: string, cmd: string) => void;
}

declare global {
  interface Window {
    MudWearBridge?: MudWearBridge;
  }
}

const STALE_PACKET_MS = 90_000; // a packet older than 90s is considered stale

class WearDataReceiver {
  private bioListeners = new Set<BiometricListener>();
  private distressListeners = new Set<DistressListener>();
  private lastPacket: BiometricPacket | null = null;
  private bound = false;

  /** Whether the watch is currently reachable. */
  isConnected(): boolean {
    if (typeof window === 'undefined') return false;
    if (!window.MudWearBridge?.isWatchConnected?.()) return false;
    if (!this.lastPacket) return false;
    return Date.now() - this.lastPacket.timestamp < STALE_PACKET_MS;
  }

  /** Latest packet received, or null when none/stale. */
  getLatest(): BiometricPacket | null {
    if (!this.lastPacket) return null;
    if (Date.now() - this.lastPacket.timestamp > STALE_PACKET_MS) return null;
    return this.lastPacket;
  }

  onBiometrics(cb: BiometricListener): () => void {
    this.ensureBound();
    this.bioListeners.add(cb);
    return () => this.bioListeners.delete(cb);
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

  // -------------------------------------------------------------- internals

  private ensureBound() {
    if (this.bound || typeof window === 'undefined') return;
    this.bound = true;

    window.addEventListener('mud:biometrics', (ev: Event) => {
      const packet = (ev as CustomEvent<BiometricPacket>).detail;
      if (!packet || typeof packet.heartRate !== 'number') return;
      this.lastPacket = packet;
      this.bioListeners.forEach((cb) => {
        try {
          cb(packet);
        } catch (err) {
          console.warn('[wearDataReceiver] listener error', err);
        }
      });
    });

    window.addEventListener('mud:distress', () => {
      this.distressListeners.forEach((cb) => {
        try {
          cb();
        } catch (err) {
          console.warn('[wearDataReceiver] distress listener error', err);
        }
      });
    });
  }
}

export const wearDataReceiver = new WearDataReceiver();

// Re-export path constants for convenience so callers don't have to import twice.
export { BIOMETRICS_PATH, COMMANDS_PATH, DISTRESS_PATH };
export type { BiometricPacket, WatchCommand };

/**
 * Convenience helper for MonitoringContext: subscribe to live watch data and
 * receive a callback with `{ heartRate, hrv }`. Returns an unsubscribe fn plus
 * an `isConnected()` probe so the caller can fall back to simulation.
 *
 * Example wiring inside MonitoringContext:
 *
 *   useEffect(() => {
 *     const sub = subscribeToWatchBiometrics(({ heartRate, hrv, activityState }) => {
 *       setHeartRate(heartRate);
 *       setHrv(hrv);
 *       const primary = trancheEmotion({ heartRate, hrv, activityState, sentiment });
 *       setEmotion(primary);
 *     });
 *     return sub.unsubscribe;
 *   }, []);
 *
 *   // In the simulation tick:
 *   if (!sub.isConnected()) setHeartRate(generateHeartRate(baseline));
 */
export function subscribeToWatchBiometrics(cb: BiometricListener) {
  const off = wearDataReceiver.onBiometrics(cb);
  return {
    unsubscribe: off,
    isConnected: () => wearDataReceiver.isConnected(),
    latest: () => wearDataReceiver.getLatest(),
  };
}
