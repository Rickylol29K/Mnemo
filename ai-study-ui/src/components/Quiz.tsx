"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "sonner";
import { saveQuiz } from "@/lib/db";
import { supabase } from "@/lib/supabase-browser";

/* ----------------------------- Types ----------------------------- */

type Card = { q: string; a: string };
type Q = { prompt: string; options: string[]; correctIndex: number };
type QuizAPI = { questions: Q[] };

/* --------------------------- Utilities --------------------------- */

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

/* ----------------------------- View ------------------------------ */

export default function Quiz() {
  const flashcards = (useStudyStore((s) => s.flashcards) as Card[]) ?? [];
  const rawText = (useStudyStore((s) => s.rawText) as string | null) ?? null;

  const [built, setBuilt] = useState<Q[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // initial build from flashcards (fast)
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

  function resetWith(qs: Q[]): void {
    setBuilt(qs);
    setPicked(new Array(qs.length).fill(-1));
    setScore(null);
  }

  function rebuildFromCurrent(): void {
    resetWith(makeMCQs(flashcards ?? [], 10));
  }

  /** Regenerate BRAND-NEW MCQs from AI with explicit Bearer token. */
  async function regenerateFreshFromAI(): Promise<void> {
    if (!rawText || rawText.trim().length < 10) {
      toast.info("Upload some notes first.");
      return;
    }
    setBusy(true);
    try {
      toast.loading("Generating new questions…", { id: "regen-quiz" });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/quiz?ts=" + Date.now(), {
        method: "POST",
        headers,
        body: JSON.stringify({ text: rawText, n: 12 }),
      });

      if (res.status === 403) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload?.error || "Guest limit reached. Please log in.");
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to generate quiz.");
      }

      const data = (await res.json()) as QuizAPI;
      const qs = Array.isArray(data.questions) ? data.questions : [];
      if (!qs.length) {
        toast.info("No questions returned. Try again.");
        return;
      }

      const cleaned = qs.filter(
        (q) =>
          q.prompt &&
          Array.isArray(q.options) &&
          q.options.filter(Boolean).length >= 3 &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length
      );

      resetWith(cleaned);
      toast.success("New AI-generated quiz ready.", { id: "regen-quiz" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong.", { id: "regen-quiz" });
    } finally {
      setBusy(false);
    }
  }

  /** Save current quiz to dashboard. */
  async function handleSave(): Promise<void> {
    if (!built.length) {
      toast.info("Nothing to save yet.");
      return;
    }
    const title = prompt("Name this quiz:");
    if (!title || !title.trim()) return;

    try {
      toast.loading("Saving quiz…", { id: "save-quiz" });
      await saveQuiz(
        title.trim(),
        built.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
        }))
      );
      toast.success("Saved to your dashboard.", { id: "save-quiz" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not save quiz.", { id: "save-quiz" });
    }
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Quiz</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={rebuildFromCurrent}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={busy || !(flashcards?.length ?? 0)}
          >
            Rebuild from cards
          </button>
          <button
            type="button"
            onClick={regenerateFreshFromAI}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={busy || !rawText}
            title={!rawText ? "Upload notes first" : "Generate all-new questions"}
          >
            {busy ? "Working…" : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={!built.length || busy}
          >
            Save
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {!built.length ? (
          <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">
            Generate a quiz to get started.
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
                        onClick={() => {
                          if (score !== null) return;
                          choose(i, oi);
                        }}
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
