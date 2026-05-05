import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMonitoring } from '@/contexts/MonitoringContext';
import { useTrustedCircle } from '@/contexts/TrustedCircleContext';
import { callPhone } from './TrustedCircleOverlay';
import { Button } from '@/components/ui/button';
import { recordEmergencyEvent, type EmergencyEvent, type EmergencyType } from '@/utils/notificationUtils';
import { Phone, Heart, X } from 'lucide-react';

const COLORS: Record<EmergencyType, { bg: string; fg: string; accent: string }> = {
  heart_attack:        { bg: 'bg-red-900',    fg: 'text-white', accent: 'bg-white text-red-900' },
  seizure:             { bg: 'bg-red-900',    fg: 'text-white', accent: 'bg-white text-red-900' },
  stroke:              { bg: 'bg-red-900',    fg: 'text-white', accent: 'bg-white text-red-900' },
  intoxication:        { bg: 'bg-amber-600',  fg: 'text-white', accent: 'bg-white text-amber-700' },
  mental_health_onset: { bg: 'bg-sky-700',    fg: 'text-white', accent: 'bg-white text-sky-700' },
};

const TWO_TIER: EmergencyType[] = ['heart_attack', 'seizure', 'stroke'];

const BreathingGuide: React.FC = () => {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  useEffect(() => {
    const cycle: Array<['Inhale' | 'Hold' | 'Exhale', number]> = [
      ['Inhale', 4000], ['Hold', 4000], ['Exhale', 6000],
    ];
    let i = 0;
    const tick = () => {
      const [next, dur] = cycle[i % cycle.length];
      setPhase(next);
      i++;
      timer = setTimeout(tick, dur);
    };
    let timer = setTimeout(tick, 0);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <div
        className={`h-32 w-32 rounded-full bg-white/20 transition-transform duration-[4000ms] ease-in-out ${
          phase === 'Inhale' ? 'scale-110' : phase === 'Exhale' ? 'scale-75' : 'scale-100'
        }`}
      />
      <p className="text-2xl font-semibold tracking-wide">{phase}</p>
      <p className="text-sm opacity-80">Inhale 4 · Hold 4 · Exhale 6</p>
    </div>
  );
};

const EmergencyOverlay: React.FC = () => {
  const { pendingEmergency, clearEmergency } = useMonitoring();
  const { contactByPosition } = useTrustedCircle();
  const event = pendingEmergency;
  const isTwoTier = !!event && TWO_TIER.includes(event.type);
  const initialCountdown = event?.countdownSeconds ?? 0;
  const [countdown, setCountdown] = useState<number>(initialCountdown);
  const [escalated, setEscalated] = useState<boolean>(false);
  const recordedRef = useRef<boolean>(false);
  const autoDialedRef = useRef<boolean>(false);

  // Reset state when a new event arrives
  useEffect(() => {
    if (!event) return;
    recordedRef.current = false;
    autoDialedRef.current = false;
    setEscalated(false);
    setCountdown(event.countdownSeconds ?? 0);
  }, [event?.notification.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown ticker for two-tier events
  useEffect(() => {
    if (!event || !isTwoTier || escalated) return;
    if (countdown <= 0) {
      // Escalate: alert all trusted contacts
      setEscalated(true);
      if (!recordedRef.current) {
        recordedRef.current = true;
        void recordEmergencyEvent(event, 'contacts_alerted');
      }
      // Auto-dial primary contact (top left) as last resort
      const primary = contactByPosition.topLeft;
      if (primary && !autoDialedRef.current) {
        autoDialedRef.current = true;
        callPhone(primary.phone);
      }
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, event, isTwoTier, escalated]);

  // For non-two-tier (intoxication, mental_health_onset), record once on display
  useEffect(() => {
    if (!event || isTwoTier || recordedRef.current) return;
    recordedRef.current = true;
    const response = event.type === 'intoxication' ? 'contacts_alerted' : 'contacts_alerted';
    void recordEmergencyEvent(event, response);
  }, [event, isTwoTier]);

  const colors = useMemo(() => (event ? COLORS[event.type] : null), [event]);

  if (!event || !colors) return null;

  const handleOk = () => {
    if (!recordedRef.current) {
      recordedRef.current = true;
    }
    void recordEmergencyEvent(event, 'user_confirmed_ok');
    clearEmergency();
  };

  const handleDismiss = () => {
    void recordEmergencyEvent(event, 'dismissed');
    clearEmergency();
  };

  const handleCall911 = () => {
    void recordEmergencyEvent(event, '911_called');
    window.location.href = 'tel:911';
  };

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 text-center ${colors.bg} ${colors.fg}`}
    >
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute right-4 top-4 rounded-full p-2 hover:bg-white/10"
      >
        <X className="h-5 w-5" />
      </button>

      <Heart className="mb-4 h-12 w-12" />
      <h1 id="emergency-title" className="text-3xl font-bold leading-tight md:text-4xl">
        {event.title}
      </h1>
      <p className="mt-4 max-w-xl text-base md:text-lg opacity-95">
        {event.message}
      </p>

      {isTwoTier && !escalated && (
        <div className="mt-6">
          <p className="text-sm uppercase tracking-widest opacity-80">Auto-alerting in</p>
          <p className="mt-1 text-6xl font-bold tabular-nums">{countdown}s</p>
        </div>
      )}

      {isTwoTier && escalated && (
        <div className="mt-6 max-w-md">
          <p className="font-semibold">Trusted contacts have been notified.</p>
          <p className="mt-1 text-sm opacity-90">Consider calling 911 if you need immediate help.</p>
        </div>
      )}

      {event.type === 'mental_health_onset' && <BreathingGuide />}

      <div className="mt-8 flex w-full max-w-md flex-col gap-3">
        <Button
          size="lg"
          className={`h-14 text-lg font-semibold ${colors.accent} hover:opacity-90`}
          onClick={handleOk}
        >
          I'm Okay
        </Button>

        {isTwoTier && escalated && (
          <Button
            size="lg"
            variant="destructive"
            className="h-14 text-lg font-semibold"
            onClick={handleCall911}
          >
            <Phone className="mr-2 h-5 w-5" />
            Call 911
          </Button>
        )}
      </div>
    </div>
  );
};

export default EmergencyOverlay;
