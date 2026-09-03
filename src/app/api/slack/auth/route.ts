import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildAuthUrl } from "@/lib/slack/oauth";
import {
  getClientConfig,
  getRedirectUri,
  isSlackConfigured,
} from "@/lib/slack/config";
import { safeNextPath } from "@/lib/oauth/redirects";

export const runtime = "nodejs";

const STATE_COOKIE = "slack_oauth_state";
const NEXT_COOKIE = "slack_oauth_next";
const STATE_TTL_SECONDS = 600;
const DEFAULT_NEXT = "/dashboard/import";

/**
 * GET /api/slack/auth?next=<path>
 *
 * Starts the Slack OAuth flow: creates a random CSRF `state`, stores it
 * (and the validated return path) in httpOnly cookies, and redirects the
 * browser to Slack's consent screen. The callback route later verifies
 * the state before exchanging the code for the user token.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!isSlackConfigured()) {
    return NextResponse.json(
      { error: "Slack is not configured on this deployment." },
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
  const nextPath = safeNextPath(req.nextUrl.searchParams.get("next"), DEFAULT_NEXT);
  const secure = origin.startsWith("https");

  const res = NextResponse.redirect(buildAuthUrl({ redirectUri, state }));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  res.cookies.set(NEXT_COOKIE, nextPath, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: STATE_TTL_SECONDS,
  });
  return res;
}
