import { NextRequest } from "next/server";
import { executeTaskPlan } from "@/lib/services/orchestrator";
import { awaitsApproval, getRun, registerRun, markDone, emitFrame } from "@/lib/services/taskRegistry";
import type { AgentEvent, AgentApprovalRequest, AgentTask, AgentTaskCreateInput } from "@/lib/agentTask";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  POST /api/agent/tasks                                             */
/*  Opens a Server-Sent-Events stream and runs a real agent task       */
/*  start-to-finish, delivering every backend event to the client.     */
/*                                                                     */
/*  The client supplies its real data (contracts/threads/activity)     */
/*  exactly as it does for /api/agent. The orchestrator plans and      */
/*  executes against that data. Consequential actions pause at an      */
/*  approval gate the client resolves via POST /tasks/[id]/approve.    */
/*                                                                     */
/*  Every emitted frame also flows through the task registry so a      */
/*  client that reloads mid-run can resume via GET /tasks/[id]/stream. */
/* ------------------------------------------------------------------ */

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

const uid = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function POST(req: NextRequest) {
  let body: AgentTaskCreateInput;
  try {
    body = (await req.json()) as AgentTaskCreateInput;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const request = (body.request ?? "").trim();
  if (!request) {
    return new Response(JSON.stringify({ error: "No request provided." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // The client generates the task id that also keys the chat URL, the
  // stream and the approval endpoint - trust it as long as it is the
  // expected shape (new `task-<alnum>` ids and legacy hyphenated ones).
  const taskId =
    body.taskId && /^task-[a-z0-9-]+$/.test(body.taskId) ? body.taskId : uid("task");
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let cancelled = false;
      const sendFrame = (frame: string): boolean => {
        if (cancelled) return false;
        try {
          controller.enqueue(encoder.encode(frame));
          return true;
        } catch {
          cancelled = true;
          return false;
        }
      };

      // The exact task object the orchestrator mutates, registered BEFORE
      // launch so the approval endpoint and resume stream see live state.
      const now = new Date().toISOString();
      const seed: AgentTask = {
        id: taskId,
        title: request.trim().replace(/\s+/g, " ").slice(0, 52),
        request,
        status: "queued",
        plan: { intent: "", steps: [] },
        events: [],
        approvals: [],
        toolCalls: [],
        evidenceIds: [],
        createdAt: now,
        updatedAt: now,
        idempotencyKey: body.idempotencyKey,
      };
      registerRun(taskId, seed, { emit: sendFrame });

      void (async () => {
        try {
          const task = await executeTaskPlan(
            body,
            {
              emit: async (e: AgentEvent) => {
                emitFrame(taskId, sseFrame(e.type, e));
              },
              requestApproval: async (approval: AgentApprovalRequest) => {
                // The orchestrator already emits `approval.required` with the
                // full payload on the event. This callback only waits for the
                // user decision via /tasks/[id]/approve and reports it.
                void approval;
                const run = getRun(taskId);
                if (run) {
                  const granted = await awaitsApproval(run);
                  emitFrame(taskId, sseFrame("approval.decided", { granted }));
                  return granted;
                }
                return false;
              },
            },
            seed
          );
          emitFrame(taskId, sseFrame("task.snapshot", task));
          markDone(task.id, task);
        } catch (err) {
          emitFrame(taskId, sseFrame("error", { detail: err instanceof Error ? err.message : "Execution failed" }));
        } finally {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        }
      })();
    },
    cancel() {
      // Client disconnected - the run continues server-side. Events keep
      // buffering in the registry; the client can resume via the GET stream,
      // and the idempotency key prevents re-running an action that completed.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
