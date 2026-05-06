
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMonitoring } from './MonitoringContext';
import { NotificationData, getHeartRateSuggestion, getSpeechSuggestion, getEmotionSuggestion, getWellnessSuggestion, getLoquacitySuggestion, getChattyPattyNudge, sendWatchNotification } from '@/utils/notificationUtils';
import { useProfile } from './ProfileContext';
import { useAuth } from './AuthContext';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/firebase/config';

interface NotificationContextType {
  notifications: NotificationData[];
  unreadCount: number;
  lastNotification: NotificationData | null;
  sendTestNotification: (type?: 'heart' | 'speech' | 'emotion' | 'general') => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [lastNotification, setLastNotification] = useState<NotificationData | null>(null);
  const lastHeartNotificationTime = useRef<Date | null>(null);
  const lastSpeechNotificationTime = useRef<Date | null>(null);
  const lastEmotionNotificationTime = useRef<Date | null>(null);
  const lastWellnessNotificationTime = useRef<Date | null>(null);
  const lastLoquacityNotificationTime = useRef<Date | null>(null);
  const lastLoquacitySubcheckId = useRef<string | null>(null);
  const emotionDurationRef = useRef<Record<string, number>>({});
  const currentEmotionRef = useRef<string | undefined>(undefined);
  const { uid } = useAuth();
  
  const { toast } = useToast();
  const { 
    heartRate, 
    heartRateStatus, 
    speechPercentage, 
    speechStatus,
    currentEmotion,
    emotionHistory,
    isSetupComplete,
    isMonitoring
  } = useMonitoring();
  
  const { currentProfile } = useProfile();

  // Keep latest emotion accessible inside the subcheck snapshot callback
  useEffect(() => { currentEmotionRef.current = currentEmotion; }, [currentEmotion]);


  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Process and add a new notification
  const processNotification = async (notification: NotificationData | null) => {
    if (!notification) return;
    
    // Don't add duplicate notifications within a short time period
    const existingSimilar = notifications.find(n => 
      n.type === notification.type && 
      (new Date().getTime() - n.timestamp.getTime()) < (15 * 60 * 1000) // 15 minutes
    );
    
    if (existingSimilar) return;
    
    // Update the notifications state
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep only the most recent 50
    setLastNotification(notification);
    
    // Show a toast for the notification
    toast({
      title: notification.title,
      description: notification.message,
      duration: 5000,
    });
    
    // Attempt to send to watch
    try {
      const sent = await sendWatchNotification(notification);
      if (!sent) {
        console.warn('Failed to send notification to watch:', notification.id);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };
  
  // Effect to check heart rate and send notifications
  useEffect(() => {
    if (!isSetupComplete || !isMonitoring) return;
    
    // Only check every 30 seconds to avoid too many notifications
    const checkInterval = setInterval(() => {
      // Don't send too many heart rate notifications
      if (lastHeartNotificationTime.current && 
          (new Date().getTime() - lastHeartNotificationTime.current.getTime()) < (10 * 60 * 1000)) {
        return;
      }
      
      const notification = getHeartRateSuggestion(heartRate, heartRateStatus);
      
      if (notification) {
        processNotification(notification);
        lastHeartNotificationTime.current = new Date();
      }
    }, 30000); // Check every 30 seconds
    
    return () => clearInterval(checkInterval);
  }, [heartRate, heartRateStatus, isSetupComplete, isMonitoring]);
  
  // Effect to check speech patterns and send notifications
  useEffect(() => {
    if (!isSetupComplete || !isMonitoring) return;
    
    const checkInterval = setInterval(() => {
      // Don't send too many speech notifications
      if (lastSpeechNotificationTime.current && 
          (new Date().getTime() - lastSpeechNotificationTime.current.getTime()) < (15 * 60 * 1000)) {
        return;
      }
      
      const notification = getSpeechSuggestion(speechPercentage, speechStatus);
      
      if (notification) {
        processNotification(notification);
        lastSpeechNotificationTime.current = new Date();
      }
    }, 45000); // Check every 45 seconds
    
    return () => clearInterval(checkInterval);
  }, [speechPercentage, speechStatus, isSetupComplete, isMonitoring]);
  
  // Effect to track emotion duration and send notifications
  useEffect(() => {
    if (!isSetupComplete || !isMonitoring) return;
    
    // Update the current emotion duration
    if (currentEmotion) {
      emotionDurationRef.current = {
        ...emotionDurationRef.current,
        [currentEmotion]: (emotionDurationRef.current[currentEmotion] || 0) + 3 // Increment by 3 seconds
      };
    }
    
    const checkInterval = setInterval(() => {
      // Don't send too many emotion notifications
      if (lastEmotionNotificationTime.current && 
          (new Date().getTime() - lastEmotionNotificationTime.current.getTime()) < (20 * 60 * 1000)) {
        return;
      }
      
      if (currentEmotion && emotionDurationRef.current[currentEmotion]) {
        const notification = getEmotionSuggestion(
          currentEmotion, 
          emotionDurationRef.current[currentEmotion]
        );
        
        if (notification) {
          processNotification(notification);
          lastEmotionNotificationTime.current = new Date();
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [currentEmotion, emotionHistory, isSetupComplete, isMonitoring]);
  
  // Effect to send periodic wellness suggestions
  useEffect(() => {
    if (!isSetupComplete) return;
    
    const checkInterval = setInterval(() => {
      const notification = getWellnessSuggestion(lastWellnessNotificationTime.current);
      
      if (notification) {
        processNotification(notification);
        lastWellnessNotificationTime.current = new Date();
      }
    }, 60 * 60 * 1000); // Check every hour
    
    return () => clearInterval(checkInterval);
  }, [isSetupComplete]);

  // Loquacity notifications — triggered on each new subcheck if talkRatio is sustained high.
  // Spaced ≥20 min apart by checking lastLoquacityNotificationTime.
  useEffect(() => {
    if (!uid || !isSetupComplete || !isMonitoring) return;
    const q = query(
      collection(db, 'users', uid, 'subchecks'),
      orderBy('timestamp', 'desc'),
      limit(1),
    );
    const unsub = onSnapshot(q, (snap) => {
      const docSnap = snap.docs[0];
      if (!docSnap) return;
      // Only react to a *new* subcheck (one full sustained period)
      if (lastLoquacitySubcheckId.current === docSnap.id) return;
      lastLoquacitySubcheckId.current = docSnap.id;

      const data = docSnap.data() as { talkRatio?: number; speechRate?: number };
      const ratio = typeof data.talkRatio === 'number' ? data.talkRatio : Math.round(data.speechRate ?? 0);

      // Spacing guard — minimum 20 min between loquacity nudges
      const last = lastLoquacityNotificationTime.current;
      if (last && Date.now() - last.getTime() < 20 * 60 * 1000) return;

      const notif = getLoquacitySuggestion(ratio, currentEmotionRef.current as any);
      if (notif) {
        processNotification(notif);
        lastLoquacityNotificationTime.current = new Date();

        // At 90%+ always add the Chatty Patty second nudge, ≥5 min later.
        if (ratio >= 90) {
          setTimeout(() => {
            processNotification(getChattyPattyNudge());
          }, 5 * 60 * 1000);
        }
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, isSetupComplete, isMonitoring]);

  // Send a test notification
  const sendTestNotification = (type: 'heart' | 'speech' | 'emotion' | 'general' = 'general') => {
    let notification: NotificationData | null = null;
    
    switch (type) {
      case 'heart':
        notification = getHeartRateSuggestion(110, 'high');
        break;
      case 'speech':
        notification = getSpeechSuggestion(80, 'high', true);
        break;
      case 'emotion':
        notification = getEmotionSuggestion('stressed', 300);
        break;
      default:
        notification = getWellnessSuggestion(null);
        break;
    }
    
    if (notification) {
      notification.id = `test-${Date.now()}`;
      processNotification(notification);
    }
  };
  
  // Mark a notification as read
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };
  
  // Clear a specific notification
  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };
  
  return (
    <NotificationContext.Provider 
      value={{
        notifications,
        unreadCount,
        lastNotification,
        sendTestNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
