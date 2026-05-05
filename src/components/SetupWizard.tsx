
import React, { useState, useEffect } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useAuth } from '@/contexts/AuthContext';
import { upsertUserProfile } from '@/firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Heart, Mic, TimerIcon, ArrowRight } from 'lucide-react';

const SetupWizard: React.FC = () => {
  const { 
    setupStep, 
    nextSetupStep, 
    completeSetup, 
    setBaselineHeartRate,
    setBaselineVoiceSpeed,
    setBaselineVoiceTone,
    setBaselineVoiceAccent,
  } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [progress, setProgress] = useState(0);
  const [calibrationValue, setCalibrationValue] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!isCalibrating) return;
    
    let timer: ReturnType<typeof setTimeout>;
    
    const totalDuration = setupStep === 1 ? 30 : 10;

    timer = setInterval(() => {
      let finished = false;
      setSecondsLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          finished = true;
          return 0;
        }
        setProgress(((totalDuration - next) / totalDuration) * 100);
        return next;
      });

      if (finished) {
        clearInterval(timer);
        setIsCalibrating(false);
        if (setupStep === 1) {
          const simulatedHeartRate = Math.round(60 + Math.random() * 40);
          setBaselineHeartRate(simulatedHeartRate);
          setCalibrationValue(simulatedHeartRate);
        } else {
          const simulatedValue = Math.round(40 + Math.random() * 60);
          if (setupStep === 2) setBaselineVoiceSpeed(simulatedValue);
          else if (setupStep === 3) setBaselineVoiceTone(simulatedValue);
          else if (setupStep === 4) setBaselineVoiceAccent(simulatedValue);
          setCalibrationValue(simulatedValue);
        }
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isCalibrating, setupStep, setBaselineHeartRate, setBaselineVoiceSpeed, setBaselineVoiceTone, setBaselineVoiceAccent]);

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationValue(0);
    setProgress(0);
    setSecondsLeft(setupStep === 1 ? 30 : 10);
  };

  const handleNext = async () => {
    setCalibrationValue(0);
    if (setupStep < 4) {
      nextSetupStep();
    } else {
      if (user) {
        try {
          await upsertUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } catch (e) {
          console.error('Failed to create user profile:', e);
          toast({
            title: 'Profile save failed',
            description: 'We could not save your profile to the cloud.',
            variant: 'destructive',
          });
        }
      }
      completeSetup();
    }
  };

  const renderStepContent = () => {
    switch (setupStep) {
      case 1:
        return (
          <HeartRateCalibration 
            isCalibrating={isCalibrating}
            progress={progress}
            secondsLeft={secondsLeft}
            calibrationValue={calibrationValue}
            startCalibration={startCalibration}
          />
        );
      case 2:
        return (
          <VoiceCalibration 
            type="speed"
            isCalibrating={isCalibrating}
            progress={progress}
            secondsLeft={secondsLeft}
            calibrationValue={calibrationValue}
            startCalibration={startCalibration}
            prompt="Please read the following text at your normal speaking speed: 'The quick brown fox jumps over the lazy dog. Weather today is sunny with a chance of clouds.'"
          />
        );
      case 3:
        return (
          <VoiceCalibration 
            type="tone"
            isCalibrating={isCalibrating}
            progress={progress}
            secondsLeft={secondsLeft}
            calibrationValue={calibrationValue}
            startCalibration={startCalibration}
            prompt="Please read the following with different emotional tones (happy, neutral, concerned): 'I just heard the news. That's really interesting. We should discuss this further.'"
          />
        );
      case 4:
        return (
          <VoiceCalibration 
            type="accent"
            isCalibrating={isCalibrating}
            progress={progress}
            secondsLeft={secondsLeft}
            calibrationValue={calibrationValue}
            startCalibration={startCalibration}
            prompt="Please read the following clearly, emphasizing each word: 'Pronunciation varies across regions and accents. Each word has its unique sound and rhythm.'"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-xl text-center">
            Setup Wizard: Step {setupStep} of 4
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-muted-foreground">
            {setupStep}/4 steps complete
          </div>
          <Button
            onClick={handleNext}
            disabled={isCalibrating || calibrationValue === 0}
          >
            {setupStep < 4 ? (
              <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

interface CalibrationProps {
  isCalibrating: boolean;
  progress: number;
  secondsLeft: number;
  calibrationValue: number;
  startCalibration: () => void;
}

const HeartRateCalibration: React.FC<CalibrationProps> = ({ 
  isCalibrating, 
  progress, 
  secondsLeft, 
  calibrationValue,
  startCalibration 
}) => {
  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-center">
        <Heart size={64} className={`${isCalibrating ? 'text-red-500 pulse-animation' : 'text-muted-foreground'}`} />
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Heart Rate Calibration</h3>
        <p className="text-muted-foreground">
          We need to measure your resting heart rate for 30 seconds.
          Please sit comfortably and remain still.
        </p>
      </div>
      
      {isCalibrating ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <TimerIcon className="mr-2" /> 
            <span>{secondsLeft} seconds remaining</span>
          </div>
          <Progress value={progress} max={100} className="h-2" />
        </div>
      ) : calibrationValue > 0 ? (
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold">{calibrationValue} BPM</div>
          <p>Baseline heart rate recorded</p>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button onClick={startCalibration}>
            Start Heart Rate Measurement
          </Button>
        </div>
      )}
    </div>
  );
};

interface VoiceCalibrationProps extends CalibrationProps {
  type: 'speed' | 'tone' | 'accent';
  prompt: string;
}

const VoiceCalibration: React.FC<VoiceCalibrationProps> = ({ 
  type, 
  isCalibrating, 
  progress, 
  secondsLeft, 
  calibrationValue,
  startCalibration,
  prompt
}) => {
  const title = type === 'speed' 
    ? 'Voice Speed Calibration' 
    : type === 'tone' 
      ? 'Voice Tone Calibration' 
      : 'Voice Accent Calibration';
  
  const description = type === 'speed'
    ? 'Please read the text below at your normal talking speed.'
    : type === 'tone'
      ? 'Please read the text with different emotional tones.'
      : 'Please read the text clearly, emphasizing pronunciation.';
  
  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-center">
        <Mic size={64} className={`${isCalibrating ? 'text-blue-500 pulse-animation' : 'text-muted-foreground'}`} />
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      {isCalibrating ? (
        <div className="space-y-4">
          <div className="p-4 bg-accent rounded-lg text-sm">
            {prompt}
          </div>
          <div className="flex justify-center">
            <TimerIcon className="mr-2" /> 
            <span>{secondsLeft} seconds remaining</span>
          </div>
          <Progress value={progress} max={100} className="h-2" />
        </div>
      ) : calibrationValue > 0 ? (
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold">{calibrationValue}</div>
          <p>Baseline {type} recorded</p>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button onClick={startCalibration}>
            Start Voice {type.charAt(0).toUpperCase() + type.slice(1)} Calibration
          </Button>
        </div>
      )}
    </div>
  );
};

export default SetupWizard;
