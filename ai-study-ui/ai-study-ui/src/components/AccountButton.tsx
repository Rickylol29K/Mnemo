"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

type UserLite = { id: string; email: string | null; first_name?: string };

export default function AccountButton({
  asNavLink = false,
  className = "",
}: { asNavLink?: boolean; className?: string }) {
  const router = useRouter();
  const [user, setUser] = useState<UserLite | null>(null);
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const u = data.user;
      setUser(
        u
          ? { id: u.id, email: u.email ?? null, first_name: (u.user_metadata as any)?.first_name }
          : null
      );
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_evt: unknown, session: { user: any } | null) => {
        const u = session?.user;
        setUser(
          u
            ? { id: u.id, email: u.email ?? null, first_name: (u.user_metadata as any)?.first_name }
            : null
        );
      }
    );

    return () => {
      sub?.subscription?.unsubscribe();
      mounted = false;
    };
  }, []);

  function clearHoverTimer() {
    if (hoverTimer.current) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }

  function openNow() {
    clearHoverTimer();
    setOpen(true);
  }
  function closeWithDelay() {
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => setOpen(false), 150);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/");
  }

  // Logged OUT
  if (!user) {
    return (
      <Link
        href="/account"
        className={asNavLink ? className : `text-blue-600 ${className}`}
        style={{ display: "inline-block" }}
      >
        Login
      </Link>
    );
  }

  // Logged IN
  return (
    <div
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeWithDelay}
      onFocus={openNow}
      onBlur={closeWithDelay}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-md px-2 py-1 ${className}`}
        style={{ color: "#2563eb" }} // blue-600
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        My account
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-44 overflow-hidden rounded-lg border bg-white shadow-lg"
          onMouseEnter={openNow}
          onMouseLeave={closeWithDelay}
        >
          <Link
            href="/settings"
            className="block px-3 py-2 text-sm hover:bg-zinc-50"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="block w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
