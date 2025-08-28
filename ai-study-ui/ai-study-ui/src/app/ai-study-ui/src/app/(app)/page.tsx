"use client";

import FileDrop from "@/components/FileDrop";
import SummaryBlock from "@/components/SummaryBlock";
import Flashcards from "@/components/Flashcards";
import { useStudyStore } from "@/store/useStudyStore";

export default function AppPage() {
  const { summary, flashcards } = useStudyStore();

  return (
    <div className="grid gap-6">
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Study Tool</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Drop a lecture PDF or paste notes — get a crisp summary and ready-to-use flashcards.
        </p>
      </div>

      <FileDrop />

      {summary.length > 0 && <SummaryBlock summary={summary} />}
      {flashcards.length > 0 && <Flashcards items={flashcards} />}
    </div>
  );
}
