"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getDiscovery, getGmailConnection, markImported, runDiscovery } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import type { DiscoveredDocument } from "@/lib/types";

export default function GmailDiscoveryPage() {
  const router = useRouter();
  const auth = useAuthUser();
  const userId = auth.id ?? "";
  const connection = getGmailConnection(userId);
  const [docs, setDocs] = useState<DiscoveredDocument[]>(() =>
    userId ? getDiscovery(userId) : []
  );
  const [scanning, setScanning] = useState(() => {
    if (!userId) return false;
    return getDiscovery(userId).length === 0;
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [prevUserId, setPrevUserId] = useState<string>(userId);

  // Keep the list in sync if the active account changes - adjust state during
  // render instead of in an effect (avoids the set-state-in-effect cascade).
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    const existing = userId ? getDiscovery(userId) : [];
    setDocs(existing);
    setScanning(existing.length === 0);
  }

  const refresh = () => {
    if (!userId) return;
    setScanning(true);
    setTimeout(() => {
      setDocs(runDiscovery(userId));
      setScanning(false);
    }, 1200);
  };

  // When nothing is cached, run the initial scan. Only async setState happens
  // here (inside the timeout callback), so this doesn't cascade renders.
  useEffect(() => {
    if (!userId || !scanning) return;
    const id = setTimeout(() => {
      setDocs(runDiscovery(userId));
      setScanning(false);
    }, 1200);
    return () => clearTimeout(id);
  }, [userId, scanning]);

  if (!connection) {
    return (
      <div className="py-20 text-center">
        <p className="text-[15px] text-muted">Gmail isn&apos;t connected.</p>
        <Button href="/dashboard/gmail" className="mt-4">
          Connect Gmail
        </Button>
      </div>
    );
  }

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const importSelected = () => {
    if (!userId || selected.size === 0) return;
    setImporting(true);
    setTimeout(() => {
      markImported(userId, Array.from(selected));
      router.push("/dashboard/contracts");
    }, 900);
  };

  const contractCount = docs.filter((d) => d.appearsToBeContract).length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[12px] tracking-tight text-muted">
            {docs.length} candidates · {contractCount} look like contracts · nothing imported yet
          </p>
          <h2 className="mt-1 text-xl font-semibold leading-[1.05] tracking-[-0.035em] text-fg">
            Review discovered documents
          </h2>
          <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-muted">
            Vendrz searched for contract-signal keywords and attachments. Check the
            documents you want analyzed - only your selections enter the pipeline.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" onClick={refresh} disabled={scanning}>
            {scanning && <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-transparent" />}
            Rescan
          </Button>
          <Button
            onClick={importSelected}
            disabled={selected.size === 0 || importing}
          >
            {importing ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-black/30 border-t-black" />
                Importing…
              </>
            ) : (
              `Import selected (${selected.size})`
            )}
          </Button>
        </div>
      </motion.div>

      {scanning && (
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-surface py-16">
          <span className="size-5 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
          <p className="text-[14px] text-muted">Scanning for contract-signal emails…</p>
        </div>
      )}

      {!scanning && docs.length === 0 && (
        <div className="rounded-2xl border border-line bg-surface py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-line bg-white/[0.03] text-[15px] font-semibold text-muted">0</span>
          <p className="mt-3 text-[15px] font-medium text-fg">No candidates found</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted/70">
            Try rescanning, or upload the contract manually from your desktop.
          </p>
          <Button href="/upload" className="mt-5" variant="outline">
            Upload manually
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {docs.map((doc, i) => {
          const isSel = selected.has(doc.id);
          const isContract = doc.appearsToBeContract;
          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              onClick={() => toggle(doc.id)}
              className={`flex cursor-pointer items-start gap-4 rounded-2xl border border-line bg-surface p-4 transition-all ${
                isSel
                  ? "border-white/60 ring-1 ring-white/40"
                  : "hover:border-white/15"
              }`}
            >
              {/* checkbox */}
              <div
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                  isSel ? "border-white bg-white text-black" : "border-white/15 bg-white/[0.04]"
                }`}
              >
                {isSel && <span aria-hidden="true" className="block h-[7px] w-[10px] rotate-45 border-b-2 border-r-2 border-black" />}
              </div>

              {/* icon */}
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  isContract ? "bg-white/[0.1] text-fg" : "bg-white/[0.05] text-muted"
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {(doc.filename.split(".").pop() ?? "doc").slice(0, 4)}
                </span>
              </div>

              {/* content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-[14px] font-semibold text-fg">{doc.filename}</p>
                  {isContract && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium tracking-tight text-fg">
                      <span className="size-1 rounded-full bg-zinc-200" /> Contract
                    </span>
                  )}
                  {!isContract && (
                    <span className="rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium tracking-tight text-muted">
                      Probably not a contract
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[13px] text-muted">{doc.emailSubject}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] tracking-tight text-muted/70">
                  <span>From: <span className="text-muted">{doc.sender}</span></span>
                  <span>{new Date(doc.emailDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  <span>Vendor: <span className="text-muted">{doc.detectedVendor}</span></span>
                  <span>Type: <span className="text-muted">{doc.documentType}</span></span>
                  <span>confidence {Math.round(doc.confidence * 100)}%</span>
                </div>
              </div>

              {doc.imported && (
                <span className="shrink-0 rounded-full border border-line bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium tracking-tight text-muted">
                  Imported
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      <p className="text-[12px] text-muted/70">
        Imported documents flow through the exact same analysis pipeline as manual uploads.
        Your manual-upload workflow is unaffected whether or not you use this.
        <Link href="/dashboard/settings" className="ml-1 text-muted underline underline-offset-4 hover:text-fg">
          Disconnect anytime
        </Link>
      </p>
    </div>
  );
}
