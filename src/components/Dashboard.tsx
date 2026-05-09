import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useProfile } from '@/contexts/ProfileContext';
import SetupWizard from './SetupWizard';
import ProfileSetup from './ProfileSetup';
import MoodCow from './MoodCow';
import NotificationCenter from './NotificationCenter';
import EmergencyAlert from './EmergencyAlert';
import EmotionTimelineBar from './EmotionTimelineBar';
import MooMeter from './MooMeter';
import TrustedCircleOverlay from './TrustedCircleOverlay';
import { useTrustedCircle } from '@/contexts/TrustedCircleContext';
import { Heart, Mic, MicOff, Users, History, Settings, Activity, Pause, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const HistoryScreen = lazy(() => import('./HistoryScreen'));
const SettingsScreen = lazy(() => import('./SettingsScreen'));


const ScreenFallback: React.FC = () => (
  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
    Loading…
  </div>
);

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
  const { isActive: trustedActive, toggleActive: toggleTrusted } = useTrustedCircle();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const toggleHistory = () => {
    if (historyOpen) { setHistoryOpen(false); return; }
    setSettingsOpen(false);
    if (trustedActive) toggleTrusted();
    setHistoryOpen(true);
  };
  const toggleSettings = () => {
    if (settingsOpen) { setSettingsOpen(false); return; }
    setHistoryOpen(false);
    if (trustedActive) toggleTrusted();
    setSettingsOpen(true);
  };
  const toggleTrustedNav = () => {
    // toggleTrusted already toggles; ensure other screens close when activating
    if (!trustedActive) {
      setHistoryOpen(false);
      setSettingsOpen(false);
    }
    toggleTrusted();
  };

  useEffect(() => {
    const onStart = () => {
      setProfileSaving(true);
      // Ensure the indicator is visible for at least ~2.5s for a smooth feel.
      window.setTimeout(() => setProfileSaving(false), 2500);
    };
    const onEnd = () => {
      // No-op — timer above controls dismissal. Kept for symmetry/future use.
    };
    window.addEventListener('profile-save-start', onStart);
    window.addEventListener('profile-save-end', onEnd);
    return () => {
      window.removeEventListener('profile-save-start', onStart);
      window.removeEventListener('profile-save-end', onEnd);
    };
  }, []);

  if (isSetupHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(222_47%_8%)]">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  if (!isSetupComplete) return <SetupWizard />;
  if (!isProfileComplete) return <ProfileSetup />;
  if (editingProfile) return <ProfileSetup onExit={() => setEditingProfile(false)} />;

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

        {historyOpen ? (
          <Suspense fallback={<ScreenFallback />}>
            <HistoryScreen onBack={() => setHistoryOpen(false)} />
          </Suspense>
        ) : settingsOpen ? (
          <Suspense fallback={<ScreenFallback />}>
            <SettingsScreen
              onEditProfile={() => { setSettingsOpen(false); setEditingProfile(true); }}
            />
          </Suspense>
        ) : (
          <>
            {/* Hero: emotion + cow + trusted circle overlay */}
            <section className="relative flex-1 min-h-0 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 flex flex-col items-center justify-center">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Current emotion</p>
              <h2 className="mt-1 text-3xl font-semibold capitalize text-slate-50">
                {currentEmotion}
              </h2>
              <MooMeter className="mt-2 w-[90%] shrink-0" />
              <div className="relative mt-2 flex h-full max-h-[42vh] w-full items-center justify-center">
                <MoodCow
                  emotion={currentEmotion}
                  className={cn(
                    'h-full w-auto transition-transform duration-300 ease-out',
                    trustedActive ? 'scale-50' : 'scale-100',
                  )}
                />
                <TrustedCircleOverlay />
              </div>
            </section>

            {/* Emotion timeline (last 6h) */}
            <EmotionTimelineBar onOpen={() => setHistoryOpen(true)} className="shrink-0" />


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
          </>
        )}

        {/* Bottom row */}
        <nav className="shrink-0 grid grid-cols-3 gap-3 pb-1">
          <BottomButton icon={History} label="History" onClick={toggleHistory} active={historyOpen} />
          <BottomButton
            icon={Users}
            label="Trusted"
            onClick={toggleTrustedNav}
            active={trustedActive}
          />
          <BottomButton
            icon={Settings}
            label="Settings"
            onClick={toggleSettings}
            active={settingsOpen}
          />
        </nav>
      </div>

      

      {profileSaving && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs text-slate-200 shadow-lg backdrop-blur animate-fade-in">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
          Setting up your profile…
        </div>
      )}
    </div>
  );
};

interface BottomButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  active?: boolean;
}
const BottomButton: React.FC<BottomButtonProps> = ({ icon: Icon, label, onClick, active }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 transition-colors',
      active
        ? 'border-teal-400/60 bg-teal-500/20 text-teal-200 hover:bg-teal-500/25'
        : 'border-slate-800 bg-slate-900/40 text-slate-300 hover:bg-slate-800/60',
    )}
  >
    <Icon className="h-5 w-5" />
    <span className="text-[11px]">{label}</span>
  </button>
);

export default Dashboard;
