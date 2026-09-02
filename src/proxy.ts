import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
/*  Active only when Clerk keys are configured; otherwise the app      */
/*  runs in demo mode and every route is public (the dashboard then    */
/*  falls back to the localStorage accounts / demo company).           */
/* ------------------------------------------------------------------ */

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const hasClerkKeys =
  !!process.env.CLERK_SECRET_KEY &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default hasClerkKeys
  ? clerkMiddleware(
      async (auth, req) => {
        if (isProtectedRoute(req)) {
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
