/* ------------------------------------------------------------------ */
/*  Route protection + Clerk Frontend API proxy.                       */
/*                                                                     */
/*  Clerk's Frontend API is proxied through this app at /__clerk so    */
/*  auth works even though the production publishable key predates a   */
/*  legacy (now dead) frontend domain: agent attribution happens       */
/*  server-side via the Clerk-Secret-Key header, not the domain        */
/*  encoded inside the key. The browser loads clerk-js and talks to    */
/*  /v1/* exclusively through this origin (NEXT_PUBLIC_CLERK_PROXY_URL).*/
/*                                                                     */
/*  Stale-session self-heal: browsers that visited under an older      */
/*  Clerk instance/domain keep first-party __session/__client cookies  */
/*  this origin can no longer validate. They poison the sign-in        */
/*  widget (the classic "only incognito works" failure). Whenever the  */
/*  server has already determined there is NO valid session but such   */
/*  cookies are still present, they are cleared on the way through so  */
/*  the next visit starts clean - no manual cache/cookie clearing      */
/*  needed and no incognito workaround. Active sessions are never      */
/*  touched (auth() only reports null when the token is invalid).      */
/*                                                                     */
/*  Active only when Clerk keys are configured; otherwise the app      */
/*  runs in demo mode and every route is public (the dashboard then    */
/*  falls back to the localStorage accounts / demo company).           */
/* ------------------------------------------------------------------ */

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  clearClerkAuthCookies,
  hasClerkAuthCookies,
} from "./lib/clerkCookies";

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const hasClerkKeys =
  !!process.env.CLERK_SECRET_KEY &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default hasClerkKeys
  ? clerkMiddleware(
      async (auth, req) => {
        const pathname = req.nextUrl.pathname;
        const secure = req.nextUrl.protocol === "https:";

        // Self-heal on the sign-in page: if the browser still holds Clerk
        // cookies for an invalid/old session, drop them before serving the
        // page so the widget boots clean.
        if (pathname === "/auth" && hasClerkAuthCookies(req.cookies)) {
          const { userId } = await auth();
          if (!userId) {
            const res = NextResponse.next();
            clearClerkAuthCookies(res.cookies, { secure });
            return res;
          }
        }

        if (isProtectedRoute(req)) {
          const { userId } = await auth();
          if (!userId) {
            // Signed out (or holding an unreadable token): go sign in. If
            // stale Clerk cookies are present they are cleared on the
            // redirect so the auth page starts clean too.
            const url = new URL("/auth?mode=login", req.nextUrl.origin);
            url.searchParams.set("next", pathname);
            const res = NextResponse.redirect(url.toString());
            if (hasClerkAuthCookies(req.cookies)) {
              clearClerkAuthCookies(res.cookies, { secure });
            }
            return res;
          }
          // Middleware redirects require absolute URLs.
          await auth.protect({
            unauthenticatedUrl: `${req.nextUrl.origin}/auth?mode=login`,
          });
        }
      },
      {
        frontendApiProxy: {
          enabled: true,
        },
      }
    )
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk Frontend API proxy routes
    "/__clerk/(.*)",
  ],
};
