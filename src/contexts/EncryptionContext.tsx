
import React, { createContext, useContext, useState, useEffect } from 'react';
import { encryptData, decryptData, generateSecurePassword, hashData } from '@/utils/encryptionUtils';
import { useToast } from '@/components/ui/use-toast';

interface EncryptionContextType {
  // Encryption functions
  encrypt: <T>(data: T) => Promise<string>;
  decrypt: <T>(encryptedData: string) => Promise<T>;
  hash: (data: string) => Promise<string>;
  generatePassword: (length?: number) => string;
  
  // Encryption status
  isReady: boolean;
  isEncrypting: boolean;
  isDecrypting: boolean;
}

const EncryptionContext = createContext<EncryptionContextType | null>(null);

export const useEncryption = () => {
  const context = useContext(EncryptionContext);
  if (!context) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
};

export const EncryptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState<boolean>(false);
  const [isEncrypting, setIsEncrypting] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const { toast } = useToast();

  // Initialize encryption system
  useEffect(() => {
    const initializeEncryption = async () => {
      try {
        // Test the encryption system by encrypting and decrypting a test value
        const testData = { test: 'encryption_test' };
        const encrypted = await encryptData(testData);
        const decrypted = await decryptData<typeof testData>(encrypted);
        
        if (decrypted.test === testData.test) {
          setIsReady(true);
          console.log('Encryption system initialized successfully');
        } else {
          console.error('Encryption system test failed');
          toast({
            title: 'Encryption Error',
            description: 'Failed to initialize the encryption system. Some features may not work properly.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Failed to initialize encryption:', error);
        toast({
          title: 'Encryption Error',
          description: 'Failed to initialize the encryption system. Some features may not work properly.',
          variant: 'destructive',
        });
      }
    };

    initializeEncryption();
  }, [toast]);

  // Wrapper for encrypt function with status tracking
  const encrypt = async <T,>(data: T): Promise<string> => {
    setIsEncrypting(true);
    try {
      const result = await encryptData(data);
      return result;
    } finally {
      setIsEncrypting(false);
    }
  };

  // Wrapper for decrypt function with status tracking
  const decrypt = async <T,>(encryptedData: string): Promise<T> => {
    setIsDecrypting(true);
    try {
      const result = await decryptData<T>(encryptedData);
      return result;
    } finally {
      setIsDecrypting(false);
    }
  };

  const value = {
    encrypt,
    decrypt,
    hash: hashData,
    generatePassword: generateSecurePassword,
    isReady,
    isEncrypting,
    isDecrypting,
  };

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
};
