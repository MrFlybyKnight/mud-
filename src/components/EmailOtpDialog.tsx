import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { requestEmailOtp, verifyEmailOtp } from "@/lib/mfa";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** True when the user must verify before continuing (Prestige). */
  required?: boolean;
  onVerified?: () => void;
}

export default function EmailOtpDialog({ open, onOpenChange, required, onVerified }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const sentRef = useRef(false);

  // Auto-send a code when the dialog opens.
  useEffect(() => {
    if (!open || !user) return;
    if (sentRef.current) return;
    sentRef.current = true;
    setError(null);
    setCode("");
    setSending(true);
    requestEmailOtp(user)
      .then(({ email }) => {
        setEmail(email);
        setResendIn(60);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not send code"))
      .finally(() => setSending(false));
  }, [open, user]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      sentRef.current = false;
      setCode("");
      setError(null);
      setResendIn(0);
    }
  }, [open]);

  // Resend countdown.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleResend = async () => {
    if (!user || resendIn > 0) return;
    setSending(true);
    setError(null);
    try {
      const { email } = await requestEmailOtp(user);
      setEmail(email);
      setResendIn(60);
      toast({ title: "New code sent" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!user || code.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyEmailOtp(user, code);
      toast({ title: "Verified", description: "Your device is now trusted." });
      onVerified?.();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid code");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && required) return;
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-400" />
            Verify it's you
          </DialogTitle>
          <DialogDescription>
            {email
              ? <>We sent a 6-digit code to <span className="font-medium text-slate-200">{email}</span>. Enter it below to continue.</>
              : <>Sending a 6-digit code to your email…</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1">
            <Label htmlFor="otp-code" className="text-xs text-slate-400">Verification code</Label>
            <Input
              id="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="tracking-[0.4em] text-center font-mono text-lg"
              autoFocus
            />
            <p className="text-[11px] text-slate-500 pt-1">
              Code expires in 10 minutes. 3 attempts allowed.
            </p>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleResend}
            disabled={sending || resendIn > 0}
            className="text-xs text-teal-300 disabled:text-slate-500 inline-flex items-center gap-1.5"
          >
            <Mail className="h-3.5 w-3.5" />
            {sending
              ? "Sending…"
              : resendIn > 0
                ? `Resend code in ${resendIn}s`
                : "Resend code"}
          </button>
        </div>

        <DialogFooter>
          {!required && (
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={verifying}>
              Cancel
            </Button>
          )}
          <Button onClick={handleVerify} disabled={verifying || code.length !== 6}>
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
