
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';

// Define profile data structure
export interface ProfileData {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  phoneNumber: string | null; // Added phone number field
  baselineHeartRateResting: number | null;
  baselineHeartRateActive: number | null;
  naturalSpeechRate: number | null; // words per minute
  naturalSpeechVolume: number | null; // 0-100
  baselineSpeechTone: string | null; // e.g., 'neutral', 'animated'
  speechComplexityPreference: string | null; // e.g., 'simple', 'moderate', 'complex'
  createdAt: Date;
  lastUpdated: Date;
}

// Default profile values
export const defaultProfile: ProfileData = {
  id: '1',
  name: 'Default Profile',
  age: null,
  gender: null,
  occupation: null,
  phoneNumber: null, // Added phone number field with null default value
  baselineHeartRateResting: null,
  baselineHeartRateActive: null,
  naturalSpeechRate: null,
  naturalSpeechVolume: null,
  baselineSpeechTone: null,
  speechComplexityPreference: null,
  createdAt: new Date(),
  lastUpdated: new Date(),
};

interface ProfileContextType {
  profiles: ProfileData[];
  currentProfile: ProfileData;
  isProfileComplete: boolean;
  addProfile: (profile: Partial<ProfileData>) => void;
  updateProfile: (id: string, data: Partial<ProfileData>) => void;
  switchProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
}

export const ProfileContext = createContext<ProfileContextType | null>(null);

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<ProfileData[]>([defaultProfile]);
  const [currentProfileId, setCurrentProfileId] = useState<string>(defaultProfile.id);
  const { toast } = useToast();

  // Get current profile
  const currentProfile = profiles.find(p => p.id === currentProfileId) || defaultProfile;

  // Check if profile has necessary data
  const isProfileComplete = Boolean(
    currentProfile.baselineHeartRateResting &&
    currentProfile.naturalSpeechRate
  );

  // Add a new profile
  const addProfile = (profileData: Partial<ProfileData>) => {
    const newProfile: ProfileData = {
      ...defaultProfile,
      ...profileData,
      id: Date.now().toString(),
      createdAt: new Date(),
      lastUpdated: new Date(),
    };
    
    setProfiles(prev => [...prev, newProfile]);
    setCurrentProfileId(newProfile.id);
    
    toast({
      title: "Profile Created",
      description: `Profile "${newProfile.name}" has been created`,
    });
  };

  // Update an existing profile
  const updateProfile = (id: string, data: Partial<ProfileData>) => {
    setProfiles(prev => 
      prev.map(profile => 
        profile.id === id 
          ? { ...profile, ...data, lastUpdated: new Date() } 
          : profile
      )
    );
    
    toast({
      title: "Profile Updated",
      description: `Profile has been updated successfully`,
    });
  };

  // Switch to another profile
  const switchProfile = (id: string) => {
    const profileExists = profiles.some(p => p.id === id);
    if (profileExists) {
      setCurrentProfileId(id);
      toast({
        title: "Profile Switched",
        description: `Switched to ${profiles.find(p => p.id === id)?.name}`,
      });
    }
  };

  // Delete a profile
  const deleteProfile = (id: string) => {
    // Prevent deleting the last profile
    if (profiles.length <= 1) {
      toast({
        title: "Cannot Delete Profile",
        description: "You must have at least one profile",
        variant: "destructive",
      });
      return;
    }
    
    // If deleting current profile, switch to another one
    if (id === currentProfileId) {
      const otherProfile = profiles.find(p => p.id !== id);
      if (otherProfile) setCurrentProfileId(otherProfile.id);
    }
    
    setProfiles(prev => prev.filter(profile => profile.id !== id));
    
    toast({
      title: "Profile Deleted",
      description: "Profile has been deleted",
    });
  };

  const value = {
    profiles,
    currentProfile,
    isProfileComplete,
    addProfile,
    updateProfile,
    switchProfile,
    deleteProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
