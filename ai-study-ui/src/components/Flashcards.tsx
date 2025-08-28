"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "sonner";
import { saveFlashcards } from "@/lib/db";

type Card = { q: string; a: string };
type Extras = {
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: { q: string; a: string }[];
};

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Flashcards() {
  const flashcards = useStudyStore((s) => s.flashcards) as Card[];
  const rawText = useStudyStore((s) => s.rawText) as string | null;
  const extras = useStudyStore((s) => s.extras) as Extras | undefined;

  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [showAns, setShowAns] = useState(false);
  const deck: Card[] = flashcards ?? [];

  useEffect(() => {
    const ord = deck.map((_, i) => i);
    setOrder(ord);
    setIdx(0);
    setShowAns(false);
  }, [deck.length]);

  const current = useMemo(() => {
    if (!order.length || !deck.length) return null;
    return deck[order[idx]] ?? null;
  }, [order, idx, deck]);

  function next(): void {
    setShowAns(false);
    setIdx((i) => Math.min(i + 1, Math.max(order.length - 1, 0)));
  }
  function prev(): void {
    setShowAns(false);
    setIdx((i) => Math.max(i - 1, 0));
  }
  function reshuffle(): void {
    setOrder((o) => shuffle(o));
    setIdx(0);
    setShowAns(false);
  }

  async function handleSave(): Promise<void> {
    if (!deck.length) {
      toast.info("Nothing to save yet.");
      return;
    }
    const title = prompt("Name this flashcard set:");
    if (!title || !title.trim()) return;

    try {
      toast.loading("Saving flashcards…", { id: "save-fc" });
      const id = await saveFlashcards(title.trim(), deck);
      toast.success("Saved to your dashboard.", { id: "save-fc" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not save.", { id: "save-fc" });
    }
  }

  // regenerate() omitted here for brevity; keep your current implementation.
  // If you don't have it in this file, remove the button.

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Flashcards</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reshuffle}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={!deck.length}
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={!deck.length}
          >
            Save
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {!deck.length ? (
          <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">
            Upload a document to generate flashcards.
          </div>
        ) : (
          <div className="flex flex-col items-stretch">
            <div className="rounded-xl border p-5">
              <p className="mb-1 text-sm uppercase tracking-wide text-zinc-500">
                Card {idx + 1} / {order.length}
              </p>
              <div className="text-base font-medium leading-relaxed">{current?.q}</div>

              {showAns ? (
                <div className="mt-4 rounded-lg border bg-zinc-50 p-3">
                  <div className="text-sm text-zinc-600">Answer</div>
                  <div className="mt-1 leading-relaxed">{current?.a}</div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAns(true)}
                  className="mt-4 rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
                >
                  Reveal
                </button>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={prev}
                disabled={idx === 0}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={next}
                disabled={idx >= order.length - 1}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
