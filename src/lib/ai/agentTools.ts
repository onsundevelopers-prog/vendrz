/* ------------------------------------------------------------------ */
/*  Agent Tools - real backend functions the AI agent can invoke.      */
/*                                                                     */
/*  Each tool queries actual data stores (localStorage via the store   */
/*  layer, or the AI provider). The agent MUST call a tool before     */
/*  claiming an action occurred.                                       */
/* ------------------------------------------------------------------ */

import type { ToolDefinition } from "./provider";
import type { AgentContractAnalysis } from "@/lib/agentTask";

/* ------------------------------ tool definitions ------------------------------ */

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: "search_contracts",
    description: "Search all contracts in the workspace. Returns matching contracts with key details.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search term (vendor name, category, etc.)" },
        sort_by: { type: "string", enum: ["value", "risk", "renewal", "name"], description: "Sort results by" },
        limit: { type: "number", description: "Max results to return (default 10)" },
      },
    },
  },
  {
    name: "get_contract",
    description: "Get full details for a specific contract by vendor name or ID.",
    parameters: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Vendor name to look up" },
        contract_id: { type: "string", description: "Contract ID to look up" },
      },
    },
  },
  {
    name: "get_upcoming_renewals",
    description: "List contracts renewing within a specified number of days.",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Look ahead N days (default 90)" },
        include_past: { type: "boolean", description: "Include past-due renewals" },
      },
    },
  },
  {
    name: "get_cancellation_deadlines",
    description: "List contracts approaching their cancellation deadline.",
    parameters: {
      type: "object",
      properties: {
        days: { type: "number", description: "Look ahead N days (default 90)" },
      },
    },
  },
  {
    name: "get_vendor_risk",
    description: "Get risk analysis for contracts at elevated risk.",
    parameters: {
      type: "object",
      properties: {
        min_score: { type: "number", description: "Minimum risk score (default 60)" },
        vendor_name: { type: "string", description: "Filter to a specific vendor" },
      },
    },
  },
  {
    name: "get_savings_opportunities",
    description: "List identified savings opportunities.",
    parameters: {
      type: "object",
      properties: {
        min_amount: { type: "number", description: "Minimum estimated savings" },
        vendor_name: { type: "string", description: "Filter to a specific vendor" },
      },
    },
  },
  {
    name: "search_email_threads",
    description: "Search vendor email correspondence stored in the workspace.",
    parameters: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Vendor to search for" },
        category: { type: "string", enum: ["renewal", "invoice", "negotiation", "general"], description: "Filter by email category" },
      },
    },
  },
  {
    name: "get_portfolio_summary",
    description: "Get an overview of the entire vendor portfolio: total spend, risks, renewals, savings.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "draft_email",
    description: "Draft a vendor email. Returns the draft for user approval - NEVER sends automatically.",
    parameters: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Vendor to draft email for" },
        purpose: { type: "string", enum: ["negotiation", "cancellation", "renewal", "follow_up"], description: "Purpose of the email" },
        context: { type: "string", description: "Additional context for the draft" },
      },
      required: ["vendor_name", "purpose"],
    },
  },
  {
    name: "get_activity",
    description: "Get recent activity events in the workspace.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max events to return (default 10)" },
        vendor_name: { type: "string", description: "Filter to a specific vendor" },
      },
    },
  },
  {
    name: "find_vendor",
    description: "Find a vendor in the contract register by name. Returns the matched record if one exists.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Vendor name or fragment to match" },
      },
      required: ["query"],
    },
  },
  {
    name: "open_document",
    description: "Open the source document stored for a vendor. Returns the real document name and how many clause findings were extracted from it.",
    parameters: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Vendor whose document to open" },
      },
      required: ["vendor_name"],
    },
  },
  {
    name: "analyze_clauses",
    description: "Read the extracted clauses of a contract (renewal, cancellation, auto-renewal, escalation, risk) with evidence. Only returns findings that actually exist for the document.",
    parameters: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Vendor whose contract clauses to read" },
      },
      required: ["vendor_name"],
    },
  },
  {
    name: "search_gmail",
    description: "Search the user's connected Gmail for vendor correspondence. Reports honestly when Gmail is not connected or nothing is indexed.",
    parameters: {
      type: "object",
      properties: {
        vendor_name: { type: "string", description: "Vendor to search correspondence for" },
        category: { type: "string", enum: ["renewal", "invoice", "negotiation", "general"], description: "Filter by email category" },
      },
    },
  },
  {
    name: "verify_result",
    description: "Verify a produced result against the real register: re-counts contracts and checks that required facts appear in the result. Never trusts a result blindly.",
    parameters: {
      type: "object",
      properties: {
        source: { type: "string", description: "The result text to verify" },
        expected_count: { type: "number", description: "Expected contract count; verified against the real register" },
        contains: { type: "array", items: { type: "string" }, description: "Fragments the result must contain" },
      },
    },
  },
];

/* ------------------------------ tool executor ------------------------------ */

/**
 * Execute a tool call and return the result as a JSON string.
 * This function is called by the agent's tool loop.
 */
export function executeTool(
  call: { name: string; arguments: Record<string, unknown> },
  data: {
    contracts: Array<Record<string, unknown>>;
    threads: Array<Record<string, unknown>>;
    activity: Array<Record<string, unknown>>;
    analyses?: AgentContractAnalysis[];
    gmailConnected?: boolean;
  }
): string {
  try {
    switch (call.name) {
      case "search_contracts":
        return executeSearchContracts(call.arguments, data.contracts);
      case "get_contract":
        return executeGetContract(call.arguments, data.contracts);
      case "get_upcoming_renewals":
        return executeGetRenewals(call.arguments, data.contracts);
      case "get_cancellation_deadlines":
        return executeGetCancellationDeadlines(call.arguments, data.contracts);
      case "get_vendor_risk":
        return executeGetVendorRisk(call.arguments, data.contracts);
      case "get_savings_opportunities":
        return executeGetSavings(call.arguments, data.contracts);
      case "search_email_threads":
        return executeSearchEmails(call.arguments, data.threads);
      case "get_portfolio_summary":
        return executeGetPortfolioSummary(data.contracts);
      case "draft_email":
        return executeDraftEmail(call.arguments, data.contracts, data.threads);
      case "get_activity":
        return executeGetActivity(call.arguments, data.activity);
      case "find_vendor":
        return executeFindVendor(call.arguments, data.contracts);
      case "open_document":
        return executeOpenDocument(call.arguments, data.contracts, data.analyses ?? []);
      case "analyze_clauses":
        return executeAnalyzeClauses(call.arguments, data.contracts, data.analyses ?? []);
      case "search_gmail":
        return executeSearchGmail(call.arguments, data.threads, data.gmailConnected === true);
      case "verify_result":
        return executeVerifyResult(call.arguments, data.contracts);
      default:
        return JSON.stringify({ error: `Unknown tool: ${call.name}` });
    }
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : "Tool execution failed" });
  }
}

/* ------------------------------ tool implementations ------------------------------ */

function executeSearchContracts(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const query = String(args.query ?? "").toLowerCase();
  const limit = Number(args.limit ?? 10);
  const sortBy = String(args.sort_by ?? "value");

  let results = contracts;
  if (query) {
    results = results.filter((c) => {
      const name = String(c.vendorName ?? "").toLowerCase();
      const cat = String(c.category ?? "").toLowerCase();
      const doc = String(c.linkedDocument ?? "").toLowerCase();
      return name.includes(query) || cat.includes(query) || doc.includes(query);
    });
  }

  // Sort
  results = [...results].sort((a, b) => {
    switch (sortBy) {
      case "value": return (Number(b.annualSpend ?? 0)) - (Number(a.annualSpend ?? 0));
      case "risk": return (Number(b.riskScore ?? 0)) - (Number(a.riskScore ?? 0));
      case "renewal": {
        const ad = String(a.renewalDate ?? "9999").localeCompare(String(b.renewalDate ?? "9999"));
        return ad;
      }
      case "name": return String(a.vendorName ?? "").localeCompare(String(b.vendorName ?? ""));
      default: return 0;
    }
  });

  return JSON.stringify({
    count: results.length,
    contracts: results.slice(0, limit).map((c) => ({
      id: c.id,
      vendor: c.vendorName,
      category: c.category,
      annual_value: c.annualSpend,
      renewal: c.renewalDate,
      risk: c.riskScore,
      status: c.status,
      auto_renew: c.autoRenew,
      escalation: c.escalationRate,
      savings_low: c.opportunityLow,
      savings_high: c.opportunityHigh,
    })),
  });
}

function executeGetContract(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const vendorName = String(args.vendor_name ?? "").toLowerCase();
  const contractId = String(args.contract_id ?? "");

  const match = contracts.find((c) => {
    if (contractId && c.id === contractId) return true;
    if (vendorName) {
      const name = String(c.vendorName ?? "").toLowerCase();
      return name === vendorName || name.includes(vendorName) || vendorName.includes(name);
    }
    return false;
  });

  if (!match) {
    return JSON.stringify({ error: "Contract not found", query: { vendor_name: vendorName, contract_id: contractId } });
  }

  return JSON.stringify({
    id: match.id,
    vendor: match.vendorName,
    category: match.category,
    annual_value: match.annualSpend,
    renewal_date: match.renewalDate,
    cancellation_deadline: match.cancellationDeadline,
    auto_renew: match.autoRenew,
    escalation_rate: match.escalationRate,
    risk_score: match.riskScore,
    savings_low: match.opportunityLow,
    savings_high: match.opportunityHigh,
    status: match.status,
    document: match.linkedDocument,
  });
}

function executeGetRenewals(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const days = Number(args.days ?? 90);
  const includePast = args.include_past === true;
  const now = Date.now();

  const renewals = contracts
    .filter((c) => c.renewalDate)
    .map((c) => {
      const d = Math.ceil((new Date(String(c.renewalDate) + "T00:00:00").getTime() - now) / 86400000);
      return { c, daysUntilRenewal: d };
    })
    .filter((r) => includePast ? r.daysUntilRenewal >= -30 : r.daysUntilRenewal >= 0)
    .filter((r) => r.daysUntilRenewal <= days)
    .sort((a, b) => a.daysUntilRenewal - b.daysUntilRenewal);

  return JSON.stringify({
    count: renewals.length,
    renewals: renewals.map(({ c, daysUntilRenewal }) => ({
      vendor: c.vendorName,
      renewal_date: c.renewalDate,
      days_left: daysUntilRenewal,
      annual_value: c.annualSpend,
      risk: c.riskScore,
      auto_renew: c.autoRenew,
      cancel_by: c.cancellationDeadline,
      escalation: c.escalationRate,
    })),
  });
}

function executeGetCancellationDeadlines(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const days = Number(args.days ?? 90);
  const now = Date.now();

  const deadlines = contracts
    .filter((c) => c.cancellationDeadline && c.autoRenew)
    .map((c) => {
      const d = Math.ceil((new Date(String(c.cancellationDeadline) + "T00:00:00").getTime() - now) / 86400000);
      return { c, daysUntilDeadline: d };
    })
    .filter((r) => r.daysUntilDeadline >= 0 && r.daysUntilDeadline <= days)
    .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline);

  return JSON.stringify({
    count: deadlines.length,
    deadlines: deadlines.map(({ c, daysUntilDeadline }) => ({
      vendor: c.vendorName,
      deadline: c.cancellationDeadline,
      days_left: daysUntilDeadline,
      annual_value: c.annualSpend,
      renewal_date: c.renewalDate,
      escalation: c.escalationRate,
    })),
  });
}

function executeGetVendorRisk(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const minScore = Number(args.min_score ?? 60);
  const vendorName = String(args.vendor_name ?? "").toLowerCase();

  let atRisk = contracts.filter((c) => Number(c.riskScore ?? 0) >= minScore);
  if (vendorName) {
    atRisk = atRisk.filter((c) => {
      const name = String(c.vendorName ?? "").toLowerCase();
      return name.includes(vendorName) || vendorName.includes(name);
    });
  }

  atRisk.sort((a, b) => (Number(b.riskScore ?? 0)) - (Number(a.riskScore ?? 0)));

  return JSON.stringify({
    count: atRisk.length,
    at_risk: atRisk.map((c) => ({
      vendor: c.vendorName,
      risk_score: c.riskScore,
      annual_value: c.annualSpend,
      renewal_date: c.renewalDate,
      status: c.status,
      escalation: c.escalationRate,
    })),
  });
}

function executeGetSavings(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const minAmount = Number(args.min_amount ?? 0);
  const vendorName = String(args.vendor_name ?? "").toLowerCase();

  let opps = contracts.filter((c) => Number(c.opportunityHigh ?? 0) > minAmount);
  if (vendorName) {
    opps = opps.filter((c) => {
      const name = String(c.vendorName ?? "").toLowerCase();
      return name.includes(vendorName) || vendorName.includes(name);
    });
  }

  opps.sort((a, b) => (Number(b.opportunityHigh ?? 0)) - (Number(a.opportunityHigh ?? 0)));
  const totalLow = opps.reduce((s, c) => s + Number(c.opportunityLow ?? 0), 0);
  const totalHigh = opps.reduce((s, c) => s + Number(c.opportunityHigh ?? 0), 0);

  return JSON.stringify({
    count: opps.length,
    total_potential_low: totalLow,
    total_potential_high: totalHigh,
    opportunities: opps.map((c) => ({
      vendor: c.vendorName,
      savings_low: c.opportunityLow,
      savings_high: c.opportunityHigh,
      annual_value: c.annualSpend,
    })),
  });
}

function executeSearchEmails(args: Record<string, unknown>, threads: Array<Record<string, unknown>>): string {
  const vendorName = String(args.vendor_name ?? "").toLowerCase();
  const category = String(args.category ?? "");

  let results = threads;
  if (vendorName) {
    results = results.filter((t) => {
      const name = String(t.vendorName ?? "").toLowerCase();
      return name.includes(vendorName) || vendorName.includes(name);
    });
  }
  if (category) {
    results = results.filter((t) => t.category === category);
  }

  return JSON.stringify({
    count: results.length,
    threads: results.slice(0, 10).map((t) => ({
      id: t.id,
      vendor: t.vendorName,
      subject: t.subject,
      sender: t.sender,
      date: t.date,
      category: t.category,
      snippet: t.snippet,
      unread: t.unread,
    })),
  });
}

function executeGetPortfolioSummary(contracts: Array<Record<string, unknown>>): string {
  const now = Date.now();
  const total = contracts.reduce((s, c) => s + Number(c.annualSpend ?? 0), 0);
  const atRisk = contracts.filter((c) => Number(c.riskScore ?? 0) >= 60);
  const renewing90 = contracts.filter((c) => {
    if (!c.renewalDate) return false;
    const d = Math.ceil((new Date(String(c.renewalDate) + "T00:00:00").getTime() - now) / 86400000);
    return d >= 0 && d <= 90;
  });
  const autoRenew = contracts.filter((c) => c.autoRenew);
  const escalating = contracts.filter((c) => c.escalationRate != null);
  const oppLow = contracts.reduce((s, c) => s + Number(c.opportunityLow ?? 0), 0);
  const oppHigh = contracts.reduce((s, c) => s + Number(c.opportunityHigh ?? 0), 0);

  return JSON.stringify({
    total_contracts: contracts.length,
    total_annual_value: total,
    at_risk_count: atRisk.length,
    at_risk_value: atRisk.reduce((s, c) => s + Number(c.annualSpend ?? 0), 0),
    renewing_90d_count: renewing90.length,
    renewing_90d_value: renewing90.reduce((s, c) => s + Number(c.annualSpend ?? 0), 0),
    auto_renew_count: autoRenew.length,
    escalating_count: escalating.length,
    potential_savings_low: oppLow,
    potential_savings_high: oppHigh,
  });
}

function executeDraftEmail(
  args: Record<string, unknown>,
  contracts: Array<Record<string, unknown>>,
  threads: Array<Record<string, unknown>>
): string {
  const vendorName = String(args.vendor_name ?? "");
  const purpose = String(args.purpose ?? "follow_up");
  const context = String(args.context ?? "");

  // Find the vendor
  const vendor = contracts.find((c) => {
    const name = String(c.vendorName ?? "").toLowerCase();
    const target = vendorName.toLowerCase();
    return name === target || name.includes(target) || target.includes(name);
  });

  if (!vendor) {
    return JSON.stringify({ error: `Vendor "${vendorName}" not found in contracts.` });
  }

  // Find relevant threads
  const vendorThreads = threads.filter((t) => {
    const name = String(t.vendorName ?? "").toLowerCase();
    return name.includes(vendorName.toLowerCase()) || vendorName.toLowerCase().includes(name);
  });

  const thread = vendorThreads[0];
  // Only a real sender from stored correspondence is used. When none exists
  // the address is left empty so the UI can say "address not on file" - we
  // never invent a contact address for a vendor.
  const to = thread?.sender ?? "";

  return JSON.stringify({
    status: "draft_ready",
    vendor: vendor.vendorName,
    purpose,
    to,
    requires_approval: true,
    note: to
      ? "Draft is prepared for user review. It must be explicitly approved before sending."
      : "Draft is prepared for user review. No sender address is on file for this vendor yet - add one before sending.",
    contract_context: {
      annual_value: vendor.annualSpend,
      renewal_date: vendor.renewalDate,
      escalation: vendor.escalationRate,
      auto_renew: vendor.autoRenew,
      risk: vendor.riskScore,
    },
    thread_context: thread
      ? { subject: thread.subject, date: thread.date, category: thread.category }
      : null,
    additional_context: context,
  });
}

function executeGetActivity(args: Record<string, unknown>, activity: Array<Record<string, unknown>>): string {
  const limit = Number(args.limit ?? 10);
  const vendorName = String(args.vendor_name ?? "").toLowerCase();

  let results = activity;
  if (vendorName) {
    results = results.filter((a) => {
      const name = String(a.vendorName ?? "").toLowerCase();
      return name.includes(vendorName) || vendorName.includes(name);
    });
  }

  return JSON.stringify({
    count: results.length,
    events: results.slice(0, limit).map((a) => ({
      type: a.type,
      actor: a.actor,
      title: a.title,
      detail: a.detail,
      vendor: a.vendorName,
      created_at: a.createdAt,
    })),
  });
}

/* ------------------------------ new tools ------------------------------ */

/** Find a vendor record by name - the agent's "find vendor" action. */
function executeFindVendor(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const query = String(args.query ?? "").trim().toLowerCase();
  if (!query) {
    return JSON.stringify({ error: "No vendor name provided." });
  }
  const match = contracts.find((c) => {
    const name = String(c.vendorName ?? "").toLowerCase();
    return name === query || name.includes(query) || query.includes(name);
  }) ?? contracts.find((c) => {
    const name = String(c.vendorName ?? "").toLowerCase();
    const toks = query.split(/\s+/).filter((t) => t.length > 2);
    return toks.some((t) => name.includes(t));
  }) ?? null;
  if (!match) {
    return JSON.stringify({ error: `No vendor matches "${args.query}" in the contract register.` });
  }
  return JSON.stringify({
    found: true,
    id: match.id,
    vendor: match.vendorName,
    category: match.category,
    annual_value: match.annualSpend,
    document: match.linkedDocument ?? null,
  });
}

/** Open the stored source document for a vendor - real filename only. */
function executeOpenDocument(
  args: Record<string, unknown>,
  contracts: Array<Record<string, unknown>>,
  analyses: AgentContractAnalysis[]
): string {
  const vendorName = String(args.vendor_name ?? "").toLowerCase();
  const match = contracts.find((c) => {
    const name = String(c.vendorName ?? "").toLowerCase();
    return name.includes(vendorName) || vendorName.includes(name);
  });
  if (!match) {
    return JSON.stringify({ error: `No contract matches "${args.vendor_name}".` });
  }
  const analysis = analyses.find((a) => a.contractId === match.id);
  return JSON.stringify({
    opened: true,
    vendor: match.vendorName,
    document: match.linkedDocument ?? null,
    findings_count: analysis?.findings.length ?? 0,
    note: match.linkedDocument
      ? analysis && analysis.findings.length > 0
        ? `Opened ${match.linkedDocument} - ${analysis.findings.length} extracted clause finding(s) available.`
        : `Opened ${match.linkedDocument} - document stored, no clause findings extracted yet.`
      : "No source document is stored for this vendor yet.",
  });
}

/** Read the REAL extracted clauses of a contract with evidence. */
function executeAnalyzeClauses(
  args: Record<string, unknown>,
  contracts: Array<Record<string, unknown>>,
  analyses: AgentContractAnalysis[]
): string {
  const vendorName = String(args.vendor_name ?? "").toLowerCase();
  const match = contracts.find((c) => {
    const name = String(c.vendorName ?? "").toLowerCase();
    return name.includes(vendorName) || vendorName.includes(name);
  });
  if (!match) {
    return JSON.stringify({ error: `No contract matches "${args.vendor_name}".` });
  }
  const analysis = analyses.find((a) => a.contractId === match.id);
  if (!analysis || analysis.findings.length === 0) {
    return JSON.stringify({
      analyzed: false,
      vendor: match.vendorName,
      note: `No clause-level analysis has been run for ${match.vendorName} yet. The stored record still reports renewal ${String(match.renewalDate ?? "n/a")}, auto-renew ${match.autoRenew ? "ON" : "OFF"}${match.escalationRate != null ? `, ${match.escalationRate}% escalation` : ""}.`,
    });
  }
  return JSON.stringify({
    analyzed: true,
    vendor: match.vendorName,
    document: analysis.documentName,
    findings: analysis.findings.map((f) => ({
      type: f.type,
      severity: f.severity,
      title: f.title,
      detail: f.detail,
      confidence: f.confidence,
      section: f.evidence?.section ?? null,
      excerpt: f.evidence?.excerpt ?? null,
      page: f.evidence?.page ?? null,
    })),
  });
}

/**
 * Search Gmail - reports the REAL connection state. When Gmail is not
 * connected it says so; when connected it searches the indexed threads.
 */
function executeSearchGmail(
  args: Record<string, unknown>,
  threads: Array<Record<string, unknown>>,
  connected: boolean
): string {
  if (!connected) {
    return JSON.stringify({
      connected: false,
      searched: false,
      note: "Gmail is not connected. Connect it in Settings to search vendor correspondence - nothing was searched.",
    });
  }
  const vendorName = String(args.vendor_name ?? "").toLowerCase();
  const category = String(args.category ?? "");
  let results = threads;
  if (vendorName) {
    results = results.filter((t) => {
      const name = String(t.vendorName ?? "").toLowerCase();
      return name.includes(vendorName) || vendorName.includes(name);
    });
  }
  if (category) {
    results = results.filter((t) => t.category === category);
  }
  return JSON.stringify({
    connected: true,
    searched: true,
    count: results.length,
    threads: results.slice(0, 10).map((t) => ({
      vendor: t.vendorName,
      subject: t.subject,
      sender: t.sender,
      date: t.date,
      category: t.category,
      snippet: t.snippet,
      unread: t.unread,
    })),
    note:
      results.length > 0
        ? `${results.length} thread(s) found.`
        : "Gmail is connected but no vendor correspondence is indexed yet - nothing was found.",
  });
}

/** Verify a produced result against the real register. Never trusts blindly. */
function executeVerifyResult(args: Record<string, unknown>, contracts: Array<Record<string, unknown>>): string {
  const source = String(args.source ?? "");
  const expectedCount = args.expected_count != null ? Number(args.expected_count) : null;
  const contains = Array.isArray(args.contains) ? args.contains.map(String) : [];
  const checks: Array<{ check: string; ok: boolean }> = [];
  if (expectedCount != null) {
    const total = contracts.length;
    const ok = expectedCount === total;
    checks.push({ check: `reported ${expectedCount} contract(s) against ${total} in the register`, ok });
  }
  for (const frag of contains) {
    checks.push({ check: `result references "${frag}"`, ok: source.includes(frag) });
  }
  const verified = checks.length > 0 && checks.every((c) => c.ok);
  return JSON.stringify({
    verified,
    checks,
    detail: verified
      ? "Verification passed - the result matches the real register."
      : `Verification failed - ${checks.filter((c) => !c.ok).length} check(s) did not pass.`,
  });
}
