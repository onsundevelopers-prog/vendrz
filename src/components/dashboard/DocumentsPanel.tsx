"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, ExternalLink } from "lucide-react";
import {
  fetchDocuments,
  getDocumentFileUrl,
  deleteDocument,
  type ClientDocument,
} from "@/lib/clientDocuments";
import { PanelEmpty } from "@/components/dashboard/panels";

/* ------------------------------------------------------------------ */
/*  Documents - the persisted upload list.                             */
/*                                                                     */
/*  Loads the signed-in user's uploaded contract files straight from   */
/*  the documents API (Supabase-backed). Every upload is shown with a  */
/*  real status - uploading / processing / ready / failed - and the    */
/*  original file can be opened via a short-lived signed URL or        */
/*  deleted. Refreshing, logging out/in, or switching devices never    */
/*  loses these because the DB + storage are the source of truth.      */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<ClientDocument["status"], string> = {
  uploading: "Uploading",
  processing: "Processing",
  ready: "Ready",
  failed: "Failed",
};

function StatusChip({ status }: { status: ClientDocument["status"] }) {
  if (status === "processing" || status === "uploading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
        <Loader2 size={11} className="animate-spin" />
        {STATUS_LABEL[status]}
      </span>
    );
  }
  const color =
    status === "ready" ? "text-zinc-200" : status === "failed" ? "text-zinc-400" : "text-muted";
  return <span className={`text-[11px] ${color}`}>{STATUS_LABEL[status]}</span>;
}

export function DocumentsPanel() {
  const [docs, setDocs] = useState<ClientDocument[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await fetchDocuments();
      setError(null);
      setDocs(list);
    } catch {
      setError("Couldn't load your uploaded documents.");
    }
  }, []);

  useEffect(() => {
    // Defer so the setState calls inside load() never run synchronously
    // inside the effect body (React 19 lint rule).
    queueMicrotask(() => void load());
  }, [load]);

  // Ongoing uploads that are still processing on first load will be shown
  // immediately; a light poll catches them finishing.
  useEffect(() => {
    const hasPending = docs?.some((d) => d.status === "uploading" || d.status === "processing");
    if (!hasPending) return;
    const t = setInterval(() => {
      void load();
    }, 4000);
    return () => clearInterval(t);
  }, [docs, load]);

  const openFile = useCallback(async (doc: ClientDocument) => {
    if (doc.status === "ready") {
      const url = await getDocumentFileUrl(doc.id);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    }
  }, []);

  const remove = useCallback(async (doc: ClientDocument) => {
    if (!window.confirm(`Delete "${doc.filename}"? The stored file will also be removed.`)) return;
    try {
      await deleteDocument(doc.id);
      setDocs((prev) => (prev ? prev.filter((d) => d.id !== doc.id) : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete this document.");
    }
  }, []);

  const showEmpty = docs !== null && docs.length === 0;

  return (
    <div className="h-full">
      {error && (
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
          <p className="min-w-0 flex-1 text-[12px] text-muted">{error}</p>
          <button onClick={() => void load()} className="shrink-0 text-[12px] text-fg">
            Retry
          </button>
        </div>
      )}
      {docs === null ? (
        <div className="flex items-center justify-center gap-2 py-8 text-[12px] text-muted">
          <Loader2 size={13} className="animate-spin" /> Loading your documents…
        </div>
      ) : showEmpty ? (
        <PanelEmpty
          title="No uploaded files yet"
          body="Contract files you upload will be saved here with their analysis status."
        />
      ) : (
        <ul className="divide-y divide-line/60">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-fg">{doc.filename}</p>
                <p className="text-[10.5px] tracking-tight text-muted">
                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB ·{" "}
                  {doc.createdAt
                    ? new Date(doc.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                  {doc.status === "failed" && doc.error ? ` · ${doc.error}` : ""}
                </p>
              </div>
              <StatusChip status={doc.status} />
              <div className="flex shrink-0 items-center gap-1">
                {doc.status === "ready" && (
                  <button
                    onClick={() => void openFile(doc)}
                    title="Open file"
                    aria-label={`Open ${doc.filename}`}
                    className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-fg"
                  >
                    <ExternalLink size={13} />
                  </button>
                )}
                <button
                  onClick={() => void remove(doc)}
                  title="Delete"
                  aria-label={`Delete ${doc.filename}`}
                  className="flex size-7 items-center justify-center rounded-md text-muted hover:bg-hover hover:text-zinc-300"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}