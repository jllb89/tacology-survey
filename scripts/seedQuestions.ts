// scripts/seedQuestions.ts
// Run with: npx ts-node --project tsconfig.scripts.json scripts/seedQuestions.ts

const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

// Import your question exports
const {
  initialLocationQuestion,
  locationFollowUpQuestions,
  serviceQuestions,
  foodQuestions,
  salsaQuestions,
  brandValueQuestions,
} = require("../data/questions");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ← Add types here
async function seedCategory(
  collectionName: string,
  questions: Array<{ id: string; text: string; options?: string[] }>
): Promise<void> {
  const col = db.collection(collectionName);
  for (const q of questions) {
    await col.doc(q.id).set({
      text: q.text,
      options: q.options ?? [],
      responseTimestamps: [], // preserves your per-question metrics
    });
    console.log(`Seeded ${collectionName}/${q.id}`);
  }
}

async function main() {
  console.log("Starting Firestore seeding...");

  // 1️⃣ Venue questions: loc-1 plus all follow-ups
  await seedCategory(
    "locationQuestions",
    [initialLocationQuestion, ...locationFollowUpQuestions]
  );

  // 2️⃣ Service questions
  await seedCategory("serviceQuestions", serviceQuestions);

  // 3️⃣ Food questions
  await seedCategory("foodQuestions", foodQuestions);

  // 4️⃣ Salsa feedback questions (random-pick)
  await seedCategory("salsaQuestions", salsaQuestions);

  // 5️⃣ Brand-value questions (random-pick)
  await seedCategory("brandValueQuestions", brandValueQuestions);

  console.log("Seeding complete. Goodbye!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
