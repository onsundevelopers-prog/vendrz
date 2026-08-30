import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getPaymentRecord,
  setPaymentStatus,
  setProviderPaymentId,
  setPaymentFailure,
} from "@/lib/payments/store";
import {
  createRbcPayment,
  getRbcPaymentStatus,
  isRbcConfigured,
  rbcConfigurationNotice,
  RbcMoveMoneyError,
} from "@/lib/payments/rbc";
import { normalizeStatus } from "@/lib/payments/types";

export const runtime = "nodejs";

/**
 * GET /api/payments/[id] - current status + audit trail.
 *
 * POST /api/payments/[id]/confirm - EXPLICITLY confirm the payment, which
 * is the only step that calls the RBC Move Money API and actually moves
 * money out of the RBC account. It refuses to run unless:
 *   1. the caller is authenticated AND listed in PAYMENT_ADMINS, and
 *   2. the RBC Move Money integration is configured.
 * Without both, nothing is sent and the payment is never reported as paid.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { id } = await params;
  const record = getPaymentRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }
  return NextResponse.json({ payment: record });
}

/** Label for the CLI-reportable admin gate. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { id } = await params;
  const record = getPaymentRecord(id);
  if (!record) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  // Admin gate - only configured operators may authorize money movement.
  if (!isAdmin(userId)) {
    return NextResponse.json(
      { error: "You don't have permission to authorize payments." },
      { status: 403 }
    );
  }

  // Integration gate - never report success without a real provider.
  if (!isRbcConfigured()) {
    return NextResponse.json(
      { error: rbcConfigurationNotice() },
      { status: 503 }
    );
  }

  if (record.status !== "received") {
    return NextResponse.json(
      { error: `Payment can only be confirmed from "received"; it is "${record.status}".` },
      { status: 409 }
    );
  }

  setPaymentStatus(id, "pending", {
    by: userId,
    note: "Confirmation received; submitting to RBC Move Money.",
  });

  try {
    const result = await createRbcPayment({
      toAccountId: record.recipient,
      toAccountIdType: "EMAIL_ADDRESS",
      amount: record.amount,
    });
    setProviderPaymentId(id, result.paymentId);

    const mapped = normalizeStatus(result.status) ?? "pending";
    const by = userId;
    if (mapped === "failed") {
      setPaymentFailure(id, `RBC reported status "${result.status}".`, by);
    } else {
      setPaymentStatus(id, mapped, { by, note: `RBC status: ${result.status}` });
    }

    return NextResponse.json({
      id: record.id,
      providerPaymentId: result.paymentId,
      status: mapped,
      providerStatus: result.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    setPaymentFailure(id, message, userId);
    const status =
      err instanceof RbcMoveMoneyError && (err.status === 400 || err.status === 422)
        ? 400
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

/** Live re-check of a provider payment id, if one exists. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { id } = await params;
  const record = getPaymentRecord(id);
  if (!record) return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  if (!record.providerPaymentId) {
    return NextResponse.json({ error: "No provider payment to check yet." }, { status: 409 });
  }
  const status = await getRbcPaymentStatus(record.providerPaymentId);
  const mapped = normalizeStatus(status);
  if (mapped) setPaymentStatus(id, mapped, { by: userId, note: `RBC status: ${status}` });
  return NextResponse.json({ id, providerPaymentId: record.providerPaymentId, status, mapped });
}

function isAdmin(userId: string): boolean {
  const raw = process.env.PAYMENT_ADMINS?.trim();
  if (!raw) return false; // no operators configured -> never auto-authorize
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .includes(userId.toLowerCase());
}