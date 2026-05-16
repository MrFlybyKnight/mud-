import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Heart, Mic, Lock, Loader2, Bluetooth } from 'lucide-react';
import {
  requestHealthConnectPermissions,
  setSimulationMode,
  hasGrantedPermissions as hasGrantedHealth,
} from '@/health/healthConnect';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserSettings } from '@/firebase/firestore';

const MIC_KEY = 'microphone.permissionsGranted';

export function hasGrantedMic(): boolean {
  try { return localStorage.getItem(MIC_KEY) === '1'; } catch { return false; }
}

export function hasDeclinedPermissions(): boolean {
  try { return localStorage.getItem('permissions.declined') === '1'; } catch { return false; }
}

async function requestMicPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    try { localStorage.setItem(MIC_KEY, '1'); } catch { /* noop */ }
    return true;
  } catch (e) {
    console.warn('[Permissions] microphone request failed', e);
    return false;
  }
}

interface Props {
  onDone: () => void;
}

const PermissionsScreen: React.FC<Props> = ({ onDone }) => {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const [step, setStep] = useState<'bluetooth' | 'sensors'>('bluetooth');

  const persistDeclined = async () => {
    try { localStorage.setItem('permissions.declined', '1'); } catch { /* noop */ }
    if (user?.uid) {
      try {
        await updateUserSettings(user.uid, { permissionsDeclined: true } as never);
      } catch (e) {
        console.warn('[Permissions] failed to persist declined flag', e);
      }
    }
  };

  const handleGrant = async () => {
    setBusy(true);
    try {
      await Promise.all([requestMicPermission(), requestHealthConnectPermissions()]);
      if (dontAsk) await persistDeclined();
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const handleSkip = async () => {
    setBusy(true);
    try {
      setSimulationMode(true);
      if (dontAsk) await persistDeclined();
    } finally {
      setBusy(false);
      onDone();
    }
  };

  if (step === 'bluetooth') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto rounded-full bg-primary/10 p-4 w-fit">
              <Bluetooth className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">Connect your smartwatch</h2>
            <p className="text-sm text-muted-foreground">
              MūD uses Bluetooth to connect to your smartwatch to read your heart rate and HRV in real time.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => setStep('sensors')} className="w-full">
              Continue
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-semibold">Allow MūD to listen and sense</h2>
          <p className="text-sm text-muted-foreground">
            We use these to detect emotional patterns in real time. You can change this anytime in Settings.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex gap-3 items-start">
            <div className="rounded-full bg-primary/10 p-3 shrink-0">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Health Connect</p>
              <p className="text-sm text-muted-foreground">
                Reads your heart rate so MūD can detect stress, calm, and excitement.
              </p>
            </div>
          </div>

          <div className="flex gap-3 items-start">
            <div className="rounded-full bg-primary/10 p-3 shrink-0">
              <Mic className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">Microphone</p>
              <p className="text-sm text-muted-foreground">
                Analyzes tone and pace of your voice.
              </p>
              <p className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1">
                <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                Audio is processed on-device and not recorded.
              </p>
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={dontAsk}
            onCheckedChange={(v) => setDontAsk(v === true)}
          />
          Don't ask me again
        </label>

        <div className="flex flex-col gap-2">
          <Button onClick={handleGrant} disabled={busy} className="w-full">
            {busy ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Requesting…</>
            ) : (
              'Grant Access'
            )}
          </Button>
          <Button onClick={handleSkip} variant="ghost" disabled={busy} className="w-full">
            Set Up Later
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PermissionsScreen;
