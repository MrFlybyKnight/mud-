/**
 * Health Connect integration for Android via Capacitor.
 *
 * This module gracefully degrades on iOS, web preview, or any environment
 * where Health Connect / Capacitor is unavailable. In those cases the
 * `isAvailable()` check returns false and callers fall back to the existing
 * simulated `generateHeartRate()` helper.
 *
 * The Capacitor plugin (`capacitor-health-connect`) is loaded dynamically so
 * the web bundle never breaks if it isn't installed.
 */

import { generateHeartRate } from '../utils/monitoringUtils';

export const HEALTH_CONNECT_PERMISSIONS = [
  'android.permission.health.READ_HEART_RATE',
  'android.permission.health.READ_HEART_RATE_VARIABILITY',
  'android.permission.health.READ_RESTING_HEART_RATE',
] as const;

const SIM_KEY = 'healthConnect.simulationMode';
const GRANTED_KEY = 'healthConnect.permissionsGranted';

type HCPlugin = {
  checkAvailability?: () => Promise<{ availability: string }>;
  requestHealthPermissions?: (opts: { read: string[]; write?: string[] }) => Promise<{ grantedPermissions: string[] }>;
  readRecords?: (opts: {
    type: string;
    timeRangeFilter: { type: 'between'; startTime: string; endTime: string };
  }) => Promise<{ records: Array<Record<string, unknown>> }>;
};

let cachedPlugin: HCPlugin | null | undefined; // undefined = not yet probed, null = unavailable

async function getPlugin(): Promise<HCPlugin | null> {
  if (cachedPlugin !== undefined) return cachedPlugin;
  try {
    // Only attempt on Android via Capacitor native runtime.
    const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } }).Capacitor;
    if (!cap?.isNativePlatform?.() || cap.getPlatform?.() !== 'android') {
      cachedPlugin = null;
      return null;
    }
    // Dynamic import keeps web builds from failing if plugin isn't installed.
    const moduleName = 'capacitor-health-connect';
    const mod = await import(/* @vite-ignore */ moduleName).catch(() => null) as { HealthConnect?: HCPlugin } | null;
    cachedPlugin = mod?.HealthConnect ?? null;
  } catch {
    cachedPlugin = null;
  }
  return cachedPlugin;
}

export async function isAvailable(): Promise<boolean> {
  const p = await getPlugin();
  if (!p?.checkAvailability) return false;
  try {
    const r = await p.checkAvailability();
    return r.availability === 'Available' || r.availability === 'available';
  } catch {
    return false;
  }
}

export function isSimulationMode(): boolean {
  try { return localStorage.getItem(SIM_KEY) === '1'; } catch { return false; }
}

export function setSimulationMode(on: boolean): void {
  try { localStorage.setItem(SIM_KEY, on ? '1' : '0'); } catch { /* noop */ }
}

export function hasGrantedPermissions(): boolean {
  try { return localStorage.getItem(GRANTED_KEY) === '1'; } catch { return false; }
}

export async function requestHealthConnectPermissions(): Promise<boolean> {
  const p = await getPlugin();
  if (!p?.requestHealthPermissions) {
    // Not available — treat as silently granted so the app keeps working in dev.
    setSimulationMode(true);
    try { localStorage.setItem(GRANTED_KEY, '1'); } catch { /* noop */ }
    return false;
  }
  try {
    const result = await p.requestHealthPermissions({ read: [...HEALTH_CONNECT_PERMISSIONS] });
    const granted = (result.grantedPermissions ?? []).length > 0;
    if (granted) {
      try { localStorage.setItem(GRANTED_KEY, '1'); } catch { /* noop */ }
      setSimulationMode(false);
    }
    return granted;
  } catch (e) {
    console.warn('[HealthConnect] permission request failed', e);
    return false;
  }
}

async function readRecordsInWindow(type: string, windowMinutes: number): Promise<Array<Record<string, unknown>> | null> {
  const p = await getPlugin();
  if (!p?.readRecords) return null;
  try {
    const end = new Date();
    const start = new Date(end.getTime() - windowMinutes * 60 * 1000);
    const r = await p.readRecords({
      type,
      timeRangeFilter: { type: 'between', startTime: start.toISOString(), endTime: end.toISOString() },
    });
    return r.records ?? [];
  } catch (e) {
    console.warn(`[HealthConnect] read ${type} failed`, e);
    return null;
  }
}

/** Latest heart rate (BPM) within the last 20 minutes, or null. */
export async function readLatestHeartRate(): Promise<number | null> {
  const records = await readRecordsInWindow('HeartRate', 20);
  if (!records || records.length === 0) return null;
  // Records contain `samples: [{ time, beatsPerMinute }]`
  let latestTime = 0;
  let latestBpm: number | null = null;
  for (const rec of records) {
    const samples = (rec.samples as Array<{ time: string; beatsPerMinute: number }>) ?? [];
    for (const s of samples) {
      const t = new Date(s.time).getTime();
      if (t > latestTime) { latestTime = t; latestBpm = s.beatsPerMinute; }
    }
  }
  return latestBpm;
}

/** Latest HRV reading (ms) within the last 20 minutes, or null. */
export async function readLatestHRV(): Promise<number | null> {
  const records = await readRecordsInWindow('HeartRateVariabilityRmssd', 20);
  if (!records || records.length === 0) return null;
  let latestTime = 0;
  let latestVal: number | null = null;
  for (const rec of records) {
    const t = new Date((rec.time as string) ?? (rec.endTime as string) ?? 0).getTime();
    const val = (rec.heartRateVariabilityMillis as number) ?? (rec.rmssd as number) ?? null;
    if (val != null && t > latestTime) { latestTime = t; latestVal = val; }
  }
  return latestVal;
}

/** Today's resting heart rate, or null. */
export async function readRestingHeartRate(): Promise<number | null> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const minutes = Math.max(1, Math.floor((Date.now() - start.getTime()) / 60000));
  const records = await readRecordsInWindow('RestingHeartRate', minutes);
  if (!records || records.length === 0) return null;
  let latestTime = 0;
  let latestBpm: number | null = null;
  for (const rec of records) {
    const t = new Date((rec.time as string) ?? 0).getTime();
    const bpm = (rec.beatsPerMinute as number) ?? null;
    if (bpm != null && t > latestTime) { latestTime = t; latestBpm = bpm; }
  }
  return latestBpm;
}

/**
 * Convenience helper: returns a real heart rate from Health Connect, or falls
 * back to the simulated value silently. Always returns a usable number.
 */
export async function readHeartRateOrSimulate(baseline: number, variance = 8): Promise<{ bpm: number; source: 'health-connect' | 'simulated' }> {
  if (!isSimulationMode()) {
    const bpm = await readLatestHeartRate();
    if (bpm != null) return { bpm, source: 'health-connect' };
  }
  return { bpm: generateHeartRate(baseline, variance), source: 'simulated' };
}
