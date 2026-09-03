/* ------------------------------------------------------------------ */
/*  Per-IP sliding-window rate limiter for public, expensive endpoints. */
/*                                                                     */
/*  The product's core flow is "upload a contract, no signup" - which   */
/*  means anonymous visitors can trigger AI inference (Gemini/Ollama)   */
/*  that costs real quota and money. This limiter bounds that abuse     */
/*  without affecting signed-in users, who are exempted at the call     */
/*  site when a Clerk session is present.                               */
/*                                                                     */
/*  Storage is per-process memory, which is correct for a single        */
/*  Render web service. For multi-instance scaling replace with a       */
/*  shared store (Redis/Upstash).                                       */
/*                                                                     */
/*  Env:                                                               */
/*    EXTRACT_RATE_LIMIT      - max requests per window per IP.         */
/*                              0 disables limiting. Default 10.        */
/*    EXTRACT_RATE_WINDOW_MS  - window length. Default 3600000 (1h).    */
/* ------------------------------------------------------------------ */

const MAX = Number(process.env.EXTRACT_RATE_LIMIT ?? 10);
const WINDOW_MS = Number(process.env.EXTRACT_RATE_WINDOW_MS ?? 3_600_000);

/** ip -> timestamps of allowed hits inside the current window. */
const hits = new Map<string, number[]>();

/** Bound the map itself so a spoofed-IP flood can't grow memory unbounded. */
const MAX_TRACKED_IPS = 10_000;
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < WINDOW_MS / 4) return;
  lastSweep = now;
  for (const [ip, stamps] of hits) {
    const alive = stamps.filter((t) => now - t < WINDOW_MS);
    if (alive.length === 0) hits.delete(ip);
    else hits.set(ip, alive);
  }
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the oldest tracked hit ages out of the window. */
  retryAfterSec: number;
  /** How many requests remain in the current window. */
  remaining: number;
}

export function rateLimit(key: string): RateLimitResult {
  const unlimited = MAX <= 0;
  if (unlimited) return { ok: true, retryAfterSec: 0, remaining: Infinity };

  const now = Date.now();
  sweep(now);

  const stamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (stamps.length >= MAX) {
    const retryAfterSec = Math.max(1, Math.ceil((stamps[0] + WINDOW_MS - now) / 1000));
    return { ok: false, retryAfterSec, remaining: 0 };
  }
  stamps.push(now);
  if (hits.size >= MAX_TRACKED_IPS && !hits.has(key)) {
    // Evict an arbitrary old entry to keep memory bounded.
    const oldest = hits.keys().next().value;
    if (oldest !== undefined) hits.delete(oldest);
  }
  hits.set(key, stamps);
  return { ok: true, retryAfterSec: 0, remaining: MAX - stamps.length };
}

/**
 * Client IP for rate-limit keys. Render/Vercel terminate TLS on a proxy and
 * set x-forwarded-for; take the first (client) hop. Falls back to a single
 * shared bucket if no proxy headers exist (e.g. local dev without one).
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
