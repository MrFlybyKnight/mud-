import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { startTotpEnrollment, finalizeTotpEnrollment } from "@/lib/mfa";
import type { TotpSecret } from "firebase/auth";
import { Copy, ShieldCheck, Loader2 } from "lucide-react";

interface MfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If true, the dialog cannot be dismissed without enrolling (Prestige flow). */
  required?: boolean;
  onEnrolled?: () => void;
}

type Step = "loading" | "show" | "verify" | "done";

export default function MfaSetupDialog({ open, onOpenChange, required, onEnrolled }: MfaSetupDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("loading");
  const [secret, setSecret] = useState<TotpSecret | null>(null);
  const [manualKey, setManualKey] = useState("");
  const [qrPng, setQrPng] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setStep("loading");
    setError(null);
    setCode("");
    (async () => {
      try {
        const { secret, qrCodeUrl, manualKey } = await startTotpEnrollment(user);
        if (cancelled) return;
        const png = await QRCode.toDataURL(qrCodeUrl, { width: 220, margin: 1 });
        if (cancelled) return;
        setSecret(secret);
        setManualKey(manualKey);
        setQrPng(png);
        setStep("show");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Could not start MFA setup";
        setError(msg);
        setStep("show");
      }
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  const handleVerify = async () => {
    if (!user || !secret) return;
    setBusy(true);
    setError(null);
    try {
      await finalizeTotpEnrollment(user, secret, code);
      setStep("done");
      toast({ title: "Two-factor authentication enabled", description: "Your account is now protected." });
      onEnrolled?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid code — try again";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const copyKey = async () => {
    try {
      await navigator.clipboard.writeText(manualKey);
      toast({ title: "Key copied" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && required && step !== "done") return; // can't dismiss when required
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
            Set up two-factor authentication
          </DialogTitle>
          <DialogDescription>
            Scan the QR code with Google Authenticator, Authy, or any TOTP app — then enter the 6-digit code to confirm.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {(step === "show" || step === "verify") && (
          <div className="space-y-4">
            {qrPng && (
              <div className="flex justify-center">
                <img src={qrPng} alt="TOTP QR code" className="rounded-lg bg-white p-2" />
              </div>
            )}
            {manualKey && (
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Manual entry key</Label>
                <div className="flex gap-2">
                  <Input value={manualKey} readOnly className="font-mono text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={copyKey} aria-label="Copy key">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="totp-code" className="text-xs text-slate-400">6-digit code</Label>
              <Input
                id="totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="tracking-[0.4em] text-center font-mono"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        )}

        {step === "done" && (
          <p className="text-sm text-teal-300 py-4 text-center">
            ✅ Two-factor authentication is now active on your account.
          </p>
        )}

        <DialogFooter>
          {step !== "done" ? (
            <>
              {!required && (
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleVerify} disabled={busy || code.length !== 6 || !secret}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & enable"}
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
