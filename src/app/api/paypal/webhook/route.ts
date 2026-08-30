import { NextRequest, NextResponse } from "next/server";
import { verifyPayPalWebhookSignature } from "@/lib/paypal";
import {
  setSubscriptionStatus,
  upsertSubscription,
  type SubscriptionStatus,
} from "@/lib/paypalStore";

export const runtime = "nodejs";

/** Event types PayPal sends that matter for the Business plan gate. */
const EVENT_STATUS: Record<string, SubscriptionStatus> = {
  "BILLING.SUBSCRIPTION.ACTIVATED": "ACTIVE",
  "PAYMENT.SALE.COMPLETED": "ACTIVE",
  "BILLING.SUBSCRIPTION.CANCELLED": "CANCELLED",
  "BILLING.SUBSCRIPTION.EXPIRED": "EXPIRED",
  "BILLING.SUBSCRIPTION.SUSPENDED": "SUSPENDED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED": "SUSPENDED",
};

/**
 * POST /api/paypal/webhook
 *
 * Receives PayPal billing webhooks, verifies the signature with PayPal,
 * and records subscription status changes (activated / cancelled /
 * expired / payment failed). The signature check is the security
 * boundary - unverified events are rejected with a 4xx so PayPal retries.
 *
 * Configure this URL as a webhook in the PayPal dashboard and set
 * PAYPAL_WEBHOOK_ID to the webhook's ID.
 */
export async function POST(req: NextRequest) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    // Not configured yet - tell PayPal to retry rather than dropping events.
    return NextResponse.json(
      { error: "PAYPAL_WEBHOOK_ID is not configured." },
      { status: 503 }
    );
  }

  const raw = await req.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const verified = await verifyPayPalWebhookSignature(
    {
      authAlgo: req.headers.get("paypal-auth-algo") ?? "",
      certUrl: req.headers.get("paypal-cert-url") ?? "",
      transmissionId: req.headers.get("paypal-transmission-id") ?? "",
      transmissionSig: req.headers.get("paypal-transmission-sig") ?? "",
      transmissionTime: req.headers.get("paypal-transmission-time") ?? "",
    },
    webhookId,
    body
  ).catch(() => false);

  if (!verified) {
    return NextResponse.json(
      { error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  const event = body as {
    event_type?: string;
    resource?: { id?: string; billing_agreement_id?: string; plan_id?: string };
  };

  // Sale events carry the subscription id as billing_agreement_id.
  const subscriptionId =
    event.resource?.id ?? event.resource?.billing_agreement_id ?? "";
  const status = event.event_type ? EVENT_STATUS[event.event_type] : undefined;

  if (subscriptionId && status) {
    const updated = setSubscriptionStatus(subscriptionId, status);
    if (!updated) {
      // Unknown subscription (server restarted since it was created) -
      // record what the webhook tells us so the next status check sees it.
      upsertSubscription({
        subscriptionId,
        planId: event.resource?.plan_id ?? "",
        status,
      });
    }
    console.log(
      `[paypal] Webhook ${event.event_type} -> ${status} for subscription ${subscriptionId}`
    );
  }

  // Verified events are always acknowledged so PayPal stops retrying.
  return NextResponse.json({ received: true });
}