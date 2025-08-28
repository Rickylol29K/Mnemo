"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "./Markdown";
import { useStudyStore } from "@/store/useStudyStore";
import { toast } from "sonner";

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  markdown: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function Tutor() {
  const { summary, extras, rawText } = useStudyStore((s) => ({
    summary: s.summary,
    extras: s.extras,
    rawText: s.rawText,
  }));

  const hasContext = (summary?.length ?? 0) > 0 || !!rawText;

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // for entry animation
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);

  // animate panel in
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setMounted(true));
    } else {
      setMounted(false);
    }
  }, [open]);

  // Intro message
  useEffect(() => {
    if (!open || !hasContext) return;
    setMessages((prev) => {
      if (prev.length) return prev;
      return [
        {
          id: uid(),
          role: "assistant",
          markdown:
            "Hi! I’m your AI tutor. Ask me about the uploaded material — I can explain concepts, write examples, or quiz you.\n\n_Tip: press **Enter** to send, **Shift+Enter** for a new line._",
        },
      ];
    });
  }, [open, hasContext]);

  // smooth auto-scroll
  useEffect(() => {
    const el = viewportRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const contextPayload = useMemo(
    () => ({
      summary: summary ?? [],
      keyTerms: extras?.keyTerms ?? [],
      rawText: rawText ?? null,
    }),
    [summary, extras?.keyTerms, rawText]
  );

  async function actuallySend(question: string) {
    const userMsg: ChatMsg = { id: uid(), role: "user", markdown: question };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question, context: contextPayload }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Tutor error ${res.status}`);
      }

      const data = (await res.json()) as { markdown?: string };
      const reply: ChatMsg = {
        id: uid(),
        role: "assistant",
        markdown: data.markdown || "_(no answer)_",
      };
      setMessages((prev) => [...prev, reply]);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Tutor failed");
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          markdown:
            "Sorry — I couldn’t generate a reply. Try again, or simplify the question.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = input.trim();
    if (!q) return;
    if (!hasContext) {
      toast.info("Upload a document first to enable the tutor.");
      return;
    }
    await actuallySend(q);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending && input.trim()) void sendMessage();
    }
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setOpen(true)}
          disabled={!hasContext}
          className={`rounded-full px-4 py-2 text-sm font-medium shadow-lg transition ${
            hasContext
              ? "bg-black text-white hover:bg-zinc-800"
              : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
          }`}
          title={hasContext ? "Open AI Tutor" : "Upload a document to use the tutor"}
        >
          AI Tutor
        </button>
      </div>

      {/* Slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 flex">
          {/* backdrop with fade */}
          <div
            className={`flex-1 bg-black/30 transition-opacity duration-200 ${mounted ? "opacity-100" : "opacity-0"}`}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          {/* panel with slide-in */}
          <div
            className={`flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transform transition-transform duration-300 ${
              mounted ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold tracking-tight">AI Tutor</h3>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border px-2 py-1 text-sm hover:bg-zinc-50 transition"
              >
                Close
              </button>
            </div>

            {/* messages */}
            <div
              ref={viewportRef}
              className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3"
            >
              {!hasContext ? (
                <div className="rounded-lg border bg-zinc-50 p-4 text-sm text-zinc-600">
                  Upload a document to enable the tutor.
                </div>
              ) : messages.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  Ask a question about your uploaded material…
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[90%] rounded-2xl border p-3 transition-opacity duration-200 ${
                      m.role === "user"
                        ? "self-end border-zinc-200 bg-zinc-50"
                        : "self-start border-zinc-100 bg-white"
                    }`}
                    style={{ opacity: 1 }}
                  >
                    <Markdown content={m.markdown} />
                  </div>
                ))
              )}
              {sending && (
                <div className="self-start rounded-2xl border border-zinc-100 bg-white p-3 text-sm text-zinc-500 animate-pulse">
                  Thinking…
                </div>
              )}
            </div>

            {/* composer (sticky bottom) */}
            <form onSubmit={sendMessage} className="sticky bottom-0 w-full border-t bg-white p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about the current document…"
                  rows={1}
                  className="min-h-[40px] max-h-36 flex-1 resize-y rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                />
                <button
                  type="submit"
                  disabled={!hasContext || sending || !input.trim()}
                  className="inline-flex h-[40px] shrink-0 items-center gap-1 rounded-lg border px-3 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 transition"
                  title="Send (Enter)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="-ml-0.5"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                  Send
                </button>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Press <kbd className="rounded border px-1">Enter</kbd> to send,{" "}
                <kbd className="rounded border px-1">Shift</kbd>+
                <kbd className="rounded border px-1">Enter</kbd> for a newline.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
