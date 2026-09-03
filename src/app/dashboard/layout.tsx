import type { ReactNode } from "react";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { ServerAuthUser } from "@/lib/auth";
import DashboardShell from "./shell";

// Server-side mirror of the client's isClerkEnabled (same env var read);
// kept local because server components can't import values from client modules.
const isClerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/* ------------------------------------------------------------------ */
/*  Dashboard layout - server component.                               */
/*  Resolves the session AND profile fields (id/name/email) from the   */
/*  request via Clerk's backend - no Clerk client JS is loaded on the  */
/*  dashboard at all. The snapshot is handed to the client shell via    */
/*  <WorkspaceAuthProvider>, so the workspace paints instantly. In      */
/*  demo mode (no Clerk keys) the shell receives an anonymous snapshot. */
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
      if (userId) {
        try {
          const client = await clerkClient();
          const user = await client.users.getUser(userId);
          const name =
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            undefined;
          server = {
            id: userId,
            name,
            email: user.emailAddresses?.[0]?.emailAddress || undefined,
          };
        } catch {
          // Profile enrichment failed - the id alone is enough to render.
        }
      }
    } catch {
      // Clerk middleware inactive or no session on this request - render an
      // anonymous snapshot and let the client shell redirect, as before.
      server = { id: null };
    }
  }
  return <DashboardShell server={server}>{children}</DashboardShell>;
}