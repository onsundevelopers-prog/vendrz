"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  CalendarClock,
  FileText,
  Grid3x3,
  HelpCircle,
  Home,
  LogOut,
  Maximize2,
  PanelLeftClose,
  Plus,
  ScrollText,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { useAuthUser, useAuthSignOut } from "@/lib/auth";
import { DashboardModeProvider } from "@/lib/displayMode";
import { hydrateUserData, persistUserData } from "@/lib/sync";
import { motion } from "framer-motion";
import { Logo } from "@/components/brand/Logo";
import { CommandPalette, type PaletteItem } from "@/components/ui/CommandPalette";

/* ------------------------------------------------------------------ */
/*  Workspace shell - dense enterprise layout.                        */
/*  A slim top header carries branding, the command palette (⌘K),      */
/*  the connect action, and the account. The left side is a narrow     */
/*  monochrome icon rail (Supabase-style), active = white pill. Each   */
/*  section owns its own secondary sidebar / table editor beside it.   */
/* ------------------------------------------------------------------ */

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: <Home size={15} /> },
  { label: "Vendors", href: "/dashboard/companies", icon: <Grid3x3 size={15} /> },
  { label: "AI Assistant", href: "/dashboard/ai", icon: <Bot size={15} /> },
  { label: "Contracts", href: "/dashboard/contracts", icon: <FileText size={15} /> },
  { label: "Renewals", href: "/dashboard/renewals", icon: <CalendarClock size={15} /> },
  { label: "Risk", href: "/dashboard/risks", icon: <ShieldAlert size={15} /> },
  { label: "Activity", href: "/dashboard/activity", icon: <ScrollText size={15} /> },
  { label: "Savings", href: "/dashboard/savings", icon: <Wallet size={15} /> },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuthUser();
  const signOut = useAuthSignOut();
  const [ready, setReady] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.id) {
      router.replace("/auth?mode=login&next=/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [auth.isLoaded, auth.id, router]);

  // Workspace persistence: pull the user's saved data into localStorage
  // once per sign-in (remount children when it arrives so nothing renders
  // as empty), then push changes to Supabase on an interval and on unload.
  useEffect(() => {
    if (!auth.isLoaded || !auth.id) return;
    const userId = auth.id;
    let alive = true;
    void hydrateUserData(userId).then((changed) => {
      if (alive && changed) setDataVersion((v) => v + 1);
    });
    const timer = setInterval(() => persistUserData(userId), 15_000);
    const onHide = () => persistUserData(userId);
    window.addEventListener("beforeunload", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) persistUserData(userId);
    });
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("beforeunload", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [auth.isLoaded, auth.id]);

  // Global ⌘K / Ctrl+K to open the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  const paletteItems = useMemo<PaletteItem[]>(
    () => [
      ...NAV.map((n) => ({
        id: n.href,
        group: "Noma",
        label: n.label,
        keywords: n.label,
        onSelect: () => router.push(n.href),
      })),
      {
        id: "/dashboard/settings",
        group: "System",
        label: "Settings",
        keywords: "settings preferences",
        onSelect: () => router.push("/dashboard/settings"),
      },
      {
        id: "/upload",
        group: "Actions",
        label: "Upload a contract",
        keywords: "upload new contract analyze scan",
        onSelect: () => router.push("/upload"),
      },
      {
        id: "/audit",
        group: "Actions",
        label: "Run a review",
        keywords: "review report connect gmail aws",
        onSelect: () => router.push("/audit"),
      },
    ],
    [router]
  );

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <div className="size-5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-200" />
          <p className="text-[12px] tracking-tight text-muted">Loading workspace…</p>
        </div>
      </main>
    );
  }

  const initials = (auth.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DashboardModeProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-canvas">
        {/* ---------------------------- top header ---------------------------- */}
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-3">
          {/* brand + workspace */}
          <Link href="/" aria-label="Noma home" className="flex shrink-0 items-center rounded-md px-1.5 py-1 hover:bg-hover">
            <Logo className="[&_span:last-child]:text-[14px]" />
          </Link>

          <span className="hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
          <span className="hidden truncate text-[12.5px] font-medium text-fg sm:block">
            {auth.name || "Noma"}
          </span>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <Link
              href="/audit"
              className="flex h-7 items-center gap-1.5 rounded-md bg-white px-3 text-[12px] font-semibold text-black transition-opacity hover:opacity-90"
            >
              <Plus size={13} />
              Connect
            </Link>

            <span className="h-4 w-px bg-line" aria-hidden="true" />
            <span className="hidden text-[11.5px] text-muted lg:block">Feedback</span>

            {/* search -> command palette */}
            <button
              onClick={() => setPaletteOpen(true)}
              aria-label="Search (Command K)"
              title="Search (⌘K)"
              className="flex h-7 w-40 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-left text-[12px] text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              <Search size={12} />
              <span className="min-w-0 flex-1 truncate">Search…</span>
              <span className="kbd">⌘K</span>
            </button>

            <button aria-label="Help" title="Help" className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg">
              <HelpCircle size={15} />
            </button>
            <button
              aria-label="Run review"
              title="Run review"
              onClick={() => router.push("/audit")}
              className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg"
            >
              <Maximize2 size={14} />
            </button>

            {/* account + sign out */}
            <span className="group relative flex size-7 items-center justify-center rounded-md border border-line bg-inset text-[10px] font-semibold text-fg">
              {initials}
              <button
                onClick={signOut}
                aria-label="Log out"
                title="Log out"
                className="absolute right-0 top-full mt-1 hidden rounded-md border border-line bg-float p-1.5 text-muted shadow-lg group-hover:block hover:text-fg"
              >
                <LogOut size={13} />
              </button>
            </span>
          </div>
        </header>

        <div className="flex min-h-0 flex-1">
          {/* ------------------------- narrow icon rail (Supabase-style) ------------------------- */}
          {!railCollapsed && (
            <aside className="flex w-[52px] shrink-0 flex-col items-center border-r border-line bg-surface py-2">
              <nav className="flex min-h-0 w-full flex-1 flex-col items-center gap-1">
                {NAV.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      aria-label={item.label}
                      className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                        active
                          ? "bg-fg text-black"
                          : "text-muted hover:bg-hover hover:text-fg"
                      }`}
                    >
                      {item.icon}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex flex-col items-center gap-1 border-t border-line pt-2">
                <Link
                  href="/dashboard/settings"
                  title="Settings"
                  aria-label="Settings"
                  className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${
                    pathname === "/dashboard/settings"
                      ? "bg-fg text-black"
                      : "text-muted hover:bg-hover hover:text-fg"
                  }`}
                >
                  <SettingsIcon size={15} />
                </Link>
                <button
                  onClick={() => setRailCollapsed(true)}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
                >
                  <PanelLeftClose size={14} />
                </button>
              </div>
            </aside>
          )}

          {/* ---------------------------- work area ---------------------------- */}
          <div className="flex min-w-0 flex-1 flex-col bg-canvas">
            {railCollapsed && (
              <button
                onClick={() => setRailCollapsed(false)}
                aria-label="Expand sidebar"
                className="m-2 flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-muted hover:bg-hover hover:text-fg"
              >
                <PanelLeftClose size={14} className="rotate-180" />
              </button>
            )}
            <main className="min-h-0 flex-1 overflow-hidden">
              <motion.div
                key={`${pathname}-${dataVersion}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                {children}
              </motion.div>
            </main>
          </div>
        </div>

        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
      </div>
    </DashboardModeProvider>
  );
}