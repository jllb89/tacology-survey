// components/QuestionStepper.tsx
'use client';

import { useState, ChangeEvent } from 'react';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/radix-checkbox';

// Question type definition
export interface Question {
  id: string;
  text: string;
  options?: string[];
}

interface Props {
  questions: Question[];
  answers: Record<string, string>;
  onAnswerAction: (id: string, value: string) => void;
  onSubmitAction: () => void;
}

export default function QuestionStepper({
  questions,
  answers,
  onAnswerAction,
  onSubmitAction,
}: Props) {
  const [current, setCurrent] = useState(0);
  const isLast = current === questions.length - 1;
  const question = questions[current];

  const handleNext = () =>
    current < questions.length - 1 && setCurrent((prev) => prev + 1);
  const handlePrev = () =>
    current > 0 && setCurrent((prev) => prev - 1);

  // For the final textarea step, determine button label
  const currentAnswer = answers[question.id] || '';
  const submitLabel = currentAnswer
    ? 'Submit'
    : 'Skip & Submit';

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#EB5A95] p-12 font-bourbon text-black">
      <Image
        src="/logo.svg"
        alt="Tacology Logo"
        width={180}
        height={90}
        className="mb-12"
      />
      <div
        key={question.id}
        className="w-full max-w-lg transition-all duration-500 ease-in-out"
      >
        <h2 className="text-xl mb-10">{question.text}</h2>

        {question.options ? (
          <div className="flex flex-col mb-10">
            {question.options.map((opt) => (
              <div key={opt} className="flex items-center space-x-3 mb-6">
                <Checkbox
                  id={`${question.id}-${opt}`}
                  checked={answers[question.id] === opt}
                  onCheckedChange={(checked) =>
                    onAnswerAction(question.id, checked ? opt : '')
                  }
                />
                <label htmlFor={`${question.id}-${opt}`} className="font-medium">
                  {opt}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <textarea
            value={answers[question.id] || ''}
            onChange={(e) => onAnswerAction(question.id, e.target.value)}
            rows={4}
            placeholder="Your comments…"
            className="w-full p-2 rounded mb-4 resize-none border border-black"
          />
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={current === 0}
            className="px-4 py-2 bg-black text-[#EB5A95] rounded disabled:opacity-50"
          >
            Prev
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={onSubmitAction}
              className="px-4 py-2 bg-black text-[#EB5A95] rounded"
            >
              {submitLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!answers[question.id]}
              className="px-4 py-2 bg-black text-[#EB5A95] rounded disabled:opacity-50"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
