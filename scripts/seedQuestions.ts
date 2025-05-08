// scripts/seedQuestions.ts
// Run with: npx ts-node --project tsconfig.scripts.json scripts/seedQuestions.ts

// Use CommonJS requires so ts-node will load this without fuss
const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

// Import your new question exports
const {
  initialLocationQuestion,
  locationFollowUpQuestions,
  serviceQuestions,
  foodQuestions,
} = require("../data/questions");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seedCategory(collectionName: string, questions: any[]) {
  const col = db.collection(collectionName);
  for (const q of questions) {
    await col.doc(q.id).set({
      text: q.text,
      options: q.options ?? [],
      responseTimestamps: [],       // preserves your per-question metrics
    });
    console.log(`Seeded ${collectionName}/${q.id}`);
  }
}

async function main() {
  console.log("Starting Firestore seeding...");

  // 1️⃣ Venue questions: loc-1 plus the follow-ups
  await seedCategory("locationQuestions", [
    initialLocationQuestion,
    ...locationFollowUpQuestions,
  ]);

  // 2️⃣ Service questions
  await seedCategory("serviceQuestions", serviceQuestions);

  // 3️⃣ Food questions
  await seedCategory("foodQuestions", foodQuestions);

  console.log("Seeding complete. Goodbye!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});
