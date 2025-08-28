import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function systemPrompt() {
  return `
You are an academic summarizer and explainer. Output ONLY Markdown.
Rules:
- Do NOT ask questions.
- Be comprehensive but concise where possible.
- Use clear sections with headings.
- If the topic is programming or contains code, include short, correct code examples in fenced blocks with language tags (e.g., \`\`\`js).
- Render lists, tables, and inline code appropriately.
- Use **bold** and _italics_ correctly (no stray asterisks).
- Prefer plain, readable explanations over jargon.

Template (always follow):
# Overview
(2–4 sentences high-level explanation)

## Key Ideas
- Bullet points of core concepts
- Brief clarifications

## Step-by-Step
1. Ordered, logical steps
2. Keep each step actionable

## Examples
Provide 1–3 compact examples. If coding-related, include fenced code blocks with language tags.

## Common Pitfalls
- Short bullets

## Glossary
- **Term** — definition
- **Term** — definition

## Further Reading
- Bullet links or names (no raw URLs required)
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const { text, topic } = await req.json();

    const content = `
Summarize and explain the following material. Follow the template strictly and NEVER include questions.

Topic hint: ${topic ?? "N/A"}

Material:
"""
${(text ?? "").slice(0, 200000)}
"""
`.trim();

    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.1-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt() },
          { role: "user", content },
        ],
      }),
    });

    if (!result.ok) {
      const t = await result.text();
      return NextResponse.json({ error: t }, { status: 500 });
    }

    const json = await result.json();
    const markdown =
      json.choices?.[0]?.message?.content ??
      "**Error:** No content received from the model.";

    return NextResponse.json({ markdown });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
