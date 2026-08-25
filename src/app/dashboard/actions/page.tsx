"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getDemoAudit } from "@/lib/store";
import { Panel, SectionHeader, ActionStatusBadge } from "@/components/ui/primitives";
import { money } from "@/lib/format";
import type { ActionStatus, SavingsOpportunity } from "@/lib/types";

const STATUSES: ActionStatus[] = ["open", "in_review", "actioned", "dismissed", "savings_confirmed"];

const STATUS_STYLE: Record<ActionStatus, { label: string; cls: string }> = {
  open: { label: "Mark in review", cls: "border-white/15 text-fg hover:bg-white/10" },
  in_review: { label: "Mark actioned", cls: "border-white/15 text-fg hover:bg-white/10" },
  actioned: { label: "Confirm savings", cls: "border-white/15 text-fg hover:bg-white/10" },
  dismissed: { label: "Reopen", cls: "border-white/15 text-muted hover:bg-white/5" },
  savings_confirmed: { label: "Done", cls: "border-white/20 text-fg" },
};

export default function ActionsPage() {
  const audit = getDemoAudit();
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>(() => {
    const init: Record<string, ActionStatus> = {};
    for (const o of audit.opportunities) init[o.id] = o.status;
    return init;
  });
  const [filter, setFilter] = useState<ActionStatus | "all">("all");

  const setStatus = (id: string, status: ActionStatus) =>
    setStatuses((s) => ({ ...s, [id]: status }));

  const cycle = (o: SavingsOpportunity) => {
    const cur = statuses[o.id] ?? o.status;
    const next: ActionStatus =
      cur === "open"
        ? "in_review"
        : cur === "in_review"
          ? "actioned"
          : cur === "actioned"
            ? "savings_confirmed"
            : cur === "savings_confirmed"
              ? "open"
              : "open"; // dismissed → open
    setStatus(o.id, next);
  };

  const actions = useMemo(() => {
    const list = audit.opportunities
      .map((o) => ({ ...o, status: statuses[o.id] ?? o.status }))
      .filter((o) => filter === "all" || o.status === filter)
      .sort((a, b) => {
        const order: Record<ActionStatus, number> = { open: 0, in_review: 1, actioned: 2, savings_confirmed: 3, dismissed: 4 };
        return order[a.status] - order[b.status] || b.estimatedSavings - a.estimatedSavings;
      });
    return list;
  }, [audit.opportunities, statuses, filter]);

  const totals = useMemo(() => {
    const t: Record<ActionStatus, number> = { open: 0, in_review: 0, actioned: 0, dismissed: 0, savings_confirmed: 0 };
    for (const o of audit.opportunities) {
      const s = statuses[o.id] ?? o.status;
      t[s] += o.estimatedSavings;
    }
    return t;
  }, [audit.opportunities, statuses]);

  const counts = useMemo(() => {
    const c: Record<ActionStatus, number> = { open: 0, in_review: 0, actioned: 0, dismissed: 0, savings_confirmed: 0 };
    for (const o of audit.opportunities) c[statuses[o.id] ?? o.status] += 1;
    return c;
  }, [audit.opportunities, statuses]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Action Center"
        subtitle="Every opportunity, tracked from discovery to confirmed savings"
      />

      {/* pipeline summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STATUSES.map((s) => (
          <Panel key={s} className="p-4">
            <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted">
              {s.replace(/_/g, " ")}
            </p>
            <p className="mt-2 text-[24px] font-semibold leading-none tracking-tight text-fg">
              {counts[s]}
            </p>
            <p className="mt-1.5 text-[11.5px] tracking-tight text-fg">
              {money(totals[s])}
            </p>
            <p className="text-[9.5px] tracking-tight text-muted">/yr</p>
          </Panel>
        ))}
      </div>

      {/* filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
            filter === "all" ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
          }`}
        >
          All <span className="ml-1 text-[11px] opacity-60">{actions.length}</span>
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              filter === s ? "bg-white text-black" : "border border-line bg-surface text-muted hover:border-white/25 hover:text-fg"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {actions.map((o, i) => {
          const st = STATUS_STYLE[o.status];
          return (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(0.1, i * 0.02), ease: [0.22, 1, 0.36, 1] }}
            >
              <Panel className={`p-4 ${o.status === "dismissed" ? "opacity-55" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg">
                    {o.vendorName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/dashboard/vendors/${o.vendorId}`} className="text-[14px] font-semibold text-fg hover:underline">
                        {o.vendorName}
                      </Link>
                      <ActionStatusBadge status={o.status} />
                    </div>
                    <p className="mt-0.5 truncate text-[13px] text-muted">{o.title}</p>
                  </div>
                  <p className="shrink-0 text-[17px] font-semibold tracking-tight text-fg">
                    {money(o.estimatedSavings)}
                    <span className="ml-1 text-xs font-normal text-muted">/yr</span>
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {o.status !== "savings_confirmed" && o.status !== "dismissed" && (
                      <button
                        onClick={() => cycle(o)}
                        className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${st.cls}`}
                      >
                        {st.label}
                      </button>
                    )}
                    {o.status !== "dismissed" && o.status !== "savings_confirmed" && (
                      <button
                        onClick={() => setStatus(o.id, "dismissed")}
                        aria-label="Dismiss"
                        title="Dismiss"
                        className="flex size-8 items-center justify-center rounded-full border border-white/10 text-[15px] text-muted transition-colors hover:bg-white/5 hover:text-fg"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
                {o.status === "open" && (
                  <p className="mt-2.5 rounded-lg bg-white/[0.04] px-3 py-2 text-[12.5px] leading-relaxed text-muted">
                    {o.recommendedAction}
                  </p>
                )}
              </Panel>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
