/* ------------------------------------------------------------------ */
/*  Server-side auth + entitlement helpers.                            */
/*                                                                     */
/*  Shared by API routes. These must only be imported from server code  */
/*  (route handlers). They never touch the browser.                    */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { readPlanMetadata } from "./paypal";

export type Plan = "free" | "team" | "business" | "enterprise";

export function rejectUnauthenticated(): NextResponse {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}

/**
 * Resolve the signed-in user's plan from the server-side source of truth
 * (Clerk-owned metadata written by /api/paypal/verify and /api/redeem).
 * Returns null when not authenticated or when Clerk can't be reached.
 */
export async function getCurrentUserPlan(): Promise<{
  userId: string;
  plan: Plan;
} | null> {
  const { userId } = await auth();
  if (!userId) return null;
  let plan: Plan = "free";
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = readPlanMetadata(user.privateMetadata);
    if (meta?.tier) plan = meta.tier as Plan;
  } catch (err) {
    console.error(`[serverAuth] load plan for ${userId} failed:`, err instanceof Error ? err.message : err);
  }
  return { userId, plan };
}

/**
 * Sections gated behind the Team plan for Business-plan accounts. This is
 * the server-side mirror of PLAN_LOCKED_SECTIONS in displayMode.tsx so the
 * API and the UI agree (and the API can be called directly without
 * bypassing either).
 */
export const SERVER_LOCKED_SECTIONS: Record<Plan, string[]> = {
  free: [],
  team: [],
  business: ["renewals", "risk", "savings"],
  enterprise: [],
};

/** Whether the user's plan is permitted to access a named feature section. */
export async function canAccessSection(section: string): Promise<boolean> {
  const ctx = await getCurrentUserPlan();
  if (!ctx) return false; // not authenticated -> deny
  const locked = SERVER_LOCKED_SECTIONS[ctx.plan] ?? [];
  return !locked.includes(section);
}

/** Deny response for a locked/unauthorized section. */
export function sectionDenied(section: string, plan: string): NextResponse {
  return NextResponse.json(
    {
      error: "This feature is included with the Team plan.",
      section,
      locked: true,
      plan,
      upgradeTo: "team",
    },
    { status: 403 }
  );
}