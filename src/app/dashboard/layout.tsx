"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuthUser, useAuthSignOut } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const auth = useAuthUser();
  const signOut = useAuthSignOut();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!auth.isLoaded) return;
    if (!auth.id) {
      router.replace("/auth?mode=login&next=/dashboard");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, [auth.isLoaded, auth.id, router]);

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
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {/* slim top bar */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-line bg-surface px-4">
        <Link href="/" aria-label="Vendrz home" className="shrink-0">
          <Logo className="[&_span:last-child]:text-[14px]" />
        </Link>
        <span className="text-muted/40">/</span>
        <span className="text-[13px] font-medium text-fg">Companies</span>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/audit"
            className="flex h-7 items-center rounded-md border border-line px-3 text-[12px] font-medium text-muted transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            + Contract audit
          </Link>
          <button
            onClick={signOut}
            aria-label="Log out"
            title="Log out"
            className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-white/5 hover:text-fg"
          >
            <LogOut size={14} />
          </button>
          <span className="flex size-6 items-center justify-center rounded-full border border-line bg-white/[0.06] text-[10px] font-semibold text-fg">
            {initials}
          </span>
        </div>
      </header>

      {/* single workspace surface */}
      <main className="min-h-0 flex-1 overflow-hidden bg-canvas">{children}</main>
    </div>
  );
}