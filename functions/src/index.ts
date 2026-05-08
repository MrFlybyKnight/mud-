/**
 * Firebase Cloud Functions — rolling aggregation cleanup.
 *
 * Deploy with: cd functions && npm install && npm run deploy
 *
 * Schedules:
 *   - cleanupSubchecks: every 20 minutes, deletes subchecks older than 40 minutes.
 *   - cleanupCheckpoints: every hour, deletes checkpoints older than 25 hours.
 *
 * Runs server-side so cleanup happens even when the client app is closed.
 */
import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";
import Stripe from "stripe";

admin.initializeApp();
const db = admin.firestore();

const MS_PER_MIN = 60 * 1000;

async function deleteOlderThan(
  subcollection: "subchecks" | "checkpoints",
  cutoff: Date,
): Promise<number> {
  let totalDeleted = 0;
  const usersSnap = await db.collection("users").get();
  for (const userDoc of usersSnap.docs) {
    const oldDocs = await userDoc.ref
      .collection(subcollection)
      .where("timestamp", "<", admin.firestore.Timestamp.fromDate(cutoff))
      .get();
    if (oldDocs.empty) continue;
    const batch = db.batch();
    oldDocs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += oldDocs.size;
  }
  return totalDeleted;
}

export const cleanupSubchecks = onSchedule("every 20 minutes", async () => {
  const cutoff = new Date(Date.now() - 40 * MS_PER_MIN);
  const deleted = await deleteOlderThan("subchecks", cutoff);
  logger.info(`[cleanupSubchecks] deleted ${deleted} docs older than ${cutoff.toISOString()}`);
});

export const cleanupCheckpoints = onSchedule("every 60 minutes", async () => {
  const cutoff = new Date(Date.now() - 25 * 60 * MS_PER_MIN);
  const deleted = await deleteOlderThan("checkpoints", cutoff);
  logger.info(`[cleanupCheckpoints] deleted ${deleted} docs older than ${cutoff.toISOString()}`);
});

// ============= Stripe Payments =============

const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");

const APP_URL = "https://7c85c1a9-4312-4a2a-b551-8aca3608b109.lovableproject.com";

// Map Stripe price IDs -> plan tier. Configure these to your real price IDs.
const PRICE_TO_PLAN: Record<string, "premium_plus" | "prestige"> = {
  "price_1TUcqhH59vC8GNiM4RaOLvBv": "premium_plus", // Premium Plus Monthly
  "price_1TUcrxH59vC8GNiMROfPP8aj": "premium_plus", // Premium Plus Annual
  "price_1TUcxxH59vC8GNiMWqGvKENT": "prestige",     // Prestige Monthly
  "price_1TUd3KH59vC8GNiMijExGSTL": "prestige",     // Prestige Annual
};

function stripeClient(): Stripe {
  return new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: "2024-06-20" });
}

async function writeSubscription(
  uid: string,
  data: {
    plan: "free" | "premium_plus" | "prestige";
    status: "active" | "cancelled" | "expired";
    renewsAt?: Date | null;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string | null;
  },
): Promise<void> {
  const ref = db.collection("users").doc(uid).collection("subscription").doc("current");
  const payload: Record<string, unknown> = {
    plan: data.plan,
    status: data.status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if (data.renewsAt !== undefined) {
    payload.renewsAt = data.renewsAt
      ? admin.firestore.Timestamp.fromDate(data.renewsAt)
      : null;
  }
  if (data.stripeCustomerId) payload.stripeCustomerId = data.stripeCustomerId;
  if (data.stripeSubscriptionId !== undefined) {
    payload.stripeSubscriptionId = data.stripeSubscriptionId;
  }
  await ref.set(payload, { merge: true });
}

export const createCheckoutSession = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const { priceId, uid } = (request.data ?? {}) as { priceId?: string; uid?: string };
    if (!priceId || !uid) {
      throw new HttpsError("invalid-argument", "priceId and uid are required");
    }
    if (request.auth && request.auth.uid !== uid) {
      throw new HttpsError("permission-denied", "uid mismatch");
    }

    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${APP_URL}?payment=success`,
      cancel_url: `${APP_URL}?payment=cancelled`,
      client_reference_id: uid,
      metadata: { uid, priceId },
      subscription_data: { metadata: { uid, priceId } },
    });

    return { url: session.url, sessionId: session.id };
  },
);

export const stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] },
  async (req, res) => {
    const stripe = stripeClient();
    const sig = req.headers["stripe-signature"] as string | undefined;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        (req as unknown as { rawBody: Buffer }).rawBody,
        sig ?? "",
        STRIPE_WEBHOOK_SECRET.value(),
      );
    } catch (err) {
      logger.error("[stripeWebhook] signature verification failed", err);
      res.status(400).send(`Webhook Error: ${(err as Error).message}`);
      return;
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const uid =
            (session.metadata?.uid as string | undefined) ??
            (session.client_reference_id ?? undefined);
          const priceId = session.metadata?.priceId as string | undefined;
          if (!uid) {
            logger.warn("[stripeWebhook] checkout.session.completed missing uid", session.id);
            break;
          }
          let plan: "premium_plus" | "prestige" =
            (priceId && PRICE_TO_PLAN[priceId]) || "premium_plus";

          let renewsAt: Date | null = null;
          let subscriptionId: string | null = null;
          if (session.subscription) {
            subscriptionId =
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription.id;
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            renewsAt = new Date(sub.current_period_end * 1000);
            const subPriceId = sub.items.data[0]?.price.id;
            if (subPriceId && PRICE_TO_PLAN[subPriceId]) {
              plan = PRICE_TO_PLAN[subPriceId];
            }
          }

          await writeSubscription(uid, {
            plan,
            status: "active",
            renewsAt,
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id,
            stripeSubscriptionId: subscriptionId,
          });
          break;
        }
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const uid = sub.metadata?.uid as string | undefined;
          if (!uid) {
            logger.warn("[stripeWebhook] subscription.deleted missing uid", sub.id);
            break;
          }
          await writeSubscription(uid, {
            plan: "free",
            status: "cancelled",
            renewsAt: null,
            stripeSubscriptionId: null,
          });
          break;
        }
        default:
          logger.info(`[stripeWebhook] unhandled event ${event.type}`);
      }
      res.json({ received: true });
    } catch (err) {
      logger.error("[stripeWebhook] handler error", err);
      res.status(500).send("Webhook handler failed");
    }
  },
);

export const cancelSubscription = onCall(
  { secrets: [STRIPE_SECRET_KEY] },
  async (request) => {
    const { uid } = (request.data ?? {}) as { uid?: string };
    if (!uid) throw new HttpsError("invalid-argument", "uid is required");
    if (request.auth && request.auth.uid !== uid) {
      throw new HttpsError("permission-denied", "uid mismatch");
    }

    const ref = db.collection("users").doc(uid).collection("subscription").doc("current");
    const snap = await ref.get();
    const subId = snap.get("stripeSubscriptionId") as string | undefined;

    if (subId) {
      const stripe = stripeClient();
      try {
        await stripe.subscriptions.cancel(subId);
      } catch (err) {
        logger.error("[cancelSubscription] stripe cancel failed", err);
      }
    }

    await writeSubscription(uid, {
      plan: "free",
      status: "cancelled",
      renewsAt: null,
      stripeSubscriptionId: null,
    });

    return { ok: true };
  },
);
