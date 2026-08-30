import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { businessPriceUsd, createPayPalOrder, PayPalError } from "@/lib/paypal";

export const runtime = "nodejs";

/**
 * POST /api/paypal/order
 *
 * Creates a one-time PayPal order for the Business tier ($999). The
 * signed-in Clerk user id is embedded as custom_id so the capture webhook
 * can grant the tier even across devices. The client then opens PayPal's
 * approval flow with the returned order id.
 */
export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const order = await createPayPalOrder(userId);
    return NextResponse.json({
      id: order.id,
      status: order.status,
      amountUsd: businessPriceUsd(),
    });
  } catch (err) {
    const message =
      err instanceof PayPalError ? err.message : err instanceof Error ? err.message : "Unknown error";
    console.error(`[paypal] create order failed for ${userId}:`, message);
    return NextResponse.json(
      { error: `Couldn't start the checkout: ${message}` },
      { status: 502 }
    );
  }
}
