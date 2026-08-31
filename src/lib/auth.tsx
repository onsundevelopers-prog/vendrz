"use client";

/* ------------------------------------------------------------------ */
/*  Auth abstraction - Clerk only.                                    */
/*                                                                     */
/*  Identity comes exclusively from Clerk. There is no fallback to     */
/*  localStorage demo accounts: without Clerk keys the app reports an  */
/*  unauthenticated state instead of fabricating a session.            */
/*                                                                     */
/*  Server components can inject the authenticated user (from the      */
/*  request-time `auth()`) through <AuthProvider> so client pages      */
/*  under it render instantly instead of waiting for Clerk's client    */
/*  JS to boot. Outside the provider, useAuthUser falls back to the    */
/*  live client session.                                               */
/* ------------------------------------------------------------------ */

import { createContext, useContext } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

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

function anon(isLoaded: boolean): AuthUser {
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

function fromClerk(user: NonNullable<ReturnType<typeof useUser>["user"]>): AuthUser {
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

const AuthUserContext = createContext<AuthUser | null>(null);

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
