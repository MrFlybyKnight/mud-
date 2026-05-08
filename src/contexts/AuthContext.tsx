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
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
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
