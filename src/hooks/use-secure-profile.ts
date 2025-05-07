
import { useProfile } from '@/contexts/ProfileContext';
import { useEncryption } from '@/contexts/EncryptionContext';
import { secureStoreProfile, secureRetrieveProfile } from '@/utils/secureProfileUtils';

export function useSecureProfile() {
  const { currentProfile, updateProfile, isSecureProfile } = useProfile();
  const { isReady } = useEncryption();
  
  /**
   * Encrypts sensitive fields in the profile and updates it
   */
  const encryptProfile = async () => {
    if (!isReady) return false;
    
    try {
      const encryptedProfile = await secureStoreProfile(currentProfile);
      updateProfile(currentProfile.id, encryptedProfile);
      return true;
    } catch (error) {
      console.error('Failed to encrypt profile:', error);
      return false;
    }
  };
  
  /**
   * Decrypts sensitive fields in the profile and updates it
   */
  const decryptProfile = async () => {
    if (!isReady) return false;
    
    try {
      const decryptedProfile = await secureRetrieveProfile(currentProfile);
      updateProfile(currentProfile.id, decryptedProfile);
      return true;
    } catch (error) {
      console.error('Failed to decrypt profile:', error);
      return false;
    }
  };

  return {
    isEncryptionReady: isReady,
    isProfileEncrypted: isSecureProfile,
    encryptProfile,
    decryptProfile
  };
}
