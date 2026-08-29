import { NextRequest, NextResponse } from "next/server";
import { getPayPalSubscription } from "@/lib/paypal";
import {
  getStoredSubscription,
  upsertSubscription,
  type SubscriptionStatus,
} from "@/lib/paypalStore";

export const runtime = "nodejs";

/**
 * GET /api/paypal/subscription?subscriptionId=...
 *
 * Returns the current status of a subscription. The stored record
 * (updated by webhooks) is authoritative for terminal states like
 * CANCELLED/EXPIRED; otherwise the server re-checks with PayPal so a
 * server restart or a missed webhook can't silently keep Business mode
 * alive (or kill it) on stale data.
 *
 * When PayPal is unreachable the request returns 503 and the client is
 * expected to keep the current state - a network blip should never
 * downgrade a paying user.
 */
export async function GET(req: NextRequest) {
  const subscriptionId = req.nextUrl.searchParams.get("subscriptionId")?.trim();
  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing subscription ID." }, { status: 400 });
  }

  const stored = getStoredSubscription(subscriptionId);

  // Webhook-reported terminal states are authoritative and cheap.
  if (stored && stored.status !== "ACTIVE" && stored.status !== "PAYMENT_PENDING") {
    return NextResponse.json({
      subscriptionId,
      status: stored.status,
      active: false,
    });
  }

  // Otherwise verify live with PayPal (covers restarts and missed webhooks).
  try {
    const sub = await getPayPalSubscription(subscriptionId);
    const active = sub.status === "ACTIVE";
    upsertSubscription({
      subscriptionId,
      planId: sub.planId,
      status: (active ? "ACTIVE" : sub.status) as SubscriptionStatus,
    });
    return NextResponse.json({
      subscriptionId,
      status: sub.status,
      active,
    });
  } catch {
    return NextResponse.json(
      {
        subscriptionId,
        status: stored?.status ?? "UNKNOWN",
        // If we don't know better, assume the subscription is still valid.
        active: stored ? stored.status === "ACTIVE" : true,
        error: "Couldn't reach PayPal to verify this subscription.",
      },
      { status: 503 }
    );
  }
}
