"use client";

import { useMemo } from "react";
import { X, Globe } from "lucide-react";
import type { ContractRecord } from "@/lib/types";
import type { AgentClauseFinding } from "@/lib/agentTask";
import { money, formatDate } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Record window - noma's dark analogue of an opened browser page.  */
/*  Shows a REAL contract record and, when the agent analyzed its      */
/*  clauses, the REAL extracted findings with evidence. Nothing here   */
/*  is fabricated.                                                     */
/* ------------------------------------------------------------------ */

export interface BrowserTab {
  key: string;
  title: string;
  url: string;
  contract: ContractRecord | null;
  body?: string;
  /** Real clause findings extracted from the document. */
  clauses?: AgentClauseFinding[];
}

function severityColor(s: string): string {
  if (s === "critical") return "bg-zinc-300";
  if (s === "warning") return "bg-zinc-400";
  return "bg-zinc-600";
}

export function BrowserWindow({ tab, onClose }: { tab: BrowserTab; onClose: () => void }) {

  const rows = useMemo(() => {
    if (!tab.contract) return [];
    const c = tab.contract;
    return [
      ["Vendor", c.vendorName || "—"],
      ["Category", c.category || "—"],
      ["Annual spend", c.annualSpend > 0 ? money(c.annualSpend) : "—"],
      ["Next renewal", formatDate(c.renewalDate || null)],
      ["Cancel by", formatDate(c.cancellationDeadline)],
      ["Auto-renew", c.autoRenew ? "On" : "Off"],
      c.escalationRate != null ? ["Escalation", `${c.escalationRate}%`] : null,
      ["Risk", `${c.riskScore}/100`],
      ["Document", c.linkedDocument || "—"],
    ].filter((r): r is [string, string] => !!r);
  }, [tab.contract]);

  const hasClauses = (tab.clauses?.length ?? 0) > 0;

  return (
    <div className="border-sheen pointer-events-auto flex w-[300px] flex-col overflow-hidden rounded-lg border border-line-strong bg-[#121216] shadow-[0_16px_40px_rgba(0,0,0,0.55)]">
      {/* window title bar */}
      <div className="flex items-center gap-2 border-b border-line bg-[#16161b] px-2.5 py-1.5">
        <span className="min-w-0 flex-1 truncate text-[10.5px] font-medium text-zinc-300">
          {tab.title}
        </span>
        <button
          onClick={onClose}
          aria-label="Close window"
          className="flex size-4 items-center justify-center rounded text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <X size={11} />
        </button>
      </div>

      {/* record id */}
      <div className="flex items-center gap-1.5 border-b border-line bg-[#0e0e12] px-2 py-1">
        <Globe size={10} className="shrink-0 text-zinc-600" />
        <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-zinc-500">{tab.url}</span>
      </div>

      {/* window body - real record + real clause findings */}
      <div className="max-h-[300px] overflow-y-auto bg-[#0e0e12]">
        <div className="flex items-center gap-2 px-3 pb-2 pt-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.08] text-[9px] font-semibold text-zinc-200">
            {(tab.contract?.vendorName || "V").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-semibold text-fg">
              {tab.contract?.vendorName || tab.title}
            </p>
            <p className="truncate text-[9.5px] text-zinc-500">
              {tab.contract?.linkedDocument || "Record"}
            </p>
          </div>
        </div>

        <div className="divide-y divide-line/60 border-t border-line px-3 py-1">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 py-1.5">
              <span className="shrink-0 text-[9.5px] font-semibold tracking-[0.08em] text-zinc-500">
                {k}
              </span>
              <span className="min-w-0 truncate text-right text-[11px] font-medium text-zinc-200">
                {v}
              </span>
            </div>
          ))}
        </div>

        {hasClauses && (
          <div className="border-t border-line px-3 py-2">
            <p className="mb-1.5 text-[9.5px] font-semibold tracking-[0.1em] text-zinc-500">
              Extracted clauses · {tab.clauses!.length}
            </p>
            <div className="space-y-1.5">
              {tab.clauses!.map((f, i) => (
                <div key={i} className="rounded-md border border-line/60 bg-[#0a0a0e] px-2 py-1.5">
                  <p className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-200">
                    <span className={`size-1.5 shrink-0 rounded-full ${severityColor(f.severity)}`} />
                    <span className="truncate">{f.title}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-zinc-500">{f.detail}</p>
                  {f.evidence?.section && (
                    <p className="mt-0.5 text-[9.5px] text-zinc-600">
                      § {f.evidence.section}
                      {f.evidence.page ? ` · p.${f.evidence.page}` : ""}
                      {f.evidence.excerpt ? ` — “${f.evidence.excerpt}”` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab.contract === null && tab.body && (
          <p className="px-3 py-3 text-[11px] leading-relaxed text-zinc-400">{tab.body}</p>
        )}
        {tab.contract === null && !tab.body && (
          <p className="px-3 py-6 text-center text-[11px] text-zinc-600">No record to display.</p>
        )}
      </div>
    </div>
  );
}
