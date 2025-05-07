
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
import WatchNotification from './components/WatchNotification';
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <PlatformProvider>
          <ProfileProvider>
            <MonitoringProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <WatchNotification />
                <Toaster />
              </NotificationProvider>
            </MonitoringProvider>
          </ProfileProvider>
        </PlatformProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
