"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ExternalLink,
  File,
  FileText,
  Hash,
  Loader2,
  MessageSquare,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { registerDocumentSession } from "@/lib/clientDocuments";
import {
  type ConnectionStatus,
  type ImportAllowance,
  type ImportItemResult,
  type SlackHit,
} from "./shared";
import { UpgradeNotice } from "./DrivePanel";

/* ------------------------------------------------------------------ */
/*  Slack - search / import panel.                                     */
/*  Searches the user's own messages and files via the real Slack      */
/*  Web API (search:read) with their token; results show channel,      */
/*  sender, timestamp and file metadata. Imported items feed the same  */
/*  ingestion pipeline as every other source.                          */
/* ------------------------------------------------------------------ */

interface Props {
  status: ConnectionStatus;
  allowance: ImportAllowance | null;
  userId: string;
  onDisconnect: () => void;
  reloadAllowance: () => void;
}

type Tab = "messages" | "files";

const SLACK_HINTS = ["contract", "agreement", "renewal", "price increase", "vendor", "pricing"];

export function SlackPanel({ status, allowance, userId, onDisconnect, reloadAllowance }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("messages");
  const [hits, setHits] = useState<SlackHit[] | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportItemResult[] | null>(null);
  const [importError, setImportError] = useState<{ kind: "error" | "upgrade"; text: string } | null>(null);

  const runSearch = useCallback(
    async (q: string, type?: Tab) => {
      const trimmed = q.trim();
      if (!trimmed || searching) return;
      const activeType = type ?? tab;
      setQuery(trimmed);
      setHits(null);
      setTotal(null);
      setSearchError(null);
      setResults(null);
      setSelected(new Set());
      setSearching(true);
      try {
        const res = await fetch(
          `/api/slack/search?q=${encodeURIComponent(trimmed)}&type=${activeType}&count=25`,
          { cache: "no-store" }
        );
        const data = (await res.json().catch(() => null)) as
          | { matches?: SlackHit[]; total?: number; error?: string }
          | null;
        if (!res.ok || !data) {
          setSearchError(
            data?.error === "reconnect_required"
              ? "Slack authorization expired. Reconnect Slack to continue."
              : data?.error ?? "Couldn't search Slack right now. Please try again."
          );
          return;
        }
        setHits(data.matches ?? []);
        setTotal(typeof data.total === "number" ? data.total : (data.matches?.length ?? 0));
      } catch {
        setSearchError("Couldn't reach the server. Check your connection and try again.");
      } finally {
        setSearching(false);
      }
    },
    [tab, searching]
  );

  const toggleTab = useCallback(
    (t: Tab) => {
      if (t === tab || searching) return;
      setTab(t);
      queueMicrotask(() => {
        setHits(null);
        setSelected(new Set());
        setResults(null);
        setSearchError(null);
      });
      if (query.trim()) void runSearch(query, t);
    },
    [tab, searching, query, runSearch]
  );

  const hitId = useCallback((h: SlackHit): string => {
    return h.kind === "message" ? `m:${h.channelId}:${h.ts}` : `f:${h.id}`;
  }, []);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const startImport = useCallback(async () => {
    const chosen = (hits ?? []).filter((h) => selected.has(hitId(h)));
    if (chosen.length === 0 || importing) return;
    setImporting(true);
    setImportError(null);
    setResults(null);
    try {
      const items = chosen.map((h) =>
        h.kind === "message"
          ? {
              kind: "message" as const,
              channelId: h.channelId,
              channelName: h.channelName,
              username: h.username || h.user || undefined,
              ts: h.ts,
              text: h.text,
              permalink: h.permalink || undefined,
            }
          : { kind: "file" as const, id: h.id }
      );
      const res = await fetch("/api/slack/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json().catch(() => null)) as
        | { results?: ImportItemResult[]; error?: string; code?: string; upgradeTo?: string }
        | null;
      if (!res.ok || !data) {
        if (data?.code === "import_limit" || data?.upgradeTo) {
          setImportError({
            kind: "upgrade",
            text:
              data.error ??
              "Free accounts can import 1 document from Google Drive or Slack. Upgrade to the Team plan for unlimited imports.",
          });
        } else {
          setImportError({
            kind: "error",
            text:
              data?.error === "reconnect_required"
                ? "Slack authorization expired. Reconnect Slack to continue."
                : data?.error ?? "Couldn't import the selected items. Please try again.",
          });
        }
        return;
      }
      const itemsRes = data.results ?? [];
      setResults(itemsRes);
      let registered = 0;
      for (const r of itemsRes) {
        if (r.status === "imported" && r.document?.status === "ready" && r.document.analysis && userId) {
          if (registerDocumentSession(r.document as Parameters<typeof registerDocumentSession>[0], userId)) {
            registered++;
          }
        }
      }
      void registered;
      reloadAllowance();
      const importedIds = new Set(itemsRes.filter((r) => r.status === "imported").map((r) => r.id));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of importedIds) next.delete(id);
        return next;
      });
    } catch {
      setImportError({ kind: "error", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setImporting(false);
    }
  }, [hits, selected, importing, userId, reloadAllowance, hitId]);

  const importedReadyCount = (results ?? []).filter(
    (r) => r.status === "imported" && r.document?.status === "ready"
  ).length;
  const importedFailedCount = (results ?? []).filter(
    (r) => r.status === "imported" && r.document?.status !== "ready"
  ).length;
  const duplicateCount = (results ?? []).filter((r) => r.status === "duplicate").length;

  const connectedLabel = [status.teamName, status.workspaceUrl].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ---------- connection strip ---------- */}
      <div className="flex items-center gap-3 border-b border-line/60 bg-canvas px-4 py-2">
        <ShieldCheck size={13} className="shrink-0 text-muted/60" />
        <p className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
          {connectedLabel ? `Connected to ${connectedLabel}` : "Connected"} · searches only your accessible messages & files
        </p>
        <button
          onClick={onDisconnect}
          className="shrink-0 rounded-md px-2 py-1 text-[11.5px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          Disconnect
        </button>
      </div>

      {/* ---------- search bar + tabs ---------- */}
      <div className="flex shrink-0 items-center gap-2 border-b border-line/60 px-4 py-2.5">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 focus-within:border-line-strong">
          <Search size={13} className="shrink-0 text-muted/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void runSearch(query);
            }}
            placeholder="Search Slack for vendor information…"
            className="h-6 min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-zinc-600"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted/60 hover:text-fg">
              <X size={12} />
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-line p-0.5">
          <button
            onClick={() => toggleTab("messages")}
            data-active={tab === "messages"}
            className="flex h-6 items-center gap-1.5 rounded px-2 text-[11.5px] font-medium text-muted data-[active=true]:bg-white/[0.08] data-[active=true]:text-fg"
          >
            <MessageSquare size={11} />
            Messages
          </button>
          <button
            onClick={() => toggleTab("files")}
            data-active={tab === "files"}
            className="flex h-6 items-center gap-1.5 rounded px-2 text-[11.5px] font-medium text-muted data-[active=true]:bg-white/[0.08] data-[active=true]:text-fg"
          >
            <FileText size={11} />
            Files
          </button>
        </div>
        <button
          onClick={() => void runSearch(query)}
          disabled={!query.trim() || searching}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-fg transition-colors hover:bg-white/[0.05] disabled:opacity-50"
        >
          {searching ? <Loader2 size={12} className="animate-spin" /> : null}
          Search
        </button>
      </div>

      {!hits && !searching && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-4 py-2">
          <span className="text-[10.5px] font-semibold tracking-[-0.01em] text-muted/60">Try</span>
          {SLACK_HINTS.map((h) => (
            <button
              key={h}
              onClick={() => void runSearch(h)}
              className="rounded border border-line/70 px-1.5 py-0.5 text-[10.5px] tracking-tight text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {allowance && !allowance.allowed && (
        <div className="mx-4 mb-2">
          <UpgradeNotice
            message={`Free accounts can import ${allowance.limit} document from Google Drive or Slack. Upgrade to the Team plan for unlimited imports.`}
          />
        </div>
      )}

      {/* ---------- results ---------- */}
      {searchError ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <p className="text-[12.5px] text-muted">{searchError}</p>
          <button onClick={() => void runSearch(query)} className="text-[12px] font-medium text-fg hover:underline">
            Try again
          </button>
        </div>
      ) : searching ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted">
          <Loader2 size={13} className="animate-spin" /> Searching Slack…
        </div>
      ) : hits === null ? (
        <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
          <Search size={20} className="text-zinc-700" />
          <p className="mt-2 text-[12.5px] font-medium text-zinc-300">
            Search Slack {tab === "messages" ? "messages" : "files"}
          </p>
          <p className="max-w-sm text-[11.5px] leading-relaxed text-muted">
            Find vendor-related conversations or documents. Only content you can already access is searched - nothing is scraped.
          </p>
        </div>
      ) : hits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
          <Search size={20} className="text-zinc-700" />
          <p className="mt-2 text-[12.5px] font-medium text-zinc-300">No matches</p>
          <p className="max-w-sm text-[11.5px] leading-relaxed text-muted">
            Try a vendor name, a contract term, or an invoice reference.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <p className="border-b border-line/40 px-4 py-1.5 text-[10px] font-semibold tracking-[-0.01em] text-muted/60">
            {total != null && total > hits.length ? `${hits.length} of ${total}` : hits.length}{" "}
            {tab === "messages" ? "messages" : "files"} · select the ones you want to import
          </p>
          <ul className="divide-y divide-line/40">
            {hits.map((h) => {
              const id = hitId(h);
              const checked = selected.has(id);
              const selectable = h.kind === "message" || (h.kind === "file" && h.importable);
              return (
                <li
                  key={id}
                  className="flex items-start gap-2.5 px-4 py-2 transition-colors hover:bg-white/[0.02]"
                >
                  <button
                    onClick={() => selectable && toggle(id)}
                    disabled={!selectable}
                    aria-pressed={checked}
                    aria-label={`Select ${h.kind === "message" ? "message" : h.name}`}
                    className={`mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-colors disabled:opacity-30 ${
                      checked ? "border-fg bg-fg text-black" : "border-zinc-600 hover:border-zinc-400"
                    }`}
                  >
                    {checked && (
                      <span aria-hidden="true" className="block h-[5px] w-[8px] rotate-45 border-b-[1.5px] border-r-[1.5px] border-black" />
                    )}
                  </button>
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded bg-white/[0.05] text-zinc-400">
                    {h.kind === "message" ? <MessageSquare size={11} /> : h.filetype === "pdf" ? <FileText size={11} /> : <File size={11} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {h.kind === "message" ? (
                      <>
                        <p className="truncate text-[12.5px] leading-snug text-zinc-200">{h.text}</p>
                        <p className="mt-0.5 truncate text-[10.5px] tracking-tight text-muted">
                          <span className="inline-flex items-center gap-1 font-medium text-zinc-400">
                            <Hash size={9} />
                            {h.channelName}
                          </span>
                          <span className="mx-1.5 text-zinc-700">·</span>
                          {h.username || "Slack member"}
                          <span className="mx-1.5 text-zinc-700">·</span>
                          {h.ts
                            ? new Date(Number(h.ts.split(".")[0]) * 1000).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="flex min-w-0 items-center gap-2 truncate text-[12.5px] text-zinc-200">
                          <span className="truncate">{h.name}</span>
                          {!h.importable && h.importHint && (
                            <span title={h.importHint} className="shrink-0 rounded border border-line px-1 py-0.5 text-[9.5px] tracking-tight text-muted">
                              Not supported
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-[10.5px] tracking-tight text-muted">
                          {h.filetype.toUpperCase()}
                          {h.size ? ` · ${(h.size / 1024).toFixed(0)} KB` : ""}
                          {h.channelNames.length > 0 ? ` · in ${h.channelNames.slice(0, 2).join(", ")}` : ""}
                          <span className="mx-1.5 text-zinc-700">·</span>
                          {h.username || "Slack member"}
                          {h.created ? (
                            <>
                              <span className="mx-1.5 text-zinc-700">·</span>
                              {new Date(h.created * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </>
                          ) : null}
                        </p>
                      </>
                    )}
                  </div>
                  <a
                    href={h.permalink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      if (!h.permalink) e.preventDefault();
                    }}
                    aria-label="Open in Slack"
                    className="mt-1 flex size-6 shrink-0 items-center justify-center rounded text-muted/60 hover:text-fg"
                  >
                    <ExternalLink size={11} />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* ---------- import bar ---------- */}
      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-4 py-2.5">
        <p className="min-w-0 flex-1 text-[11.5px] text-muted">
          {selected.size === 0 ? (
            results && results.length > 0
              ? `${importedReadyCount} imported${duplicateCount ? ` · ${duplicateCount} already imported` : ""}${importedFailedCount ? ` · ${importedFailedCount} failed` : ""}`
              : tab === "messages"
                ? "Import a message to capture vendor information as a document."
                : "Import a file to analyze it as a vendor document."
          ) : importing ? (
            "Importing…"
          ) : (
            <span>
              <span className="font-medium text-fg">{selected.size} selected</span> · ready to import
            </span>
          )}
        </p>
        {results && results.length > 0 && (
          <button
            onClick={() => setResults(null)}
            className="rounded-md px-2.5 py-1.5 text-[11.5px] font-medium text-muted hover:bg-white/[0.05] hover:text-fg"
          >
            Clear results
          </button>
        )}
        {importedReadyCount > 0 && (
          <button
            onClick={() => router.push("/dashboard/contracts")}
            className="flex h-7 items-center gap-1.5 rounded-md bg-white px-3 text-[11.5px] font-medium text-black transition-opacity hover:opacity-90"
          >
            View in workspace
            <ArrowRight size={11} />
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => void startImport()}
            disabled={importing}
            className="flex h-7 items-center gap-2 rounded-md bg-white px-3 text-[11.5px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {importing ? <Loader2 size={11} className="animate-spin" /> : null}
            Import{selected.size > 1 ? ` (${selected.size})` : ""}
          </button>
        )}
        {selected.size > 0 && !importing && (
          <button onClick={clearSelection} className="rounded-md px-2 py-1 text-[11px] text-muted hover:text-fg">
            Clear
          </button>
        )}
      </div>

      {importError && (
        <div className="border-t border-line/60 px-4 py-2.5">
          {importError.kind === "upgrade" ? (
            <UpgradeNotice message={importError.text} />
          ) : (
            <p className="text-[11.5px] leading-relaxed text-zinc-300">{importError.text}</p>
          )}
        </div>
      )}
      {results && results.length > 0 && (
        <div className="border-t border-line/60">
          {results.map((r) => (
            <div key={`${r.kind ?? "item"}-${r.id}`} className="flex items-center gap-2.5 border-b border-line/40 px-4 py-1.5 last:border-b-0">
              {r.status === "imported" && r.document?.status === "ready" ? (
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-zinc-500 text-[8px] text-zinc-200">✓</span>
              ) : r.status === "imported" ? (
                <Loader2 size={12} className="shrink-0 animate-spin text-muted" />
              ) : (
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full border border-line text-[8px] text-zinc-500">·</span>
              )}
              <p className="min-w-0 flex-1 truncate text-[12px] text-zinc-300">{r.name}</p>
              <p className="shrink-0 text-[10.5px] text-muted">
                {r.status === "imported" && r.document?.status === "ready"
                  ? "Imported"
                  : r.status === "imported"
                    ? r.document?.status === "failed"
                      ? `Failed · ${r.error ?? "no readable text"}`.slice(0, 90)
                      : "Processing"
                    : r.status === "duplicate"
                      ? "Already imported"
                      : r.status === "limit"
                        ? "Free limit reached"
                        : (r.error ?? "Unable to import").slice(0, 90)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
