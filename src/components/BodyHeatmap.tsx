import React from 'react';
import { EmotionType } from '@/utils/emotionUtils';

type Region = 'head' | 'chest' | 'stomach' | 'shoulders' | 'arms' | 'legs';

// Activation intensity 0..1 per body region for each emotion.
const ACTIVATION: Record<EmotionType, Record<Region, number>> = {
  calm:          { head: 0.25, chest: 0.40, stomach: 0.20, shoulders: 0.15, arms: 0.15, legs: 0.10 },
  content:       { head: 0.30, chest: 0.50, stomach: 0.25, shoulders: 0.20, arms: 0.20, legs: 0.15 },
  happy:         { head: 0.65, chest: 0.80, stomach: 0.40, shoulders: 0.55, arms: 0.55, legs: 0.40 },
  excited:       { head: 0.85, chest: 0.95, stomach: 0.55, shoulders: 0.70, arms: 0.75, legs: 0.50 },
  anxious:       { head: 0.70, chest: 0.80, stomach: 0.90, shoulders: 0.60, arms: 0.45, legs: 0.30 },
  focused:       { head: 0.90, chest: 0.50, stomach: 0.30, shoulders: 0.45, arms: 0.40, legs: 0.20 },
  confident:     { head: 0.70, chest: 0.85, stomach: 0.40, shoulders: 0.65, arms: 0.55, legs: 0.45 },
  stressed:      { head: 0.90, chest: 0.85, stomach: 0.70, shoulders: 0.95, arms: 0.55, legs: 0.30 },
  angry:         { head: 0.95, chest: 0.90, stomach: 0.55, shoulders: 0.85, arms: 0.85, legs: 0.40 },
  overwhelmed:   { head: 0.95, chest: 0.95, stomach: 0.85, shoulders: 0.90, arms: 0.70, legs: 0.50 },
  uncomfortable: { head: 0.55, chest: 0.50, stomach: 0.65, shoulders: 0.55, arms: 0.30, legs: 0.25 },
  sad:           { head: 0.45, chest: 0.55, stomach: 0.40, shoulders: 0.30, arms: 0.20, legs: 0.20 },
  bored:         { head: 0.15, chest: 0.20, stomach: 0.20, shoulders: 0.15, arms: 0.10, legs: 0.10 },
  tired:         { head: 0.20, chest: 0.25, stomach: 0.20, shoulders: 0.15, arms: 0.10, legs: 0.10 },
  surprised:     { head: 0.95, chest: 0.85, stomach: 0.50, shoulders: 0.70, arms: 0.60, legs: 0.30 },
  neutral:       { head: 0.40, chest: 0.40, stomach: 0.40, shoulders: 0.40, arms: 0.35, legs: 0.30 },
};

// Map intensity to HSL: cool blue (low) → orange/red (high).
function colorFor(intensity: number): string {
  const i = Math.max(0, Math.min(1, intensity));
  // Hue: 220 (blue) → 0 (red). Sat/lightness scale up slightly with intensity.
  const hue = 220 - 220 * i;
  const sat = 70 + 20 * i;
  const light = 55 - 15 * i;
  const alpha = 0.55 + 0.4 * i;
  return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
}

interface BodyHeatmapProps {
  emotion: EmotionType;
  className?: string;
}

const BodyHeatmap: React.FC<BodyHeatmapProps> = ({ emotion, className }) => {
  const a = ACTIVATION[emotion] ?? ACTIVATION.neutral;

  return (
    <svg
      viewBox="0 0 120 200"
      className={className}
      role="img"
      aria-label={`Body heatmap for ${emotion}`}
    >
      <defs>
        {(['head','shoulders','chest','arms','stomach','legs'] as Region[]).map((r) => (
          <radialGradient key={r} id={`g-${r}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colorFor(a[r])} />
            <stop offset="100%" stopColor={colorFor(Math.max(0, a[r] - 0.35))} stopOpacity="0.1" />
          </radialGradient>
        ))}
      </defs>

      {/* Silhouette outline */}
      <g fill="hsl(217 32% 14%)" stroke="hsl(215 20% 45%)" strokeWidth="0.8">
        {/* head */}
        <circle cx="60" cy="20" r="13" />
        {/* neck */}
        <rect x="56" y="31" width="8" height="6" />
        {/* torso */}
        <path d="M38 40 Q60 34 82 40 L78 110 Q60 116 42 110 Z" />
        {/* arms */}
        <path d="M38 42 L26 90 L32 92 L44 50 Z" />
        <path d="M82 42 L94 90 L88 92 L76 50 Z" />
        {/* legs */}
        <path d="M44 110 L40 180 L52 182 L56 112 Z" />
        <path d="M76 110 L80 180 L68 182 L64 112 Z" />
      </g>

      {/* Heat overlays */}
      <g style={{ mixBlendMode: 'screen' }}>
        <ellipse cx="60" cy="20" rx="14" ry="14" fill={`url(#g-head)`} />
        <ellipse cx="60" cy="42" rx="26" ry="9" fill={`url(#g-shoulders)`} />
        <ellipse cx="60" cy="62" rx="22" ry="16" fill={`url(#g-chest)`} />
        <ellipse cx="60" cy="92" rx="20" ry="14" fill={`url(#g-stomach)`} />
        <ellipse cx="32" cy="68" rx="9" ry="22" fill={`url(#g-arms)`} />
        <ellipse cx="88" cy="68" rx="9" ry="22" fill={`url(#g-arms)`} />
        <ellipse cx="48" cy="150" rx="9" ry="32" fill={`url(#g-legs)`} />
        <ellipse cx="72" cy="150" rx="9" ry="32" fill={`url(#g-legs)`} />
      </g>
    </svg>
  );
};

export default BodyHeatmap;
