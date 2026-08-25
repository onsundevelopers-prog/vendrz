"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  Bell,
  Bookmark,
  Building2,
  Cable,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronsUpDown,
  CircleHelp,
  Command,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  PiggyBank,
  Plus,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useAuthUser, useAuthSignOut } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { money } from "@/lib/format";
import { getContracts, getDemoAudit } from "@/lib/store";
import { CommandPalette, type PaletteItem } from "@/components/ui/CommandPalette";
import { MenuPop, useDismiss } from "@/components/ui/menu";

type IconType = typeof LayoutDashboard;

interface NavItem {
  href: string;
  label: string;
  icon: IconType;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Workspace",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/risks", label: "Risks", icon: ShieldAlert },
      { href: "/dashboard/renewals", label: "Renewals", icon: CalendarClock },
      { href: "/dashboard/alerts", label: "Alerts", icon: Bell },
    ],
  },
  {
    section: "Contracts",
    items: [
      { href: "/dashboard/contracts", label: "Contracts", icon: FileText },
      { href: "/dashboard/vendors", label: "Vendors", icon: Building2 },
      { href: "/dashboard/savings", label: "Savings", icon: PiggyBank },
      { href: "/dashboard/actions", label: "Actions", icon: ListChecks },
    ],
  },
  {
    section: "Intelligence",
    items: [
      { href: "/dashboard/agent", label: "Agent", icon: Sparkles },
      { href: "/dashboard/activity", label: "Activity", icon: Activity },
      { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    section: "Data",
    items: [
      { href: "/dashboard/spend", label: "Spend", icon: TrendingUp },
      { href: "/dashboard/invoices", label: "Invoices", icon: Receipt },
      { href: "/dashboard/usage", label: "Usage", icon: Users },
      { href: "/dashboard/gmail", label: "Gmail", icon: Mail },
      { href: "/dashboard/integrations", label: "Integrations", icon: Cable },
    ],
  },
  {
    section: "System",
    items: [{ href: "/dashboard/settings", label: "Settings", icon: Settings }],
  },
];

const ALL_PAGES = NAV.flatMap((g) => g.items);

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
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("vt.sidebar.collapsed") === "1";
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  const audit = getDemoAudit();
  const contracts = getContracts(auth.id ?? "");
  const unreadAlerts = audit.alerts.filter((a) => !a.read).length;

  const workspaceRef = useRef<HTMLButtonElement>(null);
  const userRef = useRef<HTMLButtonElement>(null);
  const helpRef = useRef<HTMLButtonElement>(null);
  const notifRef = useRef<HTMLButtonElement>(null);

  useDismiss(notifOpen, () => setNotifOpen(false), notifRef);
  useDismiss(workspaceOpen, () => setWorkspaceOpen(false), workspaceRef);
  useDismiss(userOpen, () => setUserOpen(false), userRef);
  useDismiss(helpOpen, () => setHelpOpen(false), helpRef);

  /* ---------------- command palette items ---------------- */
  const paletteItems: PaletteItem[] = useMemo(() => {
    const pageItems: PaletteItem[] = ALL_PAGES.map((p) => ({
      id: `page-${p.href}`,
      group: "Navigate",
      label: p.label,
      keywords: p.href,
      icon: <p.icon size={14} className="text-muted" />,
      onSelect: () => router.push(p.href),
    }));
    const vendorItems: PaletteItem[] = audit.vendors.slice(0, 40).map((v) => ({
      id: `v-${v.id}`,
      group: "Vendors",
      label: v.name,
      description: `${money(v.annualSpend)}/yr`,
      keywords: `${v.category} ${v.owner}`,
      icon: <Building2 size={14} className="text-muted" />,
      onSelect: () => router.push(`/dashboard/vendors/${v.id}`),
    }));
    const contractItems: PaletteItem[] = contracts.slice(0, 20).map((c) => ({
      id: `c-${c.id}`,
      group: "Contracts",
      label: `${c.vendorName} · ${c.linkedDocument}`,
      keywords: c.category,
      icon: <FileText size={14} className="text-muted" />,
      onSelect: () => router.push(`/dashboard/contracts`),
    }));
    const actionItems: PaletteItem[] = [
      {
        id: "act-audit",
        group: "Actions",
        label: "Run a new audit",
        keywords: "scan upload contract",
        icon: <Zap size={14} className="text-emerald-400" />,
        onSelect: () => router.push("/audit"),
      },
      {
        id: "act-agent",
        group: "Actions",
        label: "Ask the agent",
        keywords: "ai assistant",
        icon: <Sparkles size={14} className="text-emerald-400" />,
        onSelect: () => router.push("/dashboard/agent"),
      },
      {
        id: "act-gmail",
        group: "Actions",
        label: "Connect Gmail",
        keywords: "email inbox discovery",
        icon: <Mail size={14} className="text-muted" />,
        onSelect: () => router.push("/dashboard/gmail"),
      },
    ];
    return [...actionItems, ...pageItems, ...vendorItems, ...contractItems];
  }, [audit.vendors, contracts, router]);

  // Close mobile nav + inspector on navigation.
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
    setPaletteOpen(false);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      window.localStorage.setItem("vt.sidebar.collapsed", next ? "1" : "0");
      return next;
    });
  };

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

  /* ---------------- sidebar ---------------- */
  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-3">
        <Link href="/" aria-label="Vendrz" className="min-w-0 flex-1 pl-1.5">
          <Logo className="[&_span:last-child]:text-[14px]" />
        </Link>
      </div>

      <div className="px-2 pb-2">
        <Link
          href="/audit"
          className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-white text-[12.5px] font-semibold text-black transition-opacity hover:opacity-90"
        >
          <Plus size={14} />
          {!collapsed && "Run new audit"}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto pb-3">
        {NAV.map((group) => (
          <div key={group.section}>
            {!collapsed && <div className="nav-section">{group.section}</div>}
            {group.items.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              const showBadge = item.href === "/dashboard/alerts" && unreadAlerts > 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`nav-item ${active ? "active" : ""} ${
                    collapsed ? "justify-center !px-0" : ""
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && showBadge && (
                    <span className="ml-auto flex size-4.5 items-center justify-center rounded-full bg-red-500/20 text-[9.5px] font-semibold text-red-400">
                      {unreadAlerts > 9 ? "9+" : unreadAlerts}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[12px] font-semibold tracking-tight text-emerald-300">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-fg">{auth.name}</p>
              <p className="truncate text-[11px] tracking-tight text-muted">{auth.email}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={signOut}
              aria-label="Log out"
              title="Log out"
              className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const currentLabel =
    ALL_PAGES.find((p) =>
      p.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(p.href)
    )?.label ?? "Overview";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {/* ============================== top bar ============================== */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
        <button
          onClick={toggleCollapsed}
          className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
        <button
          onClick={() => setMobileOpen(true)}
          className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-white/5 lg:hidden"
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>

        {/* workspace selector */}
        <button
          ref={(el) => {
            workspaceRef.current = el;
          }}
          onClick={() => setWorkspaceOpen((o) => !o)}
          className="ml-1 flex h-8 items-center gap-2 rounded-md px-2 text-[12.5px] font-medium text-fg hover:bg-white/5"
        >
          <span className="flex size-5 items-center justify-center rounded bg-emerald-500/20 text-[9px] font-bold text-emerald-300">
            A
          </span>
          <span className="hidden sm:inline">Acme Technologies</span>
          {isDemo && (
            <span className="chip chip-green !h-[18px] !text-[9.5px] uppercase tracking-wide">
              demo
            </span>
          )}
          <ChevronDown size={13} className="text-muted" />
        </button>
        <MenuPop
          open={workspaceOpen}
          onClose={() => setWorkspaceOpen(false)}
          anchor={workspaceRef}
          items={[
            { label: "Workspace", kind: "label" },
            {
              label: "Acme Technologies",
              icon: <Check size={13} className="text-emerald-400" />,
              onSelect: () => undefined,
            },
            { separator: true },
            {
              label: "All workspaces",
              icon: <ChevronsUpDown size={13} />,
              onSelect: () => undefined,
            },
          ]}
        />

        <div className="toolbar-sep mx-1 hidden sm:block" />

        <button
          onClick={() => setPaletteOpen(true)}
          className="hidden h-8 w-72 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 text-[12px] text-muted transition-colors hover:border-white/20 hover:text-fg sm:flex"
        >
          <Search size={13} />
          <span>Search vendors, contracts…</span>
          <span className="kbd ml-auto flex items-center gap-0.5">
            <Command size={10} /> K
          </span>
        </button>

        <div className="ml-auto flex items-center gap-1">
          {/* help */}
          <button
            ref={(el) => {
              helpRef.current = el;
            }}
            onClick={() => setHelpOpen((o) => !o)}
            className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
            aria-label="Help"
            title="Help"
          >
            <CircleHelp size={16} />
          </button>
          <MenuPop
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            anchor={helpRef}
            align="end"
            items={[
              { label: "Help", kind: "label" },
              { label: "Keyboard shortcuts", icon: <Command size={13} />, kbd: "⌘K", onSelect: () => setPaletteOpen(true) },
              { label: "How the analysis works", icon: <Bookmark size={13} />, onSelect: () => router.push("/#how-it-works") },
              { label: "FAQ", icon: <CircleHelp size={13} />, onSelect: () => router.push("/#faq") },
            ]}
          />

          {/* notifications */}
          <button
            ref={(el) => {
              notifRef.current = el;
            }}
            onClick={() => setNotifOpen((o) => !o)}
            className="relative flex size-8 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={16} />
            {unreadAlerts > 0 && (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-400" />
            )}
          </button>
          <MenuPop
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            anchor={notifRef}
            align="end"
            items={[
              { label: `Notifications · ${unreadAlerts} unread`, kind: "label" },
              ...audit.alerts.slice(0, 6).map((a) => ({
                label: a.title,
                icon: (
                  <span
                    className={`status-dot ${
                      a.severity === "critical" || a.severity === "high"
                        ? "bg-red-400"
                        : a.severity === "medium"
                          ? "bg-amber-400"
                          : "bg-zinc-500"
                    }`}
                  />
                ),
                onSelect: () =>
                  router.push(a.vendorId ? `/dashboard/vendors/${a.vendorId}` : "/dashboard/alerts"),
              })),
              { separator: true },
              { label: "View all alerts", onSelect: () => router.push("/dashboard/alerts") },
            ]}
          />

          <div className="toolbar-sep mx-1" />

          {/* settings */}
          <Link
            href="/dashboard/settings"
            className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={16} />
          </Link>

          {/* user */}
          <button
            ref={(el) => {
              userRef.current = el;
            }}
            onClick={() => setUserOpen((o) => !o)}
            className="ml-0.5 flex h-8 items-center gap-2 rounded-md px-1.5 hover:bg-white/5"
            aria-label="Account menu"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-semibold text-emerald-300">
              {initials}
            </span>
            <span className="hidden max-w-[140px] truncate text-[12px] font-medium text-fg xl:inline">
              {auth.name}
            </span>
            <ChevronDown size={12} className="text-muted" />
          </button>
          <MenuPop
            open={userOpen}
            onClose={() => setUserOpen(false)}
            anchor={userRef}
            align="end"
            items={[
              { label: auth.name ?? "Account", kind: "label" },
              {
                label: auth.email,
                disabled: true,
              },
              { separator: true },
              { label: "Settings", icon: <Settings size={13} />, onSelect: () => router.push("/dashboard/settings") },
              { label: "Run a new audit", icon: <Zap size={13} />, onSelect: () => router.push("/audit") },
              { separator: true },
              { label: "Log out", icon: <LogOut size={13} />, danger: true, onSelect: signOut },
            ]}
          />
        </div>
      </header>

      {/* ============================== body ============================== */}
      <div className="flex min-h-0 flex-1">
        {/* desktop sidebar */}
        <aside
          className={`hidden shrink-0 border-r border-line bg-surface transition-[width] duration-200 lg:block ${
            collapsed ? "w-[52px]" : "w-60"
          }`}
        >
          {sidebarInner}
        </aside>

        {/* mobile sidebar */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface shadow-glow">
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="absolute right-2 top-3 z-10 flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/5"
              >
                <X size={15} />
              </button>
              {sidebarInner}
            </aside>
          </div>
        )}

        {/* main */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1400px] px-5 py-5 lg:px-6">{children}</div>
        </main>
      </div>

      {/* ============================== status bar ============================== */}
      <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-surface px-3 text-[10.5px] tracking-tight text-muted/70">
        <span className="flex items-center gap-1.5">
          <span className="status-dot bg-emerald-400" />
          {audit.vendorCount} vendors under watch
        </span>
        <span className="hidden sm:inline">{contracts.length} contracts · {money(audit.totalAnnualSpend)}/yr</span>
        <span className="ml-auto hidden md:inline">{currentLabel}</span>
        <span className="text-muted/50">read-only · demo data</span>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
    </div>
  );
}
