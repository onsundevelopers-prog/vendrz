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

const TRUST_POINTS = [
  "Read-only access - we can never move money or touch your accounts",
  "Contracts encrypted in transit and at rest, never shared",
  "Renewal, risk and savings analysis with evidence for every finding",
];

/* ------------------------------------------------------------------ */
/*  Split shell - brand panel left, auth card right                    */
/* ------------------------------------------------------------------ */

function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between border-r border-line bg-[#0a0a0d] p-12 lg:flex">
        <Link href="/" aria-label="Noma home" className="w-fit">
          <Logo />
        </Link>

        <div>
          <h1 className="max-w-md text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.03em] text-fg">
            Every contract, in one place.
          </h1>
          <p className="mt-4 max-w-sm text-pretty text-[15px] leading-[1.6] tracking-[-0.01em] text-muted">
            Renewal deadlines, risk, exposure and savings - extracted from real
            documents and tracked in a single workspace.
          </p>
          <ul className="mt-9 space-y-4">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[13.5px] leading-relaxed text-muted">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="mt-[3px] shrink-0 text-zinc-400"
                  aria-hidden="true"
                >
                  <path d="M3 7.8 6 10.5l6-6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[12px] tracking-tight text-muted/50">
          © {new Date().getFullYear()} Noma
        </p>
      </div>

      {/* auth column */}
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease }}
          className="w-full max-w-[420px]"
        >
          <div className="mb-8 flex justify-center lg:hidden">
            <Link href="/" aria-label="Noma home">
              <Logo />
            </Link>
          </div>
          {children}
        </motion.div>
      </div>
    </main>
  );
}

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

function SessionBanner({ sessionId, mode }: { sessionId: string | null; mode: "login" | "signup" }) {
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
/*  Clerk mode - hosted components styled to match Noma.               */
/* ------------------------------------------------------------------ */

const clerkAppearance = {
  elements: {
    // Pure black card and inputs - no grey surfaces in the Clerk flow.
    card: "rounded-xl border border-white/15 bg-black p-6 sm:p-7",
    header: "hidden",
    formButtonPrimary:
      "h-11 rounded-full bg-white text-sm font-semibold text-black hover:bg-zinc-200 shadow-none",
    socialButtonsBlockButton:
      "h-11 rounded-full border border-white/15 bg-black text-sm font-medium text-white hover:bg-white/[0.08]",
    socialButtonsBlockButtonText: "text-white font-medium",
    socialButtonsIconButton:
      "h-11 rounded-full border border-white/15 bg-black hover:bg-white/[0.08]",
    dividerLine: "bg-white/15",
    dividerText: "text-[11px] uppercase tracking-[0.1em] text-zinc-300",
    formFieldLabel: "text-[12px] font-medium text-zinc-300",
    formFieldInput:
      "h-11 rounded-[10px] border border-white/15 bg-black text-[14px] text-white transition-colors focus:border-white/50",
    formFieldInputPlaceholder: "text-zinc-600",
    footerActionLink: "font-medium text-white hover:text-zinc-200",
    footerActionText: "text-[12.5px] text-zinc-400",
    footer: "text-center text-[12.5px] text-zinc-400",
    formFieldError: "text-[12px] text-zinc-200",
    alert: "rounded-lg border border-white/20 bg-black text-zinc-200",
    alertText: "text-zinc-200",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-zinc-300",
  },
  variables: {
    colorPrimary: "#ffffff",
    colorForeground: "#ffffff",
    colorMuted: "#d4d4d8",
    colorMutedForeground: "#d4d4d8",
    colorBackground: "#000000",
    colorInput: "#000000",
    colorInputForeground: "#ffffff",
    colorBorder: "rgba(255,255,255,0.18)",
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

  const afterAuth = sessionId
    ? `/auth?mode=${mode}&session=${sessionId}&next=${encodeURIComponent(next)}`
    : next;

  const toggleParams = sessionId ? `&session=${sessionId}` : "";

  return (
    <AuthSplit>
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
    </AuthSplit>
  );
}

/* ------------------------------------------------------------------ */
/*  Legacy demo mode (no Clerk keys configured)                        */
/* ------------------------------------------------------------------ */

const CARD = "rounded-xl border border-line bg-[#0d0d11] p-6 sm:p-7";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function Divider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-[11px] uppercase tracking-[0.1em] text-muted">or with email</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

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
    <AuthSplit>
      <SessionBanner sessionId={sessionId} mode={mode} />
      <AuthHeader mode={mode} />
      <div className="mt-6">
        <div className={CARD}>
          <Button
            variant="outline"
            className="mt-1 w-full"
            onClick={googleSignIn}
            disabled={busy !== null}
          >
            {busy === "google" ? (
              <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-fg" />
            ) : (
              <GoogleIcon className="size-4" />
            )}
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
              className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy === "email" ? (
                <span className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
              ) : mode === "signup" ? (
                "Create account"
              ) : (
                "Log in"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-[12.5px] text-muted">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <Link
              href={`/auth?mode=${mode === "signup" ? "login" : "signup"}${sessionId ? `&session=${sessionId}` : ""}`}
              className="font-medium text-zinc-300 hover:text-fg"
            >
              {mode === "signup" ? "Log in" : "Create an account"}
            </Link>
          </p>
        </div>
      </div>
    </AuthSplit>
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
