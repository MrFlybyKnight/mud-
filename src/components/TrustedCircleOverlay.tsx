import React, { useRef, useState } from 'react';
import { useTrustedCircle, type TrustedPosition, type TrustedContact } from '@/contexts/TrustedCircleContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Phone, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const POSITION_CLASS: Record<TrustedPosition, string> = {
  topLeft: 'top-0 left-0',
  topRight: 'top-0 right-0',
  bottomLeft: 'bottom-0 left-0',
  bottomRight: 'bottom-0 right-0',
};

const COLOR_BY_POSITION: Record<TrustedPosition, string> = {
  topLeft: 'bg-rose-500',
  topRight: 'bg-amber-500',
  bottomLeft: 'bg-sky-500',
  bottomRight: 'bg-emerald-500',
};

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
  onOpen: (position: TrustedPosition) => void;
  onLongPressRemove: (position: TrustedPosition) => void;
}

const CornerAvatar: React.FC<CornerAvatarProps> = ({ position, contact, onOpen, onLongPressRemove }) => {
  const timerRef = useRef<number | null>(null);

  const startPress = () => {
    if (!contact) return;
    timerRef.current = window.setTimeout(() => {
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
      onClick={() => onOpen(position)}
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
      aria-label={contact ? `${contact.name} — ${contact.phone}` : `Add trusted contact (${position})`}
    >
      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg ring-2 ring-slate-900',
          contact ? COLOR_BY_POSITION[position] : 'bg-slate-700',
        )}
      >
        {contact ? initials(contact.name) : <UserPlus className="h-5 w-5 text-slate-300" />}
      </span>
      <span className="max-w-[72px] truncate text-[10px] text-slate-300">
        {contact ? contact.name.split(' ')[0] : 'Add'}
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

  const handleOpen = (position: TrustedPosition) => {
    setOpenPosition(position);
    const existing = contactByPosition[position];
    setName(existing?.name ?? '');
    setPhone(existing?.phone ?? '');
  };

  const closeDialog = () => {
    setOpenPosition(null);
    setName('');
    setPhone('');
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
      <CornerAvatar position="topLeft" contact={contactByPosition.topLeft} onOpen={handleOpen} onLongPressRemove={handleRemove} />
      <CornerAvatar position="topRight" contact={contactByPosition.topRight} onOpen={handleOpen} onLongPressRemove={handleRemove} />
      <CornerAvatar position="bottomLeft" contact={contactByPosition.bottomLeft} onOpen={handleOpen} onLongPressRemove={handleRemove} />
      <CornerAvatar position="bottomRight" contact={contactByPosition.bottomRight} onOpen={handleOpen} onLongPressRemove={handleRemove} />

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
                <Input id="tc-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={32} placeholder="+1 555 123 4567" />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrustedCircleOverlay;
