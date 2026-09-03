import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revokeSlackToken } from "@/lib/slack/oauth";
import { deleteTokens, getStoredTokens } from "@/lib/slack/store";

export const runtime = "nodejs";

/**
 * POST /api/slack/disconnect
 *
 * Revokes the Slack user token server-side (best-effort) and deletes the
 * stored credentials so no further Slack data can be read. Imported
 * documents are kept - only future access is revoked.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const stored = await getStoredTokens(userId);
  if (stored) {
    await revokeSlackToken(stored.userToken);
    await deleteTokens(userId);
  }

  return NextResponse.json({ ok: true });
}
