/* ------------------------------------------------------------------ */
/*  GET /api/health - cheap liveness/readiness probe.                   */
/*                                                                     */
/*  Used by Render's healthCheckPath. Hitting the landing page ("/")    */
/*  for health checks forces a full server-render of the marketing      */
/*  page every probe interval; this returns a fixed JSON body instead.  */
/*  It intentionally does NOT probe Supabase or the AI providers -      */
/*  those third parties having a bad minute shouldn't make Render       */
/*  restart a healthy app.                                              */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { ok: true, ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
