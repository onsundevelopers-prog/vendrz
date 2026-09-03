import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AuthClient } from "./auth-client";

// Server-side mirror of the client's isClerkEnabled (same env var read);
// server components can't import values from client modules.
const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/* ------------------------------------------------------------------ */
/*  Auth page - thin server wrapper.                                   */
/*                                                                     */
/*  A returning user with a live session never needs to download       */
/*  clerk-js or see the sign-in form: the session is detected here      */
/*  server-side (the middleware already validated it) and the user is   */
/*  sent straight to the dashboard. Only signed-out visitors reach the  */
/*  client shell (auth-client.tsx), which lazy-loads the Clerk widget.  */
/*                                                                     */
/*  Redirect is skipped when ?session= is present: that is an anonymous */
/*  analysis the client flow must transfer to the account on sign-in.   */
/* ------------------------------------------------------------------ */

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (isClerkEnabled) {
    try {
      const { userId } = await auth();
      if (userId) {
        const sp = await searchParams;
        if (!sp.session) {
          const next = sp.next;
          // Only ever redirect to a same-origin relative path.
          const target =
            typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
              ? next
              : "/dashboard";
          redirect(target);
        }
      }
    } catch {
      // Clerk unavailable on this request - render the client, which shows
      // its own honest state.
    }
  }
  return <AuthClient />;
}