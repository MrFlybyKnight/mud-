import React, { useState } from 'react';
import { useTrustedCircle, type TrustedPosition, type TrustedContact } from '@/contexts/TrustedCircleContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Pencil, X, Star, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const POSITION_ORDER: TrustedPosition[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
const PRIMARY_POSITION: TrustedPosition = 'topLeft';

const COLOR_BY_POSITION: Record<TrustedPosition, string> = {
  topLeft: 'bg-teal-500',
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

const digitsOnly = (s: string) => s.replace(/\D/g, '').slice(0, 10);
const formatUSPhone = (s: string) => {
  const d = digitsOnly(s);
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
};
const isValidUSPhone = (s: string) => digitsOnly(s).length === 10;

interface TrustedCircleManagerProps {
  onBack: () => void;
}

const TrustedCircleManager: React.FC<TrustedCircleManagerProps> = ({ onBack }) => {
  const { contacts, contactByPosition, addContact, removeContact } = useTrustedCircle();
  const { toast } = useToast();

  const [editPosition, setEditPosition] = useState<TrustedPosition | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [removeTarget, setRemoveTarget] = useState<TrustedContact | null>(null);

  const sorted = POSITION_ORDER
    .map((p) => contactByPosition[p])
    .filter((c): c is TrustedContact => !!c);

  const openEdit = (contact: TrustedContact) => {
    setEditPosition(contact.position);
    setName(contact.name);
    setPhone(formatUSPhone(contact.phone));
  };

  const openAdd = () => {
    const free = POSITION_ORDER.find((p) => !contactByPosition[p]);
    if (!free) return;
    setEditPosition(free);
    setName('');
    setPhone('');
  };

  const closeDialog = () => {
    setEditPosition(null);
    setName('');
    setPhone('');
  };

  const handleSave = async () => {
    if (!editPosition) return;
    if (!name.trim() || !isValidUSPhone(phone)) return;
    try {
      await addContact({ name: name.trim(), phone, position: editPosition });
      toast({ title: 'Saved to Trusted Circle', description: name.trim() });
      closeDialog();
    } catch (e) {
      toast({
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmRemove = async () => {
    if (!removeTarget) return;
    try {
      await removeContact(removeTarget.position);
      toast({ title: `Removed ${removeTarget.name}` });
    } catch (e) {
      toast({
        title: 'Could not remove',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setRemoveTarget(null);
    }
  };

  const editing = editPosition ? contactByPosition[editPosition] : undefined;

  return (
    <div className="flex h-full w-full flex-col gap-3 min-h-0 animate-fade-in">
      <header className="flex items-center justify-between shrink-0">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-slate-300 hover:text-slate-100 -ml-1"
        >
          <ArrowLeft className="h-4 w-4" /> Settings
        </button>
        <h1 className="text-base font-semibold">Trusted Circle</h1>
        <span className="text-[11px] text-slate-400 tabular-nums">{contacts.length}/4</span>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
        {sorted.length === 0 ? (
          <p className="text-center text-sm text-slate-400 mt-8">
            No trusted contacts yet. Add up to 4 people who will be reached in an emergency.
          </p>
        ) : (
          <ul className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/70 overflow-hidden">
            {sorted.map((c) => {
              const isPrimary = c.position === PRIMARY_POSITION;
              return (
                <li key={c.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="relative shrink-0">
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow ring-1 ring-slate-900',
                        COLOR_BY_POSITION[c.position],
                      )}
                    >
                      {initials(c.name)}
                    </span>
                    {isPrimary && (
                      <Star
                        className="absolute -top-1 -right-1 h-3.5 w-3.5 fill-teal-300 text-teal-300 drop-shadow"
                        aria-hidden
                      />
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-slate-100 truncate">{c.name}</p>
                      {isPrimary && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-teal-300">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{c.phone}</p>
                  </div>
                  <button
                    onClick={() => openEdit(c)}
                    aria-label={`Edit ${c.name}`}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-800/60 hover:text-slate-100 transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setRemoveTarget(c)}
                    aria-label={`Remove ${c.name}`}
                    className="h-8 w-8 inline-flex items-center justify-center rounded-full text-slate-400 hover:bg-red-500/15 hover:text-red-300 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {sorted.length < 4 && (
          <button
            onClick={openAdd}
            className="w-full rounded-xl border border-dashed border-slate-700 bg-slate-900/30 hover:bg-slate-800/40 transition-colors py-3 inline-flex items-center justify-center gap-2 text-sm text-slate-200"
          >
            <UserPlus className="h-4 w-4" /> Add Contact
          </button>
        )}
      </div>

      {/* Add / Edit dialog */}
      <Dialog open={editPosition !== null} onOpenChange={(o) => !o && closeDialog()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Contact' : 'Add to Trusted Circle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tcm-name">Name</Label>
              <Input
                id="tcm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tcm-phone">Phone</Label>
              <Input
                id="tcm-phone"
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
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim() || !isValidUSPhone(phone)}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove contact?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget ? `Remove ${removeTarget.name} from your Trusted Circle?` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrustedCircleManager;
