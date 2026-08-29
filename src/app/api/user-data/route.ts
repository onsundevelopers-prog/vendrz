import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  isSupabaseConfigured,
  loadUserData,
  saveUserData,
} from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * GET /api/user-data
 * Returns the signed-in user's persisted workspace data (or an empty
 * object when nothing has been saved yet).
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    // Persistence not wired yet - the app keeps working locally.
    return NextResponse.json({ data: {} });
  }
  const data = await loadUserData(userId);
  return NextResponse.json({ data: data ?? {} });
}

/**
 * PUT /api/user-data
 * Replaces the signed-in user's persisted workspace data.
 */
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Persistence isn't configured." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as { data?: unknown } | null;
  if (!body || typeof body.data !== "object" || body.data === null) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }
  const ok = await saveUserData(userId, body.data as Record<string, unknown>);
  if (!ok) {
    return NextResponse.json({ error: "Couldn't save your data." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
