
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { determineStatus, StatusType, generateHeartRate, generateSpeechPercentage, UserActivityState, SyncStatus, getSyncInterval, getActiveSyncDuration, syncDataWithServer } from '../utils/monitoringUtils';
import { determineEmotion, EmotionType } from '../utils/emotionUtils';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

// Define the assessment data structure
interface AssessmentData {
  timestamp: Date;
  averageHeartRate: number;
  averageSpeechPercentage: number;
  duration: number; // in minutes
  correlation: 'positive' | 'negative' | 'neutral';
  primaryEmotion?: EmotionType;
  emotionDurations?: Record<EmotionType, number>; // Track how long each emotion was present
}

type EmergencyType = 'none' | 'heart' | 'speech' | 'both';

interface MonitoringContextType {
  // Heart rate
  heartRate: number;
  heartRateStatus: StatusType;
  heartRateLowThreshold: number;
  heartRateHighThreshold: number;
  setHeartRateLowThreshold: (value: number) => void;
  setHeartRateHighThreshold: (value: number) => void;
  
  // Speech monitoring
  speechPercentage: number;
  speechStatus: StatusType;
  speechLowThreshold: number;
  speechHighThreshold: number;
  setSpeechLowThreshold: (value: number) => void;
  setSpeechHighThreshold: (value: number) => void;
  
  // Monitoring control
  isMonitoring: boolean;
  toggleMonitoring: () => void;
  isTalking: boolean;
  toggleTalking: () => void;
  runInBackground: boolean;
  toggleBackgroundMode: () => void;

  // Setup and calibration
  isSetupComplete: boolean;
  setupStep: number;
  baselineHeartRate: number;
  baselineVoiceSpeed: number;
  baselineVoiceTone: number;
  baselineVoiceAccent: number;
  startSetup: () => void;
  completeSetup: () => void;
  nextSetupStep: () => void;
  setBaselineHeartRate: (value: number) => void;
  setBaselineVoiceSpeed: (value: number) => void;
  setBaselineVoiceTone: (value: number) => void;
  setBaselineVoiceAccent: (value: number) => void;
  
  // Assessment data
  assessments: AssessmentData[];
  currentAssessmentData: {
    heartRateReadings: number[];
    speechPercentageReadings: number[];
    startTime: Date | null;
  };
  lastAssessmentTime: Date | null;
  
  // Emotion tracking
  currentEmotion: EmotionType;
  emotionHistory: Record<EmotionType, number>;
  
  // Emergency state
  currentEmergency: EmergencyType;
  resolveEmergency: () => void;
  
  // Data synchronization
  lastSyncTime: Date | null;
  syncStatus: SyncStatus;
  userActivityState: UserActivityState;
  activeSyncEndTime: Date | null;
  manualSync: () => Promise<void>;
  uid: string | null;
  lastWriteStatus: 'success' | 'failed' | 'queued' | 'none';
  lastWriteAt: Date | null;
  queuedMetricsCount: number;
}

export const MonitoringContext = createContext<MonitoringContextType | null>(null);

export const useMonitoring = () => {
  const context = useContext(MonitoringContext);
  if (!context) {
    throw new Error('useMonitoring must be used within a MonitoringProvider');
  }
  return context;
};

export const MonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Heart rate state
  const [heartRate, setHeartRate] = useState<number>(75);
  const [heartRateLowThreshold, setHeartRateLowThreshold] = useState<number>(60);
  const [heartRateHighThreshold, setHeartRateHighThreshold] = useState<number>(100);
  
  // Speech monitoring state
  const [speechPercentage, setSpeechPercentage] = useState<number>(30);
  const [speechLowThreshold, setSpeechLowThreshold] = useState<number>(20);
  const [speechHighThreshold, setSpeechHighThreshold] = useState<number>(60);
  
  // Control state - Set isMonitoring to true by default
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [isTalking, setIsTalking] = useState<boolean>(false);
  const [runInBackground, setRunInBackground] = useState<boolean>(true); // Default to running in background

  // Setup and calibration state
  const [isSetupComplete, setIsSetupComplete] = useState<boolean>(false);
  const [setupStep, setSetupStep] = useState<number>(0);
  const [baselineHeartRate, setBaselineHeartRate] = useState<number>(0);
  const [baselineVoiceSpeed, setBaselineVoiceSpeed] = useState<number>(0);
  const [baselineVoiceTone, setBaselineVoiceTone] = useState<number>(0);
  const [baselineVoiceAccent, setBaselineVoiceAccent] = useState<number>(0);

  // Assessment state
  const [assessments, setAssessments] = useState<AssessmentData[]>([]);
  const [currentAssessmentData, setCurrentAssessmentData] = useState<{
    heartRateReadings: number[];
    speechPercentageReadings: number[];
    startTime: Date | null;
  }>({
    heartRateReadings: [],
    speechPercentageReadings: [],
    startTime: null,
  });
  const [lastAssessmentTime, setLastAssessmentTime] = useState<Date | null>(null);
  
  // Emotion tracking state
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('neutral');
  const [emotionHistory, setEmotionHistory] = useState<Record<EmotionType, number>>({
    calm: 0,
    excited: 0,
    anxious: 0,
    focused: 0,
    stressed: 0,
    bored: 0,
    neutral: 0
  });
  
  // Emergency state
  const [currentEmergency, setCurrentEmergency] = useState<EmergencyType>('none');
  
  // Sync state
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('none');
  const [userActivityState, setUserActivityState] = useState<UserActivityState>('idle');
  const [activeSyncEndTime, setActiveSyncEndTime] = useState<Date | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { toast } = useToast();
  const { uid } = useAuth();
  
  // Derived status
  const heartRateStatus = determineStatus(heartRate, heartRateLowThreshold, heartRateHighThreshold);
  const speechStatus = determineStatus(speechPercentage, speechLowThreshold, speechHighThreshold);
  
  // Reference to track if the app is in foreground
  const isAppForeground = useRef<boolean>(true);
  const userLastActiveTime = useRef<number>(Date.now());
  const ACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes of inactivity to be considered idle

  // Effect to handle visibility changes (simulate background mode)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isAppForeground.current = document.visibilityState === 'visible';
      
      // If app becomes visible again, mark as active
      if (isAppForeground.current) {
        updateUserActivity();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Monitor user activity
  useEffect(() => {
    const updateActivity = () => {
      updateUserActivity();
    };
    
    // Listen for user interactions
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    window.addEventListener('scroll', updateActivity);
    
    // Check for inactivity every minute
    const inactivityCheckInterval = setInterval(() => {
      const now = Date.now();
      if (now - userLastActiveTime.current > ACTIVITY_TIMEOUT) {
        setUserActivityState('idle');
      }
    }, 60000);
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      clearInterval(inactivityCheckInterval);
    };
  }, []);

  // Update user active timestamp and state
  const updateUserActivity = () => {
    userLastActiveTime.current = Date.now();
    
    // Only change to active if not already active
    if (userActivityState !== 'active') {
      setUserActivityState('active');
      
      // When user becomes active, schedule active sync period
      const now = new Date();
      setActiveSyncEndTime(new Date(now.getTime() + getActiveSyncDuration()));
      
      // If we're not already in a sync cycle, trigger one
      if (syncTimeoutRef.current === null) {
        scheduleSyncBasedOnActivity('active');
      }
    }
  };
  
  // Delay first sync after setup completes so AuthContext has time to resolve uid
  const [syncReady, setSyncReady] = useState<boolean>(false);
  useEffect(() => {
    if (!isSetupComplete) {
      setSyncReady(false);
      return;
    }
    const t = setTimeout(() => setSyncReady(true), 5000);
    return () => clearTimeout(t);
  }, [isSetupComplete]);

  // Auto-flush queued metrics when uid becomes available or connection is restored
  useEffect(() => {
    if (!uid) return;
    flushQueue(uid).catch((e) => console.error('[performSync] auto-flush error', e));
    const onOnline = () => {
      console.log('[performSync] online event - flushing queue');
      flushQueue(uid).catch((e) => console.error('[performSync] online flush error', e));
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [uid]);

  // Data sync effect - handles the automatic sync scheduling
  useEffect(() => {
    if (!isSetupComplete || !isMonitoring || !syncReady) return;

    // Don't run if app is in background and background mode is disabled
    if (!isAppForeground.current && !runInBackground) return;

    const now = new Date();
    const isActiveSync = activeSyncEndTime !== null && now < activeSyncEndTime;
    const currentActivityState = isActiveSync ? 'active' : userActivityState;

    // Schedule sync based on activity state
    scheduleSyncBasedOnActivity(currentActivityState);

    // Cleanup function to clear timeout on unmount or dependency change
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [
    isSetupComplete,
    isMonitoring,
    runInBackground,
    userActivityState,
    lastSyncTime,
    activeSyncEndTime,
    syncStatus,
    syncReady,
  ]);
  
  // Schedule data sync based on user activity state
  const scheduleSyncBasedOnActivity = (activityState: UserActivityState) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
    
    // Don't schedule if sync is in progress
    if (syncStatus === 'in-progress') {
      return;
    }
    
    const interval = getSyncInterval(activityState);
    
    syncTimeoutRef.current = setTimeout(async () => {
      // Check if we should still be in active sync mode
      const now = new Date();
      const isActiveSync = activeSyncEndTime !== null && now < activeSyncEndTime;
      
      if (activityState === 'active' && !isActiveSync) {
        // If we were active but active sync period has ended
        setActiveSyncEndTime(null);
        scheduleSyncBasedOnActivity('idle'); // Switch to idle sync interval
        return;
      }
      
      // Execute the sync
      await performSync();
      
      // Reschedule next sync
      syncTimeoutRef.current = null;
      
      // Check activity state again after sync
      const stateAfterSync = activeSyncEndTime !== null && new Date() < activeSyncEndTime 
        ? 'active' 
        : userActivityState;
      scheduleSyncBasedOnActivity(stateAfterSync);
    }, interval);
  };

  // Perform the actual sync operation
  // ---- Local queue for watchMetrics (offline / unavailable Firestore) ----
  const QUEUE_KEY = 'watchMetricsQueue';
  type QueuedMetric = {
    heartRate: number;
    speechPercentage: number;
    emotion: string;
    queuedAt: number;
  };

  const readQueue = (): QueuedMetric[] => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? (JSON.parse(raw) as QueuedMetric[]) : [];
    } catch {
      return [];
    }
  };

  const writeQueue = (q: QueuedMetric[]) => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    } catch (e) {
      console.error('[performSync] Failed to persist queue', e);
    }
  };

  const enqueueMetric = (m: QueuedMetric) => {
    const q = readQueue();
    q.push(m);
    // Cap at 500 to prevent unbounded growth
    const trimmed = q.length > 500 ? q.slice(q.length - 500) : q;
    writeQueue(trimmed);
    console.log('[performSync] Metric queued locally', { queueSize: trimmed.length });
  };

  const flushQueue = async (currentUid: string) => {
    const q = readQueue();
    if (q.length === 0) return;
    console.log('[performSync] Flushing queued metrics', { count: q.length });
    const remaining: QueuedMetric[] = [];
    for (let i = 0; i < q.length; i++) {
      const m = q[i];
      try {
        await addDoc(collection(db, 'users', currentUid, 'watchMetrics'), {
          heartRate: m.heartRate,
          speechPercentage: m.speechPercentage,
          emotion: m.emotion,
          timestamp: serverTimestamp(),
          queuedAt: m.queuedAt,
        });
      } catch (e) {
        console.error('[performSync] Flush failed at item, keeping rest queued', e);
        // Keep this and all subsequent items
        remaining.push(...q.slice(i));
        break;
      }
    }
    writeQueue(remaining);
    console.log('[performSync] Flush complete', { flushed: q.length - remaining.length, remaining: remaining.length });
  };

  const performSync = async () => {
    const DEBUG = true; // debug mode for sync logging
    const log = (...args: unknown[]) => DEBUG && console.log('[performSync]', ...args);

    if (syncStatus === 'in-progress') {
      log('skipped: sync already in-progress');
      return;
    }

    if (!uid) {
      console.log('performSync skipped - no uid, queuing metric locally');
      enqueueMetric({
        heartRate,
        speechPercentage,
        emotion: currentEmotion,
        queuedAt: Date.now(),
      });
      return;
    }

    log('start', { uidPresent: Boolean(uid), uid, heartRate, speechPercentage, currentEmotion });
    setSyncStatus('in-progress');

    try {
      // Prepare data payload for sync
      const syncData = {
        timestamp: new Date(),
        heartRate,
        speechPercentage,
        currentEmotion,
        assessments: assessments.filter(a => !a.timestamp ||
          (lastSyncTime && a.timestamp > lastSyncTime))
      };

      const success = await syncDataWithServer(syncData);
      log('syncDataWithServer result', { success });

      // Persist real metrics to Firestore for the authenticated user
      let firestoreAttempted = false;
      if (success && uid) {
        firestoreAttempted = true;
        const path = `users/${uid}/watchMetrics`;

        // Try to flush any previously queued metrics first
        try {
          await flushQueue(uid);
        } catch (e) {
          console.error('[performSync] flushQueue threw', e);
        }

        log('Firestore write: attempting', { uid, path });
        try {
          const docRef = await addDoc(collection(db, 'users', uid, 'watchMetrics'), {
            heartRate,
            speechPercentage,
            emotion: currentEmotion,
            timestamp: serverTimestamp(),
          });
          console.log('[performSync] Firestore write SUCCESS', { uid, path, docId: docRef.id });
        } catch (e) {
          console.error('[performSync] Firestore write FAILED, queuing locally', { uid, path, error: e });
          enqueueMetric({
            heartRate,
            speechPercentage,
            emotion: currentEmotion,
            queuedAt: Date.now(),
          });
        }
      } else {
        log('Firestore write: skipped, queuing locally', {
          reason: !success ? 'server sync failed' : 'no authenticated uid',
          success,
          uidPresent: Boolean(uid),
          uid: uid ?? null,
        });
        enqueueMetric({
          heartRate,
          speechPercentage,
          emotion: currentEmotion,
          queuedAt: Date.now(),
        });
      }
      log('done', { success, firestoreAttempted });

      if (success) {
        setSyncStatus('success');
        setLastSyncTime(new Date());
        toast({
          title: "Data Synchronized",
          description: `Last sync: ${format(new Date(), 'h:mm:ss a')}`,
          duration: 2000,
        });
      } else {
        setSyncStatus('failed');
        toast({
          title: "Sync Failed",
          description: "Couldn't synchronize data with the server.",
          variant: "destructive",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('[performSync] Sync error:', error);
      setSyncStatus('failed');
    }
  };

  // Manual sync function exposed through context
  const manualSync = async () => {
    await performSync();
  };

  // Simulation effect for heart rate
  useEffect(() => {
    if (!isMonitoring) return;
    
    // Only proceed if app is in foreground OR background running is enabled
    if (!isAppForeground.current && !runInBackground) return;
    
    const heartInterval = setInterval(() => {
      // Generate heart rate with influence from speech and current status
      let baseline = baselineHeartRate > 0 ? baselineHeartRate : 75;
      if (isTalking) baseline += 10;
      if (speechStatus === 'high') baseline += 5;
      
      const newHeartRate = generateHeartRate(baseline, 8);
      setHeartRate(newHeartRate);
      
      // Add to assessment data
      if (isSetupComplete) {
        setCurrentAssessmentData(prev => {
          // Initialize start time if not set
          const startTime = prev.startTime || new Date();
          return {
            heartRateReadings: [...prev.heartRateReadings, newHeartRate],
            speechPercentageReadings: prev.speechPercentageReadings,
            startTime,
          };
        });
      }
    }, 1000);
    
    return () => clearInterval(heartInterval);
  }, [isMonitoring, isTalking, speechStatus, baselineHeartRate, runInBackground, isSetupComplete]);
  
  // Simulation effect for speech
  useEffect(() => {
    if (!isMonitoring) return;
    
    // Only proceed if app is in foreground OR background running is enabled
    if (!isAppForeground.current && !runInBackground) return;
    
    const speechInterval = setInterval(() => {
      const newSpeechPercentage = generateSpeechPercentage(isTalking, speechPercentage);
      setSpeechPercentage(newSpeechPercentage);
      
      // Add to assessment data
      if (isSetupComplete) {
        setCurrentAssessmentData(prev => {
          // Initialize start time if not set
          const startTime = prev.startTime || new Date();
          return {
            heartRateReadings: prev.heartRateReadings,
            speechPercentageReadings: [...prev.speechPercentageReadings, newSpeechPercentage],
            startTime,
          };
        });
      }
    }, 500);
    
    return () => clearInterval(speechInterval);
  }, [isMonitoring, isTalking, speechPercentage, runInBackground, isSetupComplete]);
  
  // Effect to update emotion based on heart rate and speech
  useEffect(() => {
    if (!isMonitoring) return;
    
    // Only proceed if app is in foreground OR background running is enabled
    if (!isAppForeground.current && !runInBackground) return;
    
    // Update emotion every 3 seconds
    const emotionInterval = setInterval(() => {
      const newEmotion = determineEmotion(
        heartRate,
        speechPercentage, 
        baselineHeartRate > 0 ? baselineHeartRate : 75,
        baselineVoiceTone,
        baselineVoiceSpeed
      );
      
      setCurrentEmotion(newEmotion);
      
      // Update emotion history - track seconds spent in each emotion
      setEmotionHistory(prev => ({
        ...prev,
        [newEmotion]: (prev[newEmotion] || 0) + 3
      }));
      
    }, 3000);
    
    return () => clearInterval(emotionInterval);
  }, [isMonitoring, heartRate, speechPercentage, baselineHeartRate, baselineVoiceTone, baselineVoiceSpeed, runInBackground]);
  
  // Effect to detect emergency situations
  useEffect(() => {
    if (!isSetupComplete || !isMonitoring) return;
    
    // Check for emergency conditions
    if (heartRateStatus === 'high' && heartRate > heartRateHighThreshold + 20) {
      if (speechStatus === 'high' && speechPercentage > speechHighThreshold + 20) {
        setCurrentEmergency('both');
      } else {
        setCurrentEmergency('heart');
      }
    } else if (speechStatus === 'high' && speechPercentage > speechHighThreshold + 30) {
      setCurrentEmergency('speech');
    }
    
    // Randomly trigger an emergency situation every once in a while for demo purposes
    const randomEmergencyInterval = setInterval(() => {
      const shouldTrigger = Math.random() < 0.05; // 5% chance every check
      if (shouldTrigger && currentEmergency === 'none') {
        const emergencyType: EmergencyType = Math.random() > 0.5 ? 'heart' : 'speech';
        setCurrentEmergency(emergencyType);
        
        // Auto-resolve after 30 seconds
        setTimeout(() => {
          setCurrentEmergency('none');
        }, 30000);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(randomEmergencyInterval);
  }, [isSetupComplete, isMonitoring, heartRateStatus, speechStatus, heartRate, speechPercentage, heartRateHighThreshold, speechHighThreshold, currentEmergency]);
  
  // Update the hourly assessment effect to include emotion data
  useEffect(() => {
    if (!isSetupComplete || !isMonitoring) return;
    
    const calculateAssessment = () => {
      if (currentAssessmentData.heartRateReadings.length === 0 || 
          currentAssessmentData.speechPercentageReadings.length === 0 ||
          !currentAssessmentData.startTime) {
        return;
      }
      
      // Calculate averages
      const avgHeartRate = currentAssessmentData.heartRateReadings.reduce((a, b) => a + b, 0) / 
                           currentAssessmentData.heartRateReadings.length;
      
      const avgSpeechPercentage = currentAssessmentData.speechPercentageReadings.reduce((a, b) => a + b, 0) / 
                                 currentAssessmentData.speechPercentageReadings.length;
      
      // Calculate correlation between heart rate and speech
      // Simple correlation: if both are high/low together = positive, otherwise = negative
      let correlation: 'positive' | 'negative' | 'neutral' = 'neutral';
      
      const heartRateDeviation = avgHeartRate - baselineHeartRate;
      const speechDeviation = avgSpeechPercentage - 50; // Using 50% as neutral point
      
      if (Math.abs(heartRateDeviation) > 5 && Math.abs(speechDeviation) > 10) {
        correlation = (heartRateDeviation * speechDeviation > 0) ? 'positive' : 'negative';
      }
      
      // Calculate duration in minutes
      const durationMs = new Date().getTime() - currentAssessmentData.startTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      
      // Determine primary emotion (the one with the most time)
      let primaryEmotion: EmotionType = 'neutral';
      let maxDuration = 0;
      
      Object.entries(emotionHistory).forEach(([emotion, duration]) => {
        if (duration > maxDuration) {
          maxDuration = duration;
          primaryEmotion = emotion as EmotionType;
        }
      });
      
      const newAssessment: AssessmentData = {
        timestamp: new Date(),
        averageHeartRate: Math.round(avgHeartRate),
        averageSpeechPercentage: Math.round(avgSpeechPercentage),
        duration: durationMinutes,
        correlation,
        primaryEmotion,
        emotionDurations: { ...emotionHistory }
      };
      
      setAssessments(prev => [...prev, newAssessment]);
      setLastAssessmentTime(new Date());
      
      // Notify user with a summary
      const formattedTime = format(new Date(), 'h:mm a');
      toast({
        title: `Hourly Assessment (${formattedTime})`,
        description: `Heart Rate: ${Math.round(avgHeartRate)} BPM | Speech: ${Math.round(avgSpeechPercentage)}% | Primary Emotion: ${primaryEmotion}`,
        duration: 5000,
      });
      
      // Reset current data for next hour
      setCurrentAssessmentData({
        heartRateReadings: [],
        speechPercentageReadings: [],
        startTime: new Date(),
      });
      
      // Reset emotion history
      setEmotionHistory({
        calm: 0,
        excited: 0,
        anxious: 0,
        focused: 0,
        stressed: 0,
        bored: 0,
        neutral: 0
      });
    };
    
    // Set up hourly assessment timer
    const hourlyAssessmentTimer = setInterval(calculateAssessment, 60 * 60 * 1000); // Every hour
    
    // Also calculate assessment when stopping monitoring
    return () => {
      clearInterval(hourlyAssessmentTimer);
      if (isMonitoring) {
        calculateAssessment();
      }
    };
  }, [isSetupComplete, isMonitoring, currentAssessmentData, baselineHeartRate, toast, emotionHistory]);
  
  // Alert effect when status changes
  useEffect(() => {
    if (!isMonitoring) return;
    
    if (heartRateStatus === 'high') {
      toast({
        title: "Heart Rate Alert",
        description: "Your heart rate is elevated. Try to relax.",
        duration: 3000,
      });
    }
    
    // Speech alerts are temporarily disabled to reduce noise while debugging Firestore writes.
  }, [heartRateStatus, speechStatus, isMonitoring, toast]);
  
  const toggleMonitoring = () => setIsMonitoring(prev => !prev);
  const toggleTalking = () => setIsTalking(prev => !prev);
  const toggleBackgroundMode = () => setRunInBackground(prev => !prev);
  const resolveEmergency = () => setCurrentEmergency('none');
  
  // Setup functions
  const startSetup = () => {
    setSetupStep(1);
    setIsSetupComplete(false);
  };

  const completeSetup = () => {
    setIsSetupComplete(true);
    setSetupStep(0);

    // Update thresholds based on baseline data
    if (baselineHeartRate > 0) {
      setHeartRateLowThreshold(Math.max(40, baselineHeartRate - 15));
      setHeartRateHighThreshold(Math.min(150, baselineHeartRate + 25));
    }

    toast({
      title: "Setup Complete",
      description: "Your baseline data has been recorded",
      duration: 3000,
    });
    
    // Initialize assessment data and start monitoring immediately after setup
    setCurrentAssessmentData({
      heartRateReadings: [],
      speechPercentageReadings: [],
      startTime: new Date(),
    });
    setLastAssessmentTime(null);
    setIsMonitoring(true); // Start monitoring automatically after setup
    
    // Initialize sync
    setLastSyncTime(null);
    setSyncStatus('none');
    scheduleSyncBasedOnActivity('idle');
  };

  const nextSetupStep = () => {
    setSetupStep(prev => prev + 1);
  };
  
  const value = {
    heartRate,
    heartRateStatus,
    heartRateLowThreshold,
    heartRateHighThreshold,
    setHeartRateLowThreshold,
    setHeartRateHighThreshold,
    
    speechPercentage,
    speechStatus,
    speechLowThreshold,
    speechHighThreshold,
    setSpeechLowThreshold,
    setSpeechHighThreshold,
    
    isMonitoring,
    toggleMonitoring,
    isTalking,
    toggleTalking,
    runInBackground,
    toggleBackgroundMode,

    isSetupComplete,
    setupStep,
    baselineHeartRate,
    baselineVoiceSpeed,
    baselineVoiceTone,
    baselineVoiceAccent, 
    startSetup,
    completeSetup,
    nextSetupStep,
    setBaselineHeartRate,
    setBaselineVoiceSpeed,
    setBaselineVoiceTone,
    setBaselineVoiceAccent,
    
    assessments,
    currentAssessmentData,
    lastAssessmentTime,
    
    currentEmotion,
    emotionHistory,
    
    currentEmergency,
    resolveEmergency,
    
    // Add sync properties
    lastSyncTime,
    syncStatus,
    userActivityState,
    activeSyncEndTime,
    manualSync
  };
  
  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};
