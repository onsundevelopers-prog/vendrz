/* ------------------------------------------------------------------ */
/*  Clerk auth-cookie helpers (server-only).                           */
/*                                                                     */
/*  n4ma's Clerk instance changed over time (rebrand, new instance,    */
/*  decommissioned frontend domain + /__clerk proxy). A browser        */
/*  profile that visited the app under an older configuration keeps    */
/*  stale first-party Clerk cookies (`__session`, `__client`, ...) for */
/*  THIS origin. The current Clerk stack cannot reconcile them, which  */
/*  makes the sign-in widget hang - the classic "only incognito        */
/*  works" failure. These helpers let the middleware and the auth      */
/*  routes drop invalid Clerk cookies whenever the server has already  */
/*  determined there is no valid session, so affected users self-heal  */
/*  on their next visit without incognito.                             */
/* ------------------------------------------------------------------ */

/** Clerk cookie names across versions. Never treat these as secrets. */
export const CLERK_COOKIE_NAMES = [
  "__client",
  "__session",
  "__session_uat",
  "__session_legacy",
] as const;

/** True when the request carries any Clerk auth cookie (stale or not). */
export function hasClerkAuthCookies(cookies: {
  get: (name: string) => { value: string } | undefined;
  getAll?: () => Array<{ name: string }>;
}): boolean {
  for (const name of CLERK_COOKIE_NAMES) {
    if (cookies.get(name)) return true;
  }
  // Per-client session cookies (__session_<clientId>) count too.
  const all = cookies.getAll?.() ?? [];
  return all.some((c) => c.name.startsWith("__session_"));
}

/**
 * Best-effort clear of every Clerk auth cookie the browser may hold
 * (host-only form; domain-scoped legacy copies are covered by the
 * same-name domain variants where supported).
 */
export function clearClerkAuthCookies(
  res: {
    set(
      name: string,
      value: string,
      opts?: {
        path?: string;
        maxAge?: number;
        sameSite?: "lax" | "strict" | "none";
        secure?: boolean;
        httpOnly?: boolean;
      }
    ): unknown;
  },
  opts: { secure: boolean }
): void {
  const base = {
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: opts.secure,
  };
  for (const name of CLERK_COOKIE_NAMES) {
    res.set(name, "", base);
  }
}
