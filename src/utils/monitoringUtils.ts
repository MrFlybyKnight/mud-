
/**
 * Determines the status based on a value and threshold
 * @param value Current value
 * @param lowThreshold Threshold for "too low"
 * @param highThreshold Threshold for "too high"
 * @returns Status as 'low', 'normal', or 'high'
 */
export type StatusType = 'low' | 'normal' | 'high';

export const determineStatus = (
  value: number, 
  lowThreshold: number, 
  highThreshold: number
): StatusType => {
  if (value < lowThreshold) return 'low';
  if (value > highThreshold) return 'high';
  return 'normal';
};

/**
 * Gets color based on heart rate status
 */
export const getHeartRateColor = (status: StatusType): string => {
  switch (status) {
    case 'high': return 'hsl(var(--heart-high))';
    case 'low': return 'hsl(var(--heart-low))';
    default: return 'hsl(var(--heart-normal))';
  }
};

/**
 * Gets color based on speech status
 */
export const getSpeechColor = (status: StatusType): string => {
  switch (status) {
    case 'high': return 'hsl(var(--speech-high))';
    case 'low': return 'hsl(var(--speech-low))';
    default: return 'hsl(var(--speech-normal))';
  }
};

/**
 * Gets feedback message based on speech status
 */
export const getSpeechFeedback = (status: StatusType): string => {
  switch (status) {
    case 'high': return 'You might be talking too much. Try listening more.';
    case 'low': return 'Try to participate more in the conversation.';
    default: return 'Great job! Your participation is balanced.';
  }
};

/**
 * Gets feedback message based on heart rate status
 */
export const getHeartRateFeedback = (status: StatusType): string => {
  switch (status) {
    case 'high': return 'Your heart rate is elevated. Take a few deep breaths.';
    case 'low': return 'Your heart rate is low. Try to engage more.';
    default: return 'Your heart rate is normal.';
  }
};

/**
 * Generates simulated heart rate data
 * @param baseline Base heart rate
 * @param variance Variance range
 * @returns A realistic heart rate value
 */
export const generateHeartRate = (baseline: number = 75, variance: number = 10): number => {
  return Math.round(baseline + (Math.random() * variance * 2) - variance);
};

/**
 * Generates simulated speech percentage
 * @param isTalking If the user is currently talking
 * @param currentPercentage Current speech percentage
 * @returns Updated speech percentage
 */
export const generateSpeechPercentage = (
  isTalking: boolean, 
  currentPercentage: number
): number => {
  const changeRate = isTalking ? 2 : -1;
  const newValue = currentPercentage + changeRate;
  return Math.max(0, Math.min(100, newValue));
};

/**
 * User activity states for sync timing
 */
export type UserActivityState = 'idle' | 'active' | 'unknown';

/**
 * Sync data statuses
 */
export type SyncStatus = 'success' | 'failed' | 'in-progress' | 'none';

/**
 * Gets the ideal sync interval in milliseconds based on user activity
 * @param activityState Current user activity state
 * @returns Sync interval in milliseconds
 */
export const getSyncInterval = (activityState: UserActivityState): number => {
  switch (activityState) {
    case 'active': return 10 * 1000; // 10 seconds during active moments
    case 'idle': return 30 * 60 * 1000; // 30 minutes during idle periods
    default: return 15 * 60 * 1000; // 15 minutes for unknown state (fallback)
  }
};

/**
 * Gets the active sync duration in milliseconds
 * @returns The active sync session duration (2 minutes)
 */
export const getActiveSyncDuration = (): number => {
  return 2 * 60 * 1000; // 2 minutes
};

/**
 * Simulates a data sync operation
 * @returns Promise that resolves with success/failure
 */
export const syncDataWithServer = async (data: any): Promise<boolean> => {
  // Simulate API request time
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
  
  // 95% success rate for simulation
  const isSuccess = Math.random() < 0.95;
  
  console.log(`Data sync ${isSuccess ? 'succeeded' : 'failed'}:`, data);
  
  return isSuccess;
};
