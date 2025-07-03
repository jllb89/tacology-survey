// app/api/get-questions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import {
  visitingFromQuestion,
  hearAboutQuestion,
  firstVisitQuestion,
  recommendQuestion,
  openQuestion,
} from "@/data/questions";

export async function GET() {
  try {
    // 1️⃣ Fetch each question collection
    const [locSnap, servSnap, foodSnap, salsaSnap, brandSnap] = await Promise.all([
      getDocs(collection(db, "locationQuestions")),
      getDocs(collection(db, "serviceQuestions")),
      getDocs(collection(db, "foodQuestions")),
      getDocs(collection(db, "salsaQuestions")),
      getDocs(collection(db, "brandValueQuestions")),
    ]);

    // 2️⃣ Build arrays of Question-like objects
    const allLoc = locSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const serviceList = servSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const foodList    = foodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const salsaList   = salsaSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const brandList   = brandSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 3️⃣ Extract the fixed initial loc question, and the follow-ups
    const initialLocationQuestion = allLoc.find(q => q.id === "loc-1")!;
    const locationFollowUps = allLoc.filter(q => q.id !== "loc-1");

    // 4️⃣ Random pick helper
    const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    // 5️⃣ Pick your random questions
    const locationFollowUpQuestion = random(locationFollowUps);
    const serviceQuestion          = random(serviceList);
    const foodQuestion             = random(foodList);
    const salsaQuestion            = random(salsaList);
    const brandValueQuestion       = random(brandList);

    // 6️⃣ Return everything in the desired order
    return NextResponse.json({
      initialLocationQuestion,
      visitingFromQuestion,
      hearAboutQuestion,
      firstVisitQuestion,
      locationFollowUpQuestion,
      serviceQuestion,
      foodQuestion,
      salsaQuestion,
      brandValueQuestion,
      recommendQuestion,
      openQuestion,
    });
  } catch (err) {
    console.error("[get-questions] Error:", err);
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 }
    );
  }
}
