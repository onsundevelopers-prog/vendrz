"use client";

/* ------------------------------------------------------------------ */
/*  Dashboard plan + display mode.                                    */
/*                                                                     */
/*  noma has four tiers:                                              */
/*    - Free ($0)        - Simple workspace, savings page, 5 AI msgs/mo */
/*    - Team ($20/mo)    - Business workspace, Gmail, unlimited AI      */
/*    - Business ($999 + $1/yr) - + team/roles, automations, support    */
/*    - Enterprise (custom) - everything, contact sales                 */
/*                                                                     */
/*  The plan gates features:                                           */
/*    - display mode: Free uses the Simple workspace; Team, Business   */
/*      and Enterprise unlock the dense Business workspace.            */
/*    - AI messages: Free 5 / paid tiers unlimited, counted per        */
/*      calendar month (see store.getAiUsage / incrementAiUsage).      */
/*    - Gmail: Free is excluded; every paid tier can connect.          */
/*                                                                     */
/*  Paid plans unlock through a verified PayPal subscription: Team is   */
/*  $20/month, Business is a $999 setup fee then a $1/year renewal.     */
/*  Both are verified with PayPal on load; a cancelled/expired          */
/*  subscription revokes access. Enterprise is custom-priced.           */
/* ------------------------------------------------------------------ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PayPalSubscribe } from "@/components/dashboard/PayPalSubscribe";
import { isClerkEnabled } from "@/lib/auth";

export type DashboardMode = "simple" | "business";
export type Plan = "free" | "team" | "business" | "enterprise";

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
    blurb: "For individuals just getting started with Noma.",
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
    id: "team",
    name: "Team",
    price: "$20",
    cadence: "/month",
    blurb: "For teams building a shared view of every contract and vendor.",
    features: [
      "Gmail integration - read vendor correspondence",
      "Renewal & cancellation-deadline alerts",
      "Price-increase detection & risk scoring",
      "Business workspace - dense tables, filters, schema view",
      "Complete activity log & Business dashboard",
      "Unlimited AI messages",
      "Export to CSV / PDF",
    ],
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$999",
    cadence: "then $1/yr",
    blurb: "For companies that need advanced features and administration. $999 upfront, then $1 per year to keep it.",
    features: [
      "Team members, roles & permissions",
      "Advanced automations",
      "Priority AI processing",
      "Dedicated support",
    ],
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
  },
  {
    id: "enterprise",
    name: "Enterprise Scale",
    price: "Custom",
    cadence: "pricing",
    blurb: "For organizations building scalable, flexible workflows with powerful governance.",
    features: [
      "Custom onboarding & migration",
      "Dedicated success manager",
      "Custom contracts & SLA",
      "Advanced governance & audit",
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
export const BUSINESS_PRICE = "$999 then $1/yr";

/** Plans that unlock the dense Business workspace. */
const BUSINESS_PLANS: readonly Plan[] = ["team", "business", "enterprise"];
/** Plans shown in the upgrade picker (all paid tiers; Enterprise is sales). */
const UPGRADE_PLANS: readonly Plan[] = ["team", "business", "enterprise"];

/**
 * Workspace sections that a given plan does NOT include. For the Business
 * plan, Renewals / Risk / Savings are gated to the Team plan: they are shown
 * as locked with an "included with Team" note, never populated. Free uses
 * the Simple view which still surfaces these as overview stats, so only the
 * Business tier locks the dedicated sections.
 */
export const PLAN_LOCKED_SECTIONS: Record<Plan, string[]> = {
  free: [],
  team: [],
  business: ["renewals", "risk", "savings"],  enterprise: [],
};

/** The PayPal plan id configured for a tier (undefined = not wired yet). */
export function paypalPlanId(plan: Plan): string | undefined {
  switch (plan) {
    case "team":
      return process.env.NEXT_PUBLIC_PAYPAL_PLAN_TEAM_ID?.trim() || undefined;
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
  /** Sections locked out of the current plan ("renewals", "risk", "savings"). */
  lockedSections: string[];
}

const DisplayModeContext = createContext<DisplayModeContextValue>({
  mode: null,
  ready: false,
  setMode: () => {},
  plan: "free",
  upgradeOpen: false,
  requestUpgrade: () => {},
  closeUpgrade: () => {},
  upgradeTarget: "team",
  activatePlan: () => {},
  switchToFree: () => {},
  aiMessageLimit: PLANS[0].aiMessages,
  canUseGmail: PLANS[0].gmail,
  lockedSections: PLAN_LOCKED_SECTIONS.free,
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
  const [upgradeTarget, setUpgradeTarget] = useState<Plan>("team");

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

    // Server-side plan reconciliation (Clerk mode only). The paid plan is
    // bound to the Clerk account by /api/paypal/verify, so on every load we
    // ask the server for the truth and apply it - paid status follows the
    // user across browsers and devices, and cancelled/expired subscriptions
    // are revoked even after a serverless restart.
    if (!isClerkEnabled) return;
    let localSub: string | null = null;
    try {
      localSub = localStorage.getItem(SUBSCRIPTION_KEY);
    } catch {
      /* storage unavailable */
    }
    const q = localSub ? `?subscriptionId=${encodeURIComponent(localSub)}` : "";
    fetch(`/api/plan${q}`)
      .then((res) => (res.ok ? (res.json() as Promise<ServerPlan>) : null))
      .then((data) => {
        if (!data) return;
        // Server confirmed a paid subscription -> apply it everywhere.
        if (data.active && data.plan && data.plan !== "free") {
          const def = planDef(data.plan as Plan);
          try {
            localStorage.setItem(PLAN_KEY, data.plan as string);
            localStorage.setItem(MODE_KEY, def.mode);
            if (data.subscriptionId) {
              localStorage.setItem(SUBSCRIPTION_KEY, data.subscriptionId);
            }
          } catch {
            /* storage unavailable - applies for this session */
          }
          setPlanState(data.plan as Plan);
          setModeState(def.mode);
          return;
        }
        // Server checked a known subscription and it is no longer active
        // (or doesn't exist) -> downgrade to Free.
        if (data.verified && !data.active && localSub) {
          try {
            localStorage.setItem(PLAN_KEY, "free");
            localStorage.setItem(MODE_KEY, "simple");
            localStorage.removeItem(SUBSCRIPTION_KEY);
          } catch {
            /* storage unavailable */
          }
          setPlanState("free");
          setModeState("simple");
        }
      })
      .catch(() => {
        // Offline or server unreachable - keep the local state.
      });
  }, []);

  const setMode = useCallback(
    (m: DashboardMode) => {
      if (m === "business") {
        if (!plan || !BUSINESS_PLANS.includes(plan)) {
          // Plan without Business access - gate it behind the upgrade.
          setUpgradeTarget("team");
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
    setUpgradeTarget(planId ?? "team");
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
      lockedSections: PLAN_LOCKED_SECTIONS[plan] ?? [],
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

  /** The buyer approved a PayPal subscription. Only enable the plan after the
      server has confirmed with PayPal that it is real and ACTIVE. */
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
      <div className="border-sheen w-full max-w-2xl rounded-xl border border-line-strong bg-surface p-6 shadow-2xl shadow-black/60">
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

        {selected === "enterprise" ? (
          <a
            href="mailto:sales@noma.app?subject=Enterprise%20plan"
            className="mt-5 flex h-10 w-full items-center justify-center rounded-md bg-white text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            Contact sales
          </a>
        ) : canPay ? (
          <PayPalSubscribe
            planId={selectedPlanId as string}
            onSuccess={handlePayPalSuccess}
          />
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
            ? `Subscribe for ${selectedDef.price}${selectedDef.cadence.startsWith("/") ? selectedDef.cadence : ` (${selectedDef.cadence})`} - billed securely by PayPal. You can cancel anytime.`
            : "Paid plans unlock through a verified PayPal subscription. You can cancel anytime."}
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

interface ServerPlan {
  plan: string;
  active: boolean;
  verified: boolean;
  subscriptionId?: string;
  status?: string;
}

export function useDisplayMode(): DisplayModeContextValue {
  return useContext(DisplayModeContext);
}
