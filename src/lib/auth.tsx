"use client";

/* ------------------------------------------------------------------ */
/*  Auth abstraction - Clerk only.                                    */
/*                                                                     */
/*  Identity comes exclusively from Clerk. There is no fallback to     */
/*  localStorage demo accounts: without Clerk keys the app reports an  */
/*  unauthenticated state instead of fabricating a session.            */
/* ------------------------------------------------------------------ */

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

/**
 * Current user from Clerk. `isLoaded` flips to true once the auth state
 * is known; callers gate their UI on it so there is never a hydration
 * mismatch. When Clerk isn't configured (no publishable key) this returns
 * an unauthenticated user rather than a fabricated demo account.
 */
export function useAuthUser(): AuthUser {
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
