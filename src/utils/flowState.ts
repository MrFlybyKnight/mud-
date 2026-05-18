// flowState.ts — Easter-egg "Flow State" detection for MūD.
//
// SECRET 17th emotion. Intentionally NOT exported from emotionUtils and NOT
// included in ALL_EMOTIONS so it never shows up in documentation, settings
// dropdowns, history histograms, etc. It is discovered by the user organically.
//
// Detection criteria (ALL true simultaneously, sustained ≥5 consecutive
// 1-minute readings, i.e. ≥5 minutes):
//   • Heart rate within ±0.3σ of personal baseline (perfectly steady)
//   • HRV above the user's personal rolling average
//   • Natural speech rate between 130–160 WPM
//   • Speech percentage between 40–60%
//   • Voice tone index between 55–70

export const FLOW_GOLD = '#FFD700';
export const FLOW_REQUIRED_READINGS = 5; // ≥5 consecutive 1-minute readings

export interface FlowInputs {
  heartRate: number;
  baselineHeartRate: number;
  currentHrv: number | null;
  averageHrv: number | null;
  speechWpm: number;        // user's natural / live words-per-minute
  speechPercentage: number; // 0–100
  voiceTone: number;        // 0–100 tone index
}

/** Returns true if every Flow State criterion is met for this reading. */
export function meetsFlowCriteria(i: FlowInputs): boolean {
  if (!i.baselineHeartRate || i.baselineHeartRate <= 0) return false;
  const sigma = i.baselineHeartRate * 0.12;
  const hrSteady = Math.abs(i.heartRate - i.baselineHeartRate) <= sigma * 0.3;
  const hrvOk =
    i.currentHrv != null && i.averageHrv != null && i.currentHrv > i.averageHrv;
  const wpmOk = i.speechWpm >= 130 && i.speechWpm <= 160;
  const speechOk = i.speechPercentage >= 40 && i.speechPercentage <= 60;
  const toneOk = i.voiceTone >= 55 && i.voiceTone <= 70;
  return hrSteady && hrvOk && wpmOk && speechOk && toneOk;
}

// ---- Achievements ---------------------------------------------------------

export type FlowAchievementId =
  | 'first_flow'
  | 'flow_initiated'
  | 'deep_flow'
  | 'flow_master'
  | 'flow_athlete';

export interface FlowAchievement {
  id: FlowAchievementId;
  label: string;
  description: string;
}

export const FLOW_ACHIEVEMENTS: Record<FlowAchievementId, FlowAchievement> = {
  first_flow:     { id: 'first_flow',     label: 'First Flow',     description: 'Your first Flow State session.' },
  flow_initiated: { id: 'flow_initiated', label: 'Flow Initiated', description: 'Sustained Flow for 5+ minutes.' },
  deep_flow:      { id: 'deep_flow',      label: 'Deep Flow',      description: 'Sustained Flow for 15+ minutes.' },
  flow_master:    { id: 'flow_master',    label: 'Flow Master',    description: 'Sustained Flow for 30+ minutes.' },
  flow_athlete:   { id: 'flow_athlete',   label: 'Flow Athlete',   description: '3 Flow sessions in one week.' },
};

export interface FlowSessionLite {
  startedAt: number;       // epoch ms
  durationMinutes: number;
}

/** Compute earned achievement IDs from a session list (newest first or any order). */
export function computeEarnedAchievements(
  sessions: FlowSessionLite[],
): FlowAchievementId[] {
  if (sessions.length === 0) return [];
  const earned = new Set<FlowAchievementId>();
  earned.add('first_flow');
  const maxDur = sessions.reduce((m, s) => Math.max(m, s.durationMinutes), 0);
  if (maxDur >= 5)  earned.add('flow_initiated');
  if (maxDur >= 15) earned.add('deep_flow');
  if (maxDur >= 30) earned.add('flow_master');
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = sessions.filter((s) => s.startedAt >= weekAgo).length;
  if (recent >= 3) earned.add('flow_athlete');
  return Array.from(earned);
}

// ---- Local discovery flag -------------------------------------------------
// We persist "has the user ever entered Flow?" in localStorage so that the
// app can stay completely silent about Flow until first discovery.
const DISCOVERY_KEY = 'mud_flow_discovered_v1';

export function isFlowDiscovered(): boolean {
  try { return localStorage.getItem(DISCOVERY_KEY) === '1'; }
  catch { return false; }
}

export function markFlowDiscovered(): void {
  try { localStorage.setItem(DISCOVERY_KEY, '1'); } catch { /* ignore */ }
}
