"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createAnonymousSession } from "@/lib/store";
import type { ContractExtraction } from "@/lib/types";
import { Navbar } from "@/components/landing/Navbar";

const ACCEPTED = [".pdf", ".docx"];
const MAX_MB = 25;

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const acceptFile = useCallback(
    (f: File) => {
      const err = validate(f);
      if (err) {
        setError(err);
        setFile(null);
        return;
      }
      setError(null);
      setFile(f);
    },
    [validate]
  );

  const startAnalysis = useCallback(
    (
      name: string,
      kind: "pdf" | "docx",
      size: number,
      extraction: ContractExtraction | null = null
    ) => {
      const session = createAnonymousSession(name, kind, size, "manual", extraction);
      router.push(`/processing/${session.id}`);
    },
    [router]
  );

  const [analyzing, setAnalyzing] = useState(false);

  /** Upload to /api/extract so Gemini reads the real document; fall back to
      the simulated pipeline if the extraction service is unavailable. */
  const analyze = useCallback(async () => {
    if (!file) return;
    setAnalyzing(true);
    let extraction: ContractExtraction | null = null;
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/extract", { method: "POST", body: form });
      if (res.ok) {
        const data = (await res.json()) as { extraction?: ContractExtraction };
        extraction = data.extraction ?? null;
      }
    } catch {
      // No backend reachable - the simulated pipeline still produces a result.
    }
    const ext = file.name.split(".").pop()?.toLowerCase() as "pdf" | "docx";
    startAnalysis(file.name, ext, file.size, extraction);
    setAnalyzing(false);
  }, [file, startAnalysis]);

  return (
    <main className="relative flex min-h-screen flex-col bg-canvas">
      <div className="bg-grid-dark absolute inset-0 opacity-50" />
      <div className="relative">
        <Navbar />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-5 pb-20 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-xl"
        >
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#18181B] px-3.5 py-1.5 text-[12px] tracking-tight text-muted">
              <span className="size-1.5 rounded-full bg-zinc-400" />
              No signup · No credit card · Results in under a minute
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-[44px]">
              Upload your vendor contract
            </h1>
            <p className="mt-4 text-[16px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
              We&apos;ll surface renewal dates, cancellation deadlines, price
              escalations, and potential savings - with evidence for every finding.
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
              const f = e.dataTransfer.files?.[0];
              if (f) acceptFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`mt-10 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
              dragOver
                ? "border-white/60 bg-white/[0.06]"
                : "border-white/15 bg-surface hover:border-white/25"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) acceptFile(f);
                e.target.value = "";
              }}
            />
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.06]">
              <span aria-hidden="true" className="block">
                <span className="block h-[14px] w-[22px] border-2 border-b-0 border-zinc-300" style={{ borderRadius: "6px 6px 0 0" }} />
                <span className="mx-auto -mt-px block h-[7px] w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-zinc-300" />
              </span>
            </div>
            <p className="mt-5 text-[15px] font-semibold text-fg">
              {dragOver ? "Drop it here" : "Drag & drop your contract"}
            </p>
            <p className="mt-1 text-[13px] tracking-tight text-muted">
              or <span className="font-medium text-fg">browse files</span> - PDF or DOCX, up to {MAX_MB} MB
            </p>
            <div className="mt-6 flex items-center justify-center gap-5 text-[12px] tracking-tight text-muted">
              <span>PDF</span>
              <span>DOCX</span>
              <span>Encrypted</span>
            </div>
          </div>

          {/* selected file */}
          {file && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-glow"
            >
              <div className="flex size-9 items-center justify-center rounded-lg border border-white/20 bg-white/[0.06]">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-300">
                  {(file.name.split(".").pop() ?? "doc").slice(0, 4)}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium tracking-tight text-fg">{file.name}</p>
                <p className="text-[11.5px] tracking-tight text-muted">
                  {(file.size / 1024 / 1024).toFixed(1)} MB · ready to analyze
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                }}
                aria-label="Remove file"
                className="flex size-8 items-center justify-center rounded-lg text-[15px] text-muted hover:bg-white/10 hover:text-fg"
              >
                ×
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void analyze();
                }}
                disabled={analyzing}
                className="inline-flex h-10 items-center rounded-full bg-white px-5 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {analyzing ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    Analyzing…
                  </>
                ) : (
                  "Analyze"
                )}
              </button>
            </motion.div>
          )}

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13.5px] text-red-400">
              {error}
            </p>
          )}

          {/* sample */}
          <div className="mt-6 text-center">
            <button
              onClick={() =>
                startAnalysis("Master_Subscription_Agreement_2025.pdf", "pdf", 482331)
              }
              className="text-[12.5px] tracking-tight text-muted underline decoration-white/20 underline-offset-4 transition-colors hover:text-fg"
            >
              No contract handy? Analyze a sample agreement instead
            </button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
