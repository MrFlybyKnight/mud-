import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Crown, Loader2 } from "lucide-react";
import { useState } from "react";
import MoodCow from "@/components/MoodCow";
import { FEATURE_LABELS, useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { startCheckout, type StripePriceKey } from "@/lib/stripe";
import { useToast } from "@/hooks/use-toast";

export default function UpgradeModal() {
  const { upgradeFeature, closeUpgrade } = useSubscription();
  const { uid } = useAuth();
  const { toast } = useToast();
  const [loadingKey, setLoadingKey] = useState<StripePriceKey | null>(null);
  const open = upgradeFeature !== null;
  const info = upgradeFeature ? FEATURE_LABELS[upgradeFeature] : null;

  const handleCheckout = async (key: StripePriceKey) => {
    if (!uid) {
      toast({ title: "Sign in required", description: "Please sign in to upgrade.", variant: "destructive" });
      return;
    }
    try {
      setLoadingKey(key);
      await startCheckout(key, uid);
    } catch (err) {
      console.error("[UpgradeModal] checkout failed", err);
      toast({
        title: "Checkout unavailable",
        description: (err as Error)?.message ?? "Could not start checkout.",
        variant: "destructive",
      });
      setLoadingKey(null);
    }
  };

  const TierButtons = ({
    monthlyKey,
    annualKey,
    monthlyLabel,
    annualLabel,
  }: {
    monthlyKey: StripePriceKey;
    annualKey: StripePriceKey;
    monthlyLabel: string;
    annualLabel: string;
  }) => (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <Button
        size="sm"
        variant="default"
        disabled={loadingKey !== null}
        onClick={() => handleCheckout(monthlyKey)}
      >
        {loadingKey === monthlyKey ? <Loader2 className="h-4 w-4 animate-spin" /> : monthlyLabel}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={loadingKey !== null}
        onClick={() => handleCheckout(annualKey)}
      >
        {loadingKey === annualKey ? <Loader2 className="h-4 w-4 animate-spin" /> : annualLabel}
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeUpgrade()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 w-24 h-24">
            <MoodCow emotion="happy" className="w-full h-full" />
          </div>
          <DialogTitle className="text-xl">
            {info ? info.title : "Upgrade MūD"}
          </DialogTitle>
          <DialogDescription>
            {info?.benefit ?? "Unlock more from your MūD experience."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-semibold">Premium Plus</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              $14.99/mo or $119.99/year — save 33%
            </p>
            <TierButtons
              monthlyKey="premium_plus_monthly"
              annualKey="premium_plus_annual"
              monthlyLabel="$14.99 / mo"
              annualLabel="$119.99 / yr"
            />
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              <span className="font-semibold">Prestige</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              $19.99/mo or $159.99/year — everything in Premium Plus, plus Family.
            </p>
            <TierButtons
              monthlyKey="prestige_monthly"
              annualKey="prestige_annual"
              monthlyLabel="$19.99 / mo"
              annualLabel="$159.99 / yr"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={closeUpgrade} disabled={loadingKey !== null}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
