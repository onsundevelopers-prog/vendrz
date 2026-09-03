import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  authTest,
  exchangeCodeForTokens,
  SlackApiError,
} from "@/lib/slack/oauth";
import { getRedirectUri } from "@/lib/slack/config";
import { saveTokens } from "@/lib/slack/store";
import { oauthDoneRedirect, safeNextPath } from "@/lib/oauth/redirects";

export const runtime = "nodejs";

const STATE_COOKIE = "slack_oauth_state";
const NEXT_COOKIE = "slack_oauth_next";
const DEFAULT_NEXT = "/dashboard/import";

/**
 * GET /api/slack/callback
 *
 * Slack redirects here after the user approves (or denies) the consent
 * screen. Steps:
 *   1. Handle explicit denials and errors from Slack.
 *   2. Verify the CSRF `state` matches the cookie set by /api/slack/auth.
 *   3. Exchange the one-time code for the user token.
 *   4. Confirm the connection with auth.test (workspace + user).
 *   5. Store the token server-side (encrypted at rest when configured).
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
      resultKey: "slack",
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
    const test = await authTest(tokens.userToken);
    await saveTokens(userId, {
      userToken: tokens.userToken,
      slackUserId: tokens.slackUserId,
      teamId: tokens.teamId || test.teamId,
      teamName: tokens.teamName || test.teamName,
      workspaceUrl: test.workspaceUrl || null,
      scope: tokens.scope,
      connectedAt: new Date().toISOString(),
    });
    return done("connected");
  } catch (err) {
    if (err instanceof SlackApiError) {
      console.error("[slack] OAuth callback failed:", err.code, err.message);
    } else {
      console.error("[slack] OAuth callback failed:", err);
    }
    return done("error");
  }
}
