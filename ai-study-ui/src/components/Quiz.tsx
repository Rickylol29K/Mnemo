"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "sonner";
import { saveQuiz } from "@/lib/db";

type Card = { q: string; a: string };
type Q = { prompt: string; options: string[]; correctIndex: number };

function makeMCQs(cards: Card[], count = 10): Q[] {
  const deck = cards.slice();
  const qs: Q[] = [];
  function pickDistractors(correct: string, pool: string[], k: number) {
    const candidates = pool.filter((x) => x !== correct);
    const out: string[] = [];
    while (candidates.length && out.length < k) {
      const j = Math.floor(Math.random() * candidates.length);
      const val = candidates.splice(j, 1)[0];
      if (val && !out.includes(val)) out.push(val);
    }
    return out;
  }
  for (let i = 0; i < deck.length && qs.length < count; i++) {
    const c = deck[i];
    if (!c?.q || !c?.a) continue;
    const distractors = pickDistractors(c.a, deck.map((d) => d.a), 3);
    const opts = [c.a, ...distractors];
    for (let k = opts.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [opts[k], opts[r]] = [opts[r], opts[k]];
    }
    qs.push({ prompt: c.q, options: opts, correctIndex: opts.findIndex((x) => x === c.a) });
  }
  return qs;
}

export default function Quiz() {
  const flashcards = useStudyStore((s) => s.flashcards) as Card[];
  const [built, setBuilt] = useState<Q[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const qs = makeMCQs(flashcards ?? [], 10);
    setBuilt(qs);
    setPicked(new Array(qs.length).fill(-1));
    setScore(null);
  }, [flashcards?.length]);

  const allAnswered = useMemo(() => picked.length > 0 && picked.every((p) => p >= 0), [picked]);

  function choose(qi: number, oi: number): void {
    setPicked((p) => {
      const cp = p.slice();
      cp[qi] = oi;
      return cp;
    });
  }
  function grade(): void {
    let s = 0;
    for (let i = 0; i < built.length; i++) if (picked[i] === built[i].correctIndex) s++;
    setScore(s);
  }
  function resetQuizFromCards(): void {
    const qs = makeMCQs(flashcards ?? [], 10);
    setBuilt(qs);
    setPicked(new Array(qs.length).fill(-1));
    setScore(null);
  }

  async function handleSave(): Promise<void> {
    if (!built.length) {
      toast.info("Nothing to save yet.");
      return;
    }
    const title = prompt("Name this quiz:");
    if (!title || !title.trim()) return;

    try {
      toast.loading("Saving quiz…", { id: "save-quiz" });
      const id = await saveQuiz(
        title.trim(),
        built.map((q) => ({ prompt: q.prompt, options: q.options, correctIndex: q.correctIndex }))
      );
      toast.success("Saved to your dashboard.", { id: "save-quiz" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not save.", { id: "save-quiz" });
    }
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Quiz</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetQuizFromCards}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={!(flashcards?.length ?? 0)}
          >
            Rebuild
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={!built.length}
          >
            Save
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {!built.length ? (
          <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">
            Generate flashcards first to build a quiz.
          </div>
        ) : (
          <div className="space-y-6">
            {built.map((q, i) => (
              <div key={i} className="rounded-xl border p-4">
                <div className="mb-3 font-medium leading-relaxed">
                  {i + 1}. {q.prompt}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {q.options.map((opt, oi) => {
                    const chosen = picked[i] === oi;
                    const isCorrect = score !== null && oi === q.correctIndex;
                    const isWrongPick = score !== null && chosen && oi !== q.correctIndex;

                    return (
                      <button
                        type="button"
                        key={oi}
                        onClick={() => choose(i, oi)}
                        className={[
                          "rounded-lg border px-3 py-2 text-left text-sm transition",
                          chosen ? "ring-2 ring-zinc-300" : "",
                          score !== null && isCorrect ? "border-emerald-300 bg-emerald-50" : "",
                          score !== null && isWrongPick ? "border-rose-300 bg-rose-50" : "",
                          score === null ? "hover:bg-zinc-50" : "",
                        ].join(" ")}
                        disabled={score !== null}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setPicked(new Array(built.length).fill(-1));
                  setScore(null);
                }}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
                disabled={!built.length}
              >
                Clear
              </button>
              <div className="flex items-center gap-3">
                {score !== null && (
                  <span className="text-sm text-zinc-600">
                    Score: <span className="font-semibold">{score}</span> / {built.length}
                  </span>
                )}
                <button
                  type="button"
                  onClick={grade}
                  disabled={!allAnswered || score !== null}
                  className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                >
                  {score === null ? "Check Answers" : "Checked"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
