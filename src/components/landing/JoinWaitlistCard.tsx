"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { EASE, STAGGER_MS } from "./motion";

const ease = EASE;

type RewardPath = "discord" | "skool" | "subscribe-newsletter" | "refer-friend";

interface RewardDef {
  id: RewardPath;
  label: string;
  hint: string;
}

const REWARDS: RewardDef[] = [
  { id: "discord", label: "Join the Discord", hint: "Community access, roadmap votes" },
  { id: "skool", label: "Join the Skool group", hint: "Weekly live Q&A and workshops" },
  {
    id: "subscribe-newsletter",
    label: "Subscribe to the newsletter",
    hint: "Early access + behind-the-scenes updates",
  },
  { id: "refer-friend", label: "Refer a friend", hint: "Unlock when a friend joins" },
];

type Plan = "free" | "pro" | "team" | "enterprise";

interface PlanDef {
  id: Plan;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
}

const PLAN_MAP: Record<Plan, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Start free - every new account gets a 30-day Team Plus trial.",
    features: [
      "30-day Team Plus trial on signup",
      "Unlimited contract uploads",
      "AI contract analysis",
      "Visual annotations & drawings",
      "Export findings as PDF",
      "Up to 3 team members",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "$250",
    cadence: "/ month",
    blurb: "Everything in Free, plus priority support and unlimited contract reviews.",
    features: [
      "Unlimited contract uploads",
      "Unlimited AI review sessions",
      "Team collaboration with shared findings",
      "Reference document uploads",
      "Google Drive and Gmail support",
      "Export to PDF, CSV, and markdown",
      "Priority support",
    ],
  },
  team: {
    id: "team",
    name: "Team Plus",
    price: "$250",
    cadence: "CAD · one-time",
    blurb: "One payment, every finding forever - no subscription.",
    features: [
      "Connect Gmail, Google Drive & Slack - import vendor documents",
      "Renewal & cancellation-deadline alerts",
      "Price-increase detection & risk scoring",
      "Business workspace - dense tables, filters, schema view",
      "Complete activity log & Business dashboard",
      "Unlimited AI messages",
      "Export to CSV / PDF",
      "One-time $250 CAD via e-transfer - never auto-charged",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise Scale",
    price: "Custom",
    cadence: "pricing",
    blurb: "Build N4MA into your organization's financial and procurement workflows.",
    features: [
      "Custom onboarding & migration",
      "Dedicated success manager",
      "Custom contracts & SLA",
      "Advanced governance & audit",
    ],
  },
};

interface PricingCard {
  id: Plan;
  group: string;
  cta: string;
  href: string;
  featured: boolean;
  buttonNote?: string;
}

const CARDS: PricingCard[] = [
  {
    id: "free",
    group: "Free includes:",
    cta: "Start your free trial",
    href: "/auth?mode=signup",
    featured: false,
    buttonNote: "30 days free, no credit card",
  },
  {
    id: "pro",
    group: "Everything in Free, plus:",
    cta: "Join waitlist",
    href: "/auth?mode=signup",
    featured: true,
    buttonNote: "unlock by joining Discord / Skool / newsletter / referral",
  },
  {
    id: "team",
    group: "Everything in Pro, plus:",
    cta: "Contact sales",
    href: "mailto:hello@n4ma.online",
    featured: false,
    buttonNote: "custom pricing · team plans",
  },
  {
    id: "enterprise",
    group: "Everything in Team, plus:",
    cta: "Contact sales",
    href: "mailto:enterprise@n4ma.online",
    featured: false,
    buttonNote: "custom pricing · enterprise",
  },
];

function Check() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className="mt-[3px] shrink-0 text-zinc-300"
    >
      <path
        d="M2.5 6.2 5 8.5l4.5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TierCard({
  card,
  index,
}: {
  card: PricingCard;
  index: number;
}) {
  const plan = PLAN_MAP[card.id];
  const isPro = card.id === "pro";
  const isCustom = card.id === "team" || card.id === "enterprise";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: index * (STAGGER_MS / 1000), ease }}
      whileHover={{ y: -4 }}
      className={`relative flex flex-col rounded-xl border bg-surface transition-colors ${
        card.featured
          ? "mt-4 border-line-strong shadow-[0_24px_64px_rgba(0,0,0,0.4)]"
          : "border-line hover:border-line-strong"
      }`}
    >
      {card.featured && (
        <div className="absolute inset-x-0 -top-4 z-10 flex items-center justify-center">
          <span className="rounded-full bg-white px-4 py-1 text-[10.5px] font-[510] tracking-[-0.01em] text-black shadow-sm shadow-black/40">
            Most popular
          </span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-6">
        <p className="text-[15px] font-[510] tracking-[-0.014em] text-fg">
          {plan.name}
        </p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          {plan.blurb}
        </p>

        {isPro ? (
          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="text-[32px] font-[510] tracking-[-0.03em] text-fg">
              $250
            </span>
            <span className="text-[12.5px] text-muted">/ month</span>
          </div>
        ) : isCustom ? (
          <div className="mt-5 flex items-center text-fg">
            <span className="text-[24px] font-[510] tracking-[-0.022em]">
              Custom
            </span>
          </div>
        ) : (
          <div className="mt-5 flex items-baseline gap-1.5">
            <span className="text-[32px] font-[510] tracking-[-0.03em] text-fg">
              {plan.price}
            </span>
            <span className="text-[12.5px] text-muted">{plan.cadence}</span>
          </div>
        )}

        {isPro && (
          <p className="mt-1 text-[11px] tracking-tight text-muted">
            ≈ $185 USD · monthly
          </p>
        )}

        <div className="mt-5">
          {isPro ? (
            <JoinWaitlistCard planId={card.id} planName={plan.name} />
          ) : (
            <>
              <Button
                href={card.href}
                variant={card.featured ? "primary" : "outline"}
                className="w-full"
              >
                {card.cta}
              </Button>
              {card.buttonNote && (
                <p className="mt-1.5 text-center text-[11.5px] text-muted">
                  {card.buttonNote}
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-7 flex-1">
          <p className="text-[12px] font-[510] tracking-[-0.01em] text-fg">
            {card.group}
          </p>
          <ul className="mt-3 space-y-2.5">
            {plan.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-[13px] font-normal leading-snug tracking-[-0.01em] text-faint"
              >
                <Check />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

interface JoinWaitlistCardProps {
  planId: string;
  planName: string;
}

function JoinWaitlistCard({ planId, planName }: JoinWaitlistCardProps) {
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [softwareCount, setSoftwareCount] = useState("");
  const [reward, setReward] = useState<RewardPath>("discord");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "submitting") return;

    setStatus("submitting");
    setMessage(null);
    setConfirmation(null);

    // Only send the optional extras when they were actually filled in.
    const parsed = Number.parseInt(softwareCount, 10);
    const count = Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId,
          email,
          reward,
          companyName: company.trim() || undefined,
          softwareCount: count,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Server messages are already written for visitors (e.g. "Too many
        // signups from this network"), so surface them as-is.
        throw new Error(body?.error ?? "Something went wrong. Please try again.");
      }

      setStatus("success");
      setConfirmation(
        typeof body?.message === "string"
          ? body.message
          : "You're on the list - we'll email you when Pro opens."
      );
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  if (status === "success" && confirmation) {
    return (
      <div className="w-full">
        <div className="flex items-start gap-2.5 rounded-md border border-line bg-canvas px-4 py-3">
          <Check />
          <div>
            <p className="text-[13px] leading-snug text-fg">{confirmation}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-muted">
              No payment now. We will email you when Pro access opens.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <a
        href="/auth?mode=signup"
        className="block w-full rounded-md border border-line bg-canvas px-4 py-2.5 text-center text-[13px] font-medium text-faint transition-colors hover:border-line-strong hover:text-fg"
      >
        30-day free trial
      </a>

      <div className="mt-3 rounded-md border border-line-strong bg-canvas px-4 py-3 text-[11.5px] leading-relaxed text-faint">
        {planName} is not available for purchase or free trial.
        It unlocks by joining the Discord, Skool group, newsletter, or
        referring a friend. Add your email below to get a notification
        when your path is verified.
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
            disabled={status === "submitting"}
            className="flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-fg placeholder:text-muted outline-none transition-colors focus:border-line-strong disabled:opacity-50 sm:flex-none sm:w-44"
          />
        </div>

        <details className="group">
          <summary className="cursor-pointer text-[11.5px] text-muted transition-colors hover:text-fg">
            Add company details (optional)
          </summary>
          <div className="mt-2 space-y-2">
            <input
              type="text"
              autoComplete="organization"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company name"
              maxLength={120}
              disabled={status === "submitting"}
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-[13px] text-fg placeholder:text-muted outline-none transition-colors focus:border-line-strong disabled:opacity-50"
            />
            <input
              type="number"
              min={0}
              max={100000}
              inputMode="numeric"
              value={softwareCount}
              onChange={(e) => setSoftwareCount(e.target.value)}
              placeholder="Software subscriptions"
              disabled={status === "submitting"}
              className="w-full rounded-md border border-line bg-canvas px-3 py-2 text-[13px] tabular-nums text-fg placeholder:text-muted outline-none transition-colors focus:border-line-strong disabled:opacity-50"
            />
          </div>
        </details>

        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">How do you want to unlock this tier?</legend>
          {REWARDS.map((r) => (
            <label
              key={r.id}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-[12.5px] transition-colors ${
                reward === r.id
                  ? "border-line-strong bg-white/10 text-fg"
                  : "border-line bg-canvas text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              <input
                type="radio"
                name="reward"
                value={r.id}
                checked={reward === r.id}
                onChange={() => setReward(r.id)}
                disabled={status === "submitting"}
                className="sr-only"
              />
              {r.label}
              <span className="ml-1 text-[11px] text-muted">{r.hint}</span>
            </label>
          ))}
        </fieldset>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Sending…" : "Join waitlist"}
        </Button>

        {status === "error" && message && (
          <p
            role="alert"
            className="rounded-md border border-coral/40 bg-coral/5 px-3 py-2.5 text-[12.5px] leading-relaxed text-fg"
          >
            {message}
          </p>
        )}
      </form>

      <p className="mt-3 text-[11px] text-ash">
        No payment now. You will only be charged after your waitlist path is
        verified and a billing link is sent to your email.
      </p>
    </div>
  );
}

export { TierCard };
export { JoinWaitlistCard };
export { CARDS };
