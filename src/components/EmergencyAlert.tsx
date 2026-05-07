
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone } from 'lucide-react';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { platformClass } from '@/utils/platformUtils';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useProfile } from '@/contexts/ProfileContext';

const EmergencyAlert = () => {
  const { platform } = usePlatformContext();
  const { resolveEmergency } = useMonitoring();
  const { currentProfile } = useProfile();
  
  const cardClass = platformClass(platform, {
    base: "border-red-500 bg-red-50 shadow-md animate-pulse",
    ios: "rounded-xl",
    android: "rounded-lg"
  });

  const handleEmergencyCall = () => {
    // Use user's phone or default to emergency services
    const phoneToCall = currentProfile.phoneNumber || '911';
    
    console.log('Emergency call initiated to', phoneToCall);
    // In a real app, this would connect to emergency services.
    // The distress event has already been written to Firestore by the
    // event-driven trigger in MonitoringContext.
  };
  
  const handleDismiss = () => {
    // Clear the emergency state. No additional Firestore write here —
    // writes are strictly event-driven.
    resolveEmergency();
  };

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-red-600">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Emergency Alert
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">
          Abnormal vital signs detected. Do you need emergency assistance?
        </p>
        <div className="flex justify-between">
          <Button variant="destructive" onClick={handleEmergencyCall} className="flex gap-2">
            <Phone className="h-4 w-4" />
            Call Emergency Services
          </Button>
          <Button variant="outline" onClick={handleDismiss}>I'm Fine</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmergencyAlert;
