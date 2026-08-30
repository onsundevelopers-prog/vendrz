import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  getPayPalSubscription,
  mapPlanIdToTier,
  readPlanMetadata,
  PayPalError,
} from "@/lib/paypal";
import { upsertSubscription } from "@/lib/paypalStore";

export const runtime = "nodejs";

/**
 * GET /api/plan?subscriptionId=...
 *
 * The server-side source of truth for a user's plan. Reads the paid-plan
 * record stored on the Clerk account (written by /api/paypal/verify) and
 * re-checks the subscription with PayPal so cancellations/expirations are
 * enforced even if a webhook was missed or a serverless instance restarted.
 *
 * - ACTIVE subscription  -> returns the paid tier (and repairs metadata
 *   if the local browser only has a subscription id).
 * - CANCELLED/EXPIRED    -> clears the stored plan and returns free.
 * - PayPal unreachable   -> 503; the client keeps the current state, so a
 *   network blip can never downgrade a paying user.
 * - No subscription known -> returns free with `verified: false` (nothing
 *   to check), so the client keeps whatever it had locally.
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let stored: ReturnType<typeof readPlanMetadata> = null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    stored = readPlanMetadata(user.privateMetadata);
  } catch (err) {
    console.error(
      `[paypal] Couldn't read plan metadata for ${userId}:`,
      err instanceof Error ? err.message : err
    );
  }

  const querySubId = req.nextUrl.searchParams.get("subscriptionId")?.trim() ?? "";
  const subscriptionId = stored?.subscriptionId ?? querySubId;

  // A one-time Business purchase is permanent - it is never re-billed and
  // never revoked, so there is nothing to re-verify with PayPal.
  if (stored?.type === "lifetime") {
    return NextResponse.json({
      plan: stored.tier,
      active: true,
      verified: true,
      status: stored.status,
    });
  }

  // Nothing to verify - user has never paid (or metadata is unreachable
  // and no local subscription id was provided).
  if (!subscriptionId) {
    return NextResponse.json({ plan: "free", active: false, verified: false });
  }

  try {
    const sub = await getPayPalSubscription(subscriptionId);
    const tier = sub.planId ? mapPlanIdToTier(sub.planId) : undefined;

    if (tier && sub.status === "ACTIVE") {
      // Subscription is live - make sure the account record agrees (covers
      // users who paid before account-binding existed).
      if (stored?.tier !== tier || stored.subscriptionId !== subscriptionId) {
        try {
          const client = await clerkClient();
          await client.users.updateUser(userId, {
            privateMetadata: {
              plan: {
                tier,
                type: "subscription",
                subscriptionId,
                status: "active",
                updatedAt: new Date().toISOString(),
              },
            },
          });
        } catch (err) {
          console.error(
            `[paypal] Couldn't repair plan metadata for ${userId}:`,
            err instanceof Error ? err.message : err
          );
        }
      }
      upsertSubscription({ subscriptionId, planId: sub.planId || "", status: "ACTIVE" });
      return NextResponse.json({
        plan: tier,
        active: true,
        verified: true,
        subscriptionId,
        status: sub.status,
      });
    }

    if (tier) {
      // The subscription exists but isn't active anymore (cancelled /
      // expired / suspended) - revoke the paid plan on the account.
      try {
        const client = await clerkClient();
        await client.users.updateUser(userId, { privateMetadata: { plan: null } });
      } catch (err) {
        console.error(
          `[paypal] Couldn't clear plan metadata for ${userId}:`,
          err instanceof Error ? err.message : err
        );
      }
      upsertSubscription({
        subscriptionId,
        planId: sub.planId || "",
        status: "CANCELLED",
      });
      return NextResponse.json({
        plan: "free",
        active: false,
        verified: true,
        subscriptionId,
        status: sub.status,
      });
    }

    // Subscribed to a plan we don't sell - treat as free.
    return NextResponse.json({
      plan: "free",
      active: false,
      verified: true,
      subscriptionId,
      status: sub.status,
    });
  } catch (err) {
    // PayPal explicitly says the subscription doesn't exist.
    if (err instanceof PayPalError && (err.status === 404 || err.status === 400)) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(userId, { privateMetadata: { plan: null } });
      } catch {
        /* best effort */
      }
      return NextResponse.json({
        plan: "free",
        active: false,
        verified: true,
        subscriptionId,
      });
    }
    // PayPal unreachable - keep current state, never downgrade on a blip.
    return NextResponse.json(
      {
        plan: stored?.tier ?? "free",
        active: !!stored,
        verified: false,
        subscriptionId,
        error: "Couldn't reach PayPal to verify this subscription.",
      },
      { status: 503 }
    );
  }
}