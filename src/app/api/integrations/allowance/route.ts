import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { integrationImportAllowance } from "@/lib/ingest";

export const runtime = "nodejs";

/**
 * GET /api/integrations/allowance
 *
 * Reports how many Google Drive / Slack document imports the signed-in
 * user may still run: free accounts get 1 evaluation import, paid plans
 * are unlimited. This is a soft product gate only - it never carries
 * secrets and does not reveal anything about other users.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const allowance = await integrationImportAllowance(userId);
  return NextResponse.json(allowance);
}
