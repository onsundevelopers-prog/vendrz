"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel, SectionHeader, ActionStatusBadge } from "@/components/ui/primitives";
import { AnimatedStat } from "@/components/ui/RollingNumber";
import { money, moneyShort } from "@/lib/format";
import type { OpportunityType, SavingsOpportunity } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

const TYPE_LABELS: Record<OpportunityType, string> = {
  unused_seats: "Unused seats",
  duplicate_tools: "Duplicate tools",
  contract_optimization: "Contract optimization",
  price_increase: "Price increase",
  cancellation: "Cancellation",
  billing_discrepancy: "Billing discrepancy",
  usage_optimization: "Usage optimization",
  license_reduction: "License reduction",
};

export default function SavingsPage() {
  const audit = getDemoAudit();
  const [typeFilter, setTypeFilter] = useState<OpportunityType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const opportunities = useMemo(() => {
    let list = audit.opportunities.filter((o) => o.status !== "dismissed");
    if (typeFilter !== "all") list = list.filter((o) => o.type === typeFilter);
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    return [...list].sort((a, b) => b.estimatedSavings - a.estimatedSavings);
  }, [audit.opportunities, typeFilter, statusFilter]);

  // breakdown by type
  const byType = useMemo(() => {
    const map = new Map<OpportunityType, number>();
    for (const o of audit.opportunities) {
      if (o.status === "dismissed") continue;
      map.set(o.type, (map.get(o.type) ?? 0) + o.estimatedSavings);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [audit.opportunities]);

  const funnel = [
    { label: "Potential savings", value: audit.savings.potential, color: "#e4e4e7" },
    { label: "Actioned", value: audit.savings.actioned, color: "#a1a1aa" },
    { label: "Confirmed savings", value: audit.savings.confirmed, color: "#71717a" },
  ];
  const maxFunnel = Math.max(audit.savings.potential, 1);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Savings engine"
        subtitle="Where the money is - and where you can get it back"
      />

      {/* tracking funnel */}
      <div className="grid gap-4 sm:grid-cols-3">
        {funnel.map((f, i) => (
          <Panel key={f.label} delay={i * 0.06} className="p-5">
            <div className="flex items-center gap-2 text-muted">
              <span className="size-1.5 rounded-full" style={{ background: f.color }} />
              <span className="text-[11px] font-medium uppercase tracking-[0.1em]">
                {f.label}
              </span>
            </div>
            <p className="mt-2.5 text-[30px] font-semibold leading-none tracking-tight text-fg">
              <AnimatedStat value={f.value} format={money} duration={1200 + i * 150} />
              <span className="ml-1 text-sm font-normal text-muted/60">/yr</span>
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: f.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(f.value / maxFunnel) * 100}%` }}
                transition={{ duration: 0.9, delay: 0.3 + i * 0.1, ease }}
              />
            </div>
            {i === 0 && (
              <p className="mt-2 text-[10.5px] tracking-tight text-muted">
                All identified opportunities
              </p>
            )}
            {i === 1 && (
              <p className="mt-2 text-[10.5px] tracking-tight text-muted">
                Open work in progress
              </p>
            )}
            {i === 2 && (
              <p className="mt-2 text-[10.5px] tracking-tight text-muted">
                Verified against invoices
              </p>
            )}
          </Panel>
        ))}
      </div>

      {/* by type */}
      <Panel delay={0.15} className="p-5">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Opportunities by type</h3>
        <div className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
          {byType.map(([type, amount]) => (
            <div key={type}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-muted">{TYPE_LABELS[type]}</span>
                <span className="text-[13px] font-medium text-fg">{moneyShort(amount)}</span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full bg-zinc-500/80"
                  initial={{ width: 0 }}
                  animate={{ width: `${(amount / audit.savings.potential) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.2, ease }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] tracking-tight text-muted/70">
          Savings engine components: license reduction + unused seats + duplicate tools + contract
          optimization + price-increase caps + cancellations + billing discrepancies + usage optimization.
        </p>
      </Panel>

      {/* filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setTypeFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            typeFilter === "all" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          All types
        </button>
        {byType.slice(0, 7).map(([type]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              typeFilter === type ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
            }`}
          >
            {TYPE_LABELS[type]}
          </button>
        ))}
        <span className="mx-2 h-5 w-px bg-line" />
        {["all", "open", "in_review", "actioned", "savings_confirmed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              statusFilter === s ? "bg-white/[0.12] text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {s === "all" ? "Any status" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* opportunity list */}
      <div className="space-y-3.5">
        {opportunities.map((o, i) => (
          <OpportunityCard key={o.id} o={o} index={i} />
        ))}
        {opportunities.length === 0 && (
          <Panel className="p-10 text-center">
            <p className="text-[13px] tracking-tight text-muted">No opportunities match this filter.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function OpportunityCard({ o, index }: { o: SavingsOpportunity; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(0.12, index * 0.03), ease }}
    >
      <Panel className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg">
              {o.vendorName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/dashboard/vendors/${o.vendorId}`}
                  className="text-[15px] font-semibold tracking-[-0.01em] text-fg hover:underline"
                >
                  {o.vendorName}
                </Link>
                <span className="rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[10.5px] uppercase tracking-wide text-muted">
                  {TYPE_LABELS[o.type]}
                </span>
                <ActionStatusBadge status={o.status} />
              </div>
              <p className="mt-0.5 text-[13px] font-medium text-fg/90">{o.title}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-semibold tracking-tight text-fg">
              {money(o.estimatedSavings)}
            </p>
            <p className="text-[10.5px] tracking-tight text-muted">/yr potential</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-white/[0.03] p-3.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">What we found</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fg/90">{o.what}</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[0.03] p-3.5">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Why it matters</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{o.why}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.03] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-zinc-400" />
            <div>
              <p className="text-[10px] uppercase tracking-[0.12em] text-muted">Recommended action</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-fg">{o.recommendedAction}</p>
            </div>
          </div>
          <span className="shrink-0 text-[11px] tracking-tight text-muted">{o.basis}</span>
        </div>
      </Panel>
    </motion.div>
  );
}
