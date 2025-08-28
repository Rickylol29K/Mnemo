// src/app/api/tutor/route.ts
import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  try {
    const { prompt, context } = (await req.json()) as {
      prompt?: string;
      context?: { summary?: string[]; keyTerms?: string[]; rawText?: string | null };
    };

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    const sys = [
      "You are a helpful AI study tutor.",
      "You will answer based ONLY on the provided context (summary, key terms, raw text).",
      "Output MUST be in Markdown (no HTML).",
      "Markdown rules:",
      "- Support **bold**, *italic*, and inline `code`.",
      "- Use fenced code blocks (```lang … ```) for multi-line examples.",
      "- Headings (#, ##) allowed.",
      "- Lists are fine.",
      "Keep answers clear and exam-ready. If the question is unanswerable from context, say so briefly.",
    ].join("\n");

    const ctx = [
      context?.summary?.length ? `Summary:\n${context.summary.join("\n")}` : "",
      context?.keyTerms?.length ? `Key Terms:\n${context.keyTerms.join(", ")}` : "",
      context?.rawText ? `Raw Text:\n${context.rawText.slice(0, 5000)}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Context:\n${ctx}\n\nUser question: ${prompt}` },
      ],
    });

    const markdown = completion.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ markdown });
  } catch (err) {
    console.error("tutor route error:", err);
    return NextResponse.json({ error: "Tutor failed" }, { status: 500 });
  }
}
