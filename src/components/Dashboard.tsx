import React, { useState } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useProfile } from '@/contexts/ProfileContext';
import SetupWizard from './SetupWizard';
import ProfileSetup from './ProfileSetup';
import MoodCow from './MoodCow';
import NotificationCenter from './NotificationCenter';
import SettingsDialog from './SettingsDialog';
import EmergencyContactManager from './EmergencyContactManager';
import AssessmentsDisplay from './AssessmentsDisplay';
import EmergencyAlert from './EmergencyAlert';
import { Heart, Mic, MicOff, Users, History, Settings, Activity, Pause, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const Dashboard: React.FC = () => {
  const {
    isSetupComplete,
    isSetupHydrating,
    currentEmergency,
    currentEmotion,
    heartRate,
    speechPercentage,
    isMonitoring,
    toggleMonitoring,
    isTalking,
    toggleTalking,
  } = useMonitoring();
  const { isProfileComplete } = useProfile();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [trustedOpen, setTrustedOpen] = useState(false);
  const settingsTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  if (isSetupHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222_47%_8%)]">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!isSetupComplete) return <SetupWizard />;
  if (!isProfileComplete) return <ProfileSetup />;

  const status = !isMonitoring ? 'Paused' : isTalking ? 'Active' : 'Silent';
  const statusColor =
    status === 'Active'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : status === 'Silent'
      ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
      : 'bg-slate-500/15 text-slate-300 border-slate-500/30';

  const cycleStatus = () => {
    // Active -> Silent -> Paused -> Active
    if (status === 'Active') {
      toggleTalking(); // turn off talking → Silent
    } else if (status === 'Silent') {
      toggleMonitoring(); // pause
    } else {
      toggleMonitoring(); // resume → Silent
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[hsl(222_47%_8%)] text-slate-100 overflow-hidden animate-fade-in">
      <div className="mx-auto flex h-full w-full max-w-md flex-col px-4 py-3 gap-3">
        {/* Top bar */}
        <header className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-400" />
            <span className="text-base font-semibold tracking-wide">MūD</span>
          </div>
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <button
              onClick={toggleTalking}
              aria-label={isTalking ? 'Mute microphone' : 'Enable microphone'}
              className={cn(
                'h-9 w-9 inline-flex items-center justify-center rounded-full border transition-colors',
                isTalking
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-700 bg-slate-800/60 text-slate-300'
              )}
            >
              {isTalking ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {currentEmergency !== 'none' && (
          <div className="shrink-0">
            <EmergencyAlert />
          </div>
        )}

        {/* Hero: emotion + body heatmap */}
        <section className="flex-1 min-h-0 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 flex flex-col items-center justify-center">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current emotion</p>
          <h2 className="mt-1 text-3xl font-semibold capitalize text-slate-50">
            {currentEmotion}
          </h2>
          <MoodCow emotion={currentEmotion} className="mt-2 h-full max-h-[42vh] w-auto" />
        </section>

        {/* Vitals row */}
        <section className="grid grid-cols-2 gap-3 shrink-0">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Heart className="h-3.5 w-3.5 text-rose-400" /> Heart rate
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-slate-50 tabular-nums">{heartRate}</span>
              <span className="text-xs text-slate-400">BPM</span>
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Activity className="h-3.5 w-3.5 text-sky-400" /> Speech
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-slate-50 tabular-nums">{speechPercentage}</span>
              <span className="text-xs text-slate-400">%</span>
            </div>
          </div>
        </section>

        {/* Status bar */}
        <button
          onClick={cycleStatus}
          aria-label={`Monitoring mode: ${status}. Tap to change.`}
          className={cn(
            'shrink-0 w-full rounded-xl border px-4 py-2.5 flex items-center justify-between transition-colors',
            statusColor
          )}
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            {status === 'Paused' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {status}
          </span>
          <span className="text-[10px] uppercase tracking-wider opacity-70">tap to toggle</span>
        </button>

        {/* Bottom row */}
        <nav className="shrink-0 grid grid-cols-3 gap-3 pb-1">
          <BottomButton icon={History} label="History" onClick={() => setHistoryOpen(true)} />
          <BottomButton icon={Users} label="Trusted" onClick={() => setTrustedOpen(true)} />
          <BottomButton
            icon={Settings}
            label="Settings"
            onClick={() => settingsTriggerRef.current?.click()}
          />
        </nav>
      </div>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>History</DialogTitle></DialogHeader>
          <AssessmentsDisplay />
        </DialogContent>
      </Dialog>

      <Dialog open={trustedOpen} onOpenChange={setTrustedOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Trusted Circle</DialogTitle></DialogHeader>
          <EmergencyContactManager />
        </DialogContent>
      </Dialog>

      {/* SettingsDialog renders its own trigger; mount it off-screen and click via ref. */}
      <div
        className="absolute -left-[9999px] top-0"
        aria-hidden
        ref={(el) => {
          settingsTriggerRef.current = el?.querySelector('button') ?? null;
        }}
      >
        <SettingsDialog />
      </div>
    </div>
  );
};

interface BottomButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}
const BottomButton: React.FC<BottomButtonProps> = ({ icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-900/40 py-2.5 text-slate-300 hover:bg-slate-800/60 transition-colors"
  >
    <Icon className="h-5 w-5" />
    <span className="text-[11px]">{label}</span>
  </button>
);

export default Dashboard;
