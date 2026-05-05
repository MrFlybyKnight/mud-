import React, { useEffect, useState } from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import type { EmotionType } from '@/utils/emotionUtils';
import { cn } from '@/lib/utils';

const EMOTION_HEX: Record<EmotionType, string> = {
  calm:     '#22c55e', // green
  focused:  '#3b82f6', // blue
  anxious:  '#f97316', // orange
  stressed: '#ef4444', // red
  bored:    '#a855f7', // purple
  excited:  '#eab308', // yellow
  neutral:  '#94a3b8', // grey
};

const MAX_SEGMENTS = 18; // 6 hours at 20-min intervals

interface Subcheck {
  id: string;
  dominantEmotion: EmotionType;
  timestamp: Date;
}

interface EmotionTimelineBarProps {
  onOpen?: () => void;
  className?: string;
}

const EmotionTimelineBar: React.FC<EmotionTimelineBarProps> = ({ onOpen, className }) => {
  const { uid } = useAuth();
  const [subchecks, setSubchecks] = useState<Subcheck[]>([]);

  useEffect(() => {
    if (!uid) {
      setSubchecks([]);
      return;
    }
    const q = query(
      collection(db, 'users', uid, 'subchecks'),
      orderBy('timestamp', 'desc'),
      limit(MAX_SEGMENTS),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: Subcheck[] = [];
        snap.forEach((d) => {
          const data = d.data() as { dominantEmotion?: EmotionType; timestamp?: { toDate?: () => Date } };
          next.push({
            id: d.id,
            dominantEmotion: (data.dominantEmotion as EmotionType) ?? 'neutral',
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          });
        });
        setSubchecks(next);
      },
      (err) => console.warn('[EmotionTimelineBar] snapshot error', err),
    );
    return () => unsub();
  }, [uid]);

  // Build an array of MAX_SEGMENTS slots, oldest → newest, padding empties.
  const ordered = [...subchecks].reverse(); // chronological
  const padCount = Math.max(0, MAX_SEGMENTS - ordered.length);
  const slots: (Subcheck | null)[] = [
    ...Array.from({ length: padCount }, () => null),
    ...ordered,
  ];

  const Bar = (
    <div className="flex h-2 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-900/60">
      {slots.map((s, i) => (
        <div
          key={s ? s.id : `empty-${i}`}
          className="h-full flex-1"
          style={{ backgroundColor: s ? EMOTION_HEX[s.dominantEmotion] : 'transparent' }}
          title={s ? `${s.dominantEmotion} · ${s.timestamp.toLocaleTimeString()}` : 'No data'}
        />
      ))}
    </div>
  );

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">6h</span>
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label="Open emotion history"
            className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-full"
          >
            {Bar}
          </button>
        ) : (
          <div className="flex-1">{Bar}</div>
        )}
        <span className="text-[10px] uppercase tracking-wider text-slate-500">now</span>
      </div>
    </div>
  );
};

export default EmotionTimelineBar;
