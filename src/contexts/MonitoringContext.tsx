
import React, { createContext, useState, useContext, useEffect } from 'react';
import { determineStatus, StatusType, generateHeartRate, generateSpeechPercentage } from '../utils/monitoringUtils';
import { useToast } from '@/components/ui/use-toast';

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
  
  // Control state
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [isTalking, setIsTalking] = useState<boolean>(false);

  const { toast } = useToast();
  
  // Derived status
  const heartRateStatus = determineStatus(heartRate, heartRateLowThreshold, heartRateHighThreshold);
  const speechStatus = determineStatus(speechPercentage, speechLowThreshold, speechHighThreshold);
  
  // Simulation effect for heart rate
  useEffect(() => {
    if (!isMonitoring) return;
    
    const heartInterval = setInterval(() => {
      // Generate heart rate with influence from speech and current status
      let baseline = 75;
      if (isTalking) baseline += 10;
      if (speechStatus === 'high') baseline += 5;
      
      setHeartRate(generateHeartRate(baseline, 8));
    }, 1000);
    
    return () => clearInterval(heartInterval);
  }, [isMonitoring, isTalking, speechStatus]);
  
  // Simulation effect for speech
  useEffect(() => {
    if (!isMonitoring) return;
    
    const speechInterval = setInterval(() => {
      setSpeechPercentage(prevPercentage => 
        generateSpeechPercentage(isTalking, prevPercentage)
      );
    }, 500);
    
    return () => clearInterval(speechInterval);
  }, [isMonitoring, isTalking]);
  
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
  };
  
  return (
    <MonitoringContext.Provider value={value}>
      {children}
    </MonitoringContext.Provider>
  );
};
