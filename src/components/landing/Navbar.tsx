"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { isClerkEnabled } from "@/lib/auth";

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

function ClerkDesktopAuth() {
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

function ClerkMobileAuth({ onNavigate }: { onNavigate: () => void }) {
  const { isLoaded, user } = useUser();
  if (!isLoaded) return null;
  return user ? (
    <div className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2.5">
      <span className="text-[13.5px] font-medium text-fg">Account</span>
      <UserButton />
    </div>
  ) : (
    <SignUpPill onClick={onNavigate} />
  );
}

/* Sign in / account controls - Clerk when configured, plain link otherwise. */
function DesktopAuth() {
  if (!isClerkEnabled) {
    return (
      <Link href="/auth?mode=login" className={LOG_IN_LINK}>
        Log in
      </Link>
    );
  }
  return <ClerkDesktopAuth />;
}

function MobileAuth({ onNavigate }: { onNavigate: () => void }) {
  if (!isClerkEnabled) {
    return <SignUpPill onClick={onNavigate} />;
  }
  return <ClerkMobileAuth onNavigate={onNavigate} />;
}

export function Navbar() {
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
          <DesktopAuth />
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
                <MobileAuth onNavigate={() => setOpen(false)} />
                <Button href="/audit" className="w-full" onClick={() => setOpen(false)}>
                  Run free review
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}