import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Crown } from "lucide-react";
import MoodCow from "@/components/MoodCow";
import { FEATURE_LABELS, useSubscription } from "@/hooks/useSubscription";

export default function UpgradeModal() {
  const { upgradeFeature, closeUpgrade } = useSubscription();
  const open = upgradeFeature !== null;
  const info = upgradeFeature ? FEATURE_LABELS[upgradeFeature] : null;

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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold">Premium Plus</span>
              </div>
              <Badge variant="secondary">$14.99/mo</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              or $119.99/year — save 33%
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-semibold">Prestige</span>
              </div>
              <Badge variant="secondary">$19.99/mo</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              or $159.99/year — everything in Premium Plus, plus Family.
            </p>
          </div>

          <div className="rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">
            Payments coming soon — you'll be the first to know when upgrades unlock.
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={closeUpgrade}>
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
