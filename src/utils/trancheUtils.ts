/**
 * Two-layer emotion engine — Layer 2.
 *
 * AssemblyAI streaming returns transcripts only (no native real-time sentiment).
 * We derive a primary sentiment per finalized turn from transcript text in
 * `assemblyAIStream.ts` (lexicon-based; swap in LLM Gateway for higher quality).
 * That primary sentiment is fed into `trancheEmotion()` here, which combines it
 * with live heart-rate and speech metrics to pick one of the 16 EmotionType
 * sub-emotions.
 *
 * For free-tier users (no AssemblyAI), the existing `determineEmotion()` in
 * emotionUtils.ts is used instead — `trancheEmotion` is only invoked for
 * premium_plus / prestige users.
 */
import { EmotionType } from './emotionUtils';

export type PrimarySentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'FEARFUL';

/**
 * Tranche a primary sentiment + physiological signals into a specific emotion.
 *
 * Branches by primary sentiment first, then narrows by heart-rate deviation
 * (in σ from baseline, σ ≈ 12% of baseline) and speech engagement.
 */
export const trancheEmotion = (
  primary: PrimarySentiment,
  heartRate: number,
  speechPercentage: number,
  heartRateBaseline: number = 75,
  speechPatternTone: number = 50,
  consecutiveReadings: number = 1,
): EmotionType => {
  const sigma = heartRateBaseline * 0.12;
  const halfHigh = heartRateBaseline + sigma * 0.5;
  const oneHigh = heartRateBaseline + sigma;
  const twoHigh = heartRateBaseline + sigma * 2;
  const threeHigh = heartRateBaseline + sigma * 3;
  const halfLow = heartRateBaseline - sigma * 0.5;
  const sustained = consecutiveReadings >= 3;

  switch (primary) {
    case 'POSITIVE': {
      if (heartRate > twoHigh && speechPercentage > 60) return 'excited';
      if (heartRate > halfHigh && speechPercentage > 50 && speechPatternTone > 60) return 'happy';
      if (heartRate >= halfLow && heartRate <= halfHigh && speechPercentage > 60) return 'confident';
      if (heartRate < heartRateBaseline && speechPercentage >= 30 && speechPercentage <= 50) return 'content';
      return 'calm';
    }
    case 'NEGATIVE': {
      if (heartRate > threeHigh && speechPercentage > 80) return 'overwhelmed';
      if (heartRate > twoHigh && speechPatternTone > 75 && sustained) return 'angry';
      if (heartRate > twoHigh && sustained) return 'stressed';
      if (heartRate > oneHigh && speechPercentage < 25) return 'uncomfortable';
      if (heartRate < heartRateBaseline && speechPercentage < 20 && sustained) return 'sad';
      if (heartRate < heartRateBaseline && speechPercentage < 15) return 'tired';
      return 'bored';
    }
    case 'FEARFUL': {
      if (heartRate > twoHigh && speechPercentage > 60) return 'overwhelmed';
      if (heartRate > oneHigh) return 'anxious';
      if (speechPercentage < 20) return 'uncomfortable';
      return 'anxious';
    }
    case 'NEUTRAL':
    default: {
      if (heartRate >= halfLow && heartRate <= halfHigh && speechPercentage > 40 && speechPercentage < 70) return 'focused';
      if (heartRate < heartRateBaseline && speechPercentage > 20 && speechPercentage < 60) return 'calm';
      if (speechPercentage < 15) return 'tired';
      return 'neutral';
    }
  }
};

/**
 * Lexicon-based fallback sentiment classifier for transcript text.
 * Used when LLM Gateway is not wired up. Replace with a proper API call for
 * production-grade accuracy.
 */
const POSITIVE_WORDS = ['good', 'great', 'love', 'happy', 'awesome', 'amazing', 'wonderful', 'excited', 'thanks', 'glad', 'nice', 'enjoy', 'perfect', 'yes', 'cool'];
const NEGATIVE_WORDS = ['bad', 'hate', 'angry', 'sad', 'awful', 'terrible', 'wrong', 'sorry', 'frustrated', 'annoyed', 'upset', 'tired', 'sick', 'no', 'never'];
const FEAR_WORDS = ['scared', 'afraid', 'worried', 'panic', 'nervous', 'anxious', 'terrified', 'fear', 'help', 'danger'];

export const classifyTranscriptSentiment = (text: string): PrimarySentiment => {
  if (!text || !text.trim()) return 'NEUTRAL';
  const words = text.toLowerCase().split(/\W+/);
  let pos = 0, neg = 0, fear = 0;
  for (const w of words) {
    if (POSITIVE_WORDS.includes(w)) pos++;
    if (NEGATIVE_WORDS.includes(w)) neg++;
    if (FEAR_WORDS.includes(w)) fear++;
  }
  if (fear > 0 && fear >= Math.max(pos, neg)) return 'FEARFUL';
  if (neg > pos) return 'NEGATIVE';
  if (pos > neg) return 'POSITIVE';
  return 'NEUTRAL';
};
