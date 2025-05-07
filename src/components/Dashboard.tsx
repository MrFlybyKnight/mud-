
import React from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useProfile } from '@/contexts/ProfileContext';
import HeartRateMonitor from './HeartRateMonitor';
import SpeechMonitor from './SpeechMonitor';
import EmotionMonitor from './EmotionMonitor';
import ActivityMonitor from './ActivityMonitor';
import SettingsDialog from './SettingsDialog';
import SetupWizard from './SetupWizard';
import ProfileSetup from './ProfileSetup';
import ProfileSelector from './ProfileSelector';
import AssessmentsDisplay from './AssessmentsDisplay';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, Calendar, Settings } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { isSetupComplete, startSetup, runInBackground, toggleBackgroundMode } = useMonitoring();
  const { isProfileComplete } = useProfile();

  // Show setup wizard if device calibration isn't complete
  if (!isSetupComplete) {
    return <SetupWizard />;
  }

  // Show profile setup if no profile is configured
  if (!isProfileComplete) {
    return <ProfileSetup />;
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 mb-8">
      <ProfileSelector />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <HeartRateMonitor />
        <SpeechMonitor />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <EmotionMonitor />
        <ActivityMonitor />
      </div>
      
      <Tabs defaultValue="assessments" className="mb-8">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="assessments">
            <Clock className="mr-2 h-5 w-5" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="mr-2 h-5 w-5" />
            Daily Schedule
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
        
        <TabsContent value="schedule" className="mt-4">
          <div className="bg-card shadow-sm rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-muted-foreground" />
                <h3 className="font-medium">Daily Activity Schedule</h3>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground mb-4">
              The app automatically identifies your daily activities based on the time of day.
              Activity detection helps contextualize your heart rate and speech patterns.
            </p>
            
            <div className="space-y-3 mt-4">
              <ActivityScheduleItem time="6:00 - 6:30" activity="Wake Up" color="amber" />
              <ActivityScheduleItem time="6:30 - 7:30" activity="Morning Routine" color="orange" />
              <ActivityScheduleItem time="7:30 - 8:00" activity="Travel to Work" color="blue" />
              <ActivityScheduleItem time="8:00 - 12:00" activity="Morning Work" color="cyan" />
              <ActivityScheduleItem time="12:00 - 13:00" activity="Lunch Time" color="green" />
              <ActivityScheduleItem time="13:00 - 17:00" activity="Afternoon Work" color="cyan" />
              <ActivityScheduleItem time="17:00 - 17:30" activity="Travel Home" color="purple" />
              <ActivityScheduleItem time="17:30 - 19:00" activity="Evening Routine" color="rose" />
              <ActivityScheduleItem time="19:00 - 20:00" activity="Dinner Time" color="amber" />
              <ActivityScheduleItem time="22:00 - 6:00" activity="Rest" color="indigo" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-center gap-4 flex-wrap">
        <SettingsDialog />
        <Button variant="outline" onClick={startSetup}>Re-calibrate</Button>
        <Button variant="outline" id="profile-setup">Edit Profile</Button>
      </div>
      
      <div className="mt-8 p-4 bg-accent rounded-lg">
        <h2 className="font-semibold mb-2">How It Works</h2>
        <p className="text-sm text-muted-foreground">
          This app simulates smartwatch monitoring of your heart rate and speech patterns,
          while tracking your daily activities. Your vital signs are analyzed within the context
          of your current activity for more meaningful insights.
        </p>
      </div>
    </div>
  );
};

// Helper component for schedule display
const ActivityScheduleItem: React.FC<{ 
  time: string; 
  activity: string; 
  color: string;
}> = ({ time, activity, color }) => {
  const colors: Record<string, string> = {
    'indigo': 'bg-indigo-100 border-indigo-300 text-indigo-800',
    'amber': 'bg-amber-100 border-amber-300 text-amber-800', 
    'orange': 'bg-orange-100 border-orange-300 text-orange-800',
    'blue': 'bg-blue-100 border-blue-300 text-blue-800',
    'cyan': 'bg-cyan-100 border-cyan-300 text-cyan-800',
    'green': 'bg-green-100 border-green-300 text-green-800',
    'purple': 'bg-purple-100 border-purple-300 text-purple-800',
    'rose': 'bg-rose-100 border-rose-300 text-rose-800',
    'gray': 'bg-gray-100 border-gray-300 text-gray-800'
  };
  
  const colorClass = colors[color] || colors.gray;
  
  return (
    <div className={`flex items-center justify-between p-2 rounded-md border ${colorClass}`}>
      <div className="font-medium">{activity}</div>
      <div className="text-sm">{time}</div>
    </div>
  );
};

export default Dashboard;
