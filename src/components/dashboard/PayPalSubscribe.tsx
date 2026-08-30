"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  PayPal subscription button.                                       */
/*                                                                     */
/*  Loads the PayPal JS SDK with `vault=true&intent=subscription`,     */
/*  renders the subscribe button for the given plan id, and calls      */
/*  `onSuccess` once the buyer approves the subscription.              */
/*                                                                     */
/*  Covers every paid tier: Team ($20/mo) and Business ($999 setup     */
/*  fee then $1/yr - the price structure lives in the PayPal plan).    */
/*                                                                     */
/*  Env:                                                               */
/*    NEXT_PUBLIC_PAYPAL_CLIENT_ID - PayPal app client id (public)     */
/* ------------------------------------------------------------------ */

interface PayPalActions {
  subscription: {
    create: (options: { plan_id: string }) => Promise<string>;
  };
}

interface PayPalButtonsConfig {
  style?: {
    shape?: string;
    color?: string;
    layout?: string;
    label?: string;
  };
  createSubscription: (data: unknown, actions: PayPalActions) => Promise<string>;
  onApprove: (data: { subscriptionID: string }, actions: unknown) => void;
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

export function PayPalSubscribe({
  planId,
  onSuccess,
}: {
  planId: string;
  onSuccess: (subscriptionId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef<string | null>(null);
  // SDK state changes only from async script callbacks, never synchronously
  // inside an effect body.
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const configured = !!(clientId && planId);
  const ready =
    configured && (typeof window !== "undefined" ? !!window.paypal || sdkLoaded : false);

  // Load the SDK once (skipped when PayPal isn't configured or already on
  // the page - both states are derived at render time). Re-loads when the
  // plan changes by re-rendering the button.
  useEffect(() => {
    if (!configured || window.paypal) return;
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&vault=true&intent=subscription`;
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
  }, [configured, clientId, planId]);

  // Render the button once the SDK is ready. If the plan changes, force a
  // re-render so the button points at the newly selected plan.
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    if (renderedRef.current === planId) return;
    renderedRef.current = planId;
    // Clear any stale button before re-rendering.
    const host = containerRef.current;
    host.replaceChildren();
    window.paypal
      ?.Buttons({
        style: { shape: "rect", color: "gold", layout: "vertical", label: "subscribe" },
        createSubscription: (_data, actions) =>
          actions.subscription.create({ plan_id: planId as string }),
        onApprove: (data) => onSuccess(data.subscriptionID),
        onError: () => {
          setSdkError("Payment didn't complete. You can try again.");
        },
      })
      .render(host)
      .catch(() => {
        setSdkError("Couldn't render the PayPal button.");
      });
  }, [ready, planId, onSuccess]);

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
          Loading PayPal…  </div>
      )}
    </div>
  );
}