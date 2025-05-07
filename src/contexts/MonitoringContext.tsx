import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { determineStatus, StatusType, generateHeartRate, generateSpeechPercentage } from '../utils/monitoringUtils';
import { determineEmotion, EmotionType } from '../utils/emotionUtils';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

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
  
  const { toast } = useToast();
  
  // Derived status
  const heartRateStatus = determineStatus(heartRate, heartRateLowThreshold, heartRateHighThreshold);
  const speechStatus = determineStatus(speechPercentage, speechLowThreshold, speechHighThreshold);
  
  // Reference to track if the app is in foreground
  const isAppForeground = useRef<boolean>(true);

  // Effect to handle visibility changes (simulate background mode)
  useEffect(() => {
    const handleVisibilityChange = () => {
      isAppForeground.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

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
    
    if (speechStatus === 'high') {
      toast({
        title: "Speech Alert", 
        description: "You might be talking too much.",
        duration: 3000,
      });
    } else if (speechStatus === 'low') {
      toast({
        title: "Speech Alert",
        description: "Try to participate more in the conversation.",
        duration: 3000,
      });
    }
  }, [heartRateStatus, speechStatus, isMonitoring, toast]);
  
  const toggleMonitoring = () => setIsMonitoring(prev => !prev);
  const toggleTalking = () => setIsTalking(prev => !prev);
  const toggleBackgroundMode = () => setRunInBackground(prev => !prev);
  
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
  };
  
  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};
