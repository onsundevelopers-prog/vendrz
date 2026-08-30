"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  PayPal button.                                                     */
/*                                                                     */
/*  Two payment modes:                                                 */
/*    - subscription: recurring plan (Team) - uses the PayPal          */
/*      subscription SDK with a plan id.                               */
/*    - order: one-time purchase (Business $999) - creates an order    */
/*      server-side, opens PayPal's approval flow, then captures on    */
/*      approval. The capture response carries the granted plan.       */
/*                                                                     */
/*  Env:                                                               */
/*    NEXT_PUBLIC_PAYPAL_CLIENT_ID - PayPal app client id (public)     */
/* ------------------------------------------------------------------ */

interface PayPalSubscriptionActions {
  subscription: {
    create: (options: { plan_id: string }) => Promise<string>;
  };
}

interface PayPalOrderActions {
  order: {
    create: (options: Record<string, never>) => Promise<string>;
  };
}

interface PayPalButtonsConfig {
  style?: {
    shape?: string;
    color?: string;
    layout?: string;
    label?: string;
  };
  createSubscription?: (data: unknown, actions: PayPalSubscriptionActions) => Promise<string>;
  createOrder?: (data: unknown, actions: PayPalOrderActions) => Promise<string>;
  onApprove: (data: { subscriptionID?: string; orderID?: string }, actions: unknown) => void;
  onError?: (err: unknown) => void;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: PayPalButtonsConfig) => {
        render: (container: string | HTMLElement) => Promise<void>;
      };
    };
  }
}

export type PayPalMode = "subscription" | "order";

export interface PayPalSuccess {
  /** Present for subscription mode - the recurring subscription id. */
  subscriptionId?: string;
  /** Present for order mode - the captured one-time order id. */
  orderId?: string;
  /** Present for order mode - server response after capture. */
  plan?: string;
  active?: boolean;
  error?: string;
}

export function PayPalSubscribe({
  planId,
  mode = "subscription",
  onSuccess,
}: {
  /** Required in subscription mode; ignored for one-time orders. */
  planId?: string;
  mode?: PayPalMode;
  onSuccess: (payload: PayPalSuccess) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef<string | null>(null);
  // SDK state changes only from async script callbacks, never synchronously
  // inside an effect body.
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const configured = mode === "order" ? !!clientId : !!(clientId && planId);
  const ready =
    configured && (typeof window !== "undefined" ? !!window.paypal || sdkLoaded : false);

  // Load the SDK once (skipped when PayPal isn't configured or already on
  // the page - both states are derived at render time). Re-loads when the
  // payment mode/plan changes by re-rendering the button.
  useEffect(() => {
    if (!configured || window.paypal) return;
    const script = document.createElement("script");
    // Subscriptions need the vault (billing-agreement) SDK; one-time orders
    // use intent=capture without vaulting.
    const sdkParams =
      mode === "order"
        ? `client-id=${clientId}&intent=capture`
        : `client-id=${clientId}&vault=true&intent=subscription`;
    script.src = `https://www.paypal.com/sdk/js?${sdkParams}`;
    script.setAttribute("data-sdk-integration-source", "button-factory");
    script.async = true;
    script.onload = () => setSdkLoaded(true);
    script.onerror = () => {
      setSdkError("Couldn't load PayPal. Check your connection and try again.");
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [configured, clientId, planId, mode]);

  // Render the button once the SDK is ready. If the mode/plan changes, force
  // a re-render so the button points at the newly selected plan.
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const key = `${mode}:${planId ?? ""}`;
    if (renderedRef.current === key) return;
    renderedRef.current = key;
    // Clear any stale button before re-rendering.
    const host = containerRef.current;
    host.replaceChildren();

    if (mode === "subscription") {
      window.paypal
        ?.Buttons({
          style: { shape: "rect", color: "gold", layout: "vertical", label: "subscribe" },
          createSubscription: (_data, actions) =>
            actions.subscription.create({ plan_id: planId as string }),
          onApprove: (data) => onSuccess({ subscriptionId: data.subscriptionID }),
          onError: () => {
            setSdkError("Payment didn't complete. You can try again.");
          },
        })
        .render(host)
        .catch(() => {
          setSdkError("Couldn't render the PayPal button.");
        });
      return;
    }

    // One-time order: create server-side, approve with PayPal, then capture.
    window.paypal
      ?.Buttons({
        style: { shape: "rect", color: "gold", layout: "vertical", label: "pay" },
        createOrder: async () => {
          const res = await fetch("/api/paypal/order", { method: "POST" });
          const data = (await res.json().catch(() => null)) as { id?: string; error?: string } | null;
          if (!res.ok || !data?.id) {
            throw new Error(data?.error ?? "Couldn't start the checkout.");
          }
          return data.id;
        },
        onApprove: async (data) => {
          try {
            const res = await fetch("/api/paypal/order/capture", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const result = (await res.json().catch(() => null)) as PayPalSuccess | null;
            onSuccess({ orderId: data.orderID, ...result });
          } catch {
            onSuccess({ orderId: data.orderID, error: "Couldn't complete the payment. Try again." });
          }
        },
        onError: () => {
          setSdkError("Payment didn't complete. You can try again.");
        },
      })
      .render(host)
      .catch(() => {
        setSdkError("Couldn't render the PayPal button.");
      });
  }, [ready, planId, mode, onSuccess]);

  return (
    <div className="mt-6">
      {!configured ? (
        <p className="text-center text-[11px] leading-relaxed text-zinc-400">
          PayPal isn&apos;t configured yet. Set the PayPal env vars and restart.
        </p>
      ) : ready ? (
        <div ref={containerRef} className="paypal-host w-full" />
      ) : sdkError ? (
        <p className="text-center text-[11px] leading-relaxed text-zinc-400">{sdkError}</p>
      ) : (
        <div className="flex h-10 w-full items-center justify-center rounded-md border border-white/15 text-[12.5px] text-muted">
          Loading PayPal…
        </div>
      )}
    </div>
  );
}
