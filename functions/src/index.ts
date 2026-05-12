/**
 * Firebase Cloud Functions — rolling aggregation cleanup, Stripe, AssemblyAI,
 * and Email-OTP MFA.
 *
 * Deploy with: cd functions && npm install && npm run deploy
 */
import * as admin from "firebase-admin";
import * as crypto from "crypto";
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

const APP_URL = "https://mudring.one";

const PRICE_TO_PLAN: Record<string, "premium_plus" | "prestige"> = {
  "price_1TUcqhH59vC8GNiM4RaOLvBv": "premium_plus",
  "price_1TUcrxH59vC8GNiMROfPP8aj": "premium_plus",
  "price_1TUcxxH59vC8GNiMWqGvKENT": "prestige",
  "price_1TUd3KH59vC8GNiMijExGSTL": "prestige",
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

// ============= AssemblyAI Streaming Token =============

const ASSEMBLYAI_API_KEY = defineSecret("ASSEMBLYAI_API_KEY");

export const getAssemblyAIToken = onCall(
  { secrets: [ASSEMBLYAI_API_KEY] },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }

    const expiresInSeconds = 60;
    const url = `https://streaming.assemblyai.com/v3/token?expires_in_seconds=${expiresInSeconds}`;

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { authorization: ASSEMBLYAI_API_KEY.value() },
      });
      if (!res.ok) {
        const body = await res.text();
        logger.error("[getAssemblyAIToken] AssemblyAI error", res.status, body);
        throw new HttpsError("internal", `AssemblyAI ${res.status}`);
      }
      const data = (await res.json()) as { token: string };
      return { token: data.token, expiresInSeconds };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("[getAssemblyAIToken] failed", err);
      throw new HttpsError("internal", "Failed to mint AssemblyAI token");
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

// ============= Email OTP MFA =============
//
// Sends a 6-digit verification code to the signed-in user's email.
// Email delivery is handled by the Firebase "Trigger Email" extension —
// this function just enqueues a document in the `mail` collection.
//
// Storage:
//   emailOtps/{uid}                — codeHash, expiresAt, attempts, lockedUntl, email
//   users/{uid}/mfaDevices/{devId} — verifiedAt timestamp for remembered devices
//
// Rules:
//   - Code expires in 10 minutes.
//   - 3 attempts before locking the account-MFA flow for 30 minutes.
//   - Premium Plus: device remembered indefinitely once verified.
//   - Prestige: device remembered for 7 days.

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;
const OTP_LOCK_MS = 30 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

function hashCode(code: string, uid: string): string {
  return crypto.createHash("sha256").update(`${uid}:${code}`).digest("hex");
}

function generateCode(): string {
  // Cryptographically random 6 digits, zero-padded.
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

function otpEmailHtml(code: string, appName = "MūD"): string {
  return `
    <div style="font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 12px; font-size: 20px;">${appName} verification code</h1>
      <p style="margin: 0 0 16px; color: #334155;">Use the code below to finish signing in. It expires in 10 minutes.</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 8px; padding: 16px 24px; background: #f1f5f9; border-radius: 12px; text-align: center;">${code}</div>
      <p style="margin: 16px 0 0; color: #64748b; font-size: 12px;">If you didn't try to sign in, you can ignore this email.</p>
    </div>
  `;
}

export const requestEmailOtp = onCall(async (request) => {
  const auth = request.auth;
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Sign-in required");
  const email = (auth.token.email as string | undefined) ?? null;
  if (!email) throw new HttpsError("failed-precondition", "Account has no email address");

  const uid = auth.uid;
  const now = Date.now();
  const otpRef = db.collection("emailOtps").doc(uid);
  const existing = await otpRef.get();
  if (existing.exists) {
    const data = existing.data() as { lockedUntil?: number; lastSentAt?: number };
    if (data.lockedUntil && data.lockedUntil > now) {
      throw new HttpsError(
        "resource-exhausted",
        `Too many attempts. Try again in ${Math.ceil((data.lockedUntil - now) / 60000)} minutes.`,
      );
    }
    if (data.lastSentAt && now - data.lastSentAt < OTP_RESEND_COOLDOWN_MS) {
      throw new HttpsError(
        "resource-exhausted",
        `Please wait ${Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - data.lastSentAt)) / 1000)}s before requesting another code.`,
      );
    }
  }

  const code = generateCode();
  await otpRef.set({
    email,
    codeHash: hashCode(code, uid),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lockedUntil: 0,
    lastSentAt: now,
  });

  // Enqueue for the Firebase "Trigger Email" extension.
  await db.collection("mail").add({
    to: [email],
    message: {
      subject: "Your MūD verification code",
      html: otpEmailHtml(code),
      text: `Your MūD verification code is ${code}. It expires in 10 minutes.`,
    },
  });

  logger.info(`[requestEmailOtp] sent OTP to ${uid}`);
  return { ok: true, email };
});

export const verifyEmailOtp = onCall(async (request) => {
  const auth = request.auth;
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Sign-in required");
  const uid = auth.uid;
  const { code, deviceId } = (request.data ?? {}) as { code?: string; deviceId?: string };
  if (!code || !/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "6-digit code required");
  }
  if (!deviceId || typeof deviceId !== "string" || deviceId.length < 8) {
    throw new HttpsError("invalid-argument", "deviceId required");
  }

  const otpRef = db.collection("emailOtps").doc(uid);
  const snap = await otpRef.get();
  if (!snap.exists) throw new HttpsError("failed-precondition", "Request a code first");
  const data = snap.data() as {
    codeHash: string;
    expiresAt: number;
    attempts: number;
    lockedUntil: number;
  };
  const now = Date.now();
  if (data.lockedUntil && data.lockedUntil > now) {
    throw new HttpsError(
      "resource-exhausted",
      `Locked. Try again in ${Math.ceil((data.lockedUntil - now) / 60000)} minutes.`,
    );
  }
  if (now > data.expiresAt) {
    await otpRef.delete();
    throw new HttpsError("deadline-exceeded", "Code expired. Request a new one.");
  }

  const matches = hashCode(code, uid) === data.codeHash;
  if (!matches) {
    const attempts = (data.attempts ?? 0) + 1;
    const remaining = OTP_MAX_ATTEMPTS - attempts;
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await otpRef.update({ attempts, lockedUntil: now + OTP_LOCK_MS });
      throw new HttpsError("resource-exhausted", "Too many attempts. Locked for 30 minutes.");
    }
    await otpRef.update({ attempts });
    throw new HttpsError("invalid-argument", `Incorrect code. ${remaining} attempt(s) left.`);
  }

  // Success — store remembered-device record and clear OTP.
  await db
    .collection("users").doc(uid)
    .collection("mfaDevices").doc(deviceId)
    .set({
      verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      userAgent: (request.rawRequest.headers["user-agent"] as string | undefined) ?? null,
    });
  await otpRef.delete();
  logger.info(`[verifyEmailOtp] success for ${uid} device ${deviceId.slice(0, 6)}…`);
  return { ok: true };
});

export const forgetMfaDevice = onCall(async (request) => {
  const auth = request.auth;
  if (!auth?.uid) throw new HttpsError("unauthenticated", "Sign-in required");
  const { deviceId } = (request.data ?? {}) as { deviceId?: string };
  if (!deviceId) throw new HttpsError("invalid-argument", "deviceId required");
  await db.collection("users").doc(auth.uid).collection("mfaDevices").doc(deviceId).delete();
  return { ok: true };
});
