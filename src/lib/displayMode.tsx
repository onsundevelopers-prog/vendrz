"use client";

/* ------------------------------------------------------------------ */
/*  Dashboard plan + display mode.                                    */
/*                                                                     */
/*  noma has two tiers:                                              */
/*    - Simple (free)    - the essentials, at a glance                */
/*    - Business ($200/mo) - the full operational workspace            */
/*                                                                     */
/*  The plan is the gate. Business mode is only reachable on the       */
/*  Business plan; a free user who asks for Business gets the upgrade  */
/*  screen instead (rendered by this provider as a full overlay).      */
/*  Business accounts are automatically given Business mode on every   */
/*  visit - they never see the chooser again.                          */
/*                                                                     */
/*  Once enabled, Business stays on indefinitely: there is no periodic */
/*  re-verification and no automatic downgrade, so a cancelled or      */
/*  expired PayPal subscription can never silently revoke access.      */
/*  The choice persists in localStorage.                               */
/* ------------------------------------------------------------------ */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PayPalSubscribe } from "@/components/dashboard/PayPalSubscribe";

export type DashboardMode = "simple" | "business";
export type Plan = "free" | "business";

export const BUSINESS_PRICE = "$200/month";

const MODE_KEY = "vendrz.displayMode";
const PLAN_KEY = "vendrz.plan";
const SUBSCRIPTION_KEY = "vendrz.subscription";

interface DisplayModeContextValue {
  /** Effective mode. Null only before the user has chosen (free plan) -
      the Overview shows the chooser. Business accounts always read
      "business". */
  mode: DashboardMode | null;
  /** True once the stored preference has been read from localStorage. */
  ready: boolean;
  /** Switch mode. "business" on a free account opens the upgrade
      screen instead of switching. */
  setMode: (m: DashboardMode) => void;
  /** The account's plan gate. */
  plan: Plan;
  /** True while the upgrade overlay is visible. */
  upgradeOpen: boolean;
  requestUpgrade: () => void;
  closeUpgrade: () => void;
  /** Enable the Business plan (called from the upgrade screen). */
  startBusiness: () => void;
  /** Switch to the free Simple plan. */
  switchToFree: () => void;
}

const DisplayModeContext = createContext<DisplayModeContextValue>({
  mode: null,
  ready: false,
  setMode: () => {},
  plan: "free",
  upgradeOpen: false,
  requestUpgrade: () => {},
  closeUpgrade: () => {},
  startBusiness: () => {},
  switchToFree: () => {},
});

function readStored<T extends string>(key: string, allowed: T[], fallback: T | null): T | null {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DashboardMode | null>(null);
  const [plan, setPlanState] = useState<Plan>("free");
  const [ready, setReady] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    // One-time read on mount; both updates are render-gated so there is no
    // visual flash (the same pattern the previous implementation used).
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedPlan = readStored<Plan>(PLAN_KEY, ["free", "business"], "free");
    const storedMode = readStored<DashboardMode>(MODE_KEY, ["simple", "business"], null);
    setPlanState(storedPlan ?? "free");
    // Business accounts always get Business - never re-ask, never downgrade.
    // Once the plan is enabled it stays enabled indefinitely: no periodic
    // PayPal re-verification, so a cancellation/expiry webhook or a network
    // blip can never silently revoke access.
    if (storedPlan === "business") {
      setModeState("business");
    }
    // Free accounts keep their chosen density, but the old "business"
    // preference no longer applies without the plan - they re-choose once.
    else if (storedMode === "simple") setModeState("simple");
    else setModeState(null);
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setMode = useCallback(
    (m: DashboardMode) => {
      if (m === "business") {
        if (plan !== "business") {
          // Free account asking for Business - gate it behind the upgrade.
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

  const requestUpgrade = useCallback(() => setUpgradeOpen(true), []);
  const closeUpgrade = useCallback(() => setUpgradeOpen(false), []);

  const startBusiness = useCallback(() => {
    try {
      localStorage.setItem(PLAN_KEY, "business");
      localStorage.setItem(MODE_KEY, "business");
    } catch {
      /* storage unavailable - applies for this session */
    }
    setPlanState("business");
    setModeState("business");
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
      startBusiness,
      switchToFree,
    }),
    [mode, ready, setMode, plan, upgradeOpen, requestUpgrade, closeUpgrade, startBusiness, switchToFree]
  );

  return (
    <DisplayModeContext.Provider value={value}>
      <div data-mode={mode ?? undefined} className="h-full min-h-0">
        {children}
      </div>
      {/* The upgrade overlay covers the whole workspace when a free user
          asks for Business. */}
      {upgradeOpen && <UpgradeOverlay />}
    </DisplayModeContext.Provider>
  );
}

function UpgradeOverlay() {
  const { closeUpgrade, startBusiness, plan } = useDisplayMode();
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  // Business is paid-only: it unlocks through a verified PayPal subscription
  // and through nothing else. When PayPal isn't configured there is no way to
  // enable it, so free users can never toggle themselves into the paid plan.
  const paypalConfigured =
    !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
    !!process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;

  /** The buyer approved a PayPal subscription. Only enable Business after
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
          error?: string;
        } | null;
        if (res.ok && data?.active) {
          try {
            localStorage.setItem(SUBSCRIPTION_KEY, subscriptionId);
          } catch {
            /* storage unavailable - plan applies for this session */
          }
          startBusiness();
          return;
        }
        if (res.status >= 500) {
          // Server-side trouble (e.g. PayPal credentials misconfigured). The
          // details stay in the server logs; the user gets a clean message.
          setVerifyError(
            "We couldn't verify your subscription right now. If this keeps happening, contact support."
          );
          return;
        }
        setVerifyError(
          data?.error ??
            "We couldn't verify your subscription with PayPal. Try again in a moment."
        );
      } catch {
        setVerifyError(
          "We couldn't reach the payment service. Check your connection and try again."
        );
      } finally {
        setVerifying(false);
      }
    },
    [startBusiness]
  );
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-line-strong bg-surface p-6 shadow-2xl shadow-black/60">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-muted">Business plan</p>
        <h2 className="mt-2 text-[22px] font-semibold tracking-tight text-fg">
          {BUSINESS_PRICE}
        </h2>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          The full operational workspace: every contract term, dense editor
          tables with sorting, filters, pagination and a schema view, the
          complete activity log, and the Business dashboard.
        </p>
        <ul className="mt-4 space-y-1.5">
          {[
            "Full contract, renewal, risk and savings tables",
            "Sorting, filters, pagination and schema view",
            "Complete activity log with filters",
            "Business dashboard with exposure and escalation detail",
          ].map((p) => (
            <li key={p} className="flex items-start gap-2 text-[12.5px] text-zinc-300">
              <span className="mt-[7px] size-1 shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
              {p}
            </li>
          ))}
        </ul>
        {paypalConfigured ? (
          <PayPalSubscribe onSuccess={handlePayPalSuccess} />
        ) : (
          <div className="mt-6 rounded-md border border-line bg-canvas px-4 py-3 text-center">
            <p className="text-[12.5px] font-medium text-fg">Billing isn&apos;t connected yet</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500">
              Business requires the paid plan and can&apos;t be enabled for free.
              Check back once payments are live.
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
          {paypalConfigured
            ? `Subscribe to Business for ${BUSINESS_PRICE} - billed securely by PayPal. You can cancel anytime.`
            : "Business requires the paid plan - it can&apos;t be enabled for free."}
          {plan === "free" && " You can switch back to Simple anytime."}
        </p>
        <button
          onClick={closeUpgrade}
          className="mt-2 flex h-9 w-full items-center justify-center rounded-md border border-line text-[12.5px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg"
        >
          Stay on Simple
        </button>
      </div>
    </div>
  );
}

export function useDisplayMode(): DisplayModeContextValue {
  return useContext(DisplayModeContext);
}
