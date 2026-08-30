/* ------------------------------------------------------------------ */
/*  Subscription state store - server-side, in-memory.                 */
/*                                                                     */
/*  Records the verified status of PayPal subscriptions so the app     */
/*  knows about cancellations/expirations reported by webhooks, even   */
/*  between visits. Mirrors the jobs.ts pattern (single-process).      */
/*  Production note: move to Redis/DB for multi-process scaling.       */
/* ------------------------------------------------------------------ */

export type SubscriptionStatus =
  | "ACTIVE"
  | "CANCELLED"
  | "EXPIRED"
  | "SUSPENDED"
  | "PAYMENT_PENDING"
  | "INACTIVE";

export interface StoredSubscription {
  subscriptionId: string;
  planId: string;
  status: SubscriptionStatus;
  updatedAt: string;
}

const store = new Map<string, StoredSubscription>();
const TTL_MS = 24 * 60 * 60 * 1000; // remembered for 24h; re-verified live after that

function purgeExpired(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, sub] of store) {
    if (new Date(sub.updatedAt).getTime() < cutoff) store.delete(id);
  }
}

export function upsertSubscription(
  sub: Omit<StoredSubscription, "updatedAt">
): StoredSubscription {
  if (store.size > 512) purgeExpired();
  const record: StoredSubscription = { ...sub, updatedAt: new Date().toISOString() };
  store.set(sub.subscriptionId, record);
  return record;
}

export function getStoredSubscription(
  subscriptionId: string
): StoredSubscription | null {
  return store.get(subscriptionId) ?? null;
}

/** Apply a webhook-reported status change to a known subscription. */
export function setSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
): StoredSubscription | null {
  const existing = store.get(subscriptionId);
  if (!existing) return null;
  const updated: StoredSubscription = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };
  store.set(subscriptionId, updated);
  return updated;
}