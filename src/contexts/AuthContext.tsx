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
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "@/firebase/config";

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
