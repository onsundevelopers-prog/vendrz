import type { ActivityRecord, ContractRecord, EmailThread } from "./types";
import { money, formatDate, daysUntil, timeAgo } from "./format";

/* ------------------------------------------------------------------ */
/*  n4maAI - procurement query engine.                                */
/*                                                                     */
/*  A deterministic query engine over the user's REAL contract data.   */
/*  Every answer is computed from actual ContractRecords, email        */
/*  threads and activity - nothing is fabricated. Answers distinguish  */
/*  FACT (in the data), ESTIMATE (calculated approximation), and       */
/*  RECOMMENDATION (a suggested next step). Where data is missing,     */
/*  the agent says it does not have enough information.                */
/* ------------------------------------------------------------------ */

export type ClaimKind = "FACT" | "ESTIMATE" | "RECOMMENDATION";

export type DraftKind = "send_email" | "cancel_contract";

export interface AdvisorDraft {
  kind: DraftKind;
  /** Formal action type recorded in the approval log. */
  action_type: "cancellation" | "negotiation" | "renewal" | "follow_up";
  vendorId: string;
  vendorName: string;
  /** Why the AI recommended this (FACT/ESTIMATE basis). */
  reasoning: string;
  /** Exactly what executing the action would do. */
  proposed_changes: string;
  to: string;
  subject: string;
  body: string;
}

export interface AdvisorReply {
  text: string;
  /** Contracts referenced in the reply - clickable evidence. */
  contractIds: string[];
  /** A prepared communication requiring explicit user approval. */
  draft?: AdvisorDraft;
}

const days = daysUntil;

/* ------------------------------ helpers ------------------------------ */

function fmtDate(iso: string | null): string {
  return formatDate(iso);
}

function line(label: string, value: string): string {
  return `- **${label}:** ${value}`;
}

function escRows(contracts: ContractRecord[], limit = 8): string {
  if (contracts.length === 0) return "None.";
  return contracts
    .slice(0, limit)
    .map((c) => `- **${c.vendorName}**${c.escalationRate != null ? ` · ${c.escalationRate}%/yr` : ""} · ${money(c.annualSpend)}/yr${c.renewalDate ? ` · renews ${fmtDate(c.renewalDate)}` : ""}`)
    .join("\n");
}

function fmtRows(contracts: ContractRecord[], limit = 8, suffix?: (c: ContractRecord) => string): string {
  if (contracts.length === 0) return "None.";
  return contracts
    .slice(0, limit)
    .map((c) => `- **${c.vendorName}** · ${money(c.annualSpend)}/yr${suffix ? " · " + suffix(c) : ""}`)
    .join("\n");
}

/** Fuzzy vendor lookup - exact, substring, token overlap. */
function findContract(contracts: ContractRecord[], q: string): ContractRecord | null {
  const clean = q.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (!clean) return null;
  const tokens = clean.split(/\s+/).filter((t) => t.length > 2);
  return (
    contracts.find((c) => c.vendorName.toLowerCase() === clean) ??
    contracts.find((c) => c.vendorName.toLowerCase().includes(clean) || clean.includes(c.vendorName.toLowerCase())) ??
    contracts.find((c) => tokens.some((t) => c.vendorName.toLowerCase().includes(t))) ??
    null
  );
}

/** Contracts whose names token-overlap with another contract - potential duplicates. */
function findDuplicates(contracts: ContractRecord[]): ContractRecord[][] {
  const groups: ContractRecord[][] = [];
  const seen = new Set<string>();
  for (const c of contracts) {
    if (seen.has(c.id)) continue;
    const toks = c.vendorName.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
    const group = contracts.filter(
      (o) =>
        o.id !== c.id &&
        (toks.some((t) => o.vendorName.toLowerCase().includes(t)) ||
          o.vendorName.toLowerCase().includes(c.vendorName.toLowerCase().split(/\s+/)[0]))
    );
    if (group.length > 0) {
      const g = [c, ...group];
      g.forEach((x) => seen.add(x.id));
      groups.push(g);
    }
  }
  return groups;
}

/* --------------------------- email helpers --------------------------- */

/** Vendor threads matching a name - exact, substring, token overlap. */
function findVendorThreads(threads: EmailThread[], vendorName: string): EmailThread[] {
  const clean = vendorName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const tokens = clean.split(/\s+/).filter((t) => t.length > 2);
  return threads
    .filter((t) => {
      const name = t.vendorName.toLowerCase();
      return (
        name === clean ||
        name.includes(clean) ||
        clean.includes(name) ||
        tokens.some((tok) => name.includes(tok))
      );
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function fmtThread(t: EmailThread): string {
  const d = fmtDate(t.date.slice(0, 10));
  return `- [${t.category}] "${t.subject}" · ${t.sender} · ${d}${t.unread ? " · unread" : ""}`;
}

/** Vendor contact address for a draft - thread sender if known, else empty
    ("address not on file"). We never invent a contact address. */
function deriveTo(vendorName: string, thread?: EmailThread): string {
  void vendorName;
  return thread?.sender ?? "";
}

/** Human-readable recipient line for a draft, honest about missing data. */
function recipientLine(to: string): string {
  return to ? ` addressed to ${to}` : " (no sender address on file yet)";
}

/* --------------------------- shared analysis --------------------------- */

export function analyzeContracts(contracts: ContractRecord[]) {
  const now = Date.now();
  const atRisk = contracts.filter((c) => c.riskScore >= 60).sort((a, b) => b.riskScore - a.riskScore);
  const renewing = contracts
    .filter((c) => c.renewalDate)
    .map((c) => ({ c, d: days(c.renewalDate) }))
    .filter((x) => x.d >= 0)
    .sort((a, b) => a.d - b.d);
  const escalating = contracts
    .filter((c) => c.escalationRate != null)
    .sort((a, b) => (b.escalationRate ?? 0) - (a.escalationRate ?? 0));
  const autoRenew = contracts.filter((c) => c.autoRenew);
  const inWindow = renewing.filter((x) => x.d <= 90);
  const totalSpend = contracts.reduce((a, c) => a + c.annualSpend, 0);
  const oppLow = contracts.reduce((a, c) => a + c.opportunityLow, 0);
  const oppHigh = contracts.reduce((a, c) => a + c.opportunityHigh, 0);
  const exposure = inWindow.reduce((a, x) => a + x.c.annualSpend, 0);
  const dupes = findDuplicates(contracts);
  const topVendors = [...contracts].sort((a, b) => b.annualSpend - a.annualSpend);
  return { now, atRisk, renewing, escalating, autoRenew, inWindow, totalSpend, oppLow, oppHigh, exposure, dupes, topVendors };
}

/* ------------------------------ briefing ------------------------------ */

export function buildBriefing(contracts: ContractRecord[]): string {
  if (contracts.length === 0) return "No contracts yet - upload a contract and I'll start tracking it.";
  const a = analyzeContracts(contracts);
  const items: string[] = [];
  const used = new Set<string>();

  // 1. Renewals inside window (most urgent first)
  for (const { c, d } of a.inWindow.slice(0, 3)) {
    if (used.has(c.id)) continue;
    used.add(c.id);
    const est = c.escalationRate != null ? c.annualSpend * (1 + c.escalationRate / 100) : null;
    items.push(
      `### ${d <= 30 ? "Renewal approaching" : "Renewal in window"}\n\n**${c.vendorName}** · ${money(c.annualSpend)}/yr\nRenews in ${d} days${c.cancellationDeadline ? ` · cancel by ${fmtDate(c.cancellationDeadline)}` : ""}${
        est != null ? `\nEstimated next-year cost at ${c.escalationRate}% escalation: ${money(est)} (ESTIMATE)` : ""
      }`
    );
  }

  // 2. Escalation risk
  const esc = a.escalating.find((c) => !used.has(c.id));
  if (esc) {
    used.add(esc.id);
    items.push(
      `### Price escalation\n\n**${esc.vendorName}** escalates ${esc.escalationRate}%/yr (FACT). If ${money(esc.annualSpend)}/yr rolls over, next year is ≈ ${money(esc.annualSpend * (1 + (esc.escalationRate ?? 0) / 100))} (ESTIMATE).`
    );
  }

  // 3. Savings opportunity
  const top = a.topVendors.find((c) => c.opportunityHigh > 0 && !used.has(c.id));
  if (top) {
    used.add(top.id);
    items.push(
      `### Savings opportunity\n\n**${top.vendorName}** - ${money(top.opportunityLow)}–${money(top.opportunityHigh)}/yr potential savings identified (ESTIMATE).`
    );
  }

  // 4. Duplicates
  if (a.dupes.length > 0) {
    const g = a.dupes[0];
    const gVal = g.reduce((s, c) => s + c.annualSpend, 0);
    items.push(
      `### Possible overlap\n\n${g.map((c) => c.vendorName).join(", ")} may overlap (INFERENCE) - combined ${money(gVal)}/yr. Worth reviewing for consolidation.`
    );
  }

  // 5. Concentration
  if (a.topVendors.length >= 3 && a.totalSpend > 0) {
    const top3 = a.topVendors.slice(0, 3);
    const top3Val = top3.reduce((s, c) => s + c.annualSpend, 0);
    const pct = Math.round((top3Val / a.totalSpend) * 100);
    if (pct >= 40) {
      items.push(
        `### Concentration\n\nTop 3 vendors (${top3.map((c) => c.vendorName).join(", ")}) are ${pct}% of stated annual value (FACT). High concentration = dependency risk.`
      );
    }
  }

  if (items.length === 0) {
    return "Nothing urgent right now - no renewals in the window, no escalations, and no flagged risks in the current data.";
  }

  return `## Attention briefing\n\n**${items.length} ${items.length === 1 ? "item" : "items"} require attention**\n\n${items.join("\n\n")}`;
}

/* ------------------------------ insights ------------------------------ */

export function buildInsights(contracts: ContractRecord[]): string {
  if (contracts.length === 0) return "No contracts yet to analyze.";
  const a = analyzeContracts(contracts);
  const lines: string[] = [];
  const used = new Set<string>();

  for (const { c, d } of a.inWindow.slice(0, 4)) {
    if (used.has(c.id)) continue;
    used.add(c.id);
    const est = c.escalationRate != null ? c.annualSpend * (1 + c.escalationRate / 100) : null;
    lines.push(
      `### Renewal exposure\n\n**${c.vendorName}** renews in ${d} days${est ? ` - next-year cost ≈ ${money(est)} (ESTIMATE)` : ""}. Review terms before the cancellation deadline${c.cancellationDeadline ? ` (${fmtDate(c.cancellationDeadline)})` : ""}.`
    );
  }
  const esc = a.escalating.find((c) => !used.has(c.id) && c.escalationRate! > 3);
  if (esc) {
    used.add(esc.id);
    lines.push(
      `### Price increase\n\n**${esc.vendorName}** has a ${esc.escalationRate}% annual escalation clause (FACT). Negotiate a cap before renewal.`
    );
  }
  const dup = a.dupes[0];
  if (dup) {
    const val = dup.reduce((s, c) => s + c.annualSpend, 0);
    lines.push(
      `### Duplicate tools\n\n${dup.map((c) => c.vendorName).join(" and ")} look overlapping (INFERENCE) - combined ${money(val)}/yr. Consolidation could reduce cost (ESTIMATE).`
    );
  }
  if (a.topVendors.length >= 3 && a.totalSpend > 0) {
    const pct = Math.round((a.topVendors.slice(0, 3).reduce((s, c) => s + c.annualSpend, 0) / a.totalSpend) * 100);
    if (pct >= 40)
      lines.push(
        `### Spend concentration\n\n${pct}% of stated annual value sits with the top 3 vendors (FACT). Consider spreading dependency risk.`
      );
  }
  if (lines.length === 0) return "No significant patterns detected in the current data.";
  return `## Insights\n\n${lines.join("\n\n")}`;
}

/* --------------------------- natural language --------------------------- */

export function advisorReply(
  input: string,
  contracts: ContractRecord[],
  opts: {
    threads?: EmailThread[];
    activity?: ActivityRecord[];
    senderName?: string;
    senderEmail?: string;
  } = {}
): AdvisorReply {
  const raw = input.trim();
  const text = raw.toLowerCase();
  const threads = opts.threads ?? [];
  const activity = opts.activity ?? [];
  const senderName = opts.senderName ?? "Your team";
  const a = analyzeContracts(contracts);

  /* ---------------- help / capability ---------------- */
  if (/^(help|what can you|how do you work|commands?|capabilit)/.test(text) || raw === "?") {
    return {
      text: `I'm your assistant. I work from your **${contracts.length} contract${contracts.length === 1 ? "" : "s"}** - only your real data.

- "What needs attention?" - prioritized briefing
- "What changed?" - recent activity
- "What's the status on [vendor]?" - company profile
- "Find emails from [vendor]" - read the vendor's real correspondence
- "Draft a reply / renewal / negotiation to [vendor]" - prepare an email for approval
- "Cancel the [vendor] contract" - draft the cancellation notice
- "Which contracts auto-renew?" / "Where can we save money?"
- "Compare [vendor] and [vendor]"

Every claim is marked FACT, ESTIMATE, or RECOMMENDATION. I never guess, I never invent emails, and **no email is ever sent until you approve it**.`,
      contractIds: [],
    };
  }

  /* ---------------- briefing / what needs attention ---------------- */
  if (/(brief|what needs attention|what should i look at|prioriti|daily|morning|anything (urgent|important|due))/.test(text)) {
    return { text: buildBriefing(contracts), contractIds: contracts.map((c) => c.id) };
  }

  /* ---------------- insights / proactive ---------------- */
  if (/(insight|proactive|patterns?|what (is|are) you (seeing|finding)|anything i (missed|should know))/.test(text)) {
    return { text: buildInsights(contracts), contractIds: contracts.map((c) => c.id) };
  }

  /* ---------------- what changed ---------------- */
  if (/what changed|what('?s| is) new|changes|recent (activity|events)|this week/.test(text)) {
    if (activity.length === 0) {
      return {
        text: "I don't have any recorded activity to compare against yet - upload or analyze a contract and it will appear here.",
        contractIds: [],
      };
    }
    return {
      text: `**What changed - last ${Math.min(activity.length, 8)} events**\n\n${activity
        .slice(0, 8)
        .map((ev) => `- **${ev.title}** · ${ev.detail} · ${timeAgo(ev.createdAt)}`)
        .join("\n")}`,
      contractIds: [],
    };
  }

  /* ---------------- search / read vendor emails ---------------- */
  if (/(find|search|read|show|list|look at|pull|fetch|what|emails|mail|correspondence|messages)\b/.test(text)) {
    // Only treat as an email search when it explicitly asks about emails/mail
    // for a named vendor, or references correspondence broadly.
    const emailIntent =
      /(email|e-?mail|mail|mailbox|inbox|correspondence|message|conversation|thread)/i.test(text);
    if (emailIntent) {
      const vendorNameMatch =
        text.match(/(?:from|with|for|about|re)(?:\s+the)?\s+([a-z0-9 .&'-]+)/) ??
        text.match(/(?:email|emails|correspondence|mail)[:\s]+([a-z0-9 .&'-]+)/) ??
        text.match(/[\s:]([a-z0-9 .&'-]{3,})$/);
      const name = vendorNameMatch ? vendorNameMatch[1].trim() : null;

      if (!name) {
        // No vendor named - show the overall correspondence count and categories.
        if (threads.length === 0) {
          return {
            text: "I searched the mailbox but there is no correspondence yet. Connect Gmail and I'll read authorized vendor emails on demand.",
            contractIds: [],
          };
        }
        const byCat: Record<string, number> = {};
        threads.forEach((t) => (byCat[t.category] = (byCat[t.category] ?? 0) + 1));
        return {
          text: `**Correspondence across the mailbox - ${threads.length} thread${threads.length === 1 ? "" : "s"} (FACT)**\n\n${Object.entries(byCat)
            .map(([cat, n]) => `- ${cat}: ${n}`)
            .join("\n")}\n\nName a vendor (e.g. "find emails from Slack") and I'll read the relevant threads and can draft a reply.`,
          contractIds: [],
        };
      }

      const vendor = findContract(contracts, name);
      if (!vendor) {
        return {
          text: `I couldn't find **${name}** in your portfolio. I can only read communications for vendors you actually work with. Try the full vendor name.`,
          contractIds: [],
        };
      }
      const relevant = findVendorThreads(threads, vendor.vendorName);
      if (relevant.length === 0) {
        return {
          text: `I searched the mailbox for **${vendor.vendorName}** but no correspondence is stored for them yet (FACT). ` +
            `Once Gmail is connected and their emails are indexed, I can read the threads and draft a reply, cancellation, negotiation or renewal for your approval.`,
          contractIds: [vendor.id],
        };
      }
      const renewalRelevant = relevant.filter((t) => t.category === "renewal");
      const negotiationRelevant = relevant.filter((t) => t.category === "negotiation");
      const summary = relevant
        .slice(0, 6)
        .map(fmtThread)
        .join("\n");
      return {
        text: `**Correspondence from ${vendor.vendorName} - ${relevant.length} thread${relevant.length === 1 ? "" : "s"} (FACT)**\n\n${summary}\n\n` +
          `${renewalRelevant.length ? `\n**Renewal signal:** ${renewalRelevant.length} thread${renewalRelevant.length === 1 ? "" : "s"} relates to renewal - review before the deadline.\n` : ""}` +
          `${negotiationRelevant.length ? `**Negotiation signal:** ${negotiationRelevant.length} thread${negotiationRelevant.length === 1 ? "" : "s"} discusses pricing - ask me to draft a negotiation reply.\n` : ""}` +
          `\nI can draft a **reply**, **renewal**, **negotiation** or **cancellation** email to ${vendor.vendorName} for your approval.`,
        contractIds: [vendor.id],
      };
    }
  }

  /* ---------------- cancellation opportunities (what should I cancel?) ---------------- */
  // Contracts inside their cancellation window that would otherwise self-renew.
  if (
    /what (should|vendors?|contracts?) (i |we )?(cancel|drop|end|terminate)/.test(text) ||
    /cancel.*(quarter|month|soon|window|deadline)/.test(text) ||
    /which.*cancel/.test(text) ||
    /cancellation opportunit/.test(text)
  ) {
    const opps = contracts
      .filter(
        (c) =>
          c.autoRenew &&
          c.cancellationDeadline &&
          days(c.cancellationDeadline) >= 0 &&
          days(c.cancellationDeadline) <= 90
      )
      .sort((b, c2) => days(b.cancellationDeadline) - days(c2.cancellationDeadline));
    if (opps.length === 0) {
      return {
        text: `No contracts are inside their cancellation window right now (FACT). None will auto-renew before you have to act on it.`,
        contractIds: [],
      };
    }
    const total = opps.reduce((s, c) => s + c.annualSpend, 0);
    return {
      text: `**Cancellation opportunities - ${opps.length} in window (FACT)**\n\n${fmtRows(
        opps,
        8,
        (c) => `auto-renew ON · cancel by ${fmtDate(c.cancellationDeadline)} (${days(c.cancellationDeadline)}d)${c.escalationRate != null ? ` · ${c.escalationRate}%/yr` : ""}`
      )}\n\nCombined annual value: **${money(total)}/yr** (FACT)${
        opps.length > 0
          ? `\n\n**Recommended (RECOMMENDATION):** review the terms on each before its deadline. Say \"Cancel the ${opps[0].vendorName} contract\" and I'll draft the notice for your approval.`
          : ""
      }`,
      contractIds: opps.map((c) => c.id),
    };
  }

  /* ---------------- cancel / termination draft ---------------- */
  const cancelMatch = text.match(/(?:cancel|terminate|drop|cut|end|stop)\s+(?:our|the)?\s*(?:contract|subscription|agreement)?\s*(?:with|for)?\s*([a-z0-9 .&'-]+)/);
  if (/(cancel|terminate|drop the|cut|stop renewing)/.test(text) && cancelMatch) {
    const vendor = findContract(contracts, cancelMatch[1]);
    if (!vendor) {
      return { text: "I couldn't find a matching vendor in your contracts. Try the full name.", contractIds: [] };
    }
    const dl = vendor.cancellationDeadline ? days(vendor.cancellationDeadline) : null;
    const thread = findVendorThreads(threads, vendor.vendorName)[0];
    const body = `Hi ${vendor.vendorName} team,

We are providing notice of cancellation of our ${vendor.category || "vendor"} agreement (${money(vendor.annualSpend)}/yr), effective at the end of the current term.

${
  dl != null
    ? `As required by the agreement, this notice is being provided ahead of the cancellation deadline (${fmtDate(vendor.cancellationDeadline)}).`
    : "We are providing this notice in line with the agreement's notice requirements."
}

Please confirm receipt and let us know the next steps for closing the account, including final billing and data export. Please do not auto-renew this agreement.

Thanks,
${senderName}
n4ma · Procurement`;
    return {
      text: `**${vendor.vendorName} - cancellation review**\n\n- Annual value: ${money(vendor.annualSpend)}/yr (FACT)\n- Auto-renew: ${vendor.autoRenew ? "ON - no action means renewed" : "OFF"} (FACT)\n- Cancellation deadline: ${fmtDate(vendor.cancellationDeadline)} (FACT)\n- Days left: ${dl != null ? `${dl}d` : "not stated"}\n\nI've drafted the notice below - **nothing is sent until you approve it.**`,
      contractIds: [vendor.id],
      draft: {
        kind: "cancel_contract",
        action_type: "cancellation",
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        reasoning: `Automatic renewal is ${vendor.autoRenew ? "ON - no action means the contract renews itself" : "OFF"}${vendor.escalationRate != null ? ` with a ${vendor.escalationRate}%/yr escalation` : ""} (FACT). Cancellation is ${dl != null && dl > 0 ? "within the allowed window" : "beyond the stated deadline"} (FACT).`,
        proposed_changes: `Send cancellation notice to ${vendor.vendorName} (${money(vendor.annualSpend)}/yr) effective at the end of the current term; do not auto-renew the agreement.`,
        to: deriveTo(vendor.vendorName, thread) || "", 
        subject: `Notice of cancellation - ${vendor.vendorName} agreement`,
        body,
      },
    };
  }

  /* ---------------- draft emails (reply / renewal / negotiation / cancellation) ---------------- */
  if (
    /(?:draft|write|compose|prepare|send)\s+(?:a|an|the)?\s*(?:email|reply|note|message|letter|notice|renewal|negotiation)/.test(text) ||
    /(?:reply|respond|answer|follow[- ]up)/.test(text) ||
    /(negotiat|discount|reduce|lower\s+the?\s*price|remove\s+the?\s*increase)/.test(text)
  ) {
    const vendorNameMatch = text.match(/(?:to|for|with)\s+([a-z0-9 .&'-]+)/);
    const vendor = vendorNameMatch ? findContract(contracts, vendorNameMatch[1]) : a.topVendors[0];
    if (!vendor) {
      return { text: "I couldn't find a matching vendor to draft to.", contractIds: [] };
    }

    // Ground the draft in the most relevant real thread for this vendor.
    const vendorThreads = findVendorThreads(threads, vendor.vendorName);
    const thread =
      vendorThreads.find((t) => t.category === "renewal" && /renewal|renew|renew?ing/i.test(text)) ??
      vendorThreads.find((t) => t.category === "negotiation" && /negotiat|discount|price|rate/i.test(text)) ??
      vendorThreads[0];
    const to = deriveTo(vendor.vendorName, thread);

    const wantsCancellation = /cancel|terminate|end the agreement/.test(text);
    const wantsRenewal =
      /renew|renewal|renewing|continue our agreement|extend/.test(text) && !wantsCancellation;
    const wantsNegotiation =
      /negotiat|discount|reduce|lower|price increase|escalation|cap/.test(text) && !wantsCancellation;

    const escText =
      vendor.escalationRate != null ? ` (${vendor.escalationRate}% escalation on file, FACT)` : "";

    let purpose = "follow-up";
    let subject = `Re: ${thread?.subject ?? "Renewal discussion"} - ${vendor.vendorName}`;
    let body = `Hi ${vendor.vendorName} team,\n\n${thread ? `Following up on the recent message (\"${thread.subject}\"). ` : ""}We'd like to continue working together.\n\nCould you confirm the next steps and key terms for the account? Happy to align on timing and expectations.\n\nThanks,\n${senderName}`;

    if (wantsCancellation) {
      purpose = "cancellation";
      subject = `Notice of cancellation - ${vendor.vendorName} agreement`;
      body = `Hi ${vendor.vendorName} team,\n\nWe are providing notice of cancellation of our agreement, effective at the end of the current term.\n\nPlease confirm receipt and the next steps for closing the account, including final billing and data export. Please do not auto-renew this agreement.\n\nThanks,\n${senderName}`;
    } else if (wantsRenewal) {
      purpose = "renewal";
      subject = `Renewal - ${vendor.vendorName} agreement`;
      const esc = vendor.escalationRate != null ? vendor.escalationRate : null;
      body = `Hi ${vendor.vendorName} team,\n\nWe'd like to renew our agreement and continue the partnership${vendor.renewalDate ? ` (current term ends ${fmtDate(vendor.renewalDate)})` : ""}.\n\n${
        esc != null
          ? `Before confirming, we'd like to review the ${esc}% annual escalation currently in the agreement and discuss terms for the next term. Could you confirm the renewal rate and any changes?\n\n`
          : "Could you confirm the renewal terms and rate for the next term?\n\n"
      }Please share the renewal paperwork at your convenience.\n\nThanks,\n${senderName}`;
    } else if (wantsNegotiation) {
      purpose = "negotiation";
      subject = `Renewal negotiation - ${vendor.vendorName}`;
      body = `Hi ${vendor.vendorName} team,\n\nWe're reviewing our ${money(vendor.annualSpend)}/yr agreement${
        vendor.escalationRate != null ? `, which currently includes an automatic ${vendor.escalationRate}% annual increase` : ""
      }.\n\nGiven our ongoing commitment, we'd like to lock in more favorable terms for the next term - ideally removing or capping the increase. Could you confirm the best rate you can offer for a renewed term?\n\nThanks,\n${senderName}`;
    } else {
      // Plain response - prefer the most recent thread.
      if (thread) {
        subject = `Re: ${thread.subject}`;
        body = `Hi ${vendor.vendorName} team,\n\nThanks for the recent message (\"${thread.subject}\").\n\nWe've reviewed it and wanted to follow up: could you clarify the next steps and timing on your end? Happy to align on expectations.\n\nThanks,\n${senderName}`;
      }
    }

    const actionType =
      purpose === "cancellation"
        ? "cancellation"
        : purpose === "renewal"
          ? "renewal"
          : purpose === "negotiation"
            ? "negotiation"
            : "follow_up";
    const reasoning =
      purpose === "negotiation" && vendor.escalationRate != null
        ? `${vendor.vendorName} has a ${vendor.escalationRate}%/yr escalation on ${money(vendor.annualSpend)}/yr of spend (FACT) - negotiating now avoids compounding increases.`
        : purpose === "cancellation"
          ? `Cancellation is ${vendor.autoRenew ? "needed to avoid automatic renewal" : "within the allowed notice window"} (FACT).`
          : purpose === "renewal"
            ? `${vendor.vendorName} renews${vendor.renewalDate ? ` ${fmtDate(vendor.renewalDate)}` : ""} (FACT); locking terms now avoids a lapse.`
            : `${thread ? `Recent correspondence from ${vendor.vendorName} (\"${thread.subject}\")` : `Open item with ${vendor.vendorName}`} warrants a follow-up (FACT).`;
    return {
      text: `I've drafted a **${purpose === "follow-up" ? "response" : purpose}** email to **${vendor.vendorName}**${
        thread ? ` grounded in the thread \"${thread.subject}\"${thread.sender ? ` from ${thread.sender}` : ""}` : " using the contract context"
      }${escText}. Review below - I'll only send it after you approve.`,
      contractIds: [vendor.id],
      draft: {
        kind: "send_email",
        action_type: actionType,
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        reasoning,
        proposed_changes: `Send a ${purpose} email to ${vendor.vendorName} (${subject})${recipientLine(to)}.`,
        to,
        subject,
        body,
      },
    };
  }

  /* ---------------- company profile ---------------- */
  const profileMatch = text.match(/(?:status|about|profile|overview|everything|info(?:rmation)?|look (?:at|into)|tell me about|details? on)\s+(?:the\s+)?([a-z0-9 .&'-]+)/);
  if (profileMatch) {
    const vendor = findContract(contracts, profileMatch[1]);
    if (vendor) {
      const relatedThreads = threads.filter((t) => t.vendorName.toLowerCase() === vendor.vendorName.toLowerCase());
      const relatedActivity = activity.filter((ev) => (ev.vendorName ?? "").toLowerCase() === vendor.vendorName.toLowerCase());
      const d = vendor.renewalDate ? days(vendor.renewalDate) : null;
      return {
        text: `**${vendor.vendorName}** · ${vendor.category || "Uncategorized"}

${line("Annual value", vendor.annualSpend > 0 ? `${money(vendor.annualSpend)}/yr (FACT)` : "not stated in contract")}
${line("Auto-renew", vendor.autoRenew ? "Yes - no action means renewed (FACT)" : "No / manual (FACT)")}
${line("Escalation", vendor.escalationRate != null ? `${vendor.escalationRate}%/yr (FACT)` : "none extracted")}
${line("Renews", vendor.renewalDate ? `${fmtDate(vendor.renewalDate)} (${d != null ? `${d}d` : "date stated"})` : "no renewal date extracted")}
${line("Cancel by", fmtDate(vendor.cancellationDeadline))}
${line("Risk", `${vendor.riskScore}/100 ${vendor.riskScore >= 60 ? "- needs attention" : "- manageable"}`)}
${line("Savings potential", vendor.opportunityHigh > 0 ? `${money(vendor.opportunityLow)}–${money(vendor.opportunityHigh)}/yr (ESTIMATE)` : "none identified")}
${line("Document", vendor.linkedDocument)}
${
  relatedThreads.length > 0
    ? `\n**Correspondence (${relatedThreads.length})**\n${relatedThreads.slice(0, 3).map((t) => `- [${t.category}] "${t.subject}" · ${t.sender} · ${fmtDate(t.date.slice(0, 10))}`).join("\n")}`
    : ""
}
${
  relatedActivity.length > 0
    ? `\n**Recent activity**\n${relatedActivity.slice(0, 3).map((ev) => `- ${ev.title} · ${timeAgo(ev.createdAt)}`).join("\n")}`
    : ""
}

**Recommended action (RECOMMENDATION):** ${vendor.riskScore >= 60 ? "review terms before the next deadline" : vendor.opportunityHigh > 0 ? "review the identified savings opportunity" : "no action required right now"}.`,
        contractIds: [vendor.id],
      };
    }
  }

  /* ---------------- comparison ---------------- */
  if (/(compare|versus|vs\.?|which (is better|has|one))/i.test(text)) {
    const m = text.match(/(?:compare|between|vs\.?)\s+([a-z0-9 .&'-]+?)\s+(?:and|vs\.?|to)\s+([a-z0-9 .&'-]+)/);
    if (m) {
      const left = findContract(contracts, m[1]);
      const right = findContract(contracts, m[2]);
      if (left && right) {
        const rows = [
          { label: "Annual value", l: `${money(left.annualSpend)}/yr`, r: `${money(right.annualSpend)}/yr` },
          { label: "Escalation", l: left.escalationRate != null ? `${left.escalationRate}%` : "none", r: right.escalationRate != null ? `${right.escalationRate}%` : "none" },
          { label: "Auto-renew", l: left.autoRenew ? "Yes" : "No", r: right.autoRenew ? "Yes" : "No" },
          { label: "Renewal", l: fmtDate(left.renewalDate), r: fmtDate(right.renewalDate) },
          { label: "Cancel by", l: fmtDate(left.cancellationDeadline), r: fmtDate(right.cancellationDeadline) },
          { label: "Risk", l: `${left.riskScore}/100`, r: `${right.riskScore}/100` },
          { label: "Savings potential", l: left.opportunityHigh > 0 ? `${money(left.opportunityLow)}–${money(left.opportunityHigh)}` : "none", r: right.opportunityHigh > 0 ? `${money(right.opportunityLow)}–${money(right.opportunityHigh)}` : "none" },
        ];
        const worse = left.riskScore > right.riskScore ? left : right;
        return {
          text: `**Comparison: ${left.vendorName} vs ${right.vendorName}**\n\n${rows.map((r) => `- **${r.label}:** ${r.l}  |  ${r.r}`).join("\n")}\n\n**Observation (INFERENCE):** ${worse.vendorName} carries the higher risk score (${worse.riskScore}/100) of the two.`,
          contractIds: [left.id, right.id],
        };
      }
      return { text: "I could only find one of those vendors in your contracts. Try the full names.", contractIds: [] };
    }
  }

  /* ---------------- cross-contract queries ---------------- */
  if (/(auto.?renew)/.test(text)) {
    const list = a.autoRenew;
    return {
      text: `**Contracts with auto-renewal (FACT) - ${list.length}**\n\n${escRows(list)}\n\n${a.autoRenew.length > 0 ? "**Recommended (RECOMMENDATION):** review the cancellation window on each before the deadline." : ""}`,
      contractIds: list.map((c) => c.id),
    };
  }

  if (/(escalat|price increase|increase prices|raise prices|go up)/.test(text)) {
    const list = a.escalating;
    return {
      text: `**Vendors with price escalation (FACT) - ${list.length}**\n\n${escRows(list)}\n\n${
        list.length > 0
          ? `If all renew as written, next-year cost ≈ ${money(list.reduce((s, c) => s + c.annualSpend * (1 + (c.escalationRate ?? 0) / 100), 0))} vs ${money(list.reduce((s, c) => s + c.annualSpend, 0))} now (ESTIMATE).`
          : ""
      }`,
      contractIds: list.map((c) => c.id),
    };
  }

  if (/(renew.*(this|next|quarter|month)|quarter|this (quarter|month)|coming up)/.test(text)) {
    const now = new Date();
    const qStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const qEnd = new Date(now.getFullYear(), now.getMonth() + 3, 1);
    const list = contracts
      .filter((c) => c.renewalDate)
      .map((c) => ({ c, t: new Date(c.renewalDate + "T00:00:00").getTime() }))
      .filter((x) => x.t >= qStart.getTime() && x.t < qEnd.getTime())
      .sort((x, y) => x.t - y.t)
      .map((x) => x.c);
    return {
      text: `**Renewals in the next 3 months (FACT) - ${list.length}**\n\n${fmtRows(list, 8, (c) => `renews ${fmtDate(c.renewalDate)}`)}\n${list.length === 0 ? "\nNothing renews in the next quarter." : ""}`,
      contractIds: list.map((c) => c.id),
    };
  }

  const valueMatch = text.match(/(?:worth|value|more than|over|above|under|less than|below)\s*(?:usd|\\$)?\s*([0-9][0-9,.]*k?)/);
  if (valueMatch && /(contract|vendor|worth|value|spend)/.test(text)) {
    let n = parseFloat(valueMatch[1].replace(/,/g, ""));
    if (/k/i.test(valueMatch[1])) n *= 1000;
    const direction = /(under|less than|below)/.test(text) ? -1 : 1;
    const list = contracts.filter((c) => (direction > 0 ? c.annualSpend > n : c.annualSpend < n)).sort((a, b) => b.annualSpend - a.annualSpend);
    return {
      text: `**Contracts ${direction > 0 ? "above" : "below"} ${money(n)}/yr (FACT) - ${list.length}**\n\n${fmtRows(list)}`,
      contractIds: list.map((c) => c.id),
    };
  }

  if (/(exposure|renewal (value|risk)|at risk|risky|high risk|vulnerab)/.test(text)) {
    const list = a.atRisk;
    return {
      text: `**Highest risk contracts (FACT) - ${list.length}**\n\n${fmtRows(list, 8, (c) => `${c.riskScore}/100 risk${c.renewalDate ? ` · renews ${fmtDate(c.renewalDate)}` : ""}`)}\n\n**Renewal exposure:** ${money(a.exposure)} of stated annual value renews within 90 days (FACT).`,
      contractIds: list.map((c) => c.id),
    };
  }

  if (/(save|saving|opportunit|waste|reduce cost|money)/.test(text)) {
    const list = contracts.filter((c) => c.opportunityHigh > 0).sort((x, y) => y.opportunityHigh - x.opportunityHigh);
    return {
      text: `**Savings opportunities (ESTIMATE) - ${list.length}**\n\n${fmtRows(list, 8, (c) => `${money(c.opportunityLow)}–${money(c.opportunityHigh)}/yr potential`)}\n\nTotal potential: **${money(a.oppLow)}–${money(a.oppHigh)}/yr** (ESTIMATE, not guaranteed). ${
        a.dupes.length > 0 ? `\n\nAlso: ${a.dupes.length} possible overlapping tool group${a.dupes.length === 1 ? "" : "s"} (INFERENCE) worth consolidating.` : ""
      }`,
      contractIds: list.map((c) => c.id),
    };
  }

  if (/(most|biggest|largest|highest|top|expensive|cost|spend|exposure)/.test(text)) {
    const list = a.topVendors;
    const pct = a.totalSpend > 0 ? Math.round((list.slice(0, 3).reduce((s, c) => s + c.annualSpend, 0) / a.totalSpend) * 100) : 0;
    return {
      text: `**Vendors by annual value (FACT)**\n\n${fmtRows(list, 10)}\n\nTotal stated annual value: **${money(a.totalSpend)}**${pct >= 40 ? ` - top 3 are ${pct}% of it (concentration risk)` : ""}.`,
      contractIds: list.map((c) => c.id),
    };
  }

  if (/(negotiat|renegotiat|which vendors should)/.test(text)) {
    const list = a.escalating.length > 0 ? a.escalating : contracts.filter((c) => c.autoRenew);
    return {
      text: `**Priority renegotiation targets (RECOMMENDATION)**\n\n${escRows(list)}\n\nRationale: these have ${a.escalating.length > 0 ? "price escalation clauses (FACT)" : "auto-renewal (FACT)"} - locking terms now avoids compounding increases.`,
      contractIds: list.map((c) => c.id),
    };
  }

  /* ---------------- generic vendor lookup ---------------- */
  const vendor = findContract(contracts, text);
  if (vendor && !/(overview|dashboard|spend|how much|total)/.test(text)) {
    const d = vendor.renewalDate ? days(vendor.renewalDate) : null;
    return {
      text: `**${vendor.vendorName}** · ${vendor.category || "Uncategorized"}

${line("Annual value", vendor.annualSpend > 0 ? `${money(vendor.annualSpend)}/yr (FACT)` : "not stated in contract")}
${line("Auto-renew", vendor.autoRenew ? "Yes (FACT)" : "No / manual (FACT)")}
${line("Escalation", vendor.escalationRate != null ? `${vendor.escalationRate}%/yr (FACT)` : "none extracted")}
${line("Renews", vendor.renewalDate ? `${fmtDate(vendor.renewalDate)} (${d != null ? `${d}d` : "date stated"})` : "no renewal date extracted")}
${line("Cancel by", fmtDate(vendor.cancellationDeadline))}
${line("Risk", `${vendor.riskScore}/100`)}
${line("Savings potential", vendor.opportunityHigh > 0 ? `${money(vendor.opportunityLow)}–${money(vendor.opportunityHigh)}/yr (ESTIMATE)` : "none identified")}

Ask me to "draft a renewal negotiation to ${vendor.vendorName}" or "cancel the ${vendor.vendorName} contract" and I'll prepare the message for your approval.`,
      contractIds: [vendor.id],
    };
  }

  /* ---------------- how many / count ---------------- */
  const howMany = text.match(/how many (contracts|companies|vendors|records)/);
  if (howMany) {
    return { text: `You have **${contracts.length} contract${contracts.length === 1 ? "" : "s"}** in your workspace (FACT).`, contractIds: [] };
  }

  /* ---------------- executive totals ---------------- */
  if (/(total|how much (do we )?spend|overall|annual spend|all (our|my) (vendors|contracts))/i.test(text)) {
    return {
      text: `**Portfolio summary (FACT)**\n\n- Contracts: ${contracts.length}\n- Total stated annual value: ${money(a.totalSpend)}\n- Renewal exposure (90d): ${money(a.exposure)}\n- High risk (≥60): ${a.atRisk.length}\n- Potential savings: ${money(a.oppLow)}–${money(a.oppHigh)}/yr (ESTIMATE)\n- Auto-renew contracts: ${a.autoRenew.length}\n- Vendors with escalation: ${a.escalating.length}`,
      contractIds: [],
    };
  }

  /* ---------------- default ---------------- */
  return {
    text: `I couldn't find that in your current data. I can answer from your **${contracts.length} contract${contracts.length === 1 ? "" : "s"}**: renewals, risk, spend, savings, escalations, comparisons and drafting.

Try:
- "What needs attention?" (briefing)
- "What's the status on ${contracts[0]?.vendorName ?? "a vendor"}?"
- "Which contracts auto-renew?"
- "Where can we save money?"
- "How much do we spend in total?"`,
    contractIds: contracts.slice(0, 4).map((c) => c.id),
  };
}
