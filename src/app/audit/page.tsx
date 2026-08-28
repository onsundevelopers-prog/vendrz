"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createAuditSession, updateAuditSession } from "@/lib/store";
import type { ContractExtraction } from "@/lib/types";
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

  const onFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      // /api/extract returns a jobId and extracts in the background, so poll
      // the job status until it completes, then persist the real extraction.
      // Without this the review would land on an empty result - the exact
      // dead-end this flow used to hit.
      let res: Response;
      try {
        res = await fetch("/api/extract", { method: "POST", body: fd });
      } catch {
        alert("Couldn't reach the extraction service. Check your connection and try again.");
        return;
      }
      const init = (await res.json().catch(() => null)) as {
        jobId?: string;
        error?: string;
      } | null;
      if (!res.ok || !init?.jobId) {
        alert(init?.error ?? "Couldn't start extraction. Try another file.");
        return;
      }

      const jobId = init.jobId;
      // The server extracts in the background (local models can take several
      // minutes for a real contract), so keep polling until the job reaches a
      // terminal state rather than cutting off after a short fixed timeout.
      const TERMINAL = new Set(["complete", "failed"]);
      const MAX_WAIT_MS = 20 * 60 * 1000; // 20 min safety cap
      const POLL_MS = 2000;
      const startedAt = Date.now();
      let consecutiveFailures = 0;
      while (Date.now() - startedAt < MAX_WAIT_MS) {
        const statusRes = await fetch(`/api/extract/status/${jobId}`).catch(
          () => null
        );
        const data = (await statusRes?.json().catch(() => null)) as {
          status?: string;
          error?: string;
          result?: { extraction?: ContractExtraction | null };
        } | null;

        if (data && TERMINAL.has(data.status ?? "")) {
          if (data.status === "complete") {
            const extraction = data.result?.extraction;
            if (!extraction) {
              alert("Couldn't extract terms from this file. Try another file.");
              return;
            }
            const session = createAuditSession("manual");
            updateAuditSession(session.id, {
              extraction,
              documentName: file.name,
              pipelineStatus: "complete",
            });
            router.push(`/audit/results/${session.id}`);
            return;
          }
          alert(data.error ?? "Couldn't extract terms from this file. Try another file.");
          return;
        }

        // A dropped poll is usually transient - only give up after repeated
        // consecutive failures, never on a single network blip.
        if (!statusRes || !statusRes.ok || !data) {
          consecutiveFailures += 1;
          if (consecutiveFailures >= 3) {
            alert("Couldn't reach the extraction service. Try again.");
            return;
          }
        } else {
          consecutiveFailures = 0;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      alert("Extraction is taking longer than expected. The file is still being processed - please try again shortly.");
    } catch {
      alert("Couldn't reach the extraction service.");
    } finally {
      setUploading(false);
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
            className="group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
          >
            <div className="flex size-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-[12px] font-semibold tracking-tight text-zinc-300">
              01
            </div>
            <div className="flex flex-1 flex-col">
              <span className="mt-5 w-fit rounded-md border border-white/20 bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-300">
                Recommended
              </span>
              <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-fg">
                Connect Gmail
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed tracking-[-0.01em] text-muted">
                Read-only scan of your inbox. We surface contract-looking emails and
                attachments: renewal notices, agreements, and order forms, as reviewable
                candidates.
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
            className="group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
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
            className="group flex h-full flex-col justify-between rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:bg-white/[0.03]"
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
                    Extracting…
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
          <span>Results in under 2 minutes</span>
        </motion.div>

      </div>

      {/* hidden file picker for the manual-upload card */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={onFileSelected}
      />
    </main>
  );
}
