import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Route protection.                                                  */
/*  Active only when Clerk keys are configured; otherwise the app      */
/*  runs in demo mode and every route is public (the dashboard then    */
/*  falls back to the localStorage accounts / demo company).           */
/*                                                                     */
/*  Clerk's frontend API is NOT proxied here (no /__clerk matcher):    */
/*  CLERK_DISABLE_AUTO_PROXY keeps Clerk loaded from its own CDN so    */
/*  the auth script and session calls never hop through this server.   */
/* ------------------------------------------------------------------ */

const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

const hasClerkKeys =
  !!process.env.CLERK_SECRET_KEY &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default hasClerkKeys
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        // Middleware redirects require absolute URLs.
        await auth.protect({
          unauthenticatedUrl: `${req.nextUrl.origin}/auth?mode=login`,
        });
      }
    })
  : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
