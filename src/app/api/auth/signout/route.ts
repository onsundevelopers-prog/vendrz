import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

export const runtime = "nodejs";

/**
 * POST /api/auth/signout
 *
 * Server-side sign-out for the dashboard, which does not load clerk-js.
 * Revokes the session on Clerk's side so the token dies immediately, then
 * clears every Clerk cookie the browser may hold (client + session tokens,
 * in both host-only and domain-scoped forms).
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await auth();
    if (sessionId) {
      try {
        const client = await clerkClient();
        await client.sessions.revokeSession(sessionId);
      } catch {
        // Session already gone (expired/revoked elsewhere) - nothing to do.
      }
    }
  } catch {
    // Not signed in - still clear cookies below.
  }

  const res = NextResponse.json({ ok: true });
  // Domain attribute must be a bare host (no port) or browsers ignore it.
  const host = (req.headers.get("host") ?? "").split(":")[0];
  const names = ["__client", "__session", "__session_uat", "__session_legacy"];
  const base = { path: "/", maxAge: 0, sameSite: "lax" as const, secure: true };
  for (const name of names) {
    res.cookies.set(name, "", base);
    if (host) res.cookies.set(name, "", { ...base, domain: host });
  }
  // Per-client session cookies (__session_<clientId>) if any exist.
  for (const c of req.cookies.getAll()) {
    if (c.name.startsWith("__session_") && !names.includes(c.name)) {
      res.cookies.set(c.name, "", base);
      if (host) res.cookies.set(c.name, "", { ...base, domain: host });
    }
  }
  return res;
}