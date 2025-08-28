import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

export const maxDuration = 30;

type QA = { q: string; a: string };
type Pack = {
  summary: string[];
  flashcards: QA[];
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: QA[];
};

export async function POST(req: Request) {
  try {
    const { text } = (await req.json()) as { text?: string };
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "Provide more text." }, { status: 400 });
    }

    // ------ First pass (enriched, but anchored) ------
    const system1 = [
      "You are an expert study coach for undergrads.",
      "Anchor your understanding to the student's notes, but you MAY add concise outside knowledge to teach the topic better (definitions, context, examples, analogies, pitfalls).",
      "Return STRICT JSON ONLY (no code fences) with:",
      `{
        "summary": string[]  // 12–18 strong bullets. Start with the core ideas, then add context/definitions/examples to fill gaps.
        ,"flashcards": { "q": string, "a": string }[] // 10–16 short items
        ,"keyTerms": string[] // 8–20 glossary terms
        ,"analogies": string[] // 2–5 helpful metaphors
        ,"pitfalls": string[] // 3–6 common mistakes
        ,"practice": { "q": string, "a": string }[] // 3–5 short Q&A
      }`,
      "Keep everything on-topic and concise.",
    ].join("\n");

    const user1 = `STUDENT NOTES:\n${text}`;

    const first = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      messages: [
        { role: "system", content: system1 },
        { role: "user", content: user1 },
      ],
    });

    let pack = coerceToPack(first.choices?.[0]?.message?.content ?? "");

    // ------ Auto-expand summary if model under-delivers ------
    if (!pack.summary || pack.summary.length < 12) {
      const system2 =
        "Expand and enrich the summary to 12–18 bullets without fluff. Keep it on-topic, add concise definitions/examples where missing. Return JSON with {\"summary\":[...]} only.";
      const user2 = `Existing bullets:\n${JSON.stringify(
        pack.summary ?? []
      )}\n\nGround truth notes:\n${text}`;

      const second = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.6,
        messages: [
          { role: "system", content: system2 },
          { role: "user", content: user2 },
        ],
      });

      const expanded = safeParseJSON(second.choices?.[0]?.message?.content ?? "");
      const expandedList = Array.isArray(expanded?.summary)
        ? expanded.summary.filter((s: any) => typeof s === "string")
        : [];
      if (expandedList.length >= (pack.summary?.length ?? 0)) {
        pack.summary = expandedList.slice(0, 18);
      }
    }

    // Final trims
    pack.summary = (pack.summary ?? []).filter((s) => typeof s === "string").slice(0, 18);
    pack.flashcards = (pack.flashcards ?? []).filter(isQA).slice(0, 24);
    pack.keyTerms = (pack.keyTerms ?? []).filter(isStr).slice(0, 20);
    pack.analogies = (pack.analogies ?? []).filter(isStr).slice(0, 5);
    pack.pitfalls = (pack.pitfalls ?? []).filter(isStr).slice(0, 6);
    pack.practice = (pack.practice ?? []).filter(isQA).slice(0, 5);

    // If it still somehow failed, give a friendly fallback
    if (pack.summary.length === 0) {
      pack.summary = [
        "The notes could not be summarized reliably. Try uploading a clearer section or shorter chunk.",
      ];
    }

    return NextResponse.json(pack);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}

function isStr(x: any): x is string {
  return typeof x === "string";
}
function isQA(x: any): x is QA {
  return x && typeof x.q === "string" && typeof x.a === "string";
}

function coerceToPack(raw: string): Pack {
  const p = safeParseJSON(raw) ?? {};
  return {
    summary: Array.isArray(p.summary) ? p.summary.filter(isStr) : [],
    flashcards: Array.isArray(p.flashcards) ? p.flashcards.filter(isQA) : [],
    keyTerms: Array.isArray(p.keyTerms) ? p.keyTerms.filter(isStr) : [],
    analogies: Array.isArray(p.analogies) ? p.analogies.filter(isStr) : [],
    pitfalls: Array.isArray(p.pitfalls) ? p.pitfalls.filter(isStr) : [],
    practice: Array.isArray(p.practice) ? p.practice.filter(isQA) : [],
  };
}

function safeParseJSON(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    const m =
      raw.match(/```json\s*([\s\S]*?)```/i) ||
      raw.match(/```\s*([\s\S]*?)```/i) ||
      raw.match(/\{[\s\S]*\}$/);
    if (m) {
      try {
        return JSON.parse(m[1] ?? m[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}
