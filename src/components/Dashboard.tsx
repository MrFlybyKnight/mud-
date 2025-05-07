
import React from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useProfile } from '@/contexts/ProfileContext';
import { usePlatformContext } from '@/contexts/PlatformContext';
import HeartRateMonitor from './HeartRateMonitor';
import SpeechMonitor from './SpeechMonitor';
import EmotionMonitor from './EmotionMonitor';
import ActivityMonitor from './ActivityMonitor';
import EmergencyAlert from './EmergencyAlert';
import EmergencyContactManager from './EmergencyContactManager';
import SettingsDialog from './SettingsDialog';
import SetupWizard from './SetupWizard';
import ProfileSetup from './ProfileSetup';
import ProfileSelector from './ProfileSelector';
import AssessmentsDisplay from './AssessmentsDisplay';
import { PlatformLogo } from '@/components/ui/platform-icon';
import { platformClass } from '@/utils/platformUtils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, BarChart2, AlertTriangle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { isSetupComplete, startSetup, runInBackground, toggleBackgroundMode, currentEmergency } = useMonitoring();
  const { isProfileComplete } = useProfile();
  const { platform, isIOS, isAndroid } = usePlatformContext();

  // Show setup wizard if device calibration isn't complete
  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  // Show profile setup if no profile is configured
  if (!isProfileComplete) {
    return <ProfileSetup />;
  }
  
  // Platform-specific classes
  const containerClass = platformClass(platform, {
    base: "container max-w-4xl mx-auto px-4 mb-8",
    ios: "pt-2",
    android: "pt-4"
  });
  
  const tabsClass = platformClass(platform, {
    base: "mb-8",
    ios: "rounded-xl overflow-hidden",
    android: "rounded-md"
  });
  
  const tabsTriggerClass = platformClass(platform, {
    ios: "text-sm py-2",
    android: "text-base py-2.5"
  });

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between mb-4">
        <ProfileSelector />
        <div className="flex items-center gap-2 text-muted-foreground">
          <PlatformLogo size="small" />
          <span className="text-xs font-medium capitalize">
            {platform} mode
          </span>
        </div>
      </div>
      
      {currentEmergency !== 'none' && (
        <div className="my-6 animate-pulse">
          <EmergencyAlert />
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <HeartRateMonitor />
        <SpeechMonitor />
      </div>

      <div className="mb-8">
        <EmotionMonitor />
      </div>
      
      <Tabs defaultValue="assessments" className={tabsClass}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assessments" className={tabsTriggerClass}>
            <Clock className="mr-2 h-5 w-5" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="emergency" className={tabsTriggerClass}>
            <AlertTriangle className="mr-2 h-5 w-5" />
            Emergency Contacts
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="assessments" className="mt-4">
          <div className="bg-card shadow-sm rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">Hourly Assessment</h3>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="background-mode" className="text-sm">Run in background</Label>
                <Switch 
                  id="background-mode" 
                  checked={runInBackground} 
                  onCheckedChange={toggleBackgroundMode}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              The app collects data continuously and provides hourly assessments of your heart rate
              and speech patterns. You'll receive a notification after each assessment.
            </p>
            <AssessmentsDisplay />
          </div>
        </TabsContent>
        
        <TabsContent value="emergency" className="mt-4">
          <EmergencyContactManager />
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-center gap-4 flex-wrap">
        <SettingsDialog />
        <Button variant="outline" onClick={startSetup}>Re-calibrate</Button>
        <Button variant="outline" id="profile-setup" onClick={() => {}}>Edit Profile</Button>
      </div>
      
      <div className="mt-8 p-4 bg-accent rounded-lg">
        <h2 className="font-semibold mb-2">How It Works</h2>
        <p className="text-sm text-muted-foreground">
          This app simulates smartwatch monitoring of your heart rate and speech patterns,
          while tracking your daily activities. Your vital signs are analyzed within the context
          of your current activity for more meaningful insights.
        </p>
        {(isIOS || isAndroid) && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center">
              <PlatformLogo className="mr-2" size="small" />
              <p className="text-xs text-muted-foreground">
                {isIOS ? 'iOS' : 'Android'} version optimized for your device
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
