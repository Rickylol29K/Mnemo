"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  // profile state
  const [displayName, setDisplayName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // password state
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) {
        router.push("/account");
        return;
      }
      const { data: prof, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", u.id)
        .single();
      if (!mounted) return;
      if (error && error.code !== "PGRST116") {
        console.error(error);
      }
      setDisplayName(prof?.display_name ?? "");
      setLoadingProfile(false);
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

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: u.id, display_name: displayName.trim() }, { onConflict: "id" });
      if (error) throw error;
      toast.success("Profile updated.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw1.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (pw1 !== pw2) {
      toast.error("Passwords do not match.");
      return;
    }
    setSavingPw(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/account");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: pw1 });
      if (error) throw error;
      setPw1(""); setPw2("");
      toast.success("Password updated.");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update password.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="rounded-xl border bg-white p-6">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Profile</h2>
        {loadingProfile ? (
          <div className="text-sm text-zinc-600">Loading…</div>
        ) : (
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="Ada Lovelace"
                disabled={savingProfile}
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
            >
              {savingProfile ? "Saving…" : "Save profile"}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold">Change password</h2>
        <form onSubmit={changePassword} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm">New password</label>
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={savingPw}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">Confirm new password</label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={savingPw}
            />
          </div>
          <button
            type="submit"
            disabled={savingPw}
            className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {savingPw ? "Saving…" : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
