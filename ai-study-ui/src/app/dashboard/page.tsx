"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { listStudySets, StudySet } from "@/lib/db";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [first, setFirst] = useState<string>("…");
  const [sets, setSets] = useState<StudySet[] | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        router.push("/account");
        return;
      }

      // prefer profiles.display_name
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", u.id)
        .single();

      const name =
        (prof?.display_name as string | undefined) ||
        (u.user_metadata as any)?.first_name ||
        (u.email ? u.email.split("@")[0] : "there");

      if (mounted) setFirst(name);

      const all = await listStudySets().catch(() => []);
      if (mounted) setSets(all);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_e: unknown, session: { user: any } | null) => {
        if (!session?.user) router.push("/account");
      }
    );

    return () => {
      sub?.subscription?.unsubscribe();
      mounted = false;
    };
  }, [router]);

  const flash = (sets ?? []).filter((s) => s.type === "flashcards");
  const quizzes = (sets ?? []).filter((s) => s.type === "quiz");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold tracking-tight">hello {first}</h1>
      </div>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Your flashcard sets</h2>
        {!flash.length ? (
          <p className="text-sm text-zinc-600">No saved flashcards yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {flash.map((s) => (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="font-medium">{s.title}</div>
                <div className="mt-1 text-xs text-zinc-600">
                  {s.card_count} cards · updated{" "}
                  {new Date(s.updated_at).toLocaleDateString()}
                </div>
                <div className="mt-3">
                  <Link
                    href={`/sets/${s.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Your quizzes</h2>
        {!quizzes.length ? (
          <p className="text-sm text-zinc-600">No saved quizzes yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((s) => (
              <div key={s.id} className="rounded-lg border p-4">
                <div className="font-medium">{s.title}</div>
                <div className="mt-1 text-xs text-zinc-600">
                  {s.question_count} questions · updated{" "}
                  {new Date(s.updated_at).toLocaleDateString()}
                </div>
                <div className="mt-3">
                  <Link
                    href={`/sets/${s.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
