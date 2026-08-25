"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createAuditSession, updateAuditSession } from "@/lib/store";
import { Navbar } from "@/components/landing/Navbar";
import { Logo } from "@/components/brand/Logo";
import { useSpotlight } from "@/components/ui/SpotlightCard";

const ease = [0.22, 1, 0.36, 1] as const;

export default function AuditPage() {
  const router = useRouter();
  const { ref: refA, onMouseMove: onMoveA } = useSpotlight<HTMLButtonElement>();
  const { ref: refB, onMouseMove: onMoveB } = useSpotlight<HTMLButtonElement>();
  const { ref: refC, onMouseMove: onMoveC } = useSpotlight<HTMLButtonElement>();

  const start = (source: "gmail" | "aws" | "manual") => {
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
      const res = await fetch("/api/extract", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Extraction failed. Try another file.");
        return;
      }
      const session = createAuditSession("manual");
      updateAuditSession(session.id, {
        extraction: data.extraction,
        documentName: data.documentName ?? file.name,
        pipelineStatus: "complete",
      });
      router.push(`/audit/results/${session.id}`);
    } catch {
      alert("Couldn't reach the extraction service.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas">
      <div className="bg-grid-dark absolute inset-0 opacity-50" />
      <div className="absolute inset-x-0 top-0 h-px bg-line" />
      <div className="relative">
        <Navbar />
      </div>

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-5 pb-24 pt-28 lg:px-8 lg:pt-32">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#18181B] px-3.5 py-1.5 text-[12px] tracking-tight">
            <span className="size-1.5 rounded-full bg-zinc-400" />
            <span className="text-zinc-300">
              Free audit · no signup · no credit card
            </span>
          </span>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl">
            Run your free vendor spend audit
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[16px] font-normal leading-[1.55] tracking-[-0.01em] text-muted">
            See where your company&apos;s money is going, and where you can save. We&apos;ll
            analyze spend, surface renewals, and quantify waste before you create an
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
            ref={refA}
            onMouseMove={onMoveA}
            className="glass-border glass-glow spotlight-card group flex h-full flex-col justify-between rounded-xl p-6 text-left"
          >
            <div className="spotlight-glow" aria-hidden="true" />
            <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[13px] font-semibold tracking-tight text-zinc-300">
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
            ref={refB}
            onMouseMove={onMoveB}
            className="glass-border glass-glow spotlight-card group flex h-full flex-col justify-between rounded-xl p-6 text-left"
          >
            <div className="spotlight-glow" aria-hidden="true" />
            <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[13px] font-semibold tracking-tight text-zinc-300">
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
            ref={refC}
            onMouseMove={onMoveC}
            className="glass-border glass-glow spotlight-card group flex h-full flex-col justify-between rounded-xl p-6 text-left"
          >
            <div className="spotlight-glow" aria-hidden="true" />
            <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-[13px] font-semibold tracking-tight text-zinc-300">
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

        <div className="mt-10 flex items-center gap-2 opacity-70">
          <Logo className="[&_span:last-child]:text-[13px]" />
          <span className="text-[11px] tracking-tight text-muted">
            Analyzing sample data · Acme Technologies
          </span>
        </div>
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
