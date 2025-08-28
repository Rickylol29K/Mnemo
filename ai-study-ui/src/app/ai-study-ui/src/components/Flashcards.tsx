"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QA = { q: string; a: string };

export default function Flashcards({ items }: { items: QA[] }) {
  const [order, setOrder] = useState<number[]>(() => items.map((_, i) => i));
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setOrder(items.map((_, i) => i));
    setIdx(0);
    setShow(false);
  }, [items]);

  if (!items?.length) return null;

  const curr = useMemo(() => items[order[idx]], [items, order, idx]);
  const pos = idx + 1;
  const total = items.length;

  const prev = () => {
    setShow(false);
    setIdx((i) => (i - 1 + total) % total);
  };
  const next = () => {
    setShow(false);
    setIdx((i) => (i + 1) % total);
  };
  const shuffle = () => {
    const shuffled = [...order].sort(() => Math.random() - 0.5);
    setOrder(shuffled);
    setIdx(0);
    setShow(false);
  };

  // keyboard shortcuts (only arrows now)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  return (
    <Card className="animate-in-slow">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <CardTitle>
          Flashcards{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({pos}/{total})
          </span>
        </CardTitle>
        <div className="flex gap-2">
          <Button onClick={shuffle} variant="secondary">
            Shuffle
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* Question */}
        <div className="rounded-xl border p-6 bg-white">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Question
          </div>
          <div className="mt-1 text-lg font-medium">{curr.q}</div>
        </div>

        {/* Answer */}
        <div className="rounded-xl border p-6 bg-white min-h-[4rem] relative overflow-hidden">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Answer
          </div>
          {show ? (
            <div
              key={idx} // re-mount on each card change
              className="mt-1 text-lg font-medium animate-in"
            >
              {curr.a}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              ••• Click Show Answer •••
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShow((s) => !s)}>
            {show ? "Hide" : "Show"} Answer
          </Button>
          <Button variant="secondary" onClick={prev}>
            Prev
          </Button>
          <Button variant="secondary" onClick={next}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
