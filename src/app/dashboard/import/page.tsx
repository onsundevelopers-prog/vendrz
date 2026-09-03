"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  FileUp,
  FolderInput,
  Mail,
  MessageSquare,
  Plug,
  RefreshCw,
} from "lucide-react";
import { useAuthUser } from "@/lib/workspace-auth";
import { useDisplayMode } from "@/lib/displayMode";
import {
  disconnectSource,
  getAllowance,
  getStatus,
  type ConnectionStatus,
  type ImportAllowance,
} from "@/components/dashboard/import/shared";
import { DrivePanel } from "@/components/dashboard/import/DrivePanel";
import { SlackPanel } from "@/components/dashboard/import/SlackPanel";

/* ------------------------------------------------------------------ */
/*  Add Vendor Data - the four-source ingestion picker.                */
/*                                                                     */
/*    Upload / Gmail / Google Drive / Slack                            */
/*                                                                     */
/*  Every source eventually feeds the same ingestion pipeline; this    */
/*  page manages connection state and hands off to each source's       */
/*  working panel. Statuses shown are real: not configured, not        */
/*  connected, connected, reconnect required, plus per-import states   */
/*  inside the panels (searching / importing / processing / complete / */
/*  failed).                                                           */
/* ------------------------------------------------------------------ */

type SourceId = "upload" | "gmail" | "drive" | "slack";

const SOURCES: Array<{
  id: SourceId;
  title: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    id: "upload",
    title: "Upload",
    desc: "Manual document upload",
    icon: <FileUp size={15} />,
  },
  {
    id: "gmail",
    title: "Gmail",
    desc: "Find vendor documents in Gmail",
    icon: <Mail size={15} />,
  },
  {
    id: "drive",
    title: "Google Drive",
    desc: "Import documents from Drive",
    icon: <FolderInput size={15} />,
  },
  {
    id: "slack",
    title: "Slack",
    desc: "Find vendor information in Slack",
    icon: <MessageSquare size={15} />,
  },
];

export default function ImportPage() {
  const router = useRouter();
  const auth = useAuthUser();
  const userId = auth.id;
  const { requestUpgrade } = useDisplayMode();

  const [active, setActive] = useState<SourceId | null>("upload");
  const [gmail, setGmail] = useState<ConnectionStatus | null>(null);
  const [drive, setDrive] = useState<ConnectionStatus | null>(null);
  const [slack, setSlack] = useState<ConnectionStatus | null>(null);
  const [allowance, setAllowance] = useState<ImportAllowance | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const refreshStatuses = useCallback(() => {
    void getStatus("/api/gmail/status").then(setGmail);
    void getStatus("/api/drive/status").then(setDrive);
    void getStatus("/api/slack/status").then(setSlack);
    void getAllowance().then(setAllowance);
  }, []);

  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  // Surface the result of any OAuth round-trip the callbacks redirected back with.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const msgFor = (key: "gmail" | "drive" | "slack", label: string) => {
      const v = p.get(key);
      if (v === "connected") {
        setToast({ kind: "ok", text: `${label} connected. Vendor documents can now be imported.` });
      } else if (v === "denied") {
        setToast({ kind: "err", text: `${label} access was denied. No data was shared.` });
      } else if (v === "error") {
        setToast({ kind: "err", text: `Couldn't connect ${label}. Please try again.` });
      }
      return v;
    };
    const has = msgFor("gmail", "Gmail") || msgFor("drive", "Google Drive") || msgFor("slack", "Slack");
    if (has) {
      window.history.replaceState({}, "", "/dashboard/import");
      refreshStatuses();
    }
  }, [refreshStatuses]);

  const handleDisconnect = useCallback(
    async (which: "gmail" | "drive" | "slack") => {
      const path = `/api/${which}/disconnect` as const;
      const ok = await disconnectSource(path);
      if (ok) {
        if (which === "gmail") setGmail((s) => ({ connected: false, configured: s?.configured }));
        if (which === "drive") setDrive((s) => ({ connected: false, configured: s?.configured }));
        if (which === "slack") setSlack((s) => ({ connected: false, configured: s?.configured }));
        setToast({ kind: "ok", text: "Disconnected. No further access to this source." });
      } else {
        setToast({ kind: "err", text: "Couldn't disconnect right now. Try again." });
      }
    },
    []
  );

  const reloadAllowance = useCallback(() => {
    void getAllowance().then(setAllowance);
  }, []);

  const stateOf = useCallback(
    (id: Exclude<SourceId, "upload">): ConnectionStatus | null =>
      id === "gmail" ? gmail : id === "drive" ? drive : slack,
    [gmail, drive, slack]
  );

  const cardState = useCallback(
    (id: SourceId) => {
      if (id === "upload") return { chip: "Available" as const, tone: "neutral" as const };
      const s = stateOf(id as Exclude<SourceId, "upload">);
      if (s === null) return { chip: "Checking…" as const, tone: "neutral" as const };
      if (s.connected) return { chip: "Connected" as const, tone: "on" as const };
      if (s.reconnectRequired) return { chip: "Reconnect required" as const, tone: "warn" as const };
      if (s.configured === false) return { chip: "Not configured" as const, tone: "neutral" as const };
      return { chip: "Not connected" as const, tone: "neutral" as const };
    },
    [stateOf]
  );

  const connectUrl = useCallback(
    (id: "gmail" | "drive" | "slack") => `/api/${id}/auth?next=/dashboard/import`,
    []
  );

  const connLabel = useMemo(() => {
    const parts: string[] = [];
    if (gmail?.connected) parts.push(`Gmail${gmail.email ? ` ${gmail.email}` : ""}`);
    if (drive?.connected) parts.push(`Drive${drive.email ? ` ${drive.email}` : ""}`);
    if (slack?.connected) parts.push(`Slack${slack.teamName ? ` ${slack.teamName}` : ""}`);
    return parts.join(" · ");
  }, [gmail, drive, slack]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[880px] px-6 py-5">
        {/* ---------- header ---------- */}
        <div className="flex items-end gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold tracking-[-0.01em] text-muted">Data sources</p>
            <h1 className="mt-1 text-[20px] font-semibold tracking-tight text-fg">Add vendor data</h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Bring vendor contracts and documents in from the systems you already use. Every source runs
              through the same analysis pipeline.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5 pb-0.5">
            {allowance && Number.isFinite(allowance.limit) ? (
              <button
                onClick={() => requestUpgrade("team")}
                className="group flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-line-strong hover:text-fg"
                title="Free accounts get 1 evaluation import. Team unlocks unlimited imports."
              >
                <span className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-zinc-500" />
                  Free · {Math.min(allowance.used, allowance.limit)} of {allowance.limit} import{allowance.limit === 1 ? "" : "s"} used
                </span>
                <span className="opacity-0 transition-opacity group-hover:opacity-100">Upgrade</span>
              </button>
            ) : allowance ? (
              <span className="flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-[11px] text-muted">
                <span className="size-1.5 rounded-full bg-zinc-400" />
                {allowance.plan === "free" ? "Import allowance" : `${allowance.plan} plan`} · unlimited imports
              </span>
            ) : null}
            {connLabel && (
              <span className="max-w-[240px] truncate text-[10.5px] tracking-tight text-zinc-600">{connLabel}</span>
            )}
          </div>
        </div>

        {/* ---------- source cards ---------- */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SOURCES.map((s) => {
            const st = cardState(s.id);
            const selected = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (s.id === "upload") {
                    router.push("/upload");
                    return;
                  }
                  setActive(s.id);
                }}
                aria-pressed={selected}
                className={`group flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                  selected
                    ? "border-line-strong bg-white/[0.05]"
                    : "border-line bg-surface hover:border-line-strong hover:bg-white/[0.03]"
                }`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-canvas text-zinc-300">
                  {s.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-fg">
                    {s.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-muted">{s.desc}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1.5">
                  {st.chip === "Connected" ? (
                    <span className="flex items-center gap-1 text-[10.5px] font-medium tracking-tight text-zinc-300">
                      <Check size={10} strokeWidth={3} />
                      Connected
                    </span>
                  ) : st.chip === "Reconnect required" ? (
                    <span className="flex items-center gap-1 text-[10.5px] font-medium tracking-tight text-zinc-400">
                      <RefreshCw size={10} />
                      Reconnect
                    </span>
                  ) : (
                    <span className="text-[10.5px] font-medium tracking-tight text-zinc-500">{st.chip}</span>
                  )}
                  {s.id === "upload" ? (
                    <ArrowUpRight size={12} className="text-zinc-600 transition-colors group-hover:text-fg" />
                  ) : selected ? (
                    <span className="text-[10px] text-fg">Manage</span>
                  ) : (
                    <Plug size={12} className="text-zinc-600 transition-colors group-hover:text-fg" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* ---------- active panel ---------- */}
        {active && active !== "upload" && (
          <div className="panel-surface border-sheen mt-5 flex min-h-[420px] flex-col overflow-hidden">
            <div className="flex h-11 shrink-0 items-center gap-2.5 border-b border-line bg-surface px-4">
              <button
                onClick={() => setActive(null)}
                aria-label="Back to all sources"
                className="flex size-6 items-center justify-center rounded text-muted hover:bg-white/[0.05] hover:text-fg"
              >
                <ArrowLeft size={13} />
              </button>
              <span className="text-[12.5px] font-medium text-fg">{sourceTitle(active)}</span>
              <span className="ml-auto flex items-center gap-2">
                {active === "gmail" ? (
                  <a
                    href="/dashboard/settings"
                    className="flex items-center gap-1 rounded-md border border-line px-2 py-1 text-[10.5px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    Open Settings
                  </a>
                ) : null}
              </span>
            </div>

            <SourceBody
              id={active}
              status={stateOf(active as Exclude<SourceId, "upload">) ?? { connected: false }}
              allowance={allowance}
              userId={userId}
              connectHref={connectUrl(active as "gmail" | "drive" | "slack")}
              onDisconnect={() => void handleDisconnect(active as "gmail" | "drive" | "slack")}
              reloadAllowance={reloadAllowance}
              isClerk={!!auth.id}
            />
          </div>
        )}

        {toast && (
          <p
            className={`mt-4 rounded-lg border px-3.5 py-2.5 text-[12px] leading-relaxed ${
              toast.kind === "ok"
                ? "border-line bg-surface text-zinc-300"
                : "border-zinc-300/30 bg-zinc-400/10 text-zinc-200"
            }`}
          >
            {toast.text}
          </p>
        )}

        <p className="mt-4 pb-6 text-[11px] leading-relaxed text-zinc-600">
          Connected sources are read with the minimum access needed: Gmail and Google Drive are read-only,
          and Slack searches only messages and files you can already access. Credentials stay server-side and
          are never exposed to the browser.
        </p>
      </div>
    </div>
  );
}

function sourceTitle(id: SourceId): string {
  return SOURCES.find((s) => s.id === id)?.title ?? "";
}

function SourceBody({
  id,
  status,
  allowance,
  userId,
  connectHref,
  onDisconnect,
  reloadAllowance,
  isClerk,
}: {
  id: Exclude<SourceId, "upload">;
  status: ConnectionStatus;
  allowance: ImportAllowance | null;
  userId: string | null;
  connectHref: string;
  onDisconnect: () => void;
  reloadAllowance: () => void;
  isClerk: boolean;
}) {
  const { plan, requestUpgrade } = useDisplayMode();

  if (id === "gmail") {
    if (!isClerk) {
      return (
        <ConnectPrompt
          title="Sign in to connect Gmail"
          desc="Connecting Gmail requires a signed-in workspace. Once connected, vendor correspondence is read with read-only access."
          actionHref="/auth?mode=login"
          actionLabel="Sign in"
        />
      );
    }
    if (status.connected) {
      return (
        <ConnectedGmail
          status={status}
          onDisconnect={onDisconnect}
        />
      );
    }
    const gmailLocked = plan === "free";
    return (
      <ConnectPrompt
        title={status.configured === false ? "Gmail isn't configured on this deployment" : status.reconnectRequired ? "Your Gmail connection expired" : gmailLocked ? "Gmail is included with the Team plan" : "Connect Gmail"}
        desc={
          status.configured === false
            ? "An operator needs to add the Google OAuth client credentials and register the callback URL before Gmail can connect."
            : status.reconnectRequired
              ? "The previous connection was revoked or expired. Connect again to keep reading vendor correspondence."
              : gmailLocked
                ? "Reading vendor correspondence from Gmail is a Team-plan feature. Upgrade to connect your mailbox and surface vendor documents from email."
                : "Connect your Gmail account with read-only access so n4ma can find relevant vendor emails and attachments."
        }
        actionHref={status.configured === false || gmailLocked ? undefined : connectHref}
        actionLabel={gmailLocked ? "Upgrade for Gmail" : "Connect Gmail"}
        onAction={
          status.configured === false
            ? undefined
            : gmailLocked
              ? () => requestUpgrade("team")
              : undefined
        }
      />
    );
  }

  if (id === "drive") {
    if (!isClerk) {
      return (
        <ConnectPrompt
          title="Sign in to connect Google Drive"
          desc="Importing from Google Drive requires a signed-in workspace."
          actionHref="/auth?mode=login"
          actionLabel="Sign in"
        />
      );
    }
    if (status.connected) {
      return (
        <DrivePanel
          status={status}
          allowance={allowance}
          userId={userId ?? ""}
          onDisconnect={onDisconnect}
          reloadAllowance={reloadAllowance}
        />
      );
    }
    return (
      <ConnectPrompt
        title={status.configured === false ? "Google Drive isn't configured on this deployment" : status.reconnectRequired ? "Your Google Drive connection expired" : "Connect Google Drive"}
        desc={
          status.configured === false
            ? "An operator needs to add the Google OAuth client credentials and register the callback URL before Drive can connect."
            : status.reconnectRequired
              ? "The previous connection expired or was revoked. Connect again to browse and import your files."
              : "Browse and search your Drive, select vendor contracts and documents, and import them with their original metadata. Access is read-only."
        }
        actionHref={status.configured === false ? undefined : connectHref}
        actionLabel="Connect Google Drive"
      />
    );
  }

  // slack
  if (!isClerk) {
    return (
      <ConnectPrompt
        title="Sign in to connect Slack"
        desc="Importing from Slack requires a signed-in workspace."
        actionHref="/auth?mode=login"
        actionLabel="Sign in"
      />
    );
  }
  if (status.connected) {
    return (
      <SlackPanel
        status={status}
        allowance={allowance}
        userId={userId ?? ""}
        onDisconnect={onDisconnect}
        reloadAllowance={reloadAllowance}
      />
    );
  }
  return (
    <ConnectPrompt
      title={status.configured === false ? "Slack isn't configured on this deployment" : status.reconnectRequired ? "Your Slack connection was revoked" : "Connect Slack"}
      desc={
        status.configured === false
          ? "An operator needs to add the Slack app credentials and register the callback URL before Slack can connect."
          : status.reconnectRequired
            ? "The previous authorization was revoked. Connect again to search and import vendor information."
            : "Search messages and files across the channels you can access, then import vendor documents into n4ma. Nothing is scraped."
      }
      actionHref={status.configured === false ? undefined : connectHref}
      actionLabel="Connect Slack"
    />
  );
}

function ConnectPrompt({
  title,
  desc,
  actionHref,
  actionLabel,
  onAction,
}: {
  title: string;
  desc: string;
  actionHref?: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <p className="text-[14px] font-semibold tracking-tight text-fg">{title}</p>
      <p className="max-w-md text-[12.5px] leading-relaxed text-muted">{desc}</p>
      {(actionHref || onAction) &&
        (actionHref ? (
          <a
            href={actionHref}
            className="mt-2 inline-flex h-8 items-center gap-2 rounded-md bg-white px-4 text-[12.5px] font-medium text-black transition-opacity hover:opacity-90"
          >
            {actionLabel}
            <ArrowUpRight size={12} />
          </a>
        ) : (
          <button
            onClick={onAction}
            className="mt-2 inline-flex h-8 items-center gap-2 rounded-md bg-white px-4 text-[12.5px] font-medium text-black transition-opacity hover:opacity-90"
          >
            {actionLabel}
            <ArrowUpRight size={12} />
          </button>
        ))}
    </div>
  );
}

function ConnectedGmail({
  status,
  onDisconnect,
}: {
  status: ConnectionStatus;
  onDisconnect: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-line/60 bg-canvas px-4 py-2">
        <Check size={13} strokeWidth={3} className="shrink-0 text-zinc-300" />
        <p className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
          Connected{status.email ? ` as ${status.email}` : ""} · read-only mailbox access
        </p>
        <button
          onClick={onDisconnect}
          className="shrink-0 rounded-md px-2 py-1 text-[11.5px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          Disconnect
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-14 text-center">
        <Mail size={18} className="text-zinc-700" />
        <p className="mt-1 text-[13px] font-medium text-fg">Gmail is connected</p>
        <p className="max-w-md text-[12px] leading-relaxed text-muted">
          Vendor correspondence is read with read-only access and relevant documents can flow into the
          workspace. Manage the connection and review imported documents from the Contracts page.
        </p>
      </div>
    </div>
  );
}
