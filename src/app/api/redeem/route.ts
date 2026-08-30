import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { PlanMetadata } from "@/lib/paypal";

export const runtime = "nodejs";

/**
 * POST /api/redeem
 *
 * Validates a one-time redemption code server-side and binds the granted
 * plan to the signed-in user's Clerk account (privateMetadata.plan), the
 * same account record that PayPal verification writes. The code is never
 * validated in the browser, and the granted tier is decided here - never
 * sent from the client.
 *
 * Codes live on the server (env REDEEM_CODES as `code:plan` pairs); if none
 * are configured the endpoint refuses, so a frontend-only "success" is never
 * possible. Redeeming is one-shot per account.
 */

interface RedeemCodeDef {
  plan: string;
  /** Optional friendly description shown to the buyer. */
  label: string;
  limited?: boolean;
}

const DEFAULT_CODES: Record<string, RedeemCodeDef> = {
  "7ff437": { plan: "team", label: "One month of Team" },
};

/** Parse optional env: `REDEEM_CODES=code1:team,code2:business` */
function configuredCodes(): Record<string, RedeemCodeDef> {
  const raw = process.env.REDEEM_CODES?.trim();
  if (!raw) return DEFAULT_CODES;
  const out: Record<string, RedeemCodeDef> = {};
  for (const pair of raw.split(",")) {
    const [code, plan] = pair.split(":").map((s) => s.trim());
    if (code && plan) out[code.toLowerCase()] = { plan, label: plan };
  }
  return Object.keys(out).length ? out : DEFAULT_CODES;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  const code = body?.code?.trim().toLowerCase();
  if (!code) {
    return NextResponse.json({ error: "Enter a code to redeem." }, { status: 400 });
  }

  const def = configuredCodes()[code];
  if (!def) {
    return NextResponse.json(
      { error: "That code isn't valid or has expired." },
      { status: 400 }
    );
  }

  // Block already-redeemed codes per account: once a code's plan is bound to
  // this user, re-redeeming is a no-op / error rather than stacking.
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const existing = user.privateMetadata?.plan as
      | { tier?: unknown; status?: unknown; subscriptionId?: unknown; updatedAt?: unknown }
      | undefined;
    if (existing && typeof existing.tier === "string") {
      return NextResponse.json({
        ok: true,
        alreadyActive: true,
        plan: existing.tier,
        message: `Your ${existing.tier} plan is already active.`,
      });
    }

    const metadata: PlanMetadata = {
      tier: def.plan,
      subscriptionId: `redeem:${code}`,
      status: "active",
      updatedAt: new Date().toISOString(),
    };
    await client.users.updateUser(userId, {
      privateMetadata: { plan: metadata },
    });

    return NextResponse.json({
      ok: true,
      plan: def.plan,
      label: def.label,
      message: `Redeemed — ${def.plan} is now active on your account.`,
    });
  } catch (err) {
    console.error(
      `[redeem] Couldn't bind code for ${userId}:`,
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "We couldn't apply your code right now. Please try again." },
      { status: 502 }
    );
  }
}