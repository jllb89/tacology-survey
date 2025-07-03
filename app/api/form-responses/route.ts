// app/api/form-responses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import sgMail from '@sendgrid/mail';
import { buildThankYouEmail } from '@/lib/emailTemplates';

// Initialize SendGrid
const sendgridKey = process.env.SENDGRID_API_KEY;
const sendgridFrom = process.env.SENDGRID_FROM_EMAIL;
sgMail.setApiKey(sendgridKey!);

export async function POST(request: NextRequest) {
  try {
    console.log('[form-responses] Received request');

    // 1️⃣ Pull email
    const email = request.nextUrl.searchParams.get('email');
    console.log('[form-responses] Email from query:', email);
    if (!email) {
      console.error('[form-responses] Missing email');
      return NextResponse.json(
        { success: false, error: 'Missing email in query string' },
        { status: 400 }
      );
    }

    // 2️⃣ Parse name + answers
    const body = await request.json();
    console.log('[form-responses] Body:', body);
    const { name, answers }: { name: string; answers: Record<string, string> } = body;

    // 3️⃣ Save to Firestore
    console.log('[form-responses] Saving to Firestore under ID:', email);
    const respRef = doc(db, 'formResponses', email);
    await setDoc(respRef, {
      name,
      email,
      answers,
      createdAt: serverTimestamp(),
    });
    console.log('[form-responses] Firestore save complete');

    // 4️⃣ Stamp question docs
    const now = Timestamp.now();
    for (const qId of Object.keys(answers)) {
      let col: string | null = null;
      if (qId.startsWith('loc')) col = 'locationQuestions';
      else if (qId.startsWith('serv')) col = 'serviceQuestions';
      else if (qId.startsWith('food')) col = 'foodQuestions';
      else continue;

      console.log(`[form-responses] Stamping ${col}/${qId}`);
      const qRef = doc(db, col, qId);
      await updateDoc(qRef, { responseTimestamps: arrayUnion(now) });
    }
    console.log('[form-responses] Question stamping complete');

    // 5️⃣ Build & log email via our template helper
    if (!sendgridKey || !sendgridFrom) {
      console.error('[form-responses] Missing SendGrid config:', { sendgridKey, sendgridFrom });
    }
    const { subject, text, html } = buildThankYouEmail(name, email);
    console.log('[form-responses] Sending email:', { to: email, subject });

    // 6️⃣ Send email
    const [response] = await sgMail.send({
      to: email,
      from: sendgridFrom!,
      subject,
      text,
      html,
    });
    console.log('[form-responses] SendGrid response statusCode:', response.statusCode);

    // 7️⃣ Respond success
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('[form-responses] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save and email' },
      { status: 500 }
    );
  }
}
