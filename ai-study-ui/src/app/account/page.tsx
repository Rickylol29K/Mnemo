// src/app/account/page.tsx
"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function AccountPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Logged in!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { first_name: firstName.trim() },
        },
      });
      if (error) throw error;

      // If email confirmations are ON, there may be no session yet.
      if (!data.session) {
        toast.success("Check your email to confirm your account.");
        return;
      }

      toast.success("Account created!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err?.message ?? "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-zinc-600">
          {mode === "login" ? (
            <>
              Don’t have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
              .
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
                className="text-blue-600 hover:underline"
              >
                Log in
              </button>
              .
            </>
          )}
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <form onSubmit={mode === "login" ? onLogin : onSignup} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
                placeholder="Ada"
                autoComplete="given-name"
                disabled={busy}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
              placeholder="you@example.com"
              autoComplete="email"
              disabled={busy}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              disabled={busy}
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <div className="mt-3 text-xs text-zinc-500">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </div>
      </div>
    </div>
  );
}
