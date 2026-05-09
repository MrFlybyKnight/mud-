/**
 * Email-OTP Multi-Factor Authentication.
 *
 * Replaces the previous TOTP/QR implementation. After successful Firebase
 * sign-in, a 6-digit code is sent to the user's registered email via the
 * `requestEmailOtp` Cloud Function (which enqueues to the "Trigger Email"
 * extension). Verification, attempt-counting, and lock-out are enforced
 * server-side by `verifyEmailOtp`.
 *
 * Remembered devices:
 *   - Premium Plus: indefinite once verified.
 *   - Prestige:     re-verify every 7 days.
 */
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { app, db } from "@/firebase/config";
import type { User } from "firebase/auth";
import type { SubscriptionPlan } from "@/hooks/useSubscription";

const fns = getFunctions(app);
const callRequest = httpsCallable(fns, "requestEmailOtp");
const callVerify = httpsCallable(fns, "verifyEmailOtp");
const callForget = httpsCallable(fns, "forgetMfaDevice");

const PRESTIGE_REVERIFY_MS = 7 * 24 * 60 * 60 * 1000;

const deviceKey = (uid: string) => `mud:mfa-device:${uid}`;

/** Get (or lazily create) a stable random device id for this browser+user. */
export function getDeviceId(uid: string): string {
  try {
    let id = window.localStorage.getItem(deviceKey(uid));
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(deviceKey(uid), id);
    }
    return id;
  } catch {
    return "no-storage-" + Math.random().toString(36).slice(2);
  }
}

export function forgetLocalDevice(uid: string): void {
  try { window.localStorage.removeItem(deviceKey(uid)); } catch { /* ignore */ }
}

/** Send a fresh OTP to the user's email. */
export async function requestEmailOtp(_user: User): Promise<{ email: string }> {
  const res = await callRequest({});
  return res.data as { email: string };
}

/** Verify a 6-digit code; on success the device is remembered server-side. */
export async function verifyEmailOtp(user: User, code: string): Promise<void> {
  const deviceId = getDeviceId(user.uid);
  await callVerify({ code: code.trim(), deviceId });
}

/** Forget this device (forces re-verification on next sign-in). */
export async function forgetThisDevice(user: User): Promise<void> {
  const deviceId = getDeviceId(user.uid);
  try { await callForget({ deviceId }); } catch { /* ignore */ }
  forgetLocalDevice(user.uid);
}

/**
 * Returns true if the current device has a valid remembered-MFA record
 * for the user's plan. Free users are never gated (returns true).
 */
export async function isDeviceRemembered(user: User, plan: SubscriptionPlan): Promise<boolean> {
  if (plan === "free") return true;
  const deviceId = getDeviceId(user.uid);
  try {
    const snap = await getDoc(doc(db, "users", user.uid, "mfaDevices", deviceId));
    if (!snap.exists()) return false;
    const verifiedAt = snap.get("verifiedAt") as Timestamp | undefined;
    if (!verifiedAt) return false;
    if (plan === "prestige") {
      return Date.now() - verifiedAt.toMillis() < PRESTIGE_REVERIFY_MS;
    }
    // premium_plus: indefinite
    return true;
  } catch (err) {
    console.error("[mfa] isDeviceRemembered failed", err);
    return false;
  }
}
