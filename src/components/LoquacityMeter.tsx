import React, { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEmotionColor } from '@/utils/emotionUtils';

interface LoquacityMeterProps {
  className?: string;
}

// Base loquacity color (HSL) per ratio band
const baseColorFor = (ratio: number): string => {
  if (ratio <= 40) return 'hsl(146, 76%, 48%)'; // green
  if (ratio <= 60) return 'hsl(47, 100%, 60%)'; // yellow
  if (ratio <= 80) return 'hsl(22, 100%, 55%)'; // orange
  return 'hsl(0, 84%, 60%)'; // red
};

const textFor = (ratio: number) => {
  if (ratio <= 40) return 'text-emerald-300';
  if (ratio <= 60) return 'text-yellow-300';
  if (ratio <= 80) return 'text-orange-300';
  return 'text-red-300';
};

const LoquacityMeter: React.FC<LoquacityMeterProps> = ({ className }) => {
  const { uid } = useAuth();
  const { isMonitoring, currentEmotion } = useMonitoring();
  const [ratio, setRatio] = useState<number | null>(null);
  const [hasSpeech, setHasSpeech] = useState(false);

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

  const baseColor = baseColorFor(ratio);
  const emotionColor = currentEmotion ? getEmotionColor(currentEmotion) : null;
  // Blend: base loquacity color underneath, emotion tint at 30% on top.
  const fillBackground = emotionColor
    ? `linear-gradient(to right, ${baseColor}, ${baseColor}), linear-gradient(to right, ${emotionColor}, ${emotionColor})`
    : baseColor;

  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2', className)}>
      <div className="flex items-center gap-2">
        <Mic className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[11px] uppercase tracking-wider text-slate-400 flex-1">Talk ratio</span>
        <span className={cn('text-xs font-semibold tabular-nums', textFor(ratio))}>{ratio}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 relative"
          style={{
            width: `${Math.min(100, Math.max(0, ratio))}%`,
            background: baseColor,
          }}
        >
          {emotionColor && (
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: emotionColor, opacity: 0.3 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LoquacityMeter;
