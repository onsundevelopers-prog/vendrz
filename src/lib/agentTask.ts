/* ------------------------------------------------------------------ */
/*  Agent task model - shared between the server orchestrator and the  */
/*  client. This is the contract for the real-time operational agent.  */
/*                                                                     */
/*  A task is the full, traceable execution of a single user request:  */
/*  User request → Plan → Actions → Tool results → Approvals → result. */
/*                                                                     */
/*  The server is the source of truth during a run: it streams         */
/*  NamedEvents over SSE, and only transitions a step to `completed`   */
/*  after the underlying operation genuinely succeeded. The client     */
/*  persists the resulting snapshot so a reload shows the same state.  */
/* ------------------------------------------------------------------ */

/* ------------------------- statuses ------------------------- */

export type AgentStepStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "requires_approval"
  | "cancelled";

export type AgentTaskStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

/* ------------------------- phases ------------------------- */

/**
 * The visible lifecycle of a task, in order:
 * REQUEST → PLAN → ACTIONS → RESULTS → APPROVAL → EXECUTE → VERIFY → COMPLETE.
 * Every step belongs to exactly one phase; the workbench renders phases
 * as the live section headers the user watches stream in.
 */
export type AgentPhase =
  | "plan"
  | "actions"
  | "results"
  | "approval"
  | "execute"
  | "verify"
  | "complete";

export const AGENT_PHASES: AgentPhase[] = [
  "plan",
  "actions",
  "results",
  "approval",
  "execute",
  "verify",
  "complete",
];

export const PHASE_LABEL: Record<AgentPhase, string> = {
  plan: "Plan",
  actions: "Actions",
  results: "Results",
  approval: "Approval",
  execute: "Execute",
  verify: "Verify",
  complete: "Complete",
};

/* ------------------------- steps & plan ------------------------- */

export type AgentStepKind =
  | "understand"
  | "retrieve"
  | "analyze"
  | "verify"
  | "prepare"
  | "approve"
  | "execute"
  | "record";

/** Map a step kind to the phase it is rendered under. */
export function stepPhase(kind: AgentStepKind): AgentPhase {
  switch (kind) {
    case "understand": return "plan";
    case "retrieve":
    case "analyze": return "actions";
    case "prepare": return "results";
    case "approve": return "approval";
    case "execute": return "execute";
    case "verify": return "verify";
    case "record": return "complete";
  }
}

/** A single traceable step in a task's execution plan. */
export interface AgentTaskStep {
  id: string;
  kind: AgentStepKind;
  /** Short label, e.g. "Find contract" */
  title: string;
  /** Human description shown in the execution timeline. */
  detail?: string;
  /** Optional real query/input that drove this step. */
  query?: string;
  status: AgentStepStatus;
  /** Real result text or a short evidence excerpt. */
  result?: string;
  /** Reserved for an approval-driven step while waiting. */
  approvalId?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
}

/** The full plan produced when a task is created. */
export interface AgentPlan {
  intent: string;
  steps: AgentTaskStep[];
}

/* ------------------------- execution events ------------------------- */

export type AgentEventType =
  | "task.created"
  | "task.started"
  | "plan.created"
  | "step.started"
  | "step.completed"
  | "step.failed"
  | "approval.required"
  | "approval.granted"
  | "approval.denied"
  | "tool.started"
  | "tool.completed"
  | "tool.failed"
  | "task.completed"
  | "task.failed"
  | "task.cancelled";

/** A real event emitted by the orchestrator, delivered over SSE. */
export interface AgentEvent {
  type: AgentEventType;
  taskId: string;
  stepId?: string;
  tool?: string;
  label?: string;
  detail?: string;
  /** Present on `approval.required` - the full request for the client. */
  approval?: AgentApprovalRequest;
  /** Present on `plan.created` - the full execution plan for the client. */
  plan?: AgentPlan;
  at: string; // ISO
}

/* ------------------------- approvals ------------------------- */

export type AgentApprovalActionType =
  | "cancellation"
  | "negotiation"
  | "renewal"
  | "follow_up";

export interface AgentApprovalRequest {
  id: string;
  taskId: string;
  actionType: AgentApprovalActionType;
  vendorName: string;
  to: string;
  reason: string;
  subject: string;
  body: string;
  requiresGmail: boolean;
  status: "pending" | "granted" | "denied";
  createdAt: string;
  decidedAt?: string;
}

/* ------------------------- task record ------------------------- */

/**
 * A real extracted clause finding from the user's contract analysis -
 * passed from the client so the agent can genuinely "read the document".
 * Only findings that actually exist in the user's data are ever shown.
 */
export interface AgentClauseFinding {
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  confidence: number;
  evidence?: { excerpt?: string; section?: string; page?: number } | null;
}

/** Clause findings for one contract (id matches a ContractRecord id). */
export interface AgentContractAnalysis {
  contractId: string;
  documentName: string;
  findings: AgentClauseFinding[];
}

/** Idempotency key a client may supply to avoid duplicate external runs. */
export interface AgentTaskCreateInput {
  request: string;
  senderName: string;
  /** Client-generated final task id, honored by the server as the task key. */
  taskId?: string;
  idempotencyKey?: string;
  contracts: Array<Record<string, unknown>>;
  threads: Array<Record<string, unknown>>;
  activity: Array<Record<string, unknown>>;
  /** Real clause findings per contract, when the user has analyzed documents. */
  analyses?: AgentContractAnalysis[];
  /** Real Gmail connection state (client-side, honest). */
  gmailConnected?: boolean;
}

export interface AgentTask {
  id: string;
  title: string;
  request: string;
  status: AgentTaskStatus;
  plan: AgentPlan;
  events: AgentEvent[];
  approvals: AgentApprovalRequest[];
  toolCalls: { name: string; at: string }[];
  error?: string;
  result?: string;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  idempotencyKey?: string;
}

/* ------------------------- event name helpers ------------------------- */

/** Latest snapshot of a step projected from the event stream. */
export function applyEventToStep(
  step: AgentTaskStep,
  ev: AgentEvent
): AgentTaskStep {
  switch (ev.type) {
    case "step.started":
      return {
        ...step,
        status: "running",
        startedAt: ev.at,
        error: undefined,
      };
    case "step.completed":
      return {
        ...step,
        status: "completed",
        result: ev.detail ?? step.result,
        completedAt: ev.at,
        error: undefined,
      };
    case "step.failed":
      return {
        ...step,
        status: "failed",
        error: ev.detail ?? step.error,
        failedAt: ev.at,
      };
    case "approval.required":
      return { ...step, status: "requires_approval", approvalId: ev.stepId, result: ev.detail };
    case "approval.granted":
    case "approval.denied":
      return { ...step, status: "running", approvalId: undefined };
    case "task.cancelled":
      return step.status === "queued" || step.status === "running"
        ? { ...step, status: "cancelled" }
        : step;
    default:
      return step;
  }
}
