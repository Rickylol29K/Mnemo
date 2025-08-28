import { NextRequest, NextResponse } from "next/server";

// Prefer OPENAI_API_KEY; allow fallback env var names if you used a different one
const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_API_KEY_ALT ||
  process.env.OPENAI_KEY ||
  "";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

// Helpful for large PDFs: limit context size sent upstream
function safeTruncate(s: string, n: number) {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "\n…[truncated]" : s;
}

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "Missing OPENAI_API_KEY",
        detail:
          "Set OPENAI_API_KEY in your .env.local and restart the dev server.",
      },
      { status: 500 }
    );
  }

  try {
    const body = await req.json().catch(() => ({} as any));
    const question: string | undefined = body?.question;
    const context: string = body?.context ?? "";
    const messages: ChatMsg[] | undefined = body?.messages;

    // Build chat messages
    const system: ChatMsg = {
      role: "system",
      content: [
        "You are a helpful AI Tutor. Explain clearly and concisely, step-by-step when useful.",
        "Prefer short paragraphs & bullet points.",
        "When sharing code, ALWAYS use fenced code blocks like ```language\n...\n```.",
        "Ground answers in the provided context when helpful, but you may add relevant background.",
      ].join(" "),
    };

    let chat: ChatMsg[] = [];
    if (Array.isArray(messages) && messages.length) {
      chat = [system, ...messages];
      if (context?.trim()) {
        chat.push({
          role: "system",
          content: `Document context for reference (do not echo verbatim unless needed):\n${safeTruncate(
            context,
            12000
          )}`,
        });
      }
    } else {
      // Back-compat: single-turn ask
      const q = question ?? "Explain this topic.";
      chat = [
        system,
        {
          role: "user",
          content:
            `Context (for reference):\n${safeTruncate(context, 12000)}\n\n` +
            `Question: ${q}`,
        },
      ];
    }

    // Call OpenAI Chat Completions
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: chat,
        temperature: 0.2,
      }),
    });

    if (!openaiRes.ok) {
      const txt = await openaiRes.text();
      return NextResponse.json(
        {
          error: "Upstream error from OpenAI",
          detail: txt,
        },
        { status: 502 }
      );
    }

    const data = await openaiRes.json();
    const answer: string =
      data?.choices?.[0]?.message?.content?.trim() ||
      "I couldn't produce an answer.";

    return NextResponse.json({ answer });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
