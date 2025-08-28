"use client";

import React, { useMemo, useRef } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import Markdown from "./Markdown";
import { toast } from "sonner";

export default function SummaryBlock() {
  const { summary, extras } = useStudyStore((s) => ({
    summary: s.summary,
    extras: s.extras,
  }));

  const mdString = useMemo(() => {
    const parts: string[] = [];

    // If the author provided headings / code blocks, we include verbatim.
    // Otherwise, format as a bullet list.
    for (const item of summary ?? []) {
      const trimmed = (item || "").trim();
      if (!trimmed) continue;
      const isHeading = /^#{1,6}\s+/.test(trimmed);
      const isFence = /^```/.test(trimmed);
      if (isHeading || isFence) {
        parts.push(trimmed);
      } else {
        // allow inline bold/italics/`code` within bullets
        parts.push(`- ${trimmed}`);
      }
    }

    if (extras?.keyTerms?.length) {
      parts.push("\n---\n");
      parts.push("### Key Terms");
      parts.push(
        extras.keyTerms.map((t) => `- \`${t}\``).join("\n")
      );
    }

    return parts.join("\n");
  }, [summary, extras?.keyTerms]);

  const textForCopy = useRef(mdString);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(textForCopy.current);
      toast.success("Summary copied as Markdown");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }

  function handleDownload() {
    const blob = new Blob([mdString], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!summary?.length) {
    return (
      <div className="rounded-xl border bg-white p-6 text-zinc-600">
        Upload a document to generate a summary.
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Summary</h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Copy
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Download .md
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        <Markdown content={mdString} />
      </div>
    </div>
  );
}
