/* ------------------------------------------------------------------ */
/*  Server-only PayPal REST helpers.                                   */
/*                                                                     */
/*  Talks to the PayPal REST API using the server credential pair      */
/*  (PAYPAL_CLIENT_ID / PAYPAL_SECRET). Used to:                       */
/*    - verify a subscription is real and ACTIVE before granting       */
/*      Business mode (/api/paypal/verify)                             */
/*    - verify webhook signatures and re-check status on app load      */
/*      (/api/paypal/webhook, /api/paypal/subscription)                */
/*                                                                     */
/*  Env:                                                               */
/*    PAYPAL_CLIENT_ID / PAYPAL_SECRET - server credential pair        */
/*    PAYPAL_API_BASE                  - override for sandbox testing  */
/*                                       (https://api-m.sandbox.paypal.com) */
/* ------------------------------------------------------------------ */

const PAYPAL_API_BASE = (process.env.PAYPAL_API_BASE ?? "https://api-m.paypal.com").replace(/\/+$/, "");

export class PayPalError extends Error {
  /** HTTP status PayPal returned (404 = subscription doesn't exist, etc.). */
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "PayPalError";
    this.status = status;
  }
}

/* ------------------------------ token ------------------------------ */

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new PayPalError("PayPal server credentials (PAYPAL_CLIENT_ID / PAYPAL_SECRET) are not configured.");
  }

  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token;

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError(
      `PayPal authentication failed (${res.status}). ${text.slice(0, 160)}`
    );
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new PayPalError("PayPal authentication returned no token.");

  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 32400) * 1000,
  };
  return data.access_token;
}

/* --------------------------- subscriptions --------------------------- */

export interface PayPalSubscription {
  id: string;
  status: string;
  planId: string;
}

/** Fetch a subscription's current status straight from PayPal. */
export async function getPayPalSubscription(
  subscriptionId: string
): Promise<PayPalSubscription> {
  const token = await getAccessToken();
  const res = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError(
      `PayPal couldn't verify this subscription (${res.status}). ${text.slice(0, 160)}`,
      res.status
    );
  }
  const data = (await res.json()) as { id?: string; status?: string; plan_id?: string };
  if (!data.id || !data.status) {
    throw new PayPalError("PayPal returned an incomplete subscription record.");
  }
  return { id: data.id, status: data.status, planId: data.plan_id ?? "" };
}

/* --------------------------- one-time orders --------------------------- */

/**
 * The Business tier is a one-time purchase (default $999 USD) rather than
 * a recurring subscription. Override the amount with BUSINESS_PRICE_USD.
 */
export function businessPriceUsd(): string {
  return (process.env.BUSINESS_PRICE_USD ?? "999").trim();
}

export interface PayPalOrder {
  id: string;
  status: string;
}

/**
 * Create a one-time PayPal order for the Business tier. The Clerk user id
 * rides along as custom_id so the webhook can grant the buyer even if the
 * capture happens on a different device/session.
 */
export async function createPayPalOrder(userId: string): Promise<PayPalOrder> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "USD", value: businessPriceUsd() },
          description: "Noma Business - one-time license",
        },
      ],
      custom_id: userId,
      application_context: {
        brand_name: "Noma",
        user_action: "PAY_NOW",
      },
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new PayPalError(
      `PayPal couldn't create the order (${res.status}). ${text.slice(0, 160)}`,
      res.status
    );
  }
  const data = (await res.json()) as { id?: string; status?: string };
  if (!data.id) throw new PayPalError("PayPal returned no order id.");
  return { id: data.id, status: data.status ?? "" };
}

/** Capture an approved one-time order. Throws when PayPal rejects it. */
export async function capturePayPalOrder(
  orderId: string
): Promise<{ status: string; amount?: string }> {
  const token = await getAccessToken();
  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(15_000),
    }
  );
  const text = await res.text().catch(() => "");
  let data: {
    id?: string;
    status?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ amount?: { value?: string } }> };
    }>;
  } = {};
  try {
    data = JSON.parse(text || "{}");
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok) {
    throw new PayPalError(
      `PayPal couldn't capture the order (${res.status}). ${text.slice(0, 160)}`,
      res.status
    );
  }
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  return { status: data.status ?? "", amount: capture?.amount?.value };
}

/* ------------------------- plan id -> tier --------------------------- */

/**
 * Map a PayPal plan id onto one of our tiers. Returns undefined when the
 * plan isn't one we sell (so we never grant access to unknown plans).
 */
export function mapPlanIdToTier(planId: string): string | undefined {
  const businessPlan =
    process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID ?? process.env.PAYPAL_PLAN_ID ?? "";
  if (businessPlan && planId === businessPlan) return "business";
  const teamPlan = process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAM_ID ?? "";
  if (teamPlan && planId === teamPlan) return "team";
  return undefined;
}

/* ------------------------------ webhooks ------------------------------ */

export interface PayPalWebhookHeaders {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
}

/**
 * Ask PayPal to confirm a webhook event really came from them. This is the
 * security boundary of the whole billing flow - events that fail this check
 * are rejected.
 */
export async function verifyPayPalWebhookSignature(
  headers: PayPalWebhookHeaders,
  webhookId: string,
  body: unknown
): Promise<boolean> {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      auth_algo: headers.authAlgo,
      cert_url: headers.certUrl,
      transmission_id: headers.transmissionId,
      transmission_sig: headers.transmissionSig,
      transmission_time: headers.transmissionTime,
      webhook_id: webhookId,
      webhook_event: body,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { verification_status?: string };
  return data.verification_status === "SUCCESS";
}

/* ----------------------- plan metadata helpers ------------------------ */

export interface PlanMetadata {
  tier: string;
  /**
   * "subscription" = recurring (Team) - re-verified with PayPal on load and
   * revoked when cancelled/expired. "lifetime" = one-time purchase
   * (Business) - granted permanently, never revoked.
   */
  type: "subscription" | "lifetime";
  subscriptionId: string;
  status: string;
  updatedAt: string;
}

/** Read the paid-plan record stored on the user's Clerk account. */
export function readPlanMetadata(
  metadata: Record<string, unknown> | undefined
): PlanMetadata | null {
  const plan = metadata?.plan;
  if (!plan || typeof plan !== "object") return null;
  const p = plan as Record<string, unknown>;
  if (typeof p.tier !== "string" || typeof p.subscriptionId !== "string") return null;
  return {
    tier: p.tier,
    // Pre-existing records without a type were subscriptions.
    type: p.type === "lifetime" ? "lifetime" : "subscription",
    subscriptionId: p.subscriptionId,
    status: typeof p.status === "string" ? p.status : "active",
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : "",
  };
}
