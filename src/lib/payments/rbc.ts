/* ------------------------------------------------------------------ */
/*  RBC Move Money API (via Interac e-Transfer) - server-only client.  */
/*                                                                     */
/*  Official product: RBC Business Banking APIs -> RBC Move Money API  */
/*  via Interac e-Transfer (see https://www.rbcroyalbank.com/business/ */
/*  api/index.html). This sends payments OUT of an RBC business         */
/*  account to a recipient - it is a transfer/disbursement API, NOT a  */
/*  subscription-collection API.                                       */
/*                                                                     */
/*  Access requires an RBC business account and onboarding through      */
/*  your RBC Advisor, who issues the OAuth2 client credentials and the  */
/*  API gateway base URL. Auth follows the Interac Hub standard: an     */
/*  OAuth2 client_credentials token is obtained from a token endpoint   */
/*  (often advertised under /.well-known/openid-configuration).         */
/*                                                                     */
/*  The officially documented create-payment request is:                */
/*    POST {base}/payments                                            */
/*    { "amount": 1.00,                                               */
/*      "to_account":   { "id": "<email>", "id_type": "EMAIL_ADDRESS" }, */
/*      "from_account": { "id": "<acct>", "id_type": "ACCOUNT_IDENTIFIER" }, */
/*      "payment_type": "INTERAC" }                                   */
/*    -> { "payment_id": "...", "status": "PROCESSED" }               */
/*                                                                     */
/*  SECURITY: This module NEVER fakes success. If the API is not        */
/*  configured it throws; callers surface a 503 and nothing is          */
/*  reported as paid. Credentials are server-only.                     */
/*                                                                     */
/*  Env:                                                               */
/*    RBC_MOVE_MONEY_CLIENT_ID           - OAuth2 client id (from       */
/*                                         RBC Advisor onboarding)      */
/*    RBC_MOVE_MONEY_CLIENT_SECRET       - OAuth2 client secret         */
/*    RBC_MOVE_MONEY_BASE_URL            - your gateway base URL from   */
/*                                         onboarding docs (e.g.        */
/*                                         https://api.example.com)     */
/*    RBC_MOVE_MONEY_FROM_ACCOUNT_ID       - your RBC account that      */
/*                                           funds transfers            */
/*    RBC_MOVE_MONEY_FROM_ACCOUNT_ID_TYPE - default ACCOUNT_IDENTIFIER  */
/*    RBC_MOVE_MONEY_PAYMENT_TYPE         - default INTERAC             */
/* ------------------------------------------------------------------ */

export class RbcMoveMoneyError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "RbcMoveMoneyError";
    this.status = status;
  }
}

interface RbcConfig {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  fromAccountId: string;
  fromAccountIdType: string;
  paymentType: string;
}

function readConfig(): RbcConfig | null {
  const clientId = process.env.RBC_MOVE_MONEY_CLIENT_ID?.trim();
  const clientSecret = process.env.RBC_MOVE_MONEY_CLIENT_SECRET?.trim();
  const baseUrl = process.env.RBC_MOVE_MONEY_BASE_URL?.trim();
  const fromAccountId = process.env.RBC_MOVE_MONEY_FROM_ACCOUNT_ID?.trim();
  if (!clientId || !clientSecret || !baseUrl || !fromAccountId) return null;
  return {
    clientId,
    clientSecret,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    fromAccountId,
    fromAccountIdType:
      process.env.RBC_MOVE_MONEY_FROM_ACCOUNT_ID_TYPE?.trim() || "ACCOUNT_IDENTIFIER",
    paymentType: process.env.RBC_MOVE_MONEY_PAYMENT_TYPE?.trim() || "INTERAC",
  };
}

/** Whether the RBC Move Money integration is configured and usable. */
export function isRbcConfigured(): boolean {
  return readConfig() !== null;
}

/** Human guidance shown when the integration isn't configured. */
export function rbcConfigurationNotice(): string {
  return (
    "RBC Move Money isn't configured on this deployment. Payments stay in a " +
    "received (unconfirmed) state and no funds are sent. Ask your RBC Advisor " +
    "to enable RBC Move Money API and set the RBC_MOVE_MONEY_* environment " +
    "variables (client id, client secret, gateway base URL, from-account id)."
  );
}

/* ------------------------------ token ------------------------------ */

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(cfg: RbcConfig): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token;

  // Resolve the token endpoint. Interac Hub gateways advertise it under the
  // well-known OpenID configuration; fall back to a conventional default.
  let tokenUrl = `${cfg.baseUrl}/oauth2/token`;
  try {
    const res = await fetch(`${cfg.baseUrl}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (res.ok) {
      const meta = (await res.json()) as { token_endpoint?: string };
      if (meta.token_endpoint) tokenUrl = meta.token_endpoint;
    }
  } catch {
    // Discovery is best-effort; fall back to the default token URL.
  }

  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const tokenResponse = await fetchToken(tokenUrl, {
    headers: { Authorization: `Basic ${basic}` },
    body: "grant_type=client_credentials",
  });

  let data = tokenResponse;
  if (!data.access_token) {
    // Retry once with client_secret_post in case the gateway doesn't accept
    // HTTP Basic (both are advertised by the Interac standard).
    const retry = await fetchToken(tokenUrl, {
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: `grant_type=client_credentials&client_id=${encodeURIComponent(cfg.clientId)}&client_secret=${encodeURIComponent(cfg.clientSecret)}`,
    });
    data = retry;
  }

  if (!data.access_token) {
    throw new RbcMoveMoneyError("RBC Move Money returned no access token.");
  }
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function fetchToken(
  tokenUrl: string,
  init: { headers: Record<string, string>; body: string }
): Promise<{ access_token?: string; expires_in?: number }> {
  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json", ...init.headers },
    body: init.body,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new RbcMoveMoneyError(
      `RBC Move Money authentication failed (${res.status}). ${text.slice(0, 160)}`
    );
  }
  return (await res.json()) as { access_token?: string; expires_in?: number };
}

/* --------------------------- payments ------------------------------ */

async function rbcRequest<T>(
  cfg: RbcConfig,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken(cfg);
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new RbcMoveMoneyError(
      `RBC Move Money request to ${path} failed (${res.status}). ${text.slice(0, 200)}`,
      res.status
    );
  }
  return (await res.json()) as T;
}

export interface RbcCreatePaymentInput {
  toAccountId: string;
  toAccountIdType: "EMAIL_ADDRESS" | "PHONE_NUMBER" | "ACCOUNT_IDENTIFIER" | string;
  amount: number;
}

export interface RbcPaymentResult {
  paymentId: string;
  status: string;
}

/**
 * Initiate a payment from your RBC account to a recipient. Mirrors the
 * officially documented `/payments` request/response shape.
 */
export async function createRbcPayment(
  input: RbcCreatePaymentInput
): Promise<RbcPaymentResult> {
  const cfg = readConfig();
  if (!cfg) {
    throw new RbcMoveMoneyError("RBC Move Money is not configured.", 503);
  }
  if (!(input.amount > 0)) {
    throw new RbcMoveMoneyError("Payment amount must be greater than zero.", 400);
  }

  const result = await rbcRequest<{ payment_id?: string; status?: string }>(
    cfg,
    "/payments",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: input.amount,
        to_account: { id: input.toAccountId, id_type: input.toAccountIdType },
        from_account: { id: cfg.fromAccountId, id_type: cfg.fromAccountIdType },
        payment_type: cfg.paymentType,
      }),
    }
  );

  if (!result.payment_id || !result.status) {
    throw new RbcMoveMoneyError("RBC Move Money returned an incomplete payment response.");
  }
  return { paymentId: result.payment_id, status: result.status };
}

/** Query the current status of a previously created payment. */
export async function getRbcPaymentStatus(paymentId: string): Promise<string> {
  const cfg = readConfig();
  if (!cfg) throw new RbcMoveMoneyError("RBC Move Money is not configured.", 503);
  const result = await rbcRequest<{ status?: string }>(
    cfg,
    `/payments/${encodeURIComponent(paymentId)}`
  );
  if (!result.status) {
    throw new RbcMoveMoneyError("RBC Move Money returned no status for this payment.");
  }
  return result.status;
}