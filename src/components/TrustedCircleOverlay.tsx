import React, { useRef, useState } from 'react';
import { useTrustedCircle, type TrustedPosition, type TrustedContact } from '@/contexts/TrustedCircleContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Phone, Trash2, UserPlus, Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const POSITION_CLASS: Record<TrustedPosition, string> = {
  topLeft: 'top-0 left-0',
  topRight: 'top-0 right-0',
  bottomLeft: 'bottom-0 left-0',
  bottomRight: 'bottom-0 right-0',
};

const COLOR_BY_POSITION: Record<TrustedPosition, string> = {
  topLeft: 'bg-teal-500',
  topRight: 'bg-amber-500',
  bottomLeft: 'bg-sky-500',
  bottomRight: 'bg-emerald-500',
};

const PRIMARY_POSITION: TrustedPosition = 'topLeft';

// Web Contacts Picker API typing
interface PickedContact {
  name?: string[];
  tel?: string[];
}
interface ContactsManager {
  select: (props: string[], opts?: { multiple?: boolean }) => Promise<PickedContact[]>;
}
const getContactsManager = (): ContactsManager | null => {
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  return nav.contacts && typeof nav.contacts.select === 'function' ? nav.contacts : null;
};

export const callPhone = (phone: string) => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  window.location.href = `tel:${cleaned}`;
};

const digitsOnly = (s: string) => s.replace(/\D/g, '').slice(0, 10);
const formatUSPhone = (s: string) => {
  const d = digitsOnly(s);
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const isValidUSPhone = (s: string) => digitsOnly(s).length === 10;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

interface CornerAvatarProps {
  position: TrustedPosition;
  contact?: TrustedContact;
  onTap: (position: TrustedPosition) => void;
  onLongPressRemove: (position: TrustedPosition) => void;
}

const CornerAvatar: React.FC<CornerAvatarProps> = ({ position, contact, onTap, onLongPressRemove }) => {
  const timerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  const isPrimary = position === PRIMARY_POSITION;

  const startPress = () => {
    longPressedRef.current = false;
    if (!contact) return;
    timerRef.current = window.setTimeout(() => {
      longPressedRef.current = true;
      onLongPressRemove(position);
      timerRef.current = null;
    }, 600);
  };
  const cancelPress = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        if (longPressedRef.current) return;
        onTap(position);
      }}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchCancel={cancelPress}
      className={cn(
        'absolute z-30 flex flex-col items-center gap-1 animate-scale-in',
        POSITION_CLASS[position],
      )}
      aria-label={
        contact
          ? `Call ${contact.name} at ${contact.phone}${isPrimary ? ' (primary contact)' : ''}`
          : `Add trusted contact (${position})`
      }
    >
      <span className="relative">
        <span
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg ring-2',
            contact ? COLOR_BY_POSITION[position] : 'bg-slate-700',
            isPrimary ? 'ring-teal-300' : 'ring-slate-900',
          )}
        >
          {contact ? initials(contact.name) : <UserPlus className="h-5 w-5 text-slate-300" />}
        </span>
        {isPrimary && (
          <Star
            className="absolute -top-1 -right-1 h-4 w-4 fill-teal-300 text-teal-300 drop-shadow"
            aria-hidden
          />
        )}
      </span>
      <span className="max-w-[72px] truncate text-[10px] text-slate-300">
        {contact ? contact.name.split(' ')[0] : isPrimary ? 'Primary' : 'Add'}
      </span>
    </button>
  );
};

const TrustedCircleOverlay: React.FC = () => {
  const { isActive, contactByPosition, addContact, removeContact } = useTrustedCircle();
  const { toast } = useToast();

  const [openPosition, setOpenPosition] = useState<TrustedPosition | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isActive) return null;

  const current = openPosition ? contactByPosition[openPosition] : undefined;

  const closeDialog = () => {
    setOpenPosition(null);
    setName('');
    setPhone('');
  };

  const openManualForm = (position: TrustedPosition, prefill?: { name?: string; phone?: string }) => {
    setOpenPosition(position);
    setName(prefill?.name ?? '');
    setPhone(prefill?.phone ?? '');
  };

  const handleTap = async (position: TrustedPosition) => {
    const existing = contactByPosition[position];
    if (existing) {
      // One tap to call — no confirmation
      callPhone(existing.phone);
      return;
    }
    // Try Web Contact Picker first
    const cm = getContactsManager();
    if (cm) {
      try {
        const picked = await cm.select(['name', 'tel'], { multiple: false });
        if (picked && picked.length > 0) {
          const c = picked[0];
          const pickedName = c.name?.[0]?.trim() ?? '';
          const pickedPhone = c.tel?.[0]?.trim() ?? '';
          if (pickedName && pickedPhone) {
            try {
              await addContact({ name: pickedName, phone: pickedPhone, position });
              toast({ title: 'Added to Trusted Circle', description: pickedName });
              return;
            } catch (e) {
              toast({
                title: 'Could not save',
                description: e instanceof Error ? e.message : 'Unknown error',
                variant: 'destructive',
              });
              return;
            }
          }
          // Picker returned without phone — fall through to manual prefill
          openManualForm(position, { name: pickedName, phone: pickedPhone });
          return;
        }
        // User cancelled picker
        return;
      } catch (e) {
        console.warn('[TrustedCircle] Contact picker failed; falling back', e);
      }
    }
    // Fallback: manual entry
    openManualForm(position);
  };

  const handleSave = async () => {
    if (!openPosition) return;
    if (!name.trim() || !phone.trim()) {
      toast({ title: 'Missing info', description: 'Name and phone are required.', variant: 'destructive' });
      return;
    }
    try {
      await addContact({ name, phone, position: openPosition });
      toast({ title: 'Added to Trusted Circle', description: name.trim() });
      closeDialog();
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (position: TrustedPosition) => {
    try {
      await removeContact(position);
      toast({ title: 'Removed from Trusted Circle' });
      closeDialog();
    } catch (e) {
      toast({
        title: 'Could not remove',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <CornerAvatar position="topLeft" contact={contactByPosition.topLeft} onTap={handleTap} onLongPressRemove={handleRemove} />
      <CornerAvatar position="topRight" contact={contactByPosition.topRight} onTap={handleTap} onLongPressRemove={handleRemove} />
      <CornerAvatar position="bottomLeft" contact={contactByPosition.bottomLeft} onTap={handleTap} onLongPressRemove={handleRemove} />
      <CornerAvatar position="bottomRight" contact={contactByPosition.bottomRight} onTap={handleTap} onLongPressRemove={handleRemove} />

      <Dialog open={openPosition !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{current ? current.name : 'Add to Trusted Circle'}</DialogTitle>
          </DialogHeader>

          {current ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a href={`tel:${current.phone}`} className="underline-offset-4 hover:underline">
                  {current.phone}
                </a>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>Close</Button>
                <Button variant="destructive" onClick={() => handleRemove(current.position)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="tc-name">Name</Label>
                <Input id="tc-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tc-phone">Phone</Label>
                <Input
                  id="tc-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(formatUSPhone(e.target.value))}
                  maxLength={14}
                  placeholder="(555) 123-4567"
                />
                <p className="text-xs text-muted-foreground">
                  This number will be called directly in an emergency.
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSave} disabled={!name.trim() || !isValidUSPhone(phone)}>
                  Save
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrustedCircleOverlay;
