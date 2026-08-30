import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createPaymentRecord, listPaymentRecords } from "@/lib/payments/store";
import { isRbcConfigured } from "@/lib/payments/rbc";
import { PAYMENT_CURRENCIES } from "@/lib/payments/types";

export const runtime = "nodejs";

/**
 * POST /api/payments
 *
 * Create a payment that the app will later send from your RBC account.
 * This only reserves a record in a "received" (unconfirmed) state - it
 * NEVER sends money. Sending happens through the separate confirm step on
 * /api/payments/[id] (POST), which is gated behind the PAYMENT_ADMINS
 * allowlist and the RBC Move Money integration.
 *
 * The idempotency key guarantees a retried request can't create a
 * duplicate payment.
 *
 * GET /api/payments - list recent payments (audit/reporting).
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    |      {
        amount?: unknown;
        currency?: unknown;
        recipient?: unknown;
        idempotencyKey?: unknown;
      }
    | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amount = Number(body.amount);
  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
  const recipient =
    typeof body.recipient === "string" ? body.recipient.trim() : "";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : crypto.randomUUID();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "A positive amount is required." },
      { status: 400 }
    );
  }
  if (!PAYMENT_CURRENCIES.includes(currency)) {
    return NextResponse.json(
      { error: `Unsupported currency. Use ${PAYMENT_CURRENCIES.join(" or ")}.` },
      { status: 400 }
    );
  }
  if (!recipient) {
    return NextResponse.json({ error: "A recipient is required." }, { status: 400 });
  }

  const { record, created } = createPaymentRecord({
    provider: "rbc_movemoney",
    amount,
    currency,
    recipient,
    idempotencyKey,
    requestedBy: userId,
  });

  return NextResponse.json(
    {
      id: record.id,
      created,
      provider: record.provider,
      status: record.status,
      amount: record.amount,
      currency: record.currency,
      recipient: record.recipient,
      // Never report a payment as promotable/sendable just because it "exists";
      // the client only learns the truth from the confirm endpoint.
      listing: true,
    },
    { status: created ? 201 : 200 }
  );
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const records = listPaymentRecords(100);
  return NextResponse.json({ payments: records, rbcConfigured: isRbcConfigured() });
}