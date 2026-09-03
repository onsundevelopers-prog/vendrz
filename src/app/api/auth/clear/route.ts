import { NextRequest, NextResponse } from "next/server";
import { clearClerkAuthCookies } from "@/lib/clerkCookies";

/**
 * POST /api/auth/clear
 *
 * Drops every Clerk auth cookie this browser holds for the app origin.
 * Used by the sign-in recovery path when clerk-js cannot boot because of
 * stale session state from an older Clerk instance/domain. Clearing an
 * invalid cookie is always safe: if a real session existed the server's
 * `auth()` would have reported it and this endpoint would not be needed.
 * The caller reloads afterwards so clerk-js starts from a clean slate.
 */
export async function POST(req: NextRequest) {
  const secure = req.nextUrl.protocol === "https:";
  const res = NextResponse.json({ ok: true });
  clearClerkAuthCookies(res.cookies, { secure });
  return res;
}
