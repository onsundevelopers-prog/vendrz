"use client";

import type { ActivityRecord, ContractRecord, EmailThread } from "@/lib/types";
import { money, formatDate, timeAgo } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import { Inspector, DetailRow } from "@/components/ui/Inspector";
import { StatusChip, RiskChip, AutoRenewChip, riskLevel } from "./shared";
import { SectionLabel } from "./panels";

/* ------------------------------------------------------------------ */
/*  Contract inspector - contextual detail drawer.                    */
/*  Every value comes from the real contract record produced by the   */
/*  extraction pipeline for the user's uploaded document.             */
/* ------------------------------------------------------------------ */

export function contractReasons(c: ContractRecord, now: number): string[] {
  const out: string[] = [];
  if (c.autoRenew) out.push("Auto-renews on its current terms");
  if (c.cancellationDeadline) {
    const d = new Date(c.cancellationDeadline + "T00:00:00").getTime();
    if (d < now) out.push("Cancellation window has passed");
    else if (d - now <= 30 * 86400000) out.push("Cancellation deadline is within 30 days");
  }
  if (c.opportunityHigh > 0)
    out.push(`Potential savings of ${money(c.opportunityLow)}–${money(c.opportunityHigh)}/yr identified`);
  if (c.riskScore >= 60) out.push(`Risk score ${c.riskScore} (${c.riskScore >= 80 ? "critical" : "high"})`);
  return out;
}

export function recommendedContractAction(c: ContractRecord, now: number): string {
  if (c.cancellationDeadline) {
    const d = new Date(c.cancellationDeadline + "T00:00:00").getTime();
    if (d < now) return "Renewal is imminent - confirm terms or negotiate now.";
    if (c.autoRenew && d - now <= 60 * 86400000)
      return `Give cancellation notice by ${formatDate(c.cancellationDeadline)} to avoid auto-renewal.`;
  }
  if (c.opportunityHigh > 0)
    return "Review the identified savings opportunity before the next renewal cycle.";
  if (c.autoRenew) return "Review renewal terms before the next term begins.";
  return "No immediate action required.";
}

export function CompanyInspector({
  contract,
  onClose,
  emails,
  activity,
}: {
  contract: ContractRecord | null;
  onClose: () => void;
  emails: EmailThread[];
  activity: ActivityRecord[];
}) {
  const now = useNow();
  if (!contract) return null;
  const reasons = contractReasons(contract, now);

  return (
    <Inspector
      open={!!contract}
      onClose={onClose}
      title={contract.vendorName}
      sub={`${contract.category} · ${contract.status.replace("_", " ")}`}
    >
      <div className="px-4 pb-2 pt-3">
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <StatusChip status={contract.status} />
          <RiskChip level={riskLevel(contract.riskScore)} />
          {contract.autoRenew ? <AutoRenewChip on /> : null}
        </div>
      </div>

      <SectionLabel>Overview</SectionLabel>
      <DetailRow label="Annual value" align="right">
        {contract.annualSpend > 0 ? (
          money(contract.annualSpend)
        ) : (
          <span className="text-muted/70">Not stated</span>
        )}
      </DetailRow>
      <DetailRow label="Risk score" align="right">
        <span className={contract.riskScore >= 60 ? "text-zinc-100" : "text-fg"}>
          {contract.riskScore} / 100
        </span>
      </DetailRow>
      <DetailRow label="Savings potential" align="right">
        {contract.opportunityHigh > 0 ? (
          <span>
            {money(contract.opportunityLow)}–{money(contract.opportunityHigh)}/yr
          </span>
        ) : (
          <span className="text-muted/70">None identified</span>
        )}
      </DetailRow>
      <DetailRow label="Document">
        <span className="truncate">{contract.linkedDocument}</span>
      </DetailRow>

      <SectionLabel>Contract terms</SectionLabel>
      <DetailRow label="Renews">{formatDate(contract.renewalDate || null)}</DetailRow>
      <DetailRow label="Cancel by">{formatDate(contract.cancellationDeadline)}</DetailRow>
      <DetailRow label="Auto-renew">
        <AutoRenewChip on={contract.autoRenew} />
      </DetailRow>

      <SectionLabel>Risk analysis</SectionLabel>
      <div className="px-4 py-2.5">
        <div className="space-y-1.5">
          {reasons.map((r, i) => (
            <p key={i} className="flex items-start gap-2 text-[12px] leading-snug text-muted">
              <span className="mt-[7px] h-px w-2 shrink-0 bg-zinc-600" />
              {r}
            </p>
          ))}
        </div>
        <div className="mt-2.5 flex items-start gap-2 rounded-md border border-line bg-white/[0.03] p-2.5">
          <p className="text-[11.5px] leading-snug text-zinc-300">
            <span className="font-semibold text-fg">Recommended: </span>
            {recommendedContractAction(contract, now)}
          </p>
        </div>
      </div>

      {emails.length > 0 && (
        <>
          <SectionLabel>Correspondence</SectionLabel>
          {emails.map((t) => (
            <div key={t.id} className="border-b border-line/60 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 truncate text-[12px] font-medium text-fg">{t.subject}</span>
              </div>
              <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted">{t.snippet}</p>
              <p className="mt-1 text-[10.5px] text-muted/60">
                {t.sender} · {timeAgo(t.date)} · {t.category}
              </p>
            </div>
          ))}
        </>
      )}

      {activity.length > 0 && (
        <>
          <SectionLabel>Activity</SectionLabel>
          {activity.map((a) => (
            <div key={a.id} className="border-b border-line/60 px-4 py-2.5">
              <p className="text-[12px] font-medium text-fg">{a.title}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{a.detail}</p>
              <p className="mt-1 text-[10.5px] text-muted/60">
                {a.actor} · {timeAgo(a.createdAt)}
              </p>
            </div>
          ))}
        </>
      )}

      <div className="h-4" />
    </Inspector>
  );
}
