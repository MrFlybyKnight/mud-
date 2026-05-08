import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/firebase/config";

export const STRIPE_PUBLISHABLE_KEY =
  "pk_test_51Noq6hH59vC8GNiMtpX0KifASuNT9oVMBfF3INtPnI8WJHp58hXj592FFFOS2hwkICsiE0J8bGP1oeBILGlhKOTm00KboyAVRQ";

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
