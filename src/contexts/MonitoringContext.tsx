
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { determineStatus, StatusType, generateHeartRate, generateSpeechPercentage, UserActivityState, SyncStatus, getSyncInterval, getActiveSyncDuration, syncDataWithServer } from '../utils/monitoringUtils';
import { determineEmotion, EmotionType } from '../utils/emotionUtils';
import { trancheEmotion, type PrimarySentiment } from '../utils/trancheUtils';
import { AssemblyAIStream } from '../services/assemblyAIStream';
import { useSubscription } from '../hooks/useSubscription';
import { detectEmergency, type EmergencyEvent } from '../utils/notificationUtils';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { useAuth } from './AuthContext';
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import { readHeartRateOrSimulate, readLatestHRV } from '../health/healthConnect';
import { subscribeToWatchBiometrics, subscribeToWatchSpeech } from '../health/wearDataReceiver';
import {
  meetsFlowCriteria,
  FLOW_REQUIRED_READINGS,
  isFlowDiscovered as readFlowDiscovered,
  markFlowDiscovered,
} from '../utils/flowState';
import { useProfile } from './ProfileContext';

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
  isSetupHydrating: boolean;
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
  emotionStreak: number;
  
  // Emergency state
  currentEmergency: EmergencyType;
  resolveEmergency: () => void;
  pendingEmergency: EmergencyEvent | null;
  clearEmergency: () => void;
  
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
  // Increments each time a subcheck is written to Firestore. Consumers can
  // depend on this to refetch subcheck/checkpoint data without using
  // continuous onSnapshot listeners.
  subcheckWriteCount: number;
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
  const [isSetupHydrating, setIsSetupHydrating] = useState<boolean>(true);
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
    neutral: 0,
    calm: 0,
    focused: 0,
    excited: 0,
    happy: 0,
    anxious: 0,
    stressed: 0,
    angry: 0,
    sad: 0,
    bored: 0,
    overwhelmed: 0,
    confident: 0,
    uncomfortable: 0,
    tired: 0,
    surprised: 0,
    content: 0,
  });
  
  // Emergency state
  const [currentEmergency, setCurrentEmergency] = useState<EmergencyType>('none');
  const [pendingEmergency, setPendingEmergency] = useState<EmergencyEvent | null>(null);
  const hrBufferRef = useRef<number[]>([]);
  const latestHrvRef = useRef<number | null>(null);
  const lastEmergencyRef = useRef<{ type: string; at: number } | null>(null);
  const watchConnectedRef = useRef<boolean>(false);
  
  // Sync state
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('none');
  const [userActivityState, setUserActivityState] = useState<UserActivityState>('idle');
  const [activeSyncEndTime, setActiveSyncEndTime] = useState<Date | null>(null);
  const [lastWriteStatus, setLastWriteStatus] = useState<'success' | 'failed' | 'queued' | 'none'>('none');
  const [lastWriteAt, setLastWriteAt] = useState<Date | null>(null);
  const [queuedMetricsCount, setQueuedMetricsCount] = useState<number>(0);
  const [subcheckWriteCount, setSubcheckWriteCount] = useState<number>(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Rolling aggregation buffers
  const rollingBufferRef = useRef<{
    heartRates: number[];
    speechRates: number[];
    speechTimes: number[];
    emotions: EmotionType[];
    windowStart: number;
  }>({ heartRates: [], speechRates: [], speechTimes: [], emotions: [], windowStart: Date.now() });
  
  const { toast } = useToast();
  const { uid } = useAuth();
  const { hasFeature } = useSubscription();
  const assemblyAIEnabled = hasFeature('assemblyAI');

  // AssemblyAI streaming session + most-recent primary sentiment.
  // Sentiment is stale-checked (30s) before being applied to trancheEmotion.
  const assemblyAIRef = useRef<AssemblyAIStream | null>(null);
  const lastSentimentRef = useRef<{ sentiment: PrimarySentiment; at: number } | null>(null);

  // Derived status
  const heartRateStatus = determineStatus(heartRate, heartRateLowThreshold, heartRateHighThreshold);
  const speechStatus = determineStatus(speechPercentage, speechLowThreshold, speechHighThreshold);
  
  // Reference to track if the app is in foreground
  const isAppForeground = useRef<boolean>(true);
  const userLastActiveTime = useRef<number>(Date.now());
  // Tracks consecutive identical emotion readings; gates sustained-state
  // emotions like 'stressed' and 'anxious' which require ≥3 in a row.
  const emotionStreakRef = useRef<number>(1);
  const lastEmotionRef = useRef<EmotionType>('neutral');
  const [emotionStreak, setEmotionStreak] = useState<number>(1);
  const ACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 minutes of inactivity to be considered idle

  // Hydrate setup-completion state from Firestore when user signs in.
  // If baselineHeartRate AND baselineVoiceCalibrationAt exist, the user has
  // already completed the wizard — skip it and go straight to dashboard.
  useEffect(() => {
    if (!uid) {
      setIsSetupComplete(false);
      setSetupStep(0);
      setIsSetupHydrating(false);
      return;
    }
    setIsSetupHydrating(true);
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        if (cancelled) return;
        const data = snap.data() as
          | { baselineHeartRate?: number; baselineVoiceCalibrationAt?: unknown; baselineVoiceSpeed?: number; baselineVoiceTone?: number }
          | undefined;
        const hasHR = !!(data?.baselineHeartRate && data.baselineHeartRate > 0);
        const hasVoice = !!data?.baselineVoiceCalibrationAt;
        if (hasHR) setBaselineHeartRate(data!.baselineHeartRate!);
        if (data?.baselineVoiceSpeed) setBaselineVoiceSpeed(data.baselineVoiceSpeed);
        if (data?.baselineVoiceTone) setBaselineVoiceTone(data.baselineVoiceTone);
        if (hasHR && hasVoice) {
          console.log('[Setup] User already calibrated — skipping wizard');
          setIsSetupComplete(true);
          setSetupStep(0);
        } else {
          console.log('[Setup] User not yet calibrated — wizard will show', { hasHR, hasVoice });
          setIsSetupComplete(false);
        }
      } catch (e) {
        console.warn('[Setup] Failed to hydrate setup state from Firestore:', e);
      } finally {
        if (!cancelled) setIsSetupHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);


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
  
  // Automatic sync is disabled. Sync is only triggered manually via the
  // "Sync to Firebase" button on the dashboard.
  const scheduleSyncBasedOnActivity = (_activityState: UserActivityState) => {
    // no-op: automatic scheduling disabled
  };

  // Manual sync is intentionally a no-op. Firestore writes are STRICTLY
  // event-driven and happen only at:
  //   1. Setup wizard "Next" (baseline writes — in SetupWizard)
  //   2. Subcheck every 20 minutes (rolling aggregation timer below)
  //   3. Heart rate deviating > 1σ from baseline (event-driven effect below)
  //   4. isTalking state change (event-driven effect below)
  //   5. Distress signal (event-driven effect below)
  //   6. Profile update (in ProfileContext)
  // Any other timed/automatic Firestore write has been removed.
  const manualSync = async () => {
    console.log('[Sync] manualSync() called — no-op (writes are event-driven only)');
  };

  // Subscribe to live biometrics from the paired Wear OS watch. When packets
  // arrive we treat them as ground truth and drive heart rate / HRV directly,
  // bypassing the simulator below. If the watch disconnects (no packet within
  // STALE_PACKET_MS) we silently fall back to simulation.
  useEffect(() => {
    const sub = subscribeToWatchBiometrics(({ heartRate: hr, hrv }) => {
      watchConnectedRef.current = true;
      if (hr > 0) setHeartRate(hr);
      if (hrv > 0) latestHrvRef.current = hrv;
    });
    const probe = setInterval(() => {
      watchConnectedRef.current = sub.isConnected();
    }, 5_000);
    return () => {
      sub.unsubscribe();
      clearInterval(probe);
    };
  }, []);

  // Simulation effect for heart rate (skipped while the watch is streaming).
  useEffect(() => {
    if (!isMonitoring) return;
    
    // Only proceed if app is in foreground OR background running is enabled
    if (!isAppForeground.current && !runInBackground) return;
    
    const heartInterval = setInterval(async () => {
      // Live watch data overrides simulation entirely.
      if (watchConnectedRef.current) return;

      // Generate heart rate with influence from speech and current status
      let baseline = baselineHeartRate > 0 ? baselineHeartRate : 75;
      if (isTalking) baseline += 10;
      if (speechStatus === 'high') baseline += 5;

      const { bpm: newHeartRate } = await readHeartRateOrSimulate(baseline, 8);
      setHeartRate(newHeartRate);

      // Capture latest HRV alongside; null if unavailable.
      const hrv = await readLatestHRV();
      if (hrv != null) latestHrvRef.current = hrv;

      // Add to assessment data
      if (isSetupComplete) {
        setCurrentAssessmentData(prev => {
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
  
  // Filtered speech-percentage stream from the watch's VoiceFilterService.
  // When connected, this overrides the phone-mic simulator below so the Moo
  // Meter only counts audio that matches the user's voice fingerprint.
  useEffect(() => {
    const sub = subscribeToWatchSpeech(({ speechPercentage: pct }) => {
      setSpeechPercentage(pct);
    });
    return sub.unsubscribe;
  }, []);

  // Simulation effect for speech (skipped while the watch is streaming filtered audio).
  useEffect(() => {
    if (!isMonitoring) return;
    if (!isAppForeground.current && !runInBackground) return;

    const speechInterval = setInterval(() => {
      // Watch-filtered speech wins when available.
      if (watchConnectedRef.current) return;

      const newSpeechPercentage = generateSpeechPercentage(isTalking, speechPercentage);
      setSpeechPercentage(newSpeechPercentage);

      if (isSetupComplete) {
        setCurrentAssessmentData(prev => {
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
      const baseline = baselineHeartRate > 0 ? baselineHeartRate : 75;
      const recentSentiment = lastSentimentRef.current;
      const sentimentFresh =
        recentSentiment != null && Date.now() - recentSentiment.at < 30_000;

      const newEmotion: EmotionType =
        assemblyAIEnabled && sentimentFresh
          ? trancheEmotion(
              recentSentiment!.sentiment,
              heartRate,
              speechPercentage,
              baseline,
              baselineVoiceTone,
              emotionStreakRef.current,
            )
          : determineEmotion(
              heartRate,
              speechPercentage,
              baseline,
              baselineVoiceTone,
              baselineVoiceSpeed,
              emotionStreakRef.current,
            );

      // Update streak: increment on repeat, reset to 1 on change.
      if (newEmotion === lastEmotionRef.current) {
        emotionStreakRef.current += 1;
      } else {
        emotionStreakRef.current = 1;
        lastEmotionRef.current = newEmotion;
      }
      setEmotionStreak(emotionStreakRef.current);

      setCurrentEmotion(newEmotion);

      // Update emotion history - track seconds spent in each emotion
      setEmotionHistory(prev => ({
        ...prev,
        [newEmotion]: (prev[newEmotion] || 0) + 3
      }));

      // ---- Emergency detection ----
      // Maintain rolling buffer of last 5 heart rate readings
      const buf = hrBufferRef.current;
      buf.push(heartRate);
      if (buf.length > 5) buf.shift();

      const sigma = baseline * 0.12;
      const event = detectEmergency(
        heartRate,
        baseline,
        sigma,
        speechPercentage,
        [...buf],
        emotionStreakRef.current,
        newEmotion,
        isTalking,
      );
      if (event) {
        const last = lastEmergencyRef.current;
        const now = Date.now();
        const sameRecent = last && last.type === event.type && (now - last.at) < 5 * 60 * 1000;
        if (!sameRecent) {
          lastEmergencyRef.current = { type: event.type, at: now };
          setPendingEmergency(event);
        }
      }

    }, 3000);

    return () => clearInterval(emotionInterval);
  }, [isMonitoring, heartRate, speechPercentage, baselineHeartRate, baselineVoiceTone, baselineVoiceSpeed, runInBackground, isTalking]);

  // Sample current readings into the rolling buffer every 60s
  useEffect(() => {
    if (!isMonitoring || !isSetupComplete) return;
    const SAMPLE_INTERVAL_MS = 60 * 1000;
    const sampler = setInterval(() => {
      const buf = rollingBufferRef.current;
      buf.heartRates.push(heartRate);
      buf.speechRates.push(speechPercentage);
      // speechTime: seconds of speech in this 60s window (proportional to current %)
      buf.speechTimes.push((speechPercentage / 100) * 60);
      buf.emotions.push(currentEmotion);
    }, SAMPLE_INTERVAL_MS);
    return () => clearInterval(sampler);
  }, [isMonitoring, isSetupComplete, heartRate, speechPercentage, currentEmotion]);

  // Rolling aggregation pipeline: subchecks (20m), checkpoints (60m), dailySummaries (24h)
  useEffect(() => {
    if (!uid || !isSetupComplete) return;

    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    

    const writeSubcheck = async () => {
      const buf = rollingBufferRef.current;
      if (buf.heartRates.length === 0) {
        console.log('[Pipeline] subcheck skipped — no samples');
        return;
      }
      try {
        await addDoc(collection(db, 'users', uid, 'subchecks'), {
          heartRate: avg(buf.heartRates),
          hrv: latestHrvRef.current,
          speechRate: avg(buf.speechRates),
          talkRatio: Math.round(avg(buf.speechRates)),
          speechTime: sum(buf.speechTimes),
          dominantEmotion: dominant(buf.emotions),
          timestamp: serverTimestamp(),
          windowStart: new Date(buf.windowStart),
          windowEnd: new Date(),
          trigger: 'subcheck-20m',
        });
        console.log('[FirestoreWrite] trigger=subcheck-20m → users/%s/subchecks', uid);
        // Notify subscribers (history screen, timeline bar, loquacity) that
        // there is fresh subcheck data to fetch — replaces continuous onSnapshot listeners.
        setSubcheckWriteCount((n) => n + 1);
      } catch (e) {
        console.error('[Pipeline] subcheck failed', e);
      }
      rollingBufferRef.current = {
        heartRates: [], speechRates: [], speechTimes: [], emotions: [], windowStart: Date.now(),
      };
    };

    const dominant = (emotions: EmotionType[]): EmotionType => {
      if (!emotions.length) return 'neutral';
      const counts: Record<string, number> = {};
      let best: EmotionType = emotions[0];
      let bestCount = 0;
      for (const e of emotions) {
        counts[e] = (counts[e] || 0) + 1;
        if (counts[e] > bestCount) { bestCount = counts[e]; best = e; }
      }
      return best;
    };

    const subcheckTimer = setInterval(writeSubcheck, 20 * 60 * 1000);
    return () => {
      clearInterval(subcheckTimer);
    };
  }, [uid, isSetupComplete]);

  // ---- Event-driven writes ----

  // 1) Heart rate deviation > 1σ from baseline → write a distress/HR event.
  const lastHrEventAtRef = useRef<number>(0);
  useEffect(() => {
    if (!uid || !isSetupComplete || !isMonitoring) return;
    const baseline = baselineHeartRate > 0 ? baselineHeartRate : 75;
    const sigma = baseline * 0.12;
    if (Math.abs(heartRate - baseline) <= sigma) return;
    // Throttle to at most one event per 60s to prevent runaway writes.
    const now = Date.now();
    if (now - lastHrEventAtRef.current < 60 * 1000) return;
    lastHrEventAtRef.current = now;
    (async () => {
      try {
        await addDoc(collection(db, 'users', uid, 'events'), {
          type: 'hr_deviation',
          heartRate,
          baseline,
          sigma,
          delta: heartRate - baseline,
          timestamp: serverTimestamp(),
          trigger: 'hr-1sigma',
        });
        console.log('[FirestoreWrite] trigger=hr-1sigma → users/%s/events bpm=%d baseline=%d', uid, heartRate, baseline);
      } catch (e) {
        console.error('[FirestoreWrite] hr-1sigma failed', e);
      }
    })();
  }, [uid, isSetupComplete, isMonitoring, heartRate, baselineHeartRate]);

  // 2) isTalking state change → write a voice trigger event.
  const prevTalkingRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!uid || !isSetupComplete) return;
    if (prevTalkingRef.current === null) {
      prevTalkingRef.current = isTalking;
      return;
    }
    if (prevTalkingRef.current === isTalking) return;
    prevTalkingRef.current = isTalking;
    (async () => {
      try {
        await addDoc(collection(db, 'users', uid, 'events'), {
          type: 'voice_state_change',
          isTalking,
          heartRate,
          speechPercentage,
          timestamp: serverTimestamp(),
          trigger: 'voice-toggle',
        });
        console.log('[FirestoreWrite] trigger=voice-toggle → users/%s/events isTalking=%s', uid, isTalking);
      } catch (e) {
        console.error('[FirestoreWrite] voice-toggle failed', e);
      }
    })();
  }, [uid, isSetupComplete, isTalking]);

  // 3) Distress signal (pendingEmergency) → write a distress event.
  useEffect(() => {
    if (!uid || !pendingEmergency) return;
    (async () => {
      try {
        await addDoc(collection(db, 'users', uid, 'events'), {
          type: 'distress',
          emergencyType: pendingEmergency.type,
          heartRate,
          speechPercentage,
          emotion: currentEmotion,
          timestamp: serverTimestamp(),
          trigger: 'distress',
        });
        console.log('[FirestoreWrite] trigger=distress → users/%s/events type=%s', uid, pendingEmergency.type);
      } catch (e) {
        console.error('[FirestoreWrite] distress failed', e);
      }
    })();
  }, [uid, pendingEmergency]);



  // Effect to detect emergency situations
  // Thresholds intentionally very high to avoid false positives during normal
  // activity (e.g. 90 BPM is a normal elevated heart rate, not an emergency).
  useEffect(() => {
    if (!isSetupComplete || !isMonitoring) return;

    // Require HR to be far above the user's high threshold (≈ +50 BPM) AND
    // sustained co-occurring speech anomaly before raising any emergency.
    const HR_EMERGENCY_DELTA = 50;
    const SPEECH_EMERGENCY_DELTA = 35;
    const SPEECH_ONLY_DELTA = 50;

    if (heartRateStatus === 'high' && heartRate > heartRateHighThreshold + HR_EMERGENCY_DELTA) {
      if (speechStatus === 'high' && speechPercentage > speechHighThreshold + SPEECH_EMERGENCY_DELTA) {
        setCurrentEmergency('both');
      } else {
        setCurrentEmergency('heart');
      }
    } else if (speechStatus === 'high' && speechPercentage > speechHighThreshold + SPEECH_ONLY_DELTA) {
      setCurrentEmergency('speech');
    }

    return () => {};
  }, [isSetupComplete, isMonitoring, heartRateStatus, speechStatus, heartRate, speechPercentage, heartRateHighThreshold, speechHighThreshold, currentEmergency]);
  
  // Hourly assessment timer removed — aggregation is now handled by the
  // subcheck (20m) / checkpoint (60m) / dailySummary (24h) Firestore pipeline.
  // Event-driven triggers (heart-rate >1σ, voice activity) still fire immediately.

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

  // ---- AssemblyAI streaming lifecycle ----
  // Activates only when (premium_plus | prestige) AND isMonitoring AND isTalking.
  // Falls back gracefully to determineEmotion (handled in the emotion effect).
  useEffect(() => {
    const shouldStream = assemblyAIEnabled && isMonitoring && isTalking;

    if (shouldStream) {
      if (assemblyAIRef.current?.isActive()) return;
      console.log('[AssemblyAI] starting stream (plan gated, isTalking=true)');
      const stream = new AssemblyAIStream({
        onSentiment: (sentiment, transcript) => {
          lastSentimentRef.current = { sentiment, at: Date.now() };
          console.log('[AssemblyAI] sentiment →', sentiment, '|', transcript.slice(0, 80));
        },
        onError: (err) => {
          console.error('[AssemblyAI] stream error', err);
          toast({
            title: 'Speech analysis unavailable',
            description: 'Falling back to baseline emotion detection.',
            duration: 2500,
          });
        },
        onStateChange: (s) => console.log('[AssemblyAI] state:', s),
      });
      assemblyAIRef.current = stream;
      void stream.start();
    } else {
      if (assemblyAIRef.current) {
        console.log('[AssemblyAI] stopping stream');
        assemblyAIRef.current.stop();
        assemblyAIRef.current = null;
        lastSentimentRef.current = null;
      }
    }

    return () => {
      // On unmount or dep change requiring shutdown, ensure cleanup.
      if (!shouldStream && assemblyAIRef.current) {
        assemblyAIRef.current.stop();
        assemblyAIRef.current = null;
      }
    };
  }, [assemblyAIEnabled, isMonitoring, isTalking, toast]);

  // Final teardown safety net.
  useEffect(() => {
    return () => {
      assemblyAIRef.current?.stop();
      assemblyAIRef.current = null;
    };
  }, []);

  
  const toggleMonitoring = () => {
    setIsMonitoring(prev => {
      const next = !prev;
      console.log('[Monitoring] toggleMonitoring:', prev ? 'ACTIVE' : 'PAUSED', '→', next ? 'ACTIVE' : 'PAUSED');
      // Clear any pending sync timeout when pausing so no sync triggers fire
      if (!next && syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      toast({
        title: next ? 'Monitoring resumed' : 'Monitoring paused',
        description: next
          ? 'Heart rate, speech, and sync are active.'
          : 'All data collection halted.',
        duration: 2000,
      });
      return next;
    });
  };
  const toggleTalking = () => setIsTalking(prev => !prev);
  const toggleBackgroundMode = () => setRunInBackground(prev => !prev);
  const resolveEmergency = () => setCurrentEmergency('none');
  const clearEmergency = () => setPendingEmergency(null);
  
  // Setup functions
  const startSetup = () => {
    setSetupStep(prev => {
      if (prev > 0) {
        console.log('[Setup] startSetup called but wizard already at step', prev, '— ignoring');
        return prev;
      }
      console.log('[Setup] startSetup → step 1');
      return 1;
    });
    setIsSetupComplete(false);
  };

  const completeSetup = () => {
    console.log('Navigating to dashboard');
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
    
    // Sync is manual only — no automatic scheduling.
    setLastSyncTime(null);
    setSyncStatus('none');
  };

  const nextSetupStep = () => {
    setSetupStep(prev => {
      const next = prev + 1;
      console.log('[Setup] nextSetupStep: advancing from step', prev, '→', next);
      return next;
    });
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
    isSetupHydrating,
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
    pendingEmergency,
    clearEmergency,
    emotionStreak,
    
    // Add sync properties
    lastSyncTime,
    syncStatus,
    userActivityState,
    activeSyncEndTime,
    manualSync,
    uid,
    lastWriteStatus,
    lastWriteAt,
    queuedMetricsCount,
    subcheckWriteCount,
  };
  
  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};
