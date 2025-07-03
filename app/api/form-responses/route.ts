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
import nodemailer from 'nodemailer';
import path from 'path';
import { buildThankYouEmail } from '@/lib/emailTemplates';

// Create a transporter once
console.log('[form-responses] Initializing SMTP transporter with:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER,
});
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(request: NextRequest) {
  console.log('[form-responses] >>> POST /api/form-responses called');
  try {
    // 1️⃣ Parse email, name, answers
    const email = request.nextUrl.searchParams.get('email');
    console.log('[form-responses] Parsed email from query:', email);
    if (!email) {
      console.error('[form-responses] Missing email in query string');
      return NextResponse.json(
        { success: false, error: 'Missing email' },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log('[form-responses] Request body:', JSON.stringify(body, null, 2));
    const { name, answers }: { name: string; answers: Record<string,string> } = body;

    // 2️⃣ Save to Firestore
    console.log('[form-responses] Saving response to Firestore at formResponses/', email);
    const respRef = doc(db, 'formResponses', email);
    await setDoc(respRef, {
      name,
      email,
      answers,
      createdAt: serverTimestamp(),
    });
    console.log('[form-responses] Firestore save complete');

    // 3️⃣ Stamp questions
    const now = Timestamp.now();
    console.log('[form-responses] Stamping questions with timestamp:', now.toDate().toISOString());
    for (const qId of Object.keys(answers)) {
      let col: string | null = null;
      if (qId.startsWith('loc')) col = 'locationQuestions';
      else if (qId.startsWith('serv')) col = 'serviceQuestions';
      else if (qId.startsWith('food')) col = 'foodQuestions';
      else {
        console.log('[form-responses] Skipping non-graded qId:', qId);
        continue;
      }

      console.log(`[form-responses]   → Stamping ${col}/${qId}`);
      const qRef = doc(db, col, qId);
      await updateDoc(qRef, { responseTimestamps: arrayUnion(now) });
    }
    console.log('[form-responses] Question stamping complete');

    // 4️⃣ Build email content
    console.log('[form-responses] Building thank-you email content for:', email);
    const { subject, text, html } = buildThankYouEmail(name, email);
    console.log('[form-responses] Email subject:', subject);
    console.log('[form-responses] Email text preview:', text.slice(0, 100) + '…');

    // 5️⃣ Send via Nodemailer with inline attachments
    console.log('[form-responses] Sending email via SMTP to:', email);
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject,
      text,
      html,
      attachments: [
        {
          filename: 'logo.png',
          path: path.join(process.cwd(), 'public', 'logo.png'),
          cid: 'logo',        // matches <img src="cid:logo">
        },
        {
          filename: '10off.png',
          path: path.join(process.cwd(), 'public', '10off.png'),
          cid: 'discount',    // matches <img src="cid:discount">
        },
      ],
    });
    console.log('[form-responses] Email sent. Message ID:', info.messageId);
    console.log('[form-responses] Nodemailer response:', info);

    // 6️⃣ Respond success
    console.log('[form-responses] Response handler complete, returning success');
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('[form-responses] ERROR in handler:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Server error' },
      { status: 500 }
    );
  }
}
