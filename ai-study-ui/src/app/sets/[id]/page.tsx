"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import {
  getStudySetWithItems,
  QuizQ,
  Flashcard,
  StudySet,
} from "@/lib/db";

export default function StudySetViewer() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const setId = params?.id;

  const [setMeta, setSetMeta] = useState<StudySet | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [qs, setQs] = useState<QuizQ[]>([]);
  const [loading, setLoading] = useState(true);

  // quiz local state
  const [picked, setPicked] = useState<number[]>([]);
  const [score, setScore] = useState<number | null>(null);

  // flashcards local state
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/account");
        return;
      }

      try {
        if (!setId) return;
        const res = await getStudySetWithItems(String(setId));
        if (!mounted) return;

        if (!res.set) {
          router.push("/dashboard");
          return;
        }

        setSetMeta(res.set);
        if (res.flashcards) {
          setCards(res.flashcards);
          setIdx(0);
          setReveal(false);
        }
        if (res.quiz) {
          setQs(res.quiz);
          setPicked(new Array(res.quiz.length).fill(-1));
          setScore(null);
        }
      } catch (e) {
        console.error(e);
        router.push("/dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: unknown, session: { user: any } | null) => {
        if (!session?.user) router.push("/account");
      }
    );

    return () => {
      sub?.subscription?.unsubscribe();
      mounted = false;
    };
  }, [router, setId]);

  /* ---------- Quiz helpers ---------- */

  const allAnswered = useMemo(
    () => (qs.length ? picked.every((p) => p >= 0) : false),
    [qs.length, picked]
  );

  function choose(qi: number, oi: number): void {
    setPicked((p) => {
      const cp = p.slice();
      cp[qi] = oi;
      return cp;
    });
  }

  function grade(): void {
    let s = 0;
    for (let i = 0; i < qs.length; i++) {
      if (picked[i] === qs[i].correctIndex) s++;
    }
    setScore(s);
  }

  /* ---------- Flashcard helpers ---------- */

  function prevCard(): void {
    setIdx((i) => Math.max(0, i - 1));
    setReveal(false);
  }
  function nextCard(): void {
    setIdx((i) => Math.min(cards.length - 1, i + 1));
    setReveal(false);
  }

  if (loading) {
    return <div className="text-sm text-zinc-600">Loading…</div>;
  }

  if (!setMeta) {
    return <div className="text-sm text-zinc-600">Set not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold tracking-tight">{setMeta.title}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {setMeta.type === "quiz"
            ? `${qs.length} questions`
            : `${cards.length} cards`}
        </p>
      </div>

      {setMeta.type === "flashcards" ? (
        <div className="rounded-xl border bg-white p-6">
          {!cards.length ? (
            <div className="text-sm text-zinc-600">No cards in this set.</div>
          ) : (
            <div className="max-w-2xl">
              <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                Card {idx + 1} / {cards.length}
              </p>
              <div className="rounded-xl border p-5">
                <div className="text-base font-medium leading-relaxed">
                  {cards[idx].q}
                </div>

                {reveal ? (
                  <div className="mt-4 rounded-lg border bg-zinc-50 p-3">
                    <div className="text-sm text-zinc-600">Answer</div>
                    <div className="mt-1 leading-relaxed">{cards[idx].a}</div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setReveal(true)}
                    className="mt-4 rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
                  >
                    Reveal
                  </button>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={prevCard}
                  disabled={idx === 0}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={nextCard}
                  disabled={idx >= cards.length - 1}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-6">
          {!qs.length ? (
            <div className="text-sm text-zinc-600">No questions in this quiz.</div>
          ) : (
            <div className="space-y-6">
              {qs.map((q, i) => (
                <div key={i} className="rounded-xl border p-4">
                  <div className="mb-3 font-medium leading-relaxed">
                    {i + 1}. {q.prompt}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {q.options.map((opt, oi) => {
                      const chosen = picked[i] === oi;
                      const isCorrect = score !== null && oi === q.correctIndex;
                      const isWrongPick =
                        score !== null && chosen && oi !== q.correctIndex;
                      return (
                        <button
                          type="button"
                          key={oi}
                          onClick={() => choose(i, oi)}
                          className={[
                            "rounded-lg border px-3 py-2 text-left text-sm transition",
                            chosen ? "ring-2 ring-zinc-300" : "",
                            score !== null && isCorrect
                              ? "border-emerald-300 bg-emerald-50"
                              : "",
                            score !== null && isWrongPick
                              ? "border-rose-300 bg-rose-50"
                              : "",
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
                    setPicked(new Array(qs.length).fill(-1));
                    setScore(null);
                  }}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
                >
                  Clear
                </button>
                <div className="flex items-center gap-3">
                  {score !== null && (
                    <span className="text-sm text-zinc-600">
                      Score: <span className="font-semibold">{score}</span> / {qs.length}
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
      )}
    </div>
  );
}
