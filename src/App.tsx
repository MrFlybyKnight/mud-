
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import { ProfileProvider } from './contexts/ProfileContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { PlatformProvider } from './contexts/PlatformContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FitnessProvider } from './contexts/FitnessContext';
import { EncryptionProvider } from './contexts/EncryptionContext';
import { AuthProvider } from './contexts/AuthContext';
import { TrustedCircleProvider } from './contexts/TrustedCircleContext';
import WatchNotification from './components/WatchNotification';
import EmergencyOverlay from './components/EmergencyOverlay';
import { DebugPanel } from './components/DebugPanel';
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <EncryptionProvider>
          <PlatformProvider>
            <AuthProvider>
              <ProfileProvider>
                <MonitoringProvider>
                  <TrustedCircleProvider>
                    <NotificationProvider>
                      <FitnessProvider>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                        <WatchNotification />
                        <EmergencyOverlay />
                        <DebugPanel />
                        <Toaster />
                      </FitnessProvider>
                    </NotificationProvider>
                  </TrustedCircleProvider>
                </MonitoringProvider>
              </ProfileProvider>
            </AuthProvider>
          </PlatformProvider>
        </EncryptionProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
