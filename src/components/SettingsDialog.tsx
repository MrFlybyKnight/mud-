
import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useProfile } from '@/contexts/ProfileContext';
import { ProfileData } from '@/contexts/ProfileContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useSecureProfile } from '@/hooks/use-secure-profile';
import { CircleFadingPlus, Bell, Heart, MessageCircle, Smile, Shield, ShieldAlert } from 'lucide-react';

interface SettingsDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onOpenChange, hideTrigger }) => {
  const { currentProfile, updateProfile } = useProfile();
  const { toast } = useToast();
  const [name, setName] = React.useState(currentProfile?.name || '');
  const [age, setAge] = React.useState(currentProfile?.age?.toString() || '');
  const [gender, setGender] = React.useState(currentProfile?.gender || '');
  const [occupation, setOccupation] = React.useState(currentProfile?.occupation || '');
  const [phoneNumber, setPhoneNumber] = React.useState(currentProfile?.phoneNumber || '');
  
  const { clearAllNotifications, sendTestNotification } = useNotification();
  const { isEncryptionReady, isProfileEncrypted, encryptProfile, decryptProfile } = useSecureProfile();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const updatedProfileData: Partial<ProfileData> = {
      name,
      age: age ? parseInt(age, 10) : null,
      gender,
      occupation,
      phoneNumber,
    };

    updateProfile(currentProfile.id, updatedProfileData);

    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully.",
    });
  };

  const toggleEncryption = async (enabled: boolean) => {
    if (!isEncryptionReady) {
      toast({
        title: "Encryption Not Available",
        description: "The encryption system is not ready. Please try again later.",
        variant: "destructive"
      });
      return;
    }

    try {
      let success = false;
      
      if (enabled) {
        // Enable encryption
        success = await encryptProfile();
        if (success) {
          toast({
            title: "Encryption Enabled",
            description: "Your profile data is now encrypted.",
          });
        }
      } else {
        // Disable encryption
        success = await decryptProfile();
        if (success) {
          toast({
            title: "Encryption Disabled",
            description: "Your profile data is no longer encrypted.",
            variant: "destructive"
          });
        }
      }
      
      if (!success) {
        toast({
          title: "Encryption Change Failed",
          description: "Failed to change encryption settings. Please try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error toggling encryption:", error);
      toast({
        title: "Error",
        description: "Failed to change encryption settings. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline">Settings</Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Configure the application settings and preferences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="age" className="text-right">
              Age
            </Label>
            <Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gender" className="text-right">
              Gender
            </Label>
            <Input id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="occupation" className="text-right">
              Occupation
            </Label>
            <Input id="occupation" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phoneNumber" className="text-right">
              Phone Number
            </Label>
            <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="col-span-3" />
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security Settings
            </h4>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Profile Encryption</div>
                <div className="text-xs text-muted-foreground">Encrypt sensitive personal information</div>
              </div>
              <Switch
                checked={isProfileEncrypted}
                onCheckedChange={toggleEncryption}
                disabled={!isEncryptionReady}
              />
            </div>
            {!isEncryptionReady && (
              <div className="text-xs text-amber-600 flex items-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Encryption system not ready. Please try again later.
              </div>
            )}
          </div>
          
          <div className="space-y-2 pt-2">
            <h4 className="font-medium flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Settings
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendTestNotification('heart')}
                className="flex items-center justify-start gap-2"
              >
                <Heart className="h-4 w-4 text-red-500" />
                <span className="text-xs">Test Heart</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendTestNotification('speech')}
                className="flex items-center justify-start gap-2"
              >
                <MessageCircle className="h-4 w-4 text-blue-500" />
                <span className="text-xs">Test Speech</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendTestNotification('emotion')}
                className="flex items-center justify-start gap-2"
              >
                <Smile className="h-4 w-4 text-amber-500" />
                <span className="text-xs">Test Emotion</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => sendTestNotification('general')}
                className="flex items-center justify-start gap-2"
              >
                <Bell className="h-4 w-4" />
                <span className="text-xs">Test General</span>
              </Button>
            </div>
            <Button
              variant="destructive" 
              size="sm"
              onClick={clearAllNotifications}
              className="w-full mt-2"
            >
              Clear All Notifications
            </Button>
          </div>
        </div>
        
        <Button type="submit" onClick={handleSubmit}>Update Profile</Button>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
