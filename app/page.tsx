'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import QuestionStepper, { Question } from '@/components/QuestionStepper';

interface GetQuestionsResponse {
  initialLocationQuestion: Question;
  visitingFromQuestion:   Question;
  hearAboutQuestion:      Question;
  firstVisitQuestion:     Question;
  locationFollowUpQuestion: Question;
  serviceQuestion:        Question;
  foodQuestion:           Question;
  salsaQuestion:          Question;       // <-- added
  brandValueQuestion:     Question;       // <-- added
  recommendQuestion:      Question;
  openQuestion:           Question;
}

export default function SurveyPage() {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [stage, setStage] = useState<'info'|'survey'|'thanks'>('info');

  const [qs, setQs]           = useState<GetQuestionsResponse|null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});

  useEffect(() => {
    if (stage !== 'survey') return;
    fetch('/api/get-questions')
      .then(r => r.json())
      .then((data: GetQuestionsResponse) => {
        setQs(data);

        // Initialize **all** question IDs
        setAnswers({
          [data.initialLocationQuestion.id]:   '',
          [data.visitingFromQuestion.id]:     '',
          [data.hearAboutQuestion.id]:        '',
          [data.firstVisitQuestion.id]:       '',
          [data.locationFollowUpQuestion.id]: '',
          [data.serviceQuestion.id]:          '',
          [data.foodQuestion.id]:             '',
          [data.salsaQuestion.id]:            '',  // <-- now initialized
          [data.brandValueQuestion.id]:       '',  // <-- now initialized
          [data.recommendQuestion.id]:        '',
          [data.openQuestion.id]:             '',
        });
      })
      .catch(console.error);
  }, [stage]);

  const startSurvey = () => {
    if (!email) return;
    setStage('survey');
  };

  const handleSubmit = async () => {
    await fetch(`/api/form-responses?email=${encodeURIComponent(email)}`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ name, answers }),
    });
    setStage('thanks');
  };

  // 1️⃣ Info screen
  if (stage === 'info') {
    return (
      <div className="p-8 max-w-md mx-auto font-bourbon text-black">
        <div className="flex justify-center mb-8">
          <Image src="/logo.svg" alt="Tacology Logo" width={180} height={90} />
        </div>
        <h1 className="text-2xl mb-4">Help us improve—and get 10% off!</h1>
        <p className="mb-6">Complete our quick survey and enjoy 10% off your next visit.</p>
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

  // 2️⃣ Loading
  if (stage === 'survey' && !qs) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-black">
        <Image src="/logo.svg" alt="Tacology Logo" width={180} height={90} className="mb-12" />
        <h2 className="text-2xl font-semibold">Loading survey…</h2>
      </div>
    );
  }

  // 3️⃣ Thank-you
  if (stage === 'thanks') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-black px-4 text-center">
        <Image src="/logo.svg" alt="Tacology Logo" width={180} height={90} className="mb-12"/>
        <h2 className="text-2xl font-semibold mb-4">
          Thanks, {name}! We’ll see you soon. 🎉
        </h2>
        <p className="text-sm">
          We’ve sent you a confirmation email—if it doesn’t appear in your inbox,<br/>
          please check your spam or promotions folder.
        </p>
      </div>
    );
  }

  // 4️⃣ Stepper
  const allQuestions: Question[] = [
    qs!.initialLocationQuestion,
    qs!.visitingFromQuestion,
    qs!.hearAboutQuestion,
    qs!.firstVisitQuestion,
    qs!.locationFollowUpQuestion,
    qs!.serviceQuestion,
    qs!.foodQuestion,
    qs!.salsaQuestion,         // <-- now matches GET
    qs!.brandValueQuestion,    // <-- now matches GET
    qs!.recommendQuestion,
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
