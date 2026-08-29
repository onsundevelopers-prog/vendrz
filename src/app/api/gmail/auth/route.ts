import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildAuthUrl } from "@/lib/gmail/oauth";
import {
  getClientConfig,
  getRedirectUri,
  isGmailOAuthConfigured,
} from "@/lib/gmail/config";

export const runtime = "nodejs";

const STATE_COOKIE = "gmail_oauth_state";
const STATE_TTL_SECONDS = 600;

/**
 * GET /api/gmail/auth
 *
 * Starts the Google OAuth flow: creates a random CSRF `state`, stores it
 * in an httpOnly cookie, and redirects the browser to Google's consent
 * screen. The callback route later verifies the state before exchanging
 * the code for tokens.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!isGmailOAuthConfigured()) {
    return NextResponse.json(
      { error: "Gmail OAuth is not configured on this deployment." },
      { status: 503 }
    );
  }

  try {
    getClientConfig();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const origin = req.nextUrl.origin;
  const redirectUri = getRedirectUri(origin);
  const state = crypto.randomBytes(24).toString("hex");

  const res = NextResponse.redirect(buildAuthUrl({ redirectUri, state }));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}
