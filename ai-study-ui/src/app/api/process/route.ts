// src/app/api/process/route.ts
import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

/** Safe JSON parse for model replies that *should* be JSON. */
function safeParseJSON<T = unknown>(text: string | null | undefined, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (m) {
      try {
        return JSON.parse(m[1]) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

type QA = { q: string; a: string };
type StudyPack = {
  summary: string[];
  flashcards: QA[];
  keyTerms: string[];
  analogies: string[];
  pitfalls: string[];
  practice: QA[];
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      text?: string;
      regenerate?: boolean;
      avoid?: { questions?: string[]; answers?: string[] };
      nonce?: string; // just to break caching/seed variation
    };

    const { text, regenerate = false, avoid, nonce } = body || {};

    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return NextResponse.json({ error: "Provide more text." }, { status: 400 });
    }

    // ------- Prompt (array-joined to avoid backtick issues) -------
    const systemLines: string[] = [
      "You are an expert study coach for undergrads.",
      "Anchor your understanding to the student's notes; only add widely-accepted, standard context.",
      "Return STRICT JSON ONLY (no code fences) with:",
      "{",
      '  "summary": string[],',
      '  "flashcards": { "q": string, "a": string }[],',
      '  "keyTerms": string[],',
      '  "analogies": string[],',
      '  "pitfalls": string[],',
      '  "practice": { "q": string, "a": string }[]',
      "}",
      "",
      "Formatting rules:",
      "- Summary items are Markdown-capable: allow **bold**, *italic*, and inline `code`.",
      "- For multi-line code, describe that it should be a fenced code block as ONE item (do not include literal fences in JSON).",
      "- Short headings are allowed as their own items: '# Topic', '## Subtopic'.",
      "- Keep bullets concise and exam-ready.",
    ];

    if (regenerate) {
      systemLines.push(
        "",
        "REGENERATION MODE:",
        "- Produce a *fresh* set of flashcards and practice Q&A that does NOT overlap with the provided AVOID lists (neither verbatim nor paraphrased).",
        "- Vary the angle and phrasing; surface different subtopics/examples from the same source text.",
        "- Prefer new examples, edge-cases, or applications not used before.",
        "- If the topic is narrow, still paraphrase to avoid near-duplicates."
      );
    }

    const avoidQ = avoid?.questions?.filter(Boolean) ?? [];
    const avoidA = avoid?.answers?.filter(Boolean) ?? [];

    const userLines: string[] = [
      "STUDENT NOTES:",
      text.slice(0, 20000),
    ];

    if (avoidQ.length || avoidA.length) {
      userLines.push("");
      if (avoidQ.length) {
        userLines.push("AVOID_QUESTIONS:", ...avoidQ.map((q) => `- ${q}`));
      }
      if (avoidA.length) {
        userLines.push("", "AVOID_ANSWERS:", ...avoidA.map((a) => `- ${a}`));
      }
    }
    if (nonce) {
      userLines.push("", `REGEN_SEED: ${nonce}`);
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: regenerate ? 0.6 : 0.3, // more variety when regenerating
      messages: [
        { role: "system", content: systemLines.join("\n") },
        { role: "user", content: userLines.join("\n") },
      ],
    });

    const content = completion.choices?.[0]?.message?.content ?? "{}";
    const data = safeParseJSON<Partial<StudyPack>>(content, {});

    // Shape guards
    const pack: StudyPack = {
      summary: Array.isArray(data.summary)
        ? data.summary.slice(0, 120).map((s) => globalThis.String(s))
        : [],
      flashcards: Array.isArray(data.flashcards)
        ? data.flashcards
            .slice(0, 200)
            .map((x) => ({
              q: globalThis.String((x as any)?.q ?? ""),
              a: globalThis.String((x as any)?.a ?? ""),
            }))
            .filter((x) => x.q && x.a)
        : [],
      keyTerms: Array.isArray(data.keyTerms) ? data.keyTerms.slice(0, 200).map((s) => globalThis.String(s)) : [],
      analogies: Array.isArray(data.analogies) ? data.analogies.slice(0, 100).map((s) => globalThis.String(s)) : [],
      pitfalls: Array.isArray(data.pitfalls) ? data.pitfalls.slice(0, 100).map((s) => globalThis.String(s)) : [],
      practice: Array.isArray(data.practice)
        ? data.practice
            .slice(0, 100)
            .map((x) => ({
              q: globalThis.String((x as any)?.q ?? ""),
              a: globalThis.String((x as any)?.a ?? ""),
            }))
            .filter((x) => x.q && x.a)
        : [],
    };

    // Top-up only if too short
    if (pack.summary.length < 8) {
      const extendSys = [
        "Return ONLY a JSON array of strings (no wrapper object).",
        "Each string must be a Markdown-ready bullet or short heading that complements an existing summary.",
      ].join("\n");

      const extendUser = [
        `The current summary length is ${pack.summary.length}.`,
        "Provide 6–10 extra concise items to improve coverage.",
      ].join("\n");

      const extend = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: extendSys },
          { role: "user", content: extendUser },
        ],
      });

      const extraArr = safeParseJSON<string[]>(
        extend.choices?.[0]?.message?.content ?? "[]",
        []
      ).map((s) => globalThis.String(s));

      pack.summary = [...pack.summary, ...extraArr].slice(0, 24);
    }

    return NextResponse.json(pack);
  } catch (err) {
    console.error("process route error:", err);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
