"use client";

/* ------------------------------------------------------------------ */
/*  Clerk navbar auth - isolated on purpose.                           */
/*                                                                     */
/*  These components use Clerk client hooks, so they are the ONLY part */
/*  of the navbar that touches @clerk/nextjs. Navbar dynamic-imports   */
/*  them so public pages (which render the navbar without a            */
/*  <ClerkProvider>) never download the Clerk client runtime.          */
/* ------------------------------------------------------------------ */

import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";

const LOG_IN_LINK =
  "text-[13px] font-normal text-muted transition-colors hover:text-fg";

export function ClerkDesktopAuth() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) {
    return <span className="size-4 animate-spin rounded-full border-2 border-line border-t-fg" />;
  }
  return user ? (
    <UserButton />
  ) : (
    <Link href="/auth?mode=login" className={LOG_IN_LINK}>
      Log in
    </Link>
  );
}

export function ClerkMobileAuth({ onNavigate }: { onNavigate: () => void }) {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return null;
  return user ? (
    <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2.5">
      <span className="text-[13.5px] font-medium text-fg">Account</span>
      <UserButton />
    </div>
  ) : (
    <Link
      href="/auth?mode=signup"
      onClick={onNavigate}
      className="inline-flex h-8 items-center rounded-full bg-white px-4 text-[13px] font-[510] tracking-[-0.011em] text-black transition-colors hover:bg-bone"
    >
      Sign up
    </Link>
  );
}