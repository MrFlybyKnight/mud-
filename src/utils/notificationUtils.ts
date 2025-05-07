
import { EmotionType } from "./emotionUtils";
import { StatusType } from "./monitoringUtils";

/**
 * Types of notification suggestions
 */
export type SuggestionType = 'heart' | 'speech' | 'emotion' | 'general';

/**
 * Notification data structure
 */
export interface NotificationData {
  id: string;
  type: SuggestionType;
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  actionable: boolean;
  actionLabel?: string;
  actionHandler?: string;
}

/**
 * Gets suggestions based on heart rate status
 */
export const getHeartRateSuggestion = (
  heartRate: number,
  status: StatusType,
  isExercising: boolean = false
): NotificationData | null => {
  // Don't send notification for normal heart rate
  if (status === 'normal') return null;
  
  const id = `heart-${Date.now()}`;
  const timestamp = new Date();
  let title = '';
  let message = '';
  let priority: 'low' | 'medium' | 'high' = 'medium';
  
  if (status === 'high') {
    if (heartRate > 120) {
      title = 'High Heart Rate Detected';
      message = isExercising 
        ? 'Your heart rate is very elevated. Consider taking a short break.'
        : 'Your heart rate is significantly elevated while at rest. Try some deep breathing exercises.';
      priority = 'high';
    } else {
      title = 'Elevated Heart Rate';
      message = 'Your heart rate is higher than usual. Take a moment to breathe deeply.';
      priority = 'medium';
    }
  } else if (status === 'low') {
    title = 'Low Heart Rate';
    message = 'Your heart rate is lower than usual. Try to engage more or consider some light movement.';
    priority = 'low';
  }
  
  return {
    id,
    type: 'heart',
    title,
    message,
    timestamp,
    priority,
    read: false,
    actionable: true,
    actionLabel: 'View Details',
    actionHandler: 'viewHeartRate'
  };
};

/**
 * Gets suggestions based on speech patterns
 */
export const getSpeechSuggestion = (
  speechPercentage: number,
  status: StatusType,
  inMeeting: boolean = false
): NotificationData | null => {
  // Don't send notification for normal speech
  if (status === 'normal') return null;
  
  const id = `speech-${Date.now()}`;
  const timestamp = new Date();
  let title = '';
  let message = '';
  let priority: 'low' | 'medium' | 'high' = 'medium';
  
  if (status === 'high') {
    title = 'Speech Pattern Alert';
    if (inMeeting) {
      message = 'You might be dominating the conversation. Consider giving others a chance to speak.';
    } else {
      message = 'You\'ve been talking a lot. Make sure to listen as much as you speak.';
    }
    priority = speechPercentage > 70 ? 'high' : 'medium';
  } else if (status === 'low') {
    title = 'Low Participation';
    message = inMeeting 
      ? 'You haven\'t spoken much in this conversation. Consider sharing your thoughts.'
      : 'You\'ve been quiet for a while. Engaging in conversation can be beneficial.';
    priority = 'low';
  }
  
  return {
    id,
    type: 'speech',
    title,
    message,
    timestamp,
    priority,
    read: false,
    actionable: false
  };
};

/**
 * Gets suggestions based on emotion
 */
export const getEmotionSuggestion = (
  emotion: EmotionType,
  duration: number // How long they've been in this emotional state (in seconds)
): NotificationData | null => {
  // Only send notification if user has been in this emotion for at least 2 minutes (120 seconds)
  if (duration < 120) return null;
  
  // Don't send suggestion for neutral or positive emotions unless prolonged
  if ((emotion === 'neutral' || emotion === 'calm' || emotion === 'focused') && duration < 600) {
    return null;
  }
  
  const id = `emotion-${Date.now()}`;
  const timestamp = new Date();
  let title = '';
  let message = '';
  let priority: 'low' | 'medium' | 'high' = 'medium';
  let actionable = false;
  let actionLabel = '';
  
  switch (emotion) {
    case 'anxious':
      title = 'Feeling Anxious?';
      message = 'You appear to be anxious. Try a quick breathing exercise: inhale for 4 counts, hold for 4, exhale for 6.';
      priority = 'high';
      actionable = true;
      actionLabel = 'Start Breathing';
      break;
    case 'stressed':
      title = 'Stress Detected';
      message = 'Your metrics indicate stress. Take a short break if possible or try progressive muscle relaxation.';
      priority = 'high';
      actionable = true;
      actionLabel = 'Relaxation Tips';
      break;
    case 'bored':
      title = 'Low Engagement';
      message = 'You seem disengaged. Consider changing activities or taking a short walk to refresh your mind.';
      priority = 'low';
      break;
    case 'excited':
      if (duration > 600) { // Only if excited for more than 10 minutes
        title = 'High Energy Levels';
        message = 'You\'ve been highly excited for a while. Consider channeling this energy into a focused activity.';
        priority = 'low';
      }
      break;
    case 'calm':
      if (duration > 1800) { // Only if calm for more than 30 minutes
        title = 'Sustained Calmness';
        message = 'You\'ve been calm for an extended period. This might be a good time for focused work or meditation.';
        priority = 'low';
      }
      break;
    case 'focused':
      if (duration > 1800) { // Only if focused for more than 30 minutes
        title = 'Deep Focus Period';
        message = 'You\'ve been deeply focused. Remember to take a short break to rest your eyes and mind.';
        priority = 'medium';
        actionable = true;
        actionLabel = 'Set Break Timer';
      }
      break;
    default:
      return null;
  }
  
  if (!title) return null;
  
  return {
    id,
    type: 'emotion',
    title,
    message,
    timestamp,
    priority,
    read: false,
    actionable,
    actionLabel: actionLabel || undefined,
    actionHandler: actionable ? `handle${emotion.charAt(0).toUpperCase() + emotion.slice(1)}` : undefined
  };
};

/**
 * Creates a general wellness suggestion
 */
export const getWellnessSuggestion = (
  lastNotificationTime: Date | null
): NotificationData | null => {
  // Only send wellness suggestions if it's been at least 3 hours since the last one
  if (lastNotificationTime && 
      (new Date().getTime() - lastNotificationTime.getTime()) < (3 * 60 * 60 * 1000)) {
    return null;
  }
  
  const suggestions = [
    {
      title: 'Hydration Reminder',
      message: 'Remember to stay hydrated throughout the day for optimal cognitive function.'
    },
    {
      title: 'Posture Check',
      message: 'Take a moment to check your posture. Sit up straight and relax your shoulders.'
    },
    {
      title: 'Eye Break',
      message: 'Give your eyes a break. Look at something 20 feet away for 20 seconds.'
    },
    {
      title: 'Stand and Stretch',
      message: 'You\'ve been sitting for a while. Stand up and stretch for a minute.'
    },
    {
      title: 'Deep Breathing',
      message: 'Take a minute for three deep breaths - in through the nose, out through the mouth.'
    }
  ];
  
  // Select a random suggestion
  const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];
  
  return {
    id: `wellness-${Date.now()}`,
    type: 'general',
    title: suggestion.title,
    message: suggestion.message,
    timestamp: new Date(),
    priority: 'low',
    read: false,
    actionable: false
  };
};

/**
 * Gets a vibration pattern based on notification priority
 */
export const getVibrationPattern = (priority: 'low' | 'medium' | 'high'): number[] => {
  switch (priority) {
    case 'high':
      return [0, 100, 100, 100, 100, 100]; // Three quick pulses
    case 'medium':
      return [0, 200, 100, 200]; // Two medium pulses
    case 'low':
    default:
      return [0, 300]; // One gentle pulse
  }
};

/**
 * Simulates sending a notification to a smartwatch
 */
export const sendWatchNotification = async (notification: NotificationData): Promise<boolean> => {
  // In a real app, this would use the Web Bluetooth API or a native plugin
  // to communicate with the smartwatch. For now, we'll just simulate it.
  console.log('Sending notification to watch:', notification);
  
  // Simulate the vibration pattern on the device
  if ('vibrate' in navigator) {
    navigator.vibrate(getVibrationPattern(notification.priority));
  }
  
  // Simulate a success response after a short delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return Math.random() > 0.1; // 90% success rate for simulation
};

/**
 * Format the notification time in a readable way
 */
export const formatNotificationTime = (date: Date): string => {
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (60 * 1000));
  
  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  } else if (diffMinutes < 1440) {
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diffMinutes / 1440);
    return `${days}d ago`;
  }
};
