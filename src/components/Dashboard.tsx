
import React from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import HeartRateMonitor from './HeartRateMonitor';
import SpeechMonitor from './SpeechMonitor';
import SettingsDialog from './SettingsDialog';
import SetupWizard from './SetupWizard';
import AssessmentsDisplay from './AssessmentsDisplay';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Clock, BarChart2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { isSetupComplete, startSetup, runInBackground, toggleBackgroundMode } = useMonitoring();

  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <HeartRateMonitor />
        <SpeechMonitor />
      </div>
      
      <div className="mb-8 bg-card shadow-sm rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
            <h3 className="font-medium">Hourly Assessment</h3>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="background-mode" className="text-sm">Run in background</Label>
            <Switch 
              id="background-mode" 
              checked={runInBackground} 
              onCheckedChange={toggleBackgroundMode}
            />
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          The app collects data continuously and provides hourly assessments of your heart rate
          and speech patterns. You'll receive a notification after each assessment.
        </p>
        <AssessmentsDisplay />
      </div>
      
      <div className="flex justify-center gap-4 flex-wrap">
        <SettingsDialog />
        <Button variant="outline" onClick={startSetup}>Re-calibrate</Button>
      </div>
      
      <div className="mt-8 p-4 bg-accent rounded-lg">
        <h2 className="font-semibold mb-2">How It Works</h2>
        <p className="text-sm text-muted-foreground">
          This app simulates smartwatch monitoring of your heart rate and speech patterns.
          Use the "Start Monitoring" button to begin tracking, and "Simulating Speech" to simulate talking.
          Customize the thresholds to match your personal needs.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          On a real smartwatch, this would use the heart rate sensor and microphone to provide
          real-time feedback about your conversation habits.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
