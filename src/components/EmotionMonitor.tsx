
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useProfile } from '@/contexts/ProfileContext';
import { determineEmotion, getEmotionColor, getEmotionFeedback } from '@/utils/emotionUtils';
import { Smile, AlertCircle, Heart, Frown, MessageSquare } from 'lucide-react';

const EmotionMonitor: React.FC = () => {
  const { 
    heartRate, 
    speechPercentage,
    isMonitoring,
    baselineHeartRate,
    baselineVoiceTone,
    baselineVoiceSpeed,
  } = useMonitoring();
  
  const { activeProfile } = useProfile();
  
  // Use profile data if available or default to baselines
  const userBaselineHeartRate = activeProfile?.baselineHeartRate || baselineHeartRate;
  const speechPatternTone = baselineVoiceTone;
  const speechVolume = baselineVoiceSpeed;
  
  // Determine the emotion based on current metrics
  const detectedEmotion = determineEmotion(
    heartRate, 
    speechPercentage,
    userBaselineHeartRate,
    speechPatternTone,
    speechVolume
  );
  
  const emotionColor = getEmotionColor(detectedEmotion);
  const feedback = getEmotionFeedback(detectedEmotion);
  
  // Select appropriate icon based on emotion
  const EmotionIcon = () => {
    switch (detectedEmotion) {
      case 'excited':
      case 'focused':
        return <MessageSquare className="mr-2" color={emotionColor} size={24} />;
      case 'anxious':
      case 'stressed':
        return <AlertCircle className="mr-2" color={emotionColor} size={24} />;
      case 'calm':
        return <Smile className="mr-2" color={emotionColor} size={24} />;
      case 'bored':
        return <Frown className="mr-2" color={emotionColor} size={24} />;
      default:
        return <Heart className="mr-2" color={emotionColor} size={24} />;
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-lg">
          <EmotionIcon />
          Emotion Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-3">
          <div className="text-center">
            <span className="text-3xl font-semibold capitalize" style={{ color: emotionColor }}>
              {detectedEmotion}
            </span>
          </div>
          
          <div className="w-full bg-secondary/30 rounded-full h-2 mb-2">
            <div 
              className="h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${(speechPercentage / 100) * 100}%`, 
                backgroundColor: emotionColor 
              }}
            />
          </div>
          
          <div className="text-sm text-center px-2">
            {feedback}
          </div>
          
          <div className="flex justify-between w-full text-xs text-muted-foreground mt-2">
            <div>
              <span className="font-medium">Heart:</span> {heartRate} BPM
              ({heartRate > userBaselineHeartRate ? '+' : ''}
              {heartRate - userBaselineHeartRate} from baseline)
            </div>
            <div>
              <span className="font-medium">Speech:</span> {speechPercentage}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmotionMonitor;
