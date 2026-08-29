import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  GmailReconnectRequiredError,
  getValidAccessToken,
} from "@/lib/gmail/oauth";
import { isGmailOAuthConfigured } from "@/lib/gmail/config";
import { deleteTokens, getStoredTokens } from "@/lib/gmail/store";

export const runtime = "nodejs";

/**
 * GET /api/gmail/status
 *
 * Reports whether the signed-in user has a live Gmail connection.
 * Never returns tokens. Verifies the connection is still usable (which
 * may transparently refresh an expired access token); if the refresh
 * token is dead the connection is removed and `reconnectRequired` is
 * returned so the UI can prompt the user to reconnect.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const configured = isGmailOAuthConfigured();
  const stored = await getStoredTokens(userId);
  if (!stored) {
    return NextResponse.json({ connected: false, configured });
  }

  try {
    await getValidAccessToken(userId); // refresh when needed
    return NextResponse.json({
      connected: true,
      configured,
      email: stored.email,
      connectedAt: stored.connectedAt,
      scope: stored.scope,
    });
  } catch (err) {
    if (err instanceof GmailReconnectRequiredError) {
      await deleteTokens(userId);
      return NextResponse.json({
        connected: false,
        configured,
        reconnectRequired: true,
      });
    }
    // Transient Google hiccup - don't kill the connection over it.
    return NextResponse.json({
      connected: true,
      configured,
      email: stored.email,
      connectedAt: stored.connectedAt,
      scope: stored.scope,
    });
  }
}
