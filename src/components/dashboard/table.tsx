"use client";

import { ArrowDown, ArrowUp, Search, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Dense workspace table primitives (Bloomberg-density, Linear-style) */
/* ------------------------------------------------------------------ */

export type SortState = { key: string; dir: 1 | -1 } | null;

export function toggleSort(cur: SortState, key: string): SortState {
  if (cur?.key === key) return { key, dir: cur.dir === 1 ? -1 : 1 };
  return { key, dir: 1 };
}

export function sorted<T>(rows: T[], sort: SortState, val: (r: T) => string | number): T[] {
  if (!sort) return rows;
  return [...rows].sort((a, b) => {
    const x = val(a);
    const y = val(b);
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
  });
}

/* ------------------------------ header row ------------------------------ */

export function Th({
  label,
  align = "left",
  width,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  align?: "left" | "right";
  width?: number;
  sort?: SortState;
  onSort?: (key: string) => void;
  className?: string;
}) {
  const active = sort?.key === label;
  return (
    <th style={{ width }} className={align === "right" ? "text-right" : ""}>
      {onSort ? (
        <button
          onClick={() => onSort(label)}
          className={`inline-flex items-center gap-1 transition-colors hover:text-zinc-200 ${active ? "!text-zinc-200" : ""} ${
            align === "right" ? "flex-row-reverse" : ""
          }`}
        >
          {label}
          {active && (sort!.dir === 1 ? <ArrowUp size={10} /> : <ArrowDown size={10} />)}
        </button>
      ) : (
        <span className={className}>{label}</span>
      )}
    </th>
  );
}

/* ------------------------------ toolbar row ------------------------------ */

export function ToolbarRow({
  title,
  meta,
  right,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <span className="text-[13px] font-medium text-fg">{title}</span>
      {meta && <span className="text-[11px] text-muted">{meta}</span>}
      <div className="ml-auto flex items-center gap-2">{right}</div>
    </div>
  );
}

export function SearchRow({
  value,
  onChange,
  placeholder,
  right,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-2 border-b border-line/60 px-4">
      <Search size={12} className="text-muted/60" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "Search…"}
        className="h-6 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-zinc-600"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="text-muted/60 hover:text-fg"
          aria-label="Clear search"
        >
          <X size={12} />
        </button>
      )}
      {right}
    </div>
  );
}

/* ------------------------------ footer ------------------------------ */

export function TableFooter({
  left,
  right,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-4 border-t border-line bg-surface px-4 text-[11px] text-zinc-500">
      {left}
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}
