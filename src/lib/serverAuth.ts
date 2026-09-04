/* ------------------------------------------------------------------ */
/*  Server-side auth + entitlement helpers.                            */
/*                                                                     */
/*  Shared by API routes. These must only be imported from server code  */
/*  (route handlers). They never touch the browser.                    */
/*                                                                     */
/*  Entitlement source of truth: privateMetadata.plan on the Clerk     */
/*  account (see lib/entitlement.ts). The 30-day Team Plus trial is    */
/*  auto-started here, server-side, the first time a signed-in account */
/*  is seen - the browser can never start, extend or restart it.       */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  buildTrialRecord,
  entitlementView,
  readEntitlement,
  resolveEntitlement,
  type EntitlementKind,
  type PlanId,
} from "./entitlement";

export type Plan = PlanId;

export interface UserEntitlement {
  userId: string;
  /** Plan id the UI should show. */
  plan: PlanId;
  /** Server truth: none | trial | paid | expired. */
  entitlement: EntitlementKind;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  daysLeft: number;
}

function toUserEntitlement(
  userId: string,
  view: ReturnType<typeof resolveEntitlement>
): UserEntitlement {
  return {
    userId,
    plan: view.plan,
    entitlement: view.kind,
    trialEndsAt: view.trialEndsAt,
    trialStartedAt: view.trialStartedAt,
    daysLeft: view.daysLeft,
  };
}

export function rejectUnauthenticated(): NextResponse {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}

/** Persist the trial record to the user's Clerk metadata. */
async function writeTrial(client: Awaited<ReturnType<typeof clerkClient>>, userId: string) {
  try {
    await client.users.updateUser(userId, {
      privateMetadata: { plan: buildTrialRecord() },
    });
  } catch (err) {
    console.error(
      `[entitlement] couldn't auto-start trial for ${userId}:`,
      err instanceof Error ? err.message : err
    );
  }
}

/**
 * Resolve the signed-in user's entitlement from the server-side source of
 * truth. Auto-starts the 30-day trial the first time an account with no
 * record is seen (idempotent - never restarted, never extended locally).
 * Returns null when not authenticated or when Clerk can't be reached.
 */
export async function getCurrentUserPlan(): Promise<UserEntitlement | null> {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // Auto-start the trial only when there is genuinely no record.
    if (readEntitlement(user.privateMetadata) === null) {
      await writeTrial(client, userId);
      // Re-read after the write so a stale read can't report "none".
      const fresh = await client.users.getUser(userId);
      const view = resolveEntitlement(fresh.privateMetadata);
      return toUserEntitlement(userId, view);
    }

    return toUserEntitlement(userId, entitlementView(readEntitlement(user.privateMetadata)));
  } catch (err) {
    console.error(
      `[serverAuth] load entitlement for ${userId} failed:`,
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Sections gated behind the Team Plus plan. Free (incl. an expired trial)
 * locks Vendors, Contracts, Renewals, Risk, Activity and Savings;
 * Business additionally locks Renewals / Risk / Savings. This is the
 * server-side mirror of PLAN_LOCKED_SECTIONS in displayMode.tsx so the
 * API and the UI agree (and the API can be called directly without
 * bypassing either).
 */
export const SERVER_LOCKED_SECTIONS: Record<Plan, string[]> = {
  free: ["companies", "contracts", "renewals", "risks", "activity", "savings"],
  team: [],
  business: ["renewals", "risks", "savings"],
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
      error: "This feature is included with the Team Plus plan.",
      section,
      locked: true,
      plan,
      upgradeTo: "team",
    },
    { status: 403 }
  );
}
