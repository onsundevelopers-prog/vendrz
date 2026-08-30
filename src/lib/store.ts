import type {
  ActivityRecord,
  AgentMessage,
  AnalysisResult,
  AnonymousSession,
  ApprovalAction,
  ApprovalActionStatus,
  AuditSession,
  ContractExtraction,
  ContractRecord,
  RichContractExtraction,
  DashboardStats,
  DiscoveredDocument,
  EmailThread,
  GmailConnection,
  PipelineStage,
} from "./types";
import { daysFromNow } from "./dates";

/* ------------------------------------------------------------------ */
/*  Client-side persistence.                                          */
/*  Each function maps to a FastAPI endpoint contract (documented in   */
/*  lib/api.ts) so the real backend can be swapped in without UI       */
/*  changes. Data is scoped to the current browser for the MVP demo.   */
/* ------------------------------------------------------------------ */

export const KEYS = {
  sessions: "wt.sessions",
  gmail: "wt.gmail",
  discovery: "wt.discovery",
  auditSessions: "wt.auditSessions",
  activity: "wt.activity",
  agentMessages: "wt.agentMessages",
  emailThreads: "wt.emailThreads",
  actions: "wt.actions",
  aiUsage: "wt.aiUsage",
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
  extraction: ContractExtraction | null = null,
  richExtraction: RichContractExtraction | null = null
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
    richExtraction,
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

/**
 * Bind any anonymous uploads on this device to the signed-in account.
 *
 * Uploads start anonymous ("No signup · No credit card"), so a user who
 * uploads while logged out and then signs in through a path that does NOT
 * carry a `?session=` param (dashboard login, navbar, "Go to workspace")
 * would otherwise lose that work forever. This claims sessions that have a
 * real result but no owning account yet. Returns how many were bound.
 */
export function claimOrphanedSessions(userId: string): number {
  const sessions = read<Record<string, AnonymousSession>>(KEYS.sessions, {});
  let claimed = 0;
  for (const s of Object.values(sessions)) {
    if (s && s.id && !s.transferredToUserId && s.result && s.result.id) {
      updateSession(s.id, { transferredToUserId: userId });
      claimed++;
    }
  }
  return claimed;
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
  // Imports already made are kept - only future discovery is revoked.
}

/* ------------------------------ discovery ------------------------------ */

/**
 * Gmail discovery requires a real connected inbox. Until a backend Gmail
 * integration is wired up, no documents are discovered - the UI shows an
 * honest empty state instead of fabricated email candidates.
 */
export function getDiscovery(userId: string): DiscoveredDocument[] {
  const all = read<Record<string, DiscoveredDocument[]>>(KEYS.discovery, {});
  return all[userId] ?? [];
}

export function runDiscovery(userId: string): DiscoveredDocument[] {
  const connection = getGmailConnection(userId);
  if (!connection) return [];
  // No real Gmail backend is connected yet - nothing is discovered.
  return [];
}

export function markImported(userId: string, docIds: string[]): string[] {
  void userId;
  void docIds;
  // No real documents exist to import until a data source is connected.
  return [];
}

/* ------------------------------ dashboard ------------------------------ */

export function getContracts(userId: string): ContractRecord[] {
  // Only contracts the user actually uploaded/imported. Unknown terms stay
  // empty ("") and are rendered as unavailable in the UI - never invented.
  const userSessions = Object.values(read<Record<string, AnonymousSession>>(KEYS.sessions, {}))
    .filter((s) => s.transferredToUserId === userId && s.result)
    .map((s) => s.result as AnalysisResult);

  return userSessions.map((r) => ({
    id: `ct-${r.id}`,
    vendorName: r.vendorName,
    category: r.category,
    annualSpend: r.annualValue ?? 0,
    renewalDate: r.renewalDate ?? "",
    cancellationDeadline: r.cancellationDeadline,
    autoRenew: r.autoRenew ?? false,
    escalationRate: r.priceEscalation?.rate ?? null,
    riskScore: r.riskScore,
    opportunityLow: r.savings.low,
    opportunityHigh: r.savings.high,
    status: r.riskScore >= 75 ? "at_risk" : r.riskScore >= 55 ? "expiring_soon" : "active",
    linkedDocument: r.documentName,
    isSample: false,
  }));
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
    autoRenewals: contracts.filter((c) => c.autoRenew).length,
    priceEscalations: contracts.filter((c) => c.escalationRate != null).length,
    // Inside the cancellation window (<30d) and willing to self-renew =>
    // a real cancellation decision point exists.
    cancellationOpportunities: contracts.filter((c) => {
      if (!c.autoRenew || !c.cancellationDeadline) return false;
      const d = new Date(c.cancellationDeadline + "T00:00:00");
      const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 90;
    }).length,
  };
}

/* ------------------------------ activity log ------------------------------ */

/** Real activity only - records written by the app, never seeded. */
export function getActivity(userId: string): ActivityRecord[] {
  const stored = read<Record<string, ActivityRecord[]>>(KEYS.activity, {});
  return [...(stored[userId] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function logActivity(userId: string, record: Omit<ActivityRecord, "id" | "createdAt">): ActivityRecord {
  const stored = read<Record<string, ActivityRecord[]>>(KEYS.activity, {});
  const mine = stored[userId] ?? [];
  const full: ActivityRecord = {
    ...record,
    id: uid("act"),
    createdAt: new Date().toISOString(),
  };
  stored[userId] = [full, ...mine].slice(0, 60);
  write(KEYS.activity, stored);
  return full;
}

/* ------------------------------ action approval ------------------------------ */

const actionsByUser = (): Record<string, Record<string, ApprovalAction>> =>
  read<Record<string, Record<string, ApprovalAction>>>(KEYS.actions, {});

const actionsFor = (userId: string): Record<string, ApprovalAction> =>
  actionsByUser()[userId] ?? {};

/** All recommended actions for a user, newest first. */
export function getActions(userId: string): ApprovalAction[] {
  return Object.values(actionsFor(userId)).sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
}

export function getAction(userId: string, actionId: string): ApprovalAction | null {
  return actionsFor(userId)[actionId] ?? null;
}

/**
 * Record a new AI-recommended action. It is ALWAYS created with status
 * `pending` - nothing executes and nothing is sent until the user approves.
 */
export function createAction(
  userId: string,
  input: Pick<ApprovalAction, "action_type" | "target" | "reasoning" | "proposed_changes"> &
    Partial<Pick<ApprovalAction, "vendorId">>
): ApprovalAction {
  const action: ApprovalAction = {
    action_id: uid("act"),
    action_type: input.action_type,
    target: input.target,
    reasoning: input.reasoning,
    proposed_changes: input.proposed_changes,
    status: "pending",
    vendorId: input.vendorId,
    created_at: new Date().toISOString(),
    approved_at: null,
    executed_at: null,
  };
  const all = read<Record<string, Record<string, ApprovalAction>>>(KEYS.actions, {});
  const mine = all[userId] ?? {};
  mine[action.action_id] = action;
  all[userId] = mine;
  write(KEYS.actions, all);
  return action;
}

export function updateAction(
  userId: string,
  actionId: string,
  patch: Partial<ApprovalAction>
): ApprovalAction | null {
  const all = read<Record<string, Record<string, ApprovalAction>>>(KEYS.actions, {});
  const mine = all[userId] ?? {};
  const action = mine[actionId];
  if (!action) return null;
  const updated = { ...action, ...patch };
  mine[actionId] = updated;
  all[userId] = mine;
  write(KEYS.actions, all);
  return updated;
}

/**
 * User explicitly approves. Sets status to `approved` and stamps `approved_at`.
 * A `pending`/`rejected` action may be approved; an already-approved or
 * executing action is idempotently returned.
 */
export function approveAction(userId: string, actionId: string): ApprovalAction | null {
  const action = getAction(userId, actionId);
  if (!action) return null;
  if (action.status === "approved" || action.status === "executing" || action.status === "completed") {
    return action;
  }
  return updateAction(userId, actionId, {
    status: "approved",
    approved_at: new Date().toISOString(),
  });
}

/** User explicitly rejects or revokes an action. */
export function rejectAction(userId: string, actionId: string): ApprovalAction | null {
  const action = getAction(userId, actionId);
  if (!action) return null;
  if (action.status === "completed" || action.status === "executing") {
    // Already past the point of no return - cannot reject.
    return action;
  }
  return updateAction(userId, actionId, {
    status: "rejected",
    approved_at: null,
  });
}

/**
 * Progress an action through its lifecycle.
 *
 * Safety: `executing` and `completed` may ONLY follow an explicit user
 * approval. These guards ensure an action can never jump from `pending`
 * straight into execution/completion - we never auto-cancel, never
 * auto-send, and never mark an irreversible action done without
 * authorization. `failed` may be set at any time to reflect a failed run.
 */
export function markActionProgress(
  userId: string,
  actionId: string,
  status: Extract<ApprovalActionStatus, "executing" | "completed" | "failed">
): ApprovalAction | null {
  const action = getAction(userId, actionId);
  if (!action) return null;
  // Guard: execution and completion both require prior explicit approval.
  if (status === "executing" || status === "completed") {
    if (action.status !== "approved") {
      throw new Error(
        `Action ${actionId} cannot be marked ${status} - it is ${action.status}, not approved.`
      );
    }
  }
  const executed_at = status === "executing" || status === "completed"
    ? action.executed_at ?? new Date().toISOString()
    : null;
  return updateAction(userId, actionId, { status, executed_at });
}

/* ------------------------------ agent ------------------------------ */

/**
 * Real clause-level findings for the user's contracts, keyed by the same
 * contract id getContracts() produces. Only findings that genuinely exist
 * in analyzed documents are included - nothing is invented.
 */
export function getContractAnalyses(userId: string): Array<{
  contractId: string;
  documentName: string;
  findings: Array<{
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    detail: string;
    confidence: number;
    evidence?: { excerpt?: string; section?: string; page?: number } | null;
  }>;
}> {
  const userSessions = Object.values(read<Record<string, AnonymousSession>>(KEYS.sessions, {}))
    .filter((s) => s.transferredToUserId === userId && s.result)
    .map((s) => s.result as AnalysisResult);

  return userSessions
    .filter((r) => r.findings && r.findings.length > 0)
    .map((r) => ({
      contractId: `ct-${r.id}`,
      documentName: r.documentName,
      findings: r.findings.map((f) => ({
        type: f.type,
        severity: f.severity,
        title: f.title,
        detail: f.detail,
        confidence: f.confidence,
        evidence: f.evidence
          ? { excerpt: f.evidence.excerpt, section: f.evidence.section, page: f.evidence.page }
          : null,
      })),
    }));
}

export function getAgentMessages(userId: string): AgentMessage[] {
  return read<Record<string, AgentMessage[]>>(KEYS.agentMessages, {})[userId] ?? [];
}

export function saveAgentMessage(userId: string, msg: AgentMessage): AgentMessage[] {
  const all = read<Record<string, AgentMessage[]>>(KEYS.agentMessages, {});
  const mine = all[userId] ?? [];
  const next = [...mine, msg];
  all[userId] = next.slice(-80);
  write(KEYS.agentMessages, all);
  return next;
}

export function clearAgentMessages(userId: string): void {
  const all = read<Record<string, AgentMessage[]>>(KEYS.agentMessages, {});
  all[userId] = [];
  write(KEYS.agentMessages, all);
}

/** Real correspondence only - nothing is seeded. */
export function getEmailThreads(userId: string): EmailThread[] {
  const stored = read<Record<string, EmailThread[]>>(KEYS.emailThreads, {});
  return stored[userId] ?? [];
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
    companyName: "Your company",
    result: null,
    unlockedToUserId: null,
  };
  saveAuditSession(session);
  return session;
}

/** Bind an anonymous review to a real account so it persists after sign-in. */
export function unlockAuditSessionToUser(
  id: string,
  userId: string
): AuditSession | null {
  const session = getAuditSession(id);
  if (!session) return null;
  return updateAuditSession(id, { unlockedToUserId: userId });
}

/** Review sessions that belong to this account (transferred on sign-in). */
export function getAuditSessionsForUser(userId: string): AuditSession[] {
  const sessions = read<Record<string, AuditSession>>(KEYS.auditSessions, {});
  return Object.values(sessions).filter((s) => s.unlockedToUserId === userId);
}

/* ------------------------------ AI usage ------------------------------ */

/**
 * Monthly AI message usage for a user. Messages are counted per calendar
 * month (key includes the YYYY-MM), so the allowance resets naturally.
 * Used to gate the free tier's 5 messages and Pro's 100.
 */
export function getAiUsage(userId: string): { month: string; used: number } {
  const month = new Date().toISOString().slice(0, 7);
  const all = read<Record<string, number>>(KEYS.aiUsage, {});
  return { month, used: all[`${userId}:${month}`] ?? 0 };
}

export function incrementAiUsage(userId: string): number {
  const all = read<Record<string, number>>(KEYS.aiUsage, {});
  const month = new Date().toISOString().slice(0, 7);
  const key = `${userId}:${month}`;
  const next = (all[key] ?? 0) + 1;
  all[key] = next;
  write(KEYS.aiUsage, all);
  return next;
}

/* ------------------------------ misc ------------------------------ */

export function pipelineLabel(stage: PipelineStage | "complete" | "failed"): string {
  if (stage === "complete") return "Complete";
  if (stage === "failed") return "Failed";
  return stage.replace("_", " ");
}
