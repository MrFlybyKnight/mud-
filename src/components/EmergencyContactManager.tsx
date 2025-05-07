
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, MessageSquare, X } from 'lucide-react';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { platformClass } from '@/utils/platformUtils';

// Sample emergency contacts data
const defaultContacts = [
  { id: 1, name: 'Emergency Services', phone: '911', type: 'service' },
  { id: 2, name: 'John Smith', phone: '555-123-4567', type: 'family' },
  { id: 3, name: 'Dr. Sarah Johnson', phone: '555-987-6543', type: 'medical' }
];

const EmergencyContactManager = () => {
  const [contacts, setContacts] = useState(defaultContacts);
  const { platform } = usePlatformContext();

  const cardClass = platformClass(platform, {
    base: "mb-4 shadow-sm",
    ios: "rounded-xl",
    android: "rounded-lg"
  });

  const handleCall = (phone: string) => {
    console.log(`Calling ${phone}`);
    // In a real app, this would initiate a phone call
  };

  const handleText = (phone: string) => {
    console.log(`Texting ${phone}`);
    // In a real app, this would open messaging app
  };

  const handleRemoveContact = (id: number) => {
    setContacts(contacts.filter(contact => contact.id !== id));
  };

  return (
    <div className="space-y-4">
      {contacts.map(contact => (
        <Card key={contact.id} className={cardClass}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-medium">{contact.name}</h3>
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCall(contact.phone)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleText(contact.phone)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
                {contact.type !== 'service' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => handleRemoveContact(contact.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {contact.type === 'service' && (
              <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded inline-block">
                Emergency Service
              </div>
            )}
            {contact.type === 'medical' && (
              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
                Medical Contact
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      <Button className="w-full mt-4" variant="outline">
        Add Emergency Contact
      </Button>
    </div>
  );
};

export default EmergencyContactManager;
