import React, { useState } from 'react';
import { Sparkles, Crown, Check, Loader2, CreditCard, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, type SubscriptionPlan } from '@/hooks/useSubscription';
import { cancelSubscription, startCheckout, type StripePriceKey } from '@/lib/stripe';

const PLAN_META: Record<SubscriptionPlan, {
  label: string;
  badge: string;
  features: string[];
}> = {
  free: {
    label: 'Free',
    badge: 'bg-slate-500/20 text-slate-200 border-slate-500/40',
    features: [
      'Basic emotion detection (HR-based)',
      '7 days of history',
      '1 Trusted Circle contact',
      'Moo Meter & core emergency alerts',
    ],
  },
  premium_plus: {
    label: 'Premium Plus',
    badge: 'bg-teal-500/20 text-teal-200 border-teal-500/40',
    features: [
      'Advanced AssemblyAI speech analysis',
      'All 16 emotions',
      'Unlimited history',
      'Unlimited Trusted Circle',
      'Loquacity nudges & context suggestions',
      'Export your data',
    ],
  },
  prestige: {
    label: 'Prestige',
    badge: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
    features: [
      'Everything in Premium Plus',
      'Family plan — share with loved ones',
      'Priority support',
    ],
  },
};

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2 px-1">
    {children}
  </h2>
);

const SubscriptionSkeleton: React.FC = () => (
  <section>
    <SectionHeader>Subscription</SectionHeader>
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden animate-pulse">
      <div className="px-4 py-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-800 rounded" />
          <div className="h-3 w-40 bg-slate-800/70 rounded" />
        </div>
        <div className="h-5 w-16 bg-slate-800 rounded-full" />
      </div>
      <div className="border-t border-slate-800/70 px-4 py-3 space-y-2">
        <div className="h-3 w-20 bg-slate-800/70 rounded" />
        <div className="h-3 w-3/4 bg-slate-800/70 rounded" />
        <div className="h-3 w-2/3 bg-slate-800/70 rounded" />
      </div>
      <div className="border-t border-slate-800/70 px-4 py-3">
        <div className="h-9 w-full bg-slate-800 rounded" />
      </div>
    </div>
  </section>
);

const safeRenewsAt = (value: unknown): Date | null => {
  if (!value) return null;
  try {
    if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
      return (value as { toDate: () => Date }).toDate();
    }
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === 'object' && 'seconds' in (value as Record<string, unknown>)) {
      const seconds = Number((value as { seconds: number }).seconds);
      return isNaN(seconds) ? null : new Date(seconds * 1000);
    }
  } catch (err) {
    console.error('[Subscription] failed to parse renewsAt', err);
  }
  return null;
};

const SubscriptionSectionInner: React.FC = () => {
  const { uid } = useAuth();
  const { subscription, loading } = useSubscription();
  const { toast } = useToast();

  const [loadingKey, setLoadingKey] = useState<StripePriceKey | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  if (loading) return <SubscriptionSkeleton />;

  const rawPlan = subscription?.plan ?? 'free';
  const plan: SubscriptionPlan = (PLAN_META[rawPlan as SubscriptionPlan] ? rawPlan : 'free') as SubscriptionPlan;
  const meta = PLAN_META[plan] ?? PLAN_META.free;
  const isPaid = plan !== 'free';
  const renewsAt = safeRenewsAt(subscription?.renewsAt);

  const handleCheckout = async (key: StripePriceKey) => {
    if (!uid) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }
    try {
      setLoadingKey(key);
      await startCheckout(key, uid);
    } catch (err) {
      console.error('[Subscription] checkout failed', err);
      toast({
        title: 'Checkout unavailable',
        description: (err as Error)?.message ?? 'Could not start checkout.',
        variant: 'destructive',
      });
      setLoadingKey(null);
    }
  };

  const handleCancel = async () => {
    if (!uid) return;
    setConfirmCancelOpen(false);
    try {
      setCancelling(true);
      await cancelSubscription(uid);
      toast({
        title: 'Subscription cancelled',
        description: 'You will keep premium access until the end of your billing period.',
      });
    } catch (err) {
      console.error('[Subscription] cancel failed', err);
      toast({
        title: 'Could not cancel',
        description: (err as Error)?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const PlanIcon = plan === 'prestige' ? Crown : plan === 'premium_plus' ? Sparkles : CreditCard;

  return (
    <section>
      <SectionHeader>Subscription</SectionHeader>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        {/* Header: plan + badge */}
        <div className="px-4 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PlanIcon className="h-4 w-4 text-slate-300" />
              <span className="text-sm font-medium text-slate-100">Current plan</span>
            </div>
            {renewsAt && (
              <p className="mt-1 text-[11px] text-slate-400">
                {subscription?.status === 'cancelled' ? 'Ends' : 'Renews'} on{' '}
                {renewsAt.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            )}
            {!renewsAt && isPaid && (
              <p className="mt-1 text-[11px] text-slate-400">Billing details syncing…</p>
            )}
            {!isPaid && (
              <p className="mt-1 text-[11px] text-slate-400">No payment required</p>
            )}
          </div>
          <span
            className={cn(
              'shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              meta.badge,
            )}
          >
            {loading ? 'Loading…' : meta.label}
          </span>
        </div>

        {/* Features */}
        <div className="border-t border-slate-800/70 px-4 py-3">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 mb-2">What's included</p>
          <ul className="space-y-1.5">
            {meta.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-slate-200">
                <Check className="h-3.5 w-3.5 mt-0.5 text-teal-300 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-800/70 px-4 py-3 space-y-2">
          {!isPaid && (
            <>
              <Button
                className="w-full justify-between"
                disabled={loadingKey !== null}
                onClick={() => handleCheckout('premium_plus_monthly')}
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Upgrade to Premium Plus
                </span>
                {loadingKey === 'premium_plus_monthly' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs opacity-90">$14.99 / mo</span>
                )}
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-between"
                disabled={loadingKey !== null}
                onClick={() => handleCheckout('prestige_monthly')}
              >
                <span className="flex items-center gap-2">
                  <Crown className="h-4 w-4" />
                  Upgrade to Prestige
                </span>
                {loadingKey === 'prestige_monthly' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-xs opacity-90">$19.99 / mo</span>
                )}
              </Button>
            </>
          )}

          {isPaid && (
            <>
              <Button
                variant="outline"
                className="w-full justify-between"
                disabled={loadingKey !== null}
                onClick={() => setSwitchOpen((s) => !s)}
              >
                <span className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  Switch plan
                </span>
                <span className="text-xs text-slate-400">
                  {switchOpen ? 'Hide' : 'Show options'}
                </span>
              </Button>

              {switchOpen && (
                <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 space-y-2">
                  {plan !== 'premium_plus' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loadingKey !== null}
                        onClick={() => handleCheckout('premium_plus_monthly')}
                      >
                        {loadingKey === 'premium_plus_monthly' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Premium Plus $14.99/mo'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={loadingKey !== null}
                        onClick={() => handleCheckout('premium_plus_annual')}
                      >
                        {loadingKey === 'premium_plus_annual' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Premium Plus $119.99/yr'
                        )}
                      </Button>
                    </div>
                  )}
                  {plan !== 'prestige' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        disabled={loadingKey !== null}
                        onClick={() => handleCheckout('prestige_monthly')}
                      >
                        {loadingKey === 'prestige_monthly' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Prestige $19.99/mo'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        disabled={loadingKey !== null}
                        onClick={() => handleCheckout('prestige_annual')}
                      >
                        {loadingKey === 'prestige_annual' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Prestige $159.99/yr'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                className="w-full text-red-300 hover:text-red-200 hover:bg-red-500/10"
                disabled={cancelling}
                onClick={() => setConfirmCancelOpen(true)}
              >
                {cancelling ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Manage subscription · Cancel'
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel? You will lose access to premium features at the end of
              your billing period.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my plan</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-500 hover:bg-red-500/90"
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default SubscriptionSection;
