"use client";

import React from "react";

/** Minimal, dependency-free Markdown renderer
 * Supported:
 *  - Headings: # .. ######
 *  - Paragraphs
 *  - Unordered lists: -, *
 *  - Ordered lists: 1. / 1)
 *  - Inline: **bold**, *italic*, `code`
 *  - Fenced code blocks: ```lang ... ```
 *  - Horizontal rule: ---
 * NOT a full Markdown spec; safe for study notes.
 */

type Seg =
  | { type: "code"; lang: string | null; code: string }
  | { type: "text"; text: string };

function splitFences(input: string): Seg[] {
  if (!input) return [{ type: "text", text: "" }];
  const out: Seg[] = [];
  let i = 0;
  const fence = /```(\w+)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = fence.exec(input))) {
    const before = input.slice(i, m.index);
    if (before) out.push({ type: "text", text: before });
    out.push({ type: "code", lang: m[1] ?? null, code: m[2].replace(/\s+$/, "") });
    i = fence.lastIndex;
  }
  const tail = input.slice(i);
  if (tail) out.push({ type: "text", text: tail });
  return out.length ? out : [{ type: "text", text: input }];
}

function renderInline(txt: string) {
  // Escape HTML
  const safe = txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Inline code
  const parts = safe.split(/(`[^`]+`)/g).map((chunk, idx) => {
    if (/^`[^`]+`$/.test(chunk)) {
      return <code key={idx} className="rounded bg-zinc-100 px-1 py-0.5 text-[0.95em]">{chunk.slice(1, -1)}</code>;
    }
    // bold
    const boldSplit = chunk.split(/(\*\*[^*]+\*\*)/g).map((b, j) => {
      if (/^\*\*[^*]+\*\*$/.test(b)) {
        return <strong key={j}>{b.slice(2, -2)}</strong>;
      }
      // italic
      const italSplit = b.split(/(\*[^*]+\*)/g).map((it, k) => {
        if (/^\*[^*]+\*$/.test(it)) {
          return <em key={k}>{it.slice(1, -1)}</em>;
        }
        return <React.Fragment key={k}>{it}</React.Fragment>;
      });
      return <React.Fragment key={j}>{italSplit}</React.Fragment>;
    });
    return <React.Fragment key={idx}>{boldSplit}</React.Fragment>;
  });
  return parts;
}

function renderBlock(text: string, key: React.Key) {
  const line = text.trim();

  // Horizontal rule
  if (/^---$/.test(line)) {
    return <hr key={key} className="my-4 border-zinc-200" />;
  }

  // Headings
  const h = /^(#{1,6})\s+(.*)$/.exec(line);
  if (h) {
    const level = h[1].length;
    const Tag = (`h${level}` as unknown) as keyof JSX.IntrinsicElements;
    const sizes = ["", "text-2xl", "text-xl", "text-lg", "text-base", "text-base"];
    return (
      <Tag key={key} className={`font-semibold tracking-tight ${sizes[level - 1]} mt-4 mb-2`}>
        {renderInline(h[2])}
      </Tag>
    );
  }

  return (
    <p key={key} className="my-2 leading-relaxed">
      {renderInline(text)}
    </p>
  );
}

function renderTextBlock(block: string, blockKey: React.Key) {
  // --- List normalization fixes ---
  // Collapse blank lines that break lists (Markdown often writes "1." for all items and
  // puts blank lines between them; we want one continuous <ol> so numbering auto-increments).
  const normalized = block.replace(
    /\n{2,}(\s*(?:[-*]|\d+[\.\)])\s+)/g,
    "\n$1"
  );

  const lines = normalized.replace(/\r/g, "").split("\n");

  const isBullet = (s: string) => /^\s*([-*])\s+/.test(s);
  const isNumbered = (s: string) => /^\s*\d+[\.\)]\s+/.test(s);

  if (lines.every((l) => l.trim() === "")) return null;

  if (lines.some(isBullet) && lines.every((l) => !l.trim() || isBullet(l))) {
    return (
      <ul key={blockKey} className="my-2 ml-5 list-disc space-y-1">
        {lines.map((l, i) => {
          const m = /^\s*[-*]\s+([\s\S]*)$/.exec(l);
          if (!m) return null;
          return <li key={i} className="leading-relaxed">{renderInline(m[1])}</li>;
        })}
      </ul>
    );
  }

  if (lines.some(isNumbered) && lines.every((l) => !l.trim() || isNumbered(l))) {
    return (
      <ol key={blockKey} className="my-2 ml-5 list-decimal space-y-1">
        {lines
          .filter((l) => l.trim())
          .map((l, i) => {
            const m = /^\s*\d+[\.\)]\s+([\s\S]*)$/.exec(l);
            if (!m) return null;
            return <li key={i} className="leading-relaxed">{renderInline(m[1])}</li>;
          })}
      </ol>
    );
  }

  // Otherwise treat as paragraphs/headings
  return (
    <div key={blockKey}>
      {lines.map((l, i) => (l.trim() ? renderBlock(l, `${blockKey}-${i}`) : <div key={`${blockKey}-${i}`} className="h-2" />))}
    </div>
  );
}

export default function Markdown({ content }: { content: string }) {
  const segments = splitFences(content);

  return (
    <div className="prose prose-zinc max-w-none prose-pre:rounded-xl prose-pre:p-0">
      {segments.map((seg, i) =>
        seg.type === "code" ? (
          <pre key={i} className="my-4 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50">
            <code className={`block p-4 ${seg.lang ? `language-${seg.lang}` : ""}`}>{seg.code}</code>
          </pre>
        ) : (
          seg.text
            .split(/\n{2,}/)
            .map((blk, j) => renderTextBlock(blk, `${i}-${j}`))
        )
      )}
    </div>
  );
}
