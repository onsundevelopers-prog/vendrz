"use client";

/* ------------------------------------------------------------------ */
/*  Dashboard plan + display mode.                                    */
/*                                                                     */
/*  noma has five tiers:                                              */
/*    - Free ($0)      - Simple workspace, savings page, 5 AI msgs/mo  */
/*    - Pro ($11/mo)   - + Gmail, alerts, risk scoring, 100 AI msgs/mo */
/*    - Growth ($20/mo)- Business workspace, unlimited AI, exports     */
/*    - Business ($200/mo) - + team, automations, priority processing  */
/*    - Team ($999 one-time) - everything, one payment                 */
/*                                                                     */
/*  The plan gates features:                                           */
/*    - display mode: Free/Pro use the Simple workspace; Growth,       */
/*      Business and Team unlock the dense Business workspace.         */
/*    - AI messages: Free 5 / Pro 100 / paid-above unlimited, counted  */
/*      per calendar month (see store.getAiUsage / incrementAiUsage).  */
/*    - Gmail: Free is excluded; every paid tier can connect.          */
/*                                                                     */
/*  Paid plans unlock through a verified PayPal subscription (Plan     */
/*  ids come from env, one per tier). Once enabled a plan stays on     */
/*  indefinitely: there is no periodic re-verification, so a           */
/*  cancelled or expired subscription can never silently revoke        */
/*  access mid-month.                                                  */
/* ------------------------------------------------------------------ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PayPalSubscribe } from "@/components/dashboard/PayPalSubscribe";

export type DashboardMode = "simple" | "business";
export type Plan = "free" | "pro" | "growth" | "business" | "team";

export interface PlanDef {
  id: Plan;
  name: string;
  /** Short price label, e.g. "$11" */
  price: string;
  /** Cadence label, e.g. "/month" */
  cadence: string;
  blurb: string;
  features: string[];
  /** Which display mode this plan unlocks. */
  mode: DashboardMode;
  /** Monthly AI message allowance; Infinity = unlimited. */
  aiMessages: number;
  /** Whether the plan can connect Gmail. */
  gmail: boolean;
}

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "A clean, free workspace to see where your money is going.",
    features: [
      "What needs attention, at a glance",
      "Upcoming renewals, risks & savings",
      "Savings page with every opportunity",
      "5 AI messages per month",
    ],
    mode: "simple",
    aiMessages: 5,
    gmail: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "$11",
    cadence: "/month",
    blurb: "For people who want vendor email and alerts on top of the essentials.",
    features: [
      "Everything in Free",
      "Gmail integration - read vendor correspondence",
      "Renewal & cancellation-deadline alerts",
      "Price-increase detection & savings opportunities",
      "Vendor risk scoring",
      "100 AI messages per month",
    ],
    mode: "simple",
    aiMessages: 100,
    gmail: true,
  },
  {
    id: "growth",
    name: "Growth",
    price: "$20",
    cadence: "/month",
    blurb: "The full operational workspace for companies that need everything.",
    features: [
      "Everything in Pro",
      "Business workspace - dense tables, filters, schema view",
      "Complete activity log & Business dashboard",
      "Unlimited AI messages",
      "Export to CSV / PDF",
      "Priority AI processing",
    ],
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$200",
    cadence: "/month",
    blurb: "Growth, plus team collaboration and advanced automations.",
    features: [
      "Everything in Growth",
      "Team members, roles & permissions",
      "Advanced automations",
      "Dedicated support",
    ],
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
  },
  {
    id: "team",
    name: "Team",
    price: "$999",
    cadence: "one-time",
    blurb: "Everything, paid once. For a team that wants it all, no subscription.",
    features: [
      "Everything in Business",
      "Full workspace for every member",
      "All AI features & automations",
      "No recurring fee - one payment",
    ],
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
  },
];

export const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<
  Plan,
  PlanDef
>;

export function planDef(plan: Plan): PlanDef {
  return PLAN_MAP[plan] ?? PLAN_MAP.free;
}

/** Back-compat constant used by older callers. */
export const BUSINESS_PRICE = "$200/month";

/** Plans that unlock the dense Business workspace. */
const BUSINESS_PLANS: readonly Plan[] = ["growth", "business", "team"];
/** Plans shown in the upgrade picker (all paid tiers; Team is one-time/sales). */
const UPGRADE_PLANS: readonly Plan[] = ["pro", "growth", "business", "team"];

/** The PayPal plan id configured for a tier (undefined = not wired yet). */
export function paypalPlanId(plan: Plan): string | undefined {
  switch (plan) {
    case "pro":
      return process.env.NEXT_PUBLIC_PAYPAL_PLAN_PRO_ID?.trim() || undefined;
    case "growth":
      return process.env.NEXT_PUBLIC_PAYPAL_PLAN_GROWTH_ID?.trim() || undefined;
    case "business":
      return (
        process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID?.trim() ||
        process.env.PAYPAL_PLAN_ID?.trim() ||
        undefined
      );
    default:
      return undefined;
  }
}

const MODE_KEY = "vendrz.displayMode";
const PLAN_KEY = "vendrz.plan";
const SUBSCRIPTION_KEY = "vendrz.subscription";

interface DisplayModeContextValue {
  /** Effective mode. Free/Pro always read "simple"; Growth, Business and
      Team always read "business". Null only before the stored state has
      been read. */
  mode: DashboardMode | null;
  /** True once the stored preference has been read from localStorage. */
  ready: boolean;
  /** Switch mode. "business" on a plan that doesn't unlock it opens the
      upgrade screen instead of switching. */
  setMode: (m: DashboardMode) => void;
  /** The account's plan. */
  plan: Plan;
  /** True while the upgrade overlay is visible. */
  upgradeOpen: boolean;
  /** Open the upgrade screen, pre-selecting a plan. */
  requestUpgrade: (planId?: Plan) => void;
  closeUpgrade: () => void;
  /** The plan pre-selected in the upgrade screen. */
  upgradeTarget: Plan;
  /** Enable a paid plan after its subscription has been verified. */
  activatePlan: (planId: Plan) => void;
  /** Switch to the free plan. */
  switchToFree: () => void;
  /** Monthly AI message allowance for the current plan. */
  aiMessageLimit: number;
  /** Whether the current plan can connect Gmail. */
  canUseGmail: boolean;
}

const DisplayModeContext = createContext<DisplayModeContextValue>({
  mode: null,
  ready: false,
  setMode: () => {},
  plan: "free",
  upgradeOpen: false,
  requestUpgrade: () => {},
  closeUpgrade: () => {},
  upgradeTarget: "growth",
  activatePlan: () => {},
  switchToFree: () => {},
  aiMessageLimit: PLANS[0].aiMessages,
  canUseGmail: PLANS[0].gmail,
});

function readStored<T extends string>(key: string, allowed: T[], fallback: T | null): T | null {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

const ALL_PLANS = PLANS.map((p) => p.id) as Plan[];

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode | null>(null);
  const [plan, setPlanState] = useState<Plan>("free");
  const [ready, setReady] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<Plan>("growth");

  useEffect(() => {
    // One-time read on mount; both updates are render-gated so there is no
    // visual flash.
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedPlan = readStored<Plan>(PLAN_KEY, ALL_PLANS, "free");
    setPlanState(storedPlan ?? "free");
    // Plans that unlock Business always open in Business mode - never
    // re-ask, never downgrade.
    if (storedPlan && BUSINESS_PLANS.includes(storedPlan)) {
      setModeState("business");
    }
    // Free and Pro default to the Simple workspace. The old "business"
    // preference no longer grants Business mode without a qualifying plan.
    else setModeState("simple");
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setMode = useCallback(
    (m: DashboardMode) => {
      if (m === "business") {
        if (!plan || !BUSINESS_PLANS.includes(plan)) {
          // Plan without Business access - gate it behind the upgrade.
          setUpgradeTarget("growth");
          setUpgradeOpen(true);
          return;
        }
      }
      try {
        localStorage.setItem(MODE_KEY, m);
      } catch {
        /* storage unavailable - applies for this session */
      }
      setModeState(m);
    },
    [plan]
  );

  const requestUpgrade = useCallback((planId?: Plan) => {
    setUpgradeTarget(planId ?? "growth");
    setUpgradeOpen(true);
  }, []);
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), []);

  const activatePlan = useCallback((planId: Plan) => {
    const def = planDef(planId);
    try {
      localStorage.setItem(PLAN_KEY, planId);
      localStorage.setItem(MODE_KEY, def.mode);
    } catch {
      /* storage unavailable - applies for this session */
    }
    setPlanState(planId);
    setModeState(def.mode);
    setUpgradeOpen(false);
  }, []);

  const switchToFree = useCallback(() => {
    try {
      localStorage.setItem(PLAN_KEY, "free");
      localStorage.setItem(MODE_KEY, "simple");
    } catch {
      /* storage unavailable - applies for this session */
    }
    setPlanState("free");
    setModeState("simple");
    setUpgradeOpen(false);
  }, []);

  const value = useMemo<DisplayModeContextValue>(
    () => ({
      mode,
      ready,
      setMode,
      plan,
      upgradeOpen,
      requestUpgrade,
      closeUpgrade,
      upgradeTarget,
      activatePlan,
      switchToFree,
      aiMessageLimit: planDef(plan).aiMessages,
      canUseGmail: planDef(plan).gmail,
    }),
    [mode, ready, setMode, plan, upgradeOpen, requestUpgrade, closeUpgrade, upgradeTarget, activatePlan, switchToFree]
  );

  return (
    <DisplayModeContext.Provider value={value}>
      <div data-mode={mode ?? undefined} className="h-full min-h-0">
        {children}
      </div>
      {upgradeOpen && <UpgradeOverlay />}
    </DisplayModeContext.Provider>
  );
}

function UpgradeOverlay() {
  const { closeUpgrade, activatePlan, plan, upgradeTarget } = useDisplayMode();
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Plan>(upgradeTarget);

  const paypalConfigured = !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const selectedDef = planDef(selected);
  const selectedPlanId = paypalPlanId(selected);
  const canPay = paypalConfigured && !!selectedPlanId;

  /** The buyer approved a PayPal subscription. Only enable the plan after
      the server has confirmed with PayPal that it is real and ACTIVE. */
  const handlePayPalSuccess = useCallback(
    async (subscriptionId: string) => {
      setVerifying(true);
      setVerifyError(null);
      try {
        const res = await fetch("/api/paypal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscriptionId }),
        });
        const data = (await res.json().catch(() => null)) as {
          active?: boolean;
          plan?: Plan;
          error?: string;
        } | null;
        if (res.ok && data?.active && data.plan) {
          try {
            localStorage.setItem(SUBSCRIPTION_KEY, subscriptionId);
          } catch {
            /* storage unavailable - plan applies for this session */
          }
          activatePlan(data.plan);
          return;
        }
        if (res.status >= 500) {
          setVerifyError(
            "We couldn't verify your subscription right now. If this keeps happening, contact support."
          );
          return;
        }
        setVerifyError(
          data?.error ?? "We couldn't verify your subscription with PayPal. Try again in a moment."
        );
      } catch {
        setVerifyError("We couldn't reach the payment service. Check your connection and try again.");
      } finally {
        setVerifying(false);
      }
    },
    [activatePlan]
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-line-strong bg-surface p-6 shadow-2xl shadow-black/60">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Upgrade your plan</p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-fg">
          {selectedDef.name} · {selectedDef.price}
          <span className="text-[13px] font-normal text-muted"> {selectedDef.cadence}</span>
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {UPGRADE_PLANS.map((id) => {
            const def = planDef(id);
            const active = selected === id;
            return (
              <button
                key={id}
                onClick={() => setSelected(id)}
                aria-pressed={active}
                className={`flex items-start gap-3 rounded-lg border p-3.5 text-left transition-all ${
                  active
                    ? "border-line-strong bg-white/[0.06]"
                    : "border-line bg-canvas hover:border-line-strong hover:bg-hover"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5 text-[13.5px] font-semibold text-fg">
                    {def.name}
                    <span className="text-[11px] font-medium text-zinc-400">
                      {def.price}
                      {def.cadence !== "forever" && def.cadence !== "one-time" ? def.cadence : ""}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-relaxed text-muted">
                    {def.features.slice(0, 2).join(" · ")}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          {selectedDef.blurb}
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {selectedDef.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12px] text-zinc-300">
              <span className="mt-[6px] size-1 shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
              {f}
            </li>
          ))}
        </ul>

        {selected === "team" ? (
          <a
            href="mailto:sales@noma.app?subject=Team%20plan"
            className="mt-5 flex h-10 w-full items-center justify-center rounded-md bg-white text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            Talk to sales
          </a>
        ) : canPay ? (
          <PayPalSubscribe planId={selectedPlanId as string} onSuccess={handlePayPalSuccess} />
        ) : (
          <div className="mt-5 rounded-md border border-line bg-canvas px-4 py-3 text-center">
            <p className="text-[12.5px] font-medium text-fg">Billing isn&apos;t connected for this plan yet</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
              This plan will be available to subscribe to once its PayPal plan is
              connected. Check back shortly.
            </p>
          </div>
        )}
        {verifying && (
          <p className="mt-3 text-center text-[11px] tracking-tight text-muted">
            Verifying your subscription with PayPal…
          </p>
        )}
        {verifyError && (
          <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-400">
            {verifyError}
          </p>
        )}
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-zinc-500">
          {canPay
            ? `Subscribe for ${selectedDef.price}${selectedDef.cadence.startsWith("/") ? selectedDef.cadence : ""} - billed securely by PayPal. You can cancel anytime.`
            : "Paid plans unlock through a verified PayPal subscription."}
          {plan === "free" && " You can switch back to Free anytime."}
        </p>
        <button
          onClick={closeUpgrade}
          className="mt-2 flex h-9 w-full items-center justify-center rounded-md border border-line text-[12.5px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          {plan === "free" ? "Stay on Free" : "Keep my current plan"}
        </button>
      </div>
    </div>
  );
}

export function useDisplayMode(): DisplayModeContextValue {
  return useContext(DisplayModeContext);
}
