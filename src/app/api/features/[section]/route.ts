import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  canAccessSection,
  getCurrentUserPlan,
  rejectUnauthenticated,
  sectionDenied,
} from "@/lib/serverAuth";

export const runtime = "nodejs";

const VALID_SECTIONS = ["companies", "contracts", "renewals", "risks", "activity", "savings"];

/**
 * GET /api/features/[section]
 *
 * Server-side authorization gate for the workspace sections the Free and
 * Business plans gate behind the Team plan (Vendors, Contracts, Renewals,
 * Risk, Activity, Savings).
 *
 * A locked account gets a 403 here regardless of what the frontend shows,
 * so a user cannot unlock a restricted route or payload by calling the
 * API directly / typing the URL / manipulating client state.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ section: string }> }
) {
  const { userId } = await auth();
  if (!userId) return rejectUnauthenticated();

  const section = (await params).section;
  if (!VALID_SECTIONS.includes(section)) {
    return NextResponse.json({ error: "Unknown feature section." }, { status: 404 });
  }
  const ctx = await getCurrentUserPlan();
  if (!ctx) return rejectUnauthenticated();

  const allowed = await canAccessSection(section);
  if (!allowed) return sectionDenied(section, ctx.plan);

  return NextResponse.json({ section, allowed: true, plan: ctx.plan });
}