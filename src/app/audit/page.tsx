"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createAuditSession, updateAuditSession } from "@/lib/store";
import { analyzeFile } from "@/lib/extract";
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

  /** Analyze each selected file and open the first successful review. */
  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0 || uploading) return;
    setUploading(true);
    setNotice(null);

    const sessionIds: string[] = [];
    let failed = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(files.length > 1 ? `Analyzing ${file.name} (${i + 1} of ${files.length})…` : `Analyzing ${file.name}…`);
      try {
        // The shared helper uploads the file, polls until the analysis
        // finishes, and retries when a job is lost - it throws only with a
        // message safe to show the user.
        const { extraction } = await analyzeFile(file);
        const session = createAuditSession("manual");
        updateAuditSession(session.id, {
          extraction,
          documentName: file.name,
          pipelineStatus: "complete",
        });
        sessionIds.push(session.id);
      } catch (err) {
        failed = true;
        setNotice(
          `Couldn't analyze ${file.name}: ${err instanceof Error ? err.message : "Something went wrong."}`
        );
        break;
      }
    }
    setUploadProgress(null);
    setUploading(false);

    if (sessionIds.length > 0) {
      router.push(`/audit/results/${sessionIds[0]}`);
    } else if (!failed) {
      setNotice("No files were selected. Choose a PDF or DOCX to get started.");
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
            Run your free vendor spend review
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[16px] font-normal leading-[1.55] tracking-[-0.01em] text-muted">
            See where your company&apos;s money is going, and where you can save. We&apos;ll
            analyze spend, find renewals, and quantify waste before you create an
            account.
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
              <span className="mt-5 w-fit rounded-md border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[10px] tracking-wider text-zinc-300">
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
