// app/api/get-questions/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const [locSnap, servSnap, foodSnap] = await Promise.all([
      getDocs(collection(db, 'locationQuestions')),
      getDocs(collection(db, 'serviceQuestions')),
      getDocs(collection(db, 'foodQuestions')),
    ]);

    const locationQuestion = locSnap.docs.find(d => d.id === 'loc-1')?.data();
    const serviceList     = servSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const foodList        = foodSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const serviceQuestion =
      serviceList[Math.floor(Math.random() * serviceList.length)];
    const foodQuestion   =
      foodList[Math.floor(Math.random() * foodList.length)];

    return NextResponse.json({
      locationQuestion: { id: 'loc-1', ...locationQuestion },
      serviceQuestion,
      foodQuestion,
      openQuestion: { id: 'open', text: 'Any additional comments or suggestions?' },
    });
  } catch (err) {
    console.error('GET /api/get-questions failed:', err);
    return NextResponse.json(
      { error: 'Failed to load questions' },
      { status: 500 },
    );
  }
}
