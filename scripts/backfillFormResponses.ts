#!/usr/bin/env ts-node
// scripts/backfillFormResponses.ts

// 1️⃣ Use require() so the JSON comes in as `any`
import admin from "firebase-admin";
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  console.log("🔄 Backfilling formResponses...");
  const snap = await db.collection("formResponses").get();
  for (const doc of snap.docs) {
    const data = doc.data();
    const updates: any = {};

    if (data.completed !== true) {
      updates.completed = true;
    }
    if (!data.createdAt) {
      updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      console.log(`  ✔️  Updated ${doc.id}`);
    }
  }
  console.log("✅ Backfill complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
