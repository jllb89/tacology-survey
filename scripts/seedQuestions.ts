// scripts/seedQuestions.ts

/**
 * Seed script to import survey questions into Firestore.
 * Run with:
 *   npx ts-node --project tsconfig.scripts.json scripts/seedQuestions.ts
 */

// Firebase Admin SDK (CommonJS require)
const admin = require("firebase-admin");
const path = require("path");

// Load service account key JSON (downloaded from Firebase Console)
const serviceAccount = require(path.join(__dirname, "../serviceAccountKey.json"));

// Question arrays imported from your data file
const {
  locationQuestions,
  serviceQuestions,
  foodQuestions,
} = require("../data/questions");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firestore database reference
const db = admin.firestore();

/**
 * Seed a Firestore collection with question documents.
 * @param {string} collectionName - The name of the Firestore collection.
 * @param {{ id: string; text: string; options?: string[] }[]} questions - Array of question objects.
 * @returns {Promise<void>}
 */
async function seedCategory(
  collectionName: string,
  questions: { id: string; text: string; options?: string[] }[]
): Promise<void> {
  const colRef = db.collection(collectionName);
  for (const q of questions) {
    await colRef.doc(q.id).set({
      text: q.text,
      options: q.options || [],
      responseTimestamps: [],
    });
    console.log(`Seeded ${collectionName}/${q.id}`);
  }
}

/**
 * Main entrypoint: seeds all question collections.
 */
async function main(): Promise<void> {
  console.log("Starting Firestore seeding...");
  await seedCategory("locationQuestions", locationQuestions);
  await seedCategory("serviceQuestions", serviceQuestions);
  await seedCategory("foodQuestions", foodQuestions);
  console.log("Seeding complete. Goodbye!");
  process.exit(0);
}

// Execute and handle errors
main().catch((err: unknown) => {
  console.error("Error during seeding:", err);
  process.exit(1);
});