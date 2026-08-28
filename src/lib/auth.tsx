"use client";

/* ------------------------------------------------------------------ */
/*  Auth abstraction.                                                  */
/*                                                                     */
/*  When Clerk keys are present (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`), */
/*  the app is fully authenticated through Clerk. Without keys it      */
/*  falls back to the localStorage demo accounts so the whole product  */
/*  still runs with zero configuration (and the build stays green).    */
/*  The flag is read from the build-time env, so the branch taken is   */
/*  identical on server and client for a given build.                  */
/* ------------------------------------------------------------------ */

import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import type { Account } from "./types";
import { getCurrentAccount, logout as legacyLogout } from "./store";

export const isClerkEnabled =
  typeof process !== "undefined" &&
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export interface AuthUser {
  id: string | null;
  name: string;
  email: string;
  provider: "google" | "email" | "clerk";
  providerLabel: string;
  /** False only while Clerk is still loading its session. */
  isLoaded: boolean;
  /** The raw Clerk user, when signed in via Clerk. */
  user: ReturnType<typeof useUser>["user"];
  legacyAccount: Account | null;
}

const NO_USER: Pick<AuthUser, "user"> = { user: null };

function fromLegacy(account: Account | null): AuthUser {
  return {
    id: account?.id ?? null,
    name: account?.name ?? "",
    email: account?.email ?? "",
    provider: account?.provider ?? "email",
    providerLabel: account?.provider === "google" ? "Google" : "Email & password",
    isLoaded: true,
    ...NO_USER,
    legacyAccount: account,
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
    legacyAccount: null,
  };
}

/**
 * Current user, either from Clerk or the legacy localStorage account.
 * `isLoaded` flips to true once the auth state is known; callers gate
 * their UI on it so there is never a hydration mismatch.
 */
export function useAuthUser(): AuthUser {
  /* eslint-disable react-hooks/rules-of-hooks -- isClerkEnabled is a static per-build flag, so the hook call order is identical on every render */
  if (isClerkEnabled) {
    const { user, isLoaded } = useUser();
    if (!isLoaded) {
      return { ...fromLegacy(getCurrentAccount()), isLoaded: false };
    }
    return user ? fromClerk(user) : fromLegacy(getCurrentAccount());
  }
  return fromLegacy(getCurrentAccount());
  /* eslint-enable react-hooks/rules-of-hooks */
}

/** Sign out of Clerk (or clear the demo account in fallback mode). */
export function useAuthSignOut(): () => void {
  const router = useRouter();
  /* eslint-disable react-hooks/rules-of-hooks -- static per-build flag, see useAuthUser */
  const clerk = isClerkEnabled ? useClerk() : null;
  /* eslint-enable react-hooks/rules-of-hooks */
  return () => {
    if (clerk) {
      void clerk.signOut({ redirectUrl: "/" });
    } else {
      legacyLogout();
      router.push("/");
    }
  };
}
