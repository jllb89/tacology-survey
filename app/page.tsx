'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import QuestionStepper, { Question } from '@/components/QuestionStepper';

interface GetQuestionsResponse {
  initialLocationQuestion: Question;
  visitingFromQuestion: Question;
  firstVisitQuestion: Question;
  locationFollowUpQuestion: Question;
  serviceQuestion: Question;
  foodQuestion: Question;
  openQuestion: Question;
}

export default function SurveyPage() {
  // New: track user info & which stage we’re in
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [stage, setStage]   = useState<'info'|'survey'|'thanks'>('info');

  const [qs, setQs]         = useState<GetQuestionsResponse|null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});

  // Fetch questions (only when we hit the survey stage)
  useEffect(() => {
    if (stage !== 'survey') return;
    fetch('/api/get-questions')
      .then(r => r.json())
      .then((data: GetQuestionsResponse) => {
        setQs(data);
        setAnswers({
          [data.initialLocationQuestion.id]: '',
          [data.visitingFromQuestion.id]: '',
          [data.firstVisitQuestion.id]: '',
          [data.locationFollowUpQuestion.id]: '',
          [data.serviceQuestion.id]: '',
          [data.foodQuestion.id]: '',
          [data.openQuestion.id]: '',
        });
      })
      .catch(console.error);
  }, [stage]);

  // Advance from info → survey
  const startSurvey = () => {
    if (!email) return;    // make email mandatory
    setStage('survey');
  };

  // Handle final submit
  const handleSubmit = async () => {
    await fetch(`/api/form-responses?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, answers }),
    });
    setStage('thanks');
  };

  // 1️⃣ INFO SCREEN
  if (stage === 'info') {
    return (
      <div className="p-8 max-w-md mx-auto font-bourbon text-black">
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.svg"
            alt="Tacology Logo"
            width={180}
            height={90}
          />
        </div>
        <h1 className="text-2xl mb-4">Help us improve—and get 10% off!</h1>
        <p className="mb-6">
          Complete our quick survey and enjoy 10% off your next Tacology visit.
        </p>
        <label className="block mb-2">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-2 mb-4 border border-black rounded"
        />
        <label className="block mb-2">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 mb-6 border border-black rounded"
        />
        <button
          onClick={startSurvey}
          disabled={!email}
          className="w-full py-2 bg-black text-[#EB5A95] rounded disabled:opacity-50"
        >
          Start Survey
        </button>
      </div>
    );
  }

  // 2️⃣ SURVEY LOADING SCREEN
  if (stage === 'survey' && !qs) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-black">
        <Image
          src="/logo.svg"
          alt="Tacology Logo"
          width={180}
          height={90}
          className="mb-12"
        />
        <h2 className="text-2xl font-semibold">Loading survey…</h2>
      </div>
    );
  }

  // 3️⃣ THANK YOU SCREEN
  if (stage === 'thanks') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-black">
        <Image
          src="/logo.svg"
          alt="Tacology Logo"
          width={180}
          height={90}
          className="mb-12"
        />
        <h2 className="text-2xl font-semibold">
          Thanks, {name}! We’ll see you soon. 🎉
        </h2>
      </div>
    );
  }

  // 4️⃣ SURVEY STEPPER
  const allQuestions: Question[] = [
    qs!.initialLocationQuestion,
    qs!.visitingFromQuestion,
    qs!.firstVisitQuestion,
    qs!.locationFollowUpQuestion,
    qs!.serviceQuestion,
    qs!.foodQuestion,
    qs!.openQuestion,
  ];

  return (
    <QuestionStepper
      questions={allQuestions}
      answers={answers}
      onAnswerAction={(id, val) => setAnswers(a => ({ ...a, [id]: val }))}
      onSubmitAction={handleSubmit}
    />
  );
}
