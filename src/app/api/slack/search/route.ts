import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getUserToken,
  handleReconnectRequired,
  searchSlackFiles,
  searchSlackMessages,
  SlackApiError,
  SlackReconnectRequiredError,
} from "@/lib/slack/oauth";

export const runtime = "nodejs";

/**
 * GET /api/slack/search?q=<query>&type=messages|files&count=<n>
 *
 * Searches the connected user's Slack messages or files with their own
 * token (search:read). Results carry display metadata only - channel,
 * sender, timestamp, permalink - never raw download URLs. A revoked
 * token returns 401 with `error: "reconnect_required"` so the UI can
 * prompt for reconnection. Files and messages are only ever searched -
 * nothing is scraped and no full-history dump is requested.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const query = (sp.get("q") ?? "").trim().slice(0, 300);
  const type = sp.get("type") === "files" ? "files" : "messages";
  const rawCount = Number(sp.get("count") ?? 20);
  const count = Number.isFinite(rawCount)
    ? Math.min(Math.max(Math.round(rawCount), 1), 100)
    : 20;

  if (!query) {
    return NextResponse.json(
      { error: "Enter a search query to find messages or files in Slack." },
      { status: 400 }
    );
  }

  try {
    const token = await getUserToken(userId);
    if (type === "files") {
      const { matches, total } = await searchSlackFiles(token, query, count);
      return NextResponse.json({ type: "files", matches, total });
    }
    const { matches, total } = await searchSlackMessages(token, query, count);
    return NextResponse.json({ type: "messages", matches, total });
  } catch (err) {
    if (err instanceof SlackReconnectRequiredError) {
      return NextResponse.json(
        { error: "reconnect_required", message: err.message },
        { status: 401 }
      );
    }
    if (err instanceof SlackApiError) {
      if (["token_revoked", "invalid_auth", "account_inactive"].includes(err.code ?? "")) {
        try {
          await handleReconnectRequired(userId, err);
        } catch (reconnectErr) {
          if (reconnectErr instanceof SlackReconnectRequiredError) {
            return NextResponse.json(
              { error: "reconnect_required", message: reconnectErr.message },
              { status: 401 }
            );
          }
        }
      }
      if (err.code === "ratelimited") {
        return NextResponse.json(
          { error: "Slack is rate-limiting searches right now. Wait a moment and try again." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: "Couldn't search Slack right now. Please try again." },
        { status: 502 }
      );
    }
    console.error("[slack] search failed:", err);
    return NextResponse.json(
      { error: "Couldn't reach Slack right now. Please try again." },
      { status: 502 }
    );
  }
}
