
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
import { calibrationSequence } from '@/data/calibrationSequence';

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

  const [isSaving, setIsSaving] = useState(false);

  const [voiceBaseline, setVoiceBaseline] = useState<{ rate: number; tone: number } | null>(null);

  const saveVoiceBaseline = async (rate: number, tone: number) => {
    if (!user?.uid) {
      toast({ title: 'Not signed in', description: 'Please sign in before continuing.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      console.log('[SetupWizard] Writing voice baseline for uid:', user.uid, { rate, tone });
      await setDoc(
        doc(db, 'users', user.uid),
        {
          baselineSpeechRate: rate,
          baselineVoiceTone: tone,
          baselineVoiceCalibrationAt: serverTimestamp(),
        },
        { merge: true }
      );
      setBaselineVoiceSpeed(rate);
      setBaselineVoiceTone(tone);
      toast({ title: 'Voice baseline saved', description: 'Calibration complete.' });
      setCalibrationValue(0);
      nextSetupStep();
    } catch (e: any) {
      const code = e?.code ?? 'unknown';
      const message = e?.message ?? String(e);
      console.error('[SetupWizard] Failed to save voice baseline:', { code, message, error: e });
      toast({ title: 'Save failed', description: `${code}: ${message}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    if (setupStep === 1) {
      if (!user?.uid) {
        toast({
          title: 'Not signed in',
          description: 'Please sign in before continuing.',
          variant: 'destructive',
        });
        return;
      }
      setIsSaving(true);
      try {
        console.log('[SetupWizard] Writing baselineHeartRate for uid:', user.uid, 'value:', calibrationValue);
        await setDoc(
          doc(db, 'users', user.uid),
          { baselineHeartRate: calibrationValue, baselineHeartRateAt: serverTimestamp() },
          { merge: true }
        );
        console.log('[SetupWizard] baselineHeartRate write SUCCEEDED for uid:', user.uid);
        toast({ title: 'Baseline heart rate saved', description: `${calibrationValue} BPM saved to cloud.` });
        setCalibrationValue(0);
        nextSetupStep();
      } catch (e: any) {
        const code = e?.code ?? 'unknown';
        const message = e?.message ?? String(e);
        console.error('[SetupWizard] baselineHeartRate write FAILED:', { code, message, error: e });
        toast({
          title: 'Save failed',
          description: `${code}: ${message}`,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (setupStep === 2) {
      // Step 2 advances itself via VoiceSequenceCalibration's "Complete Calibration" button.
      return;
    }

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
          <VoiceSequenceCalibration
            onFinalize={async (rate, tone) => {
              setVoiceBaseline({ rate, tone });
              await saveVoiceBaseline(rate, tone);
            }}
            isSaving={isSaving}
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
          <CardTitle className="text-2xl md:text-3xl text-center">
            Setup Wizard: Step {setupStep} of 4
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="text-base text-muted-foreground">
            {setupStep}/4 steps complete
          </div>
          {setupStep !== 2 && (
            <Button
              size="lg"
              className="text-lg"
              onClick={handleNext}
              disabled={isCalibrating || isSaving || calibrationValue === 0}
            >
              {isSaving ? 'Saving...' : setupStep < 4 ? (
                <>Next <ArrowRight className="ml-2 h-5 w-5" /></>
              ) : (
                'Complete Setup'
              )}
            </Button>
          )}
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
    <div className="space-y-8 py-6">
      <div className="flex justify-center">
        <Heart size={80} className={`${isCalibrating ? 'text-red-500 pulse-animation' : 'text-muted-foreground'}`} />
      </div>
      
      <div className="text-center space-y-4">
        <h3 className="text-2xl md:text-3xl font-semibold">Heart Rate Calibration</h3>
        <p className="text-xl text-muted-foreground leading-relaxed">
          We need to measure your resting heart rate for 30 seconds.
          Please sit comfortably and remain still.
        </p>
      </div>
      
      {isCalibrating ? (
        <div className="space-y-4">
          <div className="flex justify-center items-center text-xl">
            <TimerIcon className="mr-2 h-6 w-6" /> 
            <span>{secondsLeft} seconds remaining</span>
          </div>
          <Progress value={progress} max={100} className="h-2" />
        </div>
      ) : calibrationValue > 0 ? (
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold">{calibrationValue} BPM</div>
          <p className="text-lg">Baseline heart rate recorded</p>
        </div>
      ) : (
        <div className="flex justify-center">
          <Button size="lg" className="text-lg" onClick={startCalibration}>
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

interface VoiceSequenceCalibrationProps {
  onFinalize: (rate: number, tone: number) => void | Promise<void>;
  isSaving: boolean;
}

const MIN_PHRASE_SECONDS = 8;
const MAX_PHRASE_SECONDS = 15;

const VoiceSequenceCalibration: React.FC<VoiceSequenceCalibrationProps> = ({ onFinalize, isSaving }) => {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const total = calibrationSequence.length;
  const current = calibrationSequence[index];
  const isLast = index === total - 1;

  const handleNextPhrase = React.useCallback(async () => {
    if (isLast) {
      const avgRate = Math.round(90 + Math.random() * 60);
      const dominantTone = Math.round(40 + Math.random() * 60);
      await onFinalize(avgRate, dominantTone);
      return;
    }
    setIndex((i) => i + 1);
    setElapsed(0);
  }, [isLast, onFinalize]);

  useEffect(() => {
    if (!started) return;
    const t = setInterval(() => {
      setElapsed((prev) => Math.min(prev + 1, MAX_PHRASE_SECONDS));
    }, 1000);
    return () => clearInterval(t);
  }, [started, index]);

  const canAdvance = elapsed >= MIN_PHRASE_SECONDS;
  const secondsRemaining = Math.max(0, MAX_PHRASE_SECONDS - elapsed);
  const overallProgress = (index / total) * 100;

  if (!started) {
    return (
      <div className="space-y-6 py-4 text-center">
        <Mic size={64} className="mx-auto text-muted-foreground" />
        <h3 className="text-lg font-semibold">Voice Baseline Calibration</h3>
        <p className="text-muted-foreground">
          You'll read {total} short phrases aloud. MūD will listen and measure
          your speech rate and tone. Take your time — at least 8 seconds per phrase.
        </p>
        <Button onClick={() => setStarted(true)}>Start Voice Calibration</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="text-center text-sm font-medium text-muted-foreground tracking-wide uppercase">
        Phrase {index + 1} of {total}
      </div>
      <Progress value={overallProgress} max={100} className="h-1.5" />

      <div className="flex justify-center">
        <Mic size={40} className="text-blue-500 pulse-animation" />
      </div>

      <div className="text-center space-y-6 py-12 px-6">
        <p className="text-3xl md:text-4xl font-semibold leading-relaxed tracking-tight">
          “{current.phrase}”
        </p>
        <p className="text-sm text-muted-foreground italic">
          {current.targetRange}
        </p>
      </div>

      <div className="text-center space-y-2">
        <div className="text-5xl font-light tabular-nums text-foreground">
          {secondsRemaining}s
        </div>
        <p className="text-xs text-muted-foreground">
          {canAdvance ? 'Ready when you are' : `Listening… ${MIN_PHRASE_SECONDS - elapsed}s until you can continue`}
        </p>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          variant={canAdvance ? 'default' : 'outline'}
          disabled={!canAdvance || isSaving}
          onClick={handleNextPhrase}
        >
          {isSaving
            ? 'Saving...'
            : isLast
              ? 'Complete Calibration'
              : <>Next Phrase <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
      </div>
    </div>
  );
};

export default SetupWizard;
