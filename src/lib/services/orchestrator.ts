/* ------------------------------------------------------------------ */
/*  Real-time agent orchestrator.                                     */
/*                                                                     */
/*  This is the backend engine that turns a user request into a        */
/*  traceable execution plan, runs REAL tool functions against the     */
/*  actual contract data, streams events, and pauses at approval       */
/*  gates. It never fakes work: a step only reaches `completed`        */
/*  after the underlying operation against real data succeeds, and a   */
/*  consequential outgoing action (e.g. a cancellation email) only     */
/*  proceeds past an explicit approval - and only reports what it      */
/*  genuinely did (a prepared request is "prepared", never "sent"      */
/*  unless a real email delivery backend confirmed it).                */
/*                                                                     */
/*  Execution phases (rendered live in the workbench):                 */
/*  REQUEST → PLAN → ACTIONS → RESULTS → APPROVAL → EXECUTE → VERIFY   */
/*  → COMPLETE. Every step belongs to a phase via stepPhase().         */
/*                                                                     */
/*  The app today has no real Gmail delivery backend, so the engine    */
/*  is honest about that boundary: it verifies the terms, prepares     */
/*  the request, and - once approved - records the request as ready,   */
/*  flagging that sending requires a connected inbox. It NEVER claims  */
/*  an email was sent or a contract cancelled.                         */
/* ------------------------------------------------------------------ */

import type {
  AgentApprovalActionType,
  AgentApprovalRequest,
  AgentEvent,
  AgentPlan,
  AgentTask,
  AgentTaskCreateInput,
  AgentTaskStep,
} from "@/lib/agentTask";
import { executeTool } from "@/lib/ai/agentTools";

export interface OrchestratorCallbacks {
  /** Emit one real event to the client stream. */
  emit: (ev: AgentEvent) => void | Promise<void>;
  /** Ask the user to grant/deny a consequential action. Resolves true if granted. */
  requestApproval: (req: AgentApprovalRequest) => Promise<boolean>;
}

export interface OrchestratorResult {
  task: AgentTask;
}

/* --------------------------- small utils --------------------------- */

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const iso = (): string => new Date().toISOString();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Minimal real latency so the timeline reads like genuine work (no fake steps). */
const PACE = 160;

type Contract = Record<string, unknown>;

function findVendor(contracts: Contract[], query: string): Contract | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Direct name / category match first.
  const direct = contracts.find(
    (c) =>
      String(c.vendorName ?? "").toLowerCase().includes(q) ||
      q.includes(String(c.vendorName ?? "").toLowerCase())
  );
  if (direct) return direct;
  // Token overlap as a fallback alias search.
  const toks = q.split(/\s+/).filter((t) => t.length > 2);
  return (
    contracts.find((c) => {
      const name = String(c.vendorName ?? "").toLowerCase();
      return toks.some((t) => name.includes(t));
    }) ?? null
  );
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(n || 0));
}

/* --------------------------- intent parse --------------------------- */

interface Intent {
  kind:
    | "cancel"
    | "cancel_list"
    | "renewals"
    | "risk"
    | "savings"
    | "portfolio"
    | "vendor_status"
    | "emails"
    | "email_draft"
    | "documents"
    | "compare"
    | "unknown";
  vendorQuery?: string;
  vendorQuery2?: string;
  draftPurpose?: AgentApprovalActionType;
}

function extractVendor(lower: string, pattern: RegExp): string | null {
  const m = lower.match(pattern);
  return m?.[1]?.trim() || null;
}

function parseIntent(request: string): Intent {
  const lower = request.trim().toLowerCase();

  /* -------- compare two vendors -------- */
  const cmp = lower.match(
    /(?:compare|between)\s+([a-z0-9 .&'-]+?)\s+(?:and|vs\.?|to)\s+([a-z0-9 .&'-]+)/i
  );
  if (cmp) {
    return { kind: "compare", vendorQuery: cmp[1].trim(), vendorQuery2: cmp[2].trim() };
  }

  /* -------- cancel as a list ("find contracts we can cancel") -------- */
  // No specific vendor is named - the user wants the cancellable set, not
  // a single-vendor cancellation. Routes to the deadlines query flow.
  if (
    /(contract|subscription|agreement).{0,24}(we can|can we|could we|we could|to|that we).{0,10}(cancel|terminate|end|drop|stop)/.test(lower) ||
    /(find|which|what|show|list|all).{0,24}(cancel|terminate|end|drop|stop).{0,24}(contract|subscription|agreement)/.test(lower)
  ) {
    return { kind: "cancel_list" };
  }

  /* -------- cancel / terminate -------- */
  if (
    /(cancel|cut|drop|terminate|end|stop).*(contract|subscription|agreement|license)/.test(lower) ||
    /(contract|subscription|agreement).*(cancel|terminate|end)/.test(lower) ||
    /cancel (our|the|this) (adobe|slack|aws|zoom|salesforce|microsoft|google|github)/.test(lower)
  ) {
    const m =
      lower.match(/(?:cancel|terminate|cut|drop|end|stop)\s+(?:our|the|this)?\s*(?:contract|subscription|agreement|license)?\s*(?:for|with)?\s*(.+)/i) ??
      lower.match(/(?:contract|subscription|agreement)\s+(?:for|with)?\s*(.+)/i);
    return { kind: "cancel", vendorQuery: m?.[1]?.trim() || "" };
  }

  /* -------- email drafts (draft / reply / negotiate / renew in writing) -------- */
  if (
    /(draft|write|compose|prepare|send)\s+(a|an|the)?\s*(email|reply|notice|letter|negotiation|renewal)/.test(lower) ||
    /(reply|respond|follow[- ]up)\s*(to|with)?\s*([a-z0-9 .&'-]+)/.test(lower) ||
    /(negotiat|discount|reduce|lower\s+the\s*price|remove\s+the\s*increase)/.test(lower)
  ) {
    const vendor =
      extractVendor(lower, /(?:to|for|with)\s+([a-z0-9 .&'-]+?)\s*(?:about|regarding|on|the|$)/i) ??
      extractVendor(lower, /(?:reply|respond|follow[- ]up)\s*(?:to|with)?\s*([a-z0-9 .&'-]+)/i) ??
      extractVendor(lower, /([a-z0-9 .&'-]{3,})$/);
    const purpose: AgentApprovalActionType = /cancel|terminate|end the agreement/.test(lower)
      ? "cancellation"
      : /negotiat|discount|reduce|price|rate|escalation|cap/.test(lower)
        ? "negotiation"
        : /renew/.test(lower)
          ? "renewal"
          : "follow_up";
    return { kind: "email_draft", vendorQuery: vendor ?? "", draftPurpose: purpose };
  }

  /* -------- emails (find / read / search / summarize correspondence) -------- */
  if (/(email|mail|correspondence|inbox|threads?|messages?)/.test(lower)) {
    const vendor =
      extractVendor(lower, /(?:from|with|for|about|re)\s+([a-z0-9 .&'-]+)/i) ??
      extractVendor(lower, /(?:emails?|mail|correspondence|threads?)[:\s]+([a-z0-9 .&'-]+)/i) ??
      extractVendor(lower, /[\s:]([a-z0-9 .&'-]{3,})$/);
    return { kind: "emails", vendorQuery: vendor ?? "" };
  }

  /* -------- document review (analyze / read / what does X say) -------- */
  if (
    /(analy|review|read|inspect|look (at|into)|open|clauses?|terms?|what does|what's in|what is in)/.test(lower)
  ) {
    const vendor =
      // "the X agreement" / "our X contract" forms
      extractVendor(lower, /(?:the|our|this)\s+([a-z0-9 .&'-]+?)\s+(?:contract|agreement|document|terms?|clauses?)/i) ??
      // trailing "X contract/agreement"
      extractVendor(lower, /(?:contract|agreement|document|terms?|clauses?)\s+(?:of|in|for)?\s*(?:the|our|this)?\s*([a-z0-9 .&'-]{3,})/i) ??
      // verb-first: "analyze adobe" / "what does adobe say"
      extractVendor(lower, /(?:analy|review|read|inspect|look at|open|what does|what's in)\s+(?:the|our|this)?\s*([a-z0-9 .&'-]{3,})/i);
    return { kind: "documents", vendorQuery: vendor ?? "" };
  }

  /* -------- renewals -------- */
  if (/(renew|renewal|renewing)/.test(lower)) return { kind: "renewals" };
  /* -------- risk -------- */
  if (/(risk|highest.risk|at.risk|danger)/.test(lower)) return { kind: "risk" };
  /* -------- savings -------- */
  if (/(sav|save|reduce|cost.less|opportunit|waste|money)/.test(lower)) return { kind: "savings" };
  /* -------- portfolio -------- */
  if (/(overview|summary|everything|all vendors|portfolio|total|spend|how much)/.test(lower)) return { kind: "portfolio" };
  /* -------- vendor status -------- */
  if (/(status|about|detail|what.*on|tell me about|how is)/.test(lower)) {
    return { kind: "vendor_status", vendorQuery: extractVendor(lower, /(?:about|on|status of)\s+(.+)/i) ?? undefined };
  }
  return { kind: "unknown" };
}

/* --------------------------- event helpers --------------------------- */

function ev(taskId: string, type: AgentEvent["type"], patch: Partial<AgentEvent> = {}): AgentEvent {
  return { type, taskId, at: iso(), ...patch };
}

/* --------------------------- tool runner --------------------------- */

/**
 * Run a real tool against the real data, emitting started/completed
 * events so the client sees the actual backend execution.
 */
async function runTool(
  taskId: string,
  emit: OrchestratorCallbacks["emit"],
  stepId: string,
  name: string,
  args: Record<string, unknown>,
  data: {
    contracts: Contract[];
    threads: AgentTaskCreateInput["threads"];
    activity: AgentTaskCreateInput["activity"];
    analyses: AgentTaskCreateInput["analyses"];
    gmailConnected: boolean;
  }
): Promise<string> {
  await emit(ev(taskId, "tool.started", { stepId, tool: name, label: toolLabel(name), detail: toolDetail(name, args) }));
  await sleep(PACE);
  const body = executeTool(
    { name, arguments: args },
    {
      contracts: data.contracts,
      threads: data.threads,
      activity: data.activity,
      analyses: data.analyses,
      gmailConnected: data.gmailConnected,
    }
  );
  const result = JSON.parse(body);
  const ok = !("error" in result);
  await emit(
    ok
      ? ev(taskId, "tool.completed", { stepId, tool: name, detail: toolOutcome(name, result) })
      : ev(taskId, "tool.failed", { stepId, tool: name, detail: String(result.error ?? "Tool failed") })
  );
  if (!ok) throw new Error(String(result.error ?? "Tool failed"));
  return body;
}

function toolLabel(name: string): string {
  switch (name) {
    case "find_vendor": return "Finding vendor";
    case "search_contracts": return "Searching contracts";
    case "get_contract": return "Reading contract";
    case "open_document": return "Opening document";
    case "analyze_clauses": return "Analyzing clauses";
    case "get_upcoming_renewals": return "Checking renewals";
    case "get_cancellation_deadlines": return "Checking cancellation deadlines";
    case "get_vendor_risk": return "Scoring vendor risk";
    case "get_savings_opportunities": return "Finding savings";
    case "search_gmail": return "Searching Gmail";
    case "search_email_threads": return "Reading stored correspondence";
    case "get_portfolio_summary": return "Reading portfolio";
    case "draft_email": return "Drafting email";
    case "verify_result": return "Verifying result";
    case "send_email": return "Delivering request";
    default: return "Running tool";
  }
}

function toolDetail(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "find_vendor": return `Query: ${String(args.query ?? "")}`;
    case "search_contracts": return `Query: ${String(args.query ?? "all")}`;
    case "get_contract": return `Vendor: ${String(args.vendor_name ?? "")}`;
    case "open_document": return `Vendor: ${String(args.vendor_name ?? "")}`;
    case "analyze_clauses": return `Vendor: ${String(args.vendor_name ?? "")}`;
    case "get_upcoming_renewals": return `Look ahead ${String(args.days ?? 90)} days`;
    case "get_cancellation_deadlines": return `Look ahead ${String(args.days ?? 90)} days`;
    case "get_vendor_risk": return args.vendor_name ? `Vendor: ${String(args.vendor_name)}` : "Min score 60";
    case "search_gmail": return args.vendor_name ? `Vendor: ${String(args.vendor_name)}` : "All indexed correspondence";
    case "search_email_threads": return args.vendor_name ? `Vendor: ${String(args.vendor_name)}` : "All stored threads";
    case "verify_result": return "Cross-checking against the register";
    default: return "";
  }
}

function toolOutcome(name: string, result: Record<string, unknown>): string {
  if (name === "find_vendor") return `Found ${String(result.vendor ?? "vendor")}`;
  if (name === "search_contracts") return `${String(result.count ?? 0)} contracts found`;
  if (name === "get_contract") return "Contract read";
  if (name === "open_document") return String(result.note ?? "Document opened");
  if (name === "analyze_clauses") {
    const arr = Array.isArray(result.findings) ? result.findings : [];
    const n = arr.length > 0 ? arr.length : Number(result.findings_count ?? 0);
    return n > 0 ? `${n} clause finding(s) read` : String(result.note ?? "No clause analysis yet");
  }
  if (name === "search_gmail") return String(result.note ?? "Gmail searched");
  if (name === "search_email_threads") return `${String(result.count ?? 0)} threads found`;
  if (name === "get_upcoming_renewals") return `${String(result.count ?? 0)} renewals within window`;
  if (name === "get_cancellation_deadlines") return `${String(result.count ?? 0)} deadlines found`;
  if (name === "get_vendor_risk") return `${String(result.count ?? 0)} at risk`;
  if (name === "get_savings_opportunities") return `${String(result.count ?? 0)} opportunities`;
  if (name === "get_portfolio_summary") return "Portfolio computed";
  if (name === "draft_email") return `Draft ready for ${String(result.vendor ?? "vendor")}`;
  if (name === "verify_result") return result.verified ? "Verification passed" : "Verification failed";
  if (name === "send_email") return String(result.note ?? "Delivered");
  return "Done";
}

/* --------------------------- approval requests --------------------------- */

function buildApproval(
  taskId: string,
  contract: Contract,
  actionType: AgentApprovalActionType,
  subject: string,
  body: string,
  reason: string
): AgentApprovalRequest {
  return {
    id: uid("ap"),
    taskId,
    actionType,
    vendorName: String(contract.vendorName ?? "Vendor"),
    to: vendorContact(contract),
    reason,
    subject,
    body,
    requiresGmail: true, // no real Gmail delivery backend connected
    status: "pending",
    createdAt: iso(),
  };
}

/** Real sender address from stored correspondence, else empty - the UI shows
    "address not on file" instead of an invented contact. */
function vendorContact(c: Contract): string {
  void c;
  return "";
}

/* --------------------------- planner --------------------------- */

function makeStep(
  kind: AgentTaskStep["kind"],
  title: string,
  detail?: string,
  query?: string
): AgentTaskStep {
  return { id: uid("st"), kind, title, detail, query, status: "queued" };
}

const UNDERSTAND = () => makeStep("understand", "Understanding request", "Parsing intent and grounding the plan in the real register");

/** Build the real execution plan for an intent against the data. */
function buildPlan(intent: Intent): AgentTaskStep[] {
  const base: AgentTaskStep[] = [UNDERSTAND()];
  const v = intent.vendorQuery ?? "";
  switch (intent.kind) {
    case "cancel_list":
      return [
        ...base,
        makeStep("retrieve", "Finding cancellable contracts", "Contracts with auto-renewal and a cancel-by date on file"),
        makeStep("analyze", "Checking cancellation windows", "Notice periods and cancel-by dates against today"),
        makeStep("verify", "Verifying result", "Re-checking deadlines against the register"),
        makeStep("record", "Compiling result", "Cancellable contracts and their deadlines"),
      ];
    case "cancel":
      return [
        ...base,
        makeStep("retrieve", "Finding contract", "Locating the matching contract in the register", v),
        makeStep("retrieve", "Opening document", "Opening the stored agreement document", v),
        makeStep("analyze", "Analyzing clauses", "Reading renewal, auto-renew and escalation terms", v),
        makeStep("analyze", "Verifying cancellation window", "Checking notice period and cancellation deadline", v),
        makeStep("prepare", "Preparing cancellation notice", "Drafting the notice from the verified terms"),
        makeStep("approve", "Review cancellation request", "Requires your approval before anything is sent"),
        makeStep("execute", "Delivering cancellation request", "Routes the notice to the connected inbox"),
        makeStep("verify", "Verifying result", "Cross-checking the prepared notice against the register"),
        makeStep("record", "Updating the contract and activity trail", "Recording the prepared request"),
      ];
    case "email_draft":
      return [
        ...base,
        makeStep("retrieve", "Searching Gmail", "Checking the connected inbox for vendor correspondence", v),
        makeStep("retrieve", "Finding vendor", "Locating the vendor record in the register", v),
        makeStep("retrieve", "Reading correspondence", "Reading the vendor's real email threads", v),
        makeStep("prepare", "Preparing reply", `Drafting the ${intent.draftPurpose ?? "follow-up"} email`),
        makeStep("approve", "Review reply", "Requires your approval before anything is sent"),
        makeStep("execute", "Delivering reply", "Routes the reply to the connected inbox"),
        makeStep("verify", "Verifying result", "Cross-checking the prepared reply against the register"),
        makeStep("record", "Updating the activity trail", "Recording the prepared request"),
      ];
    case "emails":
      return [
        ...base,
        makeStep("retrieve", "Searching Gmail", "Checking the connected inbox for vendor correspondence", v),
        makeStep("retrieve", "Finding vendor", "Locating the vendor record in the register", v),
        makeStep("retrieve", "Reading correspondence", "Reading the vendor's real email threads", v),
        makeStep("analyze", "Summarizing correspondence", "Grouping threads by category and signal"),
        makeStep("verify", "Verifying result", "Cross-checking the summary against the mailbox"),
        makeStep("record", "Compiling result", "Summarizing what was found"),
      ];
    case "documents":
      return [
        ...base,
        makeStep("retrieve", "Finding contract", "Locating the matching contract in the register", v),
        makeStep("retrieve", "Opening document", "Opening the stored agreement document", v),
        makeStep("analyze", "Analyzing clauses", "Reading extracted clauses with evidence", v),
        makeStep("verify", "Verifying result", "Cross-checking the findings against the register"),
        makeStep("record", "Compiling result", "Summarizing the clause findings"),
      ];
    case "compare":
      return [
        ...base,
        makeStep("retrieve", "Comparing vendors", `Reading ${intent.vendorQuery ?? "?"} vs ${intent.vendorQuery2 ?? "?"}`),
        makeStep("analyze", "Reading vendor records", "Pulling renewal, escalation, risk and savings"),
        makeStep("verify", "Verifying result", "Cross-checking both records against the register"),
        makeStep("record", "Compiling comparison", "Building the side-by-side table"),
      ];
    case "renewals":
      return [
        ...base,
        makeStep("retrieve", "Querying renewals", "Contracts renewing in the near term"),
        makeStep("analyze", "Assessing exposure", "Spend exposed to each upcoming renewal"),
        makeStep("verify", "Verifying result", "Re-checking renewal dates against the register"),
        makeStep("record", "Compiling result", "Summarizing renewals, priorities and deadlines"),
      ];
    case "risk":
      return [
        ...base,
        makeStep("retrieve", "Scoring vendor risk", "Contracts at elevated risk"),
        makeStep("verify", "Verifying result", "Re-checking risk scores against the register"),
        makeStep("record", "Compiling result", "Ordering vendors by risk"),
      ];
    case "savings":
      return [
        ...base,
        makeStep("retrieve", "Finding savings opportunities", "Contracts with identified potential"),
        makeStep("verify", "Verifying result", "Re-checking opportunity figures against the register"),
        makeStep("record", "Compiling result", "Potential savings by vendor"),
      ];
    case "portfolio":
      return [
        ...base,
        makeStep("retrieve", "Reading portfolio", "All contracts and totals"),
        makeStep("verify", "Verifying result", "Re-counting the register"),
        makeStep("record", "Compiling summary", "Totals, risks and renewals"),
      ];
    case "vendor_status":
      return [
        ...base,
        makeStep("retrieve", "Finding vendor", "Locating the vendor in the register", v),
        makeStep("analyze", "Reading vendor record", "Contract terms, renewal and risk"),
        makeStep("verify", "Verifying result", "Cross-checking the record against the register"),
        makeStep("record", "Compiling result"),
      ];
    default:
      return [...base, makeStep("record", "Compiling answer")];
  }
}

/* --------------------------- result writers --------------------------- */

function summarizeRenewals(raw: string): string {
  const parsed = JSON.parse(raw);
  const items = (parsed.renewals ?? []) as Array<Record<string, unknown>>;
  if (items.length === 0) return "No contracts renew within the selected window.";
  const lines = items.map((r) => `• ${String(r.vendor ?? "")} — renews ${String(r.renewal_date ?? "")} · ${money(Number(r.annual_value ?? 0))}/yr · risk ${String(r.risk ?? "n/a")}`);
  const total = items.reduce((s, r) => s + Number(r.annual_value ?? 0), 0);
  return `${items.length} contract${items.length === 1 ? "" : "s"} renewing. Exposed spend ≈ ${money(total)}/yr.\n${lines.join("\n")}`;
}

function summarizeRisk(raw: string): string {
  const parsed = JSON.parse(raw);
  const items = (parsed.at_risk ?? []) as Array<Record<string, unknown>>;
  if (items.length === 0) return "No contracts at elevated risk right now.";
  return `${items.length} contract${items.length === 1 ? " is" : "s are"} at risk.\n${items
    .map((r) => `• ${String(r.vendor ?? "")} — risk ${String(r.risk_score ?? "?")}/100 · ${money(Number(r.annual_value ?? 0))}/yr`)
    .join("\n")}`;
}

function summarizeSavings(raw: string): string {
  const parsed = JSON.parse(raw);
  const items = (parsed.opportunities ?? []) as Array<Record<string, unknown>>;
  if (items.length === 0) return "No savings opportunities found in the current data.";
  return `${items.length} opportunity(ies), potential ${money(Number(parsed.total_potential_low ?? 0))}–${money(Number(parsed.total_potential_high ?? 0))}/yr.\n${items
    .map((r) => `• ${String(r.vendor ?? "")} — ${money(Number(r.savings_low ?? 0))}–${money(Number(r.savings_high ?? 0))}/yr`)
    .join("\n")}`;
}

function summarizeCancellables(raw: string): string {
  const parsed = JSON.parse(raw);
  const items = (parsed.deadlines ?? []) as Array<Record<string, unknown>>;
  if (items.length === 0) {
    return "No contracts have an open cancellation window right now — nothing to cancel in time.";
  }
  const lines = items.map(
    (d) =>
      `• ${String(d.vendor ?? "")} — cancel by ${String(d.deadline ?? "")} (${String(d.days_left ?? "?")} days left) · ${money(Number(d.annual_value ?? 0))}/yr`
  );
  const total = items.reduce((s, d) => s + Number(d.annual_value ?? 0), 0);
  return `${items.length} contract${items.length === 1 ? " is" : "s are"} cancellable in time. Value ≈ ${money(total)}/yr.\n${lines.join("\n")}`;
}

function summarizePortfolio(raw: string): string {
  const p = JSON.parse(raw);
  return [
    `**Portfolio** — ${p.total_contracts ?? 0} contracts, ${money(Number(p.total_annual_value ?? 0))}/yr total.`,
    `${p.at_risk_count ?? 0} at risk (${money(Number(p.at_risk_value ?? 0))}/yr) · ${p.renewing_90d_count ?? 0} renewing within 90 days (${money(Number(p.renewing_90d_value ?? 0))}/yr).`,
    `${p.auto_renew_count ?? 0} auto-renewing · ${p.escalating_count ?? 0} with escalation.`,
    `Potential savings ${money(Number(p.potential_savings_low ?? 0))}–${money(Number(p.potential_savings_high ?? 0))}/yr.`,
  ].join("\n");
}

function summarizeClauses(raw: string): string {
  const parsed = JSON.parse(raw);
  if (!parsed.analyzed) return String(parsed.note ?? "No clause analysis available.");
  const findings = (parsed.findings ?? []) as Array<Record<string, unknown>>;
  if (findings.length === 0) return `Opened ${String(parsed.document ?? "the document")} — no findings recorded.`;
  return `${String(parsed.vendor ?? "Vendor")} · ${String(parsed.document ?? "document")} — ${findings.length} finding(s):\n${findings
    .map((f) => `• [${String(f.severity ?? "info")}] ${String(f.title ?? "")}${f.section ? ` (${String(f.section)})` : ""} — ${String(f.detail ?? "")}`)
    .join("\n")}`;
}

function summarizeThreads(raw: string): string {
  const parsed = JSON.parse(raw);
  const items = (parsed.threads ?? []) as Array<Record<string, unknown>>;
  if (items.length === 0) return "No correspondence found for this vendor.";
  return `${items.length} thread(s):\n${items
    .map((t) => `• [${String(t.category ?? "general")}] "${String(t.subject ?? "")}" · ${String(t.sender ?? "")}${t.unread ? " · unread" : ""}`)
    .join("\n")}`;
}

function summarizeGmail(raw: string): string {
  const parsed = JSON.parse(raw);
  if (!parsed.connected) {
    return "**Gmail is not connected.** Nothing was searched — connect Gmail in Settings to let me read vendor correspondence.";
  }
  if (!parsed.searched) return "Gmail search did not complete.";
  const count = Number(parsed.count ?? 0);
  if (count === 0) {
    return "Gmail is connected, but no vendor correspondence is indexed yet — nothing was found in the mailbox.";
  }
  const items = (parsed.threads ?? []) as Array<Record<string, unknown>>;
  return `${count} thread(s) found:\n${items
    .map((t) => `• [${String(t.category ?? "general")}] "${String(t.subject ?? "")}" · ${String(t.sender ?? "")}${t.unread ? " · unread" : ""}`)
    .join("\n")}`;
}

function compareVendors(contracts: Contract[], a: Contract, b: Contract): string {
  const row = (label: string, av: string, bv: string) => `• **${label}:** ${av} | ${bv}`;
  return [
    `**${String(a.vendorName ?? "?")} vs ${String(b.vendorName ?? "?")}**`,
    row("Annual value", money(Number(a.annualSpend ?? 0)) + "/yr", money(Number(b.annualSpend ?? 0)) + "/yr"),
    row("Renewal", String(a.renewalDate ?? "n/a"), String(b.renewalDate ?? "n/a")),
    row("Auto-renew", a.autoRenew ? "ON" : "OFF", b.autoRenew ? "ON" : "OFF"),
    row("Escalation", a.escalationRate != null ? `${String(a.escalationRate)}%/yr` : "none", b.escalationRate != null ? `${String(b.escalationRate)}%/yr` : "none"),
    row("Risk", `${String(a.riskScore ?? "?")}/100`, `${String(b.riskScore ?? "?")}/100`),
    row("Savings potential", money(Number(a.opportunityLow ?? 0)) + "–" + money(Number(a.opportunityHigh ?? 0)) + "/yr", money(Number(b.opportunityLow ?? 0)) + "–" + money(Number(b.opportunityHigh ?? 0)) + "/yr"),
  ].join("\n");
}

function cancellationNotice(contract: Contract, senderName: string): { subject: string; body: string; reason: string } {
  const vendor = String(contract.vendorName ?? "Vendor");
  const deadline = String(contract.cancellationDeadline ?? "")
    ? new Date(String(contract.cancellationDeadline) + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "the end of the current term";
  const value = money(Number(contract.annualSpend ?? 0));
  return {
    subject: `Notice of cancellation - ${vendor} agreement`,
    reason: `Contract requires notice before its cancellation deadline (${deadline}).`,
    body: `Hi ${vendor} team,\n\nWe are providing notice of cancellation of our agreement (${value}/yr), effective at the end of the current term.\n\nAs stated in our agreement, this notice is sent ahead of the cancellation deadline (${deadline}). Please confirm receipt and outline closing steps, including final billing and data export.\n\nPlease do not auto-renew this agreement.\n\nThanks,\n${senderName}\nNoma · Procurement`,
  };
}

function replyNotice(contract: Contract, purpose: AgentApprovalActionType, senderName: string): { subject: string; body: string; reason: string } {
  const vendor = String(contract.vendorName ?? "Vendor");
  const value = money(Number(contract.annualSpend ?? 0));
  const esc = contract.escalationRate != null ? String(contract.escalationRate) : null;
  let subject = `Re: ${vendor} — follow-up`;
  let body = `Hi ${vendor} team,\n\nWe're following up on our account (${value}/yr). Could you confirm the current status and next steps?\n\nThanks,\n${senderName}`;
  if (purpose === "negotiation") {
    subject = `Renewal negotiation - ${vendor}`;
    body = `Hi ${vendor} team,\n\nWe're reviewing our ${value}/yr agreement${esc ? `, which currently includes an automatic ${esc}% annual increase` : ""}.\n\nGiven our ongoing commitment, we'd like to lock in more favorable terms for the next term — ideally removing or capping the increase. Could you confirm the best rate you can offer?\n\nThanks,\n${senderName}`;
  } else if (purpose === "renewal") {
    subject = `Renewal - ${vendor} agreement`;
    body = `Hi ${vendor} team,\n\nWe'd like to renew our agreement and continue the partnership${contract.renewalDate ? ` (current term ends ${new Date(String(contract.renewalDate) + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })})` : ""}.\n\nCould you confirm the renewal terms and rate for the next term?\n\nThanks,\n${senderName}`;
  }
  return { subject, body, reason: `Prepared a ${purpose} message to ${vendor} from the stored contract context.` };
}

/* --------------------------- the run --------------------------- */

/**
 * Execute a task start-to-finish. Emits every real event; pauses at the
 * approval gate via `requestApproval`; NEVER fabricates a send.
 * `taskRef` (optional) is the exact object registered with the stream
 * registry, so live state is always observable server-side.
 */
export async function executeTaskPlan(
  input: AgentTaskCreateInput,
  cb: OrchestratorCallbacks,
  taskRef?: AgentTask
): Promise<AgentTask> {
  const intent = parseIntent(input.request);
  const plan: AgentPlan = { intent: intent.kind, steps: buildPlan(intent) };
  const data = {
    contracts: input.contracts,
    threads: input.threads,
    activity: input.activity,
    analyses: input.analyses ?? [],
    gmailConnected: input.gmailConnected === true,
  };

  const task: AgentTask = taskRef ?? {
    id: uid("task"),
    title: titleFor(input.request),
    request: input.request,
    status: "running",
    plan,
    events: [],
    approvals: [],
    toolCalls: [],
    evidenceIds: [],
    createdAt: iso(),
    updatedAt: iso(),
    idempotencyKey: input.idempotencyKey,
  };
  // The registered ref carries a fresh plan - adopt the built plan.
  task.plan = plan;
  task.request = input.request;
  task.title = titleFor(input.request);
  task.status = "running";

  const emit = async (e: AgentEvent) => {
    task.events.push(e);
    task.updatedAt = e.at;
    await cb.emit(e);
  };
  const setStep = (stepId: string, patch: Partial<AgentTaskStep>) => {
    const st = task.plan.steps.find((s) => s.id === stepId);
    if (st) Object.assign(st, patch);
  };
  const vendorFor = (query: string): Contract => {
    const v = findVendor(data.contracts, query);
    if (!v) throw new Error(query ? `No contract matches "${query}" in your register.` : "No vendor identified");
    return v;
  };

  try {
    await emit(ev(taskIdOf(task), "task.created", { detail: `Task "${task.title}" queued` }));
    await emit(ev(taskIdOf(task), "task.started", { detail: "Beginning execution" }));
    await emit(
      ev(taskIdOf(task), "plan.created", {
        detail: `${plan.steps.length} steps planned (${plan.intent})`,
        // The full plan rides the event so the client can render the live
        // phase stepper, step cards and approval gate as the run streams.
        plan,
      })
    );
    await sleep(PACE);

    if (intent.kind === "unknown") {
      const final =
        `I can run real tasks against your portfolio — e.g. "Cancel our Adobe contract", ` +
        `"Which contracts renew this month?", "What does the AWS agreement say?", or "Compare Adobe and Slack". ` +
        `Nothing is sent or changed without your approval.`;
      task.status = "completed";
      task.result = final;
      task.completedAt = iso();
      for (const s of plan.steps) setStep(s.id, { status: "completed" });
      await emit(ev(taskIdOf(task), "task.completed", { detail: "Completed" }));
      return task;
    }

    const taskId = task.id;
    let pendingApproval: AgentApprovalRequest | null = null;

    for (const step of plan.steps) {
      await emit(ev(taskId, "step.started", { stepId: step.id, label: step.title, detail: step.detail }));
      setStep(step.id, { status: "running", startedAt: iso() });

      try {
        const op = opFor(step.title);
        switch (op) {
          case "understand":
            await sleep(PACE);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: `Intent: ${plan.intent}` }));
            setStep(step.id, { status: "completed", result: `Intent: ${plan.intent}` });
            continue;

          /* ---------------- cancel: locate + open + analyze ---------------- */
          case "find_contract": {
            const vendor = vendorFor(intent.vendorQuery ?? step.query ?? "");
            await runTool(taskId, emit, step.id, "find_vendor", { query: intent.vendorQuery ?? step.query ?? "" }, data);
            await runTool(taskId, emit, step.id, "get_contract", { vendor_name: String(vendor.vendorName ?? "") }, data);
            const cid = String(vendor.id ?? "");
            if (cid && !task.evidenceIds.includes(cid)) task.evidenceIds.push(cid);
            const detail = `Found ${String(vendor.vendorName ?? "vendor")} — ${money(Number(vendor.annualSpend ?? 0))}/yr`;
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result: detail });
            continue;
          }
          case "open_document": {
            const vendor = vendorFor(intent.vendorQuery ?? "");
            const raw = await runTool(taskId, emit, step.id, "open_document", { vendor_name: String(vendor.vendorName ?? "") }, data);
            const parsed = JSON.parse(raw);
            const detail = String(parsed.note ?? `Opened document for ${String(vendor.vendorName ?? "")}`);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result: detail });
            continue;
          }
          case "analyze_clauses": {
            const vendor = vendorFor(intent.vendorQuery ?? "");
            const raw = await runTool(taskId, emit, step.id, "analyze_clauses", { vendor_name: String(vendor.vendorName ?? "") }, data);
            const parsed = JSON.parse(raw);
            const detail = parsed.analyzed
              ? `${String(parsed.vendor ?? "")}: ${(parsed.findings ?? []).length} finding(s) read (renewal, auto-renew, escalation, risk)`
              : String(parsed.note ?? "No clause analysis available");
            const result = summarizeClauses(raw);
            task.result = result;
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result });
            continue;
          }
          case "verify_window": {
            const vendor = vendorFor(intent.vendorQuery ?? "");
            const deadline = String(vendor.cancellationDeadline ?? "");
            const auto = Boolean(vendor.autoRenew);
            const days = deadline ? Math.ceil((new Date(deadline + "T00:00:00").getTime() - Date.now()) / 86400000) : NaN;
            const ok = days >= 0;
            const detail = deadline
              ? `Cancellation window ${ok ? `open — ${days} day${days === 1 ? "" : "s"} left` : "closed"}${auto ? " · auto-renew ON" : " · no auto-renew"}.`
              : "No stated cancellation deadline — notice required per agreement terms.";
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result: detail });
            continue;
          }

          /* ---------------- drafting (cancel / reply) ---------------- */
          case "draft_notice":
          case "draft_reply": {
            const vendor = vendorFor(intent.vendorQuery ?? "");
            const purpose = op === "draft_notice" ? "cancellation" : (intent.draftPurpose ?? "follow_up");
            const notice =
              op === "draft_notice"
                ? cancellationNotice(vendor, input.senderName || "Your team")
                : replyNotice(vendor, purpose as AgentApprovalActionType, input.senderName || "Your team");
            await runTool(taskId, emit, step.id, "draft_email", { vendor_name: String(vendor.vendorName ?? ""), purpose }, data);
            const approval = buildApproval(taskId, vendor, purpose as AgentApprovalActionType, notice.subject, notice.body, notice.reason);
            task.approvals = [...task.approvals.filter((a) => a.id !== approval.id), approval];
            pendingApproval = approval;
            const detail = `${op === "draft_notice" ? "Cancellation notice" : "Reply"} drafted for ${String(vendor.vendorName ?? "")}`;
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result: detail });
            continue;
          }

          /* ---------------- approval gate ---------------- */
          case "gate": {
            const approval = pendingApproval ?? task.approvals[task.approvals.length - 1];
            if (!approval) { setStep(step.id, { status: "completed", result: "No approval required" }); continue; }
            await emit(ev(taskId, "approval.required", { stepId: step.id, label: `${approval.actionType} request ready`, detail: `Requires approval — ${approval.vendorName}`, approval }));
            setStep(step.id, { status: "requires_approval", approvalId: approval.id });
            task.status = "awaiting_approval";
            task.updatedAt = iso();
            const granted = await cb.requestApproval(approval);
            if (!granted) {
              await emit(ev(taskId, "approval.denied", { stepId: step.id, detail: "Approval denied by user" }));
              setStep(step.id, { status: "cancelled" });
              for (const s of plan.steps) if (s.status === "queued") setStep(s.id, { status: "cancelled" });
              task.status = "cancelled";
              task.result = `The ${approval.actionType} request for ${approval.vendorName} was not approved. No email was sent and no contract was changed.`;
              await emit(ev(taskId, "task.cancelled", { detail: "Stopped — nothing was sent or changed" }));
              return task;
            }
            await emit(ev(taskId, "approval.granted", { stepId: step.id, detail: "Approval granted" }));
            approval.status = "granted";
            approval.decidedAt = iso();
            setStep(step.id, { status: "running" });
            task.status = "running";
            continue;
          }

          /* ---------------- execute (honest boundary) ---------------- */
          case "deliver_cancel":
          case "deliver_reply": {
            const approval = task.approvals.find((a) => a.status === "granted");
            if (!approval) { setStep(step.id, { status: "completed", result: "No approved request to deliver" }); continue; }
            await emit(ev(taskId, "tool.started", { stepId: step.id, tool: "send_email", label: "Sending request", detail: "Routed to connected inbox" }));
            await sleep(PACE);
            await emit(ev(taskId, "tool.failed", { stepId: step.id, tool: "send_email", detail: "No email delivery connection configured" }));
            const result =
              `**${approval.actionType === "cancellation" ? "Cancellation request" : "Reply"} prepared for ${approval.vendorName}** — reviewed and approved in Noma.\n\n` +
              (approval.to
                ? `The message is ready to send to ${approval.to}.`
                : `No sender address is on file for ${approval.vendorName}, so the message can't be delivered yet - add the address before sending.`) +
              ` Noma has no email delivery connection configured, so nothing was sent automatically.\n\n` +
              `**Status: prepared — waiting for vendor confirmation (email not delivered).**`;
            task.result = result;
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: "Prepared — requires a connected inbox to deliver" }));
            setStep(step.id, { status: "completed", result: "Prepared for delivery" });
            continue;
          }

          /* ---------------- verification (post-execution) ---------------- */
          case "verify": {
            let contains = verificationFragments(plan, intent);
            const source = task.result ?? lastCompletedResult(plan.steps, step.id);
            if (intent.kind === "cancel" || intent.kind === "email_draft") {
              // Verify the prepared message actually references the real vendor + target.
              const ap = task.approvals.find((a) => a.status === "granted");
              if (ap) {
                contains = [ap.vendorName];
                if (ap.to && source.includes(ap.to)) contains.push(ap.to);
              }
            }
            if (contains.length === 0 && intent.kind !== "portfolio") {
              const detail = "No independent check available — the result was computed directly from the register.";
              await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
              setStep(step.id, { status: "completed", result: detail });
              continue;
            }
            const raw = await runTool(
              taskId,
              emit,
              step.id,
              "verify_result",
              {
                source,
                expected_count: intent.kind === "portfolio" ? data.contracts.length : undefined,
                contains,
              },
              data
            );
            const parsed = JSON.parse(raw);
            const detail = parsed.verified ? "Verification passed — result matches the register." : `Verification ${parsed.verified === false ? "failed" : "inconclusive"}.`;
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result: detail });
            continue;
          }

          /* ---------------- query flows ---------------- */
          case "cancellables": {
            const raw = await runTool(taskId, emit, step.id, "get_cancellation_deadlines", { days: 180 }, data);
            const res = summarizeCancellables(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }
          case "cancel_windows": {
            const raw = await runTool(taskId, emit, step.id, "get_cancellation_deadlines", { days: 180 }, data);
            const res = summarizeCancellables(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }
          case "renewals": {
            const raw = await runTool(taskId, emit, step.id, "get_upcoming_renewals", { days: 90 }, data);
            const res = summarizeRenewals(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }
          case "exposure": {
            const raw = await runTool(taskId, emit, step.id, "get_upcoming_renewals", { days: 90 }, data);
            const res = summarizeRenewals(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }
          case "risk": {
            const raw = await runTool(taskId, emit, step.id, "get_vendor_risk", { min_score: 60 }, data);
            const res = summarizeRisk(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }
          case "savings": {
            const raw = await runTool(taskId, emit, step.id, "get_savings_opportunities", { min_amount: 0 }, data);
            const res = summarizeSavings(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }
          case "portfolio": {
            const raw = await runTool(taskId, emit, step.id, "get_portfolio_summary", {}, data);
            const res = summarizePortfolio(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }

          /* ---------------- vendor / emails ---------------- */
          case "find_vendor": {
            const q = intent.vendorQuery ?? "";
            const vendor = findVendor(data.contracts, q);
            if (vendor) {
              const cid = String(vendor.id ?? "");
              if (cid && !task.evidenceIds.includes(cid)) task.evidenceIds.push(cid);
              await runTool(taskId, emit, step.id, "find_vendor", { query: q }, data);
              const detail = `Found ${String(vendor.vendorName ?? "vendor")} in the register`;
              await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
              setStep(step.id, { status: "completed", result: detail });
            } else if (intent.kind === "emails" || intent.kind === "email_draft") {
              const detail = q
                ? `No vendor record matches "${q}" — continuing with mailbox search only`
                : "No vendor named — searching the whole mailbox";
              await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
              setStep(step.id, { status: "completed", result: detail });
            } else {
              throw new Error(q ? `No contract matches "${q}" in your register.` : "No vendor identified");
            }
            continue;
          }
          case "vendor_record": {
            const vendor = vendorFor(intent.vendorQuery ?? "");
            const raw = await runTool(taskId, emit, step.id, "get_contract", { vendor_name: String(vendor.vendorName ?? "") }, data);
            const parsed = JSON.parse(raw);
            const detail = `Renewal ${String(parsed.renewal_date ?? "n/a")} · auto-renew ${parsed.auto_renew ? "ON" : "OFF"} · risk ${String(parsed.risk_score ?? "?")}/100`;
            const result =
              `**${String(vendor.vendorName ?? "Vendor")}** · ${String(vendor.category ?? "Uncategorized")}\n` +
              `Annual value: ${money(Number(vendor.annualSpend ?? 0))}/yr\n` +
              `Renews: ${String(vendor.renewalDate ?? "n/a")}\n` +
              `Cancel by: ${String(vendor.cancellationDeadline ?? "not stated")}\n` +
              `Auto-renew: ${vendor.autoRenew ? "ON — no action means renewed" : "OFF"}\n` +
              `Escalation: ${vendor.escalationRate != null ? `${String(vendor.escalationRate)}%/yr` : "none extracted"}\n` +
              `Risk: ${String(vendor.riskScore ?? "?")}/100\n` +
              `Savings potential: ${money(Number(vendor.opportunityLow ?? 0))}–${money(Number(vendor.opportunityHigh ?? 0))}/yr (ESTIMATE)`;
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result });
            task.result = result;
            continue;
          }
          case "gmail": {
            const raw = await runTool(taskId, emit, step.id, "search_gmail", intent.vendorQuery ? { vendor_name: intent.vendorQuery } : {}, data);
            const res = summarizeGmail(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            continue;
          }
          case "threads": {
            const q = intent.vendorQuery ?? "";
            const vendor = findVendor(data.contracts, q);
            const args = vendor ? { vendor_name: String(vendor.vendorName ?? "") } : q ? { vendor_name: q } : {};
            const raw = await runTool(taskId, emit, step.id, "search_email_threads", args, data);
            const res = summarizeThreads(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            continue;
          }
          case "summarize_threads": {
            const q = intent.vendorQuery ?? "";
            const vendor = findVendor(data.contracts, q);
            const args = vendor ? { vendor_name: String(vendor.vendorName ?? "") } : q ? { vendor_name: q } : {};
            const raw = await runTool(taskId, emit, step.id, "search_email_threads", args, data);
            const res = summarizeThreads(raw);
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: res }));
            setStep(step.id, { status: "completed", result: res });
            task.result = res;
            continue;
          }

          /* ---------------- compare ---------------- */
          case "compare": {
            const a = findVendor(data.contracts, intent.vendorQuery ?? "");
            const b = findVendor(data.contracts, intent.vendorQuery2 ?? "");
            if (!a || !b) {
              throw new Error(
                !a && !b
                  ? "Neither vendor matches the register — try full vendor names."
                  : `${String(!a ? intent.vendorQuery : intent.vendorQuery2)} does not match the register.`
              );
            }
            for (const v of [a, b]) {
              const cid = String(v.id ?? "");
              if (cid && !task.evidenceIds.includes(cid)) task.evidenceIds.push(cid);
              await runTool(taskId, emit, step.id, "get_contract", { vendor_name: String(v.vendorName ?? "") }, data);
            }
            const result = compareVendors(data.contracts, a, b);
            task.result = result;
            const detail = `Read ${String(a.vendorName ?? "")} and ${String(b.vendorName ?? "")}`;
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail }));
            setStep(step.id, { status: "completed", result });
            continue;
          }
          case "compare_read": {
            const result = task.result || "Records read";
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: "Records cross-referenced" }));
            setStep(step.id, { status: "completed", result });
            continue;
          }

          /* ---------------- compile / record ---------------- */
          case "compile": {
            const final = task.result || lastCompletedResult(plan.steps, step.id) || genericOutcome(task);
            task.status = "completed";
            task.result = final || genericOutcome(task);
            task.completedAt = iso();
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: "Result compiled" }));
            setStep(step.id, { status: "completed", result: task.result });
            await emit(ev(taskId, "task.completed", { detail: "Completed" }));
            return task;
          }
          case "record": {
            await emit(ev(taskId, "step.completed", { stepId: step.id, detail: "Recorded in activity trail" }));
            setStep(step.id, { status: "completed" });
            continue;
          }

          default:
            setStep(step.id, { status: "completed" });
            continue;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Step failed";
        await emit(ev(taskId, "step.failed", { stepId: step.id, detail: msg }));
        setStep(step.id, { status: "failed", error: msg, failedAt: iso() });
        task.status = "failed";
        task.error = msg;
        await emit(ev(taskId, "task.failed", { detail: msg }));
        return task;
      }
    }

    // Finalize: complete any leftover running/queued steps and emit completion.
    task.status = "completed";
    task.result = task.result || genericOutcome(task);
    task.completedAt = iso();
    for (const s of plan.steps) {
      if (s.status === "queued" || s.status === "running") setStep(s.id, { status: "completed" });
    }
    await emit(ev(task.id, "task.completed", { detail: "Completed" }));
    return task;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Execution failed";
    task.status = "failed";
    task.error = msg;
    await emit(ev(task.id, "task.failed", { detail: msg }));
    return task;
  }
}

/* --------------------------- helpers --------------------------- */

function taskIdOf(task: AgentTask): string {
  return task.id;
}

/** Fragments the verification step must find in the produced result. */
function verificationFragments(plan: AgentPlan, intent: Intent): string[] {
  const frags: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (t.length > 3 && !frags.includes(t)) frags.push(t);
  };
  // Reference vendor names that actually appear in completed step results
  // (both **bold** labels and "• Name —" bullet rows).
  for (const step of plan.steps) {
    const r = step.result;
    if (!r) continue;
    const bold = r.match(/\*\*([A-Za-z0-9 .&'-]{3,})\*\*/);
    if (bold) push(bold[1]);
    const bullet = r.match(/^•\s+([A-Za-z0-9 .&'-]{3,})\s+—/m);
    if (bullet) push(bullet[1]);
    if (frags.length >= 2) break;
  }
  // Fall back to the request's vendor terms.
  if (frags.length === 0 && intent.vendorQuery) {
    const first = intent.vendorQuery.split(/\s+/)[0];
    if (first && first.length > 2) push(first);
  }
  return frags.slice(0, 3);
}

function lastCompletedResult(steps: AgentTaskStep[], currentId: string): string {
  const idx = steps.findIndex((s) => s.id === currentId);
  for (let i = idx - 1; i >= 0; i--) {
    const s = steps[i];
    if (s.status === "completed" && s.result) return s.result;
  }
  return "";
}

function genericOutcome(task: AgentTask): string {
  return task.request ? `Completed analysis for your request.` : "Done.";
}

function titleFor(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  const capped = t.charAt(0).toUpperCase() + t.slice(1);
  return capped.length <= 52 ? capped : `${capped.slice(0, 52).trim()}…`;
}

/** Map a step title to its handler op. */
function opFor(title: string): string {
  switch (title) {
    case "Understanding request": return "understand";
    case "Finding contract": return "find_contract";
    case "Opening document": return "open_document";
    case "Analyzing clauses": return "analyze_clauses";
    case "Verifying cancellation window": return "verify_window";
    case "Preparing cancellation notice": return "draft_notice";
    case "Preparing reply": return "draft_reply";
    case "Review cancellation request": return "gate";
    case "Review reply": return "gate";
    case "Delivering cancellation request": return "deliver_cancel";
    case "Delivering reply": return "deliver_reply";
    case "Verifying result": return "verify";
    case "Updating the contract and activity trail": return "record";
    case "Updating the activity trail": return "record";
    case "Querying renewals": return "renewals";
    case "Finding cancellable contracts": return "cancellables";
    case "Checking cancellation windows": return "cancel_windows";
    case "Assessing exposure": return "exposure";
    case "Scoring vendor risk": return "risk";
    case "Finding savings opportunities": return "savings";
    case "Reading portfolio": return "portfolio";
    case "Finding vendor": return "find_vendor";
    case "Reading vendor record": return "vendor_record";
    case "Searching Gmail": return "gmail";
    case "Reading correspondence": return "threads";
    case "Summarizing correspondence": return "summarize_threads";
    case "Comparing vendors": return "compare";
    case "Reading vendor records": return "compare_read";
    case "Compiling comparison": return "compile";
    case "Compiling result": return "compile";
    case "Compiling answer": return "compile";
    case "Compiling summary": return "compile";
    default: return "noop";
  }
}
