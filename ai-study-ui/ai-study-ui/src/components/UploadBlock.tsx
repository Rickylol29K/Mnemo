"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase-browser";
import { useStudyStore } from "@/store/useStudyStore";

type AIResp = {
  summary: string[];
  flashcards: { q: string; a: string }[];
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: { q: string; a: string }[];
};

export default function UploadBlock() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // optional setters (keep component safe even if some are missing)
  const setRawText = (useStudyStore.getState() as any)?.setRawText;
  const setSummary = (useStudyStore.getState() as any)?.setSummary;
  const setFlashcards = (useStudyStore.getState() as any)?.setFlashcards;
  const setKeyTerms = (useStudyStore.getState() as any)?.setKeyTerms;
  const setExtras = (useStudyStore.getState() as any)?.setExtras;

  async function generate() {
    if (text.trim().length < 10) {
      toast.info("Please paste more content first.");
      return;
    }
    setBusy(true);
    try {
      toast.loading("Generating study pack…", { id: "gen" });

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
        body: JSON.stringify({ text }),
      });

      if (res.status === 403) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload?.error || "Guest limit reached. Please log in.", { id: "gen" });
        return;
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || "Failed to process notes.");
      }

      const data = (await res.json()) as AIResp;

      setRawText?.(text);
      setSummary?.(Array.isArray(data.summary) ? data.summary : []);
      setFlashcards?.(Array.isArray(data.flashcards) ? data.flashcards : []);
      setKeyTerms?.(Array.isArray(data.keyTerms) ? data.keyTerms : []);
      setExtras?.({
        keyTerms: data.keyTerms ?? [],
        analogies: data.analogies ?? [],
        pitfalls: data.pitfalls ?? [],
        practice: data.practice ?? [],
      });

      toast.success("Study pack ready!", { id: "gen" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Something went wrong.", { id: "gen" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Upload / Paste Notes</h2>
      </div>
      <div className="px-6 py-5">
        <textarea
          className="min-h-[160px] w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste your lecture notes or reading here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-zinc-500">Tip: you can paste raw text from a PDF.</p>
          <button
            type="button"
            onClick={generate}
            disabled={busy || text.trim().length < 10}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Working…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
