"use client";

/* ------------------------------------------------------------------ */
/*  Clerk runtime hooks.                                              */
/*                                                                     */
/*  Everything here imports @clerk/nextjs at runtime, so this module   */
/*  must only be imported from routes wrapped in <ClerkScope> (auth,   */
/*  dashboard, upload, results, audit). The light lib/auth.tsx module  */
/*  has no runtime Clerk import, keeping public pages free of the      */
/*  Clerk client runtime.                                              */
/* ------------------------------------------------------------------ */

import { useContext } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  AuthUserContext,
  anon,
  fromClerk,
  isClerkEnabled,
  type AuthUser,
  type ServerAuthUser,
} from "./auth";

/**
 * Provides the auth snapshot a server component already resolved, so the
 * whole subtree renders on first paint without waiting for Clerk's client
 * JS. Profile fields not present in the snapshot hydrate from the live
 * Clerk session when it arrives; outside of that, behavior matches the
 * plain client path exactly.
 */
export function AuthProvider({
  server,
  children,
}: {
  server: ServerAuthUser;
  children: React.ReactNode;
}) {
  /* eslint-disable react-hooks/rules-of-hooks -- static per-build flag, see useAuthUser */
  const live = isClerkEnabled ? useUser() : null;
  /* eslint-enable react-hooks/rules-of-hooks */

  const clerkUser = live?.user ?? null;
  const clerkLoaded = live?.isLoaded ?? false;

  let value: AuthUser;
  if (server.id && isClerkEnabled) {
    value = {
      id: server.id,
      name:
        server.name ||
        clerkUser?.firstName ||
        clerkUser?.username ||
        clerkUser?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
        "User",
      email: server.email || (clerkUser?.primaryEmailAddress?.emailAddress ?? ""),
      provider: "clerk",
      providerLabel:
        clerkUser?.externalAccounts?.find((a) => a.provider === "google")
          ? "Google"
          : "Email & password",
      isLoaded: true,
      user: clerkUser,
    };
  } else if (isClerkEnabled && !clerkLoaded) {
    value = anon(false);
  } else {
    value = clerkUser ? fromClerk(clerkUser) : anon(true);
  }

  return <AuthUserContext.Provider value={value}>{children}</AuthUserContext.Provider>;
}

/**
 * Current user from Clerk. `isLoaded` flips to true once the auth state
 * is known; callers gate their UI on it so there is never a hydration
 * mismatch. Inside an <AuthProvider> the server-resolved snapshot is used
 * (instant), otherwise this waits on Clerk's client session. When Clerk
 * isn't configured (no publishable key) this returns an unauthenticated
 * user rather than a fabricated demo account.
 */
export function useAuthUser(): AuthUser {
  const server = useContext(AuthUserContext);
  if (server) return server;

  /* eslint-disable react-hooks/rules-of-hooks -- isClerkEnabled is a static per-build flag, so the hook call order is identical on every render */
  if (isClerkEnabled) {
    const { user, isLoaded } = useUser();
    if (!isLoaded) return anon(false);
    return user ? fromClerk(user) : anon(true);
  }
  return anon(true);
  /* eslint-enable react-hooks/rules-of-hooks */
}

/** Sign out of Clerk (no-op navigation when Clerk isn't configured). */
export function useAuthSignOut(): () => void {
  const router = useRouter();
  /* eslint-disable react-hooks/rules-of-hooks -- static per-build flag, see useAuthUser */
  const clerk = isClerkEnabled ? useClerk() : null;
  /* eslint-enable react-hooks/rules-of-hooks */
  return () => {
    if (clerk) {
      void clerk.signOut({ redirectUrl: "/" });
    } else {
      router.push("/");
    }
  };
}