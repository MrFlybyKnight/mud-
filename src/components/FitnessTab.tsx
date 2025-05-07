
import React from 'react';
import FitnessIntegration from './FitnessIntegration';
import { useFitness } from '@/contexts/FitnessContext';
import { Activity, TrendingUp, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const FitnessTab: React.FC = () => {
  const { services, activeService } = useFitness();
  
  // Find the active service
  const service = services.find(s => s.id === activeService);
  
  return (
    <div className="space-y-6">
      <div>
        <FitnessIntegration />
      </div>
      
      {service && service.connected && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Fitness Insights
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Heart Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end space-x-2">
                  <div className="text-2xl font-bold">
                    {service.metrics.heartRate?.current || "N/A"}
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">bpm</div>
                </div>
                
                {service.metrics.heartRate && (
                  <div className="text-xs text-muted-foreground mt-2">
                    <div className="flex justify-between">
                      <span>Resting:</span>
                      <span className="font-medium">{service.metrics.heartRate.resting || "N/A"} bpm</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max:</span>
                      <span className="font-medium">{service.metrics.heartRate.max || "N/A"} bpm</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end space-x-2">
                  <div className="text-2xl font-bold">
                    {service.metrics.steps?.toLocaleString() || "N/A"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  Daily goal: 10,000 steps
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Activities</CardTitle>
              </CardHeader>
              <CardContent>
                {service.metrics.activities && service.metrics.activities.length > 0 ? (
                  <div>
                    <div className="text-2xl font-bold">
                      {service.metrics.activities.length}
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      <div className="flex justify-between">
                        <span>Last:</span>
                        <span className="font-medium">
                          {service.metrics.activities[0].type} - {Math.floor(service.metrics.activities[0].duration / 60)} min
                        </span>
                      </div>
                      {service.metrics.activities[0].calories && (
                        <div className="flex justify-between">
                          <span>Calories:</span>
                          <span className="font-medium">
                            {service.metrics.activities[0].calories} kcal
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No recent activities
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          {service.metrics.sleep && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Sleep Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {Math.floor(service.metrics.sleep.duration / 3600)} hrs {Math.floor((service.metrics.sleep.duration % 3600) / 60)} min
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Sleep Duration
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {service.metrics.sleep.quality}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Sleep Quality
                    </div>
                  </div>
                  <div>
                    <div className="text-lg font-medium">
                      {new Date(service.metrics.sleep.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                      {new Date(service.metrics.sleep.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Sleep Schedule
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
      
      {activeService === 'none' && (
        <div className="bg-muted rounded-lg p-6 text-center space-y-4">
          <div>
            <Activity className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
          </div>
          <h3 className="font-semibold text-lg">Connect a Fitness Service</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Connect one of the fitness services above to view your health and activity data 
            and get more personalized monitoring.
          </p>
        </div>
      )}
    </div>
  );
};

export default FitnessTab;
