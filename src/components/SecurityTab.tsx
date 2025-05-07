
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EncryptionManager from '@/components/EncryptionManager';
import { useEncryption } from '@/contexts/EncryptionContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, UserCheck, FileCheck, Shield, UserCog } from 'lucide-react';

const SecurityTab: React.FC = () => {
  const { isReady } = useEncryption();
  const { isSecureProfile } = useProfile();
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Security & Privacy</h2>
        <Badge variant={isReady ? "outline" : "secondary"} className={isReady ? "bg-green-100 text-green-800" : ""}>
          {isReady ? "Protected" : "Setup Required"}
        </Badge>
      </div>
      
      <Tabs defaultValue="encryption" className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="encryption">Encryption</TabsTrigger>
          <TabsTrigger value="permissions">Data Access</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
        </TabsList>
        
        <TabsContent value="encryption" className="mt-4">
          <EncryptionManager />
          
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <UserCog className="h-5 w-5 text-primary" />
                <CardTitle>Profile Security Status</CardTitle>
              </div>
              <CardDescription>
                Status of sensitive data encryption for your profile information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="font-medium">Sensitive Data Encryption</div>
                <Badge 
                  variant={isSecureProfile ? "outline" : "secondary"}
                  className={isSecureProfile ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}
                >
                  {isSecureProfile ? (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Encrypted
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3" /> Not Encrypted
                    </span>
                  )}
                </Badge>
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                {isSecureProfile ? (
                  <p>
                    Your sensitive profile data (including phone number, gender, occupation, and health metrics) is 
                    currently encrypted using AES-GCM encryption. Your data is protected even when stored locally.
                  </p>
                ) : (
                  <p>
                    Your profile data is not currently encrypted. To encrypt sensitive information, ensure encryption is
                    enabled in the Encryption Manager above and update your profile information.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <CardTitle>Data Access Permissions</CardTitle>
              </div>
              <CardDescription>
                Control which services and applications can access your personal data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Manage how your fitness data, heart rate, and personal information is shared
                with connected services. Changes to these settings will take effect immediately.
              </p>
              
              <div className="rounded-md bg-amber-50 p-3 text-sm">
                <p className="text-amber-800">
                  When encryption is enabled, your data is protected even when shared with third-party services.
                  All shared data is encrypted end-to-end and can only be decrypted by authorized recipients.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="privacy" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <CardTitle>Privacy Settings</CardTitle>
              </div>
              <CardDescription>
                Configure your data retention and privacy preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Control how long your data is stored and when it should be automatically deleted.
                These settings help protect your privacy and ensure your data is handled securely.
              </p>
              
              <div className="rounded-md bg-blue-50 p-3 text-sm">
                <p className="text-blue-800">
                  With end-to-end encryption enabled, your privacy is enhanced because your data 
                  cannot be read without your encryption keys, even if the database is compromised.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SecurityTab;
