"use client";

import { useMemo, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { getActivity } from "@/lib/store";
import { formatDate, formatTime, timeAgo } from "@/lib/format";
import type { ActivityRecord } from "@/lib/types";
import { WorkspaceEmpty } from "@/components/dashboard/panels";
import { DataTableEditor, type EditorColumn } from "@/components/dashboard/DataTableEditor";
import { Sparkles } from "lucide-react";
import { tableTabs } from "@/components/dashboard/tableTabs";

/* ------------------------------------------------------------------ */
/*  Activity - the workspace event log as a table editor.            */
/*  Chronological, dense, scannable. Real records only, with type and  */
/*  source filters in the toolbar.                                    */
/* ------------------------------------------------------------------ */

const TYPE_LABEL: Record<ActivityRecord["type"], string> = {
  alert: "Alert",
  import: "Import",
  review: "Review",
  email_sent: "Email sent",
  email_drafted: "Email drafted",
  cancellation: "Cancellation",
  status_change: "Status change",
  savings: "Savings",
};

const TYPE_TONE: Record<ActivityRecord["type"], string> = {
  alert: "text-zinc-100",
  import: "text-zinc-200",
  review: "text-zinc-300",
  email_sent: "text-zinc-200",
  email_drafted: "text-zinc-300",
  cancellation: "text-zinc-100",
  status_change: "text-zinc-300",
  savings: "text-zinc-200",
};

interface ActivityRow {
  id: string;
  record: ActivityRecord;
}

const isEvent = (type: ActivityRecord["type"]) =>
  type === "email_sent" || type === "status_change" || type === "cancellation" || type === "import";

const statusFor = (a: ActivityRecord) =>
  a.type === "alert" || a.type === "cancellation" ? "Attention" : "Recorded";

export default function ActivityPage() {
  const auth = useAuthUser();
  const userId = auth.id;
  const activity = useMemo(() => (userId ? getActivity(userId) : []), [userId]);
  const [type, setType] = useState<ActivityRecord["type"] | "all">("all");
  const [actor, setActor] = useState<string>("all");

  const actors = useMemo(() => [...new Set(activity.map((a) => a.actor))].sort(), [activity]);
  const scoped = activity.filter((a) => (type === "all" || a.type === type) && (actor === "all" || a.actor === actor));

  const rows: ActivityRow[] = useMemo(
    () => scoped.map((a) => ({ id: a.id, record: a })),
    [scoped]
  );

  const columns: EditorColumn<ActivityRow>[] = [
    {
      key: "date",
      label: "Date",
      type: "date",
      description: "Day the event was recorded.",
      render: (r) => (
        <span className="tabular-nums text-zinc-200">{formatDate(r.record.createdAt.slice(0, 10))}</span>
      ),
      value: (r) => r.record.createdAt,
    },
    {
      key: "time",
      label: "Time",
      type: "date",
      description: "Time the event was recorded.",
      render: (r) => <span className="tabular-nums text-zinc-400">{formatTime(r.record.createdAt)}</span>,
      value: (r) => formatTime(r.record.createdAt),
    },
    {
      key: "ago",
      label: "When",
      type: "text",
      description: "Relative time since the event.",
      render: (r) => <span className="text-[11px] text-zinc-500">{timeAgo(r.record.createdAt)}</span>,
      value: (r) => timeAgo(r.record.createdAt),
    },
    {
      key: "vendor",
      label: "Vendor",
      type: "text",
      description: "Vendor this event relates to.",
      render: (r) => (
        <span className="min-w-0 truncate text-[12px] font-medium text-fg">
          {r.record.vendorName || "—"}
        </span>
      ),
      value: (r) => (r.record.vendorName ?? "").toLowerCase(),
    },
    {
      key: "action",
      label: "Action",
      type: "chip",
      description: "Type of event that occurred.",
      render: (r) => (
        <span className={`text-[11.5px] font-medium ${TYPE_TONE[r.record.type]}`}>
          {TYPE_LABEL[r.record.type]}
        </span>
      ),
      value: (r) => TYPE_LABEL[r.record.type],
    },
    {
      key: "detail",
      label: "Detail",
      type: "text",
      description: "Human-readable description of the event.",
      render: (r) => (
        <span className="line-clamp-1 block whitespace-normal text-[11px] text-zinc-400">
          {r.record.title}
        </span>
      ),
      value: (r) => r.record.title.toLowerCase(),
    },
    {
      key: "by",
      label: "Changed By",
      type: "chip",
      description: "Who caused the event.",
      render: (r) => <span className="capitalize text-zinc-300">{r.record.actor}</span>,
      value: (r) => r.record.actor,
    },
    {
      key: "prev",
      label: "Previous Value",
      type: "text",
      description: "Value before the change, where recorded.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "next",
      label: "New Value",
      type: "text",
      description: "Value after the change, where recorded.",
      render: () => <span className="text-zinc-500">—</span>,
      value: () => "",
    },
    {
      key: "source",
      label: "Source",
      type: "chip",
      description: "Where the event originated.",
      render: (r) => (
        <span className="capitalize text-zinc-400">{r.record.actor === "agent" ? "AI" : r.record.actor}</span>
      ),
      value: (r) => r.record.actor,
    },
    {
      key: "status",
      label: "Status",
      type: "chip",
      description: "Current disposition of the event.",
      render: (r) => (
        <span className={isEvent(r.record.type) ? "text-zinc-300" : "text-zinc-500"}>
          {statusFor(r.record)}
        </span>
      ),
      value: (r) => statusFor(r.record),
    },
  ];

  const tables = tableTabs({
    active: "activity",
    activity: activity.length,
  });

  const toolbarRight = (
    <>
      <select
        value={type}
        onChange={(e) => setType(e.target.value as typeof type)}
        aria-label="Filter by type"
        className="h-7 cursor-pointer rounded-md border border-line bg-canvas px-2 text-[11.5px] text-muted outline-none hover:border-line-strong hover:text-fg focus:border-line-strong"
      >
        <option value="all">All types</option>
        {Object.entries(TYPE_LABEL).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
      <select
        value={actor}
        onChange={(e) => setActor(e.target.value)}
        aria-label="Filter by source"
        className="h-7 cursor-pointer rounded-md border border-line bg-canvas px-2 text-[11.5px] text-muted outline-none hover:border-line-strong hover:text-fg focus:border-line-strong"
      >
        <option value="all">All sources</option>
        {actors.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
    </>
  );

  if (activity.length === 0) {
    return (
      <div className="h-full">
        <WorkspaceEmpty
          title="No activity yet"
          body="Real events from the workspace will appear here - uploads, analyses, approvals and alerts."
        />
      </div>
    );
  }

  return (
    <DataTableEditor<ActivityRow>
      title="Activity"
      railLabel="Activity"
      description="workspace event log"
      icon={<Sparkles size={13} className="text-muted" />}
      columns={columns}
      rows={rows}
      defaultSort={{ key: "date", dir: -1 }}
      filter={(r, q) =>
        [r.record.title, r.record.vendorName ?? "", r.record.actor, TYPE_LABEL[r.record.type]]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase())
      }
      tables={tables}
      footerHint="Chronological record of workspace events"
      toolbarRight={toolbarRight}
    />
  );
}