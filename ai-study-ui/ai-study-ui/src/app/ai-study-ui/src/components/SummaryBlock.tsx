"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { useStudyStore } from "@/store/useStudyStore";

/** ---------- Small, dependency-free Markdown renderer ----------
 * Supports:
 *  - Headings: # .. ######
 *  - Paragraphs
 *  - Unordered lists: -, *
 *  - Ordered lists: 1. / 1)
 *  - Inline: **bold**, *italic*, `code`
 *  - We still parse fenced code blocks separately (```lang ... ```)
 */

type Seg =
  | { type: "text"; text: string }
  | { type: "code"; lang: string | null; code: string };

function splitFences(input: string): Seg[] {
  if (!input) return [{ type: "text", text: "" }];
  const parts: Seg[] = [];
  const fence = /```(\w+)?\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(input))) {
    if (m.index > last) parts.push({ type: "text", text: input.slice(last, m.index) });
    parts.push({ type: "code", lang: (m[1] || "").trim() || null, code: m[2] });
    last = fence.lastIndex;
  }
  if (last < input.length) parts.push({ type: "text", text: input.slice(last) });
  return parts;
}

function renderInline(text: string): ReactNode[] {
  // Handle `inline code` first (don’t process bold/italic inside it)
  const out: ReactNode[] = [];
  const codeRe = /`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = codeRe.exec(text))) {
    if (m.index > last) out.push(renderStrongEm(text.slice(last, m.index)));
    out.push(
      <code key={`ic-${last}`} className="rounded bg-zinc-100 px-1.5 py-0.5 text-[0.9em]">
        {m[1]}
      </code>
    );
    last = codeRe.lastIndex;
  }
  if (last < text.length) out.push(renderStrongEm(text.slice(last)));
  return out;
}

function renderStrongEm(s: string): ReactNode {
  // **bold** and *italic*
  const boldIt = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = boldIt.exec(s))) {
    if (m.index > last) nodes.push(s.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      nodes.push(
        <strong key={`b-${m.index}`} className="font-semibold">
          {token.slice(2, -2)}
        </strong>
      );
    } else {
      nodes.push(
        <em key={`i-${m.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    }
    last = boldIt.lastIndex;
  }
  if (last < s.length) nodes.push(s.slice(last));
  return <>{nodes}</>;
}

function renderMarkdown(md: string): ReactNode {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  function consumeParagraph(): string {
    const chunk: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      // stop if next block is a list or heading
      if (/^\s*([-*])\s+/.test(lines[i]) || /^\s*\d+[.)]\s+/.test(lines[i]) || /^\s*#{1,6}\s+/.test(lines[i])) {
        break;
      }
      chunk.push(lines[i]);
      i++;
    }
    return chunk.join("\n");
  }

  while (i < lines.length) {
    const line = lines[i];

    // blank -> skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // headings
    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const Tag = (["h1","h2","h3","h4","h5","h6"][level-1] as keyof JSX.IntrinsicElements);
      const cls =
        level === 1
          ? "text-3xl font-bold tracking-tight mt-6 mb-3"
          : level === 2
          ? "text-2xl font-semibold mt-6 mb-2"
          : level === 3
          ? "text-xl font-semibold mt-5 mb-2"
          : "text-lg font-semibold mt-4 mb-2";
      blocks.push(
        <Tag key={`h-${i}`} className={cls}>
          {renderInline(text)}
        </Tag>
      );
      i++;
      continue;
    }

    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc ml-6 space-y-1">
          {items.map((t, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(t)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ordered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal ml-6 space-y-1">
          {items.map((t, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(t)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // paragraph
    const para = consumeParagraph();
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed whitespace-pre-wrap">
        {renderInline(para)}
      </p>
    );
  }

  return <>{blocks}</>;
}

/** Pretty code fence renderer */
function CodeBlock({ code, lang }: { code: string; lang: string | null }) {
  const label = lang || "code";
  return (
    <div className="group relative rounded-xl border bg-zinc-50 overflow-hidden my-3">
      <div className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wide text-zinc-500 border-b">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(code).catch(() => {})}
          className="px-2 py-1 rounded-md border text-xs hover:bg-white"
        >
          Copy
        </button>
      </div>
      <pre className="p-3 overflow-auto text-sm leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function SummaryBlock({ summary }: { summary: string[] }) {
  const { extras } = useStudyStore();

  // Longform lesson if available; otherwise use the bullet outline
  const rich = extras?.richSummary?.trim() || "";
  const bullets = Array.isArray(summary) ? summary : [];

  // Key terms (with popover notes)
  const terms = Array.isArray(extras?.keyTerms) ? extras?.keyTerms : [];
  const notes = extras?.termNotes || {};

  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function closeOnOutside(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpenIdx(null);
    }
    window.addEventListener("click", closeOnOutside);
    return () => window.removeEventListener("click", closeOnOutside);
  }, []);

  return (
    <div className="grid gap-6">
      {/* Detailed lesson */}
      <div className="rounded-2xl border p-5">
        <h4 className="text-base font-semibold mb-2">Detailed Summary</h4>

        {rich ? (
          // ✅ Render text AND code fences
          <div className="max-w-none text-zinc-900">
            {splitFences(rich).map((seg, i) =>
              seg.type === "code" ? (
                <CodeBlock key={i} code={seg.code} lang={seg.lang} />
              ) : (
                <div key={i}>{renderMarkdown(seg.text)}</div>
              )
            )}
          </div>
        ) : bullets.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {bullets.map((b, i) => (
              <li key={i} className="leading-relaxed">
                {renderInline(b)}
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">
            Upload a document to generate a detailed lesson.
          </div>
        )}
      </div>

      {/* Key terms — single place only, with popovers */}
      {terms.length > 0 && (
        <div className="rounded-2xl border p-5">
          <h4 className="text-base font-semibold mb-3">Key Terms</h4>
          <div ref={wrapRef} className="flex flex-wrap gap-2">
            {terms.map((t, i) => {
              const open = openIdx === i;
              const def = notes[t];
              return (
                <div key={i} className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenIdx(open ? null : i);
                    }}
                    className="rounded-full border px-3 py-1 text-sm bg-white hover:bg-zinc-50"
                    title={def ? "Click for a quick definition" : undefined}
                  >
                    {t}
                  </button>
                  {open && def && (
                    <div className="absolute z-[10] mt-2 w-64 max-w-[70vw] rounded-xl border bg-white p-3 text-sm shadow-lg">
                      <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-1">
                        Definition
                      </div>
                      <div className="text-zinc-800">{def}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {!terms.some((t) => notes[t]) && (
            <div className="mt-2 text-xs text-zinc-500">Definitions appear when available.</div>
          )}
        </div>
      )}
    </div>
  );
}
