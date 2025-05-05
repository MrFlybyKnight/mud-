
import React, { useEffect } from 'react';
import { MonitoringProvider, useMonitoring } from '@/contexts/MonitoringContext';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';

const AppContent: React.FC = () => {
  const { isSetupComplete, startSetup } = useMonitoring();

  useEffect(() => {
    // Start setup if it's not completed yet
    if (!isSetupComplete) {
      startSetup();
    }
  }, [isSetupComplete, startSetup]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  );
};

const Index: React.FC = () => {
  return (
    <MonitoringProvider>
      <AppContent />
    </MonitoringProvider>
  );
};

export default Index;
