/* ------------------------------------------------------------------ */
/*  Entitlement - the server-side access model.                       */
/*                                                                     */
/*  Model:  Sign up -> 30-day Team Plus trial -> expires -> pay $250   */
/*  CAD one-time by e-transfer (manual, email-confirmed) -> Team Plus  */
/*  forever. Business / Enterprise are sales-led (manual grants).      */
/*                                                                     */
/*  The single source of truth is `privateMetadata.plan` on the Clerk  */
/*  account - written by /api/plan (trial auto-start), /api/redeem     */
/*  (codes) and /api/entitlement (founder-confirmed manual upgrades).  */
/*  Client-side dates are never trusted; the browser only ever learns  */
/*  the state the server computed.                                     */
/*                                                                     */
/*  Record shape (new):                                                */
/*    { tier: 'team'|'business'|'enterprise',                          */
/*      type: 'trial'|'paid',                                          */
/*      status: 'active'|'expired',                                    */
/*      trialStartedAt?: string, trialEndsAt?: string,                 */
/*      paidAt?: string, updatedAt: string }                           */
/*                                                                     *//*  Legacy records written by the removed subscription/redeem flows    */
/*  (shape { tier, type: 'subscription'|'lifetime', subscriptionId,    */
/*  status }) are migrated to PERMANENT paid grants on read - existing  */
/*  paid/manual upgrades must never accidentally expire.               */
/* ------------------------------------------------------------------ */

export type EntitlementTier = "team" | "business" | "enterprise";
export type EntitlementType = "trial" | "paid";
export type EntitlementStatus = "active" | "expired";
/** What a user is entitled to right now. */
export type EntitlementKind = "none" | "trial" | "paid" | "expired";
/** Plan id sent to the UI: 'free' + the grantable tiers. */
export type PlanId = "free" | EntitlementTier;

export interface EntitlementRecord {
  tier: EntitlementTier;
  type: EntitlementType;
  status: EntitlementStatus;
  trialStartedAt?: string;
  trialEndsAt?: string;
  paidAt?: string;
  updatedAt: string;
}

/** Trial length. 30 days per the pricing model; overridable via env. */
export const TRIAL_DAYS = Math.max(
  1,
  Math.min(90, Number(process.env.ENTITLE_TRIAL_DAYS ?? 30) || 30)
);

export const TRIAL_MILLIS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

const isEntitlementTier = (t: string): t is EntitlementTier =>
  t === "team" || t === "business" || t === "enterprise";

function parseDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = Date.parse(v);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/**
 * Read the entitlement record from Clerk privateMetadata.plan.
 * Returns null when there is no record. Legacy subscription-era records
 * are migrated to permanent paid grants (never auto-expiring).
 */
export function readEntitlement(
  metadata: Record<string, unknown> | undefined
): EntitlementRecord | null {
  const plan = metadata?.plan;
  if (!plan || typeof plan !== "object") return null;
  const p = plan as Record<string, unknown>;
  if (typeof p.tier !== "string" || !isEntitlementTier(p.tier)) return null;

  const tier = p.tier as EntitlementTier;
  const updatedAt = parseDate(p.updatedAt) ?? new Date().toISOString();

  // New-style record: has trial fields / type trial-or-paid, no subscriptionId.
  if ("trialEndsAt" in p || "trialStartedAt" in p || p.type === "trial" || p.type === "paid") {
    const type: EntitlementType = p.type === "paid" ? "paid" : "trial";
    const now = Date.now();
    const trialEndsAt = parseDate(p.trialEndsAt) ?? new Date(now + TRIAL_MILLIS).toISOString();
    const status: EntitlementStatus =
      type === "paid"
        ? "active"
        : p.status === "expired" || Date.parse(trialEndsAt) <= now
          ? "expired"
          : "active";
    return {
      tier,
      type,
      status,
      trialStartedAt: parseDate(p.trialStartedAt) ?? undefined,
      trialEndsAt: type === "paid" ? undefined : trialEndsAt,
      paidAt: parseDate(p.paidAt) ?? undefined,
      updatedAt,
    };
  }

  // Legacy record (old subscription or redeemed lifetime code). These were
  // paid grants; with billing removed they are permanent - never expire.
  return {
    tier,
    type: "paid",
    status: "active",
    paidAt: updatedAt,
    updatedAt,
  };
}

/** A brand-new 30-day Team Plus trial record (auto-started server-side). */
export function buildTrialRecord(now: Date = new Date()): EntitlementRecord {
  const startedAt = now.toISOString();
  return {
    tier: "team",
    type: "trial",
    status: "active",
    trialStartedAt: startedAt,
    trialEndsAt: new Date(now.getTime() + TRIAL_MILLIS).toISOString(),
    updatedAt: startedAt,
  };
}

/** A permanent paid grant (founder-confirmed e-transfer / code / sales). */
export function buildPaidRecord(
  tier: EntitlementTier,
  now: Date = new Date()
): EntitlementRecord {
  const paidAt = now.toISOString();
  return { tier, type: "paid", status: "active", paidAt, updatedAt: paidAt };
}

export interface EntitlementView {
  /** Server-side truth of what this user can do right now. */
  kind: EntitlementKind;
  /** Plan id the UI should show ('free' when no active grant). */
  plan: PlanId;
  tier: EntitlementTier | null;
  trialEndsAt: string | null;
  trialStartedAt: string | null;
  /** Whole days of trial remaining; 0 when expired. */
  daysLeft: number;
  paidAt: string | null;
}

/** Turn a raw metadata object into the resolved entitlement view. */
export function resolveEntitlement(
  metadata: Record<string, unknown> | undefined,
  now: Date = new Date()
): EntitlementView {
  const record = readEntitlement(metadata);
  return entitlementView(record, now);
}

/** Turn a validated record into the resolved view. */
export function entitlementView(
  record: EntitlementRecord | null,
  now: Date = new Date()
): EntitlementView {
  if (!record) {
    return {
      kind: "none",
      plan: "free",
      tier: null,
      trialEndsAt: null,
      trialStartedAt: null,
      daysLeft: 0,
      paidAt: null,
    };
  }
  const nowMs = now.getTime();

  if (record.type === "paid") {
    return {
      kind: "paid",
      plan: record.tier,
      tier: record.tier,
      trialEndsAt: null,
      trialStartedAt: record.trialStartedAt ?? null,
      daysLeft: 0,
      paidAt: record.paidAt ?? null,
    };
  }

  // Trial.
  const endsAtMs = record.trialEndsAt ? Date.parse(record.trialEndsAt) : nowMs + TRIAL_MILLIS;
  if (!Number.isFinite(endsAtMs)) {
    return {
      kind: "none",
      plan: "free",
      tier: null,
      trialEndsAt: null,
      trialStartedAt: record.trialStartedAt ?? null,
      daysLeft: 0,
      paidAt: null,
    };
  }
  const active = nowMs < endsAtMs;
  return {
    kind: active ? "trial" : "expired",
    plan: active ? record.tier : "free",
    tier: record.tier,
    trialEndsAt: record.trialEndsAt ?? null,
    trialStartedAt: record.trialStartedAt ?? null,
    daysLeft: active ? Math.max(1, Math.ceil((endsAtMs - nowMs) / 86_400_000)) : 0,
    paidAt: null,
  };
}

/**
 * Should a trial auto-start for this user? True only when there is no
 * record at all - never for an expired trial (no re-trials through the
 * same account) and never for a paid grant.
 */
export function shouldAutoStartTrial(
  metadata: Record<string, unknown> | undefined
): boolean {
  return readEntitlement(metadata) === null;
}
