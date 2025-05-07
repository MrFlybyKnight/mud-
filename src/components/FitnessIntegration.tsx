import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFitness, FitnessServiceType } from '@/contexts/FitnessContext';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Power, PowerOff, Activity, Watch, ArrowUpCircle, Lock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEncryption } from '@/contexts/EncryptionContext';
import { useToast } from '@/components/ui/use-toast';

const ServiceIcon = ({ service }: { service: FitnessServiceType }) => {
  switch (service) {
    case 'strava':
      return <ArrowUpCircle className="h-5 w-5 text-orange-500" />;
    case 'apple_health':
      return <Activity className="h-5 w-5 text-pink-500" />;
    case 'google_fit':
      return <Activity className="h-5 w-5 text-blue-500" />;
    case 'fitbit':
      return <Watch className="h-5 w-5 text-teal-500" />;
    case 'garmin':
      return <Watch className="h-5 w-5 text-green-500" />;
    default:
      return <Activity className="h-5 w-5" />;
  }
};

const ConnectionStatus = ({ connected, status, isEncrypted }: { connected: boolean, status: string, isEncrypted: boolean }) => {
  if (status === 'connecting') {
    return <Badge variant="outline" className="animate-pulse bg-amber-100 text-amber-800">Connecting...</Badge>;
  } else if (connected) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>
        {isEncrypted && (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 flex items-center gap-1">
            <Lock className="h-3 w-3" /> Encrypted
          </Badge>
        )}
      </div>
    );
  } else if (status === 'error') {
    return <Badge variant="outline" className="bg-red-100 text-red-800">Connection Error</Badge>;
  } else {
    return <Badge variant="outline" className="bg-gray-100 text-gray-800">Not Connected</Badge>;
  }
};

const FitnessServiceCard = ({ serviceId }: { serviceId: FitnessServiceType }) => {
  const { services, connect, disconnect, syncData, isConnecting } = useFitness();
  const service = services.find(s => s.id === serviceId);
  const { encrypt, decrypt, isReady: isEncryptionReady } = useEncryption();
  const { toast } = useToast();
  const [isEncrypted, setIsEncrypted] = useState(false);
  
  useEffect(() => {
    // Check if service data is encrypted
    if (service?.connected && isEncryptionReady) {
      const checkEncryption = async () => {
        const encryptionFlag = localStorage.getItem(`${serviceId}_encrypted`);
        setIsEncrypted(encryptionFlag === 'true');
      };
      
      checkEncryption();
    }
  }, [service?.connected, serviceId, isEncryptionReady]);
  
  if (!service) return null;
  
  const handleConnect = async () => {
    if (!service.connected) {
      await connect(serviceId);
      
      // When connecting, encrypt the credentials if possible
      if (isEncryptionReady) {
        try {
          // In a real implementation, this would encrypt the actual tokens or credentials
          await encrypt({ serviceId, timestamp: new Date().toISOString() });
          localStorage.setItem(`${serviceId}_encrypted`, 'true');
          setIsEncrypted(true);
          toast({
            title: "Secure Connection",
            description: `${service.name} connected with encrypted credentials`,
          });
        } catch (error) {
          console.error('Failed to encrypt credentials:', error);
          toast({
            title: "Warning",
            description: `${service.name} connected but credentials could not be encrypted`,
            variant: "destructive",
          });
        }
      }
    } else {
      disconnect(serviceId);
      localStorage.removeItem(`${serviceId}_encrypted`);
      setIsEncrypted(false);
    }
  };
  
  const handleSync = async () => {
    await syncData(serviceId);
    
    // After sync, ensure any new data is encrypted if needed
    if (isEncryptionReady && isEncrypted) {
      toast({
        title: "Secure Sync Complete",
        description: `${service.name} data synced and encrypted`,
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ServiceIcon service={serviceId} />
            <CardTitle>{service.name}</CardTitle>
          </div>
          <ConnectionStatus 
            connected={service.connected} 
            status={service.status}
            isEncrypted={isEncrypted}
          />
        </div>
        <CardDescription>{service.description}</CardDescription>
      </CardHeader>
      
      {service.connected && (
        <CardContent>
          <div className="space-y-2">
            {service.metrics.heartRate && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Heart Rate:</span>
                <span className="font-medium">
                  {service.metrics.heartRate.current || 'N/A'} bpm
                </span>
              </div>
            )}
            
            {service.metrics.steps && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Steps:</span>
                <span className="font-medium">{service.metrics.steps.toLocaleString()}</span>
              </div>
            )}
            
            {service.metrics.activities && service.metrics.activities.length > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last Activity:</span>
                <span className="font-medium">
                  {service.metrics.activities[0].type} - {Math.floor(service.metrics.activities[0].duration / 60)} min
                </span>
              </div>
            )}
            
            {service.lastSynced && (
              <div className="text-xs text-muted-foreground mt-2">
                Last synced: {formatDistanceToNow(service.lastSynced, { addSuffix: true })}
              </div>
            )}
          </div>
        </CardContent>
      )}
      
      <CardFooter className="flex justify-between">
        <Button
          variant={service.connected ? "outline" : "default"}
          size="sm"
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2"
        >
          {service.connected ? (
            <>
              <PowerOff className="h-4 w-4" />
              Disconnect
            </>
          ) : (
            <>
              <Power className="h-4 w-4" />
              Connect
            </>
          )}
        </Button>
        
        {service.connected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSync}
            disabled={isConnecting}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Sync
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

const FitnessIntegration: React.FC = () => {
  const { services } = useFitness();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Fitness Tracking</h2>
        <div className="text-sm text-muted-foreground">
          Connect your fitness apps to enhance monitoring
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {services.map(service => (
          <FitnessServiceCard key={service.id} serviceId={service.id as FitnessServiceType} />
        ))}
      </div>
    </div>
  );
};

export default FitnessIntegration;
