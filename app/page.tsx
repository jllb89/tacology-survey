// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import QuestionStepper, { Question } from '@/components/QuestionStepper';

interface SurveyQuestions {
  locationQuestion: Question;
  serviceQuestion: Question;
  foodQuestion: Question;
  openQuestion: Question;
}

export default function SurveyPage() {
  const [questions, setQuestions] = useState<SurveyQuestions | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch('/api/get-questions')
      .then(res => res.json())
      .then((data: SurveyQuestions) => {
        setQuestions(data);
        setAnswers({
          [data.locationQuestion.id]: '',
          [data.serviceQuestion.id]: '',
          [data.foodQuestion.id]: '',
          [data.openQuestion.id]: '',
        });
      })
      .catch(console.error);
  }, []);

  const handleAnswer = (id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/form-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (res.ok) setSubmitted(true);
      else console.error('Submit failed');
    } catch (err) {
      console.error(err);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-black">
        <h2 className="text-2xl font-semibold">Thank you for your feedback!</h2>
      </div>
    );
  }

  if (!questions) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-black">
        <p>Loading survey…</p>
      </div>
    );
  }

  const allQuestions: Question[] = [
    questions.locationQuestion,
    questions.serviceQuestion,
    questions.foodQuestion,
    questions.openQuestion,
  ];

  return (
    <QuestionStepper
      questions={allQuestions}
      answers={answers}
      onAnswerAction={handleAnswer}
      onSubmitAction={handleSubmit}
    />
  );
}
