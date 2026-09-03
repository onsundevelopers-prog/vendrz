/* ------------------------------------------------------------------ */
/*  OAuth route helpers - state cookies + safe return paths.           */
/*                                                                     */
/*  Both Google Drive and Slack OAuth flows start at /api/<src>/auth,  */
/*  bounce through the provider, and return the browser to an app      */
/*  page. The `next` query param picks the landing page but is         */
/*  validated against a small allowlist so it can never be abused as   */
/*  an open redirect. State lives in a one-time httpOnly cookie.       */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";

/** Landing pages an OAuth round-trip may return to. */
const ALLOWED_NEXT_PATHS = ["/dashboard/import", "/dashboard/settings"];

/** Resolve a safe return path from a user-supplied `next` value. */
export function safeNextPath(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    const url = new URL(raw, "http://n4ma.local"); // relative-only check
    if (url.host !== "n4ma.local" || url.search || url.hash) return fallback;
    if (!ALLOWED_NEXT_PATHS.includes(url.pathname)) return fallback;
    return url.pathname;
  } catch {
    return fallback;
  }
}

/**
 * Build the final redirect after an OAuth round-trip, clearing the
 * one-time state cookie (+ optional extra one-time cookies). The landing
 * page reads `<resultKey>=<result>`.
 */
export function oauthDoneRedirect(opts: {
  origin: string;
  stateCookie: string;
  nextPath: string;
  resultKey: string;
  result: "connected" | "denied" | "error";
  /** Additional cookies to clear (e.g. the stored next-path cookie). */
  clearCookies?: string[];
}): NextResponse {
  const res = NextResponse.redirect(
    `${opts.origin}${opts.nextPath}?${opts.resultKey}=${opts.result}`
  );
  for (const name of [opts.stateCookie, ...(opts.clearCookies ?? [])]) {
    res.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
  return res;
}
