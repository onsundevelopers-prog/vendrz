"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { getDemoAudit, getGmailConnection } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { Panel, SectionHeader } from "@/components/ui/primitives";
import type { DataSource } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

export default function IntegrationsPage() {
  const audit = getDemoAudit();
  const auth = useAuthUser();
  const gmail = getGmailConnection(auth.id ?? "");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Integrations"
        subtitle="Connect your data. Read-only, always — we cannot move money."
      />

      {/* trust banner */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
        className="flex flex-wrap items-center gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] px-5 py-4"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400">VZ</span>
        </div>
        <p className="min-w-0 flex-1 text-[13.5px] leading-relaxed text-muted">
          Vendrz can <strong className="text-fg">analyze</strong> your financial data. It
          cannot move money, make payments, or modify your accounts. Every connection uses secure,
          read-only OAuth-style authorization.
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[12px] tracking-tight text-emerald-300">
          <span className="size-1 rounded-full bg-emerald-400" /> Read-only
        </span>
      </motion.div>

      {/* sources */}
      <div className="space-y-3">
        {audit.dataSources.map((s, i) => (
          <DataSourceCard key={s.id} s={s} index={i} />
        ))}
      </div>

      {/* gmail card */}
      <Panel delay={0.2} className="p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/10">
            <span className="text-[13px] font-semibold tracking-tight text-muted">G</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-fg">Gmail contract discovery</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
              {gmail
                ? "Connected — discover contract-looking emails and attachments, then choose what to import."
                : "Optional, read-only discovery of contract-looking emails and attachments. Nothing imports without your say-so."}
            </p>
          </div>
          {gmail ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Connected
            </span>
          ) : (
            <Link
              href="/dashboard/gmail"
              className="inline-flex h-9 items-center rounded-full bg-white px-4 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
            >
              Connect Gmail
            </Link>
          )}
        </div>
      </Panel>

      <p className="text-[11.5px] leading-relaxed tracking-tight text-muted/70">
        Demo environment: financial and expense feeds are simulated with realistic sample data
        (Acme Technologies) behind a clean integration abstraction. Real providers plug into the
        same pipeline without UI changes.
      </p>
    </div>
  );
}

function DataSourceCard({ s, index }: { s: DataSource; index: number }) {
  const tag =
    s.kind === "financial"
      ? "FIN"
      : s.kind === "expense"
        ? "EXP"
        : s.kind === "invoice"
          ? "INV"
          : s.kind === "contract"
            ? "CTR"
            : "VND";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + index * 0.04, ease }}
    >
      <Panel className="flex flex-wrap items-center gap-4 p-4">
        <div
          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ring-1 ${
            s.status === "connected"
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              : s.status === "demo"
                ? "border-line bg-white/[0.05] text-fg ring-white/10"
                : "border-line bg-white/[0.04] text-muted ring-white/10"
          }`}
        >
          <span className="text-[10px] font-semibold uppercase tracking-wide">{tag}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[14.5px] font-semibold text-fg">{s.name}</p>
            <span className="rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted">
              {s.kind}
            </span>
          </div>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{s.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          {s.readOnly && (
            <span className="text-[11px] tracking-tight text-muted/70">read-only</span>
          )}
          {s.status === "connected" || s.status === "demo" ? (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium ${
                s.status === "connected"
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                  : "border-white/15 bg-white/[0.05] text-muted"
              }`}
            >
              <span className={`size-1.5 rounded-full ${s.status === "connected" ? "bg-emerald-400" : "bg-zinc-500"}`} />
              {s.status === "connected" ? "Connected" : "Demo data"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-[12px] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-zinc-500" /> Available
            </span>
          )}
        </div>
      </Panel>
    </motion.div>
  );
}
