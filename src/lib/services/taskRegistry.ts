/* ------------------------------------------------------------------ */
/*  In-memory agent task registry (server-scoped).                    */
/*                                                                     */
/*  Coordinates a running orchestration with its SSE stream(s) and the */
/*  approval endpoint across separate HTTP requests:                   */
/*    - POST /api/agent/tasks      opens the SSE stream and launches   */
/*      the orchestration background task.                             */
/*    - GET  /api/agent/tasks/[id]/stream   re-attaches a client that  */
/*      reloaded mid-run: replays buffered frames, then live-forwards. */
/*    - POST .../[id]/approve      resolves a pending approval promise.*/
/*                                                                     */
/*  Every emitted frame is buffered (ring) so a reconnecting client    */
/*  can rebuild the exact execution history it missed. The run's task  */
/*  object is mutated in place by the orchestrator, so the registry    */
/*  always exposes current live state.                                 */
/*                                                                     */
/*  Production note: replace with Redis for multi-process scaling;     */
/*  keep an idempotency key so a reconnect never re-runs a completed   */
/*  task.                                                              */
/* ------------------------------------------------------------------ */

import type { AgentTask } from "@/lib/agentTask";

interface PendingRun {
  task: AgentTask;
  /** Resolve when the approval is decided (true = granted). */
  resolveApproval?: (granted: boolean) => void;
  /** Deliver a serialized SSE frame to the currently attached stream. */
  emit?: (frame: string) => boolean;
  /** Close the attached stream when the run finishes. */
  onClosed?: () => void;
  /** Ring buffer of recent SSE frames (event + snapshot), for replay. */
  buffer: string[];
  done: boolean;
}

const runs = new Map<string, PendingRun>();

const MAX_BUFFER = 500;

export function registerRun(taskId: string, task: AgentTask, opts: Partial<Pick<PendingRun, "emit" | "onClosed">> = {}): void {
  runs.set(taskId, { task, buffer: [], done: false, ...opts });
}

export function getRun(taskId: string): PendingRun | undefined {
  return runs.get(taskId);
}

export function markDone(taskId: string, task: AgentTask): void {
  const run = runs.get(taskId);
  if (run) {
    run.task = task;
    run.done = true;
    run.onClosed?.();
  }
}

/** Emit a serialized frame: buffer it and forward to any attached stream. */
export function emitFrame(taskId: string, frame: string): boolean {
  const run = runs.get(taskId);
  if (!run) return false;
  run.buffer.push(frame);
  if (run.buffer.length > MAX_BUFFER) run.buffer.splice(0, run.buffer.length - MAX_BUFFER);
  if (run.emit) {
    try {
      return run.emit(frame);
    } catch {
      return false;
    }
  }
  // No attached stream - buffered for the next reconnect.
  return true;
}

/**
 * Attach a new stream to a run (used by the resume endpoint). Returns
 * the buffered frames to replay and whether the run is already done.
 */
export function attachRunStream(
  taskId: string,
  emit: (frame: string) => boolean,
  onClosed?: () => void
): { buffered: string[]; done: boolean } | undefined {
  const run = runs.get(taskId);
  if (!run) return undefined;
  run.emit = emit;
  run.onClosed = onClosed;
  return { buffered: [...run.buffer], done: run.done };
}

/** Detach a stream (e.g. client disconnected the resume stream). */
export function detachRunStream(taskId: string): void {
  const run = runs.get(taskId);
  if (run) {
    run.emit = undefined;
    run.onClosed = undefined;
  }
}

/** Register a pending approval; the orchestrator awaits the returned promise. */
export function awaitsApproval(run: PendingRun): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    run.resolveApproval = resolve;
  });
}

/**
 * Decide a pending approval. Returns:
 *   - "ok"        if granted/denied and the run is awaiting approval
 *   - "not_found" if the run/task is unknown
 *   - "no_gate"   if the task exists but is not currently awaiting approval
 */
export function decideApproval(taskId: string, granted: boolean): "ok" | "not_found" | "no_gate" {
  const run = runs.get(taskId);
  if (!run || !run.task) return "not_found";
  if (!run.resolveApproval) return "no_gate";
  run.resolveApproval(granted);
  run.resolveApproval = undefined;
  return "ok";
}

export function disposeRun(taskId: string): void {
  runs.delete(taskId);
}

/** Keep the registry bounded. */
export function sweepRuns(maxAgeMs = 3600_000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, run] of runs) {
    if (run.done && new Date(run.task.completedAt ?? run.task.updatedAt).getTime() < cutoff) {
      runs.delete(id);
    }
  }
}
