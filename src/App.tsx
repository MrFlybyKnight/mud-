
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import { ProfileProvider } from './contexts/ProfileContext';
import { MonitoringProvider } from './contexts/MonitoringContext';
import { PlatformProvider } from './contexts/PlatformContext';
import { NotificationProvider } from './contexts/NotificationContext';
import WatchNotification from './components/WatchNotification';
import './App.css';

const App = () => {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
};

export default App;
