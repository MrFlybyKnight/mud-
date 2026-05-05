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
import { logger } from "firebase-functions/v2";

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
