"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { enterDemoMode, getAuditSession } from "@/lib/store";
import { ExtractionResult } from "@/components/results/ExtractionResult";
import { Beam } from "@/components/ui/Beam";
import { AnimatedStat } from "@/components/ui/RollingNumber";
import { Logo } from "@/components/brand/Logo";
import { money, moneyShort } from "@/lib/format";
import { SeverityBadge } from "@/components/ui/primitives";

const ease = [0.22, 1, 0.36, 1] as const;

export default function AuditResultsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = useMemo(() => getAuditSession(params.id), [params.id]);
  const audit = session?.result;

  // Manual uploads land here with real Gemini extraction instead of a demo audit.
  if (session?.extraction) {
    return <ExtractionResult session={session} />;
  }

  if (!audit) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5">
        <div className="text-center">
          <p className="text-[15px] text-muted">Audit results not ready yet.</p>
          <Link href="/audit" className="mt-2 inline-block text-[13px] tracking-tight text-emerald-400 underline underline-offset-4">
            Run a free audit
          </Link>
        </div>
      </main>
    );
  }

  const topOpportunities = audit.opportunities.filter((o) => o.status !== "dismissed").slice(0, 4);
  const riskyVendor = audit.vendors.find((v) => v.risk?.level === "high" || v.risk?.level === "critical");
  const healthColor = audit.healthScore >= 75 ? "#34d399" : audit.healthScore >= 55 ? "#e4e4e7" : "#fbbf24";

  const stats = [
    { label: "Total vendor spend", value: audit.totalAnnualSpend, format: money, accent: "text-fg" },
    { label: "Potential savings", value: audit.potentialSavings, format: money, accent: "text-emerald-400" },
    { label: "Vendors identified", value: audit.vendorCount, format: (v: number) => v.toLocaleString(), accent: "text-fg" },
    { label: "Renewal risks", value: audit.renewalRisks, format: (v: number) => v.toLocaleString(), accent: "text-amber-400" },
    { label: "Unused licenses", value: audit.unusedLicenses, format: (v: number) => v.toLocaleString(), accent: "text-orange-400" },
    { label: "Billing anomalies", value: audit.billingAnomalies, format: (v: number) => v.toLocaleString(), accent: "text-red-400" },
    { label: "Price increases", value: audit.priceIncreases, format: (v: number) => v.toLocaleString(), accent: "text-amber-400" },
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
        >            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-[12px] tracking-tight text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Analysis complete · {audit.companyName}
          </span>
          <p className="mt-3 text-[12px] tracking-tight text-muted">
            {audit.transactionCount.toLocaleString()} transactions normalized ·{" "}
            {audit.vendorCount} vendors matched
          </p>
          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg sm:text-5xl">
            Your vendor audit is ready.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] font-normal leading-[1.55] tracking-[-0.01em] text-muted">
            Here&apos;s what we found across your vendor spend. Create a free account to
            unlock the full report and start acting on it.
          </p>
        </motion.div>

        {/* beam results card */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease }}
          className="mt-12"
        >
          <Beam
            idSuffix="audit"
            colors={["52, 211, 153", "16, 185, 129", "45, 212, 191", "110, 231, 183"]}
            className="rounded-[24px] border border-white/10 bg-panel p-4 shadow-glow"
          >
            <div className="relative overflow-hidden rounded-[20px] bg-black">
              {/* status strip */}
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-6 items-center justify-center rounded-md bg-white/10">
                    <span className="text-[9px] font-semibold uppercase tracking-wide text-fg">VZ</span>
                  </div>
                  <span className="text-[11.5px] tracking-tight text-muted">
                    Vendor Spend Intelligence · trailing 12 months
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] tracking-tight text-muted">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  audit complete
                </span>
              </div>

              <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_220px]">
                {/* main stats */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
                  {stats.map((s, i) => (
                    <div key={s.label} className={i === 0 ? "col-span-2 sm:col-span-3 lg:col-span-2" : ""}>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{s.label}</p>
                      <p className={`mt-1.5 text-[30px] font-semibold leading-none tracking-tight lg:text-[34px] ${s.accent}`}>
                        <AnimatedStat value={s.value} format={s.format} duration={1300 + i * 120} />
                      </p>
                    </div>
                  ))}
                  {/* health */}
                  <div className="col-span-2 sm:col-span-3 lg:col-span-1">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Vendor spend health</p>
                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="text-[30px] font-semibold leading-none tracking-tight text-fg lg:text-[34px]">
                        <AnimatedStat value={audit.healthScore} duration={1300} />
                      </span>
                      <span className="text-[11px] text-muted">/100</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${audit.healthScore}%`, background: healthColor }}
                      />
                    </div>
                    <p className="mt-1.5 text-[10.5px] tracking-tight text-muted">
                      {audit.healthScore >= 75 ? "Healthy" : audit.healthScore >= 55 ? "Moderate" : "At risk"} overall
                    </p>
                  </div>
                </div>

                {/* right rail — worst offender */}
                <div className="hidden flex-col justify-between rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 lg:flex">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Biggest exposure</p>
                    {riskyVendor ? (
                      <>
                        <p className="mt-2 text-[15px] font-semibold text-fg">{riskyVendor.name}</p>
                        <p className="mt-1 text-[11.5px] tracking-tight text-amber-400">
                          Renews in {riskyVendor.risk?.daysToRenewal}d · auto-renewal
                        </p>
                        <p className="mt-3 text-[22px] font-semibold tracking-tight text-fg">
                          {moneyShort(riskyVendor.risk?.potentialRenewalCost ?? 0)}
                          <span className="text-xs font-normal text-muted">/yr exposure</span>
                        </p>
                      </>
                    ) : null}
                  </div>
                  <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <p className="text-[10.5px] tracking-tight text-muted">
                      {audit.vendorCount} vendors · {audit.spendSeries.length} months analyzed
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Beam>
        </motion.div>

        {/* discoveries */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease }}
          className="mt-14"
        >
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-fg">
                Vendrz found {audit.opportunities.filter((o) => o.status !== "dismissed").length} potential savings opportunities.
              </h2>
              <p className="mt-1 text-[12.5px] tracking-tight text-muted">
                A preview of what&apos;s inside the full report
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {topOpportunities.map((o, i) => (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55 + i * 0.08, ease }}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-white/[0.06] text-[11px] font-semibold text-fg">
                      {o.vendorName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-fg">{o.vendorName}</p>
                      <p className="text-[11px] tracking-tight text-muted">{o.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[17px] font-semibold tracking-tight text-emerald-400">
                      {money(o.estimatedSavings)}
                    </p>
                    <p className="text-[10px] tracking-tight text-muted">/yr potential</p>
                  </div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed tracking-[-0.01em] text-muted">{o.what}</p>
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
                  <span className="mt-px flex size-3.5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-[9px] font-bold leading-none text-amber-400">
                    !
                  </span>
                  <p className="text-[12px] leading-relaxed text-zinc-400">{o.why}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* renewal risk teaser */}
        {riskyVendor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8, ease }}
            className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.05] p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <SeverityBadge severity="high" />
              <p className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
                {riskyVendor.name} renewal risk
              </p>
              <span className="ml-auto text-[12px] tracking-tight text-muted">
                Annual spend {money(riskyVendor.annualSpend)}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Fact label="Renewal" value={`${riskyVendor.risk?.daysToRenewal} days`} />
              <Fact label="Cancellation deadline" value={`${riskyVendor.risk?.daysToDeadline} days`} />
              <Fact
                label="Expected price increase"
                value={`${riskyVendor.risk?.expectedIncreasePct ?? 0}%`}
                note={`renewal cost ${money(riskyVendor.risk?.potentialRenewalCost ?? 0)}`}
              />
            </div>
          </motion.div>
        )}

        {/* unlock CTA */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease }}
          className="mt-12"
        >
          <Beam
            idSuffix="unlock"
            colors={["52, 211, 153", "16, 185, 129", "45, 212, 191", "110, 231, 183"]}
            strength={0.7}
            className="rounded-[24px] border border-emerald-500/25 bg-[#0d1210] p-6 sm:p-8"
          >
            <div className="flex flex-col items-center text-center">
              <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">
                Unlock the full report
              </p>
              <h3 className="mt-3 max-w-lg text-balance text-2xl font-semibold leading-[1.1] tracking-[-0.03em] text-fg">
                Every vendor. Every opportunity. Your action plan.
              </h3>
              <p className="mt-3 max-w-md text-[14px] leading-relaxed tracking-[-0.01em] text-muted">
                Create a free account to see all {audit.opportunities.length} opportunities,
                vendor health scores, billing anomalies, and a prioritized action plan —
                then track savings as you act.
              </p>
              <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
                <Link
                  href={`/auth?mode=signup&next=/dashboard&audit=${session?.id ?? ""}`}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold tracking-[-0.01em] text-black transition-all hover:scale-[1.02] hover:opacity-90"
                >
                  Unlock my full audit
                </Link>
                <button
                  onClick={() => {
                    enterDemoMode();
                    router.push("/dashboard");
                  }}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/15 px-7 text-[14.5px] font-medium text-fg transition-colors hover:bg-white/10"
                >
                  Explore the live demo
                </button>
              </div>
              <p className="mt-4 text-[11.5px] tracking-tight text-muted/70">
                Free forever for the audit · results saved to your account
              </p>
            </div>
          </Beam>
        </motion.div>

        <p className="mt-8 text-center text-[11.5px] leading-relaxed tracking-tight text-muted/60">
          Potential savings are estimates produced by deterministic rules — never guaranteed.
          <br />
          Audit run on sample data (Acme Technologies) to demo the product end-to-end.
        </p>
      </div>
    </main>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-1.5 text-[18px] font-semibold tracking-tight text-fg">{value}</p>
      {note && <p className="mt-0.5 text-[11px] tracking-tight text-amber-400/80">{note}</p>}
    </div>
  );
}
