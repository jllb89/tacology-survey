// scripts/exportFormResponses.ts
import admin from "firebase-admin";
import { parse as json2csv } from "json2csv";
import * as XLSX from "xlsx";
import * as fs from "fs";
import serviceAccount from "../serviceAccountKey.json";

// 1️⃣ Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
});
const db = admin.firestore();

async function main() {
  // 2️⃣ Fetch all documents
  const snapshot = await db.collection("formResponses").get();
  const rows = snapshot.docs.map(doc => {
    const { answers, createdAt } = doc.data();
    // Flatten: id, timestamp, then each questionId → answer
    return {
      id: doc.id,
      createdAt: createdAt?.toDate().toISOString() ?? "",
      ...answers,
    };
  });

  if (rows.length === 0) {
    console.log("No responses found.");
    return;
  }

  // 3A. Write CSV
  const csv = json2csv(rows);
  fs.writeFileSync("formResponses.csv", csv);
  console.log("✅ CSV written to formResponses.csv");

  // 3B. (Optional) Write XLSX
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Responses");
  XLSX.writeFile(wb, "formResponses.xlsx");
  console.log("✅ Excel written to formResponses.xlsx");
}

main().catch(err => {
  console.error("Export failed:", err);
  process.exit(1);
});
