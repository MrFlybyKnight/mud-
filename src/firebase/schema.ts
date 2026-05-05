import { Timestamp } from "firebase/firestore";

/**
 * Firestore schema overview
 *
 * Top-level collection: `users/{uid}`
 *   - Stores a user profile document.
 *
 * Subcollections under each user:
 *   - `users/{uid}/watchMetrics/{metricId}`  → time-series watch readings
 *   - `users/{uid}/voiceSessions/{sessionId}` → voice/speech monitoring sessions
 *   - `users/{uid}/settings/{settingsId}`     → app/user settings (typically a single doc with id "app")
 *
 * All documents are owned by the authenticated user; security rules should
 * restrict reads/writes to `request.auth.uid == uid`.
 */

// -----------------------------
// User profile
// -----------------------------
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------
// Watch metrics (time-series)
// -----------------------------
export interface WatchMetric {
  /** Source device identifier (e.g. "apple-watch", "fitbit", "wear-os"). */
  device: string;
  /** When this reading was captured on the device. */
  recordedAt: Timestamp;
  /** When this reading was written to Firestore. */
  createdAt: Timestamp;
  /** Heart rate in beats per minute. */
  heartRate?: number;
  /** Heart-rate variability in milliseconds. */
  hrv?: number;
  /** Step count delta for this sample. */
  steps?: number;
  /** Calories burned for this sample. */
  calories?: number;
  /** Blood oxygen saturation (0–100). */
  spo2?: number;
  /** Skin temperature in °C. */
  skinTemperature?: number;
  /** Free-form metadata for device-specific fields. */
  metadata?: Record<string, unknown>;
}

// -----------------------------
// Voice / speech sessions
// -----------------------------
export type VoiceSessionStatus = "active" | "completed" | "error";

export interface VoiceSessionEmotion {
  /** e.g. "calm", "anxious", "angry", "sad", "happy". */
  label: string;
  /** Confidence score 0–1. */
  confidence: number;
}

export interface VoiceSession {
  /** When the recording / monitoring session started. */
  startedAt: Timestamp;
  /** When it ended (absent while still active). */
  endedAt?: Timestamp;
  /** Duration in seconds. */
  durationSeconds?: number;
  status: VoiceSessionStatus;
  /** Optional Storage path to the recorded audio. */
  audioStoragePath?: string;
  /** Optional speech-to-text transcript. */
  transcript?: string;
  /** Detected language code (e.g. "en-US"). */
  language?: string;
  /** Detected emotions over the session. */
  emotions?: VoiceSessionEmotion[];
  /** Aggregate voice metrics. */
  metrics?: {
    averagePitchHz?: number;
    averageVolumeDb?: number;
    speechRate?: number;
    stressScore?: number;
  };
  /** Free-form notes / tags. */
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// -----------------------------
// User settings
// -----------------------------
export interface UserSettings {
  /** Notification preferences. */
  notifications: {
    enabled: boolean;
    emergencyAlerts: boolean;
    dailySummary: boolean;
    quietHours?: { start: string; end: string }; // "HH:mm"
  };
  /** Monitoring preferences. */
  monitoring: {
    voiceMonitoringEnabled: boolean;
    heartRateMonitoringEnabled: boolean;
    sampleIntervalSeconds: number;
  };
  /** Privacy / data preferences. */
  privacy: {
    storeAudioRecordings: boolean;
    shareDataWithCaregivers: boolean;
    encryptionEnabled: boolean;
  };
  /** UI preferences. */
  ui: {
    theme: "light" | "dark" | "system";
    language: string; // BCP-47 tag
  };
  /** IDs of linked emergency contacts. */
  emergencyContactIds?: string[];
  updatedAt: Timestamp;
}

// -----------------------------
// Collection path helpers
// -----------------------------
export const collectionPaths = {
  users: () => "users",
  user: (uid: string) => `users/${uid}`,
  watchMetrics: (uid: string) => `users/${uid}/watchMetrics`,
  watchMetric: (uid: string, id: string) => `users/${uid}/watchMetrics/${id}`,
  voiceSessions: (uid: string) => `users/${uid}/voiceSessions`,
  voiceSession: (uid: string, id: string) => `users/${uid}/voiceSessions/${id}`,
  settings: (uid: string) => `users/${uid}/settings`,
  /** Conventionally a single "app" doc holds the user's settings. */
  appSettings: (uid: string) => `users/${uid}/settings/app`,
} as const;

// -----------------------------
// Default factories
// -----------------------------
export function defaultUserSettings(now: Timestamp): UserSettings {
  return {
    notifications: {
      enabled: true,
      emergencyAlerts: true,
      dailySummary: false,
    },
    monitoring: {
      voiceMonitoringEnabled: true,
      heartRateMonitoringEnabled: true,
      sampleIntervalSeconds: 60,
    },
    privacy: {
      storeAudioRecordings: false,
      shareDataWithCaregivers: false,
      encryptionEnabled: true,
    },
    ui: {
      theme: "system",
      language: "en-US",
    },
    emergencyContactIds: [],
    updatedAt: now,
  };
}
