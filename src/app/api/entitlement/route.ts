import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import {
  buildPaidRecord,
  buildTrialRecord,
  type EntitlementTier,
} from "@/lib/entitlement";

export const runtime = "nodejs";

/**
 * POST /api/entitlement  (founder/operator only)
 *
 * The manual purchase flow: a customer pays $250 CAD by e-transfer, the
 * founder confirms receipt, then calls this endpoint to grant Team Plus.
 * Nothing is automated - no payment SDK, no webhook - by design.
 *
 * Guarded by ADMIN_UPGRADE_TOKEN (env). Without it the endpoint refuses,
 * so a frontend-only "upgrade" is never possible. Never called from the
 * browser UI.
 *
 * Body: { action: "upgrade" | "revoke", email, tier? }
 *   - upgrade: grant `tier` (default "team") permanently to the account
 *     with that email (Clerk lookup by email address).
 *   - revoke:  clear the entitlement record (used to undo an erroneous
 *     grant or reset a trial). Refuses to touch a record whose kind is
 *     not grantable-once - call it once and it is gone.
 */
const TIERS: EntitlementTier[] = ["team", "business", "enterprise"];

function authorized(): boolean {
  const token = process.env.ADMIN_UPGRADE_TOKEN?.trim();
  return !!token;
}

async function requireToken(req: NextRequest): Promise<NextResponse | null> {
  if (!authorized()) {
    return NextResponse.json(
      { error: "Manual upgrades aren't configured on this deployment." },
      { status: 503 }
    );
  }
  const token = process.env.ADMIN_UPGRADE_TOKEN!.trim();
  const bearer = req.headers.get("authorization") ?? "";
  const headerToken = req.headers.get("x-admin-token") ?? "";
  const presented = bearer.startsWith("Bearer ") ? bearer.slice(7) : headerToken;
  if (!presented || presented !== token) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function POST(req: NextRequest) {
  const denied = await requireToken(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as
    | { action?: string; email?: string; tier?: string }
    | null;
  const action = body?.action;
  const email = body?.email?.trim().toLowerCase();
  if (action !== "upgrade" && action !== "revoke") {
    return NextResponse.json({ error: "action must be 'upgrade' or 'revoke'." }, { status: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  let tier: EntitlementTier = "team";
  if (action === "upgrade" && body?.tier) {
    if (!TIERS.includes(body.tier as EntitlementTier)) {
      return NextResponse.json(
        { error: `tier must be one of: ${TIERS.join(", ")}.` },
        { status: 400 }
      );
    }
    tier = body.tier as EntitlementTier;
  }

  try {
    const client = await clerkClient();
    const matches = await client.users.getUserList({ emailAddress: [email] });
    const user = matches.data[0];
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that email address." },
        { status: 404 }
      );
    }

    if (action === "upgrade") {
      await client.users.updateUser(user.id, {
        privateMetadata: { plan: buildPaidRecord(tier) },
      });
      return NextResponse.json({
        ok: true,
        userId: user.id,
        tier,
        message: `${email} is now on ${tier === "team" ? "Team Plus" : tier} permanently.`,
      });
    }

    // revoke: clear the record entirely. An accidental revoke means the
    // account falls back to a fresh trial on next load.
    await client.users.updateUser(user.id, {
      privateMetadata: { plan: buildTrialRecord() },
    });
    return NextResponse.json({
      ok: true,
      userId: user.id,
      message: `${email}'s entitlement was reset to a fresh trial.`,
    });
  } catch (err) {
    console.error(
      `[entitlement] ${action} failed for ${email}:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "We couldn't update that account right now. Please try again." },
      { status: 502 }
    );
  }
}
