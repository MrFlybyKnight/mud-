import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { isDeviceRemembered } from "@/lib/mfa";
import EmailOtpDialog from "@/components/EmailOtpDialog";

/**
 * Post-login Email-OTP gate.
 *  - Free: never gated.
 *  - Premium Plus: must verify once per device, remembered indefinitely.
 *  - Prestige: must verify every 7 days; cannot dismiss.
 */
export default function MfaPrompt({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  const plan = subscription?.plan ?? "free";

  const [checked, setChecked] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    console.log("[MfaPrompt] effect run", { uid: user?.uid, plan });
    if (!user || plan === "free") {
      console.log("[MfaPrompt] skipping MFA gate (no user or free plan)");
      setChecked(true);
      setVerified(true);
      return;
    }
    setChecked(false);
    console.log("[MfaPrompt] checking isDeviceRemembered…");
    isDeviceRemembered(user, plan).then((ok) => {
      if (cancelled) return;
      console.log("[MfaPrompt] isDeviceRemembered →", ok, "→ opening OTP dialog?", !ok);
      setVerified(ok);
      setOtpOpen(!ok);
      setChecked(true);
    }).catch((err) => {
      console.error("[MfaPrompt] isDeviceRemembered threw", err);
      if (!cancelled) { setOtpOpen(true); setChecked(true); }
    });
    return () => { cancelled = true; };
  }, [user, plan]);

  const required = plan === "prestige" && !verified;

  // Prestige: hard-block content until verified.
  if (plan === "prestige" && checked && !verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-3">
          <h1 className="text-lg font-semibold">Verification required</h1>
          <p className="text-sm text-muted-foreground">
            Prestige accounts must verify their identity every 7 days.
          </p>
        </div>
        <EmailOtpDialog
          open={otpOpen}
          onOpenChange={setOtpOpen}
          required
          onVerified={() => setVerified(true)}
        />
      </div>
    );
  }

  return (
    <>
      {children}
      <EmailOtpDialog
        open={otpOpen}
        onOpenChange={setOtpOpen}
        required={required}
        onVerified={() => setVerified(true)}
      />
    </>
  );
}
