"use client";

/* ------------------------------------------------------------------ */
/*  Dashboard plan + display mode.                                    */
/*                                                                     */
/*  Access model (no payment processor):                              */
/*    - Every new account gets a 30-day Team Plus trial, auto-started */
/*      server-side on first sign-in (never client-side, never        */
/*      restartable).                                                 */
/*    - When the trial expires the user drops to Free and is shown a  */
/*      Team Plus upgrade screen: $250 CAD one-time via e-transfer,   */
/*      arranged by email.                                            */
/*    - Once the founder confirms the transfer, /api/entitlement      */
/*      grants Team Plus permanently (paid).                          */
/*    - Business / Enterprise are sales-led tiers (contact email).    */
/*                                                                     */
/*  The plan gates features:                                           */
/*    - display mode: Free uses the Simple workspace; Team Plus        */
/*      (trial or paid), Business and Enterprise unlock the dense     */
/*      Business workspace.                                           */
/*    - sections: Free locks Vendors, Contracts, Renewals, Risk,       */
/*      Activity and Savings; all are included with Team Plus.         */
/*    - AI messages: Free 5 / Team Plus+ unlimited, counted per       */
/*      calendar month.                                               */
/*    - Gmail/Drive/Slack: Free is excluded; Team Plus+ can connect.  */
/*                                                                     */
/*  Server truth lives at /api/plan (see lib/entitlement.ts) - the    */
/*  browser only ever applies the state the server resolved, so       */
/*  localStorage edits cannot extend a trial or grant a plan.         */
/* ------------------------------------------------------------------ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isClerkEnabled } from "@/lib/auth";
import { SUPPORT_EMAIL } from "@/lib/site";

export type DashboardMode = "simple" | "business";
export type Plan = "free" | "team" | "business" | "enterprise";
/** Server-side access state (see lib/entitlement.ts). */
export type EntitlementKind = "none" | "trial" | "paid" | "expired";

export interface PlanDef {
  id: Plan;
  name: string;
  /** Short price label, e.g. "$250" */
  price: string;
  /** Cadence label, e.g. "/month" or "CAD · one-time" */
  cadence: string;
  blurb: string;
  features: string[];
  /** Which display mode this plan unlocks. */
  mode: DashboardMode;
  /** Monthly AI message allowance; Infinity = unlimited. */
  aiMessages: number;
  /** Whether the plan can connect Gmail. */
  gmail: boolean;
  /** How this plan is acquired. */
  purchase: "trial" | "e-transfer" | "sales";
}

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Try Team Plus free for 30 days - no credit card.",
    features: [
      "30-day Team Plus trial on signup",
      "Manual contract upload & analysis",
      "What needs attention, at a glance",
      "5 AI messages per month",
      "1 evaluation import from Google Drive or Slack",
    ],
    mode: "simple",
    aiMessages: 5,
    gmail: false,
    purchase: "trial",
  },
  {
    id: "team",
    name: "Team Plus",
    price: "$250",
    cadence: "CAD · one-time",
    blurb: "Every finding, forever - one payment, no subscription.",
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
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
    purchase: "e-transfer",
  },
  {
    id: "business",
    name: "Business",
    price: "Custom",
    cadence: "sales",
    blurb: "Continuously monitor spending and identify opportunities to reduce costs.",
    features: [
      "Team members, roles & permissions",
      "Advanced automations",
      "Priority AI processing",
      "Dedicated support",
    ],
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
    purchase: "sales",
  },
  {
    id: "enterprise",
    name: "Enterprise Scale",
    price: "Custom",
    cadence: "pricing",
    blurb: "Build n4ma into your organization's financial and procurement workflows.",
    features: [
      "Custom onboarding & migration",
      "Dedicated success manager",
      "Custom contracts & SLA",
      "Advanced governance & audit",
    ],
    mode: "business",
    aiMessages: Infinity,
    gmail: true,
    purchase: "sales",
  },
];

export const PLAN_MAP = Object.fromEntries(PLANS.map((p) => [p.id, p])) as Record<
  Plan,
  PlanDef
>;

export function planDef(plan: Plan): PlanDef {
  return PLAN_MAP[plan] ?? PLAN_MAP.free;
}

/** Plans that unlock the dense Business workspace. */
const BUSINESS_PLANS: readonly Plan[] = ["team", "business", "enterprise"];
/** Plans shown in the upgrade picker. */
const UPGRADE_PLANS: readonly Plan[] = ["team", "business", "enterprise"];

/**
 * Workspace sections that a given plan does NOT include, shown as locked
 * with an "included with Team Plus" note (never populated for the account).
 * Free keeps Home / AI / Settings / Import open but locks Vendors,
 * Contracts, Renewals, Risk, Activity and Savings behind Team Plus.
 * Business additionally gates Renewals / Risk / Savings to Team Plus.
 */
export const PLAN_LOCKED_SECTIONS: Record<Plan, string[]> = {
  free: ["companies", "contracts", "renewals", "risks", "activity", "savings"],
  team: [],
  business: ["renewals", "risks", "savings"],
  enterprise: [],
};

const MODE_KEY = "vendrz.displayMode";
const PLAN_KEY = "vendrz.plan";

interface DisplayModeContextValue {
  /** Effective mode. Free always reads "simple"; Team Plus, Business and
      Enterprise always read "business". Null only before the stored state
      has been read. */
  mode: DashboardMode | null;
  /** True once the stored preference has been read from localStorage. */
  ready: boolean;
  /** Switch mode. "business" on a plan that doesn't unlock it opens the
      upgrade screen instead of switching. */
  setMode: (m: DashboardMode) => void;
  /** The account's plan. */
  plan: Plan;
  /** Server-resolved access state: null before the server has answered. */
  entitlement: EntitlementKind | null;
  /** Trial end (ISO) when on trial; null otherwise. */
  trialEndsAt: string | null;
  /** Whole days of trial remaining as resolved by the server. */
  trialDaysLeft: number;
  /** Re-fetch access from /api/plan (used after a manual upgrade). */
  refreshEntitlement: () => Promise<void>;
  /** True while the upgrade overlay is visible. */
  upgradeOpen: boolean;
  /** Open the upgrade screen, pre-selecting a plan. */
  requestUpgrade: (planId?: Plan) => void;
  closeUpgrade: () => void;
  /** The plan pre-selected in the upgrade screen. */
  upgradeTarget: Plan;
  /** Enable a paid plan after the server has granted it (redeem etc.). */
  activatePlan: (planId: Plan) => void;
  /** Switch to the free plan (only allowed for non-granted accounts). */
  switchToFree: () => void;
  /** Monthly AI message allowance for the current plan. */
  aiMessageLimit: number;
  /** Whether the current plan can connect Gmail. */
  canUseGmail: boolean;
  /** Sections locked out of the current plan. */
  lockedSections: string[];
}

const DisplayModeContext = createContext<DisplayModeContextValue>({
  mode: null,
  ready: false,
  setMode: () => {},
  plan: "free",
  entitlement: null,
  trialEndsAt: null,
  trialDaysLeft: 0,
  refreshEntitlement: async () => {},
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

interface ServerEntitlement {
  plan: string;
  active: boolean;
  verified: boolean;
  entitlement?: EntitlementKind;
  tier?: string | null;
  trialStartedAt?: string | null;
  trialEndsAt?: string | null;
  daysLeft?: number;
  paidAt?: string | null;
}

/** Apply a server-resolved plan id to the local state (mirrors activatePlan). */
function planFromServer(serverPlan: string | undefined | null, current: Plan): Plan {
  const id = ALL_PLANS.find((p) => p === serverPlan);
  return id ?? current;
}

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode | null>(null);
  const [plan, setPlanState] = useState<Plan>("free");
  const [entitlement, setEntitlement] = useState<EntitlementKind | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
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
    } else setModeState("simple");
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  /** Ask the server for the truth and apply it. Server-only authority. */
  const refreshEntitlement = useCallback(async (): Promise<void> => {
    if (!isClerkEnabled) return;
    try {
      const res = await fetch("/api/plan");
      if (!res.ok) return; // 503 etc. - keep current state, never downgrade on a blip
      const data = (await res.json()) as ServerEntitlement;
      setEntitlement(data.entitlement ?? (data.active ? "paid" : "none"));
      setTrialEndsAt(data.trialEndsAt ?? null);
      setTrialDaysLeft(data.daysLeft ?? 0);

      const next = planFromServer(data.active ? data.plan : "free", plan);
      const def = planDef(next);
      try {
        localStorage.setItem(PLAN_KEY, next);
        localStorage.setItem(MODE_KEY, def.mode);
      } catch {
        /* storage unavailable - applies for this session */
      }
      setPlanState(next);
      setModeState(def.mode);
    } catch {
      /* offline or server unreachable - keep the local state */
    }
  }, [plan]);

  useEffect(() => {
    // Server-side access reconciliation (Clerk mode only). The trial and
    // paid state are bound to the Clerk account by /api/plan, so on every
    // load we ask the server for the truth and apply it - access follows
    // the user across browsers and devices, and expired trials are revoked
    // even after a serverless restart. Local edits can never extend it.
    if (!isClerkEnabled) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time server
       reconciliation on mount; the setState calls run in promise callbacks,
       never synchronously. */
    void refreshEntitlement();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [refreshEntitlement]);

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
    // A granted plan is paid (or redeemed) - the entitlement UI follows.
    setEntitlement("paid");
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
    setEntitlement("none");
    setUpgradeOpen(false);
  }, []);

  const value = useMemo<DisplayModeContextValue>(
    () => ({
      mode,
      ready,
      setMode,
      plan,
      entitlement,
      trialEndsAt,
      trialDaysLeft,
      refreshEntitlement,
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
    [
      mode,
      ready,
      setMode,
      plan,
      entitlement,
      trialEndsAt,
      trialDaysLeft,
      refreshEntitlement,
      upgradeOpen,
      requestUpgrade,
      closeUpgrade,
      upgradeTarget,
      activatePlan,
      switchToFree,
    ]
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

/* ------------------------------------------------------------------ */
/*  Purchase email (manual e-transfer flow).                          */
/* ------------------------------------------------------------------ */

const PURCHASE_SUBJECT = "Team Plus purchase - $250 CAD one-time";
const PURCHASE_BODY = [
  "Hi,",
  "",
  "I'd like to purchase Team Plus for my n4ma workspace.",
  "",
  "Plan: Team Plus - $250 CAD one-time (e-transfer)",
  "Account email: <your account email>",
  "",
  "Please send the e-transfer details and I'll arrange payment.",
].join("\n");

/** mailto: href that opens the user's email client pre-filled. */
export function purchaseMailto(): string {
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    PURCHASE_SUBJECT
  )}&body=${encodeURIComponent(PURCHASE_BODY)}`;
}

export function salesMailto(plan: Plan): string {
  const isEnterprise = plan === "enterprise";
  const subject = isEnterprise ? "Enterprise plan enquiry" : "Business plan enquiry";
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

function UpgradeOverlay() {
  const {
    closeUpgrade,
    plan,
    upgradeTarget,
    entitlement,
    trialDaysLeft,
    refreshEntitlement,
  } = useDisplayMode();
  const [selected, setSelected] = useState<Plan>(upgradeTarget);
  const [refreshing, setRefreshing] = useState(false);

  const selectedDef = planDef(selected);
  const trialEnded = entitlement === "expired";

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshEntitlement();
      closeUpgrade();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="border-sheen w-full max-w-2xl rounded-xl border border-line-strong bg-surface p-6 shadow-2xl shadow-black/60">
        <p className="text-[10.5px] font-semibold tracking-[-0.01em] text-muted">
          {trialEnded ? "Trial ended" : "Upgrade your plan"}
        </p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-fg">
          {selectedDef.name} · {selectedDef.price}
          <span className="text-[13px] font-normal text-muted">
            {" "}
            {selectedDef.cadence}
          </span>
        </h2>

        {trialEnded && (
          <p className="mt-3 rounded-lg border border-line bg-canvas px-4 py-3 text-[12.5px] leading-relaxed text-muted">
            Your 30-day Team Plus trial has ended. Upgrade to keep Team Plus
            features.
          </p>
        )}
        {entitlement === "trial" && selected === "team" && (
          <p className="mt-3 rounded-lg border border-line bg-canvas px-4 py-3 text-[12.5px] leading-relaxed text-muted">
            You&apos;re on the 30-day Team Plus trial — {trialDaysLeft} day
            {trialDaysLeft === 1 ? "" : "s"} left. You can purchase now; Team
            Plus simply continues when the trial ends.
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                      {def.cadence !== "forever" ? ` ${def.cadence}` : ""}
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
          /* Team Plus - manual e-transfer purchase, no payment processor */
          <div className="mt-5">
            <a
              href={purchaseMailto()}
              className="flex h-10 w-full items-center justify-center rounded-md bg-white text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
            >
              Email to purchase Team Plus
            </a>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[11.5px] leading-relaxed text-zinc-500">
              <li>Tap the button — it opens your email client pre-filled.</li>
              <li>Send the request; we&apos;ll reply with e-transfer details.</li>
              <li>
                Pay <span className="text-zinc-300">$250 CAD</span> once by e-transfer.
              </li>
              <li>
                Team Plus is enabled permanently once the transfer is confirmed.
              </li>
            </ol>
            <button
              onClick={() => void onRefresh()}
              disabled={refreshing}
              className="mt-3 flex h-8 w-full items-center justify-center rounded-md border border-line text-[11.5px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg disabled:opacity-50"
            >
              {refreshing ? "Checking…" : "Already paid? Refresh my access"}
            </button>
          </div>
        ) : (
          <a
            href={salesMailto(selected)}
            className="mt-5 flex h-10 w-full items-center justify-center rounded-md bg-white text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            Contact us about {selectedDef.name}
          </a>
        )}

        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-zinc-500">
          No subscription. No automatic charges. Payment is a one-time e-transfer,
          arranged by email.
          {plan === "free" && !trialEnded && " You can switch back to Free anytime."}
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
