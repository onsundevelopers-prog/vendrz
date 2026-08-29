import { NextRequest, NextResponse } from "next/server";
import { getPayPalSubscription } from "@/lib/paypal";
import { upsertSubscription } from "@/lib/paypalStore";

export const runtime = "nodejs";

/**
 * POST /api/paypal/verify
 *
 * Called from the client right after the buyer approves a PayPal
 * subscription. The server asks PayPal directly whether the subscription
 * is real, ACTIVE, and matches the configured Business plan. Only then is
 * Business mode granted - the client's word is never trusted.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      subscriptionId?: string;
    } | null;
    const subscriptionId = body?.subscriptionId?.trim();
    if (!subscriptionId) {
      return NextResponse.json({ error: "Missing subscription ID." }, { status: 400 });
    }

    let sub;
    try {
      sub = await getPayPalSubscription(subscriptionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Map the PayPal plan the subscription actually belongs to onto one of
    // our tiers. The client-sent plan is never used as the source of truth.
    const planIdToTier: Record<string, string> = {};
    const businessPlan =
      process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ?? process.env.PAYPAL_PLAN_ID ?? "";
    if (businessPlan) planIdToTier[businessPlan] = "business";
    const teamPlan = process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAM_ID ?? "";
    if (teamPlan) planIdToTier[teamPlan] = "team";

    const tier = sub.planId ? planIdToTier[sub.planId] : undefined;
    if (!tier) {
      return NextResponse.json(
        { active: false, error: "This subscription isn't for one of our plans." },
        { status: 200 }
      );
    }

    const active = sub.status === "ACTIVE";
    upsertSubscription({
      subscriptionId,
      planId: sub.planId || businessPlan,
      status: active ? "ACTIVE" : "PAYMENT_PENDING",
    });

    if (!active) {
      return NextResponse.json(
        {
          active: false,
          status: sub.status,
          error:
            "Your subscription isn't active yet. It can take a moment to activate - try again shortly.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      active: true,
      plan: tier,
      subscription: { id: sub.id, status: sub.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Verification failed: ${message}` }, { status: 500 });
  }
}
