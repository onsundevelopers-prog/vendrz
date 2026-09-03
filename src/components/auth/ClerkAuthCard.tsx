"use client";

/* ------------------------------------------------------------------ */
/*  Clerk auth card - loaded lazily via next/dynamic from /auth.       */
/*                                                                     */
/*  Everything that touches @clerk/nextjs lives here so the auth       */
/*  page's shell (brand panel, header, logo) renders and hydrates      */
/*  before any Clerk JavaScript is downloaded. The page shows a        */
/*  skeleton in this slot while the widget chunk + clerk-js boot.      */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { SignIn, SignUp, useUser } from "@clerk/nextjs";
import {
  getSession,
  transferSessionToAccount,
  unlockAuditSessionToUser,
  getAuditSession,
  claimOrphanedSessions,
} from "@/lib/store";

function AuthHeader({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="text-center lg:text-left">
      <h2 className="text-[26px] font-semibold leading-[1.1] tracking-[-0.03em] text-fg">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h2>
      <p className="mt-2 text-[14px] leading-[1.5] tracking-[-0.01em] text-muted">
        {mode === "signup"
          ? "Save analyses, track renewals, and get alerts before deadlines slip."
          : "Log in to your workspace."}
      </p>
    </div>
  );
}

/* Loading skeleton shown under the heading while clerk-js downloads and
   boots (~2-4s on a cold load). Without it the card looks like an empty
   void between the heading and the widget, which reads as "broken". */
function WidgetSkeleton() {
  return (
    <div className="mt-6 w-full" aria-hidden="true">
      <div className="h-11 w-full rounded-md bg-white/[0.05]" />
      <div className="mt-3 h-11 w-full rounded-md bg-white/[0.05]" />
      <div className="mt-4 h-11 w-full rounded-md bg-white/[0.08]" />
      <div className="mt-4 flex items-center gap-3">
        <div className="h-4 flex-1 rounded-md bg-white/[0.04]" />
        <div className="h-4 w-24 rounded-md bg-white/[0.04]" />
      </div>
    </div>
  );
}

/* Shown only if the Clerk widget has not become ready after a generous
   timeout. A silent void below the heading is indistinguishable from a
   broken page; this turns it into an actionable recovery path. Stale
   Clerk session cookies from an older Clerk instance/domain are the most
   common cause - the reset button clears them server-side (no incognito
   needed) and reloads so clerk-js boots clean. */
function StuckBox({ onRetry }: { onRetry: () => void }) {
  const [resetting, setResetting] = useState(false);
  const resetAuth = async () => {
    setResetting(true);
    try {
      await fetch("/api/auth/clear", { method: "POST" });
    } catch {
      // The reload below still starts fresh even if the clear call failed.
    }
    window.location.reload();
  };
  return (
    <div className="mt-6 rounded-xl border border-coral/30 bg-coral/10 p-4 text-center sm:p-5">
      <p className="text-[13.5px] font-medium text-fg">
        The sign-in form is taking a while to load
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">
        This usually means your browser is holding a stale sign-in cookie from
        an older version of the app, or an extension is blocking the sign-in
        scripts.
      </p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          onClick={onRetry}
          className="inline-flex h-8 items-center rounded-full bg-white px-4 text-[13px] font-[510] tracking-[-0.011em] text-black transition-colors hover:bg-bone"
        >
          Refresh page
        </button>
        <button
          onClick={() => void resetAuth()}
          disabled={resetting}
          className="inline-flex h-8 items-center rounded-full border border-line px-4 text-[13px] font-[510] tracking-[-0.011em] text-fg transition-colors hover:bg-white/[0.05] disabled:opacity-50"
        >
          {resetting ? "Resetting…" : "Reset sign-in state"}
        </button>
      </div>
      <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">
        Reset clears this site&apos;s stored sign-in cookies - your data is safe and
        you&apos;ll sign back in normally.
      </p>
    </div>
  );
}

function SessionBanner({
  sessionId,
  mode,
}: {
  sessionId: string | null;
  mode: "login" | "signup";
}) {
  const session = useMemo(
    () => (sessionId ? getSession(sessionId) : null),
    [sessionId]
  );
  if (!session?.result || mode !== "signup") return null;
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-zinc-400" />
      <div>
        <p className="text-[13px] font-semibold text-fg">Don&apos;t lose this analysis</p>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-zinc-400">
          Your scan of <span className="font-medium text-fg">{session.documentName}</span> will be
          transferred to your new account the moment you sign up.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Clerk mode - hosted components styled to match n4ma.               */
/* ------------------------------------------------------------------ */

const clerkAppearance = {
  elements: {
    // Pure black card and inputs - no grey surfaces in the Clerk flow.
    card: "rounded-xl border border-line bg-black p-6 sm:p-7",
    header: "hidden",
    formButtonPrimary:
      "h-11 rounded-md bg-acid text-sm font-[510] text-[#08090a] hover:bg-[#ececef] shadow-none",
    socialButtonsBlockButton:
      "h-11 rounded-md border border-line bg-black text-sm font-normal text-muted hover:bg-white/[0.05]",
    socialButtonsBlockButtonText: "text-muted font-normal",
    socialButtonsIconButton:
      "h-11 rounded-md border border-line bg-black hover:bg-white/[0.05]",
    dividerLine: "bg-line",
    dividerText: "text-[11px] tracking-[-0.01em] text-ash",
    formFieldLabel: "text-[12px] font-[510] text-faint",
    formFieldInput:
      "h-11 rounded-md border border-line bg-black text-[14px] text-fg transition-colors focus:border-muted",
    formFieldInputPlaceholder: "text-ash",
    footerActionLink: "font-[510] text-muted hover:text-fg",
    footerActionText: "text-[12.5px] text-faint",
    footer: "text-center text-[12.5px] text-faint",
    formFieldError: "text-[12px] text-coral",
    alert: "rounded-md border border-line bg-black text-faint",
    alertText: "text-faint",
    identityPreviewText: "text-fg",
    identityPreviewEditButton: "text-faint",
  },
  variables: {
    colorPrimary: "#e4e4e7",
    colorForeground: "#ffffff",
    colorMuted: "#d0d6e0",
    colorMutedForeground: "#8a8f98",
    colorBackground: "#08090a",
    colorInput: "#0f1011",
    colorInputForeground: "#ffffff",
    colorBorder: "#23252a",
    borderRadius: "0.375rem",
  },
};

export function ClerkAuthCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default to sign-in so a bare /auth link (e.g. from a pricing plan)
  // shows the Clerk auth page; account creation is one click away inside it.
  const mode = searchParams.get("mode") === "signup" ? "signup" : "login";
  const sessionId = searchParams.get("session");
  const next = searchParams.get("next") ?? "/dashboard";

  const { isLoaded, user } = useUser();

  // If the Clerk widget has not become ready after ~12s (clerk-js blocked,
  // stale cached bundle, ad blocker), swap the skeleton for the recovery box.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => setStuck(true), 12000);
    return () => clearTimeout(t);
  }, [isLoaded]);

  // Once signed in: claim any anonymous session, then head to `next`.
  useEffect(() => {
    if (!isLoaded || !user) return;
    if (sessionId) {
      // A document-analysis session (upload flow) transfers to the account.
      const session = getSession(sessionId);
      if (session && !session.transferredToUserId) {
        transferSessionToAccount(sessionId, user.id);
      }
      // A free review (audit flow) is unlocked for the account too.
      const audit = getAuditSession(sessionId);
      if (audit && audit.unlockedToUserId !== user.id) {
        unlockAuditSessionToUser(sessionId, user.id);
      }
    } else {
      // No specific session in the URL: still bind any anonymous uploads on
      // this device so a logged-out upload followed by a normal sign-in is
      // not lost in the user's new workspace.
      claimOrphanedSessions(user.id);
    }
    router.replace(next);
  }, [isLoaded, user, sessionId, next, router]);

  const afterAuth = sessionId
    ? `/auth?mode=${mode}&session=${sessionId}&next=${encodeURIComponent(next)}`
    : next;

  const toggleParams = sessionId ? `&session=${sessionId}` : "";

  // Signed-in visitor: the claim + redirect effect above fires immediately -  
  // render nothing rather than flashing the sign-in form for a frame. The   
  // server page usually catches this case first, but this covers direct     
  // navigation to /auth?session=... where the transfer must run client-side.
  if (isLoaded && user) return null;

  return (
    <>
      <SessionBanner sessionId={sessionId} mode={mode} />
      <AuthHeader mode={mode} />
      {isLoaded ? (
        <div className="mt-6">
          {mode === "signup" ? (
            <SignUp
              routing="hash"
              signInUrl={`/auth?mode=login${toggleParams}`}
              fallbackRedirectUrl={afterAuth}
              appearance={clerkAppearance}
            />
          ) : (
            <SignIn
              routing="hash"
              signUpUrl={`/auth?mode=signup${toggleParams}`}
              fallbackRedirectUrl={afterAuth}
              appearance={clerkAppearance}
            />
          )}
        </div>
      ) : stuck ? (
        <StuckBox onRetry={() => window.location.reload()} />
      ) : (
        <WidgetSkeleton />
      )}
    </>
  );
}
