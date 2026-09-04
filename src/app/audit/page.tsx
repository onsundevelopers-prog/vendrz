"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createAuditSession, updateAuditSession } from "@/lib/store";
import { startExtraction } from "@/lib/extract";
import { Navbar } from "@/components/landing/Navbar";

const ease = [0.22, 1, 0.36, 1] as const;

export default function AuditPage() {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);

  const start = (source: "gmail" | "aws" | "manual") => {
    if (source !== "manual") {
      // No real Gmail/AWS integration is connected yet - be honest rather
      // than fabricating an audit from invented data.
      setNotice(
        source === "gmail"
          ? "Gmail isn't connected yet. Upload a contract to get results immediately."
          : "AWS billing isn't connected yet. Upload a contract to get results immediately."
      );
      return;
    }
    const session = createAuditSession(source);
    router.push(`/audit/processing/${session.id}`);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  /** Start every selected file's analysis and open the review. */
  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setNotice(null);

    // Kick off every file in parallel. On persistent servers the POST
    // answers in under 2 seconds with a queued job id and the analysis runs
    // in the background; on serverless it returns the finished result
    // directly. Either way the page never blocks for minutes.
    const started = await Promise.allSettled(
      files.map(async (file) => {
        const outcome = await startExtraction(file);
        return { file, outcome };
      })
    );

    const readySessions: { id: string; file: File }[] = [];
    const queued: { sessionId: string; jobId: string }[] = [];
    let firstError: string | null = null;

    for (const result of started) {
      if (result.status === "rejected") {
        firstError ??=
          result.reason instanceof Error
            ? result.reason.message
            : "Something went wrong. Try again.";
        continue;
      }
      const { file, outcome } = result.value;
      const session = createAuditSession("manual");
      if (outcome.done) {
        if (outcome.failure) {
          firstError ??= outcome.failure;
          continue;
        }
        updateAuditSession(session.id, {
          extraction: outcome.extraction,
          documentName: file.name,
          pipelineStatus: "complete",
        });
        readySessions.push({ id: session.id, file });
      } else {
        updateAuditSession(session.id, {
          jobId: outcome.jobId,
          documentName: file.name,
          pipelineStatus: "analyze",
        });
        queued.push({ sessionId: session.id, jobId: outcome.jobId });
      }
    }
    setUploadProgress(null);
    setUploading(false);

    if (readySessions.length > 0) {
      // Finished inside the POST (serverless) - open the first result now.
      router.push(`/audit/results/${readySessions[0].id}`);
    } else if (queued.length > 0) {
      // Analysis is running in the background - show live progress, then
      // route to the first finished report.
      const jobs = Object.fromEntries(queued.map((q) => [q.sessionId, q.jobId]));
      router.push(
        `/audit/processing/${queued[0].sessionId}?jobs=${encodeURIComponent(JSON.stringify(jobs))}`
      );
    } else {
      setNotice(
        firstError ?? "No files were selected. Choose a PDF or DOCX to get started."
      );
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className="relative">
        <Navbar />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-20 pt-24 lg:px-8 lg:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="text-center"
        >
          <span className="inline-flex rounded-md border border-white/10 bg-[#18181B] px-3 py-1.5 text-[12px] tracking-tight text-zinc-300">
            Free review · no signup · no credit card
          </span>
          <h1 className="mt-6 text-balance text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-fg sm:text-4xl">
            Find the money your business is wasting
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[16px] font-normal leading-[1.55] tracking-[-0.01em] text-muted">
            N4MA reads your contracts, invoices, and subscriptions for hidden fees,
            auto-renewals, and price increases - then shows you exactly what to fix
            and how much you could save. No account needed to start.
          </p>
        </motion.div>

        {/* source options */}
        <div className="mt-12 grid w-full gap-4 lg:grid-cols-3">
          {/* A - connect gmail (primary) */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease }}
            onClick={() => start("gmail")}
            className="border-sheen group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[12px] font-semibold tracking-tight text-zinc-300">
              01
            </div>
            <div className="flex flex-1 flex-col">
              <span className="mt-5 w-fit rounded-md border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[10px] tracking-[-0.01em] text-zinc-300">
                Recommended
              </span>
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-fg">
                Connect Gmail
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed tracking-[-0.01em] text-muted">
                Read-only scan of your inbox. We surface contract-related emails and
                attachments - renewal notices, agreements, and order forms - for you to
                review.
              </p>
            </div>
            <div className="mt-5 flex w-full items-center justify-between">
              <span className="rounded-md border border-white/10 bg-[#18181B] px-2.5 py-1 text-[11px] tracking-tight text-zinc-400">
                OAuth · read-only
              </span>
              <span className="text-[14px] text-zinc-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-300">
                →
              </span>
            </div>
          </motion.button>

          {/* B - connect aws */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease }}
            onClick={() => start("aws")}
            className="border-sheen group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[12px] font-semibold tracking-tight text-zinc-300">
              02
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-fg">
                Connect AWS
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed tracking-[-0.01em] text-muted">
                Read-only access to AWS billing. We analyze compute, storage, and cloud
                spend to surface waste, unused capacity, and savings.
              </p>
            </div>
            <div className="mt-5 flex w-full items-center justify-between">
              <span className="rounded-md border border-white/10 bg-[#18181B] px-2.5 py-1 text-[11px] tracking-tight text-zinc-400">
                Billing · read-only
              </span>
              <span className="text-[14px] text-zinc-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-300">
                →
              </span>
            </div>
          </motion.button>

          {/* C - manually upload a contract */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease }}
            onClick={() => fileInputRef.current?.click()}
            className="border-sheen group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[12px] font-semibold tracking-tight text-zinc-300">
              03
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-fg">
                Manually upload a contract
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed tracking-[-0.01em] text-muted">
                Drop in a PDF or DOCX of your invoices and agreements. We extract vendors,
                renewal dates, escalations, and overbilling.
              </p>
            </div>
            <div className="mt-5 flex w-full items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#18181B] px-2.5 py-1 text-[11px] tracking-tight text-zinc-400">
                {uploading ? (
                  <>
                    <span className="size-3 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                    {uploadProgress ?? "Analyzing…"}
                  </>
                ) : (
                  "PDF · DOCX · up to 25 MB"
                )}
              </span>
              <span className="text-[14px] text-zinc-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-300">
                →
              </span>
            </div>
          </motion.button>

          {/* D - import from google drive */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.32, ease }}
            onClick={() => router.push("/dashboard/import")}
            className="border-sheen group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[12px] font-semibold tracking-tight text-zinc-300">
              04
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-fg">
                Import from Google Drive
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed tracking-[-0.01em] text-muted">
                Browse or search your Drive, pick vendor contracts and documents, and
                import them for analysis. PDF, DOCX, and Google Docs/Sheets supported.
              </p>
            </div>
            <div className="mt-5 flex w-full items-center justify-between">
              <span className="rounded-md border border-white/10 bg-[#18181B] px-2.5 py-1 text-[11px] tracking-tight text-zinc-400">
                OAuth · read-only
              </span>
              <span className="text-[14px] text-zinc-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-300">
                →
              </span>
            </div>
          </motion.button>

          {/* E - import from slack */}
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease }}
            onClick={() => router.push("/dashboard/import")}
            className="border-sheen group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[12px] font-semibold tracking-tight text-zinc-300">
              05
            </div>
            <div className="flex flex-1 flex-col">
              <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em] text-fg">
                Import from Slack
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed tracking-[-0.01em] text-muted">
                Search your Slack workspace for vendor-related messages and files, and
                import the ones that matter with full source context.
              </p>
            </div>
            <div className="mt-5 flex w-full items-center justify-between">
              <span className="rounded-md border border-white/10 bg-[#18181B] px-2.5 py-1 text-[11px] tracking-tight text-zinc-400">
                OAuth · read-only
              </span>
              <span className="text-[14px] text-zinc-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-zinc-300">
                →
              </span>
            </div>
          </motion.button>
        </div>

        {/* honest notice for unconnected sources */}
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 flex w-full max-w-xl items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left"
          >
            <p className="text-[13px] leading-relaxed text-muted">{notice}</p>
          </motion.div>
        )}

        {/* read-only reassurance */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.42 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] tracking-tight text-muted/80"
        >
          <span>Read-only access, always</span>
          <span>We cannot move money or modify accounts</span>
          <span>Results in under two minutes</span>
        </motion.div>

      </div>

      {/* hidden file picker for the manual-upload card */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        multiple
        className="hidden"
        onChange={onFileSelected}
      />
    </main>
  );
}
