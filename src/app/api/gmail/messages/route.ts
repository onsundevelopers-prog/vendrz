import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  fetchGmailMessages,
  GmailReconnectRequiredError,
  getValidAccessToken,
} from "@/lib/gmail/oauth";

export const runtime = "nodejs";

/**
 * GET /api/gmail/messages?q=<gmail query>&maxResults=<n>
 *
 * Lists recent messages from the connected mailbox (metadata only:
 * subject, from, date, snippet - never bodies). Uses a valid access
 * token, auto-refreshing when expired. A dead connection returns 401
 * with `error: "reconnect_required"`.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const rawMax = Number(req.nextUrl.searchParams.get("maxResults") ?? 10);
  const maxResults = Number.isFinite(rawMax)
    ? Math.min(Math.max(Math.round(rawMax), 1), 25)
    : 10;
  const query = req.nextUrl.searchParams.get("q") ?? "";

  try {
    const accessToken = await getValidAccessToken(userId);
    const messages = await fetchGmailMessages(accessToken, query, maxResults);
    return NextResponse.json({ messages, count: messages.length });
  } catch (err) {
    if (err instanceof GmailReconnectRequiredError) {
      return NextResponse.json(
        { error: "reconnect_required", message: err.message },
        { status: 401 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[gmail] messages failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
