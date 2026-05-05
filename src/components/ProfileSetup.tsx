
import React, { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from '@/components/ui/progress';
import { ArrowRight, UserRound } from 'lucide-react';

const ProfileSetup: React.FC = () => {
  const { currentProfile, updateProfile } = useProfile();
  const { baselineHeartRate, baselineVoiceSpeed } = useMonitoring();
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: currentProfile.name || 'My Profile',
    age: currentProfile.age || '',
    gender: currentProfile.gender || '',
    occupation: currentProfile.occupation || '',
    baselineHeartRateResting:
      currentProfile.baselineHeartRateResting || baselineHeartRate || '',
    naturalSpeechRate:
      currentProfile.naturalSpeechRate || baselineVoiceSpeed || '',
    naturalSpeechVolume: currentProfile.naturalSpeechVolume || '',
    baselineSpeechTone: currentProfile.baselineSpeechTone || '',
    speechComplexityPreference: currentProfile.speechComplexityPreference || '',
  });

  // Keep autopopulated baselines in sync with MonitoringContext.
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      baselineHeartRateResting:
        prev.baselineHeartRateResting || baselineHeartRate || '',
      naturalSpeechRate:
        prev.naturalSpeechRate || baselineVoiceSpeed || '',
    }));
  }, [baselineHeartRate, baselineVoiceSpeed]);

  // Fallback: hydrate baselines directly from Firestore if context is empty.
  useEffect(() => {
    if (!user?.uid) return;
    if (formData.baselineHeartRateResting && formData.naturalSpeechRate) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data() as
          | { baselineHeartRate?: number; baselineSpeechRate?: number; baselineVoiceSpeed?: number }
          | undefined;
        if (cancelled || !data) return;
        const hr = data.baselineHeartRate;
        const rate = data.baselineSpeechRate ?? data.baselineVoiceSpeed;
        setFormData(prev => ({
          ...prev,
          baselineHeartRateResting: prev.baselineHeartRateResting || hr || '',
          naturalSpeechRate: prev.naturalSpeechRate || rate || '',
        }));
      } catch (e) {
        console.warn('[ProfileSetup] Failed to hydrate baselines from Firestore:', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const totalSteps = 3;
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    const updatedProfile = {
      name: formData.name,
      age: formData.age ? parseInt(formData.age.toString(), 10) : null,
      gender: formData.gender || null,
      occupation: formData.occupation || null,
      baselineHeartRateResting: formData.baselineHeartRateResting
        ? parseInt(formData.baselineHeartRateResting.toString(), 10)
        : null,
      naturalSpeechRate: formData.naturalSpeechRate
        ? parseInt(formData.naturalSpeechRate.toString(), 10)
        : null,
      naturalSpeechVolume: formData.naturalSpeechVolume
        ? parseInt(formData.naturalSpeechVolume.toString(), 10)
        : null,
      baselineSpeechTone: formData.baselineSpeechTone || null,
      speechComplexityPreference: formData.speechComplexityPreference || null,
    };

    setIsSaving(true);
    try {
      if (user?.uid) {
        await setDoc(
          doc(db, 'users', user.uid),
          {
            name: updatedProfile.name,
            age: updatedProfile.age,
            gender: updatedProfile.gender,
            occupation: updatedProfile.occupation,
            baselineSpeechTone: updatedProfile.baselineSpeechTone,
            speechComplexityPreference: updatedProfile.speechComplexityPreference,
            profileCompletedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }
      // Update local context AFTER Firestore confirms — this flips
      // isProfileComplete and Dashboard will render automatically.
      updateProfile(currentProfile.id, updatedProfile);
    } catch (e: any) {
      console.error('[ProfileSetup] Failed to save profile:', e);
      toast({
        title: 'Save failed',
        description: e?.message ?? 'Could not save profile.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Profile Name</Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                placeholder="E.g., Work Profile"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="age">Age (Optional)</Label>
              <Input 
                id="age" 
                name="age" 
                type="number" 
                value={formData.age} 
                onChange={handleInputChange} 
                placeholder="Your age"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gender">Gender (Optional)</Label>
              <Select 
                value={formData.gender as string} 
                onValueChange={(value) => handleSelectChange('gender', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Gender</SelectLabel>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-binary</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="occupation">Occupation (Optional)</Label>
              <Input 
                id="occupation" 
                name="occupation" 
                value={formData.occupation} 
                onChange={handleInputChange} 
                placeholder="Your occupation"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="baselineHeartRateResting">Resting Heart Rate (BPM)</Label>
              <Input
                id="baselineHeartRateResting"
                name="baselineHeartRateResting"
                type="number"
                value={formData.baselineHeartRateResting}
                readOnly
                disabled
                placeholder="Run calibration to populate"
              />
              <p className="text-xs text-muted-foreground">
                Captured during calibration. Use Re-calibrate from the dashboard
                to update this value.
              </p>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="naturalSpeechRate">Natural Speech Rate (words per minute)</Label>
              <Input
                id="naturalSpeechRate"
                name="naturalSpeechRate"
                type="number"
                value={formData.naturalSpeechRate}
                readOnly
                disabled
                placeholder="Run calibration to populate"
              />
              <p className="text-xs text-muted-foreground">
                Captured during voice calibration. Re-calibrate to update.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="baselineSpeechTone">Natural Speaking Tone</Label>
              <Select 
                value={formData.baselineSpeechTone as string} 
                onValueChange={(value) => handleSelectChange('baselineSpeechTone', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your natural tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Speaking Tone</SelectLabel>
                    <SelectItem value="neutral">Neutral/Moderate</SelectItem>
                    <SelectItem value="animated">Animated/Expressive</SelectItem>
                    <SelectItem value="soft">Soft-spoken</SelectItem>
                    <SelectItem value="intense">Intense/Authoritative</SelectItem>
                    <SelectItem value="monotone">Monotone</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="speechComplexityPreference">Preferred Speech Complexity</Label>
              <Select 
                value={formData.speechComplexityPreference as string} 
                onValueChange={(value) => handleSelectChange('speechComplexityPreference', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity preference" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Complexity</SelectLabel>
                    <SelectItem value="simple">Simple/Direct</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="complex">Complex/Detailed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This helps calibrate our verbiage analysis
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            <span>Profile Setup: Step {step} of {totalSteps}</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <Progress
              value={(step / totalSteps) * 100}
              className="h-2"
            />
          </div>
          
          {renderStep()}
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>
          
          <Button onClick={handleNext}>
            {step < totalSteps ? (
              <>Next <ArrowRight className="ml-2 h-4 w-4" /></>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ProfileSetup;
