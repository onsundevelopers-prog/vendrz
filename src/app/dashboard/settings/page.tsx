"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { disconnectGmail, getGmailConnection } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const auth = useAuthUser();
  const connection = getGmailConnection(auth.id ?? "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const disconnect = () => {
    if (!auth.id) return;
    setBusy(true);
    setTimeout(() => {
      disconnectGmail(auth.id as string);
      setBusy(false);
      setConfirming(false);
    }, 700);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">Settings</h2>
        <p className="mt-1 text-[13.5px] text-muted">
          Account and connected services. Your login is never tied to any integration.
        </p>
      </motion.div>

      {/* account */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-line bg-surface p-6"
      >
        <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
          <span className="size-1.5 rounded-full bg-emerald-400/70" />
          Account
        </h3>
        <div className="mt-4 flex items-center gap-3.5">
          <div className="flex size-11 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold tracking-tight text-emerald-300">
            {(auth.name || "U")
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <p className="text-[14.5px] font-medium text-fg">{auth.name}</p>
            <p className="text-[13px] text-muted/70">{auth.email}</p>
          </div>
          <span className="ml-auto inline-flex items-center rounded-full border border-line bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-muted">
            {auth.providerLabel}
          </span>
        </div>
        <p className="mt-3 text-[12px] text-muted/70">
          Authentication provider is used for identity only — it grants no mailbox access.
        </p>
      </motion.section>

      {/* connected accounts */}
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-2xl border border-line bg-surface p-6"
      >
        <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-fg">
          <span className="size-1.5 rounded-full bg-emerald-400/70" />
          Connected accounts
        </h3>

        <div className="mt-4 rounded-xl border border-line p-4">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/[0.05]">
              <span className="text-[13px] font-semibold tracking-tight text-muted">G</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-fg">Gmail</p>
              <p className="text-[12.5px] text-muted/70">
                {connection ? (
                  <>
                    Connected {new Date(connection.connectedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    {" · "}
                    <span className="">gmail.readonly</span>
                  </>
                ) : (
                  "Not connected — optional contract discovery"
                )}
              </p>
            </div>
            {connection ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-medium text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400" /> Connected
              </span>
            ) : (
              <Button href="/dashboard/gmail" size="sm">
                Connect
              </Button>
            )}
          </div>

          {connection && (
            <div className="mt-4 border-t border-line pt-4">
              {confirming ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[13px] leading-relaxed text-muted">
                    Disconnect stops all future discovery and sync. Documents you already
                    imported, along with their analyses and monitoring, are kept unless
                    you delete them. Your login is unaffected.
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                      Keep connected
                    </Button>
                    <Button size="sm" variant="danger" onClick={disconnect} disabled={busy}>
                      {busy ? "Disconnecting…" : "Disconnect Gmail"}
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirming(true)}
                  className="inline-flex items-center text-[13px] font-medium text-red-400 transition-colors hover:text-red-300"
                >
                  Disconnect
                </button>
              )}
            </div>
          )}
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-muted/70">
          The integration is read-only, minimum-scope, and isolated from your core
          authentication. Connecting or disconnecting Gmail never affects your ability to
          log in or use any core feature.
        </p>
      </motion.section>
    </div>
  );
}
