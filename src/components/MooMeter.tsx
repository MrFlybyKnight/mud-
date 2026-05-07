import React from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEmotionColor } from '@/utils/emotionUtils';

interface MooMeterProps {
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

const MooMeter: React.FC<MooMeterProps> = ({ className }) => {
  // Use the live in-memory speechPercentage from MonitoringContext instead of
  // querying Firestore. No listener, no startup query.
  const { isMonitoring, currentEmotion, speechPercentage } = useMonitoring();
  const ratio = Math.round(speechPercentage ?? 0);

  // Hide entirely only when monitoring is paused / silent.
  if (!isMonitoring) return null;

  const r = ratio ?? 0;
  const isEmpty = r <= 0;
  const baseColor = baseColorFor(r);
  const emotionColor = !isEmpty && currentEmotion ? getEmotionColor(currentEmotion) : null;

  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2', className)}>
      <div className="flex items-center gap-2">
        <Mic className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-[11px] uppercase tracking-wider text-slate-400 flex-1">Moo Meter</span>
        <span className={cn('text-xs font-semibold tabular-nums', isEmpty ? 'text-slate-500' : textFor(r))}>{r}%</span>
      </div>
      <div className="mt-1.5 h-2 w-full rounded-full bg-slate-800 overflow-hidden">
        {!isEmpty && (
          <div
            className="h-full rounded-full transition-all duration-500 relative"
            style={{
              width: `${Math.min(100, Math.max(0, r))}%`,
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
        )}
      </div>
    </div>
  );
};

export default MooMeter;
