import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "./config";
import {
  collectionPaths,
  defaultUserSettings,
  type UserProfile,
  type UserSettings,
  type VoiceSession,
  type WatchMetric,
} from "./schema";

// -----------------------------
// Users
// -----------------------------
export async function upsertUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, "uid" | "createdAt" | "updatedAt">>
): Promise<void> {
  const ref = doc(db, collectionPaths.user(uid));
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, { ...data, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, {
      uid,
      email: null,
      displayName: null,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, collectionPaths.user(uid)));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

// -----------------------------
// Watch metrics
// -----------------------------
export async function addWatchMetric(
  uid: string,
  metric: Omit<WatchMetric, "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, collectionPaths.watchMetrics(uid)), {
    ...metric,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listWatchMetrics(
  uid: string,
  options: { limit?: number; since?: Date } = {}
): Promise<Array<WatchMetric & { id: string }>> {
  const constraints: QueryConstraint[] = [orderBy("recordedAt", "desc")];
  if (options.since) {
    constraints.push(where("recordedAt", ">=", Timestamp.fromDate(options.since)));
  }
  if (options.limit) constraints.push(fsLimit(options.limit));
  const snap = await getDocs(
    query(collection(db, collectionPaths.watchMetrics(uid)), ...constraints)
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as WatchMetric) }));
}

// -----------------------------
// Voice sessions
// -----------------------------
export async function startVoiceSession(
  uid: string,
  initial: Partial<VoiceSession> = {}
): Promise<string> {
  const ref = await addDoc(collection(db, collectionPaths.voiceSessions(uid)), {
    status: "active",
    startedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...initial,
  } satisfies DocumentData);
  return ref.id;
}

export async function updateVoiceSession(
  uid: string,
  sessionId: string,
  data: Partial<VoiceSession>
): Promise<void> {
  await updateDoc(doc(db, collectionPaths.voiceSession(uid, sessionId)), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function endVoiceSession(
  uid: string,
  sessionId: string,
  data: Partial<VoiceSession> = {}
): Promise<void> {
  await updateDoc(doc(db, collectionPaths.voiceSession(uid, sessionId)), {
    status: "completed",
    endedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...data,
  });
}

export async function listVoiceSessions(
  uid: string,
  options: { limit?: number } = {}
): Promise<Array<VoiceSession & { id: string }>> {
  const constraints: QueryConstraint[] = [orderBy("startedAt", "desc")];
  if (options.limit) constraints.push(fsLimit(options.limit));
  const snap = await getDocs(
    query(collection(db, collectionPaths.voiceSessions(uid)), ...constraints)
  );
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as VoiceSession) }));
}

// -----------------------------
// Settings
// -----------------------------
export async function getUserSettings(uid: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db, collectionPaths.appSettings(uid)));
  return snap.exists() ? (snap.data() as UserSettings) : null;
}

export async function ensureUserSettings(uid: string): Promise<UserSettings> {
  const ref = doc(db, collectionPaths.appSettings(uid));
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data() as UserSettings;
  const defaults = defaultUserSettings(Timestamp.now());
  await setDoc(ref, defaults);
  return defaults;
}

export async function updateUserSettings(
  uid: string,
  patch: Partial<UserSettings>
): Promise<void> {
  await setDoc(
    doc(db, collectionPaths.appSettings(uid)),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
