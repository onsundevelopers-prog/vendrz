import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { capturePayPalOrder, PayPalError, type PlanMetadata } from "@/lib/paypal";

export const runtime = "nodejs";

/**
 * POST /api/paypal/order/capture
 *
 * Called by the client after the buyer approves a one-time Business order.
 * The server captures the payment with PayPal - only a COMPLETED capture
 * grants the tier. The plan is written to the Clerk account as a
 * permanent ("lifetime") grant: one-time purchases are never revoked.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: { orderId?: string } | null = null;
  try {
    body = (await req.json().catch(() => null)) as { orderId?: string } | null;
  } catch {
    /* handled below */
  }
  const orderId = body?.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "Missing order ID." }, { status: 400 });
  }

  try {
    const result = await capturePayPalOrder(orderId);
    if (result.status !== "COMPLETED") {
      return NextResponse.json(
        {
          active: false,
          error: `Payment wasn't completed (status: ${result.status}). Nothing was charged to your account.`,
        },
        { status: 200 }
      );
    }

    // Grant Business permanently (lifetime - no re-billing, no revocation).
    const metadata: PlanMetadata = {
      tier: "business",
      type: "lifetime",
      subscriptionId: orderId,
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
        `[paypal] Couldn't save lifetime plan metadata for ${userId}:`,
        err instanceof Error ? err.message : err
      );
    }

    return NextResponse.json({
      active: true,
      plan: "business",
      orderId,
      status: result.status,
      amountUsd: result.amount,
    });
  } catch (err) {
    if (err instanceof PayPalError && (err.status === 404 || err.status === 400)) {
      return NextResponse.json(
        { active: false, error: "This order couldn't be found at PayPal." },
        { status: 200 }
      );
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[paypal] capture failed for ${userId}:`, message);
    return NextResponse.json(
      { active: false, error: `Couldn't complete the payment: ${message}` },
      { status: 502 }
    );
  }
}
