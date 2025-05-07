
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Shield, Lock, KeyRound, Check, AlertTriangle } from 'lucide-react';
import { useEncryption } from '@/contexts/EncryptionContext';
import { useToast } from '@/components/ui/use-toast';

const EncryptionManager: React.FC = () => {
  const { isReady, encrypt, decrypt, generatePassword } = useEncryption();
  const { toast } = useToast();
  const [testInput, setTestInput] = useState<string>('');
  const [encryptedValue, setEncryptedValue] = useState<string>('');
  const [decryptedValue, setDecryptedValue] = useState<string>('');
  const [isEncryptionEnabled, setIsEncryptionEnabled] = useState<boolean>(true);

  const handleEncryptTest = async () => {
    if (!testInput) return;
    
    try {
      const encrypted = await encrypt(testInput);
      setEncryptedValue(encrypted);
      toast({
        title: "Encryption Successful",
        description: "Your data has been encrypted securely.",
      });
    } catch (error) {
      console.error('Encryption test failed:', error);
      toast({
        title: "Encryption Failed",
        description: "Unable to encrypt the test data.",
        variant: "destructive",
      });
    }
  };

  const handleDecryptTest = async () => {
    if (!encryptedValue) return;
    
    try {
      const decrypted = await decrypt<string>(encryptedValue);
      setDecryptedValue(decrypted);
      toast({
        title: "Decryption Successful",
        description: "Your data has been decrypted.",
      });
    } catch (error) {
      console.error('Decryption test failed:', error);
      toast({
        title: "Decryption Failed",
        description: "Unable to decrypt the data. It may be corrupted.",
        variant: "destructive",
      });
    }
  };

  const handleGeneratePassword = () => {
    const password = generatePassword(16);
    setTestInput(password);
    toast({
      title: "Secure Password Generated",
      description: "A cryptographically secure random password has been created.",
    });
  };

  const toggleEncryption = (enabled: boolean) => {
    setIsEncryptionEnabled(enabled);
    localStorage.setItem('encryption_enabled', enabled ? 'true' : 'false');
    toast({
      title: enabled ? "Encryption Enabled" : "Encryption Disabled",
      description: enabled 
        ? "Your sensitive data will be encrypted going forward." 
        : "Warning: Your data will no longer be encrypted.",
      variant: enabled ? "default" : "destructive",
    });
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Data Encryption</CardTitle>
          </div>
          <Badge 
            variant={isReady ? "outline" : "destructive"}
            className={isReady ? "bg-green-100 text-green-800" : ""}
          >
            {isReady ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" /> Secure
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Unsecured
              </span>
            )}
          </Badge>
        </div>
        <CardDescription>
          End-to-end encryption protects your sensitive personal information
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-medium">Encryption Status</span>
            <span className="text-sm text-muted-foreground">
              {isReady ? "Encryption system is active" : "Encryption system not initialized"}
            </span>
          </div>
          <Switch 
            checked={isEncryptionEnabled}
            onCheckedChange={toggleEncryption}
            disabled={!isReady}
            aria-label="Toggle encryption"
          />
        </div>
        
        <div className="rounded-md bg-muted p-4">
          <h4 className="mb-2 text-sm font-medium">Test Encryption</h4>
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Enter text to encrypt"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEncryptTest}
                disabled={!isReady || !isEncryptionEnabled || !testInput}
                className="flex items-center gap-1"
              >
                <Lock className="h-3 w-3" />
                Encrypt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePassword}
                className="flex items-center gap-1"
              >
                <KeyRound className="h-3 w-3" />
                Generate Password
              </Button>
            </div>
            
            {encryptedValue && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Encrypted:</div>
                <div className="p-2 bg-background rounded border text-xs font-mono break-all">
                  {encryptedValue}
                </div>
                <Button
                  variant="ghost"
                  size="sm" 
                  className="mt-1"
                  onClick={handleDecryptTest}
                  disabled={!isReady || !isEncryptionEnabled}
                >
                  Decrypt
                </Button>
              </div>
            )}
            
            {decryptedValue && (
              <div className="mt-2">
                <div className="text-xs text-muted-foreground mb-1">Decrypted:</div>
                <div className="p-2 bg-background rounded border text-sm">
                  {decryptedValue}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t pt-4 text-xs text-muted-foreground">
        <div>
          End-to-end encryption ensures that your sensitive data can only be read on your devices.
        </div>
      </CardFooter>
    </Card>
  );
};

export default EncryptionManager;
