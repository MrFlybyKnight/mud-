
import React from 'react';
import { useProfile } from '@/contexts/ProfileContext';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserRound, ChevronDown, Plus, Trash, Phone, Shield, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ProfileSelector: React.FC = () => {
  const { profiles, currentProfile, switchProfile, deleteProfile, addProfile, isSecureProfile } = useProfile();

  const handleCreateNewProfile = () => {
    addProfile({ name: `Profile ${profiles.length + 1}` });
  };

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              <span>{currentProfile.name}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {profiles.map(profile => (
              <DropdownMenuItem
                key={profile.id}
                onClick={() => switchProfile(profile.id)}
                className={profile.id === currentProfile.id ? "bg-accent" : ""}
              >
                <UserRound className="mr-2 h-4 w-4" />
                <span>{profile.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateNewProfile}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Create New Profile</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">Edit Profile</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                Profile Details
                {isSecureProfile ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <Shield className="h-3 w-3 mr-1" /> Encrypted
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    <ShieldAlert className="h-3 w-3 mr-1" /> Not Encrypted
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                View and edit your current profile information
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <Card className="p-4">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="font-medium">Name:</dt>
                    <dd>{currentProfile.name}</dd>
                  </div>
                  
                  {currentProfile.age && (
                    <div className="flex justify-between">
                      <dt className="font-medium">Age:</dt>
                      <dd>{currentProfile.age}</dd>
                    </div>
                  )}
                  
                  {currentProfile.gender && (
                    <div className="flex justify-between">
                      <dt className="font-medium">Gender:</dt>
                      <dd>{currentProfile.gender}</dd>
                    </div>
                  )}
                  
                  {currentProfile.occupation && (
                    <div className="flex justify-between">
                      <dt className="font-medium">Occupation:</dt>
                      <dd>{currentProfile.occupation}</dd>
                    </div>
                  )}

                  {currentProfile.phoneNumber && (
                    <div className="flex justify-between items-center">
                      <dt className="font-medium">Phone:</dt>
                      <dd className="flex items-center gap-2">
                        {currentProfile.phoneNumber}
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </dd>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <dt className="font-medium">Resting Heart Rate:</dt>
                    <dd>{currentProfile.baselineHeartRateResting || 'Not set'} BPM</dd>
                  </div>
                  
                  <div className="flex justify-between">
                    <dt className="font-medium">Natural Speech Rate:</dt>
                    <dd>{currentProfile.naturalSpeechRate || 'Not set'} WPM</dd>
                  </div>
                </dl>
              </Card>
            </div>
            
            <DialogFooter className="flex justify-between sm:justify-between">
              <Button 
                variant="destructive" 
                onClick={() => deleteProfile(currentProfile.id)}
                disabled={profiles.length <= 1}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete Profile
              </Button>
              
              <Button type="button" onClick={() => window.location.href = '#profile-setup'}>
                Edit Profile
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ProfileSelector;
