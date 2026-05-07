import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { getEmotionColor } from '@/utils/emotionUtils';
import type { EmotionType } from '@/utils/emotionUtils';
import { cn } from '@/lib/utils';

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

// Module-level session cache keyed by uid. Survives unmounts within the
// session so re-renders never re-query Firestore.
const subcheckCache = new Map<string, { count: number; data: Subcheck[] }>();

const EmotionTimelineBar: React.FC<EmotionTimelineBarProps> = ({ onOpen, className }) => {
  const { uid } = useAuth();
  const { subcheckWriteCount } = useMonitoring();
  const [subchecks, setSubchecks] = useState<Subcheck[]>(() =>
    uid ? subcheckCache.get(uid)?.data ?? [] : [],
  );

  useEffect(() => {
    if (!uid) {
      setSubchecks([]);
      return;
    }
    // Empty-state shortcut: if no subcheck has been written this session and
    // we have no cache, render fully grey without hitting Firestore. The bar
    // will fetch the first time a subcheck is written (subcheckWriteCount>0).
    const cached = subcheckCache.get(uid);
    if (subcheckWriteCount === 0 && !cached) {
      return;
    }
    // Use cached version if it matches the current write count.
    if (cached && cached.count === subcheckWriteCount) {
      setSubchecks(cached.data);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, 'users', uid, 'subchecks'),
          orderBy('timestamp', 'desc'),
          limit(MAX_SEGMENTS),
        );
        const snap = await getDocs(q);
        const next: Subcheck[] = [];
        snap.forEach((d) => {
          const data = d.data() as { dominantEmotion?: EmotionType; timestamp?: { toDate?: () => Date } };
          next.push({
            id: d.id,
            dominantEmotion: (data.dominantEmotion as EmotionType) ?? 'neutral',
            timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date(),
          });
        });
        subcheckCache.set(uid, { count: subcheckWriteCount, data: next });
        if (!cancelled) setSubchecks(next);
      } catch (err) {
        console.warn('[EmotionTimelineBar] fetch error', err);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, subcheckWriteCount]);

  // Build an array of MAX_SEGMENTS slots, oldest → newest, padding empties.
  const ordered = [...subchecks].reverse();
  const padCount = Math.max(0, MAX_SEGMENTS - ordered.length);
  const slots: (Subcheck | null)[] = [
    ...Array.from({ length: padCount }, () => null),
    ...ordered,
  ];

  const Bar = (
    <div className="flex h-4 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-900/60">
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
