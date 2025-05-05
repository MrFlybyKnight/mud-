
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { getHeartRateColor, getHeartRateFeedback } from '@/utils/monitoringUtils';
import { Heart } from 'lucide-react';

const HeartRateMonitor: React.FC = () => {
  const { 
    heartRate, 
    heartRateStatus,
    isMonitoring
  } = useMonitoring();
  
  const heartRateColor = getHeartRateColor(heartRateStatus);
  const feedback = getHeartRateFeedback(heartRateStatus);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <Heart 
            className={`mr-2 ${isMonitoring ? 'pulse-animation' : ''}`} 
            color={heartRateColor}
            size={24}
          />
          Heart Rate Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-2">
          <span className="text-4xl font-bold" style={{ color: heartRateColor }}>
            {heartRate}
          </span>
          <span className="text-2xl ml-1">BPM</span>
        </div>

        <Progress 
          value={heartRate} 
          max={150}
          className="h-2 mb-4"
          style={{ 
            backgroundColor: 'hsl(var(--secondary))',
            '--progress-background': heartRateColor
          } as React.CSSProperties}
        />

        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>40</span>
          <span>95</span>
          <span>150</span>
        </div>

        <p className="text-sm text-center mt-2">{feedback}</p>
      </CardContent>
    </Card>
  );
};

export default HeartRateMonitor;
