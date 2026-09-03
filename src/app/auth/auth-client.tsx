"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { isClerkEnabled } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";

/* ------------------------------------------------------------------ */
/*  Split shell - brand panel left, auth card right.                  */
/*  This shell contains no Clerk imports, so it renders and hydrates   */
/*  before any Clerk JavaScript loads. The Clerk widget (SignIn /      */
/*  SignUp) is lazy-loaded below into the right column.                */
/* ------------------------------------------------------------------ */

const TRUST_POINTS = [
  "Read-only access - we can never move money or touch your accounts",
  "Contracts encrypted in transit and at rest, never shared",
  "Renewal, risk and savings analysis with evidence for every finding",
];

function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between border-r border-line bg-[#0a0a0d] p-12 lg:flex">
        <Link href="/" aria-label="n4ma home" className="w-fit">
          <Logo size="lg" />
        </Link>

        <div>
          <h1 className="max-w-md text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-fg">
            Every contract, in one place.
          </h1>
          <p className="mt-4 max-w-sm text-pretty text-[15px] leading-[1.6] tracking-[-0.01em] text-muted">
            Renewal deadlines, risk, exposure and savings - extracted from real
            documents and tracked in a single workspace.
          </p>
          <ul className="mt-9 space-y-4">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-muted">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="mt-[3px] shrink-0 text-zinc-400"
                  aria-hidden="true"
                >
                  <path d="M3 7.8 6 10.5l6-6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] tracking-tight text-muted/50">
          © {new Date().getFullYear()} n4ma
        </p>
      </div>

      {/* auth column */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="fade-rise w-full max-w-[420px]">
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" aria-label="n4ma home">
              <Logo />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}

/* Skeleton shown in the card slot while the Clerk widget chunk and
   clerk-js are loading - the shell paints immediately, this fills the
   empty column so the page never looks broken. */
function AuthCardSkeleton() {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="h-[26px] w-44 rounded-md bg-white/[0.06]" />
      <div className="mt-2 h-4 w-64 max-w-full rounded-md bg-white/[0.04]" />
      <div className="mt-8 space-y-4">
        <div className="h-11 w-full rounded-md bg-white/[0.05]" />
        <div className="h-11 w-full rounded-md bg-white/[0.05]" />
        <div className="h-11 w-full rounded-md bg-white/[0.05]" />
        <div className="h-11 w-full rounded-md bg-white/[0.08]" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Clerk widget - everything touching @clerk/nextjs is bundled into   */
/*  its own chunk and fetched only after the shell has rendered, so    */
/*  the page paints before any Clerk JavaScript is on screen.          */
/* ------------------------------------------------------------------ */

const LazyClerkAuthCard = dynamic(
  () =>
    import("@/components/auth/ClerkAuthCard").then((m) => m.ClerkAuthCard),
  { ssr: false }
);

/* ------------------------------------------------------------------ */
/*  No Clerk keys configured - show a clear state instead of a fake    */
/*  login form. Auth is Clerk-only; nothing fabricates a session.      */
/* ------------------------------------------------------------------ */

function UnconfiguredPage() {
  return (
    <AuthSplit>
      <div className="rounded-xl border border-line bg-[#0d0d11] p-6 text-center sm:p-7">
        <p className="text-[14px] font-medium text-fg">Sign-in isn&apos;t configured yet</p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Add <span className="font-mono text-zinc-300">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span>{" "}
          and <span className="font-mono text-zinc-300">CLERK_SECRET_KEY</span> to your
          environment and restart, then sign-in will work here.
        </p>
      </div>
    </AuthSplit>
  );
}

/* ------------------------------------------------------------------ */

export function AuthClient() {
  if (!isClerkEnabled) return <UnconfiguredPage />;
  return (
    <AuthSplit>
      <Suspense fallback={<AuthCardSkeleton />}>
        <LazyClerkAuthCard />
      </Suspense>
    </AuthSplit>
  );
}