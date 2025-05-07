// app/api/form-responses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Expect payload like: { answers: { [questionId]: answerValue, … } }
    const { answers } = await request.json();

    // Write a new document into formResponses
    await addDoc(collection(db, 'formResponses'), {
      answers,
      createdAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error saving form response:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save form response' },
      { status: 500 }
    );
  }
}
