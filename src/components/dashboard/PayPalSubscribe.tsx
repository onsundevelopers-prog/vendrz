"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  PayPal subscription button (Business plan).                        */
/*                                                                     */
/*  Loads the PayPal JS SDK with `vault=true&intent=subscription`,     */
/*  renders the subscribe button for the Business plan id, and calls   */
/*  `onSuccess` once the buyer approves the subscription.              */
/*                                                                     */
/*  Env:                                                                */
/*    NEXT_PUBLIC_PAYPAL_CLIENT_ID - PayPal app client id (public)     */
/*    NEXT_PUBLIC_PAYPAL_PLAN_ID    - the subscription plan id         */
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

export function PayPalSubscribe({ onSuccess }: { onSuccess: (subscriptionId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);
  // SDK state changes only from async script callbacks, never synchronously
  // inside an effect body.
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  const planId = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID;
  const configured = !!(clientId && planId);
  const ready =
    configured && (typeof window !== "undefined" ? !!window.paypal || sdkLoaded : false);

  // Load the SDK once (skipped when PayPal isn't configured or already on
  // the page - both states are derived at render time).
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

  // Render the button once the SDK is ready.
  useEffect(() => {
    if (!ready || !containerRef.current || renderedRef.current) return;
    renderedRef.current = true;
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
      .render(containerRef.current)
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
        <div ref={containerRef} className="w-full" />
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
