
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { secureStoreProfile, secureRetrieveProfile, verifyProfileEncryption } from '@/utils/secureProfileUtils';
import { useEncryption } from './EncryptionContext';
import { useAuth } from './AuthContext';
import { db } from '@/firebase/config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Define profile data structure
export interface ProfileData {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  occupation: string | null;
  phoneNumber: string | null;
  baselineHeartRateResting: number | null;
  baselineHeartRateActive: number | null;
  naturalSpeechRate: number | null; // words per minute
  naturalSpeechVolume: number | null; // 0-100
  baselineSpeechTone: string | null;
  speechComplexityPreference: string | null;
  // Calibration data populated from the Setup Wizard. Read-only in Edit Profile;
  // only updatable via Re-calibrate.
  baselineHeartRate: number | null;
  baselineHeartRateAt: Date | null;
  baselineVoiceToneAverage: number | null;
  baselineSpeechRate: number | null;
  baselineAccentProfile: Record<string, number> | null;
  baselineVoiceCalibrationAt: Date | null;
  sigmaThreshold: number | null;
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
  phoneNumber: null,
  baselineHeartRateResting: null,
  baselineHeartRateActive: null,
  naturalSpeechRate: null,
  naturalSpeechVolume: null,
  baselineSpeechTone: null,
  speechComplexityPreference: null,
  baselineHeartRate: null,
  baselineHeartRateAt: null,
  baselineVoiceToneAverage: null,
  baselineSpeechRate: null,
  baselineAccentProfile: null,
  baselineVoiceCalibrationAt: null,
  sigmaThreshold: null,
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
  isSecureProfile: boolean;
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
  const { isReady } = useEncryption();
  const { uid } = useAuth();
  const [isSecureProfile, setIsSecureProfile] = useState<boolean>(false);

  // Get current profile
  const currentProfile = profiles.find(p => p.id === currentProfileId) || defaultProfile;

  // Persist a profile to Firestore at users/{uid} (background, retry once).
  const persistProfileToFirestore = (
    profile: ProfileData,
    partial?: Partial<ProfileData>,
  ) => {
    if (!uid) return;
    // Strip non-serializable / undefined fields and convert Dates.
    const payload: Record<string, unknown> = {
      profileId: profile.id,
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      occupation: profile.occupation,
      phoneNumber: profile.phoneNumber,
      baselineHeartRateResting: profile.baselineHeartRateResting,
      baselineHeartRateActive: profile.baselineHeartRateActive,
      naturalSpeechRate: profile.naturalSpeechRate,
      naturalSpeechVolume: profile.naturalSpeechVolume,
      baselineSpeechTone: profile.baselineSpeechTone,
      speechComplexityPreference: profile.speechComplexityPreference,
      updatedAt: serverTimestamp(),
    };
    // If caller passed an explicit partial, merge those exact keys too so that
    // calibration-only fields (baselineHeartRate, sigmaThreshold, etc.) sync.
    if (partial) {
      for (const [k, v] of Object.entries(partial)) {
        if (v instanceof Date) payload[k] = v.toISOString();
        else if (v !== undefined) payload[k] = v;
      }
    }

    const write = () => setDoc(doc(db, 'users', uid), payload, { merge: true });
    (async () => {
      try {
        await write();
      } catch (e1) {
        console.warn('[ProfileContext] Firestore write failed, retrying once:', e1);
        try {
          await write();
        } catch (e2) {
          console.error('[ProfileContext] Firestore write retry failed:', e2);
          toast({
            title: 'Sync failed',
            description: 'Profile changes saved locally but could not sync to the cloud.',
            variant: 'destructive',
          });
        }
      }
    })();
  };

  // Load profiles from localStorage on initial load
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const savedProfiles = localStorage.getItem('userProfiles');
        
        if (savedProfiles) {
          const parsedProfiles: ProfileData[] = JSON.parse(savedProfiles);
          
          // If encryption is available, decrypt sensitive fields
          if (isReady) {
            const decryptedProfiles = await Promise.all(
              parsedProfiles.map(async (profile) => {
                try {
                  return await secureRetrieveProfile(profile);
                } catch (error) {
                  console.error('Failed to decrypt profile', error);
                  return profile;
                }
              })
            );
            
            setProfiles(decryptedProfiles);
            
            // Check if the current profile is securely encrypted
            const currentProfile = decryptedProfiles.find(p => p.id === currentProfileId);
            if (currentProfile) {
              setIsSecureProfile(verifyProfileEncryption(currentProfile));
            }
          } else {
            setProfiles(parsedProfiles);
          }
          
          // Set the current profile ID if it exists in loaded profiles
          const savedCurrentId = localStorage.getItem('currentProfileId');
          if (savedCurrentId && parsedProfiles.some(p => p.id === savedCurrentId)) {
            setCurrentProfileId(savedCurrentId);
          }
        }
      } catch (error) {
        console.error('Failed to load profiles', error);
        toast({
          title: "Error",
          description: "Failed to load saved profiles.",
          variant: "destructive",
        });
      }
    };
    
    loadProfiles();
  }, [isReady, toast]);

  // Save profiles to localStorage whenever they change
  useEffect(() => {
    const saveProfiles = async () => {
      try {
        // If encryption is available, encrypt sensitive fields before saving
        if (isReady) {
          const securedProfiles = await Promise.all(
            profiles.map(async (profile) => {
              try {
                return await secureStoreProfile(profile);
              } catch (error) {
                console.error('Failed to encrypt profile', error);
                return profile;
              }
            })
          );
          
          localStorage.setItem('userProfiles', JSON.stringify(securedProfiles));
          
          // Check if the current profile is securely encrypted
          const currentProfile = securedProfiles.find(p => p.id === currentProfileId);
          if (currentProfile) {
            setIsSecureProfile(verifyProfileEncryption(currentProfile));
          }
        } else {
          localStorage.setItem('userProfiles', JSON.stringify(profiles));
        }
        
        localStorage.setItem('currentProfileId', currentProfileId);
      } catch (error) {
        console.error('Failed to save profiles', error);
      }
    };
    
    saveProfiles();
  }, [profiles, currentProfileId, isReady]);

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

    // Persist to Firestore in the background.
    persistProfileToFirestore(newProfile);

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
    isSecureProfile,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
};
