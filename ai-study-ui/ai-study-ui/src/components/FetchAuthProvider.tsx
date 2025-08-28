"use client";

import { useEffect, type PropsWithChildren } from "react";
import { supabase } from "@/lib/supabase-browser";

/**
 * Patches window.fetch (client-only) to auto-attach Authorization: Bearer <token>
 * for requests to /api/process and /api/quiz. No changes required elsewhere.
 */
export default function FetchAuthProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const origFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : input.url;

        if (url.startsWith("/api/process") || url.startsWith("/api/quiz")) {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session?.access_token) {
            const headers = new Headers(init?.headers as HeadersInit | undefined);
            headers.set("Authorization", `Bearer ${session.access_token}`);
            init = { ...init, headers };
          }
        }
      } catch {
        // swallow; we still fall through to original fetch
      }

      return origFetch(input as any, init as any);
    };

    return () => {
      window.fetch = origFetch;
    };
  }, []);

  return <>{children}</>;
}
