"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { money, formatDate } from "@/lib/format";
import type { AuditSession } from "@/lib/types";

const ease = [0.22, 1, 0.36, 1] as const;

export function ExtractionResult({ session }: { session: AuditSession }) {
  const x = session.extraction;
  if (!x) return null;

  const facts: { label: string; value: string }[] = [
    { label: "Vendor", value: x.vendorName },
    { label: "Contract type", value: x.contractType ?? "Not stated" },
    { label: "Effective date", value: x.effectiveDate ? formatDate(x.effectiveDate) : "Not stated" },
    { label: "Next renewal", value: x.renewalDate ? formatDate(x.renewalDate) : "Not stated" },
    {
      label: "Auto-renew",
      value:
        x.autoRenews === null
          ? "Not stated"
          : x.autoRenews
            ? x.autoRenewalNoticeDays
              ? `Yes — ${x.autoRenewalNoticeDays} days' notice`
              : "Yes"
            : "No",
    },
    {
      label: "Escalation",
      value: x.priceEscalationRate != null ? `${x.priceEscalationRate}% / yr` : "Not stated",
    },
    { label: "Annual value", value: x.annualSpend != null ? money(x.annualSpend) : "Not stated" },
    { label: "Payment terms", value: x.paymentTerms ?? "Not stated" },
  ];

  return (
    <main className="min-h-screen bg-canvas">
      {/* slim top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
          <Link href="/" aria-label="Vendrz home">
            <Logo className="[&_span:last-child]:text-[15px]" />
          </Link>
          <div className="flex items-center gap-2 text-[12px] tracking-tight text-muted">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Read-only · nothing imported
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        {/* heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-[12px] tracking-tight text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Analysis complete · {x.vendorName}
          </span>
          <p className="mt-3 text-[12px] tracking-tight text-muted">
            {session.documentName ?? "Uploaded contract"}
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl">
            Your contract, decoded.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] font-normal leading-[1.55] tracking-[-0.01em] text-muted">
            {x.summary ||
              "Key terms extracted from your document — renewal timing, escalation, and what to watch."}
          </p>
        </motion.div>

        {/* facts grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
          className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {facts.map((f) => (
            <div key={f.label} className="glass-border glass-glow rounded-xl px-4 py-3.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{f.label}</p>
              <p className="mt-1.5 text-[15px] font-medium leading-snug tracking-[-0.01em] text-fg">{f.value}</p>
            </div>
          ))}
        </motion.div>

        {/* clauses + risks */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25, ease }}
            className="glass-border rounded-2xl p-5"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Key clauses</p>
            <div className="mt-4 space-y-3">
              {x.keyClauses.length > 0 ? (
                x.keyClauses.map((c, i) => (
                  <div key={i} className="flex gap-3 rounded-lg bg-white/[0.03] px-3.5 py-2.5">
                    <span className="shrink-0 font-serif text-[18px] leading-none text-emerald-400/70">“</span>
                    <p className="text-[13px] leading-relaxed text-zinc-300">{c}</p>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-muted">No clauses were quoted.</p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease }}
            className="glass-border rounded-2xl p-5"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Risk flags</p>
            <div className="mt-4 space-y-3">
              {x.riskFlags.length > 0 ? (
                x.riskFlags.map((r, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3.5 py-2.5"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[10px] font-bold leading-none text-amber-400">
                      !
                    </span>
                    <p className="text-[13px] leading-relaxed text-zinc-300">{r}</p>
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-muted">No risk flags detected.</p>
              )}
            </div>

            {x.missingInformation.length > 0 && (
              <>
                <p className="mt-5 text-[11px] uppercase tracking-[0.14em] text-muted">
                  Not stated in the document
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {x.missingInformation.map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-[11px] tracking-tight text-muted"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* save CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="mt-12"
        >
          <div className="glass-border-emerald rounded-[20px] p-6 text-center sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">
              Save this analysis
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-fg">
              Monitor this contract, not just read it.
            </h3>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
              Create a free account to keep this extraction, track the renewal, and get
              alerts before it auto-renews.
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href={`/auth?mode=signup&next=/dashboard&audit=${session.id}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-black transition-all hover:scale-[1.02] hover:opacity-90"
              >
                Unlock &amp; track this contract
              </Link>
            </div>
          </div>
        </motion.div>

        <p className="mt-8 text-center text-[11.5px] tracking-tight text-muted/60">
          Extraction by Gemini Flash-Lite · review findings before acting · nothing imported to
          your accounts
        </p>
      </div>
    </main>
  );
}
