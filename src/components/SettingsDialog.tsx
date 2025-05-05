
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { useMonitoring } from '@/contexts/MonitoringContext';

const SettingsDialog: React.FC = () => {
  const {
    heartRateLowThreshold,
    heartRateHighThreshold,
    setHeartRateLowThreshold,
    setHeartRateHighThreshold,
    speechLowThreshold,
    speechHighThreshold,
    setSpeechLowThreshold,
    setSpeechHighThreshold,
  } = useMonitoring();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Customize Thresholds</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Monitor Settings</DialogTitle>
          <DialogDescription>
            Customize the thresholds for heart rate and speech monitoring.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-6">
          <div className="space-y-4">
            <Label className="text-base">Heart Rate Thresholds (BPM)</Label>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Low Threshold: {heartRateLowThreshold}</Label>
              </div>
              <Slider
                min={40}
                max={90}
                step={1}
                value={[heartRateLowThreshold]}
                onValueChange={(values) => setHeartRateLowThreshold(values[0])}
                className="mb-4"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>High Threshold: {heartRateHighThreshold}</Label>
              </div>
              <Slider
                min={80}
                max={150}
                step={1}
                value={[heartRateHighThreshold]}
                onValueChange={(values) => setHeartRateHighThreshold(values[0])}
                className="mb-4"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <Label className="text-base">Speech Percentage Thresholds</Label>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Low Threshold: {speechLowThreshold}%</Label>
              </div>
              <Slider
                min={5}
                max={40}
                step={1}
                value={[speechLowThreshold]}
                onValueChange={(values) => setSpeechLowThreshold(values[0])}
                className="mb-4"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>High Threshold: {speechHighThreshold}%</Label>
              </div>
              <Slider
                min={40}
                max={90}
                step={1}
                value={[speechHighThreshold]}
                onValueChange={(values) => setSpeechHighThreshold(values[0])}
                className="mb-4"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogTrigger asChild>
            <Button type="button">Save Changes</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
