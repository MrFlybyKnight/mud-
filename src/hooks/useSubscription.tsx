import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { doc, onSnapshot, serverTimestamp, setDoc, Timestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionPlan = "free" | "premium_plus" | "prestige";
export type SubscriptionStatus = "active" | "cancelled" | "expired";

export interface SubscriptionDoc {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewsAt: Timestamp | null;
  updatedAt?: Timestamp;
  pendingPlan?: SubscriptionPlan | null;
  pendingPriceId?: string | null;
  pendingEffectiveAt?: Timestamp | null;
}

export type GatedFeature =
  | "assemblyAI"
  | "fullEmotionTranche"
  | "historyFull"
  | "trustedCircleFull"
  | "loquacityNotifications"
  | "contextSuggestions"
  | "familyPlan"
  | "exportData";

/** Features available per plan. Premium Plus and Prestige unlock all gated features. */
const PLAN_FEATURES: Record<SubscriptionPlan, ReadonlySet<GatedFeature>> = {
  free: new Set<GatedFeature>(),
  premium_plus: new Set<GatedFeature>([
    "assemblyAI",
    "fullEmotionTranche",
    "historyFull",
    "trustedCircleFull",
    "loquacityNotifications",
    "contextSuggestions",
    "familyPlan",
    "exportData",
  ]),
  prestige: new Set<GatedFeature>([
    "assemblyAI",
    "fullEmotionTranche",
    "historyFull",
    "trustedCircleFull",
    "loquacityNotifications",
    "contextSuggestions",
    "familyPlan",
    "exportData",
  ]),
};

export const subscriptionDocPath = (uid: string) => `users/${uid}/subscription/current`;

interface SubscriptionContextValue {
  subscription: SubscriptionDoc | null;
  loading: boolean;
  hasFeature: (feature: GatedFeature) => boolean;
  requireFeature: (feature: GatedFeature) => boolean;
  upgradeFeature: GatedFeature | null;
  showUpgrade: (feature: GatedFeature) => void;
  closeUpgrade: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

const SUBSCRIPTION_CACHE_KEY = (uid: string) => `mud:subscription:${uid}`;

const FREE_DEFAULT: SubscriptionDoc = {
  plan: "free",
  status: "active",
  renewsAt: null,
};

const readCachedSubscription = (uid: string | null): SubscriptionDoc => {
  if (!uid || typeof window === "undefined") return FREE_DEFAULT;
  try {
    const raw = window.localStorage.getItem(SUBSCRIPTION_CACHE_KEY(uid));
    if (!raw) return FREE_DEFAULT;
    const parsed = JSON.parse(raw) as SubscriptionDoc;
    return parsed?.plan ? parsed : FREE_DEFAULT;
  } catch {
    return FREE_DEFAULT;
  }
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { uid } = useAuth();
  // Start with a synchronous default (cached or free) so consumers never wait.
  const [subscription, setSubscription] = useState<SubscriptionDoc>(() => readCachedSubscription(uid));
  const [upgradeFeature, setUpgradeFeature] = useState<GatedFeature | null>(null);
  // `loading` is kept for API compatibility but is always false — UI renders immediately.
  const loading = false;

  useEffect(() => {
    if (!uid) {
      setSubscription(FREE_DEFAULT);
      return;
    }
    // Hydrate immediately from cache, then update in the background from Firestore.
    setSubscription(readCachedSubscription(uid));

    const ref = doc(db, subscriptionDocPath(uid));
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          const data = snap.data() as SubscriptionDoc;
          setSubscription(data);
          try {
            window.localStorage.setItem(SUBSCRIPTION_CACHE_KEY(uid), JSON.stringify(data));
          } catch {
            /* ignore quota errors */
          }
        } else {
          setSubscription(FREE_DEFAULT);
          try {
            await setDoc(ref, { ...FREE_DEFAULT, updatedAt: serverTimestamp() });
          } catch (err) {
            console.warn("[subscription] failed to seed free plan", err);
          }
        }
      },
      (err) => {
        console.error("[subscription] snapshot error — keeping cached/free tier", err);
      }
    );
    return () => unsub();
  }, [uid]);

  const hasFeature = useCallback(
    (feature: GatedFeature) => {
      // While the subscription doc is still loading, don't gate — we don't
      // know the user's plan yet. Returning false here would briefly lock
      // paying users out of their features on every mount.
      if (loading) return true;
      const plan: SubscriptionPlan = subscription?.plan ?? "free";
      const featureSet = PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
      return featureSet.has(feature);
    },
    [subscription, loading]
  );

  const showUpgrade = useCallback((feature: GatedFeature) => {
    setUpgradeFeature(feature);
  }, []);

  const closeUpgrade = useCallback(() => setUpgradeFeature(null), []);

  const requireFeature = useCallback(
    (feature: GatedFeature) => {
      // Optimistically allow access while loading to avoid a flash of the
      // upgrade modal for premium users on app start.
      if (loading) return true;
      if (hasFeature(feature)) return true;
      setUpgradeFeature(feature);
      return false;
    },
    [hasFeature, loading]
  );

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      subscription,
      loading,
      hasFeature,
      requireFeature,
      upgradeFeature,
      showUpgrade,
      closeUpgrade,
    }),
    [subscription, loading, hasFeature, requireFeature, upgradeFeature, showUpgrade, closeUpgrade]
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within a SubscriptionProvider");
  return ctx;
}

export const FEATURE_LABELS: Record<GatedFeature, { title: string; benefit: string }> = {
  assemblyAI: {
    title: "Advanced speech analysis",
    benefit: "Unlock AssemblyAI-powered tone, sentiment and conversational insights.",
  },
  fullEmotionTranche: {
    title: "All 16 emotions",
    benefit: "Detect the full emotional spectrum, not just core states.",
  },
  historyFull: {
    title: "Unlimited history",
    benefit: "Look back beyond 7 days and spot long-term patterns.",
  },
  trustedCircleFull: {
    title: "Full Trusted Circle",
    benefit: "Add unlimited contacts to your support network.",
  },
  loquacityNotifications: {
    title: "Loquacity notifications",
    benefit: "Get nudges when your speech patterns drift from baseline.",
  },
  contextSuggestions: {
    title: "Context-aware suggestions",
    benefit: "Smart, situation-aware coaching tips throughout your day.",
  },
  familyPlan: {
    title: "Family plan",
    benefit: "Share MūD with people you care about under one plan.",
  },
  exportData: {
    title: "Export your data",
    benefit: "Download your full history as CSV or JSON anytime.",
  },
};
