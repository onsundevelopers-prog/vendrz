"use client";

/* ------------------------------------------------------------------ */
/*  Workspace auth - Clerk-free dashboard identity.                    */
/*                                                                     */
/*  The dashboard never renders a Clerk UI component, so it does not   */
/*  need clerk-js or the @clerk/nextjs client runtime at all.          */
/*  Identity comes from the server snapshot the dashboard layout        */
/*  resolves (id/name/email via Clerk's backend, no client JS), and    */
/*  sign-out is a server endpoint that revokes the session and clears   */
/*  the cookies. Keeping @clerk/nextjs out of this module removes the   */
/*  ~330 KB of clerk-js + @clerk/ui every dashboard load previously    */
/*  downloaded through /__clerk.                                       */
/*                                                                     */
/*  Routes that DO render Clerk UI (auth, upload, results, audit)      */
/*  keep using lib/auth-hooks.tsx inside <ClerkScope>.                 */
/* ------------------------------------------------------------------ */

import { useContext } from "react";
import { AuthUserContext, anon, type AuthUser, type ServerAuthUser } from "./auth";

/**
 * Provides the auth snapshot the server layout already resolved, so the
 * whole dashboard renders on first paint with no Clerk client JS. When
 * the snapshot carries an id the user is signed in; profile fields were
 * enriched server-side by the layout.
 */
export function WorkspaceAuthProvider({
  server,
  children,
}: {
  server: ServerAuthUser;
  children: React.ReactNode;
}) {
  const value: AuthUser = server.id
    ? {
        id: server.id,
        name: server.name || "User",
        email: server.email || "",
        provider: "clerk",
        providerLabel: "Email & password",
        isLoaded: true,
        user: null,
      }
    : anon(true);
  return <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>;
}

/** Current user from the server snapshot. Always loaded on the dashboard. */
export function useAuthUser(): AuthUser {
  const ctx = useContext(AuthUserContext);
  return ctx ?? anon(true);
}

/**
 * Sign out through the server endpoint (revokes the Clerk session and
 * clears its cookies), then do a full navigation so the next request is
 * treated as signed out by the middleware.
 */
export function useWorkspaceSignOut(): () => void {
  return () => {
    void fetch("/api/auth/signout", { method: "POST" }).finally(() => {
      window.location.href = "/";
    });
  };
}