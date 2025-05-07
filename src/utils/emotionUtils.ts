
import { StatusType } from "./monitoringUtils";

// Define emotion types
export type EmotionType = 'calm' | 'excited' | 'anxious' | 'focused' | 'stressed' | 'bored' | 'neutral';

/**
 * Determines emotion based on heart rate and speech patterns
 * @param heartRate Current heart rate
 * @param speechPercentage Current speech participation percentage
 * @param heartRateBaseline User's baseline heart rate
 * @param speechPatternTone Speech tone indicator (0-100, higher = more energetic)
 * @param speechVolume Speech volume indicator (0-100)
 * @returns Detected emotion
 */
export const determineEmotion = (
  heartRate: number,
  speechPercentage: number,
  heartRateBaseline: number = 75,
  speechPatternTone: number = 50,
  speechVolume: number = 50
): EmotionType => {
  // Calculate deviations from baseline
  const heartRateDeviation = heartRate - heartRateBaseline;
  const speechEngagement = speechPercentage;
  
  // High heart rate + high speech engagement + high energy = excited
  if (heartRateDeviation > 15 && speechEngagement > 60 && speechVolume > 70) {
    return 'excited';
  }
  
  // High heart rate + low speech engagement = anxious
  if (heartRateDeviation > 10 && speechEngagement < 30) {
    return 'anxious';
  }
  
  // Moderate heart rate + moderate speech + moderate tone = focused
  if (Math.abs(heartRateDeviation) < 10 && speechEngagement > 40 && speechEngagement < 70 && 
      speechPatternTone > 40 && speechPatternTone < 70) {
    return 'focused';
  }
  
  // High heart rate + high speech volume + moderate to high speech = stressed
  if (heartRateDeviation > 10 && speechVolume > 75 && speechEngagement > 50) {
    return 'stressed';
  }
  
  // Low heart rate + low speech engagement = bored
  if (heartRateDeviation < -10 && speechEngagement < 25) {
    return 'bored';
  }
  
  // Low heart rate + moderate speech = calm
  if (heartRateDeviation < 0 && speechEngagement > 20 && speechEngagement < 60) {
    return 'calm';
  }
  
  // Default emotion state
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
