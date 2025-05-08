'use client';

import { useState, useEffect } from "react";
import QuestionStepper, { Question } from "@/components/QuestionStepper";

interface GetQuestionsResponse {
  initialLocationQuestion: Question;
  locationFollowUpQuestion: Question;
  serviceQuestion: Question;
  foodQuestion: Question;
  openQuestion: Question;
}

export default function SurveyPage() {
  const [qs, setQs] = useState<GetQuestionsResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/get-questions")
      .then((res) => res.json())
      .then((data: GetQuestionsResponse) => {
        setQs(data);
        setAnswers({
          [data.initialLocationQuestion.id]: "",
          [data.locationFollowUpQuestion.id]: "",
          [data.serviceQuestion.id]: "",
          [data.foodQuestion.id]: "",
          [data.openQuestion.id]: "",
        });
      })
      .catch(console.error);
  }, []);

  const handleAnswer = (id: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = async () => {
    await fetch("/api/form-responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-black">
        <h2 className="text-2xl font-semibold">Thank you for your feedback!</h2>
      </div>
    );
  }

  if (!qs) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#EB5A95] font-bourbon text-white">
        <p>Loading survey…</p>
      </div>
    );
  }

  const allQuestions: Question[] = [
    qs.initialLocationQuestion,
    qs.locationFollowUpQuestion,
    qs.serviceQuestion,
    qs.foodQuestion,
    qs.openQuestion,
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
