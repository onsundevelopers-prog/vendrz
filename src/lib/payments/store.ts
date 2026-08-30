/* ------------------------------------------------------------------ */
/*  Payment store - server-side.                                       */
/*                                                                     */
/*  Records every payment the app creates, provides idempotency via a   */
/*  client-supplied key, and keeps a small audit trail of status        */
/*  transitions. Mirrors the jobs.ts / gmail store pattern              */
/*  (single-process). Production note: move to a shared database        */
/*  (e.g. Supabase/Postgres) for multi-process scaling.                 */
/*                                                                     */
/*  No banking credentials live here - only provider opaque ids and     */
/*  amounts/recipients needed to report status honestly.                */
/*                                                                     */
/*  Env:                                                               */
/*    PAYMENT_STORE_FILE - optional path to persist records to disk     */
/*                         (JSON). Omit for memory-only (lost on        */
/*                         restart). On Render point it at a mounted    */
/*                         persistent disk.                            */
/* ------------------------------------------------------------------ */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { PaymentRecord, PaymentStatus } from "./types";

const PAYMENT_STORE_FILE = process.env.PAYMENT_STORE_FILE;

const store = new Map<string, PaymentRecord>();

// Idempotency keys map to the payment id they created/deduped into.
const idemIndex = new Map<string, string>();

function fileToWrite(): string | null {
  if (!PAYMENT_STORE_FILE) return null;
  return path.isAbsolute(PAYMENT_STORE_FILE)
    ? PAYMENT_STORE_FILE
    : path.join(process.cwd(), PAYMENT_STORE_FILE);
}

function persist(): void {
  const file = fileToWrite();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify([...store.values()], null, 2), "utf8");
  } catch (err) {
    console.error(`[payments] Couldn't persist store to ${file}:`, (err as Error).message);
  }
}

function loadFromDisk(): void {
  const file = fileToWrite();
  if (!file || !fs.existsSync(file)) return;
  try {
    const raw = fs.readFileSync(file, "utf8");
    const records = JSON.parse(raw) as PaymentRecord[];
    for (const r of records) {
      store.set(r.id, r);
      if (r.idempotencyKey) idemIndex.set(r.idempotencyKey, r.id);
    }
  } catch (err) {
    console.error(`[payments] Couldn't load store from ${file}:`, (err as Error).message);
  }
}

// Lazily hydrate from disk once on first use.
let hydrated = false;
function ensureHydrated(): void {
  if (!hydrated) {
    hydrated = true;
    loadFromDisk();
  }
}

export function createPaymentId(): string {
  return crypto.randomUUID();
}

/**
 * Reserve a payment under an idempotency key. If the key was already used
 * the existing record is returned unchanged (null effect) so a retried
 * request can never create a duplicate.
 */
export function createPaymentRecord(input: {
  id?: string;
  provider: string;
  amount: number;
  currency: string;
  recipient: string;
  idempotencyKey: string;
  requestedBy: string;
}): { record: PaymentRecord; created: boolean } {
  ensureHydrated();
  const existingId = idemIndex.get(input.idempotencyKey);
  const existing = existingId ? store.get(existingId) : undefined;
  if (existing) return { record: existing, created: false };

  const now = new Date().toISOString();
  const record: PaymentRecord = {
    id: input.id ?? createPaymentId(),
    provider: input.provider,
    amount: input.amount,
    currency: input.currency,
    recipient: input.recipient,
    status: "received",
    createdAt: now,
    updatedAt: now,
    idempotencyKey: input.idempotencyKey,
    requestedBy: input.requestedBy,
    audit: [
      {
        at: now,
        from: "received",
        to: "received",
        by: input.requestedBy,
        note: "Payment created and validated locally; awaiting explicit confirmation before funds are sent.",
      },
    ],
  };
  store.set(record.id, record);
  idemIndex.set(input.idempotencyKey, record.id);
  persist();
  return { record, created: true };
}

export function getPaymentRecord(id: string): PaymentRecord | null {
  ensureHydrated();
  return store.get(id) ?? null;
}

export function listPaymentRecords(limit = 100): PaymentRecord[] {
  ensureHydrated();
  return [...store.values()]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, limit);
}

/**
 * Transition a payment's status and record an audit entry. Refuses no-op
 * transitions and changes to terminal states.
 */
export function setPaymentStatus(
  id: string,
  to: PaymentStatus,
  opts: { by: string; note?: string } = { by: "system" }
): PaymentRecord | null {
  ensureHydrated();
  const record = store.get(id);
  if (!record) return null;
  const from = record.status;
  if (from === to) return record;
  // Terminal states are never overwritten by a stale/late update.
  if (from === "processed" || from === "failed" || from === "cancelled") {
    return record;
  }
  record.status = to;
  record.updatedAt = new Date().toISOString();
  record.audit.push({
    at: record.updatedAt,
    from,
    to,
    by: opts.by,
    note: opts.note,
  });
  persist();
  return record;
}

export function setPaymentFailure(
  id: string,
  reason: string,
  by = "system"
): PaymentRecord | null {
  ensureHydrated();
  const record = store.get(id);
  if (!record) return null;
  record.failureReason = reason;
  return setPaymentStatus(id, "failed", { by, note: reason }) ?? record;
}

export function setProviderPaymentId(id: string, providerPaymentId: string): void {
  const record = store.get(id);
  if (!record) return;
  record.providerPaymentId = providerPaymentId;
  persist();
}