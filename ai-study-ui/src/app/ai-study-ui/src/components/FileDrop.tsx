"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "@/components/ui/sonner";
import { pdfToText } from "@/lib/pdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Mode = "idle" | "reading" | "processing";

const ACCEPT = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md", ".markdown"],
};

type APIResp = {
  summary: string[];
  flashcards: { q: string; a: string }[];
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: { q: string; a: string }[];
};

export default function FileDrop() {
  const [mode, setMode] = useState<Mode>("idle");
  const [filename, setFilename] = useState<string | null>(null);
  const [chars, setChars] = useState(0);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { setAll } = useStudyStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles?.length) return;
      const file = acceptedFiles[0];
      setFilename(file.name);
      setMode("reading");

      try {
        let text = "";
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          text = await pdfToText(file, 30);
        } else if (file.type.startsWith("text/") || /\.(txt|md|markdown)$/i.test(file.name)) {
          text = await file.text();
        } else {
          throw new Error("Unsupported file type. Use PDF, TXT, or MD.");
        }

        text = text.trim();
        setChars(text.length);
        if (text.length < 10) throw new Error("Your document seems empty. Add more content.");

        setMode("processing");
        const data = await processWithAPI(text);
        setAll(data.summary, data.flashcards, text, {
          keyTerms: data.keyTerms,
          analogies: data.analogies,
          pitfalls: data.pitfalls,
          practice: data.practice,
        });
        toast.success("Study pack generated: summary + flashcards + extras.");
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || "Failed to process file.");
      } finally {
        setMode("idle");
      }
    },
    [setAll]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: ACCEPT,
    maxFiles: 1,
    noClick: true,
    onDrop,
  });

  const handleProcessPaste = async () => {
    const text = pasteValue.trim();
    if (text.length < 10) {
      toast.error("Please paste more text (at least a couple sentences).");
      textareaRef.current?.focus();
      return;
    }
    try {
      setMode("processing");
      const data = await processWithAPI(text);
      setAll(data.summary, data.flashcards, text, {
        keyTerms: data.keyTerms,
        analogies: data.analogies,
        pitfalls: data.pitfalls,
        practice: data.practice,
      });
      toast.success("Study pack generated: summary + flashcards + extras.");
    } catch (e: any) {
      toast.error(e?.message || "Failed to process text.");
    } finally {
      setMode("idle");
    }
  };

  const sampleText = useMemo(
    () =>
      `JAVA ARRAYS – QUICK NOTES

- Arrays are fixed-size, same-type collections.
- Declare: int[] nums = new int[5];
- Index: 0..length-1
- Access/assign: nums[2] = 42;
- nums.length
- for (int n : nums) { ... }
- int[][] grid = new int[3][4];`,
    []
  );

  const disabled = mode !== "idle";

  return (
    <Card className="border-dashed animate-in">
      <CardContent className="p-0">
        <div
          {...getRootProps()}
          className={[
            "relative rounded-2xl border-dashed border-2 p-8 md:p-10 text-center transition",
            isDragActive ? "border-blue-500 bg-blue-50/40" : "border-zinc-200 bg-white",
          ].join(" ")}
        >
          <input {...getInputProps()} />

          <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
            <div className="rounded-full border p-3 motion-safe:animate-float">
              <UploadIcon className="size-7" />
            </div>

            <h3 className="text-lg font-semibold">Drop your lecture PDF or notes</h3>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={open} disabled={disabled}>
                {mode === "reading" ? "Reading…" : mode === "processing" ? "Generating…" : "Choose file"}
              </Button>
              <Button variant="secondary" onClick={() => setShowPaste((s) => !s)} disabled={disabled}>
                {showPaste ? "Hide paste area" : "Paste text instead"}
              </Button>
              <button
                type="button"
                className="text-sm underline underline-offset-4 disabled:opacity-50"
                onClick={() => {
                  setPasteValue(sampleText);
                  setShowPaste(true);
                }}
                disabled={disabled}
              >
                Try a sample
              </button>
            </div>

            {filename && (
              <p className="text-xs text-muted-foreground">
                {filename} {chars > 0 ? ` • ${chars.toLocaleString()} chars` : ""}
              </p>
            )}

            {showPaste && (
              <div className="w-full animate-in">
                <textarea
                  ref={textareaRef}
                  value={pasteValue}
                  onChange={(e) => setPasteValue(e.target.value)}
                  placeholder="Paste your notes here…"
                  rows={8}
                  className="w-full resize-y rounded-xl border px-4 py-3 text-sm focus-visible:focus-ring"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button onClick={handleProcessPaste} disabled={disabled}>
                    {mode === "processing" ? "Generating…" : "Generate"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {mode !== "idle" && (
            <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-sm">
                <Spinner className="size-4" />
                {mode === "reading" ? "Extracting text…" : "Talking to the model…"}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function processWithAPI(text: string): Promise<APIResp> {
  const res = await fetch("/api/process", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return (await res.json()) as APIResp;
}

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M12 16V4m0 0 4 4m-4-4L8 8M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
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
