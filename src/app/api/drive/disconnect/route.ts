import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revokeGoogleToken } from "@/lib/drive/oauth";
import { deleteTokens, getStoredTokens } from "@/lib/drive/store";

export const runtime = "nodejs";

/**
 * POST /api/drive/disconnect
 *
 * Revokes the Google OAuth grant server-side (best-effort) and deletes
 * the stored tokens so no further Drive data can be read. Imported
 * documents are kept - only future access is revoked.
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
