import React from 'react';
import { EmotionType } from '@/utils/emotionUtils';

const EMOTION_COLOR: Record<EmotionType, { body: string; spot: string; accent: string; cheek: string }> = {
  neutral:       { body: '#CFF1D9', spot: '#86CFA0', accent: '#FFD3DE', cheek: '#FFB3C1' },
  calm:          { body: '#B8EBC8', spot: '#6FC78F', accent: '#FFD3DE', cheek: '#FFB3C1' },
  content:       { body: '#C5E8D6', spot: '#6FB89A', accent: '#FFE0CF', cheek: '#FFB3C1' },
  focused:       { body: '#B7D8FB', spot: '#5A8FE0', accent: '#FFD3DE', cheek: '#FFB3C1' },
  confident:     { body: '#A8E0EE', spot: '#3FA8C2', accent: '#FFE0CF', cheek: '#FFB3C1' },
  happy:         { body: '#FFE791', spot: '#E8B937', accent: '#FFD3DE', cheek: '#FFB3C1' },
  excited:       { body: '#FFCB8A', spot: '#E08A39', accent: '#FFD3DE', cheek: '#FFB3C1' },
  anxious:       { body: '#FFC489', spot: '#E0792B', accent: '#FFD3DE', cheek: '#FFB3C1' },
  stressed:      { body: '#FF9088', spot: '#C24A41', accent: '#FFC9CF', cheek: '#FF99A5' },
  angry:         { body: '#E85A52', spot: '#8C2018', accent: '#FFC2BE', cheek: '#C24036' },
  overwhelmed:   { body: '#F08AB6', spot: '#B8407A', accent: '#FFD0E2', cheek: '#FF99B8' },
  uncomfortable: { body: '#D6A48A', spot: '#8C5C42', accent: '#F2D3C0', cheek: '#D89180' },
  sad:           { body: '#A6BBE3', spot: '#5870AE', accent: '#D8DEEC', cheek: '#9FB0CC' },
  bored:         { body: '#C8B5DE', spot: '#7E62A8', accent: '#E2D8EE', cheek: '#B59BCB' },
  tired:         { body: '#B6AECC', spot: '#6C6390', accent: '#D8D2E2', cheek: '#A89DBE' },
  surprised:     { body: '#E8B8F0', spot: '#A050C8', accent: '#FFE3F8', cheek: '#FFB3DE' },
};

interface MoodCowProps {
  emotion: EmotionType;
  className?: string;
  /** Secret Flow State override — renders the cow in solid gold with a slow pulse. */
  flowActive?: boolean;
}

const FLOW_GOLD = '#FFD700';
const FLOW_SPOT = '#C9A227';
const FLOW_ACCENT = '#FFE680';
const FLOW_CHEEK = '#E0B400';

const MoodCow: React.FC<MoodCowProps> = ({ emotion, className, flowActive }) => {
  const base = EMOTION_COLOR[emotion] ?? EMOTION_COLOR.neutral;
  const c = flowActive
    ? { body: FLOW_GOLD, spot: FLOW_SPOT, accent: FLOW_ACCENT, cheek: FLOW_CHEEK }
    : base;
  const stroke = '#3a2a2a';

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label={`MūD cow — ${emotion}`}
    >
      {/* soft ground shadow */}
      <ellipse cx="100" cy="178" rx="62" ry="6" fill="#000" opacity="0.08" />

      {/* Tiny legs (chibi style — short and stubby) */}
      <g fill={c.body} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round">
        <rect x="68"  y="148" width="18" height="22" rx="8" />
        <rect x="114" y="148" width="18" height="22" rx="8" />
      </g>
      {/* hoof tips */}
      <g fill={stroke}>
        <rect x="68"  y="164" width="18" height="6" rx="3" />
        <rect x="114" y="164" width="18" height="6" rx="3" />
      </g>

      {/* Round chibi body */}
      <ellipse cx="100" cy="135" rx="48" ry="32" fill={c.body} stroke={stroke} strokeWidth="3" />

      {/* belly highlight */}
      <ellipse cx="100" cy="148" rx="28" ry="14" fill="#fff" opacity="0.5" />

      {/* Spots on body */}
      <ellipse cx="78"  cy="128" rx="9" ry="6" fill={c.spot} opacity="0.95" />
      <ellipse cx="125" cy="142" rx="11" ry="7" fill={c.spot} opacity="0.95" />

      {/* Tail — small curl */}
      <path d="M147 122 Q160 116 158 132 Q156 142 150 138"
            stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="151" cy="139" r="4" fill={c.spot} stroke={stroke} strokeWidth="2" />

      {/* BIG cute head (chibi proportions) */}
      <ellipse cx="100" cy="78" rx="46" ry="40" fill={c.body} stroke={stroke} strokeWidth="3" />

      {/* Ears */}
      <ellipse cx="58" cy="62" rx="13" ry="9" fill={c.body} stroke={stroke} strokeWidth="2.5" transform="rotate(-35 58 62)" />
      <ellipse cx="142" cy="62" rx="13" ry="9" fill={c.body} stroke={stroke} strokeWidth="2.5" transform="rotate(35 142 62)" />
      <ellipse cx="58" cy="63" rx="6" ry="4" fill={c.accent} transform="rotate(-35 58 63)" />
      <ellipse cx="142" cy="63" rx="6" ry="4" fill={c.accent} transform="rotate(35 142 63)" />

      {/* Tiny horns */}
      <g fill="#FBE7B3" stroke={stroke} strokeWidth="2" strokeLinejoin="round">
        <ellipse cx="76" cy="48" rx="5" ry="7" transform="rotate(-20 76 48)" />
        <ellipse cx="124" cy="48" rx="5" ry="7" transform="rotate(20 124 48)" />
      </g>

      {/* Forehead tuft */}
      <path d="M92 46 Q100 38 108 46 Q104 50 100 48 Q96 50 92 46Z"
            fill={c.spot} stroke={stroke} strokeWidth="2" strokeLinejoin="round" />

      {/* Snout — soft pink muzzle */}
      <ellipse cx="100" cy="98" rx="24" ry="16" fill={c.accent} stroke={stroke} strokeWidth="2.5" />
      {/* Nostrils */}
      <ellipse cx="92" cy="97" rx="2.2" ry="3" fill={stroke} />
      <ellipse cx="108" cy="97" rx="2.2" ry="3" fill={stroke} />
      {/* Smile */}
      <path d="M90 108 Q100 114 110 108" stroke={stroke} strokeWidth="2.2" fill="none" strokeLinecap="round" />

      {/* Big sparkly eyes */}
      <ellipse cx="80" cy="78" rx="6.5" ry="7.5" fill={stroke} />
      <ellipse cx="120" cy="78" rx="6.5" ry="7.5" fill={stroke} />
      {/* eye shine */}
      <circle cx="82" cy="75" r="2.2" fill="#fff" />
      <circle cx="122" cy="75" r="2.2" fill="#fff" />
      <circle cx="78" cy="81" r="1" fill="#fff" />
      <circle cx="118" cy="81" r="1" fill="#fff" />

      {/* Rosy cheeks */}
      <ellipse cx="68" cy="92" rx="6" ry="4" fill={c.cheek} opacity="0.75" />
      <ellipse cx="132" cy="92" rx="6" ry="4" fill={c.cheek} opacity="0.75" />
    </svg>
  );
};

export default MoodCow;
