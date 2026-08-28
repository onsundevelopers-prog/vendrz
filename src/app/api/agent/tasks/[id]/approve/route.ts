import { NextRequest, NextResponse } from "next/server";
import { decideApproval, getRun } from "@/lib/services/taskRegistry";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  POST /api/agent/tasks/[id]/approve                                */
/*  Grants or denies the pending approval gate for a running task.     */
/*  Returns immediately; the orchestrator continues on the SSE stream. */
/* ------------------------------------------------------------------ */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let approved = false;
  try {
    const body = await req.json();
    approved = body?.approved === true;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const run = getRun(id);
  if (!run) {
    return NextResponse.json({ error: "Task not found or already finished." }, { status: 404 });
  }

  const result = decideApproval(id, approved);
  if (result === "no_gate") {
    return NextResponse.json(
      { error: "This task is not currently awaiting approval." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    taskId: id,
    approved,
    status: run.task.status,
  });
}