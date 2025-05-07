
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Phone, MessageSquare, X, Plus } from 'lucide-react';
import { usePlatformContext } from '@/contexts/PlatformContext';
import { useProfile } from '@/contexts/ProfileContext';
import { platformClass } from '@/utils/platformUtils';
import { 
  Dialog,
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Sample emergency contacts data
const defaultContacts = [
  { id: 1, name: 'Emergency Services', phone: '911', type: 'service' },
  { id: 2, name: 'John Smith', phone: '555-123-4567', type: 'family' },
  { id: 3, name: 'Dr. Sarah Johnson', phone: '555-987-6543', type: 'medical' }
];

const EmergencyContactManager = () => {
  const [contacts, setContacts] = useState(defaultContacts);
  const { platform } = usePlatformContext();
  const { currentProfile } = useProfile();
  
  // Form state for adding a new contact
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newType, setNewType] = useState('family');

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
  
  const handleAddContact = () => {
    if (newName && newPhone) {
      const newContact = {
        id: Date.now(),
        name: newName,
        phone: newPhone,
        type: newType
      };
      setContacts([...contacts, newContact]);
      
      // Reset form
      setNewName('');
      setNewPhone('');
      setNewType('family');
    }
  };

  // Use profile's phone number if available
  const userPhoneContact = currentProfile.phoneNumber ? {
    id: 0,
    name: `${currentProfile.name} (You)`,
    phone: currentProfile.phoneNumber,
    type: 'self'
  } : null;

  return (
    <div className="space-y-4">
      {userPhoneContact && (
        <Card className={`${cardClass} border-primary/20 bg-primary/5`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="font-medium">{userPhoneContact.name}</h3>
                <p className="text-sm text-muted-foreground">{userPhoneContact.phone}</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleCall(userPhoneContact.phone)}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleText(userPhoneContact.phone)}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs bg-primary/20 text-primary px-2 py-1 rounded inline-block">
              Your Number
            </div>
          </CardContent>
        </Card>
      )}

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
            {contact.type === 'family' && (
              <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded inline-block">
                Family
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      
      <Dialog>
        <DialogTrigger asChild>
          <Button className="w-full mt-4" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Emergency Contact
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Emergency Contact</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input 
                id="name" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contact name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="Phone number" 
                type="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Contact Type</Label>
              <select 
                id="type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="family">Family</option>
                <option value="medical">Medical</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddContact}>Add Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencyContactManager;
