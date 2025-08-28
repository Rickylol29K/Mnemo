"use client";

import { useRef, useState } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { Button } from "@/components/ui/button";
import { pdfToText } from "@/lib/pdf";

type Flashcard = { q: string; a: string };

// Toggle to true whenever you want the audio UI back (kept hidden for now)
const SHOW_AUDIO = false;

export default function UploadBlock() {
  const { setRawText, setSummary, setFlashcards, setExtras } = useStudyStore();

  const [status, setStatus] = useState<null | string>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  // ---- Audio state & refs (kept, but UI hidden) ----
  const [recording, setRecording] = useState(false);
  const [lang, setLang] = useState<string>("en");
  const mrRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  function applyResults({
    text,
    summary,
    keyTerms,
    termNotes,
    flashcards,
    richSummary,
  }: {
    text: string;
    summary: string[];
    keyTerms: string[];
    termNotes: Record<string, string>;
    flashcards: Flashcard[];
    richSummary?: string;
  }) {
    setRawText(text);
    setSummary(Array.isArray(summary) ? summary : []);
    setFlashcards(Array.isArray(flashcards) ? flashcards : []);
    const prev = useStudyStore.getState().extras;
    setExtras({
      ...(prev ?? {}),
      keyTerms: Array.isArray(keyTerms) ? keyTerms : prev?.keyTerms,
      termNotes: termNotes || prev?.termNotes,
      richSummary: richSummary ?? prev?.richSummary,
      // keep practice untouched; we’re not rendering it on Summary now
    });
  }

  async function generateFromText(text: string) {
    setRawText(text);
    setStatus("Generating detailed lesson…");
    try {
      // --- RICHER TEACHING PROMPT ---
      const system =
        "You are an expert study tutor. Produce a detailed teaching summary with examples and analogies. Be thorough and student-friendly.";
      const messages = [
        {
          role: "system",
          content:
            system +
            `
Return ONLY JSON with these keys:

- richSummary (string): multi-paragraph markdown. Include:
  1) Overview (what/why),
  2) Key ideas explained step-by-step,
  3) Worked example(s),
  4) Analogies to build intuition,
  5) Common pitfalls & misconceptions,
  6) Tips/heuristics, and
  7) Mini recap checklist.
- summary (array of 15–35 concise bullet strings): a dense outline students can skim.
- keyTermsDetailed (array): objects like { "term": "...", "short": "one-sentence definition" } (10–20 items).
- flashcards (array of {q,a}, 10–16 items): factual/short-answer only.

NO extra text, no code fences. Keep content grounded only in the provided text.
`,
        },
        {
          role: "user",
          content:
            "Create the JSON lesson from this text:\n\n" + text.slice(0, 16000),
        },
      ];

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, context: text }),
      });
      const data = await res.json();

      const raw = String(data?.answer || "");
      // Try to parse JSON even if the model forgot and returned plain text-like JSON
      const jsonStr = (raw.match(/\{[\s\S]*\}/) || [raw])[0];

      let parsed: any = null;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = null;
      }

      const summary = Array.isArray(parsed?.summary) ? parsed.summary : [];
      const flashcards = Array.isArray(parsed?.flashcards) ? parsed.flashcards : [];

      // key terms may be strings or objects; normalize:
      const termNotes: Record<string, string> = {};
      const termsList: string[] = [];
      const kt = Array.isArray(parsed?.keyTermsDetailed)
        ? parsed.keyTermsDetailed
        : Array.isArray(parsed?.keyTerms)
        ? parsed.keyTerms
        : [];

      for (const item of kt as any[]) {
        if (!item) continue;
        if (typeof item === "string") {
          termsList.push(item);
          // no definition provided
        } else if (typeof item === "object") {
          const t = String(item.term ?? item.name ?? "").trim();
          const s = String(item.short ?? item.def ?? item.definition ?? "").trim();
          if (t) termsList.push(t);
          if (t && s) termNotes[t] = s;
        }
      }

      const richSummary = typeof parsed?.richSummary === "string" ? parsed.richSummary : undefined;

      applyResults({
        text,
        summary,
        keyTerms: termsList,
        termNotes,
        flashcards,
        richSummary,
      });
      setStatus(null);
    } catch (e) {
      setStatus("Failed to generate lesson.");
    }
  }

  // -------------------- Documents --------------------
  async function handleDoc(file: File) {
    if (!file) return;
    setFileName(file.name);

    const name = file.name.toLowerCase();
    const isTxt = file.type === "text/plain" || name.endsWith(".txt");
    const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");

    if (isTxt) {
      setStatus("Reading TXT…");
      const text = await file.text();
      await generateFromText(text);
      return;
    }

    if (isPdf) {
      setStatus("Reading PDF…");
      try {
        const text = await pdfToText(file, 50); // client-side PDF.js
        if (!text) {
          setStatus("Couldn't read any text from the PDF.");
          return;
        }
        await generateFromText(text);
      } catch (err: any) {
        setStatus(`PDF read failed: ${err?.message || String(err)}`);
      }
      return;
    }

    setStatus("Unsupported file type.");
  }

  function onDocInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleDoc(f);
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleDoc(f);
  }

  // -------------------- Audio (kept, UI hidden) --------------------
  async function sendToTranscribe(file: File) {
    setStatus(`Transcribing audio (${lang})…`);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("lang", lang);
    const res = await fetch("/api/transcribe", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
    const text = String(data?.text || "");
    await generateFromText(text);
  }

  async function handleAudioUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await sendToTranscribe(file);
    } catch (err: any) {
      setStatus(`Transcription failed: ${err?.message || String(err)}`);
    }
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    mrRef.current = mr;
    chunksRef.current = [];

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const file = new File([blob], "recording.webm", { type: "audio/webm" });
      try {
        await sendToTranscribe(file);
      } catch (err: any) {
        setStatus(`Transcription failed: ${err?.message || String(err)}`);
      }
    };

    mr.start();
    setRecording(true);
  }

  function stopRecording() {
    mrRef.current?.stop();
    setRecording(false);
  }

  // -------------------- UI --------------------
  const isBusy = !!status && /reading|transcrib|generating|upload/i.test(status);

  return (
    <div className="rounded-3xl border bg-white/70 backdrop-blur p-6 shadow-sm ring-1 ring-black/5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-white grid place-items-center shadow-inner">
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
            <path
              fill="currentColor"
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm1 7V3.5L19.5 9H15Z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold tracking-tight">Upload Notes</h3>
          <p className="text-sm text-muted-foreground">
            PDFs are read in the browser with PDF.js. TXTs process instantly.
          </p>
        </div>
      </div>

      {/* Dropzone */}
      <div className="mt-4">
        <label
          htmlFor="doc-input"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={[
            "relative block w-full cursor-pointer rounded-2xl border-2 border-dashed transition",
            dragOver
              ? "border-indigo-500 bg-indigo-50/60"
              : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/40",
          ].join(" ")}
        >
          <input
            id="doc-input"
            ref={docInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={onDocInputChange}
            className="sr-only"
          />
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
            <div className="rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 p-3">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-zinc-700" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 16a1 1 0 0 1-1-1V7.41L8.7 9.7a1 1 0 1 1-1.4-1.42l4-4a1 1 0 0 1 1.4 0l4 4a1 1 0 1 1-1.4 1.42L13 7.4V15a1 1 0 0 1-1 1Zm7 3H5a1 1 0 0 1 0-2h14a1 1 0 0 1 0 2Z"
                />
              </svg>
            </div>
            <div className="text-sm">
              <span className="font-medium">Drag & drop</span> your PDF/TXT here
            </div>
            <div className="text-xs text-zinc-500">or</div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => docInputRef.current?.click()}
              >
                Choose File
              </Button>
              {fileName && (
                <span className="text-xs text-zinc-600 truncate max-w-[260px]">
                  {fileName}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-500">
              <span className="rounded-full border px-2 py-0.5 bg-white">.pdf</span>
              <span className="rounded-full border px-2 py-0.5 bg-white">.txt</span>
              <span>Max ~20MB • Up to 50 pages processed</span>
            </div>
          </div>
        </label>
      </div>

      {/* Status */}
      {status && (
        <div
          className={[
            "mt-4 rounded-2xl border px-3 py-2 text-sm",
            /failed|couldn|unsupported/i.test(status)
              ? "border-red-300 bg-red-50 text-red-700"
              : "border-zinc-200 bg-zinc-50 text-zinc-700",
          ].join(" ")}
        >
          <span className="inline-flex items-center gap-2">
            {isBusy && <Spinner className="h-4 w-4" />}
            {status}
          </span>
        </div>
      )}

      {/* AUDIO UI HIDDEN — flip SHOW_AUDIO to true to bring back */}
      {SHOW_AUDIO && (
        <div className="mt-6 rounded-2xl border p-4">
          {/* kept but hidden — no changes */}
          <input type="file" accept="audio/*" onChange={() => { /* noop */ }} className="hidden" />
        </div>
      )}
    </div>
  );
}

function Spinner(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props} className={`${props.className ?? ""} animate-spin`}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
