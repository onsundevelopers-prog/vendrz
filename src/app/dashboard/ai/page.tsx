"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthUser } from "@/lib/auth";
import { planDef, useDisplayMode } from "@/lib/displayMode";
import {
  getActivity,
  getContracts,
  getContractAnalyses,
  getEmailThreads,
  getGmailConnection,
  getAiUsage,
  incrementAiUsage,
  logActivity,
} from "@/lib/store";
import type { AgentApprovalRequest, AgentEvent, AgentTask } from "@/lib/agentTask";
import {
  readAgentTasks,
  saveAgentTask,
  setTaskLive,
  taskUid,
  hydrateTask,
  applyLiveEvent,
  auditFromEvents,
  appendAudit,
  titleForPrompt,
} from "@/lib/agentTaskStore";
import { openAgentStream, openAgentStreamGet, type OpenStreamResult } from "@/lib/agentStream";
import { TaskWorkspace } from "@/components/dashboard/ai/task-workspace";
import { Skeleton } from "@/components/ui/skeleton";

/* ------------------------------------------------------------------ */
/*  AI - the autonomous work agent workbench.                         */
/*                                                                     */
/*  USER GIVES A JOB → a NEW DEDICATED CHAT OPENS (its own URL) →      */
/*  the user watches the agent work live inside that chat.             */
/*                                                                     */
/*  Agents run in PARALLEL: every job opens its own chat and streams   */
/*  its own execution, so you can give several jobs and watch them     */
/*  all work at once. Each task keeps its own state, events, tool      */
/*  calls, approvals, errors and history, persisted locally so any     */
/*  previous chat can be reopened and inspected in full.               */
/* ------------------------------------------------------------------ */

/** How many agents may run simultaneously (each in its own chat). */
const MAX_PARALLEL = 4;

function AIWorkbench() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const auth = useAuthUser();
  // Data is strictly scoped to the real Clerk user. There is no synthetic
  // "demo" account bucket - an unauthenticated visitor gets no data.
  const userId = auth.id ?? "";
  const { plan, aiMessageLimit, requestUpgrade } = useDisplayMode();

  const contracts = useMemo(() => (userId ? getContracts(userId) : []), [userId]);
  const threads = useMemo(() => (userId ? getEmailThreads(userId) : []), [userId]);
  const activity = useMemo(() => (userId ? getActivity(userId) : []), [userId]);
  const analyses = useMemo(() => (userId ? getContractAnalyses(userId) : []), [userId]);
  const gmailConnected = useMemo(() => (userId ? !!getGmailConnection(userId) : false), [userId]);

  const [tasks, setTasks] = useState<AgentTask[]>(() =>
    readAgentTasks(userId).map((r) => r.task)
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState(false);
  // Every running agent lives in its own slot, keyed by task id.
  const [liveMap, setLiveMap] = useState<Record<string, AgentTask>>({});
  const liveMapRef = useRef<Record<string, AgentTask>>({});
  const streamsRef = useRef<Record<string, OpenStreamResult>>({});
  const resumedRef = useRef<string | null>(null);

  const updateLiveState = (map: Record<string, AgentTask>) => {
    liveMapRef.current = map;
    setLiveMap(map);
  };

  const liveTasks = useMemo(() => Object.values(liveMap), [liveMap]);
  const runningCount = useMemo(
    () => liveTasks.filter((t) => t.status === "running" || t.status === "awaiting_approval").length,
    [liveTasks]
  );
  const atCap = runningCount >= MAX_PARALLEL;

  useEffect(
    () => () => {
      for (const s of Object.values(streamsRef.current)) s.close();
    },
    []
  );

  // When the signed-in identity changes (sign-out / switch account), reset the
  // in-memory task list and drop any live streams so a different user never
  // inherits the previous account's agent history.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time identity reset */
    setTasks(readAgentTasks(userId).map((r) => r.task));
    for (const s of Object.values(streamsRef.current)) s.close();
    streamsRef.current = {};
    liveMapRef.current = {};
    setLiveMap({});
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [userId]);

  /* ---------------- selection sync with the URL ---------------- */

  // A dedicated chat has its own URL: /dashboard/ai?id=<taskId>. Opening
  // one from history, the sidebar or a fresh submit all land here.
  const selectedId = useMemo(() => {
    if (!idParam) return null;
    // A launched task lives in liveMap until its first events arrive; a
    // finished one is in tasks. Either counts as a valid chat address, so
    // the URL is never stripped while a job is mid-run.
    const known = tasks.some((t) => t.id === idParam) || !!liveMap[idParam];
    return known ? idParam : null;
  }, [idParam, tasks, liveMap]);

  // Stale URL (task no longer stored) - drop the query param.
  useEffect(() => {
    if (idParam && selectedId === null) router.replace("/dashboard/ai");
  }, [idParam, selectedId, router]);

  /* ---------------- finalize a finished task ---------------- */

  function finalizeTask(task: AgentTask, ok: boolean) {
    const final: AgentTask = { ...task, updatedAt: new Date().toISOString() };
    if (task.status !== "completed" && task.status !== "cancelled" && !ok && final.status !== "failed") {
      final.status = "failed";
    }
    if (!final.error && !ok) final.error = "The analysis stream ended before completing.";
    saveAgentTask(userId, final);
    for (const entry of auditFromEvents(final.id, final.events)) appendAudit(userId, entry);
    setTasks((prev) => [final, ...prev.filter((t) => t.id !== final.id)]);
    const doneCount = final.plan.steps.filter((s) => s.status === "completed").length;
    if (final.status === "completed") {
      logActivity(userId, {
        type: final.events.some((e) => e.type === "approval.granted") ? "email_drafted" : "review",
        actor: "agent",
        title: `AI task completed: ${final.title}`,
        detail: `${doneCount}/${final.plan.steps.length} steps`,
      });
    } else if (final.status === "failed") {
      logActivity(userId, {
        type: "review",
        actor: "agent",
        title: `AI task failed: ${final.title}`,
        detail: final.error || "Execution did not complete.",
      });
    }
  }

  function dropLive(taskId: string) {
    const next = { ...liveMapRef.current };
    delete next[taskId];
    updateLiveState(next);
    delete streamsRef.current[taskId];
    setTaskLive(userId, taskId, false);
  }

  /* ---------------- launch a new agent task ---------------- */

  const runTask = (prompt: string) => {
    if (atCap) {
      setNotice(
        `${MAX_PARALLEL} agents are already running in parallel — wait for one to finish, then start the next job.`
      );
      return;
    }
    // Free / Pro plan AI allowance - counted per calendar month.
    const { used } = getAiUsage(userId);
    if (used >= aiMessageLimit) {
      setLimitHit(true);
      setNotice(
        `You've used all ${aiMessageLimit} AI ${aiMessageLimit === 1 ? "message" : "messages"} this month on the ${planDef(plan).name} plan.`
      );
      return;
    }
    setLimitHit(false);
    incrementAiUsage(userId);
    const title = titleForPrompt(prompt);
    const taskId = taskUid();
    const seed = hydrateTask({ id: taskId, title, request: prompt, createdAt: new Date().toISOString() });
    updateLiveState({ ...liveMapRef.current, [taskId]: seed });
    resumedRef.current = taskId;
    setNotice(null);
    saveAgentTask(userId, seed);
    setTaskLive(userId, taskId, true);

    // Open the NEW DEDICATED CHAT - the URL becomes the chat's address.
    router.replace(`/dashboard/ai?id=${taskId}`);

    const stream = openAgentStream(
      "/api/agent/tasks",
      {
        taskId,
        request: prompt,
        senderName: auth.name ?? "Owner",
        contracts,
        threads,
        activity,
        analyses,
        gmailConnected,
      },
      {
        onEvent: (eventType, data) => {
          if (eventType === "error" || eventType === "approval.decided") return;
          if (eventType === "task.snapshot") {
            const final = data as AgentTask;
            saveAgentTask(userId, final);
            for (const entry of auditFromEvents(final.id, final.events)) appendAudit(userId, entry);
            setTasks((prev) => [final, ...prev.filter((t) => t.id !== final.id)]);
            dropLive(taskId);
            return;
          }
          const ev = data as AgentEvent;
          const cur = liveMapRef.current[taskId];
          if (cur) {
            updateLiveState({ ...liveMapRef.current, [taskId]: applyLiveEvent({ ...cur }, ev) });
          }
        },
        onDone: (ok) => {
          const cur = liveMapRef.current[taskId];
          if (cur) {
            dropLive(taskId);
            finalizeTask(cur, ok);
          }
          delete streamsRef.current[taskId];
        },
        onError: (msg) => {
          const cur = liveMapRef.current[taskId];
          if (cur) {
            // Connection-level errors (page unload, network blip) do NOT mean
            // the run failed - the server session keeps running and the resume
            // stream re-attaches to it. Writing a failed state here would
            // poison the store right as this page dies, so the reloaded page
            // would see a terminal task and never resume. Drop the live slot
            // and let the resume effect re-attach instead.
            if (/network error|Failed to fetch|Load failed|aborted/i.test(msg)) {
              dropLive(taskId);
              delete streamsRef.current[taskId];
              return;
            }
            dropLive(taskId);
            const failed: AgentTask = {
              ...cur,
              status: "failed",
              error: msg,
              events: [...cur.events, { type: "task.failed" as const, taskId: cur.id, at: new Date().toISOString(), detail: msg }],
            };
            finalizeTask(failed, false);
          }
          delete streamsRef.current[taskId];
        },
      }
    );
    streamsRef.current[taskId] = stream;
  };

  /* ---------------- resume a task mid-run after reload ---------------- */

  function resumeTask(taskId: string) {
    const ref = readAgentTasks(userId).find((r) => r.task.id === taskId);
    if (!ref) return;
    updateLiveState({ ...liveMapRef.current, [taskId]: ref.task });
    setTaskLive(userId, taskId, true);
    let receivedSnapshot = false;

    const stream = openAgentStreamGet(`/api/agent/tasks/${taskId}/stream`, {
      onEvent: (eventType, data) => {
        if (eventType === "error") return;          if (eventType === "task.snapshot") {
            receivedSnapshot = true;

          // Authoritative live state (full history included) - replace.
          const snap = data as AgentTask;
          saveAgentTask(userId, snap);
          setTasks((prev) => [snap, ...prev.filter((t) => t.id !== snap.id)]);
          updateLiveState({ ...liveMapRef.current, [taskId]: snap });
          return;
        }
        const ev = data as AgentEvent;
        const cur = liveMapRef.current[taskId];
        if (cur) {
          updateLiveState({ ...liveMapRef.current, [taskId]: applyLiveEvent({ ...cur }, ev) });
        }
      },
      onDone: () => {
        const cur = liveMapRef.current[taskId];
        if (!cur) return;
        dropLive(taskId);
        if (receivedSnapshot) return;
        // Stream ended before a snapshot - session is gone; be honest.
        const t = cur.status;
        if (t !== "completed" && t !== "failed" && t !== "cancelled") {
          const interrupted: AgentTask = {
            ...cur,
            status: "failed",
            error: "The live session for this task ended before it completed. Re-run the task to finish it.",
            events: [
              ...cur.events,
              {
                type: "task.failed" as const,
                taskId: cur.id,
                at: new Date().toISOString(),
                detail: "Session interrupted - task did not complete.",
              },
            ],
          };
          finalizeTask(interrupted, false);
        }
      },
      onError: (msg) => {
        const cur = liveMapRef.current[taskId];
        if (!cur) return;
        dropLive(taskId);
        const failed: AgentTask = {
          ...cur,
          status: "failed",
          error: msg.includes("not found")
            ? "The live session for this task is no longer available on the server. Re-run the task to complete it."
            : msg,
          events: [
            ...cur.events,
            { type: "task.failed" as const, taskId: cur.id, at: new Date().toISOString(), detail: msg },
          ],
        };
        finalizeTask(failed, false);
      },
    });
    streamsRef.current[taskId] = stream;
  }

  // A task left mid-run in local state gets resumed against the live server
  // session so the user keeps watching it work (e.g. after a reload).
  useEffect(() => {
    if (!selectedId) return;
    if (resumedRef.current === selectedId) return;
    if (liveMap[selectedId]) return;
    if (streamsRef.current[selectedId]) return;
    const ref = readAgentTasks(userId).find((r) => r.task.id === selectedId);
    if (!ref) return;
    const t = ref.task;
    const terminal =
      t.status === "completed" || t.status === "failed" || t.status === "cancelled";
    if (terminal) return;
    resumedRef.current = selectedId;
    const id = selectedId;
    // Defer so the synchronous setState inside the resume lives outside the
    // effect body (the effect itself only schedules it).
    queueMicrotask(() => resumeTask(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, liveMap, userId]);

  /* ---------------- approval ---------------- */

  const approve = async (approval: AgentApprovalRequest) => {
    try {
      const res = await fetch(`/api/agent/tasks/${approval.taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true }),
      });
      if (!res.ok) setNotice("Approval did not reach the server. Try again.");
    } catch {
      setNotice("Approval did not reach the server. Try again.");
    }
  };

  const deny = async (approval: AgentApprovalRequest) => {
    try {
      await fetch(`/api/agent/tasks/${approval.taskId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: false }),
      });
    } catch {
      /* ignore */
    }
  };

  /* ---------------- selection / views ---------------- */

  const openChat = (id: string) => {
    if (id === selectedId) return; // already viewing this chat
    resumedRef.current = null;
    router.replace(`/dashboard/ai?id=${id}`);
  };

  const selectedTask: AgentTask | null = useMemo(() => {
    if (selectedId) {
      return liveMap[selectedId] ?? tasks.find((t) => t.id === selectedId) ?? null;
    }
    // URL not synced yet after launching - show the newest live task.
    const newest = Object.values(liveMap).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )[0];
    return newest ?? null;
  }, [selectedId, liveMap, tasks]);

  const readyTasks = useMemo(() => {
    const map = new Map<string, AgentTask>();
    for (const t of tasks) map.set(t.id, t);
    for (const t of Object.values(liveMap)) map.set(t.id, t);
    return [...map.values()]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 40);
  }, [tasks, liveMap]);

  return (
    <div className="relative h-full overflow-hidden bg-canvas">
      {notice && (
        <div className="absolute left-1/2 top-3 z-30 w-full max-w-md -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg border border-zinc-300/25 bg-zinc-400/[0.08] px-3 py-2 text-[12px] text-zinc-300">
            <span>{notice}</span>
            {limitHit && (
              <button
                onClick={() => {
                  setNotice(null);
                  requestUpgrade();
                }}
                className="ml-auto shrink-0 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-black hover:opacity-90"
              >
                Upgrade
              </button>
            )}
            <button onClick={() => setNotice(null)} className="shrink-0 font-medium hover:opacity-80">
              Dismiss
            </button>
          </div>
        </div>
      )}

      {selectedTask !== undefined && (
        <TaskWorkspace
          task={selectedTask}
          tasks={readyTasks}
          contracts={contracts}
          analyses={analyses}
          gmailConnected={gmailConnected}
          runningCount={runningCount}
          atCap={atCap}
          onSelectTask={openChat}
          onSendMessage={runTask}
          onApprove={(a) => void approve(a)}
          onDeny={(a) => void deny(a)}
          onBack={() => router.replace("/dashboard/ai")}
          userName={auth.name?.split(" ")[0] ?? "there"}
        />
      )}
    </div>
  );
}

export default function AIPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col gap-4 bg-canvas p-4">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="flex min-h-0 flex-1 gap-4">
            <Skeleton className="hidden w-56 shrink-0 rounded-lg md:block" />
            <Skeleton className="flex-1 rounded-lg" />
          </div>
        </div>
      }
    >
      <AIWorkbench />
    </Suspense>
  );
}
