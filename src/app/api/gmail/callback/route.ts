import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  exchangeCodeForTokens,
  fetchGmailProfile,
} from "@/lib/gmail/oauth";
import { getRedirectUri } from "@/lib/gmail/config";
import { saveTokens } from "@/lib/gmail/store";

export const runtime = "nodejs";

const STATE_COOKIE = "gmail_oauth_state";

const SETTINGS_PATH = "/dashboard/settings";

function redirectToSettings(
  origin: string,
  result: "connected" | "denied" | "error"
): NextResponse {
  const res = NextResponse.redirect(`${origin}${SETTINGS_PATH}?gmail=${result}`);
  // Always clear the one-time state cookie once the flow has ended.
  res.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}

/**
 * GET /api/gmail/callback
 *
 * Google redirects here after the user approves (or denies) the consent
 * screen. Steps:
 *   1. Handle explicit denials and errors from Google.
 *   2. Verify the CSRF `state` matches the cookie set by /api/gmail/auth.
 *   3. Exchange the one-time code for access + refresh tokens.
 *   4. Read the Gmail profile to learn the authorized address.
 *   5. Store the tokens server-side (encrypted at rest when configured).
 *   6. Redirect back to Settings with a status flag.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const origin = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;

  if (!userId) return redirectToSettings(origin, "error");

  // User denied the permission request - not an error, just cancelled.
  const error = params.get("error");
  if (error) {
    return redirectToSettings(
      origin,
      error === "access_denied" ? "denied" : "error"
    );
  }

  const code = params.get("code");
  const state = params.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    // Missing/mismatched state is a CSRF or an expired flow - reject.
    return redirectToSettings(origin, "error");
  }

  const redirectUri = getRedirectUri(origin);
  try {
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const profile = await fetchGmailProfile(tokens.accessToken);
    await saveTokens(userId, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiryMs: Date.now() + (tokens.expiresIn - 60) * 1000,
      scope: tokens.scope,
      email: profile.emailAddress || null,
      connectedAt: new Date().toISOString(),
    });
    return redirectToSettings(origin, "connected");
  } catch (err) {
    console.error("[gmail] OAuth callback failed:", err);
    return redirectToSettings(origin, "error");
  }
}
