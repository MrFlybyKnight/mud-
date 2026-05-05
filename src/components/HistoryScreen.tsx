import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import type { EmotionType } from '@/utils/emotionUtils';
import { ArrowLeft, ChevronDown, ChevronUp, Heart, MessageCircle, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const EMOTION_HEX: Record<EmotionType, string> = {
  calm: '#22c55e',
  focused: '#3b82f6',
  anxious: '#f97316',
  stressed: '#ef4444',
  bored: '#a855f7',
  excited: '#eab308',
  neutral: '#94a3b8',
};

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

interface DonutProps {
  data: { emotion: EmotionType; value: number }[];
  size?: number;
}
const Donut: React.FC<DonutProps> = ({ data, size = 72 }) => {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = size / 2;
  const inner = radius * 0.62;
  const cx = radius;
  const cy = radius;
  let acc = 0;
  const arcs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += d.value;
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const x0 = cx + radius * Math.cos(start);
      const y0 = cy + radius * Math.sin(start);
      const x1 = cx + radius * Math.cos(end);
      const y1 = cy + radius * Math.sin(end);
      const xi1 = cx + inner * Math.cos(end);
      const yi1 = cy + inner * Math.sin(end);
      const xi0 = cx + inner * Math.cos(start);
      const yi0 = cy + inner * Math.sin(start);
      const large = end - start > Math.PI ? 1 : 0;
      return {
        emotion: d.emotion,
        path: `M ${x0} ${y0} A ${radius} ${radius} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${inner} ${inner} 0 ${large} 0 ${xi0} ${yi0} Z`,
      };
    });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      {arcs.length === 0 ? (
        <circle cx={cx} cy={cy} r={radius} fill="hsl(var(--muted))" />
      ) : (
        arcs.map((a) => <path key={a.emotion} d={a.path} fill={EMOTION_HEX[a.emotion]} />)
      )}
    </svg>
  );
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ onBack }) => {
  const { uid } = useAuth();
  const { notifications } = useNotification();
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) {
      setCheckpoints([]);
      return;
    }
    const since = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000));
    const q = query(
      collection(db, 'users', uid, 'checkpoints'),
      where('timestamp', '>=', since),
      orderBy('timestamp', 'desc'),
      limit(48),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
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
        setCheckpoints(next);
      },
      (err) => console.warn('[History] snapshot error', err),
    );
    return () => unsub();
  }, [uid]);

  const summary = useMemo(() => {
    if (checkpoints.length === 0) {
      return { dominant: 'neutral' as EmotionType, avgHr: 0, breakdown: [] as { emotion: EmotionType; value: number }[] };
    }
    const counts: Record<string, number> = {};
    let hrSum = 0;
    let hrCount = 0;
    for (const c of checkpoints) {
      counts[c.dominantEmotion] = (counts[c.dominantEmotion] || 0) + 1;
      if (c.heartRate > 0) {
        hrSum += c.heartRate;
        hrCount += 1;
      }
    }
    let dominant: EmotionType = 'neutral';
    let best = 0;
    Object.entries(counts).forEach(([e, n]) => {
      if (n > best) { best = n; dominant = e as EmotionType; }
    });
    const breakdown = Object.entries(counts).map(([e, n]) => ({ emotion: e as EmotionType, value: n }));
    return { dominant, avgHr: hrCount ? Math.round(hrSum / hrCount) : 0, breakdown };
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
    <div className="fixed inset-0 z-30 flex flex-col bg-[hsl(222_47%_8%)] text-slate-100 animate-fade-in">
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 py-3 gap-3 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-200 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-base font-semibold">History</h1>
          <div className="w-14" />
        </header>

        {/* Summary */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shrink-0">
          <div className="flex items-center gap-4">
            <Donut data={summary.breakdown} />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Today</p>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: EMOTION_HEX[summary.dominant] }}
                />
                <span className="text-lg font-semibold capitalize">{summary.dominant}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Avg{' '}
                <span className="text-slate-200 tabular-nums">{summary.avgHr || '—'}</span> bpm ·{' '}
                <span className="text-slate-200 tabular-nums">{checkpoints.length}</span> entries
              </p>
            </div>
          </div>
        </section>

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4 pb-2">
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
                    const color = EMOTION_HEX[c.dominantEmotion];
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
      </div>
    </div>
  );
};

export default HistoryScreen;
