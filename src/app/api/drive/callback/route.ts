import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  exchangeCodeForTokens,
  fetchDriveProfile,
} from "@/lib/drive/oauth";
import { getRedirectUri } from "@/lib/drive/config";
import { saveTokens } from "@/lib/drive/store";
import { oauthDoneRedirect, safeNextPath } from "@/lib/oauth/redirects";

export const runtime = "nodejs";

const STATE_COOKIE = "drive_oauth_state";
const NEXT_COOKIE = "drive_oauth_next";
const DEFAULT_NEXT = "/dashboard/import";

/**
 * GET /api/drive/callback
 *
 * Google redirects here after the user approves (or denies) the consent
 * screen. Steps:
 *   1. Handle explicit denials and errors from Google.
 *   2. Verify the CSRF `state` matches the cookie set by /api/drive/auth.
 *   3. Exchange the one-time code for access + refresh tokens.
 *   4. Read the Drive profile to learn the authorized account.
 *   5. Store the tokens server-side (encrypted at rest when configured).
 *   6. Redirect back to the app with a status flag.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;
  const nextPath = safeNextPath(req.cookies.get(NEXT_COOKIE)?.value ?? null, DEFAULT_NEXT);
  const done = (result: "connected" | "denied" | "error") =>
    oauthDoneRedirect({
      origin,
      stateCookie: STATE_COOKIE,
      clearCookies: [NEXT_COOKIE],
      nextPath,
      resultKey: "drive",
      result,
    });

  if (!userId) return done("error");

  // User denied the permission request - not an error, just cancelled.
  const error = params.get("error");
  if (error) {
    return done(error === "access_denied" ? "denied" : "error");
  }

  const code = params.get("code");
  const state = params.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    // Missing/mismatched state is a CSRF or an expired flow - reject.
    return done("error");
  }

  const redirectUri = getRedirectUri(origin);
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const profile = await fetchDriveProfile(tokens.accessToken);
    await saveTokens(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryMs: Date.now() + (tokens.expiresIn - 60) * 1000,
      scope: tokens.scope,
      name: profile.displayName || null,
      email: profile.emailAddress || null,
      connectedAt: new Date().toISOString(),
    });
    return done("connected");
  } catch (err) {
    console.error("[drive] OAuth callback failed:", err);
    return done("error");
  }
}
