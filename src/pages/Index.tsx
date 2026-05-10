import React, { useEffect, useState } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import AuthForm from '@/components/AuthForm';
import PoweredByBadge from '@/components/PoweredByBadge';
import PermissionsScreen, { hasGrantedMic, hasDeclinedPermissions } from '@/components/PermissionsScreen';
import { hasGrantedPermissions as hasGrantedHealth } from '@/health/healthConnect';
// import MfaPrompt from '@/components/MfaPrompt';

const computePermsResolved = (): boolean => {
  try {
    if (hasGrantedHealth() && hasGrantedMic()) return true;
    if (hasDeclinedPermissions()) return true;
  } catch {
    /* ignore */
  }
  return false;
};

const AppContent: React.FC = () => {
  const { isSetupComplete } = useMonitoring();

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
  const [permsResolved, setPermsResolved] = useState<boolean>(() => computePermsResolved());

  // Re-evaluate synchronously when the user changes (e.g. after sign-in).
  useEffect(() => {
    setPermsResolved(user ? computePermsResolved() : false);
  }, [user]);

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
        <footer className="text-xs text-muted-foreground flex gap-4 pt-2">
          <a href="/privacy" className="hover:text-foreground underline-offset-4 hover:underline">
            Privacy Policy
          </a>
          <span aria-hidden>·</span>
          <a href="/terms" className="hover:text-foreground underline-offset-4 hover:underline">
            Terms of Service
          </a>
        </footer>
      </div>
    );
  }

  if (!permsResolved) {
    return <PermissionsScreen onDone={() => setPermsResolved(true)} />;
  }

  return (
    // <MfaPrompt>
      <AppContent />
    // </MfaPrompt>
  );
};

export default Index;
