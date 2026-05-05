
import React, { useState, useEffect } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useAuth } from '@/contexts/AuthContext';
import { upsertUserProfile } from '@/firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Heart, Mic, TimerIcon, ArrowRight } from 'lucide-react';
import { calibrationSequence, type CalibrationPhrase } from '@/data/calibrationSequence';

const TOTAL_STEPS = 2;

const SetupWizard: React.FC = () => {
  const {
    setupStep,
    nextSetupStep,
    completeSetup,
    baselineHeartRate,
    setBaselineHeartRate,
    setBaselineVoiceSpeed,
    setBaselineVoiceTone,
  } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();

  const [progress, setProgress] = useState(0);
  const [calibrationValue, setCalibrationValue] = useState(0);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isCalibrating) return;
    const totalDuration = 30;
    const timer = setInterval(() => {
      let finished = false;
      setSecondsLeft(prev => {
        const next = prev - 1;
        if (next <= 0) { finished = true; return 0; }
        setProgress(((totalDuration - next) / totalDuration) * 100);
        return next;
      });
      if (finished) {
        clearInterval(timer);
        setIsCalibrating(false);
        const simulatedHeartRate = Math.round(60 + Math.random() * 40);
        setBaselineHeartRate(simulatedHeartRate);
        setCalibrationValue(simulatedHeartRate);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isCalibrating, setBaselineHeartRate]);

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationValue(0);
    setProgress(0);
    setSecondsLeft(30);
  };

  const saveVoiceBaseline = async (
    rate: number,
    toneAverage: number,
    accentProfile: Record<string, number>,
  ) => {
    if (!user?.uid) {
      toast({ title: 'Not signed in', description: 'Please sign in before continuing.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      console.log('[SetupWizard] Writing voice baseline for uid:', user.uid, { rate, toneAverage, accentProfile });
      await setDoc(
        doc(db, 'users', user.uid),
        {
          baselineSpeechRate: rate,
          baselineVoiceToneAverage: toneAverage,
          baselineAccentProfile: accentProfile,
          baselineVoiceCalibrationAt: serverTimestamp(),
        },
        { merge: true },
      );
      setBaselineVoiceSpeed(rate);
      setBaselineVoiceTone(toneAverage);
      toast({ title: 'Voice baseline saved', description: 'Calibration complete.' });

      if (user) {
        try {
          await upsertUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
        } catch (e) {
          console.error('Failed to upsert user profile:', e);
        }
      }
      completeSetup();
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
        toast({ title: 'Not signed in', description: 'Please sign in before continuing.', variant: 'destructive' });
        return;
      }
      setIsSaving(true);
      try {
        console.log('[SetupWizard] Writing baselineHeartRate for uid:', user.uid, 'value:', calibrationValue);
        await setDoc(
          doc(db, 'users', user.uid),
          { baselineHeartRate: calibrationValue, baselineHeartRateAt: serverTimestamp() },
          { merge: true },
        );
        console.log('[SetupWizard] baselineHeartRate write SUCCEEDED for uid:', user.uid);
        toast({ title: 'Baseline heart rate saved', description: `${calibrationValue} BPM saved to cloud.` });
        setCalibrationValue(0);
        nextSetupStep();
      } catch (e: any) {
        const code = e?.code ?? 'unknown';
        const message = e?.message ?? String(e);
        console.error('[SetupWizard] baselineHeartRate write FAILED:', { code, message, error: e });
        toast({ title: 'Save failed', description: `${code}: ${message}`, variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
    }
    // Step 2 advances itself via "Complete Calibration" inside VoiceSequenceCalibration.
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
            onFinalize={saveVoiceBaseline}
            isSaving={isSaving}
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
            Setup Wizard: Step {setupStep} of {TOTAL_STEPS}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderStepContent()}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <div className="text-base text-muted-foreground">
            {setupStep}/{TOTAL_STEPS} steps complete
          </div>
          {setupStep === 1 && (
            <Button
              size="lg"
              className="text-lg"
              onClick={handleNext}
              disabled={isCalibrating || isSaving || calibrationValue === 0}
            >
              {isSaving ? 'Saving...' : <>Next <ArrowRight className="ml-2 h-5 w-5" /></>}
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
  isCalibrating, progress, secondsLeft, calibrationValue, startCalibration,
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

interface VoiceSequenceCalibrationProps {
  onFinalize: (
    rate: number,
    toneAverage: number,
    accentProfile: Record<string, number>,
  ) => void | Promise<void>;
  isSaving: boolean;
}

interface PhraseSample {
  pitchHz: number;
  wpm: number;
  targetRange: string;
}

const MIN_PHRASE_SECONDS = 8;
const MAX_PHRASE_SECONDS = 15;

const sampleForPhrase = (phrase: CalibrationPhrase, elapsedSeconds: number): PhraseSample => {
  // Simulated per-phrase measurements derived from the recording window.
  const wordCount = phrase.phrase.split(/\s+/).length;
  const wpm = Math.round((wordCount / Math.max(elapsedSeconds, 1)) * 60 + (Math.random() * 20 - 10));
  const pitchHz = Math.round(95 + Math.random() * 130); // 95–225 Hz spread
  return { pitchHz, wpm, targetRange: phrase.targetRange };
};

const VoiceSequenceCalibration: React.FC<VoiceSequenceCalibrationProps> = ({ onFinalize, isSaving }) => {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [samples, setSamples] = useState<PhraseSample[]>([]);

  const total = calibrationSequence.length;
  const current = calibrationSequence[index];
  const isLast = index === total - 1;

  const handleNextPhrase = React.useCallback(async () => {
    const sample = sampleForPhrase(current, elapsed);
    const allSamples = [...samples, sample];

    if (isLast) {
      const avgRate = Math.round(allSamples.reduce((s, x) => s + x.wpm, 0) / allSamples.length);
      const avgPitch = Math.round(allSamples.reduce((s, x) => s + x.pitchHz, 0) / allSamples.length);

      // Accent profile: average pitch grouped by phonetic target range.
      const grouped: Record<string, number[]> = {};
      for (const s of allSamples) {
        if (!grouped[s.targetRange]) grouped[s.targetRange] = [];
        grouped[s.targetRange].push(s.pitchHz);
      }
      const accentProfile: Record<string, number> = {};
      for (const [k, vals] of Object.entries(grouped)) {
        accentProfile[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }

      console.log('[VoiceCalibration] Finalizing baseline', { avgRate, avgPitch, accentProfile });
      await onFinalize(avgRate, avgPitch, accentProfile);
      return;
    }

    setSamples(allSamples);
    setIndex((i) => i + 1);
    setElapsed(0);
  }, [isLast, onFinalize, current, elapsed, samples]);

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
      <div className="space-y-6 py-6 text-center">
        <Mic size={80} className="mx-auto text-muted-foreground" />
        <h3 className="text-2xl md:text-3xl font-semibold">Voice Baseline Calibration</h3>
        <p className="text-xl text-muted-foreground leading-relaxed">
          You'll read {total} short phrases aloud. MūD will listen and measure
          your speech rate, average vocal pitch, and natural accent pattern.
          Take your time — at least 8 seconds per phrase.
        </p>
        <Button size="lg" className="text-lg" onClick={() => setStarted(true)}>
          Start Voice Calibration
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      <div className="text-center text-base font-medium text-muted-foreground tracking-wide uppercase">
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
        <p className="text-base text-muted-foreground italic">
          {current.targetRange}
        </p>
      </div>

      <div className="text-center space-y-2">
        <div className="text-5xl font-light tabular-nums text-foreground">
          {secondsRemaining}s
        </div>
        <p className="text-base text-muted-foreground">
          {canAdvance ? 'Ready when you are' : `Listening… ${MIN_PHRASE_SECONDS - elapsed}s until you can continue`}
        </p>
      </div>

      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          className="text-lg"
          variant={canAdvance ? 'default' : 'outline'}
          disabled={!canAdvance || isSaving}
          onClick={handleNextPhrase}
        >
          {isSaving
            ? 'Saving...'
            : isLast
              ? 'Complete Calibration'
              : <>Next Phrase <ArrowRight className="ml-2 h-5 w-5" /></>}
        </Button>
      </div>
    </div>
  );
};

export default SetupWizard;
