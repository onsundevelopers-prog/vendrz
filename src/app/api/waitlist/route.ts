import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import {
  WAITLIST_REWARDS,
  isWaitlistAvailable,
  submitWaitlist,
  type SubmitWaitlistResult,
} from "@/lib/waitlist";

export const runtime = "nodejs";

/**
 * POST /api/waitlist
 *
 * The Pro waitlist. The pricing page's dialog posts here; the signup is
 * recorded in our own workspace and forwarded to Waitlister, which owns
 * the confirmation email, queue position, and referrals.
 *
 * This route exists because the Waitlister key is a server-side secret:
 * the browser never sees it, and the upstream call is made from here.
 * See src/lib/waitlist.ts for the API mapping.
 *
 * Body:  { planId: "pro" | "team", email, reward,
 *          companyName?, softwareCount? }
 *
 * Returns:
 *   200 { ok, status, position, message, forwarded }
 *       status: new | existing | pending | recorded
 *   400 { error }        - invalid email / unknown plan / unknown unlock path
 *   429 { error }        - too many signups from this IP (Retry-After set)
 *   501 { error, code }  - neither Waitlister nor Supabase is configured
 *   502 { error, code }  - Waitlister is unreachable or erroring
 */

/** Waitlist signups allowed per IP per hour. */
const WAITLIST_MAX_PER_HOUR = 20;

const STR = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.trim().length > 0 ? v.trim().slice(0, max) : null;

export async function POST(req: NextRequest) {
  // Refuse loudly rather than fake a signup: with no store configured
  // nothing would be recorded anywhere. (Same stance as /api/redeem.)
  if (!isWaitlistAvailable()) {
    return NextResponse.json(
      { error: "The waitlist isn't configured on this server.", code: "NOT_CONFIGURED" },
      { status: 501 }
    );
  }

  const ip = clientIp(req);
  const limited = rateLimit(`waitlist:${ip}`, { max: WAITLIST_MAX_PER_HOUR });
  if (!limited.ok) {
    return NextResponse.json(
      {
        error: "Too many signups from this network. Please try again shortly.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const b = (body ?? {}) as Record<string, unknown>;

  const email = typeof b.email === "string" ? b.email.trim() : "";
  const planId = typeof b.planId === "string" ? b.planId.trim().toLowerCase() : "";
  const rawReward = typeof b.reward === "string" ? b.reward.trim() : "";
  const reward = (WAITLIST_REWARDS as readonly string[]).includes(rawReward) ? rawReward : "";

  if (!reward) {
    return NextResponse.json(
      { error: "Choose how you'd like to unlock this tier." },
      { status: 400 }
    );
  }

  const companyName = STR(b.companyName, 120);
  const rawCount = b.softwareCount;
  const softwareCount =
    typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount >= 0
      ? Math.min(Math.floor(rawCount), 100_000)
      : null;

  const result: SubmitWaitlistResult = await submitWaitlist({
    email,
    planId,
    reward,
    companyName,
    softwareCount,
    clientIp: ip,
  });

  if (!result.ok) {
    const status =
      result.code === "INVALID_EMAIL" || result.code === "INVALID_PLAN"
        ? 400
        : result.code === "RATE_LIMITED"
          ? 429
          : result.code === "NOT_CONFIGURED"
            ? 501
            : 502;
    return NextResponse.json(
      { error: result.message, code: result.code },
      status === 429 && result.retryAfterSec
        ? { status, headers: { "Retry-After": String(result.retryAfterSec) } }
        : { status }
    );
  }

  return NextResponse.json({
    ok: true,
    status: result.status,
    position: result.position,
    message: result.message,
    forwarded: result.forwarded,
  });
}
