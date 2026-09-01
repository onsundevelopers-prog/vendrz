"use client";

/* ------------------------------------------------------------------ */
/*  Clerk auth card - loaded lazily via next/dynamic from /auth.       */
/*                                                                     */
/*  Everything that touches @clerk/nextjs lives here so the auth       */
/*  page's shell (brand panel, header, logo) renders and hydrates      */
/*  before any Clerk JavaScript is downloaded. The page shows a        */
/*  skeleton in this slot while the widget chunk + clerk-js boot.      */
/* ------------------------------------------------------------------ */

import { useEffect, useMemo } from "react";
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

  return (
    <>
      <SessionBanner sessionId={sessionId} mode={mode} />
      <AuthHeader mode={mode} />
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
    </>
  );
}
