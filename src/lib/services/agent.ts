import type { CompanyAudit, EmailThread, VendorProfile } from "@/lib/types";
import { money } from "./engines";

/* ------------------------------------------------------------------ */
/*  Vendrz vendor agent - deterministic intent engine.                */
/*  Mirrors the agentic flow: identify vendor → check terms → draft →  */
/*  require approval → send → record. No email is ever sent without    */
/*  explicit user confirmation (approval is surfaced as a card).       */
/* ------------------------------------------------------------------ */

export interface AgentReply {
  content: string;
  approval?: {
    action: "send_email" | "cancel_contract";
    vendorId: string;
    vendorName: string;
    to: string;
    subject: string;
    body: string;
  };
  /** Vendor links surfaced in the reply, for inline chips. */
  vendors?: { id: string; name: string }[];
}

const VENDOR_ALIASES: Record<string, string[]> = {
  aws: ["aws", "amazon web services", "amazon"],
  adobe: ["adobe", "creative cloud"],
  slack: ["slack"],
  cursor: ["cursor", "anysphere"],
  anthropic: ["anthropic", "claude"],
  "google-workspace": ["google workspace", "gsuite", "google"],
  notion: ["notion"],
  hubspot: ["hubspot"],
  figma: ["figma"],
  github: ["github"],
  salesforce: ["salesforce", "sfdc"],
  "microsoft-365": ["microsoft 365", "microsoft", "m365", "office 365"],
  datadog: ["datadog"],
  snowflake: ["snowflake"],
  zoom: ["zoom"],
  docusign: ["docusign", "docu sign"],
  atlassian: ["atlassian", "jira"],
  openai: ["openai", "chatgpt", "gpt"],
  linear: ["linear"],
  vercel: ["vercel"],
  stripe: ["stripe"],
  twilio: ["twilio"],
  cloudflare: ["cloudflare"],
  sentry: ["sentry"],
  posthog: ["posthog"],
  intercom: ["intercom"],
  zendesk: ["zendesk"],
  asana: ["asana"],
  miro: ["miro"],
  loom: ["loom"],
  canva: ["canva"],
  dropbox: ["dropbox"],
  okta: ["okta"],
  "1password": ["1password", "one password"],
  discord: ["discord"],
  amplitude: ["amplitude"],
  segment: ["segment"],
  zapier: ["zapier"],
  webflow: ["webflow"],
  airtable: ["airtable"],
  pagerduty: ["pagerduty"],
  "new-relic": ["new relic", "newrelic"],
  mongodb: ["mongodb", "mongo"],
  supabase: ["supabase"],
  fastly: ["fastly"],
  grammarly: ["grammarly"],
  confluence: ["confluence"],
  "microsoft-teams": ["teams", "microsoft teams"],
};

function findVendor(audit: CompanyAudit, query: string): VendorProfile | null {
  const q = query.toLowerCase();
  // Exact name match first.
  const direct = audit.vendors.find(
    (v) => v.name.toLowerCase() === q || v.name.toLowerCase().includes(q)
  );
  if (direct) return direct;
  // Alias match.
  for (const [id, aliases] of Object.entries(VENDOR_ALIASES)) {
    if (aliases.some((a) => q.includes(a))) {
      return audit.vendors.find((v) => v.id === `v-${id}`) ?? null;
    }
  }
  // Fuzzy: any vendor whose name tokens overlap.
  return (
    audit.vendors.find((v) => {
      const toks = q.split(/\s+/).filter((t) => t.length > 2);
      return toks.some((t) => v.name.toLowerCase().includes(t));
    }) ?? null
  );
}

function vendorContact(v: VendorProfile): string {
  const domain =
    v.name.toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/^(microsoft365|googleworkspace)/, "") ||
    "company";
  return `billing@${domain}.com`;
}

function cancellationDraft(v: VendorProfile, senderName: string): string {
  const deadline = v.cancellationDeadline
    ? new Date(v.cancellationDeadline + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the end of the current term";
  return `Hi ${v.name} team,

We are writing to provide notice of cancellation of our ${v.category} agreement (${money(
    v.contractValue
  )}/yr), effective at the end of the current term.

As stated in our agreement, we are providing this notice ahead of the cancellation deadline (${deadline}). Please confirm receipt of this notice and let us know the next steps for closing out the account, including final billing and data export.

Please do not auto-renew this agreement.

Thanks,
${senderName}
Vendrz · Procurement`;
}

function summarizeThreads(threads: EmailThread[], v: VendorProfile): string {
  const mine = threads.filter((t) => t.vendorId === v.id);
  if (mine.length === 0) return "";
  const lines = mine.map((t) => {
    const d = new Date(t.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return `• [${t.category}] "${t.subject}" (${d}, from ${t.sender}) - ${t.snippet}`;
  });
  return lines.join("\n");
}

/** Drafts a polite negotiation reply for the most recent vendor thread. */
function negotiationDraft(v: VendorProfile, threads: EmailThread[]): string | null {
  const thread = threads.find((t) => t.vendorId === v.id && t.category === "negotiation");
  if (!thread) return null;
  return `Hi there,

Thanks for the renewal quote. We'd like to continue with ${v.name}, but the current pricing is above our budget for the next term. Could you share a breakdown of what's driving the increase and options for a multi-year commitment at a lower rate?

Happy to move quickly if we can land closer to our target. Appreciate your flexibility.

Thanks`;
}

export function agentReply(
  input: string,
  audit: CompanyAudit,
  threads: EmailThread[],
  senderName: string
): AgentReply {
  const text = input.trim();
  const lower = text.toLowerCase();

  /* ---------- cancellation requests ---------- */
  const cancelMatch = lower.match(/(?:cancel|cut|drop|terminate|end)\s+(?:our|the)?\s*(?:contract|subscription|agreement)?\s*(?:with|for)?\s*(.+)/);
  const wantsCancel = /cancel|terminate|cut\s+off|stop\s+renewing/.test(lower);

  if (wantsCancel && cancelMatch) {
    const vendor = findVendor(audit, cancelMatch[1]);
    if (vendor) {
      const risk = vendor.risk;
      const possible = vendor.cancellationDeadline !== null;
      const deadlinePassed = risk ? risk.daysToDeadline < 0 : false;

      const lines: string[] = [];
      lines.push(`**${vendor.name} - cancellation review**`);
      lines.push("");
      lines.push(`Contract: ${money(vendor.contractValue)}/yr · ${vendor.category} · auto-renew ${vendor.autoRenew ? "ON" : "OFF"}`);
      if (possible) {
        lines.push(
          `Cancellation is ${deadlinePassed ? "**past** the deadline" : `**possible** - deadline ${risk ? `${risk.daysToDeadline} days from now` : ""}`}`
        );
        if (deadlinePassed) {
          lines.push(
            `The cancellation window closed ${Math.abs(risk?.daysToDeadline ?? 0)} days ago. You can still try a goodwill cancellation, but the vendor is not obligated to honor it.`
          );
        } else {
          lines.push(
            `Notice period: ${risk ? risk.noticePeriodDays : "per agreement"} days. We'll send the cancellation notice to the vendor's billing contact.`
          );
        }
      } else {
        lines.push("This agreement has no fixed term and can be cancelled with notice.");
      }
      lines.push("");
      lines.push("Here's the notice I've drafted. Nothing is sent until you confirm:");

      return {
        content: lines.join("\n"),
        approval: {
          action: "cancel_contract",
          vendorId: vendor.id,
          vendorName: vendor.name,
          to: vendorContact(vendor),
          subject: `Notice of cancellation - ${vendor.name} agreement`,
          body: cancellationDraft(vendor, senderName),
        },
        vendors: [{ id: vendor.id, name: vendor.name }],
      };
    }
    return {
      content:
        "I couldn't find a vendor matching that name in your portfolio. Try the full name (e.g. “cancel our Adobe contract”) or check the Vendors page.",
      vendors: [],
    };
  }

  /* ---------- summarize / read vendor emails ---------- */
  if (/(summarize|summary|what.*emails|read|inbox|correspondence|threads|recent mail)/.test(lower) && /vendor|from|with|emails|mail|thread/.test(lower)) {
    const vendor = findVendor(audit, lower.replace(/summarize|summary|read|emails|mail|threads|correspondence|from|with|about|recent|inbox|the|vendor/g, ""));
    if (vendor) {
      const summary = summarizeThreads(threads, vendor);
      if (summary) {
        return {
          content: `Here's the correspondence I found from **${vendor.name}** (${threads.filter((t) => t.vendorId === vendor.id).length} thread${threads.filter((t) => t.vendorId === vendor.id).length === 1 ? "" : "s"}):\n\n${summary}\n\n**Action required:** ${
            threads.some((t) => t.vendorId === vendor.id && t.unread && t.category === "renewal")
              ? "Yes - a renewal notice needs attention before the deadline."
              : "No urgent action - monitor the renewal date."
          }`,
          vendors: [{ id: vendor.id, name: vendor.name }],
        };
      }
      return {
        content: `I searched the inbox for **${vendor.name}** but didn't find vendor correspondence yet. Connect Gmail and rescan, or ask me to summarize a specific vendor.`,
        vendors: [{ id: vendor.id, name: vendor.name }],
      };
    }
  }

  /* ---------- draft a reply ---------- */
  if (/(draft|reply|respond|write.*back|email.*vendor)/.test(lower)) {
    const vendor = findVendor(audit, lower.replace(/draft|reply|respond|write|an?|email|to|vendor|back|negotiat|renegotiat/g, ""));
    if (vendor) {
      const draft = negotiationDraft(vendor, threads);
      if (draft) {
        const thread = threads.find((t) => t.vendorId === vendor.id && t.category === "negotiation");
        return {
          content: `I've drafted a reply to **${vendor.name}**'s renewal thread (${thread?.subject ?? "renewal quote"}). Review it below - I'll send it only after you approve.`,
          approval: {
            action: "send_email",
            vendorId: vendor.id,
            vendorName: vendor.name,
            to: thread?.sender ?? vendorContact(vendor),
            subject: `Re: ${thread?.subject ?? "Renewal"} - Vendrz`,
            body: draft,
          },
          vendors: [{ id: vendor.id, name: vendor.name }],
        };
      }
      return {
        content: `I can draft a reply to ${vendor.name}, but I don't see an active thread to reply to yet. Try "draft a reply to Slack" once a thread exists.`,
        vendors: [{ id: vendor.id, name: vendor.name }],
      };
    }
  }

  /* ---------- vendor status lookup ---------- */
  const vendor = findVendor(audit, lower);
  if (vendor) {
    const risk = vendor.risk;
    return {
      content: `**${vendor.name}** · ${vendor.category}\n\n- Contract value: ${money(
        vendor.contractValue
      )}/yr\n- Status: ${vendor.contractStatus.replace(/_/g, " ")}\n- Renewal: ${
        vendor.renewalDate ? new Date(vendor.renewalDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "No fixed term"
      }\n- Cancellation deadline: ${
        vendor.cancellationDeadline ? new Date(vendor.cancellationDeadline + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "-"
      }\n- Auto-renew: ${vendor.autoRenew ? "ON - no action = renewed" : "OFF"}\n- Risk: ${
        risk ? `${risk.level} (renews in ${risk.daysToRenewal} days)` : "None detected"
      }\n- Potential savings: ${money(vendor.potentialSavings)}/yr\n\nAsk me to cancel the contract, summarize their emails, or draft a reply.`,
      vendors: [{ id: vendor.id, name: vendor.name }],
    };
  }

  /* ---------- portfolio overview ---------- */
  if (/overview|summary|everything|all vendors|status|what.*(happening|due)/.test(lower)) {
    const atRisk = audit.vendors.filter((v) => v.risk).sort((a, b) => (a.risk?.daysToRenewal ?? 0) - (b.risk?.daysToRenewal ?? 0));
    const top = atRisk.slice(0, 3);
    return {
      content: `**Portfolio overview** - ${audit.vendorCount} vendors, ${money(
        audit.totalAnnualSpend
      )}/yr total spend, ${money(audit.potentialSavings)}/yr in potential savings.\n\n${
        top.length
          ? `Most urgent renewals:\n${top
              .map((v) => `• ${v.name} - renews in ${v.risk?.daysToRenewal} days (${v.risk?.level})`)
              .join("\n")}`
          : "No imminent renewal risks."
      }\n\nI can go deeper on any vendor: status, emails, cancellation, or a draft reply.`,
      vendors: top.map((v) => ({ id: v.id, name: v.name })),
    };
  }

  /* ---------- generic ---------- */
  return {
    content:
      "I'm your vendor-management agent. I can:\n\n• **Check a vendor** - “what's the status on Datadog?”\n• **Cancel a contract** - “cancel our Adobe contract”\n• **Summarize emails** - “summarize vendor emails from AWS”\n• **Draft a reply** - “draft a reply to Slack about the renewal quote”\n\nI'll always show you exactly what would be sent and require your confirmation before any email goes out.",
    vendors: [],
  };
}

/** Human-readable outcome when an approval is confirmed (for the activity log). */
export function approvalOutcome(
  action: "send_email" | "cancel_contract",
  vendorName: string,
  to: string
): { title: string; detail: string } {
  if (action === "cancel_contract") {
    return {
      title: `Cancellation notice sent to ${vendorName}`,
      detail: `Sent to ${to} - vendor status will be updated to reflect the pending cancellation.`,
    };
  }
  return {
    title: `Reply sent to ${vendorName}`,
    detail: `Sent to ${to} via the connected inbox.`,
  };
}
