
import React, { useEffect } from 'react';
import { MonitoringProvider, useMonitoring } from '@/contexts/MonitoringContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';

const AppContent: React.FC = () => {
  const { 
    isSetupComplete, 
    startSetup, 
    isMonitoring, 
    toggleMonitoring,
    manualSync
  } = useMonitoring();

  useEffect(() => {
    // Start setup if it's not completed yet
    if (!isSetupComplete) {
      startSetup();
    }

    // Always ensure monitoring is active when app is visible
    if (!isMonitoring && isSetupComplete) {
      toggleMonitoring();
    }
    
    // Trigger initial sync when app loads
    if (isSetupComplete) {
      manualSync();
    }

    // Simulate page visibility events for background processing
    const handleVisibilityChange = () => {
      console.log(`App visibility changed: ${document.visibilityState}`);
      
      // When page becomes visible again, trigger a sync
      if (document.visibilityState === 'visible' && isSetupComplete) {
        manualSync();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSetupComplete, startSetup, isMonitoring, toggleMonitoring, manualSync]);

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
    <ProfileProvider>
      <MonitoringProvider>
        <AppContent />
      </MonitoringProvider>
    </ProfileProvider>
  );
};

export default Index;
