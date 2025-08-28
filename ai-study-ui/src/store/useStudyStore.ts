import { create } from "zustand";

type QA = { q: string; a: string };

type Extras = {
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: QA[];
};

type StudyState = {
  summary: string[];
  flashcards: QA[];
  rawText: string | null;
  extras: Extras;
  setAll: (
    summary: string[],
    flashcards: QA[],
    rawText: string,
    extras?: Partial<Extras>
  ) => void;
};

const emptyExtras: Extras = {
  keyTerms: [],
  analogies: [],
  pitfalls: [],
  practice: [],
};

export const useStudyStore = create<StudyState>((set) => ({
  summary: [],
  flashcards: [],
  rawText: null,
  extras: emptyExtras,
  setAll: (summary, flashcards, rawText, extras) =>
    set({
      summary,
      flashcards,
      rawText,
      extras: { ...emptyExtras, ...(extras ?? {}) },
    }),
}));
