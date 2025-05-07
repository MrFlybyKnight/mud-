
import { format } from 'date-fns';

// Define all the different activity types
export type ActivityType = 
  | 'rest'
  | 'wake-up'
  | 'morning-routine'
  | 'travel-to-work'
  | 'work-time'
  | 'lunch-time'
  | 'afternoon-work'
  | 'travel-home'
  | 'evening-routine'
  | 'dinner-time'
  | 'unknown';

// Define activity metadata
export interface ActivityDefinition {
  id: ActivityType;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultStartTime?: string; // 24-hour format
  defaultEndTime?: string; // 24-hour format
  defaultDurationMinutes?: number;
  heartRateExpected?: 'low' | 'moderate' | 'high';
  speechExpected?: 'low' | 'moderate' | 'high';
  moodExpected?: 'calm' | 'neutral' | 'energetic';
}

// Activity definitions with metadata
export const activityDefinitions: Record<ActivityType, ActivityDefinition> = {
  'rest': {
    id: 'rest',
    name: 'Rest',
    description: 'Sleep and recovery time',
    icon: 'bed',
    color: 'indigo',
    defaultStartTime: '22:00',
    defaultEndTime: '06:00',
    heartRateExpected: 'low',
    speechExpected: 'low',
    moodExpected: 'calm'
  },
  'wake-up': {
    id: 'wake-up',
    name: 'Wake Up',
    description: 'Starting the day',
    icon: 'alarm-clock',
    color: 'amber',
    defaultStartTime: '06:00',
    defaultEndTime: '06:30',
    defaultDurationMinutes: 30,
    heartRateExpected: 'low',
    speechExpected: 'low',
    moodExpected: 'neutral'
  },
  'morning-routine': {
    id: 'morning-routine',
    name: 'Morning Routine',
    description: 'Getting ready for the day',
    icon: 'sunrise',
    color: 'orange',
    defaultStartTime: '06:30',
    defaultEndTime: '07:30',
    defaultDurationMinutes: 60,
    heartRateExpected: 'moderate',
    speechExpected: 'low',
    moodExpected: 'neutral'
  },
  'travel-to-work': {
    id: 'travel-to-work',
    name: 'Travel to Work',
    description: 'Commuting to workplace',
    icon: 'train-front',
    color: 'blue',
    defaultStartTime: '07:30',
    defaultEndTime: '08:00',
    defaultDurationMinutes: 30,
    heartRateExpected: 'moderate',
    speechExpected: 'low',
    moodExpected: 'neutral'
  },
  'work-time': {
    id: 'work-time',
    name: 'Morning Work',
    description: 'Working in the morning',
    icon: 'briefcase',
    color: 'cyan',
    defaultStartTime: '08:00',
    defaultEndTime: '12:00',
    defaultDurationMinutes: 240,
    heartRateExpected: 'moderate',
    speechExpected: 'moderate',
    moodExpected: 'energetic'
  },
  'lunch-time': {
    id: 'lunch-time',
    name: 'Lunch Time',
    description: 'Taking a break for lunch',
    icon: 'lunch',
    color: 'green',
    defaultStartTime: '12:00',
    defaultEndTime: '13:00',
    defaultDurationMinutes: 60,
    heartRateExpected: 'low',
    speechExpected: 'moderate',
    moodExpected: 'calm'
  },
  'afternoon-work': {
    id: 'afternoon-work',
    name: 'Afternoon Work',
    description: 'Working in the afternoon',
    icon: 'work',
    color: 'cyan',
    defaultStartTime: '13:00',
    defaultEndTime: '17:00',
    defaultDurationMinutes: 240,
    heartRateExpected: 'moderate',
    speechExpected: 'moderate',
    moodExpected: 'energetic'
  },
  'travel-home': {
    id: 'travel-home',
    name: 'Travel Home',
    description: 'Commuting back home',
    icon: 'train-front',
    color: 'purple',
    defaultStartTime: '17:00',
    defaultEndTime: '17:30',
    defaultDurationMinutes: 30,
    heartRateExpected: 'moderate',
    speechExpected: 'low',
    moodExpected: 'neutral'
  },
  'evening-routine': {
    id: 'evening-routine',
    name: 'Evening Routine',
    description: 'Activities after work',
    icon: 'sunset',
    color: 'rose',
    defaultStartTime: '17:30',
    defaultEndTime: '19:00',
    defaultDurationMinutes: 90,
    heartRateExpected: 'moderate',
    speechExpected: 'moderate',
    moodExpected: 'calm'
  },
  'dinner-time': {
    id: 'dinner-time',
    name: 'Dinner Time',
    description: 'Evening meal',
    icon: 'dinner',
    color: 'amber',
    defaultStartTime: '19:00',
    defaultEndTime: '20:00',
    defaultDurationMinutes: 60,
    heartRateExpected: 'low',
    speechExpected: 'moderate',
    moodExpected: 'calm'
  },
  'unknown': {
    id: 'unknown',
    name: 'Unknown Activity',
    description: 'Unidentified period of time',
    icon: 'clock',
    color: 'gray',
    heartRateExpected: 'moderate',
    speechExpected: 'moderate',
    moodExpected: 'neutral'
  }
};

/**
 * Determine the current activity based on time of day
 */
export const determineActivityByTime = (): ActivityType => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinutes; // Convert to minutes since midnight
  
  // Define time ranges for each activity in minutes since midnight
  const timeRanges: Record<ActivityType, [number, number]> = {
    'rest': [22 * 60, 6 * 60], // 10pm - 6am (special case crossing midnight)
    'wake-up': [6 * 60, 6 * 60 + 30], // 6am - 6:30am
    'morning-routine': [6 * 60 + 30, 7 * 60 + 30], // 6:30am - 7:30am
    'travel-to-work': [7 * 60 + 30, 8 * 60], // 7:30am - 8am
    'work-time': [8 * 60, 12 * 60], // 8am - 12pm
    'lunch-time': [12 * 60, 13 * 60], // 12pm - 1pm
    'afternoon-work': [13 * 60, 17 * 60], // 1pm - 5pm
    'travel-home': [17 * 60, 17 * 60 + 30], // 5pm - 5:30pm
    'evening-routine': [17 * 60 + 30, 19 * 60], // 5:30pm - 7pm
    'dinner-time': [19 * 60, 20 * 60], // 7pm - 8pm
    'unknown': [0, 0] // Fallback
  };
  
  // Special case for rest which crosses midnight
  if (currentTime >= timeRanges['rest'][0] || currentTime < timeRanges['rest'][1]) {
    return 'rest';
  }
  
  // Check other time ranges
  for (const [activity, [start, end]] of Object.entries(timeRanges)) {
    if (activity === 'rest' || activity === 'unknown') continue; // Skip already handled cases
    if (currentTime >= start && currentTime < end) {
      return activity as ActivityType;
    }
  }
  
  return 'unknown';
};

/**
 * Gets the color for activity styling
 */
export const getActivityColor = (activity: ActivityType): string => {
  const colors: Record<string, string> = {
    'indigo': 'hsl(246, 70%, 60%)',
    'amber': 'hsl(38, 92%, 50%)',
    'orange': 'hsl(24, 100%, 62%)',
    'blue': 'hsl(210, 100%, 56%)',
    'cyan': 'hsl(191, 91%, 54%)',
    'green': 'hsl(142, 71%, 45%)',
    'purple': 'hsl(280, 67%, 63%)',
    'rose': 'hsl(338, 78%, 58%)',
    'gray': 'hsl(220, 14%, 60%)'
  };
  
  const colorName = activityDefinitions[activity]?.color || 'gray';
  return colors[colorName] || colors.gray;
};

/**
 * Format a time of day from a date object
 */
export const formatTimeOfDay = (date: Date): string => {
  return format(date, 'h:mm a');
};

/**
 * Check if a given activity is expected to have a high heart rate
 */
export const isActivityHighHeartRate = (activity: ActivityType): boolean => {
  return activityDefinitions[activity]?.heartRateExpected === 'high';
};

/**
 * Check if a given activity is expected to have a high speech rate
 */
export const isActivityHighSpeech = (activity: ActivityType): boolean => {
  return activityDefinitions[activity]?.speechExpected === 'high';
};
