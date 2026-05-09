import {
  multiFactor,
  TotpMultiFactorGenerator,
  TotpSecret,
  getMultiFactorResolver,
  type MultiFactorResolver,
  type MultiFactorError,
  type User,
  type MultiFactorInfo,
} from "firebase/auth";
import { auth } from "@/firebase/config";

export const TOTP_ISSUER = "MūD";

/** Returns the list of enrolled MFA factors for the given user. */
export function getEnrolledFactors(user: User): MultiFactorInfo[] {
  try {
    return multiFactor(user).enrolledFactors;
  } catch {
    return [];
  }
}

/** True if the user has at least one TOTP factor enrolled. */
export function hasTotpEnrolled(user: User | null): boolean {
  if (!user) return false;
  return getEnrolledFactors(user).some(
    (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
}

export interface TotpEnrollmentStart {
  secret: TotpSecret;
  /** otpauth:// URL to encode into a QR code. */
  qrCodeUrl: string;
  /** Base32 secret key the user can type into their authenticator app. */
  manualKey: string;
}

/** Begin TOTP enrollment — returns the secret + provisioning URL. */
export async function startTotpEnrollment(user: User): Promise<TotpEnrollmentStart> {
  const session = await multiFactor(user).getSession();
  const secret = await TotpMultiFactorGenerator.generateSecret(session);
  const accountName = user.email ?? user.displayName ?? user.uid;
  const qrCodeUrl = secret.generateQrCodeUrl(accountName, TOTP_ISSUER);
  return { secret, qrCodeUrl, manualKey: secret.secretKey };
}

/** Finish TOTP enrollment by verifying a one-time code from the user's app. */
export async function finalizeTotpEnrollment(
  user: User,
  secret: TotpSecret,
  oneTimeCode: string,
  displayName = "Authenticator app"
): Promise<void> {
  const assertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, oneTimeCode.trim());
  await multiFactor(user).enroll(assertion, displayName);
}

/** Remove a TOTP factor by its uid (or the first TOTP factor if uid omitted). */
export async function unenrollTotp(user: User, factorUid?: string): Promise<void> {
  const mf = multiFactor(user);
  const target =
    factorUid ??
    mf.enrolledFactors.find((f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID)?.uid;
  if (!target) return;
  await mf.unenroll(target);
}

/* ----- Sign-in challenge handling ----- */

export function isMfaRequiredError(err: unknown): err is MultiFactorError {
  return (err as { code?: string })?.code === "auth/multi-factor-auth-required";
}

export function getResolver(err: MultiFactorError): MultiFactorResolver {
  return getMultiFactorResolver(auth, err);
}

/** Complete a TOTP-protected sign-in using a code from the user's app. */
export async function resolveSignInWithTotp(
  resolver: MultiFactorResolver,
  oneTimeCode: string
) {
  const totpHint = resolver.hints.find(
    (h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID
  );
  if (!totpHint) {
    throw new Error("No TOTP factor available on this account.");
  }
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(
    totpHint.uid,
    oneTimeCode.trim()
  );
  return resolver.resolveSignIn(assertion);
}
