
import { ProfileData } from '@/contexts/ProfileContext';
import { encryptData, decryptData } from './encryptionUtils';

// Define which fields should be encrypted
const ENCRYPTED_FIELDS: (keyof ProfileData)[] = [
  'phoneNumber', 
  'gender', 
  'occupation',
  'baselineHeartRateResting',
  'baselineHeartRateActive'
];

/**
 * Check if a field should be encrypted
 */
export const shouldEncryptField = (fieldName: string): boolean => {
  return ENCRYPTED_FIELDS.includes(fieldName as keyof ProfileData);
};

/**
 * Securely store profile data with selective field encryption
 */
export const secureStoreProfile = async (profile: ProfileData): Promise<ProfileData> => {
  const securedProfile = { ...profile };
  
  // Encrypt sensitive fields
  for (const field of ENCRYPTED_FIELDS) {
    if (securedProfile[field] !== null && securedProfile[field] !== undefined) {
      try {
        // Store the field as an encrypted string
        const encryptedValue = await encryptData(securedProfile[field]);
        // Add a prefix to identify encrypted fields
        securedProfile[field] = `ENC:${encryptedValue}` as any as typeof securedProfile[typeof field];
      } catch (error) {
        console.error(`Failed to encrypt ${field}:`, error);
        // If encryption fails, we keep the original value
      }
    }
  }
  
  return securedProfile;
};

/**
 * Securely retrieve profile data with decryption of encrypted fields
 */
export const secureRetrieveProfile = async (profile: ProfileData): Promise<ProfileData> => {
  const decryptedProfile = { ...profile };
  
  // Decrypt fields that are encrypted
  for (const field of ENCRYPTED_FIELDS) {
    const value = decryptedProfile[field];
    
    // Check if the field is encrypted (has the ENC: prefix)
    if (typeof value === 'string' && value.startsWith('ENC:')) {
      try {
        // Extract encrypted part without prefix
        const encryptedValue = value.substring(4);
        // Decrypt the value
        const decryptedValue = await decryptData(encryptedValue);
        decryptedProfile[field] = decryptedValue as typeof decryptedProfile[typeof field];
      } catch (error) {
        console.error(`Failed to decrypt ${field}:`, error);
        // If decryption fails, we keep the encrypted value
      }
    }
  }
  
  return decryptedProfile;
};

/**
 * Check if all sensitive fields are properly encrypted
 */
export const verifyProfileEncryption = (profile: ProfileData): boolean => {
  return ENCRYPTED_FIELDS.every(field => {
    const value = profile[field];
    return value === null || value === undefined || 
           (typeof value === 'string' && value.startsWith('ENC:'));
  });
};
