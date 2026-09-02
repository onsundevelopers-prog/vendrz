"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createAnonymousSession,
  transferSessionToAccount,
  updateSession,
} from "@/lib/store";
import { runPipeline } from "@/lib/pipeline";
import { analyzeFile } from "@/lib/extract";
import {
  isStorageUnavailable,
  registerDocumentSession,
  uploadDocument,
} from "@/lib/clientDocuments";
import { useAuthUser } from "@/lib/auth-hooks";
import type { ContractExtraction, RichContractExtraction } from "@/lib/types";
import { Navbar } from "@/components/landing/Navbar";

const ACCEPTED = [".pdf", ".docx"];
const MAX_MB = 25;

type FileStatus = "ready" | "analyzing" | "done" | "error";

interface UploadRow {
  id: string;
  file: File;
  status: FileStatus;
  error?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const auth = useAuthUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const validate = useCallback((f: File): string | null => {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ACCEPTED.includes(`.${ext}`)) {
      return "Only PDF and DOCX files are supported right now.";
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      return `File is over the ${MAX_MB} MB limit.`;
    }
    return null;
  }, []);

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      if (analyzing) return; // don't accept files mid-batch; they'd never be analyzed
      const incoming = Array.from(list);
      if (incoming.length === 0) return;
      const accepted: UploadRow[] = [];
      const rejected: string[] = [];
      for (const f of incoming) {
        const err = validate(f);
        if (err) rejected.push(`${f.name}: ${err}`);
        else accepted.push({ id: `${f.name}-${f.size}-${Math.random()}`, file: f, status: "ready" });
      }
      setRows((prev) => [...prev, ...accepted]);
      if (rejected.length > 0) {
        setError(rejected.join(" · "));
      } else {
        setError(null);
      }
    },
    [validate, analyzing]
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row?.status === "analyzing") return prev;
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  const setRowStatus = useCallback((id: string, status: FileStatus, error?: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, error } : r)));
  }, []);

  /** Upload a single file via the shared extraction helper, which handles
      retries and re-uploads when a job is lost, and throws with a message
      that is safe to show the user. */
  const runExtraction = useCallback(
    async (file: File): Promise<{ extraction: ContractExtraction; analysis: RichContractExtraction | null }> =>
      analyzeFile(file),
    []
  );

  const fileKind = useCallback((f: File): "pdf" | "docx" => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    return ext === "docx" ? "docx" : "pdf";
  }, []);

  const startAnalysis = useCallback(
    (
      name: string,
      kind: "pdf" | "docx",
      size: number,
      extraction: ContractExtraction | null = null,
      richExtraction: RichContractExtraction | null = null
    ) => {
      const session = createAnonymousSession(
        name,
        kind,
        size,
        "manual",
        extraction,
        richExtraction
      );
      if (auth.id) transferSessionToAccount(session.id, auth.id);
      return session;
    },
    [auth.id]
  );

  /**
   * Full anonymous analysis of one file: extract -> create session -> run
   * the real pipeline -> persist the finished result. Returns the session.
   * When signed in, the session is bound to the account so it shows up in
   * the dashboard registers.
   */
  const analyzeAnonymousFile = useCallback(
    async (file: File): Promise<ReturnType<typeof startAnalysis>> => {
      const { extraction, analysis } = await runExtraction(file);
      const session = startAnalysis(
        file.name,
        fileKind(file),
        file.size,
        extraction,
        analysis
      );
      const result = await runPipeline(
        file.name,
        fileKind(file),
        () => {},
        extraction,
        analysis
      );
      updateSession(session.id, { pipelineStatus: "complete", result });
      return session;
    },
    [runExtraction, startAnalysis, fileKind]
  );

  /**
   * Single file - persist via the API when signed in (storage + DB), else
   * the existing anonymous flow that hands off to /processing.
   */
  const analyzeSingle = useCallback(
    async (row: UploadRow) => {
      setAnalyzing(true);
      setError(null);
      try {
        // Authenticated users: save the PDF + analysis server-side so the
        // document persists in the dashboard with a proper status, and mirror
        // the finished analysis into the workspace registers (the dashboard
        // tables read from there) so the contract shows up immediately. If
        // the document storage isn't provisioned, fall back to the local
        // flow so the analysis still completes and lands in the dashboard.
        if (auth.id) {
          try {
            const doc = await uploadDocument(row.file);
            registerDocumentSession(doc, auth.id);
            // The document is saved server-side regardless of analysis outcome;
            // the workspace shows it with the correct status.
            router.push("/dashboard/contracts");
            return;
          } catch (err) {
            if (!isStorageUnavailable(err)) throw err;
            // Document storage isn't configured - analyze locally instead.
          }
        }
        const session = await analyzeAnonymousFile(row.file);
        router.push(`/processing/${session.id}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
        setRowStatus(row.id, "error", msg);
        setAnalyzing(false);
      }
    },
    [auth.id, analyzeAnonymousFile, router, setRowStatus]
  );

  /** Multiple files - extract each, build a session, then run the pipeline
      inline so every finished contract actually lands in the workspace. */
  const analyzeMulti = useCallback(async () => {
    setAnalyzing(true);
    setError(null);

    const sessionIds: string[] = [];
    let anyErrored = false;

    // Authenticated users: persist each file via the API (storage + DB),
    // then land in the workspace where they all appear with statuses. When
    // document storage isn't provisioned, each file falls back to the local
    // flow so every contract is still analyzed and lands in the dashboard.
    const persistViaApi = !!auth.id;
    for (const row of [...rows]) {
      if (row.status === "error" || row.status === "done") continue;
      setRowStatus(row.id, "analyzing");
      try {
        if (persistViaApi) {
          try {
            const doc = await uploadDocument(row.file);
            registerDocumentSession(doc, auth.id as string);
            setRowStatus(row.id, "done");
            sessionIds.push(doc.id);
            continue;
          } catch (err) {
            if (!isStorageUnavailable(err)) throw err;
            // Document storage isn't configured - analyze locally instead.
          }
        }
        const session = await analyzeAnonymousFile(row.file);
        sessionIds.push(session.id);
        setRowStatus(row.id, "done");
      } catch (err) {
        anyErrored = true;
        const msg = err instanceof Error ? err.message : "Something went wrong. Try again.";
        setRowStatus(row.id, "error", msg);
      }
    }

    if (sessionIds.length > 0) {
      // Authenticated users see everything in their workspace; anonymous users
      // land on the first result with a navigator to the rest of the batch.
      if (auth.id) {
        router.push("/dashboard/contracts");
      } else {
        router.push(`/results/${sessionIds[0]}?batch=${encodeURIComponent(sessionIds.join(","))}`);
      }
    } else if (anyErrored) {
      setError("None of the files could be analyzed. Fix the issues above and try again.");
    } else {
      setError("No files were analyzed.");
    }
    setAnalyzing(false);
  }, [rows, analyzeAnonymousFile, setRowStatus, auth.id, router]);

  const analyzeAll = useCallback(() => {
    if (rows.length === 0 || analyzing) return;
    if (rows.length === 1 && rows[0].status === "ready") {
      void analyzeSingle(rows[0]);
    } else {
      void analyzeMulti();
    }
  }, [rows, analyzing, analyzeSingle, analyzeMulti]);

  const readyCount = rows.filter((r) => r.status === "ready").length;
  const doneCount = rows.filter((r) => r.status === "done").length;

  return (
    <main className="relative flex min-h-screen flex-col bg-canvas">
      <div className="relative">
        <Navbar />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-5 pb-16 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl"
        >
          <div className="text-center">
            <span className="inline-flex rounded-md border border-white/[0.08] bg-[#18181B] px-3 py-1.5 text-[12px] tracking-tight text-muted">
              No signup · No credit card · Results in under two minutes
            </span>
            <h1 className="mt-6 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-fg sm:text-[34px]">
              Upload your vendor contracts
            </h1>
            <p className="mt-4 text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
              We&apos;ll surface renewal dates, cancellation deadlines, price
              escalations, and potential savings - with evidence for every finding.
              Add as many contracts as you like.
            </p>
          </div>

          {/* dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={`glass-glow mt-10 cursor-pointer rounded-lg border border-dashed p-8 text-center transition-colors duration-150 ${
              dragOver
                ? "border-white/60 bg-white/[0.06]"
                : "border-white/15 bg-surface hover:border-white/25"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <div className="mx-auto flex size-12 items-center justify-center rounded-md border border-white/20 bg-white/[0.06]">
              <span aria-hidden="true" className="block">
                <span className="block h-[14px] w-[22px] border-2 border-b-0 border-zinc-300" style={{ borderRadius: "6px 6px 0 0" }} />
                <span className="mx-auto -mt-px block h-[7px] w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-zinc-300" />
              </span>
            </div>
            <p className="mt-5 text-[15px] font-semibold text-fg">
              {dragOver ? "Drop them here" : "Drag & drop your contracts"}
            </p>
            <p className="mt-1 text-[13px] tracking-tight text-muted">
              or <span className="font-medium text-fg">browse files</span> - multiple PDF or DOCX, up to {MAX_MB} MB each
            </p>
            <div className="mt-6 flex items-center justify-center gap-5 text-[12px] tracking-tight text-muted">
              <span>PDF</span>
              <span>DOCX</span>
              <span>Encrypted</span>
            </div>
          </div>

          {/* selected files */}
          {rows.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2"
            >
              {analyzing && rows.length > 1 && (
                <p className="text-center text-[12px] tracking-tight text-muted">
                  {doneCount} of {rows.length} analyzed
                </p>
              )}
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="border-sheen flex items-center gap-3 rounded-xl border border-line bg-surface p-3"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg border border-white/20 bg-white/[0.06]">
                    <span className="text-[10px] font-semibold tracking-[-0.01em] text-zinc-300">
                      {(row.file.name.split(".").pop() ?? "doc").slice(0, 4)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium tracking-tight text-fg">
                        {row.file.name}
                      </p>
                      <p className="text-[11.5px] tracking-tight text-muted">
                        {(row.file.size / 1024 / 1024).toFixed(1)} MB
                        {row.status === "analyzing" && " · extracting…"}
                        {row.status === "done" && " · analyzed"}
                        {row.status === "error" && " · failed"}
                      </p>
                      {row.status === "error" && row.error && (
                        <p className="mt-0.5 text-[11px] leading-snug tracking-tight text-zinc-300">
                          {row.error}
                        </p>
                      )}
                    </div>
                    {row.status === "analyzing" && (
                      <span className="flex size-4 shrink-0 animate-spin items-center justify-center rounded-full border-2 border-zinc-400 border-t-transparent" />
                    )}
                    {row.status === "done" && (
                      <span aria-hidden="true" className="block h-[7px] w-[11px] shrink-0 rotate-45 border-b-2 border-r-2 border-zinc-200" />
                    )}

                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRow(row.id);
                    }}
                    disabled={analyzing && row.status === "analyzing"}
                    aria-label={`Remove ${row.file.name}`}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[15px] text-muted hover:bg-white/10 hover:text-fg disabled:opacity-40"
                  >
                    ×
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setRows([])}
                  disabled={analyzing}
                  className="flex h-9 items-center rounded-md px-3 text-[12.5px] font-medium text-muted transition-colors hover:bg-white/5 hover:text-fg disabled:opacity-40"
                >
                  Clear all
                </button>
                <button
                  onClick={analyzeAll}
                  disabled={analyzing || readyCount === 0}
                  className="inline-flex h-9 items-center rounded-md bg-white px-4 text-[13px] font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {analyzing ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                      Analyzing{rows.length > 1 ? " batch" : ""}…
                    </>
                  ) : rows.length === 1 ? (
                    "Analyze"
                  ) : (
                    `Analyze all (${readyCount})`
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-zinc-300/30 bg-zinc-400/10 px-4 py-3 text-[13.5px] text-zinc-100">
              {error}
            </p>
          )}
        </motion.div>
      </div>
    </main>
  );
}