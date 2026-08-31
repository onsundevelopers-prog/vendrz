import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import type { ServerAuthUser } from "@/lib/auth";
import DashboardShell from "./shell";

// Server-side mirror of the client's isClerkEnabled (same env var read);
// kept local because server components can't import values from client modules.
const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/* ------------------------------------------------------------------ */
/*  Dashboard layout - server component.                               */
/*  Resolves the session from the request (middleware request state,    */
/*  no Clerk client JS needed) and hands it to the client shell via     */
/*  <AuthProvider>, so the workspace paints instantly instead of         */
/*  showing the loading skeleton while Clerk boots. In demo mode        */
/*  (no Clerk keys) the shell receives an anonymous snapshot, matching   */
/*  the old client-only behavior.                                       */
/* ------------------------------------------------------------------ */

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  let server: ServerAuthUser = { id: null };
  if (isClerkEnabled) {
    try {
      const { userId } = await auth();
      server = { id: userId ?? null };
    } catch {
      // Clerk middleware inactive or no session on this request - render an
      // anonymous snapshot and let the client shell redirect, as before.
      server = { id: null };
    }
  }
  return <DashboardShell server={server}>{children}</DashboardShell>;
}