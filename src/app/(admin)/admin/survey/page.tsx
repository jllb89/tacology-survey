"use client";

import { useEffect, useMemo, useState } from "react";

type QuestionType = "single_choice" | "scale_0_10" | "free_text";

type Question = {
  key: string;
  id?: string;
  code: string;
  group_key?: string;
  prompt: string;
  description?: string;
  showDescription?: boolean;
  type: QuestionType;
  required: boolean;
  sort_order: number;
  options?: Record<string, unknown> | null;
  choices?: string[];
};

const TYPE_OPTIONS: { value: QuestionType; label: string; hint: string }[] = [
  {
    value: "single_choice",
    label: "Single choice",
    hint: "Likert-style options for quality/perception questions",
  },
  {
    value: "scale_0_10",
    label: "0–10 scale",
    hint: "Great for recommend/loyalty scoring",
  },
  {
    value: "free_text",
    label: "Free text",
    hint: "Open feedback with length limits",
  },
];

function reorder(list: Question[], fromKey: string, toKey: string) {
  if (fromKey === toKey) return list;
  const fromIndex = list.findIndex((q) => q.key === fromKey);
  const toIndex = list.findIndex((q) => q.key === toKey);
  if (fromIndex === -1 || toIndex === -1) return list;
  const updated = [...list];
  const [moved] = updated.splice(fromIndex, 1);
  updated.splice(toIndex, 0, moved);
  return updated;
}

export default function AdminSurveyPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/questions", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load questions");
        const data = (await res.json()) as {
          questions: {
            id: string;
            code: string;
            prompt: string;
            options: Record<string, unknown> | null;
            question_type: QuestionType;
            sort_order: number;
            group_key?: string;
          }[];
        };
        if (cancelled) return;
        const mapped: Question[] = data.questions.map((q) => {
          const labels = Array.isArray((q.options as any)?.labels)
            ? ((q.options as any)?.labels as string[])
            : undefined;
          return {
            key: q.id,
            id: q.id,
            code: q.code,
            prompt: q.prompt,
            description: (q.options as any)?.description ?? "",
            showDescription: Boolean((q.options as any)?.description),
            type: q.question_type,
            required: Boolean((q.options as any)?.required),
            sort_order: q.sort_order ?? 0,
            options: q.options,
            group_key: q.group_key ?? "core_v2",
            choices: labels,
          };
        });
        setQuestions(mapped.sort((a, b) => a.sort_order - b.sort_order));
      } catch (err) {
        console.error(err);
        if (!cancelled) setToast({ type: "error", message: "Failed to load questions" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(
    () => ({
      total: questions.length,
      required: questions.filter((q) => q.required).length,
    }),
    [questions],
  );

  const handleDragStart = (key: string) => setDraggingKey(key);

  const handleDragEnter = (targetKey: string) => {
    if (!draggingKey || draggingKey === targetKey) return;
    setQuestions((prev) => reorder(prev, draggingKey, targetKey));
    setDirty(true);
  };

  const handleDragEnd = () => setDraggingKey(null);

  const handleTypeChange = (key: string, type: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === key
          ? {
            ...q,
            type,
            choices:
              type === "single_choice"
                ? q.choices && q.choices.length > 0
                  ? q.choices
                  : ["Option 1", "Option 2", "Option 3"]
                : undefined,
            options:
              type === "single_choice"
                ? {
                  ...(q.options || {}),
                  labels:
                    q.choices && q.choices.length > 0
                      ? q.choices
                      : ["Option 1", "Option 2", "Option 3"],
                }
                : { ...(q.options || {}), labels: undefined },
          }
          : q,
        ),
    );
    setDirty(true);
  };

  const handlePromptChange = (key: string, prompt: string) => {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, prompt } : q)));
    setDirty(true);
  };

  const handleDescriptionChange = (key: string, description: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === key
          ? {
            ...q,
            description,
            options: { ...(q.options || {}), description },
            showDescription: true,
          }
          : q,
        ),
    );
    setDirty(true);
  };

  const handleShowDescription = (key: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === key
          ? {
            ...q,
            showDescription: true,
            options: { ...(q.options || {}), description: q.description ?? "" },
          }
          : q,
        ),
    );
  };

  const handleRequiredToggle = (key: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === key
          ? {
            ...q,
            required: !q.required,
            options: { ...(q.options || {}), required: !q.required },
          }
          : q,
        ),
    );
    setDirty(true);
  };

  const handleChoiceChange = (key: string, idx: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === key
          ? {
            ...q,
            choices: (q.choices && q.choices.length ? q.choices : ["Option 1", "Option 2", "Option 3"]).map((c, i) => (i === idx ? value : c)),
            options: {
              ...(q.options || {}),
              labels: (q.choices && q.choices.length ? q.choices : ["Option 1", "Option 2", "Option 3"]).map((c, i) => (i === idx ? value : c)),
            },
          }
          : q,
        ),
    );
    setDirty(true);
  };

  const handleAddChoice = (key: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.key === key
          ? {
            ...q,
            choices: [...(q.choices && q.choices.length ? q.choices : ["Option 1", "Option 2", "Option 3"]), "New option"],
            options: {
              ...(q.options || {}),
              labels: [...(q.choices && q.choices.length ? q.choices : ["Option 1", "Option 2", "Option 3"]), "New option"],
            },
          }
          : q,
        ),
    );
    setDirty(true);
  };

  const handleAdd = () => {
    const newKey = crypto.randomUUID();
    setQuestions((prev) => [
      ...prev,
      {
        key: newKey,
        code: `custom_${Date.now()}`,
        prompt: "New question",
        description: "Describe the question",
        type: "single_choice",
        required: false,
        sort_order: prev.length,
        options: { required: false, description: "Describe the question" },
        group_key: "core_v2",
      },
    ]);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    const payload = {
      questions: questions.map((q, idx) => ({
        id: q.id,
        code: q.code,
        prompt: q.prompt,
        question_type: q.type,
        options: {
          ...(q.options || {}),
          required: q.required,
          description: q.description,
          labels: q.type === "single_choice" ? q.choices ?? (q.options as any)?.labels ?? [] : undefined,
        },
        sort_order: idx,
        group_key: q.group_key || "core_v2",
      })),
    };
    try {
      const res = await fetch("/api/admin/questions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody?.details || errorBody?.error || "Save failed");
      }
      setDirty(false);
      setToast({ type: "success", message: "Survey saved" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: err instanceof Error ? err.message : "Failed to save changes" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {toast ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {toast.message}
        </div>
      ) : null}
      <header className="space-y-2">
        <p className="text-sm text-gray-500">Admin / Survey</p>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Survey Builder</h1>
            <p className="text-sm text-gray-600">
              Drag to reorder, choose the type per question, and add new ones.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className={`rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              dirty
                ? "bg-pink-500 text-white hover:bg-pink-600 focus:ring-pink-500"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "Save"}
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white/80 p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-gray-800">Questions</h2>
            <p className="text-xs text-gray-500">Total {summary.total} • Required {summary.required}</p>
          </div>
          <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-600">
            Drag to reorder
          </span>
        </div>

        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-gray-500">Loading questions…</div>
          ) : (
            questions.map((q) => (
              <div
                key={q.key}
                  draggable
                onDragStart={() => handleDragStart(q.key)}
                onDragEnter={() => handleDragEnter(q.key)}
                onDragEnd={handleDragEnd}
                className={`group rounded-lg border bg-white p-4 shadow-sm transition hover:border-pink-200 hover:shadow-md hover:shadow-pink-100 cursor-move ${
                  draggingKey === q.key ? "border-pink-400 shadow" : "border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-semibold text-gray-500">Question {questions.indexOf(q) + 1}</div>
                  <button
                    onClick={() => handleRequiredToggle(q.key)}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      q.required
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {q.required ? "Required" : "Optional"}
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="text-xs font-semibold text-gray-600">Prompt</label>
                  <input
                    type="text"
                    value={q.prompt}
                    onChange={(e) => handlePromptChange(q.key, e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                  />
                </div>
                <div className="mt-2 space-y-2">
                  {q.showDescription ? (
                    <>
                      <label className="text-xs font-semibold text-gray-600">Description (optional)</label>
                      <input
                        type="text"
                        value={q.description || ""}
                        onChange={(e) => handleDescriptionChange(q.key, e.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleShowDescription(q.key)}
                      className="text-xs font-semibold text-pink-600 hover:text-pink-700"
                    >
                      + Add description
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-600">Question type</label>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    value={q.type}
                    onChange={(e) => handleTypeChange(q.key, e.target.value as QuestionType)}
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {`${opt.label} (${opt.hint})`}
                      </option>
                    ))}
                  </select>

                  {q.type === "single_choice" ? (
                    <div className="mt-3 space-y-2 rounded-lg border border-dashed border-pink-100 bg-pink-50/40 p-3">
                      <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                        <span>Choices</span>
                        <button
                          type="button"
                          onClick={() => handleAddChoice(q.key)}
                          className="text-pink-600 hover:text-pink-700"
                        >
                          + Add choice
                        </button>
                      </div>
                      {(q.choices && q.choices.length > 0 ? q.choices : ["Option 1", "Option 2", "Option 3"]).map(
                        (choice, idx) => (
                          <input
                            key={`${q.key}-choice-${idx}`}
                            value={choice}
                            onChange={(e) => handleChoiceChange(q.key, idx, e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-100"
                          />
                        ),
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}

          <button
            onClick={handleAdd}
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-rose-500 shadow-sm">
              +
            </span>
            Add new question
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white/60 p-4 shadow-sm">
        <h2 className="text-sm font-medium text-gray-800">Preview</h2>
        <div className="mt-3 space-y-3">
          {questions.map((q, idx) => (
            <div key={`preview-${q.key}`} className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-gray-500">Q{idx + 1}</div>
                <span className="text-xs text-gray-400">{q.type === "single_choice" ? "1–5" : q.type === "scale_0_10" ? "0–10" : "Free text"}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-gray-900">{q.prompt}</p>
              {q.description ? <p className="text-xs text-gray-500">{q.description}</p> : null}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    q.required ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"
                  }`}
                >
                  {q.required ? "Required" : "Optional"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
