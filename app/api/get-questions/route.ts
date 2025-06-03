// app/api/get-questions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET() {
  try {
    const locSnap  = await getDocs(collection(db, "locationQuestions"));
    const servSnap = await getDocs(collection(db, "serviceQuestions"));
    const foodSnap = await getDocs(collection(db, "foodQuestions"));

    // Find loc-1 (initial) and the follow-ups
    const allLoc       = locSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const initial      = allLoc.find(q => q.id === "loc-1")!;
    const followUps    = allLoc.filter(q => q.id !== "loc-1");

    // Random pick helper
    const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const locationFollowUpQuestion = random(followUps);
    const serviceQuestion         = random(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const foodQuestion            = random(foodSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    return NextResponse.json({
      initialLocationQuestion: initial,
      visitingFromQuestion:   { id: "visit-from", text: "Where are you visiting us from?", options: ["I’m a local", "I work in the neighborhood", "I’m on vacations"] },
      firstVisitQuestion:      { id: "first-visit", text: "Is this your first visit to Tacology?", options: ["Yes, it’s my first time 🌮", "Nope, I’m a taco lover 🔥"] },
      locationFollowUpQuestion,
      serviceQuestion,
      foodQuestion,
      openQuestion: { id: "open", text: "Any additional comments or suggestions?" },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 });
  }
}
