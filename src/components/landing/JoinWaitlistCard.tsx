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
    blurb: "Try Pro free for 14 days - no credit card.",
    features: [
      "14-day Pro trial on signup",
      "Unlimited video uploads",
      "Voice feedback recording",
      "Visual annotations & drawings",
      "Export feedback as PDF",
      "Up to 3 team members",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "$250",
    cadence: "/ month",
    blurb: "Everything in Free, plus priority support and unlimited feedback.",
    features: [
      "Unlimited videos and feedback sessions",
      "Unlimited voice notes and annotations",
      "Team collaboration with threaded feedback",
      "Reference image uploads",
      "YouTube and Drive link support",
      "Export to PDF, CSV, and markdown",
      "Priority support",
    ],
  },
  team: {
    id: "team",
    name: "Team",
    price: "Custom",
    cadence: "contact sales",
    blurb: "For growing teams that need admin controls and advanced workflows.",
    features: [
      "Everything in Pro",
      "Admin dashboard and user management",
      "Custom feedback templates",
      "Advanced permissions and roles",
      "API access for integrations",
      "Dedicated account manager",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    cadence: "contact sales",
    blurb: "For large organizations with custom security and compliance needs.",
    features: [
      "Everything in Team",
      "SSO and SCIM provisioning",
      "Custom SLA and compliance reporting",
      "On-premise deployment options",
      "Dedicated success team",
      "Custom training and onboarding",
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
    buttonNote: "14 days free, no credit card",
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
    href: "mailto:hello@flask.video",
    featured: false,
    buttonNote: "custom pricing · team plans",
  },
  {
    id: "enterprise",
    group: "Everything in Team, plus:",
    cta: "Contact sales",
    href: "mailto:enterprise@flask.video",
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
  const [reward, setReward] = useState<RewardPath>("discord");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "submitting") return;

    setStatus("submitting");
    setMessage(null);

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId, email, reward }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Could not join the waitlist");
      }

      setStatus("success");
      setMessage(
        "You are on the list. We will email you when a spot opens — check your inbox in a few minutes."
      );
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    }
  };

  return (
    <div className="w-full">
      <a
        href="/auth?mode=signup"
        className="block w-full rounded-md border border-line bg-canvas px-4 py-2.5 text-center text-[13px] font-medium text-faint transition-colors hover:border-line-strong hover:text-fg"
      >
        14-day free trial
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

        {message && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-md px-3 py-2.5 text-[12.5px] leading-relaxed ${
              status === "success"
                ? "border border-line bg-white/10 text-fg"
                : "border border-line-strong bg-surface text-muted"
            }`}
          >
            {message}
          </motion.p>
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
