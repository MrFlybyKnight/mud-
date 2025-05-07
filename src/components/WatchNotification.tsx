
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, X } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { platformClass } from '@/utils/platformUtils';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { Button } from '@/components/ui/button';

const WatchNotification: React.FC = () => {
  const { lastNotification, markAsRead } = useNotification();
  const [visible, setVisible] = useState(false);
  const [activeNotification, setActiveNotification] = useState(lastNotification);
  const { platform } = usePlatformContext();
  
  // Update visible state when a new notification arrives
  useEffect(() => {
    if (lastNotification && !lastNotification.read) {
      setActiveNotification(lastNotification);
      setVisible(true);
      
      // Auto-hide after 10 seconds
      const timer = setTimeout(() => {
        setVisible(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [lastNotification]);
  
  // Handle dismissal
  const handleDismiss = () => {
    setVisible(false);
    if (activeNotification) {
      markAsRead(activeNotification.id);
    }
  };
  
  // Handle action button click
  const handleAction = () => {
    if (activeNotification) {
      markAsRead(activeNotification.id);
    }
    setVisible(false);
    // In a real app, this would trigger the specific action
    console.log('Action triggered:', activeNotification?.actionHandler);
  };
  
  // If no notification or not visible, don't render anything
  if (!visible || !activeNotification) return null;
  
  const notificationClass = platformClass(platform, {
    base: "fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-10 duration-300",
    ios: "rounded-xl shadow-lg",
    android: "rounded-lg shadow-xl"
  });

  return (
    <Card className={notificationClass}>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">{activeNotification.title}</p>
              <p className="text-xs text-muted-foreground">{activeNotification.message}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 -mr-1 -mt-1" 
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {activeNotification.actionable && (
          <div className="mt-2 flex justify-end">
            <Button 
              size="sm" 
              variant="secondary" 
              className="h-7 text-xs"
              onClick={handleAction}
            >
              {activeNotification.actionLabel || 'View'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WatchNotification;
