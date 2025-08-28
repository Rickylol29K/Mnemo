"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Flashcard = { q: string; a: string };

type Option = { id: string; text: string; isCorrect: boolean };
type Question = {
  id: string;
  prompt: string;
  options: Option[]; // order is frozen once built
};

function shuffleOnce<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function buildQuiz(items: Flashcard[], count?: number): Question[] {
  if (!items?.length) return [];

  const taken = Math.min(count ?? items.length, items.length);
  const base = shuffleOnce(items).slice(0, taken);

  const poolAnswers = items.map((x) => (x?.a ?? "").trim()).filter(Boolean);

  return base.map((fc, idx) => {
    const correct = (fc.a ?? "").trim();
    // collect distractors different from correct
    const distractors = shuffleOnce(
      uniq(poolAnswers.filter((a) => a && a !== correct))
    ).slice(0, 3);

    const options: Option[] = shuffleOnce(
      [{ text: correct, isCorrect: true } as const, ...distractors.map((t) => ({ text: t, isCorrect: false }))]
        .map((opt, i) => ({
          id: `${idx}-${i}-${opt.text.slice(0, 24)}`,
          text: opt.text,
          isCorrect: opt.isCorrect,
        }))
    );

    return {
      id: `q-${idx}-${fc.q?.slice(0, 20)}`,
      prompt: fc.q || "Question",
      options, // <— frozen order
    };
  });
}

export default function QuizBlock({ items }: { items: Flashcard[] }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<Record<string, string | null>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  // Build questions ONCE per items change. Options order will not change after.
  const questions = useMemo(() => buildQuiz(items), [items]);

  useEffect(() => {
    // reset when new quiz is built
    setCurrent(0);
    setSelected({});
    setRevealed({});
  }, [questions.length]);

  if (!questions.length) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        Not enough flashcards to build a quiz yet.
      </div>
    );
  }

  const q = questions[current];
  const sel = selected[q.id] ?? null;
  const isRevealed = !!revealed[q.id];

  const correctOption = q.options.find((o) => o.isCorrect);

  function choose(opt: Option) {
    if (isRevealed) return;
    setSelected((s) => ({ ...s, [q.id]: opt.id }));
  }

  function reveal() {
    if (isRevealed) return;
    setRevealed((r) => ({ ...r, [q.id]: true }));
  }

  function next() {
    setCurrent((c) => Math.min(c + 1, questions.length - 1));
  }

  function prev() {
    setCurrent((c) => Math.max(c - 1, 0));
  }

  const totalAnswered = Object.keys(revealed).length;
  const totalCorrect = questions.reduce((acc, qu) => {
    const picked = selected[qu.id];
    if (!picked) return acc;
    const opt = qu.options.find((o) => o.id === picked);
    return acc + (opt?.isCorrect ? 1 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, 0);

  return (
    <div className="grid gap-4">
      {/* progress */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-zinc-600">
          Question {current + 1} / {questions.length}
        </div>
        <div className="text-zinc-600">
          Score:{" "}
          <span className="font-medium">
            {totalCorrect} / {totalAnswered}
          </span>
        </div>
      </div>

      {/* card */}
      <div className="rounded-2xl border p-5">
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-1">
          Multiple choice
        </div>
        <h4 className="text-base font-semibold mb-3">{q.prompt}</h4>

        <div className="grid gap-2">
          {q.options.map((opt) => {
            const picked = sel === opt.id;
            const correct = isRevealed && opt.isCorrect;
            const wrongPicked = isRevealed && picked && !opt.isCorrect;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => choose(opt)}
                className={[
                  "w-full text-left rounded-xl border px-3 py-2 transition",
                  picked && !isRevealed ? "border-zinc-900 bg-zinc-900 text-white" : "hover:bg-zinc-50",
                  correct ? "border-green-500 bg-green-50" : "",
                  wrongPicked ? "border-red-500 bg-red-50" : "",
                ].join(" ")}
              >
                {opt.text}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={prev} disabled={current === 0}>
            Previous
          </Button>
          {!isRevealed ? (
            <Button
              type="button"
              variant="primary"
              onClick={reveal}
              disabled={!sel}
              title={!sel ? "Choose an option first" : "Check answer"}
            >
              Check
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={next} disabled={current === questions.length - 1}>
              Next
            </Button>
          )}
          <div className="ml-auto text-sm text-zinc-600">
            {isRevealed ? (
              correctOption ? (
                <>
                  Correct answer:&nbsp;
                  <span className="font-medium">{correctOption.text}</span>
                </>
              ) : null
            ) : sel ? (
              "Ready to check"
            ) : (
              "Select one option"
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
