
import React from 'react';
import { MonitoringProvider } from '@/contexts/MonitoringContext';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';

const Index: React.FC = () => {
  return (
    <MonitoringProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <main>
          <Dashboard />
        </main>
      </div>
    </MonitoringProvider>
  );
};

export default Index;
