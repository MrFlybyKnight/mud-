
import React from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AssessmentsDisplay: React.FC = () => {
  const { assessments, lastAssessmentTime } = useMonitoring();

  if (assessments.length === 0) {
    return (
      <div className="text-center p-6 bg-muted/20 rounded-md">
        <p className="text-sm text-muted-foreground">
          No assessments recorded yet. The first assessment will be available after one hour of monitoring.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          {lastAssessmentTime ? `Last check: ${format(lastAssessmentTime, 'h:mm a')}` : 'Monitoring in progress...'}
        </p>
      </div>
    );
  }

  // Only show the last 3 assessments
  const recentAssessments = [...assessments].reverse().slice(0, 3);

  return (
    <div className="space-y-4">
      {recentAssessments.map((assessment, index) => (
        <Card key={index} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{format(assessment.timestamp, 'h:mm a, MMM d')}</p>
                <p className="text-sm text-muted-foreground">
                  Duration: {assessment.duration} min
                </p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <CorrelationBadge correlation={assessment.correlation} />
                {assessment.primaryEmotion && (
                  <Badge variant="outline" 
                    className={`bg-${assessment.primaryEmotion === 'calm' ? 'green' : 
                      assessment.primaryEmotion === 'excited' ? 'amber' :
                      assessment.primaryEmotion === 'anxious' ? 'orange' :
                      assessment.primaryEmotion === 'focused' ? 'blue' :
                      assessment.primaryEmotion === 'stressed' ? 'red' :
                      assessment.primaryEmotion === 'bored' ? 'purple' : 'slate'}-100 
                      text-${assessment.primaryEmotion === 'calm' ? 'green' : 
                      assessment.primaryEmotion === 'excited' ? 'amber' :
                      assessment.primaryEmotion === 'anxious' ? 'orange' :
                      assessment.primaryEmotion === 'focused' ? 'blue' :
                      assessment.primaryEmotion === 'stressed' ? 'red' :
                      assessment.primaryEmotion === 'bored' ? 'purple' : 'slate'}-800 capitalize`}
                  >
                    {assessment.primaryEmotion}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm text-muted-foreground">Heart Rate</p>
                <p className="font-semibold">{assessment.averageHeartRate} BPM</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Speech</p>
                <p className="font-semibold">{assessment.averageSpeechPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {assessments.length > 3 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Showing {recentAssessments.length} most recent of {assessments.length} total assessments
          </p>
        </div>
      )}
    </div>
  );
};

const CorrelationBadge: React.FC<{ correlation: 'positive' | 'negative' | 'neutral' }> = ({ correlation }) => {
  let badgeClass = "";
  let label = "";

  switch (correlation) {
    case 'positive':
      badgeClass = "bg-green-100 text-green-800 hover:bg-green-200";
      label = "Positive Correlation";
      break;
    case 'negative':
      badgeClass = "bg-orange-100 text-orange-800 hover:bg-orange-200";
      label = "Negative Correlation";
      break;
    case 'neutral':
    default:
      badgeClass = "bg-slate-100 text-slate-800 hover:bg-slate-200";
      label = "No Clear Pattern";
  }

  return (
    <Badge variant="outline" className={badgeClass}>{label}</Badge>
  );
};

export default AssessmentsDisplay;
