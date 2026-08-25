"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser, useAuthSignOut } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { money } from "@/lib/format";
import { getDemoAudit } from "@/lib/store";

const NAV = [
  { label: "Overview", href: "/dashboard" },
  { label: "Vendors", href: "/dashboard/vendors" },
  { label: "Agent", href: "/dashboard/agent" },
  { label: "Spend", href: "/dashboard/spend" },
  { label: "Savings", href: "/dashboard/savings" },
  { label: "Contracts", href: "/dashboard/contracts" },
  { label: "Renewals", href: "/dashboard/renewals" },
  { label: "Invoices", href: "/dashboard/invoices" },
  { label: "Usage", href: "/dashboard/usage" },
  { label: "Alerts", href: "/dashboard/alerts" },
  { label: "Actions", href: "/dashboard/actions" },
  { label: "Reports", href: "/dashboard/reports" },
  { label: "Integrations", href: "/dashboard/integrations" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuthUser();
  const signOut = useAuthSignOut();
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  const audit = getDemoAudit();
  const alertCount = audit.alerts.filter((a) => !a.read).length;

  // Close the mobile menu when navigating - adjust state during render so the
  // change commits with the navigation instead of cascading from an effect.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.id) {
      router.replace("/auth?mode=login&next=/dashboard");
      return;
    }
    // Reveal the shell after mount: server and first client render both show
    // the spinner, so flipping this post-hydration avoids a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [auth.isLoaded, auth.id, router]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-fg" />
      </main>
    );
  }

  const isDemo = auth.isDemo;
  const initials = (auth.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <Link href="/" aria-label="Vendrz" className="min-w-0">
          <Logo className="[&_span:last-child]:text-[14px]" />
        </Link>
      </div>

      <div className="mx-3 mb-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-3.5 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] uppercase tracking-[0.12em] text-emerald-300">
            Acme Technologies
          </span>
          {isDemo && (
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-px text-[9px] uppercase tracking-wide text-emerald-300">
              demo
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] tracking-tight text-muted">
          {money(audit.totalAnnualSpend)}/yr · {audit.vendorCount} vendors
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? "bg-white/[0.08] text-fg"
                  : "text-muted hover:bg-white/[0.04] hover:text-fg"
              }`}
            >
              {item.label}
              {item.label === "Alerts" && alertCount > 0 && (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-500/15 text-[10px] font-semibold text-red-400">
                  {alertCount > 9 ? "9+" : alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <Link
          href="/audit"
          className="flex items-center justify-center rounded-full bg-white px-3 py-2.5 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
        >
          Run new audit
        </Link>
        <div className="mt-3 flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[12px] font-semibold tracking-tight text-emerald-300">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-fg">{auth.name}</p>
            <p className="truncate text-[11px] tracking-tight text-muted">{auth.email}</p>
          </div>
          <button
            onClick={signOut}
            aria-label="Log out"
            title="Log out"
            className="flex size-7 items-center justify-center rounded-md text-[13px] text-muted hover:bg-white/5 hover:text-fg"
          >
            ↪
          </button>
        </div>
      </div>
    </div>
  );

  const currentLabel =
    NAV.find((n) =>
      n.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.href)
    )?.label ?? "Dashboard";

  return (
    <div className="min-h-screen bg-canvas">
      {/* desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* mobile sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface shadow-glow">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 flex size-8 items-center justify-center rounded-lg text-[16px] text-muted hover:bg-white/5"
            >
              ×
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      {/* topbar */}
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-5 backdrop-blur-xl lg:pl-[260px]">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-white/5 lg:hidden"
        >
          <span aria-hidden="true" className="block space-y-[5px]">
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
          </span>
        </button>
        <div className="flex-1">
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{currentLabel}</p>
        </div>
        <span className="hidden rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[12px] tracking-tight text-emerald-300 sm:inline-flex">
          Monitoring active
        </span>
      </header>

      <main className="px-5 py-8 lg:pl-[260px] lg:pr-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
