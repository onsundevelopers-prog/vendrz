"use client";

import { useMemo, useState } from "react";
import { useNow } from "@/lib/useNow";
import Link from "next/link";
import { motion } from "framer-motion";
import { getContracts, getDemoAudit } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { Panel } from "@/components/ui/primitives";
import { money, formatDate, pct } from "@/lib/format";
import type { VendorProfile } from "@/lib/types";

type SortKey = "renewal" | "spend" | "savings" | "risk";

export default function ContractsPage() {
  const audit = getDemoAudit();
  const auth = useAuthUser();
  const uploaded = getContracts(auth.id ?? "").filter((c) => !c.isSample);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("renewal");
  const [sortAsc, setSortAsc] = useState(true);

  const withTerms = useMemo(
    () =>
      audit.vendors.filter((v) => v.renewalDate || v.contractStatus !== "active" || v.priceEscalationRate),
    [audit.vendors]
  );

  const filtered = useMemo(() => {
    let list = withTerms;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (v) => v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)
      );
    }
    const sorted = [...list].sort((a, b) => {
      switch (sortKey) {
        case "renewal":
          return (a.renewalDate ?? "9999").localeCompare(b.renewalDate ?? "9999");
        case "spend":
          return a.annualSpend - b.annualSpend;
        case "savings":
          return a.potentialSavings - b.potentialSavings;
        case "risk":
          return a.healthScore - b.healthScore;
      }
    });
    return sortAsc ? sorted : sorted.reverse();
  }, [withTerms, query, sortKey, sortAsc]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">Contracts</h2>
          <p className="mt-1 text-[12.5px] tracking-tight text-muted">
            {withTerms.length} contract-term vendors · renewals, escalations &amp; risk
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-muted">⌕</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search vendor…"
              className="h-10 w-full rounded-xl border border-line bg-surface pl-8 pr-3 text-[13px] tracking-tight text-fg outline-none transition-colors placeholder:text-muted focus:border-emerald-400/60"
            />
          </div>
          <Link
            href="/upload"
            className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[13px] font-medium text-black transition-opacity hover:opacity-90"
          >
            Scan a contract
          </Link>
        </div>
      </motion.div>

      <Panel delay={0.08} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="px-5 py-3.5"><Sortable label="Vendor" k="renewal" sortKey={sortKey} sortAsc={sortAsc} onSort={(k, asc) => { setSortKey(k); setSortAsc(asc); }} /></th>
                <th className="px-5 py-3.5"><Sortable label="Annual spend" k="spend" sortKey={sortKey} sortAsc={sortAsc} onSort={(k, asc) => { setSortKey(k); setSortAsc(asc); }} /></th>
                <th className="px-5 py-3.5"><Sortable label="Renewal" k="renewal" sortKey={sortKey} sortAsc={sortAsc} onSort={(k, asc) => { setSortKey(k); setSortAsc(asc); }} /></th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Cancel by</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Auto-renew</th>
                <th className="px-5 py-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">Escalation</th>
                <th className="px-5 py-3.5"><Sortable label="Health" k="risk" sortKey={sortKey} sortAsc={sortAsc} onSort={(k, asc) => { setSortKey(k); setSortAsc(asc); }} /></th>
                <th className="px-5 py-3.5"><Sortable label="Savings" k="savings" sortKey={sortKey} sortAsc={sortAsc} onSort={(k, asc) => { setSortKey(k); setSortAsc(asc); }} /></th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((v) => (
                <ContractRow key={v.id} v={v} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[13px] tracking-tight text-muted">
                    No contracts match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* uploaded contract scans - preserved legacy flow */}
      {uploaded.length > 0 && (
        <Panel delay={0.14} className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-5 py-4">
            <span className="size-1.5 rounded-full bg-emerald-400/70" />
            <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-fg">Your contract scans</h3>
            <span className="ml-auto rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[10.5px] text-muted">
              {uploaded.length}
            </span>
          </div>
          <div className="divide-y divide-line">
            {uploaded.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/vendors/${c.id}`}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03]"
              >
                <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06] text-[10.5px] font-semibold text-fg">
                  {c.vendorName.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-fg">{c.vendorName}</p>
                  <p className="truncate text-[11px] tracking-tight text-muted">{c.linkedDocument}</p>
                </div>
                <p className="text-[12.5px] text-muted">{money(c.annualSpend)}/yr</p>
                <span className="text-[12px] text-emerald-400">View →</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <p className="text-[11px] tracking-tight text-muted/70">
        Contract terms are extracted from connected agreements and financial records. Upload a PDF
        contract for clause-level analysis with evidence.
      </p>
    </div>
  );
}

function Sortable({
  label,
  k,
  sortKey,
  sortAsc,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey, asc: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        if (sortKey === k) onSort(k, !sortAsc);
        else onSort(k, k === "renewal");
      }}
      className={`inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] transition-colors hover:text-fg ${
        sortKey === k ? "text-fg" : "text-muted"
      }`}
    >
      {label}
      <span className="text-[11px] leading-none text-zinc-500">↕</span>
    </button>
  );
}

function ContractRow({ v }: { v: VendorProfile }) {
  const now = useNow();
  const days =
    v.renewalDate && v.risk
      ? v.risk.daysToRenewal
      : v.renewalDate
        ? Math.ceil((new Date(v.renewalDate + "T00:00:00").getTime() - now) / 86400000)
        : null;
  const urgency =
    days === null ? "ok" : days < 0 ? "overdue" : days <= 45 ? "urgent" : days <= 90 ? "soon" : "ok";
  const urgencyColor =
    urgency === "overdue"
      ? "text-red-400"
      : urgency === "urgent"
        ? "text-orange-400"
        : urgency === "soon"
          ? "text-amber-400"
          : "text-muted";

  return (
    <tr className="group transition-colors hover:bg-white/[0.03]">
      <td className="px-5 py-3.5">
        <Link href={`/dashboard/vendors/${v.id}`} className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg">
            {v.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-[13.5px] font-medium text-fg group-hover:text-emerald-300">{v.name}</p>
            <p className="text-[10.5px] tracking-tight text-muted">{v.category}</p>
          </div>
        </Link>
      </td>
      <td className="px-5 py-3.5 text-[13px] font-medium text-fg">{money(v.annualSpend)}</td>
      <td className="px-5 py-3.5">
        <p className="text-[13px] font-medium text-fg">{v.renewalDate ? formatDate(v.renewalDate) : "Rolling"}</p>
        {v.renewalDate && (
          <p className={`text-[11px] tracking-tight ${urgencyColor}`}>
            {days !== null ? (days < 0 ? "expired" : `${days} days`) : ""}
            {v.autoRenew ? " · auto-renews" : ""}
          </p>
        )}
      </td>
      <td className="px-5 py-3.5">
        {v.cancellationDeadline ? (
          <p className="text-[12px] text-muted">{formatDate(v.cancellationDeadline)}</p>
        ) : (
          <span className="text-[11.5px] text-muted/50">-</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className={`text-[12px] ${v.autoRenew ? "text-amber-400" : "text-emerald-400"}`}>
          {v.autoRenew ? "Enabled" : "Manual"}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {v.priceEscalationRate ? (
          <span className="text-[12.5px] font-medium text-orange-400">
            {pct(v.priceEscalationRate)}
          </span>
        ) : (
          <span className="text-[11.5px] text-muted/50">-</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className="text-[13px] font-semibold text-fg">{v.healthScore}</span>
      </td>
      <td className="px-5 py-3.5">
        {v.potentialSavings > 0 ? (
          <p className="text-[13px] font-medium text-emerald-400">{money(v.potentialSavings)}</p>
        ) : (
          <span className="text-[11.5px] text-muted/50">-</span>
        )}
      </td>
      <td className="px-5 py-3.5 text-right">
        <Link
          href={`/dashboard/vendors/${v.id}`}
          className="text-[12px] tracking-tight text-muted transition-colors hover:text-emerald-400"
        >
          Review →
        </Link>
      </td>
    </tr>
  );
}
