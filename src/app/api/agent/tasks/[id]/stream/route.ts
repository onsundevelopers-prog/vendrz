import { NextRequest } from "next/server";
import { attachRunStream, detachRunStream, getRun } from "@/lib/services/taskRegistry";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  GET /api/agent/tasks/[id]/stream                                  */
/*  Resume endpoint - a client that reloaded mid-run re-attaches to    */
/*  the live orchestration. It first receives `task.snapshot` with     */
/*  the authoritative current state (full event history included),     */
/*  then live-forwarded events until the run finishes (stream closes). */
/* ------------------------------------------------------------------ */

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const run = getRun(id);
  if (!run) {
    return new Response(JSON.stringify({ error: "Task session not found on the server." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (frame: string): boolean => {
        if (closed) return false;
        try {
          controller.enqueue(encoder.encode(frame));
          return true;
        } catch {
          closed = true;
          return false;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Send the authoritative current snapshot first - the client replaces
      // its stored state with this, so the full history is rebuilt.
      send(sseFrame("task.snapshot", run.task));
      if (run.done) {
        close();
        return;
      }

      attachRunStream(
        id,
        (frame) => {
          const ok = send(frame);
          if (run.done) close();
          return ok;
        },
        close
      );
    },
    cancel() {
      detachRunStream(id);
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
