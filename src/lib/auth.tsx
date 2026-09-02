"use client";

/* ------------------------------------------------------------------ */
/*  Auth abstraction - Clerk only.                                    */
/*                                                                     */
/*  Identity comes exclusively from Clerk. There is no fallback to     */
/*  localStorage demo accounts: without Clerk keys the app reports an  */
/*  unauthenticated state instead of fabricating a session.            */
/*                                                                     */
/*  This module is the LIGHT auth module: it carries no runtime        */
/*  @clerk/nextjs imports (only the erased `import type`), so public   */
/*  pages like the landing page can import `isClerkEnabled` and        */
/*  `useClerkMounted` without pulling the Clerk client runtime into    */
/*  their bundle. The Clerk-hook-dependent pieces - <AuthProvider>,    */
/*  useAuthUser() and useAuthSignOut() - live in lib/auth-hooks.tsx    */
/*  and are imported only by routes that are wrapped in <ClerkScope>.  */
/* ------------------------------------------------------------------ */

import { createContext, useContext } from "react";
import type { useUser } from "@clerk/nextjs";

export const isClerkEnabled =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export interface AuthUser {
  id: string | null;
  name: string;
  email: string;
  provider: "clerk";
  providerLabel: string;
  /** False only while Clerk is still loading its session. */
  isLoaded: boolean;
  /** The raw Clerk user, when signed in. */
  user: ReturnType<typeof useUser>["user"];
}

/**
 * Server-provided auth snapshot (from `auth()` in a server component).
 * Only `id` is guaranteed - full profile fields hydrate from the client
 * Clerk session the moment it boots.
 */
export interface ServerAuthUser {
  id: string | null;
  name?: string;
  email?: string;
}

const NO_USER: Pick<AuthUser, "user"> = { user: null };

export function anon(isLoaded: boolean): AuthUser {
  return {
    id: null,
    name: "",
    email: "",
    provider: "clerk",
    providerLabel: "",
    isLoaded,
    ...NO_USER,
  };
}

export function fromClerk(user: NonNullable<ReturnType<typeof useUser>["user"]>): AuthUser {
  const googleAccount = user.externalAccounts?.find((a) => a.provider === "google");
  return {
    id: user.id,
    name:
      user.firstName ||
      user.username ||
      user.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "User",
    email: user.primaryEmailAddress?.emailAddress ?? "",
    provider: "clerk",
    providerLabel: googleAccount ? "Google" : "Email & password",
    isLoaded: true,
    user,
  };
}

export const AuthUserContext = createContext<AuthUser | null>(null);

/* ------------------------------------------------------------------ */
/*  Clerk provider presence.                                           */
/*  Clerk hooks (useUser / useClerk) throw outside a <ClerkProvider>.  */
/*  Components that render on both provider-wrapped routes (dashboard,  */
/*  auth, upload) and plain public routes (the landing navbar) read     */
/*  this flag instead of calling Clerk hooks unconditionally.          */
/* ------------------------------------------------------------------ */

const ClerkMountedContext = createContext(false);

/** Marks a subtree as inside <ClerkProvider> (see ClerkScope). */
export function ClerkMounted({ children }: { children: React.ReactNode }) {
  return (
    <ClerkMountedContext.Provider value={true}>
      {children}
    </ClerkMountedContext.Provider>
  );
}

/** True only inside a Clerk-provided subtree. Safe to call anywhere. */
export function useClerkMounted(): boolean {
  return useContext(ClerkMountedContext);
}