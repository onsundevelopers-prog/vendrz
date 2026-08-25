"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel } from "@/components/ui/primitives";
import { money, formatDateShort, daysUntil } from "@/lib/format";
import type { ContractStatus, SpendCategory, VendorProfile } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Vendor spreadsheet - the operational core of Vendrz.              */
/*  Sortable columns, search, status/category filters, dense rows.    */
/* ------------------------------------------------------------------ */

type SortKey =
  | "name"
  | "category"
  | "status"
  | "contractValue"
  | "renewalDate"
  | "cancellationDeadline"
  | "autoRenew"
  | "risk"
  | "potentialSavings"
  | "owner"
  | "lastReviewed";

interface Column {
  key: SortKey | null;
  label: string;
  align?: "left" | "right";
  width?: string;
}

const COLUMNS: Column[] = [
  { key: "name", label: "Vendor" },
  { key: "category", label: "Contract" },
  { key: "status", label: "Status" },
  { key: "contractValue", label: "Contract value", align: "right" },
  { key: "renewalDate", label: "Renewal" },
  { key: "cancellationDeadline", label: "Cancel by" },
  { key: "autoRenew", label: "Auto-renew" },
  { key: "risk", label: "Risk" },
  { key: "potentialSavings", label: "Potential savings", align: "right" },
  { key: "owner", label: "Owner" },
  { key: "lastReviewed", label: "Last reviewed" },
];

const STATUS_META: Record<ContractStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400" },
  expiring_soon: { label: "Expiring soon", cls: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
  at_risk: { label: "At risk", cls: "border-red-500/25 bg-red-500/10 text-red-400" },
};

const RISK_META: Record<string, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "border-red-500/30 bg-red-500/10 text-red-400" },
  high: { label: "High", cls: "border-orange-500/25 bg-orange-500/10 text-orange-400" },
  medium: { label: "Medium", cls: "border-amber-500/25 bg-amber-500/10 text-amber-400" },
  low: { label: "Low", cls: "border-white/10 bg-white/[0.04] text-zinc-400" },
};

const OWNERS = [
  "Priya Sharma",
  "Marcus Webb",
  "Dana Kowalski",
  "Tom Ellison",
  "Ava Rodriguez",
  "Noah Kim",
  "Sofia Alvarez",
  "Liam O'Connor",
  "Emma Chen",
  "Jordan Blake",
];

export default function VendorsPage() {
  const audit = getDemoAudit();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ContractStatus | "all">("all");
  const [cat, setCat] = useState<SpendCategory | "all">("all");
  const [owner, setOwner] = useState<string | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("contractValue");
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const categories = useMemo(
    () => [...new Set(audit.vendors.map((v) => v.category))].sort(),
    [audit.vendors]
  );

  const filtered = useMemo(() => {
    let list = audit.vendors;
    if (status !== "all") list = list.filter((v) => v.contractStatus === status);
    if (cat !== "all") list = list.filter((v) => v.category === cat);
    if (owner !== "all") list = list.filter((v) => v.owner === owner);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.owner.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      const cmp = compare(a, b, sortKey);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [audit.vendors, query, status, cat, owner, sortKey, sortAsc]);

  const counts = useMemo(() => {
    const c: Record<ContractStatus | "all", number> = { all: audit.vendors.length, active: 0, expiring_soon: 0, at_risk: 0 };
    for (const v of audit.vendors) c[v.contractStatus] += 1;
    return c;
  }, [audit.vendors]);

  const totalValue = filtered.reduce((a, v) => a + v.contractValue, 0);
  const totalSavings = filtered.reduce((a, v) => a + v.potentialSavings, 0);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* header */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2 className="text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">Vendor spreadsheet</h2>
          <p className="mt-1 text-[12.5px] tracking-tight text-muted">
            {audit.vendorCount} vendors · {money(audit.totalAnnualSpend)}/yr · {money(audit.potentialSavings)}/yr identified savings
          </p>
        </div>
        <Link
          href="/dashboard/agent"
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-2 text-[13px] font-medium tracking-tight text-emerald-300 transition-colors hover:bg-emerald-500/15"
        >
          <span aria-hidden="true" className="text-[14px] leading-none">✦</span>
          Ask the agent
        </Link>
      </motion.div>

      {/* toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] text-muted">⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors, categories, owners…"
            className="h-10 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-[13px] tracking-tight text-fg outline-none transition-colors placeholder:text-muted focus:border-emerald-400/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "active", "expiring_soon", "at_risk"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
                status === s
                  ? "bg-white text-black"
                  : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
              }`}
            >
              {s === "all" ? "All" : s.replace(/_/g, " ")}
              <span className={`ml-1 text-[10.5px] ${status === s ? "opacity-60" : "opacity-60"}`}>{counts[s]}</span>
            </button>
          ))}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              showFilters || cat !== "all" || owner !== "all"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
            }`}
          >
            Filters {(cat !== "all" || owner !== "all") && "·"}
          </button>
        </div>
      </div>

      {/* expandable filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <div className="grid gap-4 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.1em] text-muted">Category</span>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as SpendCategory | "all")}
                className="mt-1.5 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-[13px] text-fg outline-none focus:border-emerald-400/50"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[11px] uppercase tracking-[0.1em] text-muted">Owner</span>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-lg border border-line bg-canvas px-3 text-[13px] text-fg outline-none focus:border-emerald-400/50"
              >
                <option value="all">All owners</option>
                {OWNERS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
        </motion.div>
      )}

      {/* summary strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-1 text-[12px] tracking-tight text-muted">
        <span><span className="font-semibold text-fg">{filtered.length}</span> shown</span>
        <span>value <span className="font-semibold text-fg">{money(totalValue)}</span></span>
        <span>potential savings <span className="font-semibold text-emerald-400">{money(totalSavings)}</span></span>
      </div>

      {/* spreadsheet */}
      <Panel className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-left">
            <thead>
              <tr className="border-b border-line bg-white/[0.02]">
                {COLUMNS.map((c) => (
                  <th key={c.key ?? c.label} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""}`}>
                    {c.key ? (
                      <Sortable label={c.label} k={c.key} sortKey={sortKey} sortAsc={sortAsc} onSort={toggleSort} right={c.align === "right"} />
                    ) : (
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">{c.label}</span>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-right">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((v) => (
                <VendorRow key={v.id} vendor={v} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length + 1}>
                    <EmptyState onReset={() => { setQuery(""); setStatus("all"); setCat("all"); setOwner("all"); }} />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-[11px] tracking-tight text-muted/60">
        Savings figures are deterministic estimates from the savings engine - never guaranteed. Sort any column, or click a vendor row to open the full profile.
      </p>
    </div>
  );
}

/* ------------------------- sorting ------------------------- */

function compare(a: VendorProfile, b: VendorProfile, key: SortKey): number {
  switch (key) {
    case "name": return a.name.localeCompare(b.name);
    case "category": return a.category.localeCompare(b.category);
    case "status": return a.contractStatus.localeCompare(b.contractStatus);
    case "contractValue": return a.contractValue - b.contractValue;
    case "renewalDate": return (a.renewalDate ?? "9999").localeCompare(b.renewalDate ?? "9999");
    case "cancellationDeadline": return (a.cancellationDeadline ?? "9999").localeCompare(b.cancellationDeadline ?? "9999");
    case "autoRenew": return Number(a.autoRenew) - Number(b.autoRenew);
    case "risk": return (a.risk?.daysToRenewal ?? 999) - (b.risk?.daysToRenewal ?? 999);
    case "potentialSavings": return a.potentialSavings - b.potentialSavings;
    case "owner": return a.owner.localeCompare(b.owner);
    case "lastReviewed": return a.lastReviewed.localeCompare(b.lastReviewed);
  }
}

function Sortable({
  label,
  k,
  sortKey,
  sortAsc,
  onSort,
  right,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = sortKey === k;
  return (
    <button
      onClick={() => onSort(k)}
      className={`group inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-fg ${active ? "text-emerald-300" : "text-muted"} ${right ? "flex-row-reverse" : ""}`}
    >
      {label}
      <span className={`text-[10px] leading-none transition-opacity ${active ? "opacity-100" : "opacity-40 group-hover:opacity-80"}`}>
        {active ? (sortAsc ? "▲" : "▼") : "▲▼"}
      </span>
    </button>
  );
}

/* ------------------------- row ------------------------- */

function VendorRow({ vendor: v }: { vendor: VendorProfile }) {
  const renewalDays = daysUntil(v.renewalDate);
  const cancelDays = daysUntil(v.cancellationDeadline);
  const status = STATUS_META[v.contractStatus];
  const riskMeta = v.risk ? RISK_META[v.risk.level] : null;

  return (
    <tr className="group transition-colors hover:bg-white/[0.03]">
      {/* vendor */}
      <td className="px-4 py-3">
        <Link href={`/dashboard/vendors/${v.id}`} className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[10.5px] font-semibold tracking-tight text-fg">
            {v.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13.5px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
            <p className="truncate text-[10.5px] tracking-tight text-muted">{v.description}</p>
          </div>
        </Link>
      </td>
      {/* contract */}
      <td className="px-4 py-3">
        <span className="rounded-md border border-line bg-white/[0.03] px-2 py-0.5 text-[11px] font-medium tracking-tight text-fg/80">
          {v.category}
        </span>
      </td>
      {/* status */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-tight ${status.cls}`}>
          <span className={`size-1.5 rounded-full ${v.contractStatus === "active" ? "bg-emerald-400" : v.contractStatus === "expiring_soon" ? "bg-amber-400" : "bg-red-400"}`} />
          {status.label}
        </span>
      </td>
      {/* contract value */}
      <td className="px-4 py-3 text-right">
        <p className="text-[13px] font-medium text-fg">{money(v.contractValue)}</p>
        <p className="text-[10px] tracking-tight text-muted">/yr</p>
      </td>
      {/* renewal */}
      <td className="px-4 py-3">
        {v.renewalDate ? (
          <div>
            <p className={`text-[12.5px] font-medium ${renewalDays <= 30 ? "text-red-400" : renewalDays <= 60 ? "text-amber-400" : "text-fg"}`}>
              {formatDateShort(v.renewalDate)}
            </p>
            <p className="text-[10px] tracking-tight text-muted">{renewalDays} days</p>
          </div>
        ) : (
          <span className="text-[11.5px] text-muted/60">Rolling</span>
        )}
      </td>
      {/* cancellation deadline */}
      <td className="px-4 py-3">
        {v.cancellationDeadline ? (
          <div>
            <p className={`text-[12.5px] font-medium ${cancelDays < 0 ? "text-red-400" : cancelDays <= 14 ? "text-amber-400" : "text-fg"}`}>
              {formatDateShort(v.cancellationDeadline)}
            </p>
            <p className="text-[10px] tracking-tight text-muted">
              {cancelDays < 0 ? `${Math.abs(cancelDays)}d past` : `${cancelDays}d left`}
            </p>
          </div>
        ) : (
          <span className="text-[11.5px] text-muted/60">-</span>
        )}
      </td>
      {/* auto-renew */}
      <td className="px-4 py-3">
        {v.autoRenew ? (
          <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-orange-400">
            <span className="size-1.5 rounded-full bg-orange-400" /> ON
          </span>
        ) : (
          <span className="text-[11.5px] text-muted/60">OFF</span>
        )}
      </td>
      {/* risk */}
      <td className="px-4 py-3">
        {riskMeta ? (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-medium tracking-tight ${riskMeta.cls}`}>
            {riskMeta.label}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted/60">None</span>
        )}
      </td>
      {/* potential savings */}
      <td className="px-4 py-3 text-right">
        {v.potentialSavings > 0 ? (
          <p className="text-[13px] font-medium text-emerald-400">{money(v.potentialSavings)}</p>
        ) : (
          <span className="text-[11.5px] text-muted/60">-</span>
        )}
      </td>
      {/* owner */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[9.5px] font-semibold text-fg/80">
            {v.owner.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </div>
          <span className="whitespace-nowrap text-[12px] tracking-tight text-fg/85">{v.owner}</span>
        </div>
      </td>
      {/* last reviewed */}
      <td className="px-4 py-3">
        <span className="text-[12px] tracking-tight text-muted">{formatDateShort(v.lastReviewed)}</span>
      </td>
      {/* actions */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/dashboard/vendors/${v.id}`}
            className="rounded-lg border border-line px-2.5 py-1 text-[11.5px] font-medium tracking-tight text-muted transition-colors hover:border-emerald-500/30 hover:text-emerald-300"
          >
            Open
          </Link>
          <Link
            href={`/dashboard/agent?vendor=${encodeURIComponent(v.name)}`}
            className="rounded-lg px-2.5 py-1 text-[11.5px] font-medium tracking-tight text-muted transition-colors hover:bg-white/5 hover:text-fg"
          >
            Ask agent
          </Link>
        </div>
      </td>
    </tr>
  );
}

/* ------------------------- empty state ------------------------- */

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-line bg-white/[0.03]">
        <span aria-hidden="true" className="text-[16px] text-muted">⌕</span>
      </div>
      <p className="mt-4 text-[15px] font-medium text-fg">No vendors match your filters</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] leading-relaxed text-muted/70">
        Try clearing the search or resetting the status, category, and owner filters.
      </p>
      <button
        onClick={onReset}
        className="mt-5 rounded-full border border-line bg-surface px-4 py-2 text-[12.5px] font-medium tracking-tight text-fg transition-colors hover:border-emerald-500/30 hover:text-emerald-300"
      >
        Reset filters
      </button>
    </div>
  );
}
