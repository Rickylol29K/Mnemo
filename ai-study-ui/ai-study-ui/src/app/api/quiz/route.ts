import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type MCQ = { prompt: string; options: string[]; correctIndex: number };

export async function POST(req: Request) {
  try {
    const { text, n } = (await req.json()) as { text?: string; n?: number };

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "Provide more text." }, { status: 400 });
    }

    const count = Math.min(Math.max(Number(n || 12), 6), 20); // 6–20

    const system = [
      "You are a senior exam item writer.",
      "Write high-quality multiple-choice questions (MCQs) strictly anchored to the student's notes.",
      "Vary difficulty (recall → application). Avoid trivia and avoid 'All/None of the above'.",
      "Options must be plausible, mutually exclusive, and only one is correct.",
      "Return STRICT JSON ONLY (no code fences) with shape:",
      '{ "questions": [ { "prompt": string, "options": string[4], "correctIndex": number } ] }',
      "Do not include explanations in the JSON.",
      "Generate brand-new questions on every call—do not reuse any prior wording.",
    ].join("\n");

    const user = [
      `Create ${count} MCQs from these notes.`,
      "NOTES:",
      text,
    ].join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4, // a bit of variety but still accurate
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";

    type Payload = { questions?: MCQ[] };
    let payload: Payload;
    try {
      payload = JSON.parse(raw) as Payload;
    } catch {
      return NextResponse.json(
        { error: "Bad model output." },
        { status: 502 }
      );
    }

    const questions: MCQ[] =
      Array.isArray(payload.questions) ? payload.questions : [];

    // Light validation/sanitization
    const cleaned = questions
      .map((q) => ({
        prompt: String(q?.prompt ?? "").trim(),
        options: Array.isArray(q?.options)
          ? q.options.map((o) => String(o ?? "").trim()).filter(Boolean).slice(0, 6) // safety
          : [],
        correctIndex: Number.isFinite(q?.correctIndex)
          ? Number(q.correctIndex)
          : -1,
      }))
      .filter(
        (q) =>
          q.prompt &&
          q.options.length >= 3 &&
          q.correctIndex >= 0 &&
          q.correctIndex < q.options.length
      );

    if (!cleaned.length) {
      return NextResponse.json(
        { error: "No questions generated." },
        { status: 502 }
      );
    }

    return NextResponse.json({ questions: cleaned });
  } catch (err: any) {
    console.error("/api/quiz error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error." },
      { status: 500 }
    );
  }
}
