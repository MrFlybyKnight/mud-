
import { StatusType } from "./monitoringUtils";

// Define emotion types
export type EmotionType = 'calm' | 'excited' | 'anxious' | 'focused' | 'stressed' | 'bored' | 'neutral';

/**
 * Determines emotion from heart rate, speech and voice metrics.
 *
 * SIGMA-BASED LOGIC
 * -----------------
 * Instead of fixed BPM thresholds, deviations are measured in standard
 * deviations (sigma) relative to the user's resting baseline. Until we have
 * enough longitudinal data per user to compute sigma empirically, we
 * approximate it as 12% of baseline (a typical inter-individual HRV proxy):
 *
 *   sigma         = heartRateBaseline * 0.12
 *   oneSigmaHigh  = heartRateBaseline + sigma   (mildly elevated)
 *   oneSigmaLow   = heartRateBaseline - sigma   (mildly depressed)
 *   twoSigmaHigh  = heartRateBaseline + 2*sigma (clearly elevated)
 *
 * STATE DIFFERENTIATION
 * ---------------------
 *  - excited : HR > 2σ  AND  speech > 60%  AND  tone > 65 (high arousal + engaged)
 *  - stressed: HR > 2σ  AND  tone elevated AND  sustained ≥ 3 consecutive readings
 *              (speech can be low or high — clenched silence or pressured talking)
 *  - anxious : HR > 1σ  AND  (speech < 20% OR speech > 80%)
 *              AND sustained ≥ 3 consecutive readings
 *  - focused : HR within ±1σ AND moderate speech (40–70%) AND moderate tone
 *  - bored   : HR < -1σ AND speech < 25%
 *  - calm    : HR < baseline AND speech 20–60%
 *  - neutral : fallback
 *
 * Stressed and anxious require sustained signal (≥3 consecutive readings) to
 * avoid flagging momentary spikes; excited and calm fire on a single reading.
 *
 * @param heartRate            Current heart rate (BPM)
 * @param speechPercentage     Current speech participation (0–100)
 * @param heartRateBaseline    User's resting baseline heart rate
 * @param speechPatternTone    Tone / pitch energy indicator (0–100)
 * @param speechVolume         Volume indicator (0–100, reserved for future use)
 * @param consecutiveReadings  How many consecutive readings have matched the
 *                             current trend; gates sustained-state emotions.
 */
export const determineEmotion = (
  heartRate: number,
  speechPercentage: number,
  heartRateBaseline: number = 75,
  speechPatternTone: number = 50,
  speechVolume: number = 50,
  consecutiveReadings: number = 1
): EmotionType => {
  const sigma = heartRateBaseline * 0.12;
  const oneSigmaHigh = heartRateBaseline + sigma;
  const oneSigmaLow  = heartRateBaseline - sigma;
  const twoSigmaHigh = heartRateBaseline + sigma * 2;

  const sustained = consecutiveReadings >= 3;

  // Excited — high arousal + engaged speech + lively tone (single reading OK)
  if (heartRate > twoSigmaHigh && speechPercentage > 60 && speechPatternTone > 65) {
    return 'excited';
  }

  // Stressed — sustained high HR with elevated tone, regardless of speech amount
  if (heartRate > twoSigmaHigh && speechPatternTone > 60 && sustained) {
    return 'stressed';
  }

  // Anxious — elevated HR with either silent withdrawal or nervous over-talking
  if (heartRate > oneSigmaHigh &&
      (speechPercentage < 20 || speechPercentage > 80) &&
      sustained) {
    return 'anxious';
  }

  // Focused — HR within ±1σ, moderate speech and tone
  if (heartRate >= oneSigmaLow && heartRate <= oneSigmaHigh &&
      speechPercentage > 40 && speechPercentage < 70 &&
      speechPatternTone > 40 && speechPatternTone < 70) {
    return 'focused';
  }

  // Bored — depressed HR and minimal speech
  if (heartRate < oneSigmaLow && speechPercentage < 25) {
    return 'bored';
  }

  // Calm — slightly below baseline with relaxed speech
  if (heartRate < heartRateBaseline && speechPercentage > 20 && speechPercentage < 60) {
    return 'calm';
  }

  // Reserved for future weighting
  void speechVolume;

  return 'neutral';
};

/**
 * Gets color based on emotion
 */
export const getEmotionColor = (emotion: EmotionType): string => {
  switch (emotion) {
    case 'calm': return 'hsl(146, 76%, 48%)';       // Green
    case 'excited': return 'hsl(47, 100%, 68%)';     // Yellow
    case 'anxious': return 'hsl(22, 100%, 67%)';     // Orange
    case 'focused': return 'hsl(199, 89%, 54%)';     // Blue
    case 'stressed': return 'hsl(0, 84%, 60%)';      // Red
    case 'bored': return 'hsl(271, 70%, 60%)';       // Purple
    default: return 'hsl(220, 14%, 80%)';           // Gray for neutral
  }
};

/**
 * Gets feedback based on emotion
 */
export const getEmotionFeedback = (emotion: EmotionType): string => {
  switch (emotion) {
    case 'calm': 
      return 'You seem calm and collected - great for deeper discussions.';
    case 'excited': 
      return 'Your enthusiasm is high - perfect for engaging others.';
    case 'anxious': 
      return 'You might be feeling anxious. Try taking a few deep breaths.';
    case 'focused': 
      return 'You appear engaged and focused on the conversation.';
    case 'stressed': 
      return 'You seem stressed. Consider taking a short break.';
    case 'bored': 
      return 'Your engagement is low. Try asking questions to reconnect.';
    default: 
      return 'Your emotional state seems balanced.';
  }
};
