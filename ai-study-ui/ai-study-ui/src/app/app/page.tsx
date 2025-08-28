"use client";

import { useState } from "react";
import FileDrop from "@/components/FileDrop";
import SummaryBlock from "@/components/SummaryBlock";
import Flashcards from "@/components/Flashcards";
import Quiz from "@/components/Quiz";
import Tutor from "@/components/Tutor";
import { useStudyStore } from "@/store/useStudyStore";
import { Button } from "@/components/ui/button";

type Tab = "summary" | "flashcards" | "quiz";

export default function AppPage() {
  const { summary, flashcards } = useStudyStore();
  const [tab, setTab] = useState<Tab>("summary");

  const hasSummary = (summary?.length ?? 0) > 0;
  const hasFlashcards = (flashcards?.length ?? 0) > 0;

  return (
    <main className="container max-w-5xl mx-auto px-6 py-8 space-y-6">
      {/* Upload / Paste */}
      <section>
        <FileDrop />
      </section>

      {/* Actions bar: only show when we have a summary */}
      {hasSummary && (
        <section className="flex flex-wrap items-center gap-2">
          <TabButton label="Summary" active={tab === "summary"} onClick={() => setTab("summary")} />
          <TabButton
            label={`Flashcards${hasFlashcards ? ` (${flashcards.length})` : ""}`}
            active={tab === "flashcards"}
            onClick={() => setTab("flashcards")}
          />
          <TabButton label="Quiz" active={tab === "quiz"} onClick={() => setTab("quiz")} />

          {/* Tutor button lives NEXT TO Flashcards / Quiz */}
          <Tutor />
        </section>
      )}

      {/* Content */}
      <section className="space-y-6">
        {!hasSummary ? (
          <p className="text-sm text-zinc-600">
            Upload or paste a document to generate your study pack (summary + flashcards + tutor).
          </p>
        ) : tab === "summary" ? (
          <SummaryBlock summary={summary} />
        ) : tab === "flashcards" ? (
          <Flashcards items={flashcards} />
        ) : (
          <Quiz items={flashcards} />
        )}
      </section>
    </main>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? "primary" : "secondary"} onClick={onClick}>
      {label}
    </Button>
  );
}
