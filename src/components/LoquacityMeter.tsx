import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoquacityMeterProps {
  className?: string;
}

const colorFor = (ratio: number) => {
  if (ratio <= 40) return 'bg-emerald-500';
  if (ratio <= 60) return 'bg-yellow-400';
  if (ratio <= 80) return 'bg-orange-500';
  return 'bg-red-500';
};

const textFor = (ratio: number) => {
  if (ratio <= 40) return 'text-emerald-300';
  if (ratio <= 60) return 'text-yellow-300';
  if (ratio <= 80) return 'text-orange-300';
  return 'text-red-300';
};

const LoquacityMeter: React.FC<LoquacityMeterProps> = ({ className }) => {
  const { uid } = useAuth();
  const { isMonitoring } = useMonitoring();
  const [ratio, setRatio] = useState<number | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);

  // Read latest subcheck — refreshes only when a new one is written (every 20 min)
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'users', uid, 'subchecks'),
      orderBy('timestamp', 'desc'),
      limit(1),
    );
    const unsub = onSnapshot(q, (snap) => {
      const d = snap.docs[0]?.data() as { talkRatio?: number; speechRate?: number } | undefined;
      if (!d) {
        setRatio(null);
        return;
      }
      const r = typeof d.talkRatio === 'number' ? d.talkRatio : Math.round(d.speechRate ?? 0);
      setRatio(r);
      if (r > 0) setHasSpeech(true);
    });
    return () => unsub();
  }, [uid]);

  if (!isMonitoring || !hasSpeech || ratio === null) return null;

  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2', className)}>
      <div className="flex items-center gap-2">
        <Mic className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[11px] uppercase tracking-wider text-slate-400 flex-1">Talk ratio</span>
        <span className={cn('text-xs font-semibold tabular-nums', textFor(ratio))}>{ratio}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', colorFor(ratio))}
          style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }}
        />
      </div>
    </div>
  );
};

export default LoquacityMeter;
