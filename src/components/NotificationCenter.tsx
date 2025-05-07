
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash, X, MessageCircle, Heart, Smile } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { platformClass } from '@/utils/platformUtils';
import { formatNotificationTime } from '@/utils/notificationUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { SuggestionType } from '@/utils/notificationUtils';

const NotificationCenter = () => {
  const { 
    notifications, 
    unreadCount,
    markAsRead, 
    markAllAsRead, 
    clearNotification, 
    clearAllNotifications 
  } = useNotification();
  
  const { platform } = usePlatformContext();
  
  const buttonClass = platformClass(platform, {
    base: "h-8 rounded-full",
    ios: "px-3",
    android: "px-2"
  });
  
  // Get appropriate icon for notification type
  const getNotificationIcon = (type: SuggestionType) => {
    switch (type) {
      case 'heart':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'speech':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'emotion':
        return <Smile className="h-4 w-4 text-amber-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };
  
  // Get color class based on priority
  const getPriorityClass = (priority: 'low' | 'medium' | 'high') => {
    switch (priority) {
      case 'high':
        return 'border-l-4 border-red-500';
      case 'medium':
        return 'border-l-4 border-amber-500';
      default:
        return 'border-l-4 border-green-500';
    }
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0" 
              variant="destructive"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <h4 className="font-medium">Notifications</h4>
            {unreadCount > 0 && <Badge variant="outline">{unreadCount} new</Badge>}
          </div>
          <div className="flex gap-1">
            {notifications.length > 0 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={buttonClass} 
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={buttonClass}
                  onClick={clearAllNotifications}
                  title="Clear all notifications"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-20" />
              <p>No notifications</p>
              <p className="text-sm">Suggestions will appear here based on your heart rate, speech patterns, and emotional state</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-3 hover:bg-accent ${!notification.read ? 'bg-accent/50' : ''} ${getPriorityClass(notification.priority)}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notification.type)}
                      <div>
                        <h5 className="text-sm font-medium">{notification.title}</h5>
                        <p className="text-xs text-muted-foreground">{formatNotificationTime(notification.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!notification.read && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => clearNotification(notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs mt-1 pl-6">{notification.message}</p>
                  {notification.actionable && (
                    <div className="mt-2 pl-6">
                      <Button variant="secondary" size="sm" className="text-xs h-7">
                        {notification.actionLabel || 'View'}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
