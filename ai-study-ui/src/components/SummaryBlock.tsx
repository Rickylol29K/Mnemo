"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  /** Array of markdown blocks (each item may contain headings, lists, code fences, etc.) */
  summary: string[];
};

export default function SummaryBlock({ summary }: Props) {
  if (!Array.isArray(summary) || summary.length === 0) return null;

  const joined = summary.join("\n\n");

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(joined);
    } catch {
      /* no-op */
    }
  };

  const download = () => {
    const blob = new Blob([joined], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "summary.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Summary</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copyAll}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Copy
          </button>
          <button
            type="button"
            onClick={download}
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Download .md
          </button>
        </div>
      </div>

      <div className="prose prose-zinc max-w-none px-6 py-5">
        {summary.map((block, i) => (
          <div key={i} className={i > 0 ? "mt-6" : ""}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block}</ReactMarkdown>
          </div>
        ))}
      </div>
    </div>
  );
}
