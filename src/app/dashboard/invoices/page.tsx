"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel, SectionHeader, StatCard } from "@/components/ui/primitives";
import { money, formatDate, pct } from "@/lib/format";
import type { VendorProfile } from "@/lib/types";

export default function InvoicesPage() {
  const audit = getDemoAudit();
  const [filter, setFilter] = useState<"all" | "anomaly">("all");

  const vendors = useMemo(() => {
    const withBilling = audit.vendors.filter((v) => v.billing.anomalies.length > 0 || v.billing.variancePct !== 0);
    if (filter === "anomaly") return [...withBilling].sort((a, b) => Math.abs(b.billing.variancePct) - Math.abs(a.billing.variancePct));
    return [...withBilling].sort((a, b) => b.annualSpend - a.annualSpend);
  }, [audit.vendors, filter]);

  const totalImpact = audit.vendors.reduce(
    (a, v) => a + v.billing.anomalies.reduce((x, an) => x + an.impact, 0),
    0
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Invoices & billing intelligence"
        subtitle="Contracted amount vs invoice amount vs actual transaction amount"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Billing anomalies"
          value={audit.billingAnomalies}
          accent="text-red-400"
          sub={`across ${audit.vendors.filter((v) => v.billing.anomalies.length > 0).length} vendors`}
        />
        <StatCard
          label="Annualized impact"
          value={totalImpact}
          valueFormat={money}
          accent="text-red-400"
          sub="if discrepancies persist"
        />
        <StatCard
          label="Vendors over contract"
          value={audit.vendors.filter((v) => v.billing.variancePct > 5).length}
          sub="billing above contracted baseline"
        />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            filter === "all" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          All vendors
        </button>
        <button
          onClick={() => setFilter("anomaly")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            filter === "anomaly" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          Anomalies first
        </button>
      </div>

      <div className="space-y-4">
        {vendors.map((v, i) => (
          <VendorBillingCard key={v.id} v={v} index={i} />
        ))}
      </div>
    </div>
  );
}

function VendorBillingCard({ v, index }: { v: VendorProfile; index: number }) {
  const anomaly = Math.abs(v.billing.variancePct) > 5 || v.billing.anomalies.length > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: Math.min(0.15, index * 0.04), ease: [0.22, 1, 0.36, 1] }}
    >
      <Panel className={`overflow-hidden ${anomaly ? "border-red-500/25" : ""}`}>
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg">
            {v.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/vendors/${v.id}`} className="text-[14.5px] font-semibold text-fg hover:underline">
              {v.name}
            </Link>
            <p className="text-[11px] tracking-tight text-muted">
              Contracted {money(v.billing.expectedMonthly)}/mo · actual {money(v.billing.actualMonthly)}/mo
            </p>
          </div>
          <div className="text-right">
            <p className={`text-[16px] font-semibold tracking-tight ${v.billing.variancePct > 0 ? "text-red-400" : "text-fg"}`}>
              {pct(v.billing.variancePct)}
            </p>
            <p className="text-[10.5px] tracking-tight text-muted">variance</p>
          </div>
          {anomaly && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-red-400">
              <span className="flex size-3.5 items-center justify-center rounded-full bg-red-400/20 text-[9px] font-bold leading-none text-red-400">!</span>
              Billing anomaly
            </span>
          )}
        </div>

        {v.billing.anomalies.length > 0 && (
          <div className="space-y-2 border-t border-line bg-red-500/[0.03] px-5 py-3.5">
            {v.billing.anomalies.map((a) => (
              <div key={a.id} className="flex items-start gap-2.5">
                <span className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-full bg-red-400/20 text-[9px] font-bold leading-none text-red-400">!</span>
                <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-muted">{a.detail}</p>
                <span className="shrink-0 text-[12px] font-medium text-red-400">
                  {money(a.impact)}/yr
                </span>
              </div>
            ))}
          </div>
        )}

        {v.invoices.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
            {[...v.invoices].reverse().slice(0, 3).map((inv) => (
              <span
                key={inv.id}
                className={`rounded-lg border px-2.5 py-1 text-[11px] tracking-tight ${
                  inv.amount !== inv.contractedAmount
                    ? "border-red-500/25 bg-red-500/[0.06] text-red-300"
                    : "border-line bg-white/[0.03] text-muted"
                }`}
              >
                {inv.number} · {formatDate(inv.date)} · {money(inv.amount)}
              </span>
            ))}
          </div>
        )}
      </Panel>
    </motion.div>
  );
}
