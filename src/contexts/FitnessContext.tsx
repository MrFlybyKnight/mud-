
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from './ProfileContext';
import { readLatestHeartRate, readRestingHeartRate, isAvailable as isHealthConnectAvailable } from '@/health/healthConnect';

// Define the types of fitness services we support
export type FitnessServiceType = 'strava' | 'apple_health' | 'google_fit' | 'fitbit' | 'garmin' | 'none';

// Define the connection status
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Define the fitness service interface
export interface FitnessService {
  id: FitnessServiceType;
  name: string;
  description: string;
  connected: boolean;
  lastSynced: Date | null;
  status: ConnectionStatus;
  metrics: {
    steps?: number;
    heartRate?: {
      current?: number;
      resting?: number;
      max?: number;
    };
    activities?: Array<{
      type: string;
      duration: number;
      startTime: Date;
      endTime: Date;
      calories?: number;
    }>;
    sleep?: {
      duration: number;
      quality: number;
      startTime: Date;
      endTime: Date;
    };
  };
}

// Define the context interface
interface FitnessContextType {
  services: FitnessService[];
  activeService: FitnessServiceType;
  isConnecting: boolean;
  connect: (serviceType: FitnessServiceType) => Promise<boolean>;
  disconnect: (serviceType: FitnessServiceType) => void;
  syncData: (serviceType: FitnessServiceType) => Promise<boolean>;
  setActiveService: (serviceType: FitnessServiceType) => void;
}

// Create the context
export const FitnessContext = createContext<FitnessContextType | null>(null);

// Define the default fitness services
const defaultServices: FitnessService[] = [
  {
    id: 'strava',
    name: 'Strava',
    description: 'Connect with Strava to track your runs, rides, and other activities.',
    connected: false,
    lastSynced: null,
    status: 'disconnected',
    metrics: {}
  },
  {
    id: 'apple_health',
    name: 'Apple Health',
    description: 'Sync with Apple Health to track fitness and health metrics.',
    connected: false,
    lastSynced: null,
    status: 'disconnected',
    metrics: {}
  },
  {
    id: 'google_fit',
    name: 'Google Fit',
    description: 'Connect with Google Fit to track activities and health data.',
    connected: false,
    lastSynced: null,
    status: 'disconnected',
    metrics: {}
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    description: 'Sync with Fitbit to monitor activity, sleep, and heart rate.',
    connected: false,
    lastSynced: null,
    status: 'disconnected',
    metrics: {}
  },
  {
    id: 'garmin',
    name: 'Garmin',
    description: 'Connect with Garmin to track workouts and health metrics.',
    connected: false,
    lastSynced: null,
    status: 'disconnected',
    metrics: {}
  }
];

// Create the fitness provider component
export const FitnessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<FitnessService[]>(defaultServices);
  const [activeService, setActiveService] = useState<FitnessServiceType>('none');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const { toast } = useToast();
  const { currentProfile, updateProfile } = useProfile();

  // Connect to a fitness service
  const connect = async (serviceType: FitnessServiceType): Promise<boolean> => {
    try {
      setIsConnecting(true);
      
      // Update the service status to connecting
      setServices(prev =>
        prev.map(service =>
          service.id === serviceType
            ? { ...service, status: 'connecting' }
            : service
        )
      );

      // Simulate API connection - in a real app, this would be an OAuth flow
      const success = await simulateConnection(serviceType);
      
      if (success) {
        // Update the service
        setServices(prev =>
          prev.map(service =>
            service.id === serviceType
              ? {
                  ...service,
                  connected: true,
                  status: 'connected',
                  lastSynced: new Date()
                }
              : service
          )
        );
        
        setActiveService(serviceType);
        
        // Show success toast
        toast({
          title: 'Connected',
          description: `Successfully connected to ${getServiceName(serviceType)}.`,
        });
        
        // After connecting, sync data
        await syncData(serviceType);
        
        return true;
      } else {
        // Update service status to error
        setServices(prev =>
          prev.map(service =>
            service.id === serviceType
              ? { ...service, status: 'error' }
              : service
          )
        );
        
        // Show error toast
        toast({
          title: 'Connection Failed',
          description: `Failed to connect to ${getServiceName(serviceType)}. Please try again.`,
          variant: 'destructive',
        });
        
        return false;
      }
    } catch (error) {
      console.error('Error connecting to fitness service:', error);
      
      // Update service status to error
      setServices(prev =>
        prev.map(service =>
          service.id === serviceType
            ? { ...service, status: 'error' }
            : service
        )
      );
      
      // Show error toast
      toast({
        title: 'Connection Error',
        description: `An error occurred while connecting to ${getServiceName(serviceType)}.`,
        variant: 'destructive',
      });
      
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect from a fitness service
  const disconnect = (serviceType: FitnessServiceType): void => {
    // Update the service
    setServices(prev =>
      prev.map(service =>
        service.id === serviceType
          ? {
              ...service,
              connected: false,
              status: 'disconnected',
              metrics: {}
            }
          : service
      )
    );

    // If active service is disconnected, set active to none
    if (activeService === serviceType) {
      setActiveService('none');
    }

    // Show toast
    toast({
      title: 'Disconnected',
      description: `Disconnected from ${getServiceName(serviceType)}.`,
    });
  };

  // Sync data from a fitness service
  const syncData = async (serviceType: FitnessServiceType): Promise<boolean> => {
    try {
      // Check if service is connected
      const service = services.find(s => s.id === serviceType);
      if (!service || !service.connected) {
        toast({
          title: 'Not Connected',
          description: `Please connect to ${getServiceName(serviceType)} before syncing data.`,
          variant: 'destructive',
        });
        return false;
      }
      
      // Show sync toast
      toast({
        title: 'Syncing Data',
        description: `Syncing data from ${getServiceName(serviceType)}...`,
      });
      
      // Simulate API data fetch - in a real app, this would call the actual API
      const data = await simulateDataFetch(serviceType);
      
      // Update the service with the new data
      setServices(prev =>
        prev.map(service =>
          service.id === serviceType
            ? {
                ...service,
                metrics: data,
                lastSynced: new Date()
              }
            : service
        )
      );
      
      // Update profile with heart rate data if available
      if (data.heartRate?.resting && currentProfile) {
        updateProfile(currentProfile.id, {
          baselineHeartRateResting: data.heartRate.resting,
          baselineHeartRateActive: data.heartRate.max || data.heartRate.current || data.heartRate.resting + 60,
        });
      }
      
      // Show success toast
      toast({
        title: 'Sync Complete',
        description: `Successfully synced data from ${getServiceName(serviceType)}.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error syncing data from fitness service:', error);
      
      // Show error toast
      toast({
        title: 'Sync Error',
        description: `An error occurred while syncing data from ${getServiceName(serviceType)}.`,
        variant: 'destructive',
      });
      
      return false;
    }
  };

  // Helper function to get service name
  const getServiceName = (serviceType: FitnessServiceType): string => {
    const service = services.find(s => s.id === serviceType);
    return service ? service.name : 'Unknown Service';
  };

  // Simulate connection to fitness service
  const simulateConnection = async (serviceType: FitnessServiceType): Promise<boolean> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 90% success rate for simulation
    return Math.random() < 0.9;
  };

  // Simulate fetching data from fitness service
  const simulateDataFetch = async (serviceType: FitnessServiceType): Promise<any> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock data based on service type
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    switch (serviceType) {
      case 'strava':
        return {
          activities: [
            {
              type: 'Run',
              duration: 45 * 60, // 45 minutes in seconds
              startTime: yesterday,
              endTime: new Date(yesterday.getTime() + 45 * 60 * 1000),
              calories: 450
            }
          ],
          heartRate: {
            current: 72 + Math.floor(Math.random() * 10),
            resting: 60 + Math.floor(Math.random() * 8),
            max: 160 + Math.floor(Math.random() * 20)
          }
        };
      case 'apple_health':
        return {
          steps: 8000 + Math.floor(Math.random() * 4000),
          heartRate: {
            current: 70 + Math.floor(Math.random() * 10),
            resting: 58 + Math.floor(Math.random() * 7),
            max: 165 + Math.floor(Math.random() * 15)
          },
          sleep: {
            duration: 7 * 60 * 60, // 7 hours in seconds
            quality: 85 + Math.floor(Math.random() * 15),
            startTime: new Date(yesterday.setHours(22, 30)),
            endTime: new Date(yesterday.setHours(6, 30))
          }
        };
      case 'google_fit': {
        // Use Health Connect when available; fall back to simulated values otherwise.
        const available = await isHealthConnectAvailable();
        if (available) {
          const [current, resting] = await Promise.all([
            readLatestHeartRate(),
            readRestingHeartRate(),
          ]);
          return {
            heartRate: {
              current: current ?? undefined,
              resting: resting ?? undefined,
            },
          };
        }
        return {
          steps: 7500 + Math.floor(Math.random() * 3000),
          activities: [
            {
              type: 'Walking',
              duration: 30 * 60,
              startTime: yesterday,
              endTime: new Date(yesterday.getTime() + 30 * 60 * 1000),
              calories: 200,
            },
          ],
          heartRate: {
            current: 68 + Math.floor(Math.random() * 12),
            resting: 62 + Math.floor(Math.random() * 6),
          },
        };
      }
      case 'fitbit':
        return {
          steps: 9000 + Math.floor(Math.random() * 3000),
          heartRate: {
            current: 71 + Math.floor(Math.random() * 9),
            resting: 61 + Math.floor(Math.random() * 5),
            max: 155 + Math.floor(Math.random() * 25)
          },
          sleep: {
            duration: 6.5 * 60 * 60, // 6.5 hours in seconds
            quality: 80 + Math.floor(Math.random() * 15),
            startTime: new Date(yesterday.setHours(23, 0)),
            endTime: new Date(yesterday.setHours(5, 30))
          }
        };
      case 'garmin':
        return {
          activities: [
            {
              type: 'Cycling',
              duration: 60 * 60, // 60 minutes in seconds
              startTime: yesterday,
              endTime: new Date(yesterday.getTime() + 60 * 60 * 1000),
              calories: 550
            }
          ],
          heartRate: {
            current: 69 + Math.floor(Math.random() * 11),
            resting: 59 + Math.floor(Math.random() * 7),
            max: 170 + Math.floor(Math.random() * 15)
          }
        };
      default:
        return {};
    }
  };

  const value = {
    services,
    activeService,
    isConnecting,
    connect,
    disconnect,
    syncData,
    setActiveService
  };
  
  return (
    <FitnessContext.Provider value={value}>
      {children}
    </FitnessContext.Provider>
  );
};

// Custom hook to use the fitness context
export const useFitness = () => {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitness must be used within a FitnessProvider');
  }
  return context;
};
