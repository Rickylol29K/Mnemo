import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Flashcard = { q: string; a: string };

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "Provide more text." }, { status: 400 });
    }

    // -------- TEACHER SYSTEM PROMPT (high quality, no fluff) --------
    const system = [
      "You are an expert study coach for undergrads.",
      "You transform a student's raw notes into a concise, accurate, and highly educational study pack.",
      "Anchor your output to the student's notes. Do NOT invent generic business fluff, management clichés, or irrelevant sections.",
      "If a commonly expected item is missing in the notes, include it ONLY if essential, and prefix with '(Outside notes)'.",
      "Write in clean Markdown. Use clear headings (##, ###), bold for key terms, and lists. Use tables where they truly help.",
      "When the topic includes code, include short, correct, *runnable* examples inside fenced code blocks with the correct language tag.",
      "Explanations should be tight but insightful: show the mental model, a worked example, common pitfalls, and a quick self-check.",
      "Your tone is helpful, precise, and exam-ready.",
      "",
      "Return STRICT JSON ONLY (no code fences, no prose around it) with this exact shape:",
      "{",
      '  "summary": string[],',
      '  "flashcards": { "q": string, "a": string }[],',
      '  "keyTerms": string[],',
      '  "analogies": string[],',
      '  "pitfalls": string[],',
      '  "practice": { "q": string, "a": string }[]',
      "}",
      "",
      "Rules for each field:",
      "- summary: an ordered array of Markdown blocks. Start with a '## TL;DR' (3–5 bullet points), then '## Core Ideas', '## Worked Example(s)' (use code blocks if code appears in notes), '## Common Pitfalls', and '## Quick Self-Check' (short list of questions with brief answers). Each array item may be multi-line Markdown.",
      "- flashcards: 10–16 tight Q/A items drawn from the notes (no trivia, no filler).",
      "- keyTerms: 8–20 glossary terms (single terms/short phrases).",
      "- analogies: 2–5 clear analogies or memory hooks (only if they genuinely help).",
      "- pitfalls: 3–6 frequent mistakes or misconceptions.",
      "- practice: 3–5 short Q/A items that check understanding (not duplicates of flashcards).",
      "",
      "Formatting reminders:",
      "- Use bold for important words (**like this**).",
      "- Use fenced code blocks for any multi-line code examples (do not inline code without fences if more than one line).",
      "- Prefer the language tag that matches the notes (e.g., ```java, ```python).",
    ].join("\n");

    // -------- USER CONTENT --------
    const user = [
      "STUDENT NOTES:",
      text,
    ].join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2, // precise, low-fluff
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";

    // Defensive parse
    let parsed: {
      summary: string[];
      flashcards: Flashcard[];
      keyTerms: string[];
      analogies: string[];
      pitfalls: string[];
      practice: Flashcard[];
    };

    try {
      parsed = JSON.parse(raw);
    } catch {
      // If the model returns something slightly off, try to salvage
      parsed = {
        summary: [raw],
        flashcards: [],
        keyTerms: [],
        analogies: [],
        pitfalls: [],
        practice: [],
      };
    }

    // Minimal shape guarantees so UI never breaks
    if (!Array.isArray(parsed.summary)) parsed.summary = [String(parsed.summary ?? "")];
    if (!Array.isArray(parsed.flashcards)) parsed.flashcards = [];
    if (!Array.isArray(parsed.keyTerms)) parsed.keyTerms = [];
    if (!Array.isArray(parsed.analogies)) parsed.analogies = [];
    if (!Array.isArray(parsed.pitfalls)) parsed.pitfalls = [];
    if (!Array.isArray(parsed.practice)) parsed.practice = [];

    // Trim / sanitize a bit
    parsed.summary = parsed.summary.map((s) => String(s ?? "").trim()).filter(Boolean);
    parsed.keyTerms = parsed.keyTerms.map((s) => String(s ?? "").trim()).filter(Boolean);
    parsed.analogies = parsed.analogies.map((s) => String(s ?? "").trim()).filter(Boolean);
    parsed.pitfalls = parsed.pitfalls.map((s) => String(s ?? "").trim()).filter(Boolean);

    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("/api/process error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error." },
      { status: 500 }
    );
  }
}
