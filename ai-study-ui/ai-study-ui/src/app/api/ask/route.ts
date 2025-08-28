import { NextResponse } from "next/server";
import { openai } from "@/lib/openai";

// Keep request size/token use sane; plenty for great answers
const MAX_CONTEXT_CHARS = 12000;

export async function POST(req: Request) {
  try {
    const { question, context } = await req.json();

    if (!question || !context) {
      return NextResponse.json({ error: "Missing question or context" }, { status: 400 });
    }

    const trimmedContext =
      typeof context === "string" ? context.slice(0, MAX_CONTEXT_CHARS) : "";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content: `You are a helpful tutor.
- Use the student's notes as the anchor, but you may add outside knowledge to teach better.
- Respond in clean, readable HTML (<h2>, <h3>, <ul>, <li>, <b>, <blockquote>, <code>).
- Structure:
  <h2>Answer</h2> ...explain step by step...
  <h3>Examples</h3> ...bullets...
  <h3>Common Pitfalls</h3> ...bullets...
  <h3>Quick Recap</h3> <ul><li>...</li></ul>`,
        },
        {
          role: "user",
          content: `NOTES (truncated if long):\n${trimmedContext}\n\nQUESTION:\n${question}`,
        },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "<p>No answer.</p>";
    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: "Failed to answer" }, { status: 500 });
  }
}
