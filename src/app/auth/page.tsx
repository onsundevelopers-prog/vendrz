"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { SignIn, SignUp, useUser } from "@clerk/nextjs";
import { GoogleIcon } from "@/components/brand/GoogleIcon";
import { getSession, transferSessionToAccount } from "@/lib/store";
import { createAccount } from "@/lib/store";
import { isClerkEnabled } from "@/lib/auth";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

const ease = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ */
/*  Shared shell                                                       */
/* ------------------------------------------------------------------ */

function AuthShell({
  mode,
  sessionId,
  children,
}: {
  mode: "login" | "signup";
  sessionId: string | null;
  children: React.ReactNode;
}) {
  const session = useMemo(
    () => (sessionId ? getSession(sessionId) : null),
    [sessionId]
  );

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-canvas px-5 py-16">
      <div className="bg-grid-dark absolute inset-0 opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease }}
        className="relative w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Link href="/">
            <Logo />
          </Link>
        </div>

        {session?.result && mode === "signup" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
            <div>
              <p className="text-[13.5px] font-semibold text-emerald-300">
                Don&apos;t lose this analysis
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-emerald-200/70">
                Your scan of{" "}
                <span className="font-medium">{session.documentName}</span>{" "}
                will be transferred to your new account the moment you sign up.
                Nothing re-runs, nothing is lost.
              </p>
            </div>
          </div>
        )}

        {children}

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[12px] tracking-tight text-muted">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          Signing in with Google only shares your identity — it never grants mailbox access.
        </p>
      </motion.div>
    </main>
  );
}

function AuthCardHeader({ mode }: { mode: "login" | "signup" }) {
  return (
    <>
      <h1 className="text-2xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-1.5 text-[13.5px] font-normal leading-[1.5] tracking-[-0.01em] text-muted">
        {mode === "signup"
          ? "Save analyses, monitor renewals, and get alerts before deadlines slip."
          : "Log in to your monitoring dashboard."}
      </p>
    </>
  );
}

const CARD = "rounded-2xl border border-line bg-surface p-7 shadow-glow";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium tracking-tight text-muted">{label}</span>
      {children}
    </label>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted">
        or with email
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`size-4 animate-spin rounded-full border-2 ${
        light ? "border-black/30 border-t-black" : "border-muted border-t-fg"
      }`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Clerk mode — hosted SignIn/SignUp components styled to match.      */
/* ------------------------------------------------------------------ */

const clerkAppearance = {
  elements: {
    card: CARD,
    header: "hidden",
    formButtonPrimary:
      "flex h-11 items-center justify-center rounded-full bg-white text-sm font-medium text-black hover:bg-zinc-200",
    socialButtonsBlockButton:
      "flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-white/[0.04] text-sm font-medium text-fg hover:bg-white/[0.08]",
    socialButtonsBlockButtonText: "text-fg font-medium",
    socialButtonsIconButton:
      "flex h-11 items-center justify-center rounded-full border border-line bg-white/[0.04] hover:bg-white/[0.08]",
    dividerLine: "bg-white/10",
    dividerText:
      "text-[11.5px] font-medium uppercase tracking-[0.1em] text-muted",
    formFieldLabel:
      "text-[12px] font-medium tracking-tight text-muted",
    formFieldInput:
      "h-11 w-full rounded-[10px] border border-white/10 bg-white/[0.04] px-3 text-[14px] text-fg outline-none transition-colors focus:border-emerald-400/60",
    formFieldInputPlaceholder: "text-zinc-600",
    footerActionLink: "font-medium text-emerald-400 hover:text-emerald-300",
    footerActionText: "text-[12.5px] tracking-tight text-muted",
    footer: "mt-5 text-center text-[12.5px] tracking-tight text-muted",
    formFieldError: "text-[12px] font-medium text-red-300",
    formFieldErrorText: "text-red-300",
    alert: "rounded-lg border border-red-500/25 bg-red-500/[0.08] text-red-300",
    alertText: "text-red-300",
    identityPreviewText: "text-fg",
    identityPreviewEditButton: "text-emerald-400",
  },
  variables: {
    colorPrimary: "#34d399",
    colorForeground: "#f4f4f5",
    colorMuted: "#a1a1aa",
    colorMutedForeground: "#a1a1aa",
    colorBackground: "#111115",
    colorInput: "rgba(255,255,255,0.04)",
    colorInputForeground: "#f4f4f5",
    colorBorder: "rgba(255,255,255,0.08)",
    borderRadius: "0.75rem",
  },
};

function ClerkAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "login" ? "login" : "signup";
  const sessionId = searchParams.get("session");
  const next = searchParams.get("next") ?? "/dashboard";

  const { isLoaded, user } = useUser();

  // Once signed in: claim any anonymous session, then head to `next`.
  useEffect(() => {
    if (!isLoaded || !user) return;
    if (sessionId) {
      const session = getSession(sessionId);
      if (session && !session.transferredToUserId) {
        transferSessionToAccount(sessionId, user.id);
      }
    }
    router.replace(next);
  }, [isLoaded, user, sessionId, next, router]);

  // Where Clerk sends the user after auth completes. When an anonymous
  // session is being claimed, land back here so the transfer effect above
  // runs, then it forwards to `next`.
  const afterAuth = sessionId
    ? `/auth?mode=${mode}&session=${sessionId}&next=${encodeURIComponent(next)}`
    : next;

  const toggleParams = sessionId ? `&session=${sessionId}` : "";

  return (
    <AuthShell mode={mode} sessionId={sessionId}>
      <AuthCardHeader mode={mode} />

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
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Legacy demo mode (no Clerk keys configured)                        */
/* ------------------------------------------------------------------ */

function LegacyAuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") === "login" ? "login" : "signup";
  const sessionId = searchParams.get("session");
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);

  const finish = (accountId: string) => {
    if (sessionId) transferSessionToAccount(sessionId, accountId);
    router.push(next);
  };

  const googleSignIn = () => {
    setBusy("google");
    setTimeout(() => {
      const account = createAccount("you@example.com", "You", "google");
      finish(account.id);
    }, 900);
  };

  const emailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setBusy("email");
    setTimeout(() => {
      const account = createAccount(email, name.trim() || email.split("@")[0], "email");
      finish(account.id);
    }, 700);
  };

  return (
    <AuthShell mode={mode} sessionId={sessionId}>
      <div className={CARD}>
        <AuthCardHeader mode={mode} />

        <Button
          variant="outline"
          className="mt-6 w-full"
          onClick={googleSignIn}
          disabled={busy !== null}
        >
          {busy === "google" ? <Spinner /> : <GoogleIcon className="size-4" />}
          {mode === "signup" ? "Continue with Google" : "Log in with Google"}
        </Button>

        <Divider />

        <form onSubmit={emailSignIn} className="space-y-4">
          {mode === "signup" && (
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Smith"
                className="auth-input"
              />
            </Field>
          )}
          <Field label="Email">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="auth-input pl-9"
              />
            </div>
          </Field>
          <Field label="Password">
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="auth-input pl-9"
              />
            </div>
          </Field>
          <button
            type="submit"
            disabled={busy !== null || !email.includes("@")}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy === "email" ? (
              <Spinner light />
            ) : mode === "signup" ? (
              "Create account"
            ) : (
              "Log in"
            )}
          </button>
        </form>

        <p className="mt-5 text-center text-[12.5px] tracking-tight text-muted">
          {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
          <Link
            href={`/auth?mode=${mode === "signup" ? "login" : "signup"}${sessionId ? `&session=${sessionId}` : ""}`}
            className="font-medium text-emerald-400 hover:text-emerald-300"
          >
            {mode === "signup" ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

/* ------------------------------------------------------------------ */

export default function AuthPage() {
  return (
    <Suspense>
      {isClerkEnabled ? <ClerkAuthPage /> : <LegacyAuthPage />}
    </Suspense>
  );
}
