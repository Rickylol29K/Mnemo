import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY =
  process.env.OPENAI_API_KEY ||
  process.env.OPENAI_KEY ||
  process.env.OPENAI_API_KEY_ALT ||
  "";

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY", detail: "Set it in .env.local" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    // New: language hint from client ("en", "fr", "es", or "auto")
    const langRaw = (formData.get("lang") as string | null)?.trim().toLowerCase() || "";
    const lang = langRaw === "auto" ? "" : langRaw;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const model = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";

    // Build upstream form data
    const upstreamFD = new FormData();
    upstreamFD.append("file", file);
    upstreamFD.append("model", model);
    // Force deterministic output a bit
    upstreamFD.append("temperature", "0");
    // If the caller specified a language, pass it through
    if (lang) {
      upstreamFD.append("language", lang); // Whisper-compatible; 4o-mini-transcribe safely ignores if unsupported
    }

    const upstream = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: upstreamFD,
    });

    if (!upstream.ok) {
      const txt = await upstream.text();
      return NextResponse.json({ error: "Upstream error", detail: txt }, { status: 502 });
    }

    const data = await upstream.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Server error", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
