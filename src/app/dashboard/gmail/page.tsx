"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { connectGmail, getGmailConnection } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function GmailConnectPage() {
  const router = useRouter();
  const auth = useAuthUser();
  const [connecting, setConnecting] = useState(false);
  const connection = getGmailConnection(auth.id ?? "");

  const connect = () => {
    if (!auth.id) return;
    setConnecting(true);
    // Simulated OAuth consent (identity already established at login - this
    // grants ONLY read-only Gmail scope, separately and explicitly).
    setTimeout(() => {
      connectGmail(auth.id as string);
      router.push("/dashboard/gmail/discovery");
    }, 1100);
  };

  if (connection) {
    return (
      <div className="mx-auto max-w-xl space-y-6 py-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-8"
        >
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
            <span aria-hidden="true" className="block h-[11px] w-[17px] rotate-45 border-b-[2.5px] border-r-[2.5px] border-emerald-400" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-[-0.02em] text-fg">
            Gmail connected
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            Connected {new Date(connection.connectedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            {" · "}read-only scope · nothing imported automatically
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button href="/dashboard/gmail/discovery">
              Review discovered documents
            </Button>
            <Button href="/dashboard/settings" variant="outline">
              Manage in Settings
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-2xl border border-line bg-surface shadow-glow"
      >
        {/* header - deliberately NOT styled like the login screen */}
        <div className="flex items-center gap-3 border-b border-line bg-panel px-6 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.06] ring-1 ring-white/10">
            <span className="text-[13px] font-semibold tracking-tight text-fg">G</span>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-fg">Connect Gmail</p>
            <p className="text-[12.5px] text-muted/70">Optional · read-only · you stay in control</p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full border border-line bg-white/[0.04] px-3 py-1 text-[11.5px] font-medium tracking-tight text-muted">
            Not a login
          </span>
        </div>

        <div className="space-y-6 p-6">
          <p className="text-[14.5px] leading-relaxed text-muted">
            Vendrz will <strong>search</strong> your inbox for emails that look like
            vendor contracts - renewal notices, agreements, order forms - and{" "}
            <strong>propose them as candidates</strong>. Nothing is imported until you
            review the list and explicitly select documents.
          </p>

          {/* what will happen / what won't */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-emerald-300">
                <span aria-hidden="true" className="block h-[8px] w-[12px] rotate-45 border-b-2 border-r-2 border-emerald-400" />
                What we will do
              </p>
              <ul className="mt-2.5 space-y-2 text-[13px] text-emerald-300/80">
                <li>Search for contract-signal keywords &amp; PDF/DOCX attachments</li>
                <li>Read matching messages to detect vendors &amp; document type</li>
                <li>Show you a reviewable candidate list</li>
              </ul>
            </div>
            <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-4">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-red-400">
                <span className="text-[16px] leading-none text-red-400">×</span>
                What we will never do
              </p>
              <ul className="mt-2.5 space-y-2 text-[13px] text-red-400/80">
                <li>Send, modify, delete, or label any email</li>
                <li>Auto-import anything without your selection</li>
                <li>Read your Google Drive, calendar, or contacts</li>
              </ul>
            </div>
          </div>

          {/* exact scope */}
          <div className="rounded-xl bg-white/[0.03] p-4">
            <p className="text-[12px] font-medium tracking-tight text-muted">
              Exact permission requested at the Google consent screen
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="rounded-lg border border-line bg-white/[0.04] px-3 py-1.5 text-[12px] tracking-tight text-fg">
                gmail.readonly
              </span>
              <span className="rounded-lg border border-line bg-white/[0.04] px-3 py-1.5 text-[12px] tracking-tight text-fg">
                gmail.metadata
              </span>
            </div>
            <p className="mt-2.5 text-[12px] leading-relaxed text-muted/70">
              Read-only, minimum-scope access. Disconnecting at any time stops all future
              discovery and never affects your ability to log in or use the dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-muted/70">
              You can connect, use, and disconnect this integration anytime.
            </p>
            <div className="flex gap-2.5">
              <Button href="/dashboard" variant="ghost">
                Not now
              </Button>
              <Button onClick={connect} disabled={connecting} className="min-w-[180px]">
                {connecting ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                    Opening consent…
                  </>
                ) : (
                  "Connect Gmail"
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="mt-4 text-center text-[12.5px] text-muted/70">
        <Link href="/dashboard" className="text-muted underline underline-offset-4 hover:text-fg">
          Skip - I&apos;ll keep uploading contracts manually
        </Link>
      </p>
    </div>
  );
}
