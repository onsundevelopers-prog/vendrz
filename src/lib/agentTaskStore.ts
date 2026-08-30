"use client";

/* ------------------------------------------------------------------ */
/*  Agent task client store.                                          */
/*                                                                     */
/*  Persists the full task + audit trail in localStorage so a reload   */
/*  or return visit shows the same state and complete history. The     */
/*  server stream is the source of truth during a run; the client      */
/*  applies each real event to rebuild the snapshot and stores the     */
/*  final task.                                                        */
/*                                                                     */
/*  Storage is scoped per user (namespace = current Clerk user id) so   */
/*  two accounts sharing one browser can never see each other's agent   */
/*  history. Every read/write requires the owning userId.               */
/* ------------------------------------------------------------------ */

import type {
  AgentEvent,
  AgentTask,
  AgentTaskStep,
} from "./agentTask";
import { applyEventToStep } from "./agentTask";

const KEY_PREFIX = "vendrz.agentTasks.v2";
const MAX_TASKS = 30;

export interface AgentTaskRef {
  task: AgentTask;
  /** True while a live stream for this task is open. */
  live: boolean;
}

/**
 * localStorage key namespace for a user's tasks. Guaranteed to be a suffix
 * of the same bucket the sync layer reads from (see lib/sync.ts). An empty
 * userId (unauthenticated) resolves to a "local anonymous" namespace so the
 * page still works while keeping user storage isolated.
 */
function keyFor(userId: string): string {
  return userId ? `${KEY_PREFIX}:${userId}` : `${KEY_PREFIX}:anon`;
}

function readMap(userId: string): Record<string, AgentTaskRef> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as Record<string, AgentTaskRef>) : {};
  } catch {
    return {};
  }
}

function writeMap(userId: string, map: Record<string, AgentTaskRef>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(map));
  } catch {
    /* storage unavailable - ignore */
  }
}

export function uid(prefix = "t"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Task id in the exact shape the server route accepts
 * (`/^task-[a-z0-9]+$/` - no internal hyphens). The chat's URL, the SSE
 * stream and the approval endpoint all key on this id, so client and
 * server must agree on it.
 */
export function taskUid(): string {
  return `task-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** All tasks for the workspace, newest first. */
export function readAgentTasks(userId: string): AgentTaskRef[] {
  const map = readMap(userId);
  return Object.values(map).sort((a, b) =>
    b.task.updatedAt.localeCompare(a.task.updatedAt)
  );
}

export function getAgentTask(userId: string, taskId: string): AgentTaskRef | null {
  const map = readMap(userId);
  return map[taskId] ?? null;
}

export function saveAgentTask(userId: string, task: AgentTask): void {
  const map = readMap(userId);
  const prev = map[task.id];
  map[task.id] = { task, live: prev?.live ?? false };
  // Bound the store to the most recent tasks.
  const entries = Object.entries(map).sort(
    (a, b) => b[1].task.updatedAt.localeCompare(a[1].task.updatedAt)
  );
  for (const [id] of entries.slice(MAX_TASKS)) delete map[id];
  writeMap(userId, map);
}

export function setTaskLive(userId: string, taskId: string, live: boolean): void {
  const map = readMap(userId);
  const ref = map[taskId];
  if (ref) {
    ref.live = live;
    writeMap(userId, map);
  }
}

/**
 * Rebuild a task snapshot from scratch by applying every event in order.
 * Used both for the live stream and to reconcile on reconnect.
 */
export function hydrateTask(
  seed: Pick<AgentTask, "id" | "title" | "request" | "createdAt"> & { plan?: AgentTask["plan"] }
): AgentTask {
  return {
    id: seed.id,
    title: seed.title,
    request: seed.request,
    status: "queued",
    plan: seed.plan ?? { intent: "unknown", steps: [] },
    events: [],
    approvals: [],
    toolCalls: [],
    evidenceIds: [],
    createdAt: seed.createdAt,
    updatedAt: seed.createdAt,
  };
}

/** Apply a single event onto a live (in-memory) task snapshot. */
export function applyLiveEvent(task: AgentTask, ev: AgentEvent): AgentTask {
  const next: AgentTask = {
    ...task,
    events: [...task.events, ev],
    updatedAt: ev.at,
  };

  // project step status
  if (ev.stepId) {
    const idx = next.plan.steps.findIndex((s) => s.id === ev.stepId);
    if (idx >= 0) {
      next.plan.steps = [...next.plan.steps];
      next.plan.steps[idx] = applyEventToStep(next.plan.steps[idx], ev);
    }
  }

  // Capture any approval payload so the UI can render the gate.
  if (ev.approval) {
    next.approvals = [...next.approvals.filter((a) => a.id !== ev.approval!.id), ev.approval];
  }

  switch (ev.type) {
    case "plan.created":
      // The full plan arrives with this event - adopt it so the live
      // narration (phase stepper, step cards, approval gate) renders as
      // the run streams instead of only after the final snapshot.
      if (ev.plan) next.plan = ev.plan;
      break;
    case "task.started":
      next.status = "running";
      break;
    case "task.completed":
      next.status = "completed";
      next.completedAt = ev.at;
      break;
    case "task.failed":
      next.status = "failed";
      next.error = ev.detail ?? next.error;
      break;
    case "task.cancelled":
      next.status = "cancelled";
      break;
    case "approval.required":
      next.status = "awaiting_approval";
      break;
    case "approval.granted":
    case "approval.denied": {
      next.status = "running";
      // Mark the pending approval decided so the gate stops blocking.
      const lastPending = [...next.approvals].reverse().find((a) => a.status === "pending");
      if (lastPending) {
        next.approvals = next.approvals.map((a) =>
          a.id === lastPending.id
            ? { ...a, status: ev.type === "approval.granted" ? "granted" : "denied", decidedAt: ev.at }
            : a
        );
      }
      break;
    }
    case "tool.started":
    case "tool.completed":
    case "tool.failed": {
      if (ev.tool) next.toolCalls = [...next.toolCalls, { name: ev.tool, at: ev.at }];
      break;
    }
    default:
      break;
  }

  return next;
}

export function applySnapshotTask(userId: string, task: AgentTask): void {
  saveAgentTask(userId, task);
}

/* ------------------------------ audit ------------------------------ */

export interface AgentAuditEvent {
  taskId: string;
  label: string;
  detail?: string;
  at: string;
}

const AUDIT_KEY_PREFIX = "vendrz.agentAudit.v2";

/** Audit localStorage namespace for a user (mirrors the task key scheme). */
function auditKeyFor(userId: string): string {
  return userId ? `${AUDIT_KEY_PREFIX}:${userId}` : `${AUDIT_KEY_PREFIX}:anon`;
}

export function readAudit(userId: string): AgentAuditEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(auditKeyFor(userId));
    return raw ? (JSON.parse(raw) as AgentAuditEvent[]) : [];
  } catch {
    return [];
  }
}

export function appendAudit(userId: string, entry: Omit<AgentAuditEvent, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const list = readAudit(userId);
    list.unshift({ ...entry, at: new Date().toISOString() });
    window.localStorage.setItem(
      auditKeyFor(userId),
      JSON.stringify(list.slice(0, 100))
    );
  } catch {
    /* ignore */
  }
}

export function auditFromEvents(taskId: string, events: AgentEvent[]): AgentAuditEvent[] {
  return events.map((e) => ({
    taskId,
    label:
      e.type === "tool.started"
        ? `AI ${e.label ?? "running tool"}`
        : e.type === "tool.completed"
          ? `AI finished ${e.tool ?? "a tool"}`
          : e.type === "approval.required"
            ? "Approval requested"
            : e.type === "approval.granted"
              ? "User approved"
              : e.type === "task.completed"
                ? "Task completed"
                : e.type,
    detail: e.detail,
    at: e.at,
  }));
}

export function stepStatusCount(steps: AgentTaskStep[]): {
  completed: number;
  total: number;
  pending: number;
} {
  const total = steps.length;
  const completed = steps.filter((s) => s.status === "completed").length;
  return { completed, total, pending: total - completed };
}

/** Human title derived from a prompt. */
export function titleForPrompt(prompt: string): string {
  const t = prompt.trim().replace(/\s+/g, " ");
  return t.length <= 52 ? t : `${t.slice(0, 52).trim()}…`;
}