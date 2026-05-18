import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useNotification } from '@/contexts/NotificationContext';
import type { EmotionType } from '@/utils/emotionUtils';
import { getEmotionColor, ALL_EMOTIONS } from '@/utils/emotionUtils';
import { ChevronDown, ChevronUp, Heart, MessageCircle, Activity, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  computeEarnedAchievements,
  FLOW_ACHIEVEMENTS,
  FLOW_GOLD,
  type FlowSessionLite,
} from '@/utils/flowState';

const EMOTION_ORDER: EmotionType[] = ALL_EMOTIONS;

interface Checkpoint {
  id: string;
  timestamp: Date;
  dominantEmotion: EmotionType;
  heartRate: number;
  speechRate: number;
  speechTime: number;
  subcheckCount: number;
  sigmaDeviation?: number;
}

interface HistoryScreenProps {
  onBack: () => void;
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const periodOf = (d: Date): 'This Morning' | 'This Afternoon' | 'This Evening' | 'Earlier Today' => {
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (!sameDay) return 'Earlier Today';
  const h = d.getHours();
  if (h < 12) return 'This Morning';
  if (h < 17) return 'This Afternoon';
  return 'This Evening';
};

// Module-level session cache keyed by uid. Avoids re-querying on remount or
// re-render. Bumped when subcheckWriteCount advances.
const checkpointCache = new Map<string, { count: number; data: Checkpoint[] }>();

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack: _onBack }) => {
  const { uid } = useAuth();
  const { subcheckWriteCount, flowSessionWriteCount, flowDiscovered } = useMonitoring();
  const { notifications } = useNotification();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(() =>
    uid ? checkpointCache.get(uid)?.data ?? [] : [],
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [flowSessions, setFlowSessions] = useState<Array<FlowSessionLite & { id: string }>>([]);

  useEffect(() => {
    if (!uid) {
      setCheckpoints([]);
      return;
    }
    // If no subchecks have been written this session AND there is no cache,
    // there is nothing to query — return empty immediately.
    const cached = checkpointCache.get(uid);
    if (subcheckWriteCount === 0 && !cached) {
      setCheckpoints([]);
      return;
    }
    if (cached && cached.count === subcheckWriteCount) {
      setCheckpoints(cached.data);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const since = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
        const q = query(
          collection(db, 'users', uid, 'checkpoints'),
          where('timestamp', '>=', since),
          orderBy('timestamp', 'desc'),
          limit(48),
        );
        const snap = await getDocs(q);
        const next: Checkpoint[] = [];
        snap.forEach((d) => {
          const data = d.data() as Partial<Checkpoint> & { timestamp?: { toDate?: () => Date } };
          next.push({
            id: d.id,
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
            dominantEmotion: (data.dominantEmotion as EmotionType) ?? 'neutral',
            heartRate: Math.round(data.heartRate ?? 0),
            speechRate: Math.round(data.speechRate ?? 0),
            speechTime: Math.round(data.speechTime ?? 0),
            subcheckCount: data.subcheckCount ?? 0,
            sigmaDeviation: data.sigmaDeviation,
          });
        });
        checkpointCache.set(uid, { count: subcheckWriteCount, data: next });
        if (!cancelled) setCheckpoints(next);
      } catch (err) {
        console.warn('[History] fetch error', err);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, subcheckWriteCount]);

  // Histogram: minutes per emotion today
  const histogram = useMemo(() => {
    const minutes: Partial<Record<EmotionType, number>> = {};
    for (const c of checkpoints) {
      const dur = (c.subcheckCount || 1) * 20;
      minutes[c.dominantEmotion] = (minutes[c.dominantEmotion] || 0) + dur;
    }
    const entries = EMOTION_ORDER
      .filter((e) => (minutes[e] || 0) > 0)
      .map((e) => ({ emotion: e, minutes: minutes[e] || 0 }));
    const max = entries.reduce((m, e) => Math.max(m, e.minutes), 0) || 1;
    return { entries, max };
  }, [checkpoints]);

  const grouped = useMemo(() => {
    const groups: Record<string, Checkpoint[]> = {
      'This Morning': [],
      'This Afternoon': [],
      'This Evening': [],
      'Earlier Today': [],
    };
    checkpoints.forEach((c) => groups[periodOf(c.timestamp)].push(c));
    return groups;
  }, [checkpoints]);

  const notificationsForCheckpoint = (c: Checkpoint) => {
    const start = c.timestamp.getTime() - 60 * 60 * 1000;
    const end = c.timestamp.getTime();
    return notifications.filter((n) => {
      const t = n.timestamp.getTime();
      return t >= start && t <= end;
    });
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 min-h-0 animate-fade-in">
      <header className="flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold">History</h1>
        <span className="text-[11px] uppercase tracking-widest text-slate-400">Last 24h</span>
      </header>

      {/* Scrollable call-log list */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
        {checkpoints.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-8">
            No checkpoints yet. They appear hourly as your day unfolds.
          </p>
        )}
        {(['This Morning', 'This Afternoon', 'This Evening', 'Earlier Today'] as const).map((label) => {
          const items = grouped[label];
          if (!items || items.length === 0) return null;
          return (
            <section key={label}>
              <h2 className="mb-1.5 text-[11px] uppercase tracking-widest text-slate-400">{label}</h2>
              <ul className="space-y-1.5">
                {items.map((c) => {
                  const isOpen = expanded === c.id;
                  const color = getEmotionColor(c.dominantEmotion);
                  const periodNotifs = notificationsForCheckpoint(c);
                  return (
                    <li
                      key={c.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
                      style={{ borderLeft: `3px solid ${color}` }}
                    >
                      <button
                        type="button"
                        onClick={() => setExpanded(isOpen ? null : c.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800/40 transition-colors"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium tabular-nums">{formatTime(c.timestamp)}</span>
                            <span className="text-xs capitalize text-slate-300">{c.dominantEmotion}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1">
                              <Heart className="h-3 w-3 text-rose-400" />
                              <span className="tabular-nums">{c.heartRate || '—'}</span> bpm
                            </span>
                            <span className="tabular-nums">{c.subcheckCount * 20} min</span>
                          </div>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="border-t border-slate-800 px-3 py-2.5 text-xs text-slate-300 space-y-1.5 animate-fade-in">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center gap-1.5">
                              <MessageCircle className="h-3.5 w-3.5 text-sky-400" />
                              <span className="text-slate-400">Speech rate</span>
                              <span className="ml-auto tabular-nums text-slate-100">
                                {c.speechRate || '—'} wpm
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-slate-400">Speech time</span>
                              <span className="ml-auto tabular-nums text-slate-100">
                                {c.speechTime || 0}s
                              </span>
                            </div>
                            <div className="col-span-2 flex items-center gap-1.5">
                              <span className="text-slate-400">σ deviation</span>
                              <span className="ml-auto tabular-nums text-slate-100">
                                {typeof c.sigmaDeviation === 'number' ? c.sigmaDeviation.toFixed(2) : '—'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <p className="text-slate-400 mb-1">Notifications this hour</p>
                            {periodNotifs.length === 0 ? (
                              <p className="text-slate-500 italic">None</p>
                            ) : (
                              <ul className="space-y-1">
                                {periodNotifs.map((n) => (
                                  <li key={n.id} className="flex items-start gap-1.5">
                                    <span
                                      className={cn(
                                        'mt-1 h-1.5 w-1.5 rounded-full shrink-0',
                                        n.priority === 'high'
                                          ? 'bg-red-500'
                                          : n.priority === 'medium'
                                          ? 'bg-amber-500'
                                          : 'bg-emerald-500',
                                      )}
                                    />
                                    <div>
                                      <p className="text-slate-200">{n.title}</p>
                                      <p className="text-slate-400">{n.message}</p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      {/* Pinned histogram */}
      <section className="shrink-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-3">
        <div className="flex items-end justify-between gap-2 h-20">
          {histogram.entries.length === 0 ? (
            <p className="w-full text-center text-xs text-slate-500">No emotion data yet today</p>
          ) : (
            histogram.entries.map((e) => {
              const heightPct = Math.max(8, (e.minutes / histogram.max) * 100);
              return (
                <div key={e.emotion} className="flex-1 flex flex-col items-center justify-end h-full">
                  <span className="text-[10px] tabular-nums text-slate-400 mb-1">{e.minutes}m</span>
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{
                      height: `${heightPct}%`,
                      backgroundColor: getEmotionColor(e.emotion),
                    }}
                  />
                </div>
              );
            })
          )}
        </div>
        {histogram.entries.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-slate-800">
            {histogram.entries.map((e) => (
              <div key={e.emotion} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getEmotionColor(e.emotion) }}
                />
                <span className="text-[11px] capitalize text-slate-300">{e.emotion}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default HistoryScreen;
