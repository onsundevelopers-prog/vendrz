"use client";

/* ------------------------------------------------------------------ */
/*  Workspace sync (Clerk + Supabase).                                */
/*                                                                     */
/*  localStorage stays the render-time source of truth (all store.ts   */
/*  reads are unchanged); this layer mirrors each user's data to and   */
/*  from Supabase so it survives browsers, devices and logouts:        */
/*    - hydrateUserData(): on dashboard load, merge the user's saved   */
/*      data into localStorage (missing items only - local wins).      */
/*    - persistUserData(): debounced write of the user's sections.     */
/*                                                                     */
/*  When Supabase isn't configured the fetches fail gracefully and     */
/*  the app behaves exactly as before (local-only).                    */
/* ------------------------------------------------------------------ */

import { KEYS } from "./store";
import type { AgentTaskRef } from "./agentTaskStore";
import { readAgentTasks as _readTasks } from "./agentTaskStore";
import type {
  ActivityRecord,
  AgentMessage,
  AnonymousSession,
  ApprovalAction,
  AuditSession,
  EmailThread,
  GmailConnection,
} from "./types";

export interface UserBlob {
  sessions?: AnonymousSession[];
  activity?: ActivityRecord[];
  agentMessages?: AgentMessage[];
  /** Agent (AI assistant) tasks for the user, terminal ones included. */
  agentTasks?: AgentTaskRef[];
  /** Pending/approved/rejected approval actions for the user. */
  actions?: ApprovalAction[];
  /** Free-review results claimed by this account. */
  auditSessions?: AuditSession[];
  aiUsage?: Record<string, number>;
  emailThreads?: EmailThread[];
  gmail?: GmailConnection;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable - session-only */
  }
}

/** Merge per-user arrays: use the saved copy only when local is empty. */
function mergeUserArray<T>(
  key: string,
  userId: string,
  saved: T[] | undefined
): boolean {
  if (!Array.isArray(saved) || saved.length === 0) return false;
  const map = read<Record<string, T[]>>(key, {});
  const local = map[userId];
  if (Array.isArray(local) && local.length > 0) return false; // local wins
  map[userId] = saved;
  write(key, map);
  return true;
}

/** Merge the global sessions map: add saved sessions that aren't local. */
function mergeSessions(saved: AnonymousSession[] | undefined): boolean {
  if (!Array.isArray(saved) || saved.length === 0) return false;
  const map = read<Record<string, AnonymousSession>>(KEYS.sessions, {});
  let touched = false;
  for (const s of saved) {
    if (s && s.id && !map[s.id]) {
      map[s.id] = s;
      touched = true;
    }
  }
  if (touched) write(KEYS.sessions, map);
  return touched;
}

/** Merge saved approval actions that aren't already local (local wins). */
function mergeActions(
  userId: string,
  saved: ApprovalAction[] | undefined
): boolean {
  if (!Array.isArray(saved) || saved.length === 0) return false;
  const all = read<Record<string, Record<string, ApprovalAction>>>(KEYS.actions, {});
  const mine = all[userId] ?? {};
  let touched = false;
  for (const a of saved) {
    if (a && a.action_id && !mine[a.action_id]) {
      mine[a.action_id] = a;
      touched = true;
    }
  }
  if (touched) {
    all[userId] = mine;
    write(KEYS.actions, all);
  }
  return touched;
}

/** Merge claimed free-review sessions that aren't already local. */
function mergeAuditSessions(saved: AuditSession[] | undefined): boolean {
  if (!Array.isArray(saved) || saved.length === 0) return false;
  const map = read<Record<string, AuditSession>>(KEYS.auditSessions, {});
  let touched = false;
  for (const s of saved) {
    if (s && s.id && !map[s.id]) {
      map[s.id] = s;
      touched = true;
    }
  }
  if (touched) write(KEYS.auditSessions, map);
  return touched;
}

/** Merge the saved agent (AI assistant) tasks that aren't already local. */
function mergeAgentTasks(
  userId: string,
  saved: AgentTaskRef[] | undefined
): boolean {
  if (!Array.isArray(saved) || saved.length === 0) return false;
  const local = read<Record<string, AgentTaskRef>>(
    userId ? `vendrz.agentTasks.v2:${userId}` : "vendrz.agentTasks.v2:anon",
    {}
  );
  let touched = false;
  for (const ref of saved) {
    const t = ref?.task;
    if (t && t.id && !local[t.id]) {
      local[t.id] = { task: t, live: false };
      touched = true;
    }
  }
  if (touched) {
    write(
      userId ? `vendrz.agentTasks.v2:${userId}` : "vendrz.agentTasks.v2:anon",
      local
    );
  }
  return touched;
}

/** Merge monthly AI usage entries for this user (missing months only). */
function mergeAiUsage(userId: string, saved: Record<string, number> | undefined): boolean {
  if (!saved || Object.keys(saved).length === 0) return false;
  const map = read<Record<string, number>>(KEYS.aiUsage, {});
  const prefix = `${userId}:`;
  let touched = false;
  for (const [k, v] of Object.entries(saved)) {
    if (k.startsWith(prefix) && map[k] === undefined) {
      map[k] = v;
      touched = true;
    }
  }
  if (touched) write(KEYS.aiUsage, map);
  return touched;
}

/** Pull the user's saved data from Supabase into localStorage. */
export async function hydrateUserData(userId: string): Promise<boolean> {
  try {
    const res = await fetch("/api/user-data");
    if (!res.ok) return false;
    const { data } = (await res.json()) as { data: UserBlob };
    if (!data || Object.keys(data).length === 0) return false;

    let changed = false;
    if (mergeSessions(data.sessions)) changed = true;
    if (mergeUserArray(KEYS.activity, userId, data.activity)) changed = true;
    if (mergeUserArray(KEYS.agentMessages, userId, data.agentMessages)) changed = true;
    if (mergeUserArray(KEYS.emailThreads, userId, data.emailThreads)) changed = true;
    if (mergeAiUsage(userId, data.aiUsage)) changed = true;
    if (mergeAgentTasks(userId, data.agentTasks)) changed = true;
    if (mergeActions(userId, data.actions)) changed = true;
    if (mergeAuditSessions(data.auditSessions)) changed = true;
    if (data.gmail) {
      const map = read<Record<string, GmailConnection>>(KEYS.gmail, {});
      if (!map[userId]) {
        map[userId] = data.gmail;
        write(KEYS.gmail, map);
        changed = true;
      }
    }
    return changed;
  } catch {
    return false;
  }
}

/* ------------------------- persist ------------------------- */

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let pendingUserId: string | null = null;

/** Debounced push of the user's workspace sections to Supabase. */
export function persistUserData(userId: string): void {
  if (persistTimer) return;
  pendingUserId = userId;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    const id = pendingUserId;
    pendingUserId = null;
    if (id) void pushUserData(id);
  }, 2000);
}

async function pushUserData(userId: string): Promise<void> {
  try {
    const blob: UserBlob = {};

    const sessions = read<Record<string, AnonymousSession>>(KEYS.sessions, {});
    const mine = Object.values(sessions).filter(
      (s) => s.transferredToUserId === userId && s.result
    );
    if (mine.length > 0) blob.sessions = mine;

    const activity = read<Record<string, ActivityRecord[]>>(KEYS.activity, {})[userId];
    if (activity?.length) blob.activity = activity;

    const agentMessages = read<Record<string, AgentMessage[]>>(KEYS.agentMessages, {})[userId];
    if (agentMessages?.length) blob.agentMessages = agentMessages;

    const emailThreads = read<Record<string, EmailThread[]>>(KEYS.emailThreads, {})[userId];
    if (emailThreads?.length) blob.emailThreads = emailThreads;

    // Agent (AI assistant) tasks + audit for the user.
    const agentTasks = _readTasks(userId);
    if (agentTasks.length > 0) blob.agentTasks = agentTasks;

    // Free-review sessions claimed by / bound to this account.
    const auditSessions = read<Record<string, AuditSession>>(KEYS.auditSessions, {});
    const myAudits = Object.values(auditSessions).filter((s) => s.unlockedToUserId === userId);
    if (myAudits.length > 0) blob.auditSessions = myAudits;
    const actions = read<Record<string, Record<string, ApprovalAction>>>(KEYS.actions, {})[
      userId
    ];
    if (actions && Object.keys(actions).length > 0) {
      blob.actions = Object.values(actions);
    }

    const gmail = read<Record<string, GmailConnection>>(KEYS.gmail, {})[userId];
    if (gmail) blob.gmail = gmail;

    const aiUsage = read<Record<string, number>>(KEYS.aiUsage, {});
    const prefix = `${userId}:`;
    const aiMine = Object.fromEntries(
      Object.entries(aiUsage).filter(([k]) => k.startsWith(prefix))
    );
    if (Object.keys(aiMine).length > 0) blob.aiUsage = aiMine;

    if (Object.keys(blob).length === 0) return;

    await fetch("/api/user-data", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: blob }),
    });
  } catch {
    // Offline or persistence unavailable - retried on the next interval.
  }
}
