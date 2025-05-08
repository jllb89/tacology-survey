// app/api/get-questions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function GET() {
  try {
    const locSnap  = await getDocs(collection(db, "locationQuestions"));
    const servSnap = await getDocs(collection(db, "serviceQuestions"));
    const foodSnap = await getDocs(collection(db, "foodQuestions"));

    // 🍴 Locate loc-1 and the rest
    const allLoc = locSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const initial = allLoc.find(q => q.id === "loc-1")!;
    const followUps = allLoc.filter(q => q.id !== "loc-1");

    // 🔀 Pick one random from each pool
    const random = <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

    const locationFollowUpQuestion = random(followUps);
    const serviceQuestion         = random(servSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    const foodQuestion            = random(foodSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    return NextResponse.json({
      initialLocationQuestion: initial,
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
