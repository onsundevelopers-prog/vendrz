import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  buildTrialRecord,
  readEntitlement,
  resolveEntitlement,
} from "@/lib/entitlement";

export const runtime = "nodejs";

/**
 * GET /api/plan
 *
 * The server-side source of truth for a user's access. Reads the
 * entitlement record on the Clerk account (written by this route's trial
 * auto-start, /api/entitlement after a confirmed e-transfer, or
 * /api/redeem) and resolves it against the server clock.
 *
 * - No record            -> a 30-day Team Plus trial is auto-started and
 *   reported (server-side, idempotent - never restarted by the client).
 * - Trial                -> Team Plus until trialEndsAt; daysLeft included.
 * - Expired trial        -> free; the client shows the upgrade screen.
 * - Paid                 -> Team Plus / Business / Enterprise permanently.
 *
 * The browser is never asked to compute access: it only receives the state
 * the server resolved, so localStorage edits cannot extend a trial.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    let user = await client.users.getUser(userId);

    // Auto-start the trial exactly once per account, server-side.
    if (readEntitlement(user.privateMetadata) === null) {
      await client.users.updateUser(userId, {
        privateMetadata: { plan: buildTrialRecord() },
      });
      user = await client.users.getUser(userId);
    }

    const view = resolveEntitlement(user.privateMetadata);
    const active = view.kind === "paid" || view.kind === "trial";
    return NextResponse.json({
      plan: view.plan,
      active,
      verified: true,
      entitlement: view.kind,
      tier: view.tier,
      trialStartedAt: view.trialStartedAt,
      trialEndsAt: view.trialEndsAt,
      daysLeft: view.daysLeft,
      paidAt: view.paidAt,
    });
  } catch (err) {
    console.error(
      `[plan] couldn't resolve entitlement for ${userId}:`,
      err instanceof Error ? err.message : err
    );
    // Clerk unreachable - respond 503; the client keeps its current state,
    // so a network blip can never downgrade a paying/trial user.
    return NextResponse.json(
      { error: "Couldn't check your access right now.", verified: false },
      { status: 503 }
    );
  }
}
