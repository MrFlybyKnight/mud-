
/**
 * Encryption utilities for securing sensitive data
 * Implements AES-GCM encryption using the Web Crypto API
 */

// Polyfill for Buffer in the browser
import { Buffer } from 'buffer';

// Get encryption key from secure storage or generate a new one
const getEncryptionKey = async (): Promise<CryptoKey> => {
  // Try to retrieve existing key from secure storage
  const storedKey = localStorage.getItem('encryption_key');
  
  if (storedKey) {
    // Import existing key
    const keyBuffer = new Uint8Array(Buffer.from(storedKey, 'base64'));
    return window.crypto.subtle.importKey(
      'raw',
      keyBuffer,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt']
    );
  } else {
    // Generate a new encryption key
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );
    
    // Export and store key securely for future use
    const exportedKey = await window.crypto.subtle.exportKey('raw', key);
    const keyBase64 = Buffer.from(exportedKey).toString('base64');
    localStorage.setItem('encryption_key', keyBase64);
    
    return key;
  }
};

// Convert string to buffer
const str2ab = (str: string): ArrayBuffer => {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

// Convert buffer to string
const ab2str = (buf: ArrayBuffer): string => {
  return String.fromCharCode.apply(null, Array.from(new Uint8Array(buf)));
};

/**
 * Encrypt data with AES-GCM
 * @param data Data to encrypt
 * @returns Encrypted data object with IV and encrypted payload
 */
export const encryptData = async (data: any): Promise<string> => {
  try {
    const key = await getEncryptionKey();
    
    // Generate a random initialization vector
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Convert data to string if it's an object
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    
    // Encrypt the data
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
      },
      key,
      str2ab(dataString)
    );
    
    // Combine IV and encrypted data
    const encryptedBuffer = new Uint8Array(iv.length + encryptedContent.byteLength);
    encryptedBuffer.set(iv, 0);
    encryptedBuffer.set(new Uint8Array(encryptedContent), iv.length);
    
    // Convert to Base64 for storage
    return Buffer.from(encryptedBuffer).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypt data with AES-GCM
 * @param encryptedData Base64 string of encrypted data with IV
 * @returns Decrypted data
 */
export const decryptData = async <T = any>(encryptedData: string): Promise<T> => {
  try {
    const key = await getEncryptionKey();
    
    // Convert from Base64
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');
    
    // Extract IV (first 12 bytes)
    const iv = encryptedBuffer.slice(0, 12);
    
    // Extract encrypted content (everything after IV)
    const encryptedContent = encryptedBuffer.slice(12);
    
    // Decrypt
    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
      },
      key,
      new Uint8Array(encryptedContent)
    );
    
    // Convert to string and parse if it's JSON
    const decryptedString = ab2str(decryptedContent);
    try {
      return JSON.parse(decryptedString) as T;
    } catch {
      return decryptedString as unknown as T;
    }
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Generate a secure random password
 * @param length Length of the password
 * @returns Secure random password
 */
export const generateSecurePassword = (length: number = 16): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[values[i] % charset.length];
  }
  return password;
};

/**
 * Securely hash sensitive data like passwords
 * @param data Data to hash
 * @returns Hashed data as hex string
 */
export const hashData = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert hash to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};
