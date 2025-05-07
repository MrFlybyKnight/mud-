
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFitness, FitnessServiceType } from '@/contexts/FitnessContext';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Power, PowerOff, Activity, Watch, ArrowUpCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

const ConnectionStatus = ({ connected, status }: { connected: boolean, status: string }) => {
  if (status === 'connecting') {
    return <Badge variant="outline" className="animate-pulse bg-amber-100 text-amber-800">Connecting...</Badge>;
  } else if (connected) {
    return <Badge variant="outline" className="bg-green-100 text-green-800">Connected</Badge>;
  } else if (status === 'error') {
    return <Badge variant="outline" className="bg-red-100 text-red-800">Connection Error</Badge>;
  } else {
    return <Badge variant="outline" className="bg-gray-100 text-gray-800">Not Connected</Badge>;
  }
};

const FitnessServiceCard = ({ serviceId }: { serviceId: FitnessServiceType }) => {
  const { services, connect, disconnect, syncData, isConnecting } = useFitness();
  const service = services.find(s => s.id === serviceId);
  
  if (!service) return null;
  
  const handleConnect = async () => {
    if (!service.connected) {
      await connect(serviceId);
    } else {
      disconnect(serviceId);
    }
  };
  
  const handleSync = async () => {
    await syncData(serviceId);
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ServiceIcon service={serviceId} />
            <CardTitle>{service.name}</CardTitle>
          </div>
          <ConnectionStatus connected={service.connected} status={service.status} />
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
