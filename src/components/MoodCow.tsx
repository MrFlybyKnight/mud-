import React from 'react';
import { EmotionType } from '@/utils/emotionUtils';

const EMOTION_COLOR: Record<EmotionType, { body: string; spot: string; accent: string }> = {
  calm:     { body: '#7ED9A0', spot: '#3FA56B', accent: '#F7B7C5' },
  neutral:  { body: '#A8E6BE', spot: '#5CB985', accent: '#F7B7C5' },
  focused:  { body: '#F7D560', spot: '#C9A21C', accent: '#F7B7C5' },
  anxious:  { body: '#F7A24B', spot: '#C26A18', accent: '#F7B7C5' },
  stressed: { body: '#E5564B', spot: '#9B2A22', accent: '#F4B6BD' },
  bored:    { body: '#6BA8E0', spot: '#2E6BA8', accent: '#F7B7C5' },
  excited:  { body: '#FFF7D6', spot: '#E5C25A', accent: '#F7B7C5' },
};

interface MoodCowProps {
  emotion: EmotionType;
  className?: string;
}

const MoodCow: React.FC<MoodCowProps> = ({ emotion, className }) => {
  const c = EMOTION_COLOR[emotion] ?? EMOTION_COLOR.neutral;

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`MūD cow — ${emotion}`}
    >
      {/* Tail */}
      <g stroke="#1f2937" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M168 120 Q182 118 180 138" />
      </g>
      <circle cx="180" cy="140" r="5" fill={c.spot} stroke="#1f2937" strokeWidth="2" />

      {/* Legs */}
      <g fill={c.body} stroke="#1f2937" strokeWidth="2.5">
        <rect x="70"  y="140" width="14" height="28" rx="3" />
        <rect x="96"  y="140" width="14" height="28" rx="3" />
        <rect x="122" y="140" width="14" height="28" rx="3" />
        <rect x="148" y="140" width="14" height="28" rx="3" />
      </g>
      {/* Hooves */}
      <g fill="#1f2937">
        <rect x="70"  y="164" width="14" height="5" rx="1.5" />
        <rect x="96"  y="164" width="14" height="5" rx="1.5" />
        <rect x="122" y="164" width="14" height="5" rx="1.5" />
        <rect x="148" y="164" width="14" height="5" rx="1.5" />
      </g>

      {/* Body */}
      <ellipse cx="115" cy="118" rx="58" ry="34" fill={c.body} stroke="#1f2937" strokeWidth="2.8" />

      {/* Spots */}
      <ellipse cx="95"  cy="105" rx="10" ry="7" fill={c.spot} opacity="0.9" />
      <ellipse cx="135" cy="125" rx="12" ry="8" fill={c.spot} opacity="0.9" />
      <ellipse cx="155" cy="108" rx="6"  ry="4" fill={c.spot} opacity="0.9" />

      {/* Head */}
      <ellipse cx="60" cy="92" rx="34" ry="30" fill={c.body} stroke="#1f2937" strokeWidth="2.8" />

      {/* Ears */}
      <ellipse cx="34" cy="72" rx="10" ry="7" fill={c.body} stroke="#1f2937" strokeWidth="2.5" transform="rotate(-30 34 72)" />
      <ellipse cx="86" cy="72" rx="10" ry="7" fill={c.body} stroke="#1f2937" strokeWidth="2.5" transform="rotate(30 86 72)" />
      <ellipse cx="34" cy="73" rx="5" ry="3" fill={c.accent} transform="rotate(-30 34 73)" />
      <ellipse cx="86" cy="73" rx="5" ry="3" fill={c.accent} transform="rotate(30 86 73)" />

      {/* Horns */}
      <g fill="#FBE7B3" stroke="#1f2937" strokeWidth="2">
        <ellipse cx="44" cy="64" rx="4" ry="6" transform="rotate(-25 44 64)" />
        <ellipse cx="76" cy="64" rx="4" ry="6" transform="rotate(25 76 64)" />
      </g>

      {/* Snout */}
      <ellipse cx="50" cy="105" rx="20" ry="14" fill={c.accent} stroke="#1f2937" strokeWidth="2.5" />
      <ellipse cx="43" cy="104" rx="2" ry="3" fill="#1f2937" />
      <ellipse cx="57" cy="104" rx="2" ry="3" fill="#1f2937" />
      <path d="M44 113 Q50 117 56 113" stroke="#1f2937" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Eyes */}
      <circle cx="55" cy="84" r="4" fill="#1f2937" />
      <circle cx="75" cy="84" r="4" fill="#1f2937" />
      <circle cx="56.5" cy="82.5" r="1.2" fill="#fff" />
      <circle cx="76.5" cy="82.5" r="1.2" fill="#fff" />
    </svg>
  );
};

export default MoodCow;
