"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useStudyStore } from "@/store/useStudyStore";
import { saveFlashcards } from "@/lib/db";
import { supabase } from "@/lib/supabase-browser";

type Card = { q: string; a: string };

type Extras = {
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: { q: string; a: string }[];
};

type AIResponse = {
  summary: string[];
  flashcards: Card[];
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: { q: string; a: string }[];
};

type Props = {
  /** Optional explicit deck. If omitted, component uses the global store. */
  items?: Card[];
};

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function updateStoreSafely(payload: Partial<AIResponse>) {
  try {
    const anyStore = useStudyStore as unknown as {
      getState: () => Record<string, unknown>;
      setState: (u: any) => void;
    };
    const st = anyStore.getState?.() ?? {};
    (st as any).setFlashcards?.(payload.flashcards);
    (st as any).setKeyTerms?.(payload.keyTerms);
    (st as any).setExtras?.({
      keyTerms: payload.keyTerms,
      analogies: payload.analogies,
      pitfalls: payload.pitfalls,
      practice: payload.practice,
    });
    (st as any).setSummary?.(payload.summary);
  } catch {
    /* noop */
  }
}

export default function Flashcards({ items }: Props) {
  const storeDeck = (useStudyStore((s) => s.flashcards) as Card[]) ?? [];
  const rawText = (useStudyStore((s) => s.rawText) as string | null) ?? null;
  useStudyStore((s) => s.extras as Extras | undefined); // subscribe, even if unused directly

  const initial = Array.isArray(items) && items.length ? items : storeDeck;

  const [deck, setDeck] = useState<Card[]>(initial);
  const [order, setOrder] = useState<number[]>([]);
  const [idx, setIdx] = useState(0);
  const [showAns, setShowAns] = useState(false);
  const [busy, setBusy] = useState(false);

  // Update if props.items change OR store changes
  useEffect(() => {
    setDeck(Array.isArray(items) && items.length ? items : storeDeck);
  }, [JSON.stringify(items), storeDeck]);

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

  function next() {
    setShowAns(false);
    setIdx((i) => Math.min(i + 1, Math.max(order.length - 1, 0)));
  }
  function prev() {
    setShowAns(false);
    setIdx((i) => Math.max(i - 1, 0));
  }
  function reshuffle() {
    setOrder((o) => shuffle(o));
    setIdx(0);
    setShowAns(false);
  }

  async function handleSave() {
    if (!deck.length) {
      toast.info("Nothing to save yet.");
      return;
    }
    const title = prompt("Name this flashcard set:");
    if (!title || !title.trim()) return;

    try {
      toast.loading("Saving flashcards…", { id: "save-fc" });
      await saveFlashcards(title.trim(), deck);
      toast.success("Saved to your dashboard.", { id: "save-fc" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Could not save.", { id: "save-fc" });
    }
  }

  /** Fresh run via /api/process with explicit Bearer token */
  async function regenerate() {
    if (!rawText || rawText.trim().length < 10) {
      toast.info("Upload some notes first.");
      return;
    }
    setBusy(true);
    try {
      toast.loading("Regenerating flashcards…", { id: "regen-fc" });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/process?ts=" + Date.now(), {
        method: "POST",
        headers,
        body: JSON.stringify({ text: rawText }),
      });

      if (res.status === 403) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload?.error || "Guest limit reached. Please log in.");
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to regenerate.");
      }

      const ai = (await res.json()) as AIResponse;
      const fresh = Array.isArray(ai.flashcards) ? ai.flashcards : [];

      setDeck(fresh);
      updateStoreSafely(ai);

      toast.success("New flashcards generated.", { id: "regen-fc" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong.", { id: "regen-fc" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Flashcards</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={reshuffle}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={!deck.length || busy}
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={regenerate}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={busy || !rawText}
            title={!rawText ? "Upload notes first" : "Regenerate fresh cards"}
          >
            {busy ? "Working…" : "Regenerate"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
            disabled={!deck.length || busy}
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
              <div className="text-base font-medium leading-relaxed">
                {current?.q}
              </div>

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
