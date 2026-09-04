"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { isClerkEnabled, useClerkMounted } from "@/lib/auth";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const LOG_IN_LINK =
  "text-[13px] font-normal text-muted transition-colors hover:text-fg";

/* White pill sign-up CTA - the second-highest contrast element in the
   system, after the neutral primary action. */
function SignUpPill({ href = "/auth?mode=signup", onClick }: { href?: string; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex h-8 items-center rounded-full bg-white px-4 text-[13px] font-[510] tracking-[-0.011em] text-black transition-colors hover:bg-bone"
    >
      Sign up
    </Link>
  );
}

/* The Clerk-backed auth controls (spinner -> UserButton / Log in) live in
   ClerkNavAuth.tsx and are dynamic-imported, so this module never ships
   the @clerk/nextjs runtime to pages without a <ClerkProvider>. */
const ClerkDesktopAuth = dynamic(
  () => import("./ClerkNavAuth").then((m) => m.ClerkDesktopAuth),
  { ssr: false }
);
const ClerkMobileAuth = dynamic(
  () => import("./ClerkNavAuth").then((m) => m.ClerkMobileAuth),
  { ssr: false }
);

/* Sign in / account controls.
   - Clerk disabled: plain link.
   - Inside a <ClerkProvider> (upload / audit routes): live session via
     Clerk hooks (spinner, then UserButton or Log in).
   - Public pages with no provider (landing): render from the `signedIn`
     boolean the server resolved from the request cookie - no Clerk JS. */
function DesktopAuth({ signedIn }: { signedIn?: boolean }) {
  const mounted = useClerkMounted();
  if (!isClerkEnabled) {
    return (
      <Link href="/auth?mode=login" className={LOG_IN_LINK}>
        Log in
      </Link>
    );
  }
  if (!mounted) {
    return signedIn ? (
      <Link href="/dashboard" className={LOG_IN_LINK}>
        Open dashboard
      </Link>
    ) : (
      <Link href="/auth?mode=login" className={LOG_IN_LINK}>
        Log in
      </Link>
    );
  }
  return <ClerkDesktopAuth />;
}

function MobileAuth({ onNavigate, signedIn }: { onNavigate: () => void; signedIn?: boolean }) {
  const mounted = useClerkMounted();
  if (!isClerkEnabled) {
    return <SignUpPill onClick={onNavigate} />;
  }
  if (!mounted) {
    return signedIn ? (
      <SignUpPill href="/dashboard" onClick={onNavigate} />
    ) : (
      <SignUpPill onClick={onNavigate} />
    );
  }
  return <ClerkMobileAuth onNavigate={onNavigate} />;
}

export function Navbar({ signedIn }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-line bg-canvas/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="n4ma home" className="shrink-0">
          <Logo />
        </Link>

        {/* center links - pure typographic, underline on hover */}
        <div className="hidden items-center gap-4 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="group relative px-2 py-1.5 text-[13px] font-normal text-muted transition-colors hover:text-fg"
            >
              {link.label}
              <span className="absolute inset-x-2 -bottom-px h-px scale-x-0 bg-muted transition-transform duration-200 group-hover:scale-x-100" />
            </a>
          ))}
        </div>

        {/* right actions */}
        <div className="hidden items-center gap-5 md:flex">
          <DesktopAuth signedIn={signedIn} />
          <SignUpPill href="/auth?mode=signup" />
        </div>

        {/* mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-md text-fg hover:bg-white/5 md:hidden"
        >
          {open ? (
            <span aria-hidden="true" className="relative block size-4">
              <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 rotate-45 bg-current" />
              <span className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 -rotate-45 bg-current" />
            </span>
          ) : (
            <span aria-hidden="true" className="block space-y-[5px]">
              <span className="block h-px w-4 bg-current" />
              <span className="block h-px w-4 bg-current" />
              <span className="block h-px w-4 bg-current" />
            </span>
          )}
        </button>
      </nav>

      {/* mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, height: "auto", scale: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, scale: 0.98, y: -8 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="overflow-hidden border-b border-line bg-canvas md:hidden"
          >
            <div className="space-y-1 px-5 pb-6 pt-2">
              {LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2.5 text-[15px] font-normal text-muted hover:bg-white/5 hover:text-fg"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2.5 pt-4">
                <MobileAuth onNavigate={() => setOpen(false)} signedIn={signedIn} />
                <Button href="/audit" className="w-full" onClick={() => setOpen(false)}>
                  Find my savings
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}