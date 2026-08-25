"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel } from "@/components/ui/primitives";
import { Sparkline } from "@/components/ui/charts";
import { money, pct } from "@/lib/format";
import type { SpendCategory, VendorProfile } from "@/lib/types";

type SortKey = "spend" | "trend" | "health" | "savings" | "utilization";

export default function VendorsPage() {
  const audit = getDemoAudit();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<SpendCategory | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("spend");
  const [sortAsc, setSortAsc] = useState(false);

  const categories = audit.categories.map((c) => c.name);

  let list = audit.vendors;
  if (cat !== "all") list = list.filter((v) => v.category === cat);
  if (query.trim()) {
    const q = query.toLowerCase();
    list = list.filter(
      (v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)
    );
  }
  const sortVal = (v: VendorProfile): number => {
    switch (sortKey) {
      case "spend": return v.annualSpend;
      case "trend": return v.spendTrendPct;
      case "health": return v.healthScore;
      case "savings": return v.potentialSavings;
      case "utilization": return v.utilizationPct ?? 0;
    }
  };
  const filtered = [...list].sort((a, b) => sortVal(a) - sortVal(b));
  if (sortAsc) filtered.reverse();

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">Vendors</h2>
          <p className="mt-1 text-[12.5px] tracking-tight text-muted">
            {audit.vendorCount} vendors · {money(audit.totalAnnualSpend)}/yr total
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-muted">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors…"
            className="h-10 w-full rounded-xl border border-line bg-surface pl-8 pr-3 text-[13px] tracking-tight text-fg outline-none transition-colors placeholder:text-muted focus:border-emerald-400/60"
          />
        </div>
      </motion.div>

      {/* category filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setCat("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            cat === "all"
              ? "bg-white text-black"
              : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          All <span className="ml-1 text-[11px] opacity-60">{audit.vendorCount}</span>
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              cat === c
                ? "bg-white text-black"
                : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
            }`}
          >
            {c}
            <span className="ml-1 text-[11px] opacity-60">
              {audit.vendors.filter((v) => v.category === c).length}
            </span>
          </button>
        ))}
      </div>

      {/* table */}
      <Panel delay={0.1} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-3.5">
                  <Sortable label="Vendor" k="spend" sortKey={sortKey} onSort={toggleSort} />
                </th>
                <th className="px-5 py-3.5">
                  <Sortable label="Annual spend" k="spend" sortKey={sortKey} onSort={toggleSort} />
                </th>
                <th className="px-5 py-3.5">
                  <Sortable label="Trend" k="trend" sortKey={sortKey} onSort={toggleSort} />
                </th>
                <th className="px-5 py-3.5">
                  <Sortable label="Utilization" k="utilization" sortKey={sortKey} onSort={toggleSort} />
                </th>
                <th className="px-5 py-3.5">
                  <Sortable label="Health" k="health" sortKey={sortKey} onSort={toggleSort} />
                </th>
                <th className="px-5 py-3.5">
                  <Sortable label="Potential savings" k="savings" sortKey={sortKey} onSort={toggleSort} />
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((v) => (
                <VendorRow key={v.id} vendor={v} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[13px] tracking-tight text-muted">
                    No vendors match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Sortable({
  label,
  k,
  sortKey,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  onSort: (k: SortKey) => void;
}) {
  return (
    <button
      onClick={() => onSort(k)}
      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-fg ${
        sortKey === k ? "text-fg" : "text-muted"
      }`}
    >
      {label}
      <span className="text-[11px] leading-none text-zinc-500">↕</span>
    </button>
  );
}

function VendorRow({ vendor: v }: { vendor: VendorProfile }) {
  const trendUp = v.spendTrendPct >= 0;
  const utilColor =
    v.utilizationPct >= 75 ? "text-emerald-400" : v.utilizationPct >= 50 ? "text-amber-400" : "text-red-400";
  const healthColor =
    v.healthScore >= 80 ? "#34d399" : v.healthScore >= 60 ? "#e4e4e7" : v.healthScore >= 40 ? "#fbbf24" : "#f87171";

  return (
    <tr className="group transition-colors hover:bg-white/[0.03]">
      <td className="px-5 py-3.5">
        <Link href={`/dashboard/vendors/${v.id}`} className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold tracking-tight text-fg">
            {v.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
            <p className="truncate text-[11px] tracking-tight text-muted">{v.category}</p>
          </div>
        </Link>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <p className="text-[13px] font-medium text-fg">{money(v.annualSpend)}</p>
          <Sparkline data={v.monthlySeries} width={64} height={22} color={trendUp ? "#34d399" : "#f87171"} />
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className={`text-[12.5px] font-medium ${trendUp ? "text-orange-400" : "text-emerald-400"}`}>
          {pct(v.spendTrendPct)}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {v.seats > 0 ? (
          <div>
            <p className={`text-[12.5px] font-medium ${utilColor}`}>
              {v.utilizationPct.toFixed(0)}%
            </p>
            <p className="text-[10.5px] tracking-tight text-muted">
              {v.activeUsers}/{v.seats} seats
            </p>
          </div>
        ) : (
          <span className="text-[11px] tracking-tight text-muted">usage-based</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-fg">{v.healthScore}</span>
          <div className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full" style={{ width: `${v.healthScore}%`, background: healthColor }} />
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {v.potentialSavings > 0 ? (
          <p className="text-[13px] font-medium text-emerald-400">{money(v.potentialSavings)}</p>
        ) : (
          <span className="text-[11px] text-muted/60">—</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <Link
          href={`/dashboard/vendors/${v.id}`}
          className="text-[12px] tracking-tight text-muted transition-colors hover:text-emerald-400"
        >
          View →
        </Link>
      </td>
    </tr>
  );
}
