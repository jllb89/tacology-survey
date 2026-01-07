"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type QuestionType = "single_choice" | "scale_0_10" | "free_text";

type Question = {
  id: string;
  code: string;
  prompt: string;
  question_type: QuestionType;
  options?: { labels?: string[] } | null;
  sort_order?: number | null;
  is_active?: boolean;
};

type Location = "brickell" | "wynwood";

type AnswerValue = {
  value_text?: string | null;
  value_number?: number | null;
};

const LOCATION_OPTIONS: { value: Location; label: string }[] = [
  { value: "brickell", label: "Brickell" },
  { value: "wynwood", label: "Wynwood" },
];

export default function SurveyPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [step, setStep] = useState(0); // 0 = contact gate, 1..n questions, last = improvement/submit
  const [contact, setContact] = useState({ name: "", email: "", phone: "", location: "" as Location | "" });
  const [contactError, setContactError] = useState<string | null>(null);
  const [startLoading, setStartLoading] = useState(false);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [bgReady, setBgReady] = useState(false);
  const loveCorner = useMemo(() => (Math.random() < 0.5 ? "bottom-left" : "bottom-right"), []);
  const [mounted, setMounted] = useState(false);

  // Load questions first; nothing renders until ready
  useEffect(() => {
    async function loadQuestions() {
      try {
        setLoadingQuestions(true);
        setQuestionsError(null);
        const res = await fetch("/api/admin/questions", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to load questions");
        const list: Question[] = Array.isArray(json?.questions) ? json.questions : [];
        const active = list.filter((q) => q.is_active !== false);
        active.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        setQuestions(active);
      } catch (err: any) {
        console.error(err);
        setQuestionsError(err?.message || "Failed to load questions");
      } finally {
        setLoadingQuestions(false);
      }
    }
    loadQuestions();
  }, []);

  useEffect(() => {
    const img = new window.Image();
    img.src = "/taco-bg.webp";
    img.onload = () => setBgReady(true);
    img.onerror = () => setBgReady(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalSteps = useMemo(() => questions.length + 1, [questions.length]);

  const currentQuestion = useMemo(() => {
    if (step === 0) return null;
    if (step >= 1 && step <= questions.length) return questions[step - 1];
    return null;
  }, [step, questions]);

  const progressPercent = useMemo(() => {
    const idx = Math.min(step + 1, totalSteps);
    return Math.round((idx / totalSteps) * 100);
  }, [step, totalSteps]);

  const displayProgress = submitted ? 100 : progressPercent;

  const isLoading = loadingQuestions;

  const globalStyles = (
    <style jsx global>{`
      @font-face {
        font-family: 'BourbonGrotesque';
        src: url('/BourbonGrotesque.otf') format('opentype');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }

      .survey-font {
        font-family: 'BourbonGrotesque', 'Inter', system-ui, -apple-system, sans-serif;
      }

      @keyframes surveyPulse {
        0% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.06); opacity: 1; }
        100% { transform: scale(1); opacity: 0.9; }
      }

      .survey-logo-pulse {
        animation: surveyPulse 1.4s ease-in-out infinite;
        transform-origin: center;
      }

      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(16px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .animate-fade-up {
        animation: fadeInUp 1100ms ease forwards;
      }

      .animate-fade-in {
        animation: fadeIn 900ms ease forwards;
      }

      .animate-fade-switch {
        animation: fadeIn 1200ms ease forwards;
      }
    `}</style>
  );

  const backgroundStyle = useMemo(
    () => ({
      backgroundColor: "#EB5A95",
      backgroundImage: bgReady ? "url('/taco-bg.webp')" : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }),
    [bgReady]
  );

  function validateContact() {
    if (!contact.name.trim()) return "Name is required";
    if (contact.email.trim()) {
      const emailOk = /.+@.+\..+/.test(contact.email.trim());
      if (!emailOk) return "Enter a valid email";
    }
    if (!contact.location) return "Location is required";
    return null;
  }

  async function handleStart() {
    const err = validateContact();
    if (err) {
      setContactError(err);
      return;
    }
    setContactError(null);
    setStartLoading(true);
    try {
      const res = await fetch("/api/survey/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contact.email.trim() || undefined,
          name: contact.name.trim(),
          phone: contact.phone.trim(),
          location: contact.location,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to start survey");
      setStep(1);
    } catch (err: any) {
      console.error(err);
      setContactError(err?.message || "Failed to start");
    } finally {
      setStartLoading(false);
    }
  }

  function updateAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function currentQuestionAnswered(q: Question | null) {
    if (!q) return false;
    const ans = answers[q.id];
    if (q.question_type === "scale_0_10") return typeof ans?.value_number === "number";
    if (q.question_type === "single_choice") return !!ans?.value_text;
    if (q.question_type === "free_text") return !!ans?.value_text?.trim();
    return false;
  }

  function canGoNext() {
    if (step === 0) return !validateContact();
    if (step >= 1 && step <= questions.length) return currentQuestionAnswered(currentQuestion);
    return true;
  }

  async function handleSubmit() {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        email: contact.email.trim() || undefined,
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        location: contact.location as Location,
        answers: questions.map((q) => {
          const ans = answers[q.id] || {};
          if (q.question_type === "scale_0_10") {
            return { question_id: q.id, value_number: ans.value_number ?? null };
          }
          return { question_id: q.id, value_text: ans.value_text ?? "" };
        }),
      };

      const res = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to submit");
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      setSubmitError(err?.message || "Failed to submit survey");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (step === 0) {
      handleStart();
      return;
    }
    if (step >= 1 && step < questions.length) {
      if (!currentQuestionAnswered(currentQuestion)) return;
      setStep((s) => s + 1);
      return;
    }
    if (step === questions.length) {
      if (!currentQuestionAnswered(currentQuestion) || submitting) return;
      handleSubmit();
    }
  }

  function goPrev() {
    if (submitting || startLoading) return;
    setSubmitError(null);
    setContactError(null);
    setStep((s) => Math.max(0, s - 1));
  }

// Final step removed; last question submits directly

  if (isLoading) {
    return (
      <>
        {globalStyles}
        <main
          className="min-h-screen survey-font flex items-center justify-center"
          style={{ ...backgroundStyle, color: "#0f172a" }}
        >
          <div className="flex flex-col items-center gap-4 text-neutral-900">
            <Image src="/tacologo2.svg" alt="Tacology" width={192} height={192} className="survey-logo-pulse drop-shadow-xl" priority />
          </div>
        </main>
      </>
    );
  }

  if (questionsError) {
    return (
      <>
        {globalStyles}
        <main className="min-h-screen survey-font flex items-center justify-center px-4 text-white" style={backgroundStyle}>
          <div className="max-w-lg rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 shadow-lg">
            <p className="text-sm font-semibold">Something went wrong</p>
            <p className="mt-2 text-sm text-white/80">{questionsError}</p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      {globalStyles}
      <main className="min-h-screen survey-font text-neutral-900 flex flex-col" style={backgroundStyle}>
        <div className="pt-6 flex justify-center">
          <Image src="/tacologo2.svg" alt="Tacology" width={220} height={220} priority className="drop-shadow-md" />
        </div>
        <div className="flex-1 flex justify-center px-4 pb-24">
          <div className="w-full max-w-4xl space-y-6 flex flex-col justify-center">
            <div className="text-center space-y-5">
              <h1 className={`text-3xl sm:text-4xl font-semibold leading-tight text-neutral-900 ${mounted ? "animate-fade-up" : ""}`}>Thank you for visiting us today! <br /> Help us improve and get 10% off!</h1>
            </div>
            <div className={`bg-white shadow-lg border border-white/60 p-6 md:p-8 min-h-[440px] flex flex-col justify-center mt-6 relative overflow-visible ${mounted ? "animate-fade-in" : ""}`}>
              <Image
                src="/taco-tape.png"
                alt=""
                aria-hidden
                width={200}
                height={200}
                className="pointer-events-none select-none absolute -top-8 -left-6 w-24 h-24 sm:-top-10 sm:-left-8 sm:w-28 sm:h-28 md:-top-12 md:-left-10 md:w-40 md:h-40 z-20"
                priority
              />
              <Image
                src="/taco-tape2.png"
                alt=""
                aria-hidden
                width={200}
                height={200}
                className="pointer-events-none select-none absolute -top-8 -right-6 w-24 h-24 sm:-top-10 sm:-right-8 sm:w-28 sm:h-28 md:-top-12 md:-right-10 md:w-40 md:h-40 z-20"
                priority
              />
              {loveCorner === "bottom-left" ? (
                <Image
                  src="/taco-love.svg"
                  alt=""
                  aria-hidden
                  width={280}
                  height={280}
                  className="pointer-events-none select-none absolute -bottom-12 -left-8 w-40 h-40 sm:-bottom-14 sm:-left-10 sm:w-48 sm:h-48 md:-bottom-32 md:-left-21 md:w-56 md:h-56 z-20"
                  priority
                />
              ) : (
                <Image
                  src="/taco-tape2.png"
                  alt=""
                  aria-hidden
                  width={200}
                  height={200}
                  className="pointer-events-none select-none absolute -bottom-10 -left-8 w-28 h-28 sm:-bottom-12 sm:-left-10 sm:w-32 sm:h-32 md:-bottom-14 md:-left-12 md:w-40 md:h-40 rotate-180 z-20"
                  priority
                />
              )}
              {loveCorner === "bottom-right" ? (
                <Image
                  src="/taco-love.svg"
                  alt=""
                  aria-hidden
                  width={280}
                  height={280}
                  className="pointer-events-none select-none absolute -bottom-12 -right-8 w-40 h-40 sm:-bottom-14 sm:-right-10 sm:w-48 sm:h-48 md:-bottom-32 md:-right-20 md:w-56 md:h-56 z-20"
                  priority
                />
              ) : (
                <Image
                  src="/taco-tape.png"
                  alt=""
                  aria-hidden
                  width={200}
                  height={200}
                  className="pointer-events-none select-none absolute -bottom-10 -right-8 w-28 h-28 sm:-bottom-12 sm:-right-10 sm:w-32 sm:h-32 md:-bottom-14 md:-right-12 md:w-40 md:h-40 rotate-180 z-20"
                  priority
                />
              )}
              <div key={submitted ? "submitted" : `step-${step}`} className="animate-fade-switch">
              {submitted && (
                <div className="space-y-5 flex flex-col justify-center flex-1">
                  <p className="text-xs uppercase tracking-[0.14em] text-pink-600 text-center">Thank you</p>
                  <h2 className="text-2xl font-semibold text-neutral-900 text-center">We’ve got your feedback</h2>
                  <p className="text-neutral-600 text-sm text-center">Your responses help Tacology improve. Enjoy 10% off on your next visit.</p>
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2 text-pink-700 text-sm font-semibold">10% OFF coupon is on its way</div>
                  </div>
                </div>
              )}
              {!submitted && step === 0 && (
                <div className="space-y-5 flex flex-col justify-center flex-1">
                  <div className="text-xl text-[#EB5A95] text-center">Please share your visit details to start.</div>
                  <div className="grid gap-6 md:grid-cols-2 mt-6">
                    <label className="flex flex-col gap-3 text-sm text-neutral-700">
                      <span>Name</span>
                      <input
                        type="text"
                        className="w-full rounded-full border border-black px-4 py-3 text-sm shadow-sm focus:border-[#EB5A95] focus:ring-2 focus:ring-pink-100 focus:outline-none"
                        value={contact.name}
                        onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                        placeholder="Your name"
                      />
                    </label>
                    <label className="flex flex-col gap-3 text-sm text-neutral-700">
                      <span>Email</span>
                      <input
                        type="email"
                        className="w-full rounded-full border border-black px-4 py-3 text-sm shadow-sm focus:border-[#EB5A95] focus:ring-2 focus:ring-pink-100 focus:outline-none"
                        value={contact.email}
                        onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                        placeholder="you@example.com"
                      />
                    </label>
                    <label className="flex flex-col gap-3 text-sm text-neutral-700">
                      <span>Phone</span>
                      <input
                        type="tel"
                        className="w-full rounded-full border border-black px-4 py-3 text-sm shadow-sm focus:border-[#EB5A95] focus:ring-2 focus:ring-pink-100 focus:outline-none"
                        value={contact.phone}
                        onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                        placeholder="(305) 555-1234"
                      />
                    </label>
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-neutral-700">Which location did you visit?</p>
                      <div className="flex flex-wrap gap-2">
                        {LOCATION_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setContact((c) => ({ ...c, location: opt.value }))}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition border ${
                              contact.location === opt.value
                                ? "border-pink-300 bg-pink-50 text-pink-700"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {contactError && <p className="text-sm text-rose-600">{contactError}</p>}
                  <div className="flex items-center justify-center mt-6">
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={startLoading}
                      className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-700 disabled:opacity-60"
                    >
                      {startLoading ? "Starting…" : "Begin survey"}
                    </button>
                  </div>
                </div>
              )}

              {!submitted && step >= 1 && step <= questions.length && currentQuestion && (
                <div className="space-y-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-pink-600">Question {step} of {questions.length}</p>
                  <h2 className="text-lg sm:text-xl font-semibold text-neutral-900">{currentQuestion.prompt}</h2>

                  {currentQuestion.question_type === "single_choice" && (
                    <div className="flex flex-wrap gap-3">
                      {(currentQuestion.options?.labels || []).map((label) => {
                        const selected = answers[currentQuestion.id]?.value_text === label;
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() => updateAnswer(currentQuestion.id, { value_text: label })}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition border ${
                              selected
                                ? "border-pink-300 bg-pink-50 text-pink-700"
                                : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {currentQuestion.question_type === "scale_0_10" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-6 gap-2 sm:grid-cols-11">
                        {Array.from({ length: 11 }).map((_, idx) => {
                          const selected = answers[currentQuestion.id]?.value_number === idx;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => updateAnswer(currentQuestion.id, { value_number: idx })}
                              className={`h-12 rounded-xl border text-sm font-semibold transition ${
                                selected
                                  ? "border-pink-400 bg-pink-50 text-pink-700"
                                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300"
                              }`}
                            >
                              {idx}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Not likely</span>
                        <span>Very likely</span>
                      </div>
                    </div>
                  )}

                  {currentQuestion.question_type === "free_text" && (
                    <div className="space-y-2">
                      <textarea
                        className="w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm shadow-sm focus:border-[#EB5A95] focus:ring-2 focus:ring-pink-100 focus:outline-none focus:ring-offset-0 resize-none"
                        rows={5}
                        placeholder="Type your answer"
                        value={answers[currentQuestion.id]?.value_text || ""}
                        onChange={(e) => updateAnswer(currentQuestion.id, { value_text: e.target.value })}
                      />
                      <p className="text-xs text-neutral-500">Required</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="inline-flex items-center rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:border-neutral-300"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!canGoNext() || (step === questions.length && submitting)}
                      className="inline-flex items-center rounded-full bg-pink-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-700 disabled:opacity-60"
                    >
                      {step === questions.length ? (submitting ? "Submitting…" : "Submit") : "Next"}
                    </button>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6">
          <div className="mx-auto max-w-4xl flex items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-black/20 overflow-hidden">
              <div className="h-full bg-black/80 transition-[width] duration-800 ease-out" style={{ width: `${displayProgress}%` }} />
            </div>
            <span className="text-xs font-semibold text-neutral-900 w-14 text-right drop-shadow-sm">{displayProgress}%</span>
          </div>
        </div>
      </main>
    </>
  );
}
