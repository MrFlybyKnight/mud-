
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Index from './pages/Index';
import Landing from './pages/Landing';
import { PrivacyPage, TermsPage, DeleteAccountPage } from './pages/Legal';
import NotFound from './pages/NotFound';
import { ProfileProvider } from './contexts/ProfileContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { PlatformProvider } from './contexts/PlatformContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FitnessProvider } from './contexts/FitnessContext';
import { EncryptionProvider } from './contexts/EncryptionContext';
import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './hooks/useSubscription';
import { UserSettingsProvider } from './contexts/UserSettingsContext';
import UpgradeModal from './components/UpgradeModal';
import { TrustedCircleProvider } from './contexts/TrustedCircleContext';
import WatchNotification from './components/WatchNotification';
import EmergencyOverlay from './components/EmergencyOverlay';
// DebugPanel removed for Play Store release.
import ThemeFirestoreSync from './components/ThemeFirestoreSync';
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <EncryptionProvider>
          <PlatformProvider>
            <AuthProvider>
              <SubscriptionProvider>
              <UserSettingsProvider>
              <ProfileProvider>
                <ThemeFirestoreSync />
                <MonitoringProvider>
                  <TrustedCircleProvider>
                    <NotificationProvider>
                      <FitnessProvider>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/landing" element={<Landing />} />
                          <Route path="/privacy" element={<PrivacyPage />} />
                          <Route path="/terms" element={<TermsPage />} />
                          <Route path="/delete-account" element={<DeleteAccountPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        <WatchNotification />
                        <EmergencyOverlay />
                        <UpgradeModal />
                        
                        <Toaster />
                      </FitnessProvider>
                    </NotificationProvider>
                  </TrustedCircleProvider>
                </MonitoringProvider>
              </ProfileProvider>
              </UserSettingsProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </PlatformProvider>
        </EncryptionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
