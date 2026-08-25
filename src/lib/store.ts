import type {
  Account,
  AnalysisResult,
  AnonymousSession,
  AuditSession,
  CompanyAudit,
  ContractExtraction,
  ContractRecord,
  DashboardStats,
  DiscoveredDocument,
  GmailConnection,
  PipelineStage,
} from "./types";
import { SAMPLE_CONTRACTS, daysFromNow } from "./mockData";
import { generateAnalysis } from "./pipeline";
import { buildCompanyAudit } from "./services/audit";

/* ------------------------------------------------------------------ */
/*  Client-side persistence.                                          */
/*  Each function maps to a FastAPI endpoint contract (documented in   */
/*  lib/api.ts) so the real backend can be swapped in without UI       */
/*  changes. Data is scoped to the current browser for the MVP demo.   */
/* ------------------------------------------------------------------ */

const KEYS = {
  sessions: "wt.sessions",
  accounts: "wt.accounts",
  currentAccount: "wt.currentAccount",
  gmail: "wt.gmail",
  discovery: "wt.discovery",
  auditSessions: "wt.auditSessions",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ------------------------------ sessions ------------------------------ */

export function getSession(id: string): AnonymousSession | null {
  const sessions = read<Record<string, AnonymousSession>>(KEYS.sessions, {});
  return sessions[id] ?? null;
}

export function saveSession(session: AnonymousSession): void {
  const sessions = read<Record<string, AnonymousSession>>(KEYS.sessions, {});
  sessions[session.id] = session;
  write(KEYS.sessions, sessions);
}

export function updateSession(
  id: string,
  patch: Partial<AnonymousSession>
): AnonymousSession | null {
  const session = getSession(id);
  if (!session) return null;
  const updated = { ...session, ...patch };
  saveSession(updated);
  return updated;
}

export function createAnonymousSession(
  documentName: string,
  fileKind: "pdf" | "docx" | "unknown",
  fileSize: number,
  source: "manual" | "gmail" = "manual",
  extraction: ContractExtraction | null = null
): AnonymousSession {
  const id = uid("s");
  const session: AnonymousSession = {
    id,
    documentName,
    fileKind,
    fileSize,
    createdAt: new Date().toISOString(),
    expiresAt: daysFromNow(14),
    pipelineStatus: "queued",
    result: null,
    extraction,
    transferredToUserId: null,
    source,
  };
  saveSession(session);
  return session;
}

/** Anonymous session → account transfer. Analysis is never lost. */
export function transferSessionToAccount(sessionId: string, userId: string): AnonymousSession | null {
  const session = getSession(sessionId);
  if (!session) return null;
  const updated = updateSession(sessionId, { transferredToUserId: userId });
  return updated;
}

/* ------------------------------ accounts ------------------------------ */

export function getAccount(id: string): Account | null {
  const accounts = read<Record<string, Account>>(KEYS.accounts, {});
  return accounts[id] ?? null;
}

export function getAccountByEmail(email: string): Account | null {
  const accounts = read<Record<string, Account>>(KEYS.accounts, {});
  return Object.values(accounts).find((a) => a.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function createAccount(
  email: string,
  name: string,
  provider: "google" | "email"
): Account {
  const existing = getAccountByEmail(email);
  if (existing) {
    setCurrentAccount(existing.id);
    return existing;
  }
  const account: Account = {
    id: uid("u"),
    email,
    name,
    provider,
    createdAt: new Date().toISOString(),
  };
  const accounts = read<Record<string, Account>>(KEYS.accounts, {});
  accounts[account.id] = account;
  write(KEYS.accounts, accounts);
  setCurrentAccount(account.id);
  return account;
}

export function getCurrentAccount(): Account | null {
  const id = read<string | null>(KEYS.currentAccount, null);
  return id ? getAccount(id) : null;
}

export function setCurrentAccount(id: string | null): void {
  write(KEYS.currentAccount, id);
}

export function logout(): void {
  setCurrentAccount(null);
}

/* ------------------------------ gmail ------------------------------ */

export function getGmailConnection(userId: string): GmailConnection | null {
  const conns = read<Record<string, GmailConnection>>(KEYS.gmail, {});
  return Object.values(conns).find(
    (c) => c.userId === userId && c.status === "connected"
  ) ?? null;
}

export function connectGmail(userId: string): GmailConnection {
  const conns = read<Record<string, GmailConnection>>(KEYS.gmail, {});
  const existing = Object.values(conns).find((c) => c.userId === userId);
  const connection: GmailConnection = {
    id: existing?.id ?? uid("g"),
    userId,
    connectedAt: new Date().toISOString(),
    disconnectedAt: null,
    scopeGranted: ["gmail.readonly", "gmail.metadata"],
    status: "connected",
  };
  conns[connection.id] = connection;
  write(KEYS.gmail, conns);
  return connection;
}

export function disconnectGmail(userId: string): void {
  const conns = read<Record<string, GmailConnection>>(KEYS.gmail, {});
  for (const conn of Object.values(conns)) {
    if (conn.userId === userId && conn.status === "connected") {
      conn.status = "disconnected";
      conn.disconnectedAt = new Date().toISOString();
    }
  }
  write(KEYS.gmail, conns);
  // Imports already made are kept — only future discovery is revoked.
}

/* ------------------------------ discovery ------------------------------ */

const CANDIDATES: Array<Omit<DiscoveredDocument, "id" | "gmailConnectionId" | "imported">> = [
  {
    filename: "Salesforce_Master_Subscription_Agreement.pdf",
    emailSubject: "Your Salesforce subscription renews soon",
    sender: "renewals@salesforce.com",
    emailDate: "2026-07-02",
    detectedVendor: "Salesforce",
    documentType: "MSA / Subscription agreement",
    confidence: 0.96,
    appearsToBeContract: true,
  },
  {
    filename: "AWS_Enterprise_Agreement_2025.pdf",
    emailSubject: "AWS Enterprise Agreement — renewal notice",
    sender: "aws-agreements@amazon.com",
    emailDate: "2026-06-18",
    detectedVendor: "AWS",
    documentType: "Enterprise agreement",
    confidence: 0.94,
    appearsToBeContract: true,
  },
  {
    filename: "Zoom_Business_Services_Agreement.pdf",
    emailSubject: "Re: Zoom services agreement",
    sender: "contracts@zoom.us",
    emailDate: "2026-05-29",
    detectedVendor: "Zoom",
    documentType: "Services agreement",
    confidence: 0.89,
    appearsToBeContract: true,
  },
  {
    filename: "invoice_q3_2026.pdf",
    emailSubject: "Invoice #88412 — payment due",
    sender: "billing@atlassian.com",
    emailDate: "2026-08-04",
    detectedVendor: "Atlassian",
    documentType: "Invoice (not a contract)",
    confidence: 0.78,
    appearsToBeContract: false,
  },
  {
    filename: "Okta_Order_Form_2026.pdf",
    emailSubject: "Okta order form attached",
    sender: "sales-ops@okta.com",
    emailDate: "2026-07-21",
    detectedVendor: "Okta",
    documentType: "Order form",
    confidence: 0.83,
    appearsToBeContract: true,
  },
  {
    filename: "docs_new_pricing_policy.pdf",
    emailSubject: "Updated pricing — important",
    sender: "updates@google.com",
    emailDate: "2026-07-30",
    detectedVendor: "Google",
    documentType: "Pricing notice (not a contract)",
    confidence: 0.61,
    appearsToBeContract: false,
  },
];

export function getDiscovery(userId: string): DiscoveredDocument[] {
  const all = read<Record<string, DiscoveredDocument[]>>(KEYS.discovery, {});
  return all[userId] ?? [];
}

export function runDiscovery(userId: string): DiscoveredDocument[] {
  const connection = getGmailConnection(userId);
  if (!connection) return [];
  // Preserve prior import state across rescans so a refresh never un-imports
  // a document the user already sent through the pipeline.
  const prevByFilename = new Map(
    getDiscovery(userId).map((d) => [d.filename, d])
  );
  const docs: DiscoveredDocument[] = CANDIDATES.map((c) => {
    const prev = prevByFilename.get(c.filename);
    return {
      ...c,
      id: prev?.id ?? uid("d"),
      gmailConnectionId: connection.id,
      imported: prev?.imported ?? false,
    };
  });
  const all = read<Record<string, DiscoveredDocument[]>>(KEYS.discovery, {});
  all[userId] = docs;
  write(KEYS.discovery, all);
  return docs;
}

export function markImported(userId: string, docIds: string[]): string[] {
  const all = read<Record<string, DiscoveredDocument[]>>(KEYS.discovery, {});
  const docs = all[userId] ?? [];
  const createdSessionIds: string[] = [];
  for (const doc of docs) {
    if (docIds.includes(doc.id) && !doc.imported) {
      doc.imported = true;
      const session = createAnonymousSession(doc.filename, "pdf", 0, "gmail");
      // Same analysis pipeline as manual uploads. The backend worker would run
      // the real stages asynchronously; here the deterministic generator runs
      // immediately so results are ready when the user lands on the dashboard.
      const result = generateAnalysis(doc.filename, "pdf");
      updateSession(session.id, {
        transferredToUserId: userId,
        pipelineStatus: "complete",
        result,
      });
      createdSessionIds.push(session.id);
    }
  }
  write(KEYS.discovery, all);
  return createdSessionIds;
}

/* ------------------------------ dashboard ------------------------------ */

export function getContracts(userId: string): ContractRecord[] {
  // Sample portfolio + anything the user uploaded/imported and transferred.
  const userSessions = Object.values(read<Record<string, AnonymousSession>>(KEYS.sessions, {}))
    .filter((s) => s.transferredToUserId === userId && s.result)
    .map((s) => s.result as AnalysisResult);

  const fromSessions: ContractRecord[] = userSessions.map((r) => ({
    id: `ct-${r.id}`,
    vendorName: r.vendorName,
    category: r.category,
    annualSpend: r.annualValue ?? 0,
    renewalDate: r.renewalDate ?? daysFromNow(365),
    cancellationDeadline: r.cancellationDeadline,
    autoRenew: r.autoRenew ?? true,
    riskScore: r.riskScore,
    opportunityLow: r.savings.low,
    opportunityHigh: r.savings.high,
    status: r.riskScore >= 75 ? "at_risk" : r.riskScore >= 55 ? "expiring_soon" : "active",
    linkedDocument: r.documentName,
    isSample: false,
  }));

  return [...SAMPLE_CONTRACTS, ...fromSessions];
}

export function getVendorProfile(userId: string, vendorId: string): ContractRecord | null {
  return getContracts(userId).find((c) => c.id === vendorId) ?? null;
}

export function getDashboardStats(userId: string): DashboardStats {
  const contracts = getContracts(userId);
  const now = new Date();
  const in90 = new Date(now.getTime() + 90 * 86400000);
  const upcoming = contracts.filter((c) => {
    const d = new Date(c.renewalDate + "T00:00:00");
    return d > now && d < in90;
  }).length;
  return {
    contractsMonitored: contracts.length,
    upcomingRenewals: upcoming,
    potentialOpportunities: contracts.filter((c) => c.opportunityHigh > 0).length,
    highRiskContracts: contracts.filter((c) => c.riskScore >= 60).length,
    totalOpportunityLow: contracts.reduce((a, c) => a + c.opportunityLow, 0),
    totalOpportunityHigh: contracts.reduce((a, c) => a + c.opportunityHigh, 0),
  };
}

/* ------------------------------ demo mode ------------------------------ */

let cachedAudit: CompanyAudit | null = null;

/** The Acme Technologies demo company — computed once per session. */
export function getDemoAudit(): CompanyAudit {
  if (!cachedAudit) cachedAudit = buildCompanyAudit();
  return cachedAudit;
}

/** Log into the demo company so the full product is explorable. */
export function enterDemoMode(): Account {
  const account = createAccount(
    "demo@acmetech.example",
    "Acme Technologies",
    "email"
  );
  return account;
}

/* ------------------------------ audit sessions ------------------------------ */

export function getAuditSession(id: string): AuditSession | null {
  const sessions = read<Record<string, AuditSession>>(KEYS.auditSessions, {});
  return sessions[id] ?? null;
}

export function saveAuditSession(session: AuditSession): void {
  const sessions = read<Record<string, AuditSession>>(KEYS.auditSessions, {});
  sessions[session.id] = session;
  write(KEYS.auditSessions, sessions);
}

export function updateAuditSession(
  id: string,
  patch: Partial<AuditSession>
): AuditSession | null {
  const session = getAuditSession(id);
  if (!session) return null;
  const updated = { ...session, ...patch };
  saveAuditSession(updated);
  return updated;
}

export function createAuditSession(
  source: AuditSession["source"]
): AuditSession {
  const session: AuditSession = {
    id: uid("audit"),
    source,
    createdAt: new Date().toISOString(),
    pipelineStatus: "connect",
    companyName: "Acme Technologies",
    result: null,
    unlockedToUserId: null,
  };
  saveAuditSession(session);
  return session;
}

/* ------------------------------ misc ------------------------------ */

export function pipelineLabel(stage: PipelineStage | "complete" | "failed"): string {
  if (stage === "complete") return "Complete";
  if (stage === "failed") return "Failed";
  return stage.replace("_", " ");
}
