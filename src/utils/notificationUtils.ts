
import { EmotionType } from "./emotionUtils";
import { StatusType } from "./monitoringUtils";
import { db, auth } from "@/firebase/config";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

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
export type SpeechContext = 'date' | 'interview' | 'social' | 'meeting' | 'default';

export const getSpeechSuggestion = (
  speechPercentage: number,
  status: StatusType,
  inMeetingOrContext: boolean | SpeechContext = false
): NotificationData | null => {
  // Don't send notification for normal speech
  if (status === 'normal') return null;

  // Backward compat: boolean true → 'meeting'
  const context: SpeechContext =
    typeof inMeetingOrContext === 'boolean'
      ? inMeetingOrContext ? 'meeting' : 'default'
      : inMeetingOrContext;

  const id = `speech-${Date.now()}`;
  const timestamp = new Date();
  let title = '';
  let message = '';
  let priority: 'low' | 'medium' | 'high' = 'medium';

  if (status === 'high') {
    title = 'Speech Pattern Alert';
    if (context === 'meeting') {
      message = 'You might be dominating the conversation. Consider giving others a chance to speak.';
    } else {
      message = "You've been talking a lot. Make sure to listen as much as you speak.";
    }
    priority = speechPercentage > 70 ? 'high' : 'medium';
  } else if (status === 'low') {
    title = 'A gentle nudge';
    switch (context) {
      case 'date':
        message = "You've gone quiet — ask them a question, show some curiosity!";
        break;
      case 'interview':
        message = 'Speak up — this is your moment to shine.';
        break;
      case 'social':
        message = "You've been quiet for a while. Jump in!";
        break;
      case 'meeting':
        message = "You've been quiet in this meeting — your perspective could really land right now.";
        break;
      default:
        message = "You've been quiet — engaging more could make a real difference here.";
    }
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
    actionable: false,
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

// ============================================================================
// Context Suggestion Engine
// ============================================================================

export type ContextActivity =
  | 'waking_up'
  | 'morning_meeting'
  | 'lunch'
  | 'afternoon_work'
  | 'social_evening'
  | 'winding_down'
  | 'unknown';

export interface ContextSuggestion {
  activity: ContextActivity;
  label: string;
  message: string;
  confidence: number; // 0..1
  notification: NotificationData;
}

/**
 * Suggest the user's likely current context based on time-of-day + vitals.
 * Returns a snackbar-style notification with three actions:
 *   - confirm
 *   - correct (custom input)
 *   - dismiss
 */
export const suggestContext = (
  hour: number,
  heartRate: number,
  speechPercentage: number,
  heartRateBaseline: number
): ContextSuggestion => {
  const hrDelta = heartRate - heartRateBaseline;
  const lowHR = hrDelta < -3;
  const moderateHR = Math.abs(hrDelta) <= 8;
  const elevatedHR = hrDelta > 8;
  const lowSpeech = speechPercentage < 25;
  const moderateSpeech = speechPercentage >= 25 && speechPercentage <= 60;
  const highSpeech = speechPercentage > 60;

  let activity: ContextActivity = 'unknown';
  let label = 'Unknown activity';
  let confidence = 0.3;

  if (hour >= 6 && hour < 9 && lowHR && lowSpeech) {
    activity = 'waking_up'; label = 'Waking up'; confidence = 0.85;
  } else if (hour >= 9 && hour < 11 && moderateHR && highSpeech) {
    activity = 'morning_meeting'; label = 'Morning meeting'; confidence = 0.8;
  } else if (hour >= 12 && hour < 14 && lowHR && lowSpeech) {
    activity = 'lunch'; label = 'Lunch break'; confidence = 0.75;
  } else if (hour >= 14 && hour < 17 && moderateHR && moderateSpeech) {
    activity = 'afternoon_work'; label = 'Afternoon work'; confidence = 0.7;
  } else if (hour >= 18 && hour < 21 && elevatedHR && highSpeech) {
    activity = 'social_evening'; label = 'Social evening'; confidence = 0.8;
  } else if ((hour >= 22 || hour < 6) && lowHR && lowSpeech) {
    activity = 'winding_down'; label = 'Winding down'; confidence = 0.85;
  } else {
    // Best guess by hour only with reduced confidence
    if (hour >= 6 && hour < 9) { activity = 'waking_up'; label = 'Waking up'; }
    else if (hour >= 9 && hour < 12) { activity = 'morning_meeting'; label = 'Morning activity'; }
    else if (hour >= 12 && hour < 14) { activity = 'lunch'; label = 'Lunch'; }
    else if (hour >= 14 && hour < 18) { activity = 'afternoon_work'; label = 'Afternoon work'; }
    else if (hour >= 18 && hour < 22) { activity = 'social_evening'; label = 'Evening'; }
    else { activity = 'winding_down'; label = 'Winding down'; }
    confidence = 0.45;
  }

  const message = `Looks like you're ${label.toLowerCase()}. Is that right?`;

  const notification: NotificationData = {
    id: `context-${Date.now()}`,
    type: 'general',
    title: 'Context Check',
    message,
    timestamp: new Date(),
    priority: 'low',
    read: false,
    actionable: true,
    actionLabel: 'Confirm',
    actionHandler: `confirmContext:${activity}|correctContext|dismissContext`,
  };

  return { activity, label, message, confidence, notification };
};

// ============================================================================
// Emergency Edge Case Detection
// ============================================================================

export type EmergencyType =
  | 'heart_attack'
  | 'stroke'
  | 'seizure'
  | 'intoxication'
  | 'mental_health_onset';

export interface EmergencyEvent {
  type: EmergencyType;
  severity: 'critical' | 'high' | 'moderate';
  title: string;
  message: string;
  tier: 'two_tier_critical' | 'trusted_contact' | 'gentle_circle';
  countdownSeconds?: number;
  notification: NotificationData;
  detectedAt: Date;
}

const variance = (arr: number[]): number => {
  if (arr.length < 2) return 0;
  let max = 0;
  for (let i = 1; i < arr.length; i++) {
    max = Math.max(max, Math.abs(arr[i] - arr[i - 1]));
  }
  return max;
};

/**
 * Detect medical/wellbeing emergencies. Returns the first matched event or null.
 *
 * @param previousHeartRates last 5 readings (oldest -> newest), current HR appended last
 * @param emotionStreak consecutive identical-emotion readings (used for anxiety streak)
 */
export const detectEmergency = (
  heartRate: number,
  heartRateBaseline: number,
  sigma: number,
  speechPercentage: number,
  previousHeartRates: number[],
  emotionStreak: number,
  currentEmotion?: EmotionType,
  inActiveSession: boolean = false
): EmergencyEvent | null => {
  const threeSigmaHigh = heartRateBaseline + sigma * 3;
  const twoSigmaHigh = heartRateBaseline + sigma * 2;
  const prev = previousHeartRates[previousHeartRates.length - 2];
  const speechStopped = speechPercentage < 5;
  const now = new Date();

  const make = (
    type: EmergencyType,
    severity: EmergencyEvent['severity'],
    title: string,
    message: string,
    tier: EmergencyEvent['tier'],
    countdownSeconds?: number,
    actionLabel?: string,
    actionHandler?: string
  ): EmergencyEvent => ({
    type,
    severity,
    title,
    message,
    tier,
    countdownSeconds,
    detectedAt: now,
    notification: {
      id: `emergency-${type}-${Date.now()}`,
      type: 'general',
      title,
      message,
      timestamp: now,
      priority: 'high',
      read: false,
      actionable: true,
      actionLabel: actionLabel ?? "I'm okay",
      actionHandler: actionHandler ?? `emergency:${type}`,
    },
  });

  // Heart attack: spike > 3σ followed by rapid drop, speech stopped
  if (
    prev !== undefined &&
    prev > threeSigmaHigh &&
    heartRate < prev - sigma * 1.5 &&
    speechStopped
  ) {
    return make(
      'heart_attack',
      'critical',
      'MūD noticed something unusual. Are you okay?',
      'Sudden heart rate spike and drop detected. Tap to confirm you are okay — otherwise trusted contacts will be alerted in 60 seconds.',
      'two_tier_critical',
      60,
    );
  }

  // Seizure: HR > 3σ + complete speech cessation
  if (heartRate > threeSigmaHigh && speechStopped) {
    return make(
      'seizure',
      'critical',
      'MūD noticed something unusual. Are you okay?',
      'Possible seizure pattern detected. Tap to confirm you are okay — otherwise trusted contacts will be alerted in 60 seconds.',
      'two_tier_critical',
      60,
    );
  }

  // Stroke: abrupt speech cessation mid-active-session + HR irregularity
  if (inActiveSession && speechStopped && variance(previousHeartRates) > 15) {
    return make(
      'stroke',
      'critical',
      'MūD noticed something unusual. Are you okay?',
      'Abrupt speech change detected during an active session. Tap to confirm you are okay — otherwise trusted contacts will be alerted in 60 seconds.',
      'two_tier_critical',
      60,
    );
  }

  // Intoxication: erratic HR (>20 BPM swing) + wildly fluctuating speech
  if (variance(previousHeartRates) > 20 && speechPercentage > 0) {
    // crude "slurred / fluctuating" proxy: speech bouncing across thresholds
    const speechSwingy =
      previousHeartRates.length >= 3 &&
      (speechPercentage < 20 || speechPercentage > 80);
    if (speechSwingy) {
      return make(
        'intoxication',
        'moderate',
        'Are you safe right now?',
        'Irregular vitals and speech patterns detected. Your primary trusted contact will be notified with your location.',
        'trusted_contact',
        undefined,
        "I'm safe",
        'emergency:intoxication',
      );
    }
  }

  // Mental health onset: anxious streak > 10 + sustained HR > 2σ
  if (
    currentEmotion === 'anxious' &&
    emotionStreak > 10 &&
    heartRate > twoSigmaHigh
  ) {
    return make(
      'mental_health_onset',
      'high',
      'You seem to be having a tough moment',
      'A gentle alert will be sent to your trusted circle. Try this breathing exercise: inhale 4, hold 4, exhale 6.',
      'gentle_circle',
      undefined,
      'Start Breathing',
      'emergency:mental_health_onset:breathing',
    );
  }

  return null;
};

/**
 * Persist an emergency event to Firestore at users/{uid}/emergencyEvents.
 */
export const recordEmergencyEvent = async (
  event: EmergencyEvent,
  responseTaken: 'pending' | 'user_confirmed_ok' | 'contacts_alerted' | 'dismissed' | string
): Promise<string | null> => {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'emergencyEvents'), {
      type: event.type,
      severity: event.severity,
      tier: event.tier,
      title: event.title,
      message: event.message,
      responseTaken,
      detectedAt: event.detectedAt.toISOString(),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (err) {
    console.error('Failed to record emergency event:', err);
    return null;
  }
};
