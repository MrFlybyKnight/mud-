
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { ActivityType, determineActivityByTime, activityDefinitions } from '../utils/activityUtils';

// Define the activity data structure
interface ActivitySession {
  id: string;
  activity: ActivityType;
  startTime: Date;
  endTime: Date | null;
  duration: number; // in minutes
  notes?: string;
}

interface ActivityContextType {
  // Current activity tracking
  currentActivity: ActivityType;
  currentActivityStartedAt: Date;
  
  // Activity history
  activityHistory: ActivitySession[];
  
  // Actions
  setManualActivity: (activity: ActivityType) => void;
  addActivityNote: (activityId: string, note: string) => void;
  
  // Custom schedules
  customActivityTimes: Record<ActivityType, { startTime: string; endTime: string }>;
  setCustomActivityTime: (activity: ActivityType, startTime: string, endTime: string) => void;
}

export const ActivityContext = createContext<ActivityContextType | null>(null);

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
};

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentActivity, setCurrentActivity] = useState<ActivityType>(determineActivityByTime());
  const [currentActivityStartedAt, setCurrentActivityStartedAt] = useState<Date>(new Date());
  const [activityHistory, setActivityHistory] = useState<ActivitySession[]>([]);
  const [customActivityTimes, setCustomActivityTimes] = useState<Record<ActivityType, { startTime: string; endTime: string }>>({} as any);
  
  const previousActivityRef = useRef<ActivityType>(currentActivity);
  
  // Initialize custom times from activity definitions
  useEffect(() => {
    const initialCustomTimes: Partial<Record<ActivityType, { startTime: string; endTime: string }>> = {};
    
    Object.entries(activityDefinitions).forEach(([activityId, definition]) => {
      if (definition.defaultStartTime && definition.defaultEndTime) {
        initialCustomTimes[activityId as ActivityType] = {
          startTime: definition.defaultStartTime,
          endTime: definition.defaultEndTime
        };
      }
    });
    
    setCustomActivityTimes(initialCustomTimes as Record<ActivityType, { startTime: string; endTime: string }>);
  }, []);
  
  // Effect for automatic activity detection
  useEffect(() => {
    const activityTimerInterval = setInterval(() => {
      const detectedActivity = determineActivityByTime();
      
      // Only update if the activity has changed
      if (detectedActivity !== currentActivity) {
        // Add the previous activity session to history
        if (previousActivityRef.current) {
          const now = new Date();
          const startTime = currentActivityStartedAt;
          const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
          
          const activitySession: ActivitySession = {
            id: `${previousActivityRef.current}-${startTime.getTime()}`,
            activity: previousActivityRef.current,
            startTime,
            endTime: now,
            duration: durationMinutes
          };
          
          setActivityHistory(prev => [...prev, activitySession]);
        }
        
        // Update state for new activity
        setCurrentActivity(detectedActivity);
        setCurrentActivityStartedAt(new Date());
        previousActivityRef.current = detectedActivity;
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(activityTimerInterval);
  }, [currentActivity, currentActivityStartedAt]);
  
  // Set a manual activity
  const setManualActivity = (activity: ActivityType) => {
    // Handle the transition from previous activity
    const now = new Date();
    const startTime = currentActivityStartedAt;
    const durationMinutes = Math.round((now.getTime() - startTime.getTime()) / (1000 * 60));
    
    const activitySession: ActivitySession = {
      id: `${currentActivity}-${startTime.getTime()}`,
      activity: currentActivity,
      startTime,
      endTime: now,
      duration: durationMinutes
    };
    
    setActivityHistory(prev => [...prev, activitySession]);
    
    // Set up new activity
    setCurrentActivity(activity);
    setCurrentActivityStartedAt(new Date());
    previousActivityRef.current = activity;
  };
  
  // Add a note to an activity session
  const addActivityNote = (activityId: string, note: string) => {
    setActivityHistory(prev => 
      prev.map(session => 
        session.id === activityId 
          ? { ...session, notes: note } 
          : session
      )
    );
  };
  
  // Update custom activity time
  const setCustomActivityTime = (activity: ActivityType, startTime: string, endTime: string) => {
    setCustomActivityTimes(prev => ({
      ...prev, 
      [activity]: { startTime, endTime }
    }));
  };
  
  const value = {
    currentActivity,
    currentActivityStartedAt,
    activityHistory,
    setManualActivity,
    addActivityNote,
    customActivityTimes,
    setCustomActivityTime
  };
  
  return (
    <ActivityContext.Provider value={value}>
      {children}
    </ActivityContext.Provider>
  );
};
