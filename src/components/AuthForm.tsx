import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Mode = "signin" | "signup" | "reset";

export default function AuthForm() {
  const { user, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, logout } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail("");
      setPassword("");
      setDisplayName("");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
        toast({ title: "Signed in" });
      } else if (mode === "signup") {
        await signUpWithEmail(email, password, displayName || undefined);
        toast({ title: "Account created" });
      } else {
        await resetPassword(email);
        toast({ title: "Password reset email sent" });
      }
    } catch (err) {
      toast({
        title: "Authentication error",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  if (user) {
    return (
      <Card className="max-w-sm w-full">
        <CardHeader>
          <CardTitle>Signed in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {user.displayName ?? user.email}
          </p>
          <p className="text-xs text-muted-foreground break-all">uid: {user.uid}</p>
          <Button variant="outline" onClick={() => logout()}>
            Log out
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-sm w-full">
      <CardHeader>
        <CardTitle>
          {mode === "signin" && "Sign in"}
          {mode === "signup" && "Create account"}
          {mode === "reset" && "Reset password"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <div className="space-y-1">
              <Label htmlFor="name">Display name</Label>
              <Input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {mode !== "reset" && (
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {mode === "signin" && "Sign in"}
            {mode === "signup" && "Sign up"}
            {mode === "reset" && "Send reset email"}
          </Button>
          {mode !== "reset" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await signInWithGoogle();
                } catch (err) {
                  toast({
                    title: "Google sign-in failed",
                    description: err instanceof Error ? err.message : String(err),
                    variant: "destructive",
                  });
                } finally {
                  setBusy(false);
                }
              }}
            >
              Continue with Google
            </Button>
          )}
          <div className="flex justify-between text-xs text-muted-foreground pt-2">
            {mode !== "signin" && (
              <button type="button" onClick={() => setMode("signin")}>Sign in</button>
            )}
            {mode !== "signup" && (
              <button type="button" onClick={() => setMode("signup")}>Create account</button>
            )}
            {mode !== "reset" && (
              <button type="button" onClick={() => setMode("reset")}>Forgot password?</button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
