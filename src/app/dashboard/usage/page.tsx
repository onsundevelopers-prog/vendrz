"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel, SectionHeader, StatCard } from "@/components/ui/primitives";
import { ProgressBar } from "@/components/ui/charts";
import { money } from "@/lib/format";
import type { VendorProfile } from "@/lib/types";

export default function UsagePage() {
  const audit = getDemoAudit();
  const [filter, setFilter] = useState<"all" | "low" | "unused">("all");

  const seatVendors = useMemo(
    () => audit.vendors.filter((v) => v.usage && v.usage.seatsPurchased > 0),
    [audit.vendors]
  );

  const list = useMemo(() => {
    let l = seatVendors;
    if (filter === "low") l = l.filter((v) => v.usage!.utilizationPct < 65);
    if (filter === "unused") l = l.filter((v) => v.usage!.inactiveUsers >= 9);
    return [...l].sort((a, b) => (a.usage?.utilizationPct ?? 0) - (b.usage?.utilizationPct ?? 0));
  }, [seatVendors, filter]);

  const totalSeats = seatVendors.reduce((a, v) => a + v.usage!.seatsPurchased, 0);
  const totalActive = seatVendors.reduce((a, v) => a + v.usage!.activeUsers, 0);
  const totalInactive = seatVendors.reduce((a, v) => a + v.usage!.inactiveUsers, 0);
  const totalUnusedCost = seatVendors.reduce((a, v) => a + v.usage!.unusedSeatCost, 0);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Usage intelligence"
        subtitle="Seats purchased vs seats actually used"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Seats purchased" value={totalSeats} sub={`across ${seatVendors.length} vendors`} />
        <StatCard label="Active seats" value={totalActive} sub={`${Math.round((totalActive / Math.max(1, totalSeats)) * 100)}% utilization`} />
        <StatCard label="Inactive seats" value={totalInactive} sub="no activity in 90 days" />
        <StatCard label="Unused-seat cost" value={totalUnusedCost} valueFormat={money} accent="text-red-400" sub="/yr potential savings" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            filter === "all" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          All vendors <span className="ml-1 text-[11px] opacity-60">{seatVendors.length}</span>
        </button>
        <button
          onClick={() => setFilter("low")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            filter === "low" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          Low utilization
        </button>
        <button
          onClick={() => setFilter("unused")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            filter === "unused" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          9+ unused seats
        </button>
      </div>

      <div className="space-y-3">
        {list.map((v, i) => (
          <UsageRow key={v.id} v={v} index={i} />
        ))}
      </div>
    </div>
  );
}

function UsageRow({ v, index }: { v: VendorProfile; index: number }) {
  const u = v.usage!;
  const utilColor = u.utilizationPct >= 55 ? "#e4e4e7" : "#f87171";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: Math.min(0.12, index * 0.02), ease: [0.22, 1, 0.36, 1] }}
    >
      <Panel className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/dashboard/vendors/${v.id}`} className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg">
              {v.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-fg hover:underline">{v.name}</p>
              <p className="text-[10.5px] tracking-tight text-muted">{v.category}</p>
            </div>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] tracking-tight text-muted">
                {u.activeUsers}/{u.seatsPurchased} seats active
              </span>
              <span className="text-[13px] font-semibold tracking-tight" style={{ color: utilColor }}>
                {u.utilizationPct.toFixed(1)}%
              </span>
            </div>
            <ProgressBar value={u.utilizationPct} color={utilColor} />
          </div>

          <div className="hidden w-40 text-right sm:block">
            <p className="text-[12px] text-muted">${u.costPerActiveUser.toFixed(0)}/user/mo</p>
            <p className="text-[10.5px] tracking-tight text-muted/70">cost per active user</p>
          </div>

          <div className="w-32 text-right">
            <p className="text-[14px] font-semibold text-red-400">{money(u.unusedSeatCost)}</p>
            <p className="text-[10.5px] tracking-tight text-muted">/yr unused</p>
          </div>
        </div>
      </Panel>
    </motion.div>
  );
}
