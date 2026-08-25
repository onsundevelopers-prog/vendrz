"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getActivity } from "@/lib/store";
import { useAuthUser } from "@/lib/auth";
import { useNow } from "@/lib/useNow";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/dashboard/shared";
import { timeAgo } from "@/lib/format";
import type { ActivityActor, ActivityRecord, ActivityType } from "@/lib/types";

const TYPE_META: Record<ActivityType, { label: string; cls: string }> = {
  alert: { label: "Alert", cls: "chip-red" },
  import: { label: "Import", cls: "chip-neutral" },
  review: { label: "Review", cls: "chip-neutral" },
  email_sent: { label: "Email sent", cls: "chip-neutral" },
  email_drafted: { label: "Email drafted", cls: "chip-neutral" },
  cancellation: { label: "Cancellation", cls: "chip-neutral" },
  status_change: { label: "Status change", cls: "chip-neutral" },
  savings: { label: "Savings", cls: "chip-neutral" },
};

const ACTOR_META: Record<ActivityActor, { label: string; dot: string }> = {
  agent: { label: "Agent", dot: "bg-zinc-300" },
  user: { label: "User", dot: "bg-zinc-400" },
  system: { label: "System", dot: "bg-zinc-600" },
};

export default function ActivityPage() {
  const router = useRouter();
  const auth = useAuthUser();
  const activity = getActivity(auth.id ?? "demo");
  const now = useNow();

  const [type, setType] = useState<ActivityType | "all">("all");
  const [actor, setActor] = useState<ActivityActor | "all">("all");
  const [dateRange, setDateRange] = useState<"all" | "7d" | "30d">("30d");

  const rows = useMemo(() => {
    let list = activity;
    if (type !== "all") list = list.filter((a) => a.type === type);
    if (actor !== "all") list = list.filter((a) => a.actor === actor);
    if (dateRange !== "all") {
      const cutoff = now - (dateRange === "7d" ? 7 : 30) * 86400000;
      list = list.filter((a) => new Date(a.createdAt).getTime() >= cutoff);
    }
    return list;
  }, [activity, type, actor, dateRange, now]);

  const typeCounts = useMemo(() => {
    const c: Record<string, number> = { all: activity.length };
    for (const a of activity) c[a.type] = (c[a.type] ?? 0) + 1;
    return c;
  }, [activity]);

  const actorCounts = useMemo(() => {
    const c: Record<string, number> = { all: activity.length };
    for (const a of activity) c[a.actor] = (c[a.actor] ?? 0) + 1;
    return c;
  }, [activity]);

  const columns: Column<ActivityRecord>[] = useMemo(
    () => [
      {
        id: "type",
        label: "Type",
        width: 110,
        sortable: true,
        sortValue: (a) => a.type,
        filterValue: (a) => a.type,
        render: (a) => <span className={`chip ${TYPE_META[a.type].cls}`}>{TYPE_META[a.type].label}</span>,
      },
      {
        id: "actor",
        label: "Actor",
        width: 90,
        sortable: true,
        sortValue: (a) => a.actor,
        filterValue: (a) => a.actor,
        render: (a) => (
          <span className="flex items-center gap-1.5 text-[12px] text-fg/85">
            <span className={`status-dot ${ACTOR_META[a.actor].dot}`} />
            {ACTOR_META[a.actor].label}
          </span>
        ),
      },
      {
        id: "vendor",
        label: "Vendor",
        width: 130,
        sortable: true,
        sortValue: (a) => a.vendorName ?? "",
        filterValue: (a) => a.vendorName ?? "",
        render: (a) =>
          a.vendorName ? (
            <Link
              href={`/dashboard/vendors/${a.vendorId ?? ""}`}
              className="text-[12.5px] font-medium text-fg hover:underline"
            >
              {a.vendorName}
            </Link>
          ) : (
            <span className="text-[11.5px] text-muted/50">-</span>
          ),
      },
      {
        id: "event",
        label: "Event",
        width: 420,
        sortable: true,
        sortValue: (a) => a.title,
        render: (a) => (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] font-medium text-fg">{a.title}</p>
            <p className="truncate text-[11.5px] text-muted">{a.detail}</p>
          </div>
        ),
      },
      {
        id: "when",
        label: "When",
        width: 110,
        sortable: true,
        sortValue: (a) => a.createdAt,
        render: (a) => <span className="text-[12px] tabular-nums text-muted">{timeAgo(a.createdAt)}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activity"
        sub="Every action, import, alert, and agent operation across the workspace"
        actions={
          <div className="flex items-center gap-1.5">
            {(["7d", "30d", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`toolbar-btn ${dateRange === r ? "active" : ""}`}
              >
                {r === "all" ? "All time" : r}
              </button>
            ))}
          </div>
        }
      />

      <DataTable
        storageKey="activity"
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        defaultSort={{ id: "when", dir: "desc" }}
        searchKeys={(a) => [a.title, a.detail, a.vendorName ?? "", a.actor, a.type]}
        searchPlaceholder="Search activity…"
        toolbar={
          <>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ActivityType | "all")}
              className="toolbar-input"
            >
              <option value="all">All types ({typeCounts.all})</option>
              {(Object.keys(TYPE_META) as ActivityType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_META[t].label} ({typeCounts[t] ?? 0})
                </option>
              ))}
            </select>
            <select
              value={actor}
              onChange={(e) => setActor(e.target.value as ActivityActor | "all")}
              className="toolbar-input"
            >
              <option value="all">All actors ({actorCounts.all})</option>
              {(["agent", "user", "system"] as const).map((a) => (
                <option key={a} value={a}>
                  {ACTOR_META[a].label} ({actorCounts[a] ?? 0})
                </option>
              ))}
            </select>
          </>
        }
        rowActions={(a) => [
          ...(a.vendorId
            ? [
                {
                  label: "Open vendor",
                  onSelect: () => router.push(`/dashboard/vendors/${a.vendorId}`),
                },
              ]
            : []),
          { label: "Open alerts", onSelect: () => router.push("/dashboard/alerts") },
        ]}
      />
    </div>
  );
}
