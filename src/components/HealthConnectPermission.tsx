import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Heart } from 'lucide-react';
import { requestHealthConnectPermissions, setSimulationMode } from '@/health/healthConnect';

interface Props {
  onDone: () => void;
}

const HealthConnectPermission: React.FC<Props> = ({ onDone }) => {
  const [busy, setBusy] = useState(false);

  const handleGrant = async () => {
    setBusy(true);
    try {
      await requestHealthConnectPermissions();
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const handleSkip = () => {
    setSimulationMode(true);
    try { localStorage.setItem('healthConnect.permissionsGranted', '1'); } catch { /* noop */ }
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full p-6 space-y-5 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Heart className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold">Connect Health Data</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          MūD reads your heart rate from Health Connect to detect emotional patterns.
          Your data never leaves your device without your permission.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleGrant} disabled={busy} className="w-full">
            {busy ? 'Requesting…' : 'Grant Access'}
          </Button>
          <Button onClick={handleSkip} variant="ghost" disabled={busy} className="w-full">
            Skip for now
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default HealthConnectPermission;
