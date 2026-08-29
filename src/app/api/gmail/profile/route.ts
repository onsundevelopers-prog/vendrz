import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  fetchGmailProfile,
  GmailReconnectRequiredError,
  getValidAccessToken,
} from "@/lib/gmail/oauth";

export const runtime = "nodejs";

/**
 * GET /api/gmail/profile
 *
 * Reads the connected mailbox profile from the Gmail API with a valid
 * access token (refreshing it first when expired). This is the first
 * real read of the user's Gmail data. A dead connection returns 401
 * with `error: "reconnect_required"` so the UI can prompt for
 * reconnection.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const accessToken = await getValidAccessToken(userId);
    const profile = await fetchGmailProfile(accessToken);
    return NextResponse.json(profile);
  } catch (err) {
    if (err instanceof GmailReconnectRequiredError) {
      return NextResponse.json(
        { error: "reconnect_required", message: err.message },
        { status: 401 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[gmail] profile failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
