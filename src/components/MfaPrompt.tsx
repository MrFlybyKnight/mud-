import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { hasTotpEnrolled } from "@/lib/mfa";
import MfaSetupDialog from "@/components/MfaSetupDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";

const DISMISS_KEY = (uid: string) => `mud:mfa-prompt-dismissed:${uid}`;

/**
 * Post-login MFA gate.
 * - Premium Plus: prompt once, dismissible.
 * - Prestige: blocking — must enroll before continuing.
 * Renders nothing for free users or users who already have TOTP enrolled.
 */
export default function MfaPrompt({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const plan = subscription?.plan ?? "free";

  const [enrolled, setEnrolled] = useState<boolean>(() => hasTotpEnrolled(user));
  const [setupOpen, setSetupOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);

  // Re-check enrollment when the user identity changes.
  useEffect(() => {
    setEnrolled(hasTotpEnrolled(user));
  }, [user]);

  useEffect(() => {
    if (!user || enrolled) {
      setPromptOpen(false);
      return;
    }
    if (plan === "prestige") {
      setPromptOpen(true);
      return;
    }
    if (plan === "premium_plus") {
      const dismissed = (() => {
        try { return window.localStorage.getItem(DISMISS_KEY(user.uid)) === "1"; }
        catch { return false; }
      })();
      if (!dismissed) setPromptOpen(true);
    }
  }, [user, enrolled, plan]);

  const handleDismiss = () => {
    if (!user) return;
    try { window.localStorage.setItem(DISMISS_KEY(user.uid), "1"); } catch { /* ignore */ }
    setPromptOpen(false);
  };

  const required = plan === "prestige";

  return (
    <>
      {children}

      {/* Intro prompt — only shown when not yet enrolled */}
      <Dialog
        open={promptOpen && !setupOpen}
        onOpenChange={(o) => {
          if (!o && required) return;
          if (!o) handleDismiss();
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-teal-400" />
              Protect your account
            </DialogTitle>
            <DialogDescription>
              {required
                ? "Prestige accounts require two-factor authentication. Set up an authenticator app to continue."
                : "Add two-factor authentication for an extra layer of security on your Premium Plus account."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {!required && (
              <Button variant="outline" onClick={handleDismiss}>
                Not now
              </Button>
            )}
            <Button onClick={() => setSetupOpen(true)}>Set up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MfaSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        required={required}
        onEnrolled={() => {
          setEnrolled(true);
          setPromptOpen(false);
        }}
      />
    </>
  );
}
