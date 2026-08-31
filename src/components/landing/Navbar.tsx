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
  "text-[13.5px] font-medium text-muted transition-colors hover:text-fg";

function ClerkDesktopAuth() {
  const { isLoaded, user } = useUser();
  if (!isLoaded) {
    return <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-fg" />;
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
    <div className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2.5">
      <span className="text-[13.5px] font-medium text-fg">Account</span>
      <UserButton />
    </div>
  ) : (
    <Button
      href="/auth?mode=login"
      variant="outline"
      className="w-full"
      onClick={onNavigate}
    >
      Log in
    </Button>
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
    return (
      <Button
        href="/auth?mode=login"
        variant="outline"
        className="w-full"
        onClick={onNavigate}
      >
        Log in
      </Button>
    );
  }
  return <ClerkMobileAuth onNavigate={onNavigate} />;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

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
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" aria-label="n4ma home" className="shrink-0">
          <Logo className="[&_span:last-child]:text-[15px]" />
        </Link>

        {/* center links - sliding hover pill */}
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              className="relative rounded-full px-3.5 py-1.5 text-[13.5px] font-medium text-muted transition-colors hover:text-fg"
            >
              {hovered === i && (
                <motion.span
                  layoutId="nav-pill"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="absolute inset-0 rounded-full bg-white/[0.06]"
                />
              )}
              <span className="relative z-10">{link.label}</span>
            </a>
          ))}
        </div>

        {/* right actions */}
        <div className="hidden items-center gap-4 md:flex">
          <DesktopAuth />
          <Button href="/audit" size="sm">
            Run free review
          </Button>
        </div>

        {/* mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-lg text-fg hover:bg-white/5 md:hidden"
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
                  className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-muted hover:bg-white/5 hover:text-fg"
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
