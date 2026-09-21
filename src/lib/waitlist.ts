/* ------------------------------------------------------------------ */
/*  Waitlist - Pro tier signups, stored locally and forwarded to       */
/*  Waitlister.                                                        */
/*                                                                     */
/*  Two stores, on purpose:                                            */
/*                                                                     */
/*   1. Supabase `waitlist_subscriptions` - the product's own record   */
/*      of who wants Pro, which unlock path they picked, and whether   */
/*      the path has been verified. Provisioned by                   */
/*      SQLEDITOR/SQL/waitlist_provision.sql. This is what the         */
/*      founder verifies before sending a billing link.                */
/*                                                                     */
/*   2. Waitlister - the actual waitlist: it owns the confirmation     */
/*      email (incl. double opt-in), the queue position, and the       */
/*      referral program. See https://waitlister.me/docs/api.          */
/*                                                                     */
/*  Neither store is required for the other to work: if Waitlister is  */
/*  not configured the signup is still recorded locally (status        */
/*  "recorded"), and if Supabase is not configured the signup still    */
/*  reaches Waitlister. The endpoint only refuses when NEITHER is      */
/*  configured, so a frontend-only "success" is never possible.        */
/*                                                                     */
/*  Server-only: the Waitlister key and the Supabase service-role key  */
/*  must never reach the browser.                                      */
/*                                                                     */
/*  Waitlister API (https://waitlister.me/docs/api):                   */
/*    POST https://waitlister.me/api/v1/waitlist/{waitlist-key}/sign-up */
/*    Header: X-Api-Key: <key>  (account key wl_acct_... or a          */
/*            per-waitlist key)                                        */
/*    Body:   { email, name?, phone?, metadata? } - only `email` is    */
/*            required; metadata accepts arbitrary custom fields.      */
/*    Runs server-side because the API key is a secret and, per their  */
/*    docs, API sign-ups are attributed to the calling server's IP     */
/*    unless the end user's IP is forwarded as metadata.client_ip.     */
/*                                                                     */
/*  Env:                                                              */
/*    WAITLISTER_API_KEY       - required for the Waitlister forward.  */
/*    WAITLISTER_WAITLIST_KEY  - the waitlist key from your Waitlister */
/*                               waitlist settings (not a secret, but  */
/*                               server-side config either way).      */
/* ------------------------------------------------------------------ */

import { getSupabase, isSupabaseConfigured } from "./supabase";

const WAITLISTER_API_BASE = "https://waitlister.me/api/v1";

/** How long a Waitlister call may take before we give up on it. */
const UPSTREAM_TIMEOUT_MS = 8_000;

/** Unlock paths offered on the pricing page. */
export const WAITLIST_REWARDS = [
  "discord",
  "skool",
  "subscribe-newsletter",
  "refer-friend",
] as const;

export type WaitlistReward = (typeof WAITLIST_REWARDS)[number];

/** Tiers that can be waitlisted. Team Plus is purchasable today, so it is
    only accepted here for when that changes - the UI keeps it on the
    e-transfer flow. */
export const WAITLIST_PLANS = ["pro", "team"] as const;

export type WaitlistPlan = (typeof WAITLIST_PLANS)[number];

export interface SubmitWaitlistInput {
  email: string;
  planId: string;
  reward: string;
  /** Optional extras captured at signup, forwarded as Waitlister metadata. */
  companyName?: string | null;
  softwareCount?: number | null;
  /** End user's IP, forwarded so Waitlister can run referral fraud checks. */
  clientIp?: string | null;
}

/**
 * `new`      - the address is now on the Waitlister list.
 * `existing` - that address was already on the list.
 * `pending`  - double opt-in is on; a confirmation email was sent.
 * `recorded` - stored in our own record; Waitlister is unavailable or
 *              unconfigured, so there is no queue position yet.
 */
export type WaitlistStatus = "new" | "existing" | "pending" | "recorded";

export type SubmitWaitlistResult =
  | {
      ok: true;
      status: WaitlistStatus;
      /** Queue position from Waitlister, when it reports one. */
      position: number | null;
      message: string;
      /** Whether the signup reached Waitlister (vs. local record only). */
      forwarded: boolean;
    }
  | {
      ok: false;
      code:
        | "NOT_CONFIGURED"
        | "INVALID_EMAIL"
        | "INVALID_PLAN"
        | "RATE_LIMITED"
        | "UPSTREAM_ERROR"
        | "STORAGE_ERROR";
      message: string;
      /** Seconds to wait before retrying, for rate-limited responses. */
      retryAfterSec?: number;
    };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidWaitlistEmail(email: string): boolean {
  return email.length > 0 && email.length <= 254 && EMAIL_RE.test(email);
}

export function isWaitlisterConfigured(): boolean {
  return !!(process.env.WAITLISTER_API_KEY?.trim() && process.env.WAITLISTER_WAITLIST_KEY?.trim());
}

/** True when at least one of the two stores can accept a signup. */
export function isWaitlistAvailable(): boolean {
  return isWaitlisterConfigured() || isSupabaseConfigured();
}

/** Only forward an IP Waitlister will accept (their API wants IPv4). */
function ipv4(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  const m = v.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  return m.slice(1).every((o) => Number(o) <= 255) ? v : null;
}

function cap(v: string | null | undefined, max: number): string | null {
  if (!v) return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

/* --------------------------- Waitlister --------------------------- */

interface WaitlisterResponse {
  success?: boolean;
  is_new_sign_up?: boolean;
  is_pending_confirmation?: boolean;
  message?: string;
  position?: number;
  inflated_position?: number;
  referral_code?: string;
}

/**
 * Forward one signup to Waitlister. Never throws: failures come back as
 * typed results so the caller can decide between "stored locally anyway"
 * and a hard error.
 */
async function forwardToWaitlister(
  input: SubmitWaitlistInput
): Promise<
  | { ok: true; status: WaitlistStatus; position: number | null; message: string }
  | { ok: false; code: "RATE_LIMITED" | "INVALID_EMAIL" | "UPSTREAM_ERROR"; message: string; retryAfterSec?: number }
> {
  const apiKey = process.env.WAITLISTER_API_KEY!.trim();
  const waitlistKey = process.env.WAITLISTER_WAITLIST_KEY!.trim();

  // Anything the client sends beyond the documented fields goes under
  // `metadata`, which Waitlister stores as custom fields on the subscriber.
  const metadata: Record<string, string> = {
    plan: input.planId,
    reward: input.reward,
  };
  const company = cap(input.companyName, 120);
  if (company) metadata.company = company;
  if (input.softwareCount != null) metadata.software_count = String(input.softwareCount);
  const clientIp = ipv4(input.clientIp);
  if (clientIp) metadata.client_ip = clientIp;

  let res: Response;
  try {
    res = await fetch(
      `${WAITLISTER_API_BASE}/waitlist/${encodeURIComponent(waitlistKey)}/sign-up`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": apiKey,
        },
        body: JSON.stringify({ email: input.email, metadata }),
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        cache: "no-store",
      }
    );
  } catch (err) {
    console.error(
      "[waitlist] Waitlister unreachable:",
      err instanceof Error ? err.message : err
    );
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      message: "We couldn't reach the waitlist service.",
    };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    if (res.status === 400) {
      // Their 400s are field-level ("Valid email is required").
      return {
        ok: false,
        code: "INVALID_EMAIL",
        message: body.message ?? "That email address wasn't accepted.",
      };
    }
    if (res.status === 429) {
      const header = Number(res.headers.get("retry-after"));
      return {
        ok: false,
        code: "RATE_LIMITED",
        message: body.message ?? "Too many signups right now. Try again shortly.",
        retryAfterSec: Number.isFinite(header) && header > 0 ? header : 60,
      };
    }
    console.error(`[waitlist] Waitlister failed (${res.status}):`, body.message ?? "");
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      message: "We couldn't reach the waitlist service.",
    };
  }

  const data = (await res.json().catch(() => ({}))) as WaitlisterResponse;
  const position =
    typeof data.position === "number"
      ? data.position
      : typeof data.inflated_position === "number"
        ? data.inflated_position
        : null;

  // Double opt-in: the subscriber must confirm before they're counted.
  if (data.is_pending_confirmation) {
    return {
      ok: true,
      status: "pending",
      position,
      message:
        data.is_new_sign_up === false
          ? "We already sent you a confirmation email - check your inbox."
          : "Check your inbox to confirm your spot.",
    };
  }

  if (data.is_new_sign_up === false) {
    return {
      ok: true,
      status: "existing",
      position,
      message: "You're already on the list - we'll be in touch.",
    };
  }

  return {
    ok: true,
    status: "new",
    position,
    message:
      position != null
        ? `You're #${position} on the list.`
        : "You're on the list.",
  };
}

/* ---------------------------- Supabase ---------------------------- */

/**
 * Record the signup in our own table. The table's unique key is
 * (plan_id, email, reward), so resubmitting the same combination is a
 * no-op rather than a second row. Best effort: a failure here never
 * fails the request when Waitlister accepted the signup.
 */
async function recordLocally(input: SubmitWaitlistInput): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const email = input.email.trim().toLowerCase();

  const row = {
    plan_id: input.planId,
    email,
    reward: input.reward,
    // The verification step the founder runs before a billing link goes out.
    verified: false,
    notes: [
      cap(input.companyName, 120) ? `company: ${cap(input.companyName, 120)}` : null,
      input.softwareCount != null ? `subscriptions: ${input.softwareCount}` : null,
    ]
      .filter(Boolean)
      .join(" · ") || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await getSupabase().from("waitlist_subscriptions").insert(row);
    if (!error) return true;
    // 23505 = unique violation (already signed up with this plan + path).
    if (error.code === "23505") return true;
    console.error("[waitlist] local record failed:", error.message);
    return false;
  } catch (err) {
    console.error("[waitlist] local record error:", err);
    return false;
  }
}

/* ----------------------------- Entry point ----------------------------- */

export async function submitWaitlist(
  input: SubmitWaitlistInput
): Promise<SubmitWaitlistResult> {
  const email = input.email.trim();
  if (!isValidWaitlistEmail(email)) {
    return { ok: false, code: "INVALID_EMAIL", message: "Enter a valid email address." };
  }
  if (!(WAITLIST_PLANS as readonly string[]).includes(input.planId)) {
    return { ok: false, code: "INVALID_PLAN", message: "That plan isn't waitlisted." };
  }

  const normalized: SubmitWaitlistInput = { ...input, email };

  const local = await recordLocally(normalized);

  if (!isWaitlisterConfigured()) {
    if (!local) {
      return {
        ok: false,
        code: "NOT_CONFIGURED",
        message: "The waitlist isn't configured on this server.",
      };
    }
    return {
      ok: true,
      status: "recorded",
      position: null,
      message: "You're on the list - we'll email you when Pro opens.",
      forwarded: false,
    };
  }

  const upstream = await forwardToWaitlister(normalized);

  if (!upstream.ok) {
    // We still have the signup on file, so this is a success from the
    // visitor's point of view - the operator gets the log line.
    if (local) {
      console.error(`[waitlist] Waitlister forward failed (${upstream.code}) but signup was recorded locally.`);
      return {
        ok: true,
        status: "recorded",
        position: null,
        message: "You're on the list - we'll email you when Pro opens.",
        forwarded: false,
      };
    }
    return {
      ok: false,
      code: upstream.code,
      message: upstream.message,
      retryAfterSec: upstream.retryAfterSec,
    };
  }

  if (!local && isSupabaseConfigured()) {
    // Non-fatal, but worth knowing: the visitor is on the Waitlister list
    // and only our local record is missing.
    console.error("[waitlist] signup reached Waitlister but wasn't recorded locally.");
  }

  return {
    ok: true,
    status: upstream.status,
    position: upstream.position,
    message: upstream.message,
    forwarded: true,
  };
}
