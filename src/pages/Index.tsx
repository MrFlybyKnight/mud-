import React, { useEffect } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import AuthForm from '@/components/AuthForm';

const AppContent: React.FC = () => {
  const {
    isSetupComplete,
    isSetupHydrating,
    isMonitoring,
    toggleMonitoring,
    manualSync
  } = useMonitoring();

  useEffect(() => {
    if (isSetupHydrating) return;
    if (!isMonitoring && isSetupComplete) {
      toggleMonitoring();
    }
    if (isSetupComplete) {
      console.log('Navigating to dashboard');
      manualSync();
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isSetupComplete) {
        manualSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isSetupComplete, isSetupHydrating, isMonitoring, toggleMonitoring, manualSync]);

  return (
    <div className="min-h-screen bg-background">
      {!isSetupComplete && <Header />}
      <main>
        <Dashboard />
      </main>
    </div>
  );
};

const Index: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 gap-6">
        <h1 className="text-3xl font-bold">MūD</h1>
        <AuthForm />
      </div>
    );
  }

  return <AppContent />;
};

export default Index;
