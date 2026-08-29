import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revokeGoogleToken } from "@/lib/gmail/oauth";
import { deleteTokens, getStoredTokens } from "@/lib/gmail/store";

export const runtime = "nodejs";

/**
 * POST /api/gmail/disconnect
 *
 * Revokes the Google OAuth grant server-side (best-effort) and deletes
 * the stored tokens so no further data can be read. Imported documents
 * are kept - only future access is revoked.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const stored = await getStoredTokens(userId);
  if (stored) {
    await revokeGoogleToken(stored.accessToken);
    await deleteTokens(userId);
  }

  return NextResponse.json({ ok: true });
}
