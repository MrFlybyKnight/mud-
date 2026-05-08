import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { updateEmail } from 'firebase/auth';
import { db, auth } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserSettings, type DndMode, type TextSize } from '@/contexts/UserSettingsContext';

import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  User,
  Mail,
  LogOut,
  Activity,
  MoonStar,
  RotateCcw,
  Bell,
  ShieldAlert,
  Users,
  Database,
  Download,
  Trash2,
  Sun,
  Type,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import pkg from '../../package.json';

import TrustedCircleManager from './TrustedCircleManager';
const SubscriptionSection = lazy(() => import('./SubscriptionSection'));

interface SettingsScreenProps {
  onClose: () => void;
  onOpenTrusted: () => void;
  onEditProfile: () => void;
}

const KNOWN_SUBCOLLECTIONS_PLACEHOLDER = null;

const KNOWN_SUBCOLLECTIONS = ['subchecks', 'checkpoints', 'watchMetrics', 'assessments', 'notifications'];

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1">
    {children}
  </h2>
);

const Row: React.FC<{
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  onClick?: () => void;
  right?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
}> = ({ icon: Icon, label, description, onClick, right, disabled, destructive }) => {
  const Inner = (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-3',
        onClick && !disabled && 'hover:bg-slate-800/40 transition-colors cursor-pointer',
        disabled && 'opacity-50',
      )}
    >
      {Icon && (
        <Icon className={cn('h-4 w-4 shrink-0', destructive ? 'text-red-400' : 'text-slate-400')} />
      )}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm', destructive ? 'text-red-300' : 'text-slate-100')}>{label}</p>
        {description && <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>}
      </div>
      {right}
      {onClick && !right && <ChevronRight className="h-4 w-4 text-slate-500" />}
    </div>
  );
  if (onClick && !disabled) {
    return <button type="button" onClick={onClick} className="w-full text-left">{Inner}</button>;
  }
  return Inner;
};

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/70 overflow-hidden">
    {children}
  </div>
);

const SettingsScreen: React.FC<SettingsScreenProps> = ({ onClose: _onClose, onOpenTrusted: _onOpenTrusted, onEditProfile }) => {
  const { uid, user, logout } = useAuth();
  const { isMonitoring, toggleMonitoring, startSetup } = useMonitoring();
  const { theme, toggleTheme } = useTheme();
  const [trustedManagerOpen, setTrustedManagerOpen] = useState(false);
  const { toast } = useToast();

  const { settings, updateSettings } = useUserSettings();
  type UserSettings = typeof settings;
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [recalibrateOpen, setRecalibrateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [dndModeAskOpen, setDndModeAskOpen] = useState(false);

  // Apply text size globally
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('text-size-normal', 'text-size-large', 'text-size-xlarge');
    root.classList.add(`text-size-${settings.textSize}`);
  }, [settings.textSize]);

  const persist = async (next: UserSettings) => {
    try {
      await updateSettings(() => next);
    } catch (e) {
      console.error('[Settings] save failed', e);
      toast({ title: 'Could not save setting', variant: 'destructive' });
    }
  };

  const updateNotif = (key: keyof UserSettings['notifications'], value: boolean) => {
    persist({ ...settings, notifications: { ...settings.notifications, [key]: value } });
  };

  const handleMasterToggle = (value: boolean) => {
    persist({
      ...settings,
      notifications: {
        master: value,
        wellness: value ? settings.notifications.wellness : false,
        lowParticipation: value ? settings.notifications.lowParticipation : false,
        contextSuggestions: value ? settings.notifications.contextSuggestions : false,
      },
    });
  };

  const handleSignOut = async () => {
    setSignOutOpen(false);
    try {
      await logout();
    } catch (e) {
      toast({ title: 'Sign out failed', variant: 'destructive' });
    }
  };

  const handleRecalibrate = () => {
    setRecalibrateOpen(false);
    startSetup();
    toast({ title: 'Recalibration started', description: 'Walking through setup again.' });
  };

  const handleChangeEmail = async () => {
    if (!user || !newEmail) return;
    try {
      await updateEmail(user, newEmail);
      toast({ title: 'Email updated' });
      setEmailOpen(false);
      setNewEmail('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to update email';
      toast({ title: 'Could not update email', description: msg, variant: 'destructive' });
    }
  };

  const handleExport = async () => {
    if (!uid) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const exportData: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        uid,
        profile: userDoc.exists() ? userDoc.data() : null,
      };
      for (const sub of KNOWN_SUBCOLLECTIONS) {
        try {
          const snap = await getDocs(collection(db, 'users', uid, sub));
          exportData[sub] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          // ignore missing subcollection
        }
      }
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mud-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Data exported' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!uid || deleteConfirm !== 'DELETE') return;
    try {
      for (const sub of KNOWN_SUBCOLLECTIONS) {
        try {
          const snap = await getDocs(collection(db, 'users', uid, sub));
          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
        } catch {
          // ignore
        }
      }
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch {
        // ignore
      }
      await logout();
      toast({ title: 'Your data has been deleted' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const version = (pkg as { version?: string }).version || '0.0.0';

  if (trustedManagerOpen) {
    return <TrustedCircleManager onBack={() => setTrustedManagerOpen(false)} />;
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 min-h-0 animate-fade-in">
      <header className="flex items-center justify-between shrink-0">
        <h1 className="text-base font-semibold">Settings</h1>
        <span className="text-[11px] text-slate-400">v{version}</span>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-5 pb-2">
        {/* Account */}
        <section>
          <SectionHeader>Account</SectionHeader>
          <Card>
            <Row icon={User} label="Edit Profile" onClick={onEditProfile} />
            <Row
              icon={Mail}
              label="Change Email"
              description={user?.email || undefined}
              onClick={() => { setNewEmail(user?.email || ''); setEmailOpen(true); }}
            />
            <Row icon={LogOut} label="Sign Out" destructive onClick={() => setSignOutOpen(true)} />
          </Card>
        </section>

        <SubscriptionSection />

        {/* Monitoring */}
        <section>
          <SectionHeader>Monitoring</SectionHeader>
          <Card>
            <Row
              icon={Activity}
              label="Active Listening"
              description="Mic and HR analysis run in the background"
              right={
                <Switch
                  checked={isMonitoring}
                  onCheckedChange={(v) => {
                    if (v !== isMonitoring) toggleMonitoring();
                    persist({ ...settings, activeListening: v });
                  }}
                />
              }
            />
            <Row
              icon={MoonStar}
              label="Do Not Disturb"
              description={settings.dnd.enabled ? `${settings.dnd.start} – ${settings.dnd.end} · ${settings.dnd.mode}` : 'Off'}
              right={
                <Switch
                  checked={settings.dnd.enabled}
                  onCheckedChange={(v) => {
                    if (v) setDndModeAskOpen(true);
                    else persist({ ...settings, dnd: { ...settings.dnd, enabled: false } });
                  }}
                />
              }
            />
            {settings.dnd.enabled && (
              <div className="px-3 py-3 space-y-3 bg-slate-900/30">
                <div className="flex items-center gap-3">
                  <Label className="w-12 text-xs text-slate-400">Start</Label>
                  <Input
                    type="time"
                    value={settings.dnd.start}
                    onChange={(e) => persist({ ...settings, dnd: { ...settings.dnd, start: e.target.value } })}
                    className="bg-slate-800/60 border-slate-700 text-slate-100 h-9"
                  />
                  <Label className="w-8 text-xs text-slate-400 text-right">End</Label>
                  <Input
                    type="time"
                    value={settings.dnd.end}
                    onChange={(e) => persist({ ...settings, dnd: { ...settings.dnd, end: e.target.value } })}
                    className="bg-slate-800/60 border-slate-700 text-slate-100 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 flex-1">During work hours</span>
                  <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
                    {(['silent', 'vibrate'] as DndMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => persist({ ...settings, dnd: { ...settings.dnd, mode: m } })}
                        className={cn(
                          'px-3 py-1 text-xs capitalize',
                          settings.dnd.mode === m ? 'bg-teal-500/20 text-teal-200' : 'text-slate-300',
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <Row icon={RotateCcw} label="Re-calibrate" description="Redo baseline setup" onClick={() => setRecalibrateOpen(true)} />
          </Card>
        </section>

        {/* Notifications */}
        <section>
          <SectionHeader>Notifications</SectionHeader>
          <Card>
            <Row
              icon={Bell}
              label="All notifications"
              description="Master switch — emergency stays on"
              right={<Switch checked={settings.notifications.master} onCheckedChange={handleMasterToggle} />}
            />
            <Row
              icon={ShieldAlert}
              label="Emergency alerts"
              description="Cannot be disabled for your safety"
              disabled
              right={<Switch checked disabled />}
            />
            <Row
              label="Wellness reminders"
              right={
                <Switch
                  checked={settings.notifications.wellness && settings.notifications.master}
                  disabled={!settings.notifications.master}
                  onCheckedChange={(v) => updateNotif('wellness', v)}
                />
              }
            />
            <Row
              label="Low participation alerts"
              right={
                <Switch
                  checked={settings.notifications.lowParticipation && settings.notifications.master}
                  disabled={!settings.notifications.master}
                  onCheckedChange={(v) => updateNotif('lowParticipation', v)}
                />
              }
            />
            <Row
              label="Context suggestions"
              right={
                <Switch
                  checked={settings.notifications.contextSuggestions && settings.notifications.master}
                  disabled={!settings.notifications.master}
                  onCheckedChange={(v) => updateNotif('contextSuggestions', v)}
                />
              }
            />
          </Card>
        </section>

        {/* Trusted Circle */}
        <section>
          <SectionHeader>Trusted Circle</SectionHeader>
          <Card>
            <Row
              icon={Users}
              label="Manage Trusted Circle"
              onClick={() => setTrustedManagerOpen(true)}
            />
          </Card>
        </section>

        {/* Privacy & Data */}
        <section>
          <SectionHeader>Privacy & Data</SectionHeader>
          <Card>
            <Row
              icon={Database}
              label="Data retention"
              description={`Basic — ${settings.dataRetentionDays} days`}
            />
            <Row icon={Download} label="Export my data" onClick={handleExport} />
            <Row icon={Trash2} label="Delete my data" destructive onClick={() => setDeleteOpen(true)} />
          </Card>
        </section>

        {/* App */}
        <section>
          <SectionHeader>App</SectionHeader>
          <Card>
            <Row
              icon={theme === 'dark' ? MoonStar : Sun}
              label="Theme"
              description={theme === 'dark' ? 'Dark' : 'Light'}
              right={<Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />}
            />
            <Row
              icon={Type}
              label="Text size"
              right={
                <div className="inline-flex rounded-lg border border-slate-700 overflow-hidden">
                  {([
                    { v: 'normal', l: 'A' },
                    { v: 'large', l: 'A+' },
                    { v: 'xlarge', l: 'A++' },
                  ] as { v: TextSize; l: string }[]).map(({ v, l }) => (
                    <button
                      key={v}
                      onClick={() => persist({ ...settings, textSize: v })}
                      className={cn(
                        'px-2.5 py-1 text-xs',
                        settings.textSize === v ? 'bg-teal-500/20 text-teal-200' : 'text-slate-300',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              }
            />
            <Row label="Version" right={<span className="text-xs text-slate-400 tabular-nums">{version}</span>} />
          </Card>
        </section>
      </div>

      {/* Sign out confirmation */}
      <AlertDialog open={signOutOpen} onOpenChange={setSignOutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You'll need to sign back in to keep monitoring.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recalibrate confirmation */}
      <AlertDialog open={recalibrateOpen} onOpenChange={setRecalibrateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-calibrate?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite your current baseline data. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRecalibrate}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DND mode picker */}
      <Dialog open={dndModeAskOpen} onOpenChange={setDndModeAskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quiet hours mode</DialogTitle>
            <DialogDescription>During work hours would you prefer Silent or Vibrate?</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 py-2">
            {(['silent', 'vibrate'] as DndMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  persist({ ...settings, dnd: { ...settings.dnd, enabled: true, mode: m } });
                  setDndModeAskOpen(false);
                }}
                className={cn(
                  'flex-1 rounded-lg border px-4 py-3 text-sm capitalize transition-colors',
                  settings.dnd.mode === m
                    ? 'border-teal-400/60 bg-teal-500/20 text-teal-200'
                    : 'border-slate-700 bg-slate-900/40 text-slate-200 hover:bg-slate-800/60',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change email */}
      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change email</DialogTitle>
            <DialogDescription>You may need to sign in again to confirm.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="new-email" className="text-xs text-slate-400">New email</Label>
            <Input
              id="new-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="mt-1"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeEmail} disabled={!newEmail || newEmail === user?.email}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete data */}
      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteConfirm(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete all data?</DialogTitle>
            <DialogDescription>
              This permanently erases your profile, baselines, and history. Type <span className="font-mono text-red-300">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            className="my-2"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== 'DELETE'}
              onClick={handleDelete}
            >
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SettingsScreen;
