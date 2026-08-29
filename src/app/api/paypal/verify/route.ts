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

    // The plan must match the configured Business plan. The client-sent
    // plan is never used as the source of truth.
    const configuredPlan = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ?? process.env.PAYPAL_PLAN_ID ?? "";
    if (configuredPlan && sub.planId && sub.planId !== configuredPlan) {
      return NextResponse.json(
        { active: false, error: "This subscription isn't for the Business plan." },
        { status: 200 }
      );
    }

    const active = sub.status === "ACTIVE";
    upsertSubscription({
      subscriptionId,
      planId: sub.planId || configuredPlan,
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
      subscription: { id: sub.id, status: sub.status },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Verification failed: ${message}` }, { status: 500 });
  }
}
