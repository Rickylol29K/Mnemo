"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QA = { q: string; a: string };

type MCQ = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Quiz({ items }: { items: QA[] }) {
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // Build multiple-choice from flashcards
  useEffect(() => {
    if (!items?.length) {
      setQuestions([]);
      return;
    }
    const allAnswers = items.map((x) => x.a);
    const mc: MCQ[] = items.map((item) => {
      // pick up to 3 distractors that are not the correct answer
      const distractorPool = allAnswers.filter((a) => a !== item.a);
      const distractors = shuffle(distractorPool).slice(0, 3);
      const options = shuffle([item.a, ...distractors]);
      const correctIndex = options.findIndex((o) => o === item.a);
      return {
        prompt: item.q,
        options,
        correctIndex,
      };
    });
    setQuestions(mc);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  }, [items]);

  const total = questions.length;
  const current = questions[idx];

  const select = (i: number) => {
    if (picked !== null) return; // already answered this question
    setPicked(i);
    if (i === current.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    if (idx + 1 < total) {
      setIdx((i) => i + 1);
      setPicked(null);
    } else {
      setFinished(true);
    }
  };

  const restart = () => {
    // reshuffle order for variety
    const shuffled = shuffle(questions);
    setQuestions(shuffled);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  if (!items?.length) return null;
  if (!current && !finished) return null;

  if (finished) {
    const pct = total ? Math.round((score / total) * 100) : 0;
    return (
      <Card className="animate-in-slow">
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="rounded-xl border p-6 bg-white">
            <div className="text-lg font-medium">
              Score: {score} / {total} ({pct}%)
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Nice! You can retake for a different order and options.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={restart}>Retake Quiz</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-in-slow">
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <CardTitle>
          Quiz Mode{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({idx + 1}/{total})
          </span>
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          Score: {score}
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* Prompt */}
        <div className="rounded-xl border p-6 bg-white">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Question
          </div>
          <div className="mt-1 text-lg font-medium">{current.prompt}</div>
        </div>

        {/* Options */}
        <div className="grid gap-2">
          {current.options.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = i === current.correctIndex;
            const showState = picked !== null;

            const base =
              "w-full text-left rounded-xl border px-4 py-3 text-sm transition focus-visible:focus-ring";
            const color =
              showState && isPicked && isCorrect
                ? "border-green-500 bg-green-50"
                : showState && isPicked && !isCorrect
                ? "border-red-500 bg-red-50"
                : showState && !isPicked && isCorrect
                ? "border-green-500/60"
                : "border-zinc-300 hover:bg-zinc-50";

            return (
              <button
                key={i}
                className={`${base} ${color}`}
                onClick={() => select(i)}
                disabled={picked !== null}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={next} disabled={picked === null}>
            {idx + 1 < total ? "Next" : "Finish"}
          </Button>
          <Button variant="secondary" onClick={restart}>
            Restart
          </Button>
        </div>

        {/* Tip */}
        <p className="text-xs text-muted-foreground">
          Tip: After answering, correct/incorrect is highlighted. Click **Next** to continue.
        </p>
      </CardContent>
    </Card>
  );
}
