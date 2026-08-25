"use client";

import { motion } from "framer-motion";
import { BrowserFrame } from "@/components/ui/BrowserFrame";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { SAMPLE_CONTRACTS, formatDate, money } from "@/lib/mockData";
import type { ContractRecord } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

/* Days-to-renewal are computed once at module load, matching how the sample
   contracts themselves are generated relative to "now". */
const NOW = Date.now();

const rows = [...SAMPLE_CONTRACTS]
  .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate))
  .map((c) => ({
    contract: c,
    days: Math.ceil(
      (new Date(c.renewalDate + "T00:00:00").getTime() - NOW) / 86400000
    ),
  }));

export function PortfolioShowcase() {
  return (
    <section className="bg-surface py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-[12px] font-medium uppercase tracking-[0.2em] text-muted">
            The dashboard
          </p>
          <h2 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-fg sm:text-5xl">
            Every contract, every deadline, one table.
          </h2>
          <p className="mt-5 text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
            Once you claim an account, Watchtower keeps a live view of your whole
            portfolio — renewals, risk, and opportunity ranges for every scanned
            contract.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="mt-14 w-full"
        >
          <BrowserFrame
            className="glass-border"
            url="watchtower.app/dashboard/contracts"
            right={
              <span className="hidden rounded-full bg-white/[0.06] px-2.5 py-1 text-[10.5px] tracking-tight text-muted sm:inline">
                6 monitored
              </span>
            }
          >
            {/* app header row */}
            <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3.5">
              <div>
                <p className="text-sm font-semibold tracking-[-0.01em] text-fg">Contracts</p>
                <p className="text-xs text-muted">Renewals by date · risk · opportunity</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden h-8 items-center rounded-lg border border-line bg-black/40 px-3 sm:flex">
                  <span className="text-[11.5px] tracking-tight text-muted">Search vendor…</span>
                </div>
                <span className="inline-flex h-8 items-center rounded-full bg-white px-3 text-[11.5px] font-medium tracking-tight text-black">
                  + Scan
                </span>
              </div>
            </div>

            {/* table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left">
                <thead>
                  <tr className="border-b border-line">
                    {["Vendor", "Annual spend", "Renews", "Risk", "Opportunity"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted"
                      >
                        {h}
                      </th>
                    ))}
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map(({ contract, days }) => (
                    <ShowcaseRow key={contract.id} contract={contract} days={days} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-line px-5 py-3">
              <p className="text-[11px] tracking-tight text-muted">
                Sample portfolio · your scans appear here automatically after signup
              </p>
            </div>
          </BrowserFrame>
        </motion.div>
      </div>
    </section>
  );
}

function ShowcaseRow({ contract: c, days }: { contract: ContractRecord; days: number }) {
  const urgency =
    days < 0 ? "overdue" : days <= 45 ? "urgent" : days <= 90 ? "soon" : "ok";
  const urgencyColor =
    urgency === "overdue"
      ? "text-fg"
      : urgency === "urgent"
        ? "text-zinc-200"
        : urgency === "soon"
          ? "text-zinc-400"
          : "text-muted";

  return (
    <tr className="group transition-colors hover:bg-white/[0.03]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg">
            {c.vendorName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[13.5px] font-medium text-fg">{c.vendorName}</p>
            <p className="text-[11.5px] text-muted">{c.category}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5 text-[13px] font-medium tabular-nums text-fg">
        {money(c.annualSpend)}
      </td>
      <td className="px-5 py-3.5">
        <p className="text-[13px] font-medium tabular-nums text-fg">{formatDate(c.renewalDate)}</p>
        <p className={`text-[11.5px] ${urgencyColor}`}>
          {days < 0 ? "expired" : `${days} days`}
          {c.autoRenew ? " · auto-renews" : ""}
        </p>
      </td>
      <td className="px-5 py-3.5">
        <RiskBadge score={c.riskScore} size="sm" />
      </td>
      <td className="px-5 py-3.5 text-[13px] font-medium tabular-nums text-fg">
        {money(c.opportunityLow)}–{money(c.opportunityHigh)}
      </td>
      <td className="px-5 py-3.5 text-right">
        <span className="text-[11.5px] tracking-tight text-muted transition-colors group-hover:text-fg">
          Review →
        </span>
      </td>
    </tr>
  );
}
