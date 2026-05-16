import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/config";

export const STRIPE_PUBLISHABLE_KEY =
  "pk_live_51Noq6hH59vC8GNiM618p3Fzfx0LaeTS6yYk08Li4d5owiTclq6iJ4OAdEl0sQdzdafXnRcEYePzplfy88sFVMmrx00dUk9Lr9N";

export const STRIPE_PRICES = {
  premium_plus_monthly: "price_1TUcqhH59vC8GNiM4RaOLvBv",
  premium_plus_annual: "price_1TUcrxH59vC8GNiMROfPP8aj",
  prestige_monthly: "price_1TUcxxH59vC8GNiMWqGvKENT",
  prestige_annual: "price_1TUd3KH59vC8GNiMijExGSTL",
} as const;

export type StripePriceKey = keyof typeof STRIPE_PRICES;

export async function startCheckout(priceKey: StripePriceKey, uid: string): Promise<void> {
  const functions = getFunctions(app);
  const createCheckoutSession = httpsCallable<
    { priceId: string; uid: string },
    { url: string; sessionId: string }
  >(functions, "createCheckoutSession");
  const res = await createCheckoutSession({ priceId: STRIPE_PRICES[priceKey], uid });
  if (res.data?.url) {
    window.location.href = res.data.url;
  } else {
    throw new Error("No checkout URL returned");
  }
}

export async function cancelSubscription(uid: string): Promise<void> {
  const functions = getFunctions(app);
  const cancelFn = httpsCallable<{ uid: string }, { success: boolean }>(
    functions,
    "cancelSubscription"
  );
  await cancelFn({ uid });
}

export async function downgradeSubscription(
  uid: string,
  targetPriceKey: StripePriceKey,
): Promise<{ effectiveAt: string | null; targetPlan: string }> {
  const functions = getFunctions(app);
  const fn = httpsCallable<
    { uid: string; targetPriceId: string },
    { ok: boolean; effectiveAt: string | null; targetPlan: string }
  >(functions, "downgradeSubscription");
  const res = await fn({ uid, targetPriceId: STRIPE_PRICES[targetPriceKey] });
  return { effectiveAt: res.data.effectiveAt, targetPlan: res.data.targetPlan };
}
