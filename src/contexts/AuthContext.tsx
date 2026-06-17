import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

/**
 * Native bridge exposed by the Android WebView host (MūD mobile app).
 * When present, Google Sign-In is delegated to the native layer which
 * dispatches a `mud:nativeAuth` window event carrying a Firebase ID token.
 */
interface NativeAuthBridge {
  signInWithGoogle: () => void;
}
declare global {
  interface Window {
    NativeAuthBridge?: NativeAuthBridge;
  }
  interface WindowEventMap {
    "mud:nativeAuth": CustomEvent<{ idToken: string }>;
  }
}
import { auth } from "@/firebase/config";

/**
 * Network/auth errors that indicate the refresh endpoint is unreachable
 * (e.g. ERR_NAME_NOT_RESOLVED on securetoken.googleapis.com in sandboxed
 * preview environments) vs. errors that mean the session is truly invalid.
 */
const NETWORK_ERROR_CODES = new Set([
  "auth/network-request-failed",
  "auth/timeout",
  "auth/internal-error",
]);

const INVALID_SESSION_CODES = new Set([
  "auth/user-token-expired",
  "auth/user-disabled",
  "auth/user-not-found",
  "auth/invalid-user-token",
  "auth/requires-recent-login",
  "auth/id-token-expired",
  "auth/id-token-revoked",
]);

interface AuthContextValue {
  user: User | null;
  uid: string | null;
  loading: boolean;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<User>;
  signInWithEmail: (email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type PendingNativeAuth = {
  resolve: (user: User) => void;
  reject: (err: unknown) => void;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    // Token refresh listener: fires when ID token changes OR fails to refresh.
    const unsubToken = onIdTokenChanged(auth, async (u) => {
      if (!u) return;
      try {
        // Force a refresh to detect expired/revoked tokens early.
        await u.getIdToken(false);
      } catch (err: unknown) {
        const code = (err as { code?: string })?.code ?? "";
        console.warn("[Auth] token refresh failed", code, err);

        if (NETWORK_ERROR_CODES.has(code)) {
          // Transient — keep the user signed in; Firebase SDK will retry.
          // Schedule a retry attempt shortly.
          setTimeout(() => {
            u.getIdToken(true).catch((e) =>
              console.warn("[Auth] retry refresh failed", e)
            );
          }, 5000);
          return;
        }

        if (INVALID_SESSION_CODES.has(code)) {
          // Session is genuinely invalid — sign out cleanly so UI returns to login.
          try {
            await signOut(auth);
          } catch (e) {
            console.warn("[Auth] forced signOut failed", e);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Unknown error: try one forced refresh; if still failing, sign out.
        try {
          await u.getIdToken(true);
        } catch {
          try {
            await signOut(auth);
          } catch {
            setUser(null);
            setLoading(false);
          }
        }
      }
    });

    // Periodic background check (every 10 min) to surface refresh failures
    // before the next Firestore read does.
    const interval = window.setInterval(() => {
      const current = auth.currentUser;
      if (!current) return;
      current.getIdToken(false).catch((err) => {
        console.warn("[Auth] periodic token check failed", err);
      });
    }, 10 * 60 * 1000);

    return () => {
      unsubAuth();
      unsubToken();
      window.clearInterval(interval);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      uid: user?.uid ?? null,
      loading,
      async signUpWithEmail(email, password, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await updateProfile(cred.user, { displayName });
        }
        return cred.user;
      },
      async signInWithEmail(email, password) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return cred.user;
      },
      async signInWithGoogle() {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        return cred.user;
      },
      async resetPassword(email) {
        await sendPasswordResetEmail(auth, email);
      },
      async logout() {
        await signOut(auth);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/**
 * Returns the current user's uid or throws if not authenticated.
 * Use inside Firestore read/write helpers that require auth.
 */
export function useRequiredUid(): string {
  const { uid, loading } = useAuth();
  if (loading) throw new Error("Auth still loading");
  if (!uid) throw new Error("User is not authenticated");
  return uid;
}
