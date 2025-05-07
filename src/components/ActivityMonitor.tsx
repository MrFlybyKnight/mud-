
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useActivity } from '@/contexts/ActivityContext';
import { activityDefinitions, getActivityColor, formatTimeOfDay } from '@/utils/activityUtils';
import { Clock, AlarmClock, Sunrise, TrainFront, Briefcase, Home, Sunset, Moon } from 'lucide-react';

const ActivityMonitor: React.FC = () => {
  const { 
    currentActivity, 
    currentActivityStartedAt,
    setManualActivity
  } = useActivity();
  
  const activityInfo = activityDefinitions[currentActivity];
  const activityColor = getActivityColor(currentActivity);
  
  // Select appropriate icon based on activity
  const ActivityIcon = () => {
    switch (activityInfo.icon) {
      case 'bed':
      case 'moon':
        return <Moon className="mr-2" color={activityColor} size={24} />;
      case 'alarm-clock':
        return <AlarmClock className="mr-2" color={activityColor} size={24} />;
      case 'sunrise':
        return <Sunrise className="mr-2" color={activityColor} size={24} />;
      case 'train-front':
        return <TrainFront className="mr-2" color={activityColor} size={24} />;
      case 'briefcase':
      case 'work':
        return <Briefcase className="mr-2" color={activityColor} size={24} />;
      case 'lunch':
      case 'dinner':
        return <Clock className="mr-2" color={activityColor} size={24} />;
      case 'sunset':
        return <Sunset className="mr-2" color={activityColor} size={24} />;
      case 'home':
        return <Home className="mr-2" color={activityColor} size={24} />;
      default:
        return <Clock className="mr-2" color={activityColor} size={24} />;
    }
  };

  // Common activity options for quick switching
  const quickActivities = [
    'work-time', 
    'lunch-time', 
    'afternoon-work',
    'evening-routine',
    'dinner-time',
    'rest'
  ];

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <ActivityIcon />
          Activity Tracker
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <span className="text-3xl font-semibold" style={{ color: activityColor }}>
              {activityInfo.name}
            </span>
            <div className="text-sm text-muted-foreground">
              Started at {formatTimeOfDay(currentActivityStartedAt)}
            </div>
          </div>
          
          <div className="text-sm text-center px-2 mt-1">
            {activityInfo.description}
          </div>
          
          <div className="grid grid-cols-3 gap-2 w-full mt-3">
            {quickActivities.map(activityId => (
              <Button
                key={activityId}
                variant={currentActivity === activityId ? "secondary" : "outline"}
                size="sm"
                className="text-xs h-auto py-1"
                onClick={() => setManualActivity(activityId as any)}
                style={currentActivity === activityId ? { borderColor: getActivityColor(activityId as any) } : {}}
              >
                {activityDefinitions[activityId as any]?.name}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityMonitor;
