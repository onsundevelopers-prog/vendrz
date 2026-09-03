import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  authTest,
  SlackApiError,
  SlackReconnectRequiredError,
} from "@/lib/slack/oauth";
import { isSlackConfigured } from "@/lib/slack/config";
import { deleteTokens, getStoredTokens, saveTokens } from "@/lib/slack/store";

export const runtime = "nodejs";

/**
 * GET /api/slack/status
 *
 * Reports whether the signed-in user has a live Slack connection. Never
 * returns tokens. Confirms the token still works with auth.test (Slack
 * user tokens don't expire, but they can be revoked); a revoked token
 * removes the stored connection and returns `reconnectRequired` so the
 * UI can prompt the user to reconnect.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const configured = isSlackConfigured();
  const stored = await getStoredTokens(userId);
  if (!stored) {
    return NextResponse.json({ connected: false, configured });
  }

  try {
    const test = await authTest(stored.userToken);
    // Refresh workspace identity if auth.test learned anything new.
    if (
      test.workspaceUrl &&
      (stored.workspaceUrl !== test.workspaceUrl ||
        stored.teamId !== test.teamId ||
        stored.teamName !== test.teamName)
    ) {
      await saveTokens(userId, {
        ...stored,
        teamId: test.teamId || stored.teamId,
        teamName: test.teamName || stored.teamName,
        workspaceUrl: test.workspaceUrl,
      });
    }
    return NextResponse.json({
      connected: true,
      configured,
      teamName: test.teamName || stored.teamName,
      workspaceUrl: test.workspaceUrl || stored.workspaceUrl,
      connectedAt: stored.connectedAt,
      scope: stored.scope,
    });
  } catch (err) {
    if (
      err instanceof SlackReconnectRequiredError ||
      (err instanceof SlackApiError &&
        ["token_revoked", "invalid_auth", "account_inactive"].includes(err.code ?? ""))
    ) {
      // A revoked/invalid token ends the connection so the UI asks to
      // reconnect instead of erroring on every call.
      await deleteTokens(userId);
      return NextResponse.json({
        connected: false,
        configured,
        reconnectRequired: true,
      });
    }
    // Transient Slack hiccup - don't kill the connection over it.
    return NextResponse.json({
      connected: true,
      configured,
      teamName: stored.teamName,
      workspaceUrl: stored.workspaceUrl,
      connectedAt: stored.connectedAt,
      scope: stored.scope,
    });
  }
}
