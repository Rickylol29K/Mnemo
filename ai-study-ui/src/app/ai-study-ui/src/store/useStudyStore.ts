"use client";

import { create } from "zustand";

export type Flashcard = { q: string; a: string };

type Extras = {
  /** Plain list of key terms for chips */
  keyTerms?: string[];
  /** Map of term -> short definition (used for popovers) */
  termNotes?: Record<string, string>;
  /** Optional richer longform summary (markdown/paragraphs) */
  richSummary?: string;

  /** Kept for compatibility (not rendered on Summary page anymore) */
  practice?: Flashcard[];
  analogies?: string[];
  pitfalls?: string[];
};

type StudyState = {
  rawText: string | null;
  /** Short bullets for quick skim (we'll allow many more than before) */
  summary: string[];
  /** Flashcards used by Flashcards + Quiz tabs */
  flashcards: Flashcard[];
  extras?: Extras;

  // setters
  setRawText: (text: string | null) => void;
  setSummary: (items: string[]) => void;
  setFlashcards: (items: Flashcard[]) => void;
  setExtras: (extras?: Extras) => void;

  reset: () => void;
};

export const useStudyStore = create<StudyState>((set) => ({
  rawText: null,
  summary: [],
  flashcards: [],
  extras: undefined,

  setRawText: (text) => set({ rawText: text }),
  setSummary: (items) => set({ summary: Array.isArray(items) ? items : [] }),
  setFlashcards: (items) => set({ flashcards: Array.isArray(items) ? items : [] }),
  setExtras: (extras) => set({ extras }),

  reset: () => set({ rawText: null, summary: [], flashcards: [], extras: undefined }),
}));
