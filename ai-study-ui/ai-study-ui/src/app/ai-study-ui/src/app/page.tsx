import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center animate-in-slow">
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight">AI Study Assistant</h1>
      <p className="mt-4 text-muted-foreground max-w-xl">
        Turn lecture PDFs into bite-sized summaries and flashcards — in seconds.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link
          href="/app"
          className="inline-flex items-center rounded-lg bg-black text-white px-5 py-3 text-sm font-medium hover:opacity-90 active:scale-[0.98] focus-visible:focus-ring"
        >
          Open the tool
        </Link>
        <Link href="/pricing" className="inline-flex items-center rounded-lg border px-5 py-3 text-sm font-medium hover:bg-zinc-50 focus-visible:focus-ring">
          Pricing
        </Link>
        <Link href="/about" className="inline-flex items-center rounded-lg border px-5 py-3 text-sm font-medium hover:bg-zinc-50 focus-visible:focus-ring">
          About
        </Link>
      </div>

      {/* Slogan */}
      <p className="mt-6 text-lg md:text-xl font-serif italic tracking-wide text-zinc-700">
        "Created by students, for students"
      </p>
    </main>
  );
}
