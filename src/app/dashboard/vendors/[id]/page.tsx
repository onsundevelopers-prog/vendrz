"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel, HealthScore, SeverityBadge, ActionStatusBadge } from "@/components/ui/primitives";
import { BarChart, ProgressBar } from "@/components/ui/charts";
import { money, pct, formatDate, daysUntil } from "@/lib/format";
import type { AlertRecord, SavingsOpportunity, VendorProfile } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

type Tab = "overview" | "spend" | "contract" | "invoices" | "usage" | "savings" | "activity";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "spend", label: "Spend" },
  { id: "contract", label: "Contract" },
  { id: "invoices", label: "Invoices" },
  { id: "usage", label: "Usage" },
  { id: "savings", label: "Savings" },
  { id: "activity", label: "Activity" },
];

export default function VendorPage() {
  const params = useParams<{ id: string }>();
  const audit = getDemoAudit();
  const vendor = useMemo(
    () => audit.vendors.find((v) => v.id === params.id) ?? null,
    [audit.vendors, params.id]
  );
  const [tab, setTab] = useState<Tab>("overview");

  if (!vendor) {
    return (
      <div className="py-20 text-center">
        <p className="text-[15px] text-muted">Vendor not found.</p>
        <Link href="/dashboard/vendors" className="mt-2 inline-block text-[13px] tracking-tight text-muted underline underline-offset-4 hover:text-fg">
          Back to vendors
        </Link>
      </div>
    );
  }

  const opportunities = audit.opportunities.filter((o) => o.vendorId === vendor.id);
  const vendorAlerts = audit.alerts.filter((a) => a.vendorId === vendor.id);
  const days = daysUntil(vendor.renewalDate);
  const trendUp = vendor.spendTrendPct >= 0;
  const statusLabel =
    vendor.contractStatus === "at_risk"
      ? "At risk"
      : vendor.contractStatus === "expiring_soon"
        ? "Expiring soon"
        : "Active";
  const statusColor =
    vendor.contractStatus === "at_risk"
      ? "border-red-500/30 bg-red-500/10 text-red-400"
      : vendor.contractStatus === "expiring_soon"
        ? "border-white/15 bg-white/[0.06] text-fg"
        : "border-white/15 bg-white/[0.06] text-fg";

  const metrics = [
    { label: "Annual spend", value: money(vendor.annualSpend), note: `${vendor.category}` },
    { label: "Monthly average", value: money(vendor.monthlyAvg), note: "trailing 12 months" },
    {
      label: "Spend change",
      value: pct(vendor.spendTrendPct),
      note: "vs prior year",
      accent: trendUp ? "text-red-400" : "text-fg",
    },
    {
      label: "Potential savings",
      value: money(vendor.potentialSavings),
      note: "estimates · not guaranteed",
    },
    {
      label: "Renewal date",
      value: vendor.renewalDate ? formatDate(vendor.renewalDate) : "Rolling",
      note: vendor.risk ? `${days}d away · auto-${vendor.autoRenew ? "renews" : "renewal"}` : "no fixed term",
    },
  ];

  return (
    <div className="space-y-6">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease }}
      >
        <Link href="/dashboard/vendors" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium tracking-tight text-muted hover:text-fg">
          <span aria-hidden="true" className="text-[13px]">←</span> All vendors
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl border border-line bg-surface text-lg font-semibold text-fg">
              {vendor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">
                  {vendor.name}
                </h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-[12.5px] tracking-tight text-muted">
                {vendor.category} · {vendor.description}
              </p>
            </div>
          </div>
          <HealthScore score={vendor.healthScore} size="lg" />
        </div>
      </motion.div>

      {/* metric row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((m, i) => (
          <Panel key={m.label} delay={0.05 + i * 0.05} className="p-4">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">{m.label}</p>
            <p className={`mt-2 text-[19px] font-semibold tracking-tight ${m.accent ?? "text-fg"}`}>
              {m.value}
            </p>
            <p className="mt-1 text-[10.5px] tracking-tight text-muted">{m.note}</p>
          </Panel>
        ))}
      </div>

      {/* tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
              tab === t.id ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* tab content */}
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
      >
        {tab === "overview" && (
          <OverviewTab
            vendor={vendor}
            opportunities={opportunities}
            alerts={vendorAlerts}
            onOpenTab={setTab}
          />
        )}
        {tab === "spend" && <SpendTab vendor={vendor} />}
        {tab === "contract" && <ContractTab vendor={vendor} />}
        {tab === "invoices" && <InvoicesTab vendor={vendor} />}
        {tab === "usage" && <UsageTab vendor={vendor} />}
        {tab === "savings" && <SavingsTab opportunities={opportunities} />}
        {tab === "activity" && <ActivityTab vendor={vendor} alerts={vendorAlerts} opportunities={opportunities} />}
      </motion.div>
    </div>
  );
}

/* ------------------------- overview ------------------------- */

function OverviewTab({
  vendor: v,
  opportunities,
  alerts,
  onOpenTab,
}: {
  vendor: VendorProfile;
  opportunities: SavingsOpportunity[];
  alerts: AlertRecord[];
  onOpenTab: (t: Tab) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Summary</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed tracking-[-0.01em] text-muted">
            {v.name} accounts for <span className="text-fg">{money(v.annualSpend)}</span> of
            annual vendor spend ({v.category.toLowerCase()} category), with a{" "}
            <span className="text-fg">{pct(v.spendTrendPct)}</span>{" "}
            year-over-year change.
            {v.usage ? (
              <>
                {" "}
                {v.usage.activeUsers} of {v.usage.seatsPurchased} seats are active (
                {v.usage.utilizationPct.toFixed(0)}% utilization) -{" "}
                <span className="text-fg">{money(v.usage.unusedSeatCost)}/yr</span> in
                unused-seat spend.
              </>
            ) : (
              " This is a usage-based vendor billed on consumption."
            )}
          </p>
          {v.billing.variancePct !== 0 && (
            <p className="mt-3 border border-red-500/25 bg-red-500/[0.05] px-3 py-2 text-[12.5px] leading-relaxed text-red-300/90">
              Billing runs {pct(v.billing.variancePct)} vs the contracted amount -
              {v.billing.anomalies.length > 0 ? ` ${v.billing.anomalies[0].detail.toLowerCase()}` : " worth investigating."}
            </p>
          )}
        </Panel>

        {v.duplicates.length > 0 && (
          <Panel className="p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
              <span className="size-1.5 rounded-full bg-zinc-400" /> Overlapping tools
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              {v.name} overlaps with {v.duplicates.join(", ")} - potentially redundant spend in the
              same category.
            </p>
          </Panel>
        )}

        {alerts.length > 0 && (
          <Panel className="overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-5 py-4">
              <span className="size-1.5 rounded-full bg-zinc-400" />
              <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Active alerts</h3>
            </div>
            <div className="divide-y divide-line">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                  <SeverityBadge severity={a.severity} />
                  <p className="min-w-0 flex-1 truncate text-[13.5px] text-fg">{a.title}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>

      <div className="space-y-5">
        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Opportunities</h3>
          {opportunities.length > 0 ? (
            <div className="mt-3 space-y-2.5">
              {opportunities.slice(0, 3).map((o) => (
                <div key={o.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-fg">{o.title}</p>
                    <p className="shrink-0 text-[13px] font-semibold text-fg">
                      {money(o.estimatedSavings)}
                    </p>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{o.what}</p>
                </div>
              ))}
              <button
                onClick={() => onOpenTab("savings")}
                className="inline-block text-[12px] tracking-tight text-muted hover:text-fg"
              >
                View all {opportunities.length} →
              </button>
            </div>
          ) : (
            <p className="mt-3 text-[12.5px] tracking-tight text-muted">No opportunities detected.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------- spend ------------------------- */

function SpendTab({ vendor: v }: { vendor: VendorProfile }) {
  const data = v.monthlySeries.map((val: number, i: number) => ({
    label: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"][i],
    value: val,
  }));
  return (
    <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
      <Panel className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Monthly spend</h3>
            <p className="mt-0.5 text-[11.5px] tracking-tight text-muted">
              Trailing 12 months · {money(v.annualSpend)}/yr
            </p>
          </div>
          <p className="text-[13px] font-semibold text-fg">{money(v.monthlyAvg)}/mo</p>
        </div>
        <div className="mt-4">
          <BarChart data={data} height={180} />
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel className="p-5">
          <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Spend analysis</h3>
          <div className="mt-4 space-y-3.5">
            <Row label="Annual spend" value={money(v.annualSpend)} />
            <Row label="Monthly average" value={money(v.monthlyAvg)} />
            <Row
              label="YoY change"
              value={pct(v.spendTrendPct)}
              accent={v.spendTrendPct >= 0 ? "text-red-400" : "text-fg"}
            />
            <Row label="Prior year" value={money(v.annualSpend / (1 + v.spendTrendPct / 100))} />
            <Row label="Category" value={v.category} />
            <Row
              label="Contracted baseline"
              value={money(v.billing.expectedMonthly) + "/mo"}
              note={`actual ${money(v.billing.actualMonthly)}/mo`}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, note, accent = "text-fg" }: { label: string; value: string; note?: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11.5px] uppercase tracking-[0.08em] text-muted">{label}</span>
      <div className="text-right">
        <p className={`text-[14px] font-medium ${accent}`}>{value}</p>
        {note && <p className="text-[10.5px] tracking-tight text-muted/70">{note}</p>}
      </div>
    </div>
  );
}

/* ------------------------- contract ------------------------- */

function ContractTab({ vendor: v }: { vendor: VendorProfile }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <Panel className="overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
            <span className="size-1.5 rounded-full bg-zinc-500" /> Contract terms
          </h3>
        </div>
        <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <Row label="Contract value" value={money(v.contractValue)} />
          <Row label="Start date" value={formatDate(v.startDate)} />
          <Row label="Renewal date" value={v.renewalDate ? formatDate(v.renewalDate) : "Rolling / no term"} />
          <Row label="Cancellation deadline" value={v.cancellationDeadline ? formatDate(v.cancellationDeadline) : "-"} />
          <Row label="Auto-renewal" value={v.autoRenew ? "Enabled" : "Disabled"} note={v.autoRenew ? "no-action = renewed" : "manual renewal"} />
          <Row label="Price escalation" value={v.priceEscalationRate ? `${v.priceEscalationRate}%/yr` : "None found"} note={v.priceEscalationRate && v.priceEscalationRate > 5 ? "uncapped" : undefined} />
        </div>
      </Panel>

      <Panel className="p-5">          <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
            <span className="size-1.5 rounded-full bg-zinc-400" /> Renewal risk
          </h3>
        {v.risk ? (
          <div className="mt-4 space-y-3.5">
            <SeverityBadge severity={v.risk.level} />
            <Row label="Renewal in" value={`${v.risk.daysToRenewal} days`} />
            <Row label="Cancel by" value={`${v.risk.daysToDeadline} days`} />
            <Row label="Notice period" value={`${v.risk.noticePeriodDays} days`} />
            <Row label="Expected increase" value={`${v.risk.expectedIncreasePct}%`} />
            <Row
              label="Renewal cost"
              value={money(v.risk.potentialRenewalCost)}
              accent="text-red-400"
              note="annualized at renewal"
            />
          </div>
        ) : (
          <p className="mt-4 text-[12.5px] tracking-tight text-muted">
            {v.renewalDate ? "No imminent renewal risk." : "No fixed contract term - rolling agreement."}
          </p>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------- invoices ------------------------- */

function InvoicesTab({ vendor: v }: { vendor: VendorProfile }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Recent invoices</h3>
        <p className="text-[11.5px] tracking-tight text-muted">
          Contracted {money(v.billing.expectedMonthly)}/mo · actual {money(v.billing.actualMonthly)}/mo
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Invoice</th>
              <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Date</th>
              <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Contracted</th>
              <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Billed</th>
              <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Variance</th>
              <th className="px-5 py-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">              {[...v.invoices].reverse().map((inv) => {
              const variance = inv.amount - inv.contractedAmount;
              return (
                <tr key={inv.id} className="transition-colors hover:bg-white/[0.03]">
                  <td className="px-5 py-3.5 text-[13px] font-medium text-fg">{inv.number}</td>
                  <td className="px-5 py-3.5 text-[12.5px] text-muted">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3.5 text-[12.5px] text-muted">{money(inv.contractedAmount)}</td>
                  <td className="px-5 py-3.5 text-[13px] font-medium text-fg">{money(inv.amount)}</td>
                  <td className="px-5 py-3.5">
                    {variance !== 0 ? (
                      <span className={`text-[12.5px] font-medium ${variance > 0 ? "text-red-400" : "text-fg"}`}>
                        {pct(Math.round((variance / Math.max(1, inv.contractedAmount)) * 100))}
                      </span>
                    ) : (
                      <span className="text-[12px] text-muted/60">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-wide ${
                      inv.status === "paid"
                        ? "border-white/10 bg-white/[0.05] text-muted"
                        : inv.status === "pending"
                          ? "border-white/15 bg-white/[0.06] text-fg"
                          : "border-red-500/25 bg-red-500/10 text-red-400"
                    }`}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/* ------------------------- usage ------------------------- */

function UsageTab({ vendor: v }: { vendor: VendorProfile }) {
  if (!v.usage) {
    return (
      <Panel className="p-8 text-center">
        <p className="mt-3 text-[15px] font-medium text-fg">Usage-based vendor</p>
        <p className="mt-1 text-[12.5px] tracking-tight text-muted">
          No seat data - billed on consumption. Connect a vendor API for usage-level detail.
        </p>
      </Panel>
    );
  }
  const u = v.usage;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel className="p-5">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Seat utilization</h3>
        <div className="mt-5 flex items-end justify-between">
          <div>
            <p className="text-[40px] font-semibold leading-none tracking-tight text-fg">
              {u.utilizationPct.toFixed(1)}%
            </p>
            <p className="mt-1.5 text-[11.5px] tracking-tight text-muted">
              {u.activeUsers} active · {u.inactiveUsers} inactive · {u.seatsPurchased} purchased
            </p>
          </div>
        </div>
        <ProgressBar value={u.utilizationPct} className="mt-4 h-2.5" />
        <p className="mt-2 text-[11px] tracking-tight text-muted">
          {u.utilizationPct >= 80
            ? "Healthy utilization."
            : u.utilizationPct >= 55
              ? "Moderate utilization - consider right-sizing."
              : "Low utilization - cancellation or downgrade candidate."}
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel className="p-4">
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Seats purchased</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight text-fg">{u.seatsPurchased}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Active seats</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight text-fg">{u.activeUsers}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Inactive seats</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight text-fg">{u.inactiveUsers}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">Cost / active user</p>
          <p className="mt-2 text-[24px] font-semibold tracking-tight text-fg">{money(u.costPerActiveUser)}<span className="text-xs text-muted">/mo</span></p>
        </Panel>
        <Panel className="col-span-2 border-red-500/25 bg-red-500/[0.04] p-4">
          <p className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.1em] text-red-300">
            <span className="size-1.5 rounded-full bg-red-400" /> Unused-seat cost
          </p>
          <p className="mt-2 text-[26px] font-semibold tracking-tight text-red-400">
            {money(u.unusedSeatCost)}<span className="text-sm text-red-400/60">/yr</span>
          </p>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------- savings ------------------------- */

function SavingsTab({ opportunities }: { opportunities: SavingsOpportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <Panel className="p-8 text-center">
        <p className="mt-3 text-[15px] font-medium text-fg">No savings opportunities detected</p>
        <p className="mt-1 text-[12.5px] tracking-tight text-muted">This vendor looks healthy.</p>
      </Panel>
    );
  }
  return (
    <div className="space-y-4">
      {opportunities.map((o) => (
        <Panel key={o.id} className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">{o.title}</h3>
                <ActionStatusBadge status={o.status} />
              </div>
              <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted">{o.type.replace(/_/g, " ")}</p>
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
      ))}
      <p className="text-[11px] tracking-tight text-muted/70">
        All figures are potential savings estimates produced by deterministic rules - never guaranteed.
      </p>
    </div>
  );
}

/* ------------------------- activity ------------------------- */

function ActivityTab({
  vendor: v,
  alerts,
  opportunities,
}: {
  vendor: VendorProfile;
  alerts: AlertRecord[];
  opportunities: SavingsOpportunity[];
}) {
  const events: { time: string; color: string; text: string }[] = [
    ...alerts.map((a) => ({
      time: a.createdAt,
      color: "bg-zinc-400",
      text: a.title,
    })),
    ...opportunities.map((o) => ({
      time: o.createdAt,
      color: "bg-zinc-300",
      text: `Opportunity identified: ${o.title} (${money(o.estimatedSavings)}/yr)`,
    })),
  ].sort((a, b) => b.time.localeCompare(a.time));

  const timeline = [
    { time: v.startDate, color: "bg-zinc-500", text: `Contract term began (${formatDate(v.startDate)})` },
    ...events,
  ].slice(0, 10);

  return (
    <Panel className="p-5">
      <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Activity</h3>
      <div className="mt-4 space-y-0">
        {timeline.map((e, i) => (
          <div key={i} className="relative flex gap-3.5 pb-5 last:pb-0">
            {i < timeline.length - 1 && (
              <span className="absolute left-[9px] top-5 h-full w-px bg-line" />
            )}
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line bg-surface">
              <span className={`size-1.5 rounded-full ${e.color}`} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] leading-snug text-fg">{e.text}</p>
              <p className="mt-0.5 text-[11px] tracking-tight text-muted">
                {new Date(e.time + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
