"use client";

import { supabase } from "./supabase-browser";

/* ---------- Types ---------- */

export type Flashcard = { q: string; a: string };
export type QuizQ = { prompt: string; options: string[]; correctIndex: number };

export type StudySet = {
  id: string;
  user_id: string;
  type: "flashcards" | "quiz";
  title: string;
  created_at: string;
  updated_at: string;
  card_count: number;
  question_count: number;
};

/* ---------- Auth helper ---------- */

export async function requireUser() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user;
}

/* ---------- Save helpers (existing) ---------- */

export async function saveFlashcards(title: string, cards: Flashcard[]) {
  const user = await requireUser();

  const { data: set, error: setErr } = await supabase
    .from("study_sets")
    .insert({
      user_id: user.id,
      type: "flashcards",
      title,
      card_count: cards.length,
    })
    .select("id")
    .single();
  if (setErr) throw setErr;

  if (cards.length) {
    const rows = cards.map((c, i) => ({
      set_id: set.id,
      q: c.q,
      a: c.a,
      position: i,
    }));
    const { error } = await supabase.from("flashcard_items").insert(rows);
    if (error) throw error;
  }

  return set.id as string;
}

export async function saveQuiz(title: string, qs: QuizQ[]) {
  const user = await requireUser();

  const { data: set, error: setErr } = await supabase
    .from("study_sets")
    .insert({
      user_id: user.id,
      type: "quiz",
      title,
      question_count: qs.length,
    })
    .select("id")
    .single();
  if (setErr) throw setErr;

  if (qs.length) {
    const rows = qs.map((q, i) => ({
      set_id: set.id,
      prompt: q.prompt,
      options: q.options, // jsonb
      correct_index: q.correctIndex,
      position: i,
    }));
    const { error } = await supabase.from("quiz_questions").insert(rows);
    if (error) throw error;
  }

  return set.id as string;
}

/* ---------- List & Get ---------- */

export async function listStudySets(): Promise<StudySet[]> {
  await requireUser();
  const { data, error } = await supabase
    .from("study_sets")
    .select(
      "id, user_id, type, title, created_at, updated_at, card_count, question_count"
    )
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StudySet[];
}

/**
 * Load a study set and its items (flashcards or quiz questions).
 * RLS ensures users can only access their own.
 */
export async function getStudySetWithItems(id: string): Promise<{
  set: StudySet | null;
  flashcards?: Flashcard[];
  quiz?: QuizQ[];
}> {
  await requireUser();

  const { data: set, error: setErr } = await supabase
    .from("study_sets")
    .select(
      "id, user_id, type, title, created_at, updated_at, card_count, question_count"
    )
    .eq("id", id)
    .single();

  if (setErr) throw setErr;
  if (!set) return { set: null };

  if (set.type === "flashcards") {
    const { data: items, error } = await supabase
      .from("flashcard_items")
      .select("q, a, position")
      .eq("set_id", id)
      .order("position", { ascending: true });
    if (error) throw error;
    const flashcards =
      (items ?? []).map((r: any) => ({ q: String(r.q), a: String(r.a) })) || [];
    return { set: set as StudySet, flashcards };
  }

  // quiz
  const { data: qitems, error } = await supabase
    .from("quiz_questions")
    .select("prompt, options, correct_index, position")
    .eq("set_id", id)
    .order("position", { ascending: true });
  if (error) throw error;
  const quiz =
    (qitems ?? []).map((r: any) => ({
      prompt: String(r.prompt),
      options: Array.isArray(r.options) ? r.options.map(String) : [],
      correctIndex: Number(r.correct_index),
    })) || [];
  return { set: set as StudySet, quiz };
}
