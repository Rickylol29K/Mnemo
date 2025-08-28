"use client";

import { useMemo, useState } from "react";
import UploadBlock from "@/components/UploadBlock";
import SummaryBlock from "@/components/SummaryBlock";
import Tutor from "@/components/Tutor";
import QuizBlock from "@/components/QuizBlock";
import { useStudyStore } from "@/store/useStudyStore";
import { Button } from "@/components/ui/button";

type Tab = "summary" | "flashcards" | "quiz";

export default function AppPage() {
  const { summary, flashcards } = useStudyStore();

  const safeSummary = Array.isArray(summary) ? summary : [];
  const safeFlashcards = Array.isArray(flashcards) ? flashcards : [];
  const hasData = safeSummary.length > 0 || safeFlashcards.length > 0;
  const canQuiz = safeFlashcards.length > 0;

  const [tab, setTab] = useState<Tab>("summary");

  const emptyHint = useMemo(
    () =>
      !hasData ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Upload a PDF or TXT and I’ll build a summary + flashcards here.
        </div>
      ) : null,
    [hasData]
  );

  return (
    <div className="grid gap-6">
      <UploadBlock />
      <Tutor />

      {/* Tabs row */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={tab === "summary" ? "primary" : "ghost"}
          onClick={() => setTab("summary")}
        >
          Summary
        </Button>

        <Button
          type="button"
          variant={tab === "flashcards" ? "primary" : "ghost"}
          onClick={() => setTab("flashcards")}
        >
          Flashcards
        </Button>

        <Button
          type="button"
          variant={tab === "quiz" ? "primary" : "ghost"}
          onClick={() => canQuiz && setTab("quiz")}
          disabled={!canQuiz}
          title={canQuiz ? "Quiz" : "Add flashcards first"}
        >
          Quiz
        </Button>
      </div>

      {!hasData && emptyHint}

      {tab === "summary" && <SummaryBlock summary={safeSummary} />}

      {tab === "flashcards" && <FlashcardsSection items={safeFlashcards} />}

      {tab === "quiz" && canQuiz && <QuizBlock items={safeFlashcards} />}
    </div>
  );
}

/** Minimal flashcards renderer, if you don't have a dedicated component. */
function FlashcardsSection({ items }: { items: Array<{ q: string; a: string }> }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        No flashcards yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((fc, i) => (
        <div key={`${i}-${fc.q?.slice(0, 24)}`} className="rounded-xl border p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Question</div>
          <div className="font-medium">{fc.q}</div>
          <div className="mt-3 text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Answer
          </div>
          <div>{fc.a}</div>
        </div>
      ))}
    </div>
  );
}
