
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { getSpeechColor, getSpeechFeedback } from '@/utils/monitoringUtils';
import { Volume2, VolumeX } from 'lucide-react';

const SpeechMonitor: React.FC = () => {
  const { 
    speechPercentage, 
    speechStatus,
    isTalking,
    isMonitoring 
  } = useMonitoring();
  
  const speechColor = getSpeechColor(speechStatus);
  const feedback = getSpeechFeedback(speechStatus);

  // Create wave data for visualization
  const waveBackgroundStyle = {
    backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120' preserveAspectRatio='none'><path d='M0,0 C150,40 350,0 500,30 C650,60 700,0 900,40 C1050,70 1150,20 1200,0 V120 H0 V0 Z' fill='${encodeURIComponent(speechColor)}' opacity='0.3'/></svg>")`,
    backgroundSize: '1200px 100%',
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          {isTalking && isMonitoring ? (
            <Volume2 className="mr-2 pulse-animation" color={speechColor} size={24} />
          ) : (
            <VolumeX className="mr-2" color={speechColor} size={24} />
          )}
          Speech Monitor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center mb-2">
          <span className="text-4xl font-bold" style={{ color: speechColor }}>
            {speechPercentage}%
          </span>
        </div>

        <Progress 
          value={speechPercentage} 
          max={100}
          className="h-2 mb-4"
          style={{ 
            backgroundColor: 'hsl(var(--secondary))',
            '--progress-background': speechColor
          } as React.CSSProperties}
        />

        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>

        {isMonitoring && (
          <div className="mt-4 wave">
            <div 
              className={`wave-line ${isTalking ? '' : 'opacity-20'}`}
              style={waveBackgroundStyle}
            />
          </div>
        )}

        <p className="text-sm text-center mt-2">{feedback}</p>
      </CardContent>
    </Card>
  );
};

export default SpeechMonitor;
