"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { registerDocumentSession } from "@/lib/clientDocuments";
import { useDisplayMode } from "@/lib/displayMode";
import {
  type ConnectionStatus,
  type DriveFileRow,
  type ImportAllowance,
  type ImportItemResult,
} from "./shared";

/* ------------------------------------------------------------------ */
/*  Google Drive - browse / search / import panel.                     */
/*  Metadata shown: filename, type, modified date, owner, folder.      */
/*  Selection is multi-file; importing runs server-side through the    */
/*  shared ingestion pipeline (documents table + bucket + analysis).   */
/* ------------------------------------------------------------------ */

interface Props {
  status: ConnectionStatus;
  allowance: ImportAllowance | null;
  userId: string;
  onDisconnect: () => void;
  reloadAllowance: () => void;
}

type ViewMode =
  | { kind: "browse"; folderId: string | null }
  | { kind: "search"; query: string };

const DRIVE_HINTS = ["contract", "agreement", "msa", "terms", "renewal", "vendor", "sow"];

function fileTypeLabel(mime: string, kind: string): string {
  if (kind === "folder") return "Folder";
  if (mime === "application/pdf") return "PDF";
  if (mime === "application/vnd.google-apps.document") return "Google Doc";
  if (mime === "application/vnd.google-apps.spreadsheet") return "Google Sheet";
  if (mime === "application/vnd.google-apps.presentation") return "Google Slides";
  if (mime === "application/vnd.google-apps.shortcut") return "Shortcut";
  if (mime.includes("wordprocessingml")) return "Word";
  if (mime === "text/csv") return "CSV";
  if (mime.startsWith("text/")) return "Text";
  return mime.split("/").pop()?.toUpperCase() ?? "File";
}

export function DrivePanel({ status, allowance, userId, onDisconnect, reloadAllowance }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<ViewMode>({ kind: "browse", folderId: null });
  const [folderName, setFolderName] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileRow[] | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<{ done: number; total: number } | null>(null);
  const [importPhase, setImportPhase] = useState<"searching" | "running" | "done">("searching");
  const [results, setResults] = useState<ImportItemResult[] | null>(null);
  const [importError, setImportError] = useState<{ kind: "error" | "upgrade"; text: string } | null>(null);

  // Load the folder / search results whenever the view changes.
  useEffect(() => {
    let alive = true;
    const params = new URLSearchParams();
    if (mode.kind === "search") params.set("query", mode.query);
    if (mode.kind === "browse" && mode.folderId) params.set("folder", mode.folderId);
    params.set("pageSize", "50");
    // Reset the view state before the fetch lands (kept out of the effect
    // body so the React set-state-in-effect rule stays satisfied).
    queueMicrotask(() => {
      if (!alive) return;
      setFiles(null);
      setNextPage(null);
      setLoadError(null);
      setResults(null);
      setLoading(true);
    });
    fetch(`/api/drive/files?${params.toString()}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ files: DriveFileRow[]; folder: { id: string; name: string } | null; nextPageToken: string | null }>) : null))
      .then((data) => {
        if (!alive) return;
        if (!data) {
          setLoadError("Couldn't reach Google Drive right now. Please try again.");
        } else {
          setFiles(data.files ?? []);
          setNextPage(data.nextPageToken);
          if (mode.kind === "browse") {
            setFolderName(data.folder?.name ?? null);
          } else {
            setFolderName(null);
          }
        }
      })
      .catch(() => {
        if (alive) setLoadError("Couldn't reach Google Drive right now. Please try again.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [mode]);

  const goHome = useCallback(() => {
    setMode({ kind: "browse", folderId: null });
    setQuery("");
  }, []);

  const runSearch = useCallback(
    (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) return;
      setQuery(trimmed);
      setMode({ kind: "search", query: trimmed });
    },
    []
  );

  const openFolder = useCallback((id: string) => {
    setMode({ kind: "browse", folderId: id });
  }, []);

  const loadMore = useCallback(() => {
    if (!nextPage || loading) return;
    const params = new URLSearchParams();
    if (mode.kind === "search") params.set("query", mode.query);
    if (mode.kind === "browse" && mode.folderId) params.set("folder", mode.folderId);
    params.set("pageSize", "50");
    params.set("pageToken", nextPage);
    setLoading(true);
    fetch(`/api/drive/files?${params.toString()}`, { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ files: DriveFileRow[]; nextPageToken: string | null }>) : null))
      .then((data) => {
        if (data) {
          setFiles((prev) => [...(prev ?? []), ...(data.files ?? [])]);
          setNextPage(data.nextPageToken);
        }
      })
      .finally(() => setLoading(false));
  }, [nextPage, loading, mode]);

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
    const chosen = (files ?? []).filter((f) => selected.has(f.id));
    if (chosen.length === 0 || importing) return;
    setImporting({ done: 0, total: chosen.length });
    setImportPhase("running");
    setImportError(null);
    setResults([]);
    try {
      const res = await fetch("/api/drive/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: chosen.map((f) => ({ id: f.id, name: f.name })) }),
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
            text: data?.error ?? "Couldn't import the selected files. Please try again.",
          });
        }
        return;
      }
      const items = data.results ?? [];
      setResults(items);
      // Register finished analyses into the workspace registers so the
      // dashboard tables reflect them immediately (same as manual uploads).
      let registered = 0;
      for (const r of items) {
        if (r.status === "imported" && r.document?.status === "ready" && r.document.analysis && userId) {
          if (registerDocumentSession(r.document as Parameters<typeof registerDocumentSession>[0], userId)) {
            registered++;
          }
        }
      }
      void registered;
      reloadAllowance();
      setImporting({ done: items.length, total: chosen.length });
      setImportPhase("done");
      // Keep the imported files visible but clear the selection.
      const importedIds = new Set(items.filter((r) => r.status === "imported").map((r) => r.id));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of importedIds) next.delete(id);
        return next;
      });
    } catch {
      setImportError({ kind: "error", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setImporting(null);
    }
  }, [files, selected, importing, userId, reloadAllowance]);

  const importedReadyCount = (results ?? []).filter(
    (r) => r.status === "imported" && r.document?.status === "ready"
  ).length;
  const importedFailedCount = (results ?? []).filter(
    (r) => r.status === "imported" && r.document?.status !== "ready"
  ).length;
  const duplicateCount = (results ?? []).filter((r) => r.status === "duplicate").length;

  const connectedLabel = [status.name, status.email].filter(Boolean).join(" · ");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ---------- connection strip ---------- */}
      <div className="flex items-center gap-3 border-b border-line/60 bg-canvas px-4 py-2">
        <ShieldCheck size={13} className="shrink-0 text-muted/60" />
        <p className="min-w-0 flex-1 truncate text-[11.5px] text-muted">
          {connectedLabel
            ? `Connected as ${connectedLabel} · read-only access`
            : "Connected · read-only access"}
        </p>
        <button
          onClick={onDisconnect}
          className="shrink-0 rounded-md px-2 py-1 text-[11.5px] font-medium text-muted transition-colors hover:bg-white/[0.05] hover:text-fg"
        >
          Disconnect
        </button>
      </div>

      {/* ---------- search + browse bar ---------- */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line/60 px-4 py-2.5">
        <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 focus-within:border-line-strong">
          <Search size={13} className="shrink-0 text-muted/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") runSearch(query);
            }}
            placeholder="Search your Drive for vendor documents…"
            className="h-6 min-w-0 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-zinc-600"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted/60 hover:text-fg">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => runSearch(query)}
          disabled={!query.trim() || loading}
          className="flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[12px] font-medium text-fg transition-colors hover:bg-white/[0.05] disabled:opacity-50"
        >
          Search Drive
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 px-4 py-2">
        {mode.kind === "search" ? (
          <>
            <button onClick={goHome} className="flex items-center gap-1 rounded text-[11.5px] text-muted hover:text-fg">
              <FolderOpen size={12} />
              <span className="font-medium text-zinc-300">Results for “{mode.query}”</span>
            </button>
            <span className="mx-1 inline-block h-3 w-px bg-line" />
            <button onClick={goHome} className="text-[11.5px] text-muted hover:text-fg">
              Browse folders instead
            </button>
          </>
        ) : (
          <>
            <button
              onClick={goHome}
              className={`flex items-center gap-1 rounded px-1 py-0.5 text-[11.5px] transition-colors ${
                folderName ? "text-muted hover:text-fg" : "font-medium text-fg"
              }`}
            >
              <FolderOpen size={12} />
              My Drive
            </button>
            {folderName && (
              <>
                <ChevronRight size={11} className="text-zinc-600" />
                <span className="truncate text-[11.5px] font-medium text-zinc-200">{folderName}</span>
              </>
            )}
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {mode.kind !== "search" &&
            DRIVE_HINTS.map((h) => (
              <button
                key={h}
                onClick={() => runSearch(h)}
                className="rounded border border-line/70 px-1.5 py-0.5 text-[10.5px] tracking-tight text-muted transition-colors hover:border-line-strong hover:text-fg"
              >
                {h}
              </button>
            ))}
        </div>
      </div>

      {/* ---------- allowance notice ---------- */}
      {allowance && !allowance.allowed && (
        <div className="mx-4 mb-2">
          <UpgradeNotice
            message={`Free accounts can import ${allowance.limit} document from Google Drive or Slack. Upgrade to the Team plan for unlimited imports.`}
          />
        </div>
      )}

      {/* ---------- results ---------- */}
      {loadError ? (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <p className="text-[12.5px] text-muted">{loadError}</p>
          <button onClick={goHome} className="text-[12px] font-medium text-fg hover:underline">
            Back to My Drive
          </button>
        </div>
      ) : files === null ? (
        <div className="flex items-center justify-center gap-2 py-12 text-[12px] text-muted">
          <Loader2 size={13} className="animate-spin" />
          Loading your Drive…
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
          <FolderOpen size={20} className="text-zinc-700" />
          <p className="mt-2 text-[12.5px] font-medium text-zinc-300">
            {mode.kind === "search" ? "No files match that search" : "Nothing in this folder"}
          </p>
          <p className="max-w-xs text-[11.5px] leading-relaxed text-muted">
            {mode.kind === "search"
              ? "Try a vendor name, or search for “contract” or “agreement”."
              : "Documents you add to My Drive will appear here for import."}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-line/60">
                <th className="w-8 px-3 py-1.5" />
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold tracking-[-0.01em] text-muted/70">Name</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold tracking-[-0.01em] text-muted/70">Type</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold tracking-[-0.01em] text-muted/70">Modified</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold tracking-[-0.01em] text-muted/70">Owner</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold tracking-[-0.01em] text-muted/70">Location</th>
                <th className="w-8 px-2 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {files.map((f) => {
                const checked = selected.has(f.id);
                const isFolder = f.kind === "folder";
                const selectable = !isFolder && f.importable;
                return (
                  <tr
                    key={f.id}
                    className="group transition-colors hover:bg-white/[0.02]"
                    onClick={() => {
                      if (isFolder) openFolder(f.id);
                      else if (selectable) toggle(f.id);
                    }}
                  >
                    <td className="px-3 py-2">
                      {isFolder ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFolder(f.id);
                          }}
                          aria-label={`Open ${f.name}`}
                          className="flex size-4 items-center justify-center text-muted/50 hover:text-fg"
                        >
                          <ChevronRight size={12} />
                        </button>
                      ) : selectable ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggle(f.id);
                          }}
                          aria-pressed={checked}
                          aria-label={`Select ${f.name}`}
                          className={`flex size-3.5 items-center justify-center rounded-[3px] border transition-colors ${
                            checked ? "border-fg bg-fg text-black" : "border-zinc-600 hover:border-zinc-400"
                          }`}
                        >
                          {checked && (
                            <span aria-hidden="true" className="block h-[5px] w-[8px] rotate-45 border-b-[1.5px] border-r-[1.5px] border-black" />
                          )}
                        </button>
                      ) : (
                        <span className="block size-3.5 opacity-40" aria-hidden="true" />
                      )}
                    </td>
                    <td className="max-w-[280px] px-2 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className={`grid size-6 shrink-0 place-items-center rounded ${
                            isFolder ? "text-zinc-400" : "bg-white/[0.05] text-zinc-300"
                          }`}
                        >
                          {isFolder ? <Folder size={12} /> : f.mimeType.includes("pdf") ? <FileText size={12} /> : <File size={12} />}
                        </span>
                        <span className={`truncate text-[12.5px] ${isFolder ? "font-medium text-fg" : "text-zinc-200"}`}>
                          {f.name}
                        </span>
                        {!isFolder && !f.importable && f.importHint && (
                          <span title={f.importHint} className="shrink-0 rounded border border-line px-1 py-0.5 text-[9.5px] tracking-tight text-muted">
                            Not supported
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-[11px] text-muted">{fileTypeLabel(f.mimeType, f.kind)}</td>
                    <td className="px-2 py-2 text-[11px] tabular-nums text-muted">
                      {f.modifiedTime
                        ? new Date(f.modifiedTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
                    </td>
                    <td className="max-w-[160px] truncate px-2 py-2 text-[11px] text-muted">{f.owner ?? "—"}</td>
                    <td className="max-w-[160px] truncate px-2 py-2 text-[11px] text-muted">{f.folder ?? "My Drive"}</td>
                    <td className="px-2 py-2">
                      {f.webViewLink && !isFolder && (
                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Open ${f.name} in Google Drive`}
                          className="flex size-6 items-center justify-center rounded text-muted/60 opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
                        >
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {nextPage && (
            <div className="flex justify-center border-t border-line/40 py-2">
              <button onClick={loadMore} disabled={loading} className="rounded-md px-3 py-1.5 text-[11.5px] text-muted hover:bg-white/[0.04] hover:text-fg disabled:opacity-50">
                {loading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- import bar ---------- */}
      <div className="flex shrink-0 items-center gap-3 border-t border-line bg-surface px-4 py-2.5">
        <p className="min-w-0 flex-1 text-[11.5px] text-muted">
          {selected.size === 0 ? (
            "Select files to import them for contract analysis."
          ) : (
            <span>
              <span className="font-medium text-fg">{selected.size} selected</span> ·{" "}
              {importPhase === "running" && importing
                ? `Importing ${importing.done} of ${importing.total}…`
                : results
                  ? `${importedReadyCount} imported${duplicateCount ? ` · ${duplicateCount} already imported` : ""}${importedFailedCount ? ` · ${importedFailedCount} failed` : ""}`
                  : "ready to import"}
            </span>
          )}
        </p>
        {results && results.length > 0 && (
          <button
            onClick={() => {
              setResults(null);
              setImportPhase("searching");
            }}
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
            disabled={!!importing}
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

      {/* ---------- per-file import results ---------- */}
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
            <div key={`${r.kind ?? "file"}-${r.id}`} className="flex items-center gap-2.5 border-b border-line/40 px-4 py-1.5 last:border-b-0">
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

export function UpgradeNotice({ message }: { message: string }) {
  const { requestUpgrade } = useDisplayMode();
  return (
    <div className="flex items-center gap-3 rounded-md border border-line bg-surface px-3 py-2">
      <p className="min-w-0 flex-1 text-[11.5px] leading-relaxed text-muted">{message}</p>
      <button
        onClick={() => requestUpgrade("team")}
        className="shrink-0 rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-black transition-opacity hover:opacity-90"
      >
        Upgrade to Team
      </button>
    </div>
  );
}
