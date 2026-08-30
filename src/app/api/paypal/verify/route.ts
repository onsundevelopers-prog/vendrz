import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  getPayPalSubscription,
  mapPlanIdToTier,
  PayPalError,
  type PlanMetadata,
} from "@/lib/paypal";
import { upsertSubscription } from "@/lib/paypalStore";

export const runtime = "nodejs";

/**
 * POST /api/paypal/verify
 *
 * Called from the client right after the buyer approves a PayPal
 * subscription. The server asks PayPal directly whether the subscription
 * is real, ACTIVE, and matches one of our configured plans. Only then is
 * the plan granted - the client's word is never trusted.
 *
 * On success the verified plan is written to the signed-in user's Clerk
 * account (privateMetadata.plan), so the paid status follows the account
 * across browsers and devices instead of living only in localStorage.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

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
      if (err instanceof PayPalError && (err.status === 404 || err.status === 400)) {
        // PayPal explicitly says this subscription doesn't exist.
        return NextResponse.json(
          { active: false, error: "This subscription couldn't be found at PayPal." },
          { status: 200 }
        );
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    // Map the PayPal plan the subscription actually belongs to onto one of
    // our tiers. The client-sent plan is never used as the source of truth.
    const tier = sub.planId ? mapPlanIdToTier(sub.planId) : undefined;
    if (!tier) {
      return NextResponse.json(
        { active: false, error: "This subscription isn't for one of our plans." },
        { status: 200 }
      );
    }

    const active = sub.status === "ACTIVE";
    upsertSubscription({
      subscriptionId,
      planId: sub.planId || "",
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

    // Bind the paid plan to the Clerk account so it survives browsers,
    // devices and logouts (localStorage alone is not the source of truth).
    // Subscriptions are re-verified on load; one-time purchases are not.
    const metadata: PlanMetadata = {
      tier,
      type: "subscription",
      subscriptionId,
      status: "active",
      updatedAt: new Date().toISOString(),
    };
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        privateMetadata: { plan: metadata },
      });
    } catch (err) {
      console.error(
        `[paypal] Couldn't save plan metadata for ${userId}:`,
        err instanceof Error ? err.message : err
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