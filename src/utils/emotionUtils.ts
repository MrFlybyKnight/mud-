import { StatusType } from "./monitoringUtils";

// Define emotion types — expanded to 16 distinct states.
export type EmotionType =
  | 'neutral'
  | 'calm'
  | 'focused'
  | 'excited'
  | 'happy'
  | 'anxious'
  | 'stressed'
  | 'angry'
  | 'sad'
  | 'bored'
  | 'overwhelmed'
  | 'confident'
  | 'uncomfortable'
  | 'tired'
  | 'surprised'
  | 'content';

export const ALL_EMOTIONS: EmotionType[] = [
  'neutral', 'calm', 'focused', 'excited', 'happy',
  'anxious', 'stressed', 'angry', 'sad', 'bored',
  'overwhelmed', 'confident', 'uncomfortable', 'tired',
  'surprised', 'content',
];

// Module-level memory for surprise / single-spike detection.
// Tracks the previous heart rate and a one-shot timer for "speech stops".
const transientState: {
  prevHr: number | null;
  prevSpeech: number | null;
  speechStoppedAt: number | null;
  prevTone: number | null;
  prevSpeechRate: number | null;
} = {
  prevHr: null,
  prevSpeech: null,
  speechStoppedAt: null,
  prevTone: null,
  prevSpeechRate: null,
};

/**
 * Determines emotion from heart rate, speech and voice metrics.
 *
 * SIGMA-BASED LOGIC
 * -----------------
 * Sigma is approximated as 12% of the user's resting baseline. Deviations
 * are expressed in multiples of sigma (0.5σ, 1σ, 2σ, 3σ).
 *
 * NEW EMOTIONS (added in 16-emotion expansion):
 *  - happy        : HR > baseline + 0.5σ AND speech > 50% AND tone > 60
 *                   (positive arousal, not sustained enough for excited)
 *  - sad          : HR < baseline AND speech < 20% AND tone < 40 AND sustained
 *  - angry        : HR > 2σ sustained AND speech > 50% AND tone > 75
 *                   (sharper tone than stressed)
 *  - overwhelmed  : HR > 3σ AND speech > 80% AND erratic tone (>70 or <30)
 *  - confident    : HR within ±0.5σ AND speech > 60% AND tone 55–75 (steady)
 *  - uncomfortable: HR > 1σ AND speech < 25% AND tone < 45 (flat)
 *  - tired        : HR < baseline AND speech < 15% (very low engagement)
 *  - surprised    : sudden HR spike ≥ 2σ vs previous reading AND speech
 *                   stopped (drop to ~0) then resumed within 60s
 *  - content      : HR ~ 0.5σ below baseline AND speech 30–50% AND tone 50–65
 */
export const determineEmotion = (
  heartRate: number,
  speechPercentage: number,
  heartRateBaseline: number = 75,
  speechPatternTone: number = 50,
  speechVolume: number = 50,
  consecutiveReadings: number = 1
): EmotionType => {
  // Confidence guard — if we don't yet have a calibrated baseline, or the
  // incoming signal is implausible (zero / NaN), don't guess. Show Neutral
  // until we actually have something to read.
  if (!Number.isFinite(heartRate) || heartRate <= 30 || heartRate > 220) return 'neutral';
  if (!Number.isFinite(heartRateBaseline) || heartRateBaseline <= 0) return 'neutral';

  const sigma = heartRateBaseline * 0.12;
  const halfSigmaHigh = heartRateBaseline + sigma * 0.5;
  const halfSigmaLow  = heartRateBaseline - sigma * 0.5;
  const oneSigmaHigh  = heartRateBaseline + sigma;
  const oneSigmaLow   = heartRateBaseline - sigma;
  const twoSigmaHigh  = heartRateBaseline + sigma * 2;
  const threeSigmaHigh = heartRateBaseline + sigma * 3;

  const sustained = consecutiveReadings >= 3;

  // ---- transient signal tracking (for surprise + tone sharpness) ----
  const prevHr = transientState.prevHr;
  const prevSpeech = transientState.prevSpeech;
  const prevTone = transientState.prevTone;
  const now = Date.now();

  // Track speech-stop transitions (drop from non-zero to ~0).
  if (prevSpeech != null && prevSpeech > 5 && speechPercentage <= 1) {
    transientState.speechStoppedAt = now;
  }

  // Tone "sharpness" = one-frame delta. Used to distinguish angry from stressed.
  const toneDelta = prevTone != null ? Math.abs(speechPatternTone - prevTone) : 0;
  const sharpToneSpike = toneDelta > 20 && speechPatternTone > 75;

  // Surprise: HR spiked ≥ 2σ vs prior reading AND speech just stopped & is now resuming
  const hrJump = prevHr != null ? heartRate - prevHr : 0;
  const speechJustResumed =
    transientState.speechStoppedAt != null &&
    now - transientState.speechStoppedAt <= 60_000 &&
    speechPercentage > 5;

  // Persist current readings for next call.
  transientState.prevHr = heartRate;
  transientState.prevSpeech = speechPercentage;
  transientState.prevTone = speechPatternTone;

  // ---- detection (ordered: most specific / highest-arousal first) ----

  // Surprised — single sharp spike with a brief speech-stop pattern
  if (hrJump >= sigma * 2 && speechJustResumed) {
    return 'surprised';
  }

  // Overwhelmed — extreme HR + rapid speech + erratic tone
  if (heartRate > threeSigmaHigh && speechPercentage > 80 &&
      (speechPatternTone > 70 || speechPatternTone < 30)) {
    return 'overwhelmed';
  }

  // Angry — sharp tone spike, sustained high HR, talking
  if (heartRate > twoSigmaHigh && speechPercentage > 50 &&
      speechPatternTone > 75 && sharpToneSpike && sustained) {
    return 'angry';
  }

  // Excited — high arousal, engaged, lively tone
  if (heartRate > twoSigmaHigh && speechPercentage > 60 && speechPatternTone > 65) {
    return 'excited';
  }

  // Stressed — sustained high HR with elevated tone
  if (heartRate > twoSigmaHigh && speechPatternTone > 60 && sustained) {
    return 'stressed';
  }

  // Anxious — elevated HR with withdrawn or pressured speech
  if (heartRate > oneSigmaHigh &&
      (speechPercentage < 20 || speechPercentage > 80) &&
      sustained) {
    return 'anxious';
  }

  // Happy — mild positive arousal, engaged but not maxed
  if (heartRate > halfSigmaHigh && speechPercentage > 50 && speechPatternTone > 60) {
    return 'happy';
  }

  // Uncomfortable — elevated HR with withdrawn flat speech
  if (heartRate > oneSigmaHigh && speechPercentage < 25 && speechPatternTone < 45) {
    return 'uncomfortable';
  }

  // Confident — steady HR, engaged speech, strong steady tone
  if (heartRate >= halfSigmaLow && heartRate <= halfSigmaHigh &&
      speechPercentage > 60 &&
      speechPatternTone >= 55 && speechPatternTone <= 75) {
    return 'confident';
  }

  // Focused — HR within ±1σ, moderate speech and tone
  if (heartRate >= oneSigmaLow && heartRate <= oneSigmaHigh &&
      speechPercentage > 40 && speechPercentage < 70 &&
      speechPatternTone > 40 && speechPatternTone < 70) {
    return 'focused';
  }

  // Content — relaxed, gently engaged, warm tone
  if (heartRate < heartRateBaseline && heartRate >= heartRateBaseline - sigma &&
      speechPercentage >= 30 && speechPercentage <= 50 &&
      speechPatternTone >= 50 && speechPatternTone <= 65) {
    return 'content';
  }

  // Sad — low HR, low speech, low tone, sustained
  if (heartRate < heartRateBaseline && speechPercentage < 20 &&
      speechPatternTone < 40 && sustained) {
    return 'sad';
  }

  // Tired — depressed HR clearly below baseline, almost no speech, sustained.
  // Must hold for several readings before we'll commit, otherwise a single
  // quiet moment was getting mis-labelled as Tired.
  if (heartRate < oneSigmaLow && speechPercentage < 15 && sustained) {
    return 'tired';
  }

  // Bored — depressed HR and minimal speech, sustained.
  if (heartRate < oneSigmaLow && speechPercentage < 25 && sustained) {
    return 'bored';
  }

  // Calm — slightly below baseline with relaxed speech, sustained.
  if (heartRate < heartRateBaseline && speechPercentage > 20 && speechPercentage < 60 && sustained) {
    return 'calm';
  }

  void speechVolume;
  return 'neutral';
};

/**
 * Distinct color per emotion (HSL) for charts and bars.
 */
export const getEmotionColor = (emotion: EmotionType): string => {
  switch (emotion) {
    case 'calm':          return 'hsl(146, 76%, 48%)';   // mint green
    case 'content':       return 'hsl(160, 55%, 55%)';   // teal-green
    case 'happy':         return 'hsl(50, 100%, 60%)';   // sunny yellow
    case 'excited':       return 'hsl(38, 100%, 58%)';   // amber
    case 'focused':       return 'hsl(210, 90%, 56%)';   // strong blue
    case 'confident':     return 'hsl(195, 80%, 50%)';   // cyan-blue
    case 'anxious':       return 'hsl(28, 100%, 60%)';   // orange
    case 'stressed':      return 'hsl(0, 84%, 60%)';     // red
    case 'angry':         return 'hsl(355, 85%, 45%)';   // deep crimson
    case 'overwhelmed':   return 'hsl(340, 80%, 55%)';   // hot pink-red
    case 'uncomfortable': return 'hsl(15, 55%, 55%)';    // muted brick
    case 'sad':           return 'hsl(220, 60%, 55%)';   // indigo blue
    case 'bored':         return 'hsl(271, 50%, 60%)';   // muted purple
    case 'tired':         return 'hsl(250, 25%, 55%)';   // dusty violet
    case 'surprised':     return 'hsl(290, 80%, 65%)';   // bright magenta
    default:              return 'hsl(220, 14%, 80%)';   // grey (neutral)
  }
};

/**
 * Friendly feedback per emotion.
 */
export const getEmotionFeedback = (emotion: EmotionType): string => {
  switch (emotion) {
    case 'calm':          return 'You seem calm and collected — great for deeper discussions.';
    case 'content':       return 'You feel settled and at ease. Enjoy this moment.';
    case 'happy':         return 'Nice — you sound bright and upbeat!';
    case 'excited':       return 'Your enthusiasm is high — perfect for engaging others.';
    case 'focused':       return 'You appear engaged and focused on the conversation.';
    case 'confident':     return 'You sound steady and self-assured.';
    case 'anxious':       return 'You might be feeling anxious. Try a few deep breaths.';
    case 'stressed':      return 'You seem stressed. Consider a short break.';
    case 'angry':         return 'Tension detected. Pause, breathe, then re-engage when ready.';
    case 'overwhelmed':   return 'A lot is happening at once. Slow down and pick one thing.';
    case 'uncomfortable': return 'Something feels off. It is okay to step back.';
    case 'sad':           return 'You seem low. Be gentle with yourself today.';
    case 'bored':         return 'Engagement is low. Try asking a question to reconnect.';
    case 'tired':         return 'Energy is dipping. A short rest would help.';
    case 'surprised':     return 'A jolt of the unexpected — take a beat to reset.';
    default:              return 'Your emotional state seems balanced.';
  }
};
