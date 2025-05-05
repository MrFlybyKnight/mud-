
import React from 'react';
import HeartRateMonitor from './HeartRateMonitor';
import SpeechMonitor from './SpeechMonitor';
import SettingsDialog from './SettingsDialog';

const Dashboard: React.FC = () => {
  return (
    <div className="container max-w-4xl mx-auto px-4 mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <HeartRateMonitor />
        <SpeechMonitor />
      </div>
      
      <div className="flex justify-center">
        <SettingsDialog />
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
