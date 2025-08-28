import { NextResponse, type NextRequest } from "next/server";

/**
 * Guests can POST exactly once across generation endpoints.
 * - First anonymous POST: allowed; sets cookie guest_used=1
 * - Later anonymous POSTs: 403
 * - Authenticated (Bearer token): allowed
 */
export function middleware(req: NextRequest) {
  const isGenEndpoint =
    req.method === "POST" &&
    (req.nextUrl.pathname === "/api/process" || req.nextUrl.pathname === "/api/quiz");

  if (!isGenEndpoint) return NextResponse.next();

  const auth = req.headers.get("authorization") || "";
  const isAuthed = auth.toLowerCase().startsWith("bearer ");
  const guestCookieUsed = req.cookies.get("guest_used")?.value === "1";

  if (!isAuthed && guestCookieUsed) {
    return NextResponse.json(
      {
        error: "Guest limit reached. Please sign up or log in to continue.",
        code: "GUEST_LIMIT",
      },
      { status: 403 }
    );
  }

  const res = NextResponse.next();

  if (!isAuthed && !guestCookieUsed) {
    res.cookies.set({
      name: "guest_used",
      value: "1",
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}

export const config = {
  matcher: ["/api/process", "/api/quiz"],
};
