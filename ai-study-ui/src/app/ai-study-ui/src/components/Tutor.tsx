"use client";

import { useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useStudyStore } from "@/store/useStudyStore";
import { Button } from "@/components/ui/button";

/* ================= Markdown utils (same as Summary) ================= */

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

  function para(): string {
    const chunk: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      if (
        /^\s*([-*])\s+/.test(lines[i]) ||
        /^\s*\d+[.)]\s+/.test(lines[i]) ||
        /^\s*#{1,6}\s+/.test(lines[i])
      )
        break;
      chunk.push(lines[i]);
      i++;
    }
    return chunk.join("\n");
  }

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const text = h[2];
      const Tag = (["h1", "h2", "h3", "h4", "h5", "h6"][level - 1] as keyof JSX.IntrinsicElements);
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

    const p = para();
    blocks.push(
      <p key={`p-${i}`} className="leading-relaxed whitespace-pre-wrap">
        {renderInline(p)}
      </p>
    );
  }
  return <>{blocks}</>;
}

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

/* ================= Tutor popup ================= */

type Msg = { role: "user" | "assistant"; content: string };

export default function Tutor() {
  const { rawText, summary, extras } = useStudyStore();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const unlocked = useMemo(() => !!rawText, [rawText]);

  // auto-scroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  // body scroll-lock + ESC to close
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const nextMsgs = [...msgs, { role: "user", content: text } as Msg];
    setMsgs(nextMsgs);
    setInput("");
    setLoading(true);
    setErr(null);

    // Build document context for grounding
    const ctxParts: string[] = [];
    if (Array.isArray(summary) && summary.length) ctxParts.push("Outline:\n- " + summary.join("\n- "));
    if (extras?.keyTerms?.length) ctxParts.push("Key terms: " + extras.keyTerms.join(", "));
    const docChunk = (rawText || "").slice(0, 20000);
    const context = `Document:\n${docChunk}\n\n${ctxParts.join("\n\n")}`;

    try {
      const messages = [
        {
          role: "system",
          content:
            "You are an expert AI tutor. Teach clearly and kindly. Use **markdown** (headings, lists, bold/italic). " +
            "For code, use triple backticks with a language label, e.g. ```js ...```. " +
            "Cite concepts from the provided document context; don't invent facts beyond it.",
        },
        ...nextMsgs,
      ];

      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, context }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Tutor error ${res.status}: ${t || "unknown"}`);
      }

      const data = await res.json();
      const answer = String(data?.answer || "");
      setMsgs((m) => [...m, { role: "assistant", content: answer }]);
    } catch (e: any) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function clearChat() {
    setMsgs([]);
    setErr(null);
  }

  return (
    <div className="rounded-3xl border bg-white/70 backdrop-blur p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">AI Tutor</h3>
          <p className="text-sm text-muted-foreground">
            Ask questions in a side popup. Conversation persists until you reload.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => unlocked && setOpen(true)}
          disabled={!unlocked}
          className="min-w-[120px]"
          title={unlocked ? "Open Tutor" : "Upload a doc to unlock"}
        >
          Open Tutor
        </Button>
      </div>

      {/* Drawer rendered via portal to escape parent stacking contexts */}
      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <>
            {/* overlay */}
            <div
              className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* side drawer */}
            <aside
              className="fixed right-0 top-0 z-[101] h-screen w-full sm:w-[440px] bg-white shadow-xl border-l grid grid-rows-[auto,1fr,auto] translate-x-0 animate-[slideIn_.2s_ease-out] will-change-transform"
              role="dialog"
              aria-label="AI Tutor"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <div className="text-sm font-medium">AI Tutor</div>
                  <div className="text-xs text-zinc-500">Grounded in your uploaded notes</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="ghost" onClick={clearChat}>
                    Clear
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Close
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div ref={listRef} className="overflow-y-auto px-4 py-3 space-y-3">
                {msgs.length === 0 && (
                  <div className="text-sm text-zinc-600 rounded-xl border p-3">
                    Ask me anything about your document — concepts, examples, practice, or a step-by-step explanation.
                  </div>
                )}

                {msgs.map((m, idx) => (
                  <div
                    key={idx}
                    className={
                      m.role === "user"
                        ? "ml-auto max-w-[85%] rounded-2xl border bg-white p-3"
                        : "mr-auto max-w-[85%] rounded-2xl border bg-zinc-50 p-3"
                    }
                  >
                    {m.role === "user" ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                    ) : (
                      splitFences(m.content).map((seg, i) =>
                        seg.type === "code" ? (
                          <CodeBlock key={i} code={seg.code} lang={seg.lang} />
                        ) : (
                          <div key={i} className="text-zinc-900">
                            {renderMarkdown(seg.text)}
                          </div>
                        )
                      )
                    )}
                  </div>
                ))}

                {err && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">
                    {err}
                  </div>
                )}
              </div>

              {/* Composer */}
              <form
                className="border-t p-3 grid gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKey}
                  rows={3}
                  placeholder="Type your question… (Shift+Enter for newline)"
                  className="w-full resize-none rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-zinc-500">
                    Supports **markdown** and ```code fences``` in replies.
                  </div>
                  <Button type="submit" disabled={loading || !input.trim()}>
                    {loading ? "Thinking…" : "Send"}
                  </Button>
                </div>
              </form>
            </aside>

            {/* tiny keyframe for slide-in */}
            <style jsx global>{`
              @keyframes slideIn {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0%);
                }
              }
            `}</style>
          </>,
          document.body
        )}
    </div>
  );
}
