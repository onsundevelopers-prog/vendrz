/* ------------------------------------------------------------------ */
/*  Payment types - provider-neutral.                                  */
/*                                                                     */
/*  One record per payment/transfer the app creates. The `provider`    */
/*  field names which adapter executed it (e.g. "rbc_movemoney");      */
/*  `providerPaymentId` is that provider's own id. No banking          */
/*  credentials or sensitive financial data are stored here.           */
/* ------------------------------------------------------------------ */

export type PaymentStatus =
  | "received" // created + validated locally, awaiting explicit confirmation
  | "pending" // confirmation accepted, provider processing
  | "processed" // provider confirmed the payment went through
  | "failed" // provider rejected or errored
  | "cancelled"; // cancelled before the provider accepted it

export interface PaymentAmount {
  amount: number;
  currency: string;
}

export interface PaymentRecord {
  /** App-side unique id. */
  id: string;
  provider: string;
  /** Provider's own payment id, once the provider returns one. */
  providerPaymentId?: string;
  amount: number;
  currency: string;
  /** Free-form recipient label / account identifier used for the transfer. */
  recipient: string;
  status: PaymentStatus;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
  /** Client-supplied dedup key; reused requests return the original record. */
  idempotencyKey: string;
  /** Clerk user id that requested the payment. */
  requestedBy: string;
  /** Human audit trail of status transitions. */
  audit: {
    at: string;
    from: PaymentStatus;
    to: PaymentStatus;
    by: string;
    note?: string;
  }[];
}

export const PAYMENT_CURRENCIES: readonly string[] = ["CAD", "USD"];

/** Coerce a free-form status into the canonical set. */
export function normalizeStatus(s: string): PaymentStatus | null {
  const v = s.toUpperCase();
  switch (v) {
    case "RECEIVED":
    case "CREATED":
    case "DRAFT":
      return "received";
    case "PENDING":
    case "PROCESSING":
    case "IN_PROGRESS":
      return "pending";
    case "PROCESSED":
    case "COMPLETED":
    case "SUCCESS":
      return "processed";
    case "FAILED":
    case "ERROR":
    case "REJECTED":
    case "DECLINED":
      return "failed";
    case "CANCELLED":
    case "CANCELED":
    case "VOIDED":
      return "cancelled";
    default:
      return null;
  }
}