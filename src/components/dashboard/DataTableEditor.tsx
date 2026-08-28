"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Copy,
  Database,
  Filter,
  Grid3x3,
  Hash,
  MoreHorizontal,
  Pilcrow,
  Plus,
  RefreshCw,
  Search,
  Table2,
  X,
} from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Supabase-style Table Editor (dark-adapted).                       */
/*  Recreates the reference table-editor anatomy within noma's dark  */
/*  terminal shell: a left "tables" rail, a tab bar with a close tab,  */
/*  a filter/ask-AI toolbar, a data grid whose header shows each       */
/*  column with a data-type badge + sort arrow, and a pagination       */
/*  footer with a Data / Definition toggle.                            */
/* ------------------------------------------------------------------ */

export type EditorColType =
  | "id"
  | "text"
  | "money"
  | "number"
  | "date"
  | "chip"
  | "custom";

export interface EditorColumn<T> {
  /** Column identity / sort key. */
  key: string;
  label: string;
  type: EditorColType;
  align?: "left" | "right";
  /** Shown in the Definition (schema) view. Falls back to the type label. */
  description?: string;
  /** Full-width renderer for cell content. */
  render: (row: T) => React.ReactNode;
  /** The raw comparable value for sorting (also used for filtering). */
  value: (row: T) => string | number;
}

export interface TableRowEntry {
  label: string;
  href: string;
  icon: React.ReactNode;
  selected: boolean;
  count?: number;
}

interface TypeMeta {
  badge: string;
  icon: React.ReactNode;
}

const TYPE_META: Record<EditorColType, TypeMeta> = {
  id: { badge: "int8", icon: <Hash size={11} /> },
  text: { badge: "text", icon: <Pilcrow size={11} /> },
  money: { badge: "numeric", icon: <CircleDollarSign size={11} /> },
  number: { badge: "numeric", icon: <Hash size={11} /> },
  date: { badge: "timestamptz", icon: <Clock size={11} /> },
  chip: { badge: "enum", icon: <Grid3x3 size={11} /> },
  custom: { badge: "jsonb", icon: <Copy size={11} /> },
};

/* ------------------------------------------------------------------ */
/*  Left "tables" rail                                                 */
/* ------------------------------------------------------------------ */

function TablesRail({ tables, label }: { tables: TableRowEntry[]; label: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(true);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-line bg-surface">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
        <span className="flex items-center gap-2 text-[12.5px] font-semibold text-fg">
          <Table2 size={14} className="text-muted" />
          {label}
        </span>
        <button
          aria-label="Toggle tables rail"
          title="Toggle tables rail"
          onClick={() => setOpen((v) => !v)}
          className="flex size-6 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
        >
          <ChevronDown size={13} className={open ? "rotate-180" : "-rotate-90"} />
        </button>
      </div>

      {open && (
        <>
          <div className="flex items-center gap-1.5 px-3 pb-1.5 pt-2.5">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-line px-2 py-1 text-[11px] text-muted">
              <Database size={11} className="opacity-70" />
              schema <span className="font-medium text-fg">public</span>
              <ChevronDown size={11} className="ml-auto opacity-60" />
            </span>
          </div>

          <button className="mx-3 flex h-7 items-center justify-center gap-1 rounded-md border border-line text-[12px] font-medium text-muted transition-colors hover:border-line-strong hover:text-fg">
            <Plus size={12} /> New table
          </button>

          <div className="mt-2 px-3">
            <label className="flex items-center gap-1.5 rounded-md border border-line bg-canvas px-2 py-1 focus-within:border-line-strong">
              <Search size={11} className="shrink-0 text-muted/60" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tables…"
                className="min-w-0 flex-1 bg-transparent text-[11.5px] text-fg outline-none placeholder:text-muted/60"
              />
              <Filter size={11} className="shrink-0 text-muted/50" />
            </label>
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {tables
              .filter((t) => t.label.toLowerCase().includes(query.toLowerCase()))
              .map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className={`mb-0.5 flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors ${
                    t.selected
                      ? "bg-active text-fg"
                      : "text-muted hover:bg-hover hover:text-fg"
                  }`}
                >
                  <span className="text-muted">{t.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{t.label}</span>
                  {typeof t.count === "number" && (
                    <span className="shrink-0 text-[10px] tabular-nums text-muted/60">{t.count}</span>
                  )}
                  <MoreHorizontal size={12} className="shrink-0 text-muted/60 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            {tables.filter((t) => t.label.toLowerCase().includes(query.toLowerCase())).length === 0 && (
              <p className="px-2 py-3 text-[11px] text-muted/60">No tables match.</p>
            )}
          </div>
        </>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Definition (schema) view - real column metadata                    */
/* ------------------------------------------------------------------ */

function DefinitionView<T>({
  title,
  columns,
  rowCount,
}: {
  title: string;
  columns: EditorColumn<T>[];
  rowCount: number;
}) {
  const typeLabel: Record<EditorColType, string> = {
    id: "Integer",
    text: "Text",
    money: "Numeric",
    number: "Numeric",
    date: "Timestamptz",
    chip: "Enum",
    custom: "Jsonb",
  };
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="border-b border-line/60 bg-float px-4 py-2">
        <p className="text-[12px] font-semibold text-fg">{title}</p>
        <p className="text-[10.5px] text-muted">
          {columns.length} columns · {rowCount} row{rowCount === 1 ? "" : "s"}
        </p>
      </div>
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-[2]">
          <tr>
            <th className="h-[34px] border-b border-line-strong bg-float px-4 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              Column
            </th>
            <th className="h-[34px] border-b border-line-strong bg-float px-4 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              Type
            </th>
            <th className="h-[34px] border-b border-line-strong bg-float px-4 text-left text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col) => {
            const meta = TYPE_META[col.type];
            return (
              <tr key={col.key} className="border-b border-line/60">
                <td className="px-4 py-2">
                  <span className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
                    {col.type === "id" && <Hash size={11} className="text-muted" />}
                    {col.label}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className="inline-flex h-[18px] items-center gap-1 rounded border border-line bg-inset px-1.5 text-[10px] font-medium tabular-nums text-muted">
                    {meta.icon}
                    {meta.badge}
                  </span>
                  <span className="ml-2 text-[11px] text-muted/60">{typeLabel[col.type]}</span>
                </td>
                <td className="px-4 py-2 text-[12px] text-muted">
                  {col.description ??
                    (col.type === "id"
                      ? "Primary identifier for this record."
                      : `Column \u201c${col.label}\u201d from the analyzed contract data.`)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Column header with data-type badge + sort arrow                    */
/* ------------------------------------------------------------------ */

function EditorHeader<T>({
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  col: EditorColumn<T>;
  sortKey: string | null;
  sortDir: 1 | -1;
  onSort: (key: string) => void;
}) {
  const meta = TYPE_META[col.type];
  const active = sortKey === col.key;
  return (
    <th
      className={`h-[38px] border-b border-line-strong bg-float px-3 whitespace-nowrap ${
        col.align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        onClick={() => onSort(col.key)}
        className={`inline-flex w-full items-center gap-1.5 transition-colors hover:text-fg ${
          col.align === "right" ? "flex-row-reverse" : ""
        }`}
      >
        <span className="text-[11.5px] font-semibold text-fg">{col.label}</span>
        <span className="inline-flex h-[16px] items-center gap-1 rounded border border-line bg-inset px-1 text-[9px] font-medium tabular-nums text-muted">
          {meta.icon}
          {meta.badge}
        </span>
        {active ? (
          sortDir === 1 ? (
            <ArrowUp size={11} className="text-fg" />
          ) : (
            <ArrowDown size={11} className="text-fg" />
          )
        ) : (
          <ChevronDown size={11} className="text-muted/60" />
        )}
      </button>
    </th>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination footer with a Data / Definition toggle                  */
/* ------------------------------------------------------------------ */

function EditorFooter({
  filteredCount,
  filterActive,
  leftHint,
  view,
  onViewChange,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  filteredCount: number;
  filterActive: boolean;
  leftHint?: React.ReactNode;
  view: "data" | "definition";
  onViewChange: (v: "data" | "definition") => void;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const pageBtn =
    "flex size-6 items-center justify-center rounded border border-line bg-canvas text-muted transition-colors hover:text-fg disabled:cursor-default disabled:opacity-35 disabled:hover:text-muted";
  return (
    <div className="flex h-10 shrink-0 items-center gap-2.5 border-t border-line bg-surface px-3 text-[11px] text-muted">
      {view === "data" && (
        <>
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            title="Previous page"
            className={pageBtn}
          >
            <ChevronLeft size={12} />
          </button>
          <span className="flex items-center gap-1.5">
            <span>Page</span>
            <input
              value={page}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v)) onPageChange(Math.min(Math.max(v, 1), pageCount));
              }}
              aria-label="Current page"
              className="h-6 w-10 rounded border border-line bg-canvas px-1 text-center text-[11px] tabular-nums text-fg outline-none transition-colors focus:border-line-strong"
            />
            <span>of {pageCount}</span>
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            title="Next page"
            className={pageBtn}
          >
            <ChevronRight size={12} />
          </button>
          {filterActive && (
            <span className="flex items-center gap-1 rounded border border-line bg-inset px-1.5 py-0.5 text-[10px] text-muted">
              <Filter size={10} className="text-muted" />
              filtered to {filteredCount}
            </span>
          )}
        </>
      )}

      {leftHint && view === "data" && <span className="hidden truncate md:block">{leftHint}</span>}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {view === "data" && (
          <>
            <span className="tabular-nums text-muted">
              <span className="font-medium text-fg">{filteredCount}</span> record{filteredCount === 1 ? "" : "s"}
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="h-6 cursor-pointer rounded border border-line bg-canvas px-1.5 text-[11px] text-fg outline-none transition-colors hover:border-line-strong focus:border-line-strong"
            >
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </>
        )}
        <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-canvas p-0.5">
          {(
            [
              { id: "data", label: "Data" },
              { id: "definition", label: "Definition" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => onViewChange(t.id)}
              aria-pressed={view === t.id}
              className={`rounded px-2 py-0.5 text-[11px] transition-colors ${
                view === t.id ? "bg-active text-fg" : "text-muted hover:text-fg"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The full editor shell                                              */
/* ------------------------------------------------------------------ */

export function DataTableEditor<T extends { id: string }>({
  title,
  description,
  icon,
  columns,
  rows,
  filter,
  defaultSort,
  railLabel,
  tables,
  footerHint,
  footerMeta,
  toolbarRight,
  onRowClick,
  selectedId,
  onSelectionChange,
  simple = false,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Optional title for the left tables rail. Defaults to "Table Editor". */
  railLabel?: string;
  icon?: React.ReactNode;
  columns: EditorColumn<T>[];
  rows: T[];
  /** Optional row-level text filter (return true to keep). */
  filter?: (row: T, query: string) => boolean;
  /** Initial sort (key must match a column key). Omitted → no default sort. */
  defaultSort?: { key: string; dir: 1 | -1 };
  /** Other editor "tables" shown in the left rail. */
  tables: TableRowEntry[];
  footerHint?: React.ReactNode;
  footerMeta?: React.ReactNode;
  toolbarRight?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  /** Called with the currently checked row ids whenever selection changes. */
  onSelectionChange?: (ids: string[]) => void;
  /** Free-plan mode: same spreadsheet, fewer columns, no advanced controls
      (sort menu, selection, pagination, schema view). */
  simple?: boolean;
  /** Overlay content (e.g. a row inspector) rendered above the editor. */
  children?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string | null; dir: 1 | -1 }>({
    key: defaultSort?.key ?? null,
    dir: defaultSort?.dir ?? -1,
  });
  const [view, setView] = useState<"data" | "definition">("data");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [sortOpen, setSortOpen] = useState(false);

  const q = query.trim();
  const filtered = useMemo(() => {
    let out = rows;
    if (q && filter) out = rows.filter((r) => filter(r, q));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q]);

  const sortedRows = useMemo(() => {
    const activeCol = columns.find((c) => c.key === sort.key);
    if (!activeCol) return filtered;
    const dir = sort.dir;
    return [...filtered].sort((a, b) => {
      const x = activeCol.value(a);
      const y = activeCol.value(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir;
    });
  }, [filtered, columns, sort]);

  const onSort = (key: string) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }
    );

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  // Page state is always reset in the handlers that shrink the result set
  // (new query, new page size); this render-time clamp keeps a stale page
  // from ever overrunning the (possibly re-loaded) rows.
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedRows, safePage, pageSize]
  );

  const toggleRow = (id: string) => {
    setChecked((prev) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectionChange?.(Array.from(next));
      return next;
    });
  };
  const allChecked = sortedRows.length > 0 && checked.size === sortedRows.length;
  const toggleAll = () => {
    const next = allChecked ? new Set<string>() : new Set<string>(sortedRows.map((r) => r.id));
    setChecked(next);
    onSelectionChange?.(Array.from(next));
  };

  return (
    <div className="relative flex h-full min-h-0 overflow-hidden bg-canvas">
      {/* left tables rail */}
      <TablesRail tables={tables} label={railLabel ?? "Table Editor"} />

      {/* main editor */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* tab bar (active table) */}
        <div className="flex h-10 shrink-0 items-end gap-1 border-b border-line bg-float px-3">
          <span className="flex h-full items-center gap-2 border-x border-t border-line bg-surface px-3 text-[12.5px] font-semibold text-fg">
            <Table2 size={13} className="text-muted" />
            {title}
            {description && <span className="hidden truncate text-[10.5px] font-normal text-muted md:block">{description}</span>}
            <button aria-label="Close tab" className="text-muted transition-colors hover:text-fg">
              <X size={12} />
            </button>
          </span>
          {icon}
        </div>

        {/* filter + toolbar */}
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-surface px-3">
          <label className="flex min-w-0 max-w-md flex-1 items-center gap-2 rounded-md border border-line bg-canvas px-2.5 transition-colors focus-within:border-line-strong">
            <Search size={12} className="shrink-0 text-muted/60" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Filter by columns…"
              className="h-7 min-w-0 flex-1 bg-transparent text-[12px] text-fg outline-none placeholder:text-muted/60"
            />
            {q && (
              <button
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                aria-label="Clear filter"
                className="text-muted/60 hover:text-fg"
              >
                <X size={12} />
              </button>
            )}
          </label>
          {!simple && (
          <div className="relative shrink-0">
            <button
              onClick={() => setSortOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={sortOpen}
              className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11.5px] font-medium transition-colors ${
                sortOpen
                  ? "border-line-strong bg-sel text-fg"
                  : "border-line bg-canvas text-muted hover:border-line-strong hover:text-fg"
              }`}
            >
              <ArrowUpDown size={12} />
              Sort
              <ChevronDown size={11} className="opacity-70" />
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-[3]" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full z-[4] mt-1 w-60 rounded-md border border-line bg-surface p-1 shadow-xl shadow-black/50">
                  <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Sort by column
                  </p>
                  {columns.map((col) => {
                    const active = sort.key === col.key;
                    return (
                      <button
                        key={col.key}
                        onClick={() => {
                          onSort(col.key);
                          setSortOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[12px] text-fg transition-colors hover:bg-hover hover:text-fg"
                      >
                        <span className="min-w-0 flex-1 truncate">{col.label}</span>
                        {active &&
                          (sort.dir === 1 ? (
                            <ArrowUp size={11} className="shrink-0 text-muted" />
                          ) : (
                            <ArrowDown size={11} className="shrink-0 text-muted" />
                          ))}
                      </button>
                    );
                  })}
                  {sort.key && (
                    <button
                      onClick={() => {
                        setSort({ key: null, dir: -1 });
                        setSortOpen(false);
                      }}
                      className="mt-1 w-full rounded border-t border-line px-2 py-1.5 text-left text-[11.5px] text-muted transition-colors hover:text-fg"
                    >
                      Clear sort
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="hidden text-[11px] text-muted sm:block">{filtered.length} row{filtered.length === 1 ? "" : "s"}</span>
            {toolbarRight}
            {!simple && (
              <button aria-label="More" className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg">
                <MoreHorizontal size={14} />
              </button>
            )}
            <button
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              aria-label="Refresh"
              title="Refresh"
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-fg"
            >
              <RefreshCw size={13} />
            </button>
          </span>
        </div>

        {/* data grid or definition view */}
        {view === "definition" ? (
          <DefinitionView title={title} columns={columns} rowCount={rows.length} />
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-[2]">
                <tr>
                  {!simple && (
                    <th className="h-[38px] w-9 border-b border-line-strong bg-float px-2 text-left">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        onChange={toggleAll}
                        aria-label="Select all rows"
                        className="cursor-pointer accent-fg"
                      />
                    </th>
                  )}
                  {columns.map((col) => (
                    <EditorHeader key={col.key} col={col} sortKey={sort.key} sortDir={sort.dir} onSort={onSort} />
                  ))}
                  {!simple && <th className="h-[38px] w-9 border-b border-line-strong bg-float" />}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, ri) => (
                  <motion.tr
                    key={row.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileTap={{ scale: 0.994, transition: { duration: 0.08 } }}
                    transition={{ duration: 0.24, delay: Math.min(ri * 0.02, 0.4), ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => onRowClick?.(row)}
                    className={`cursor-pointer border-b border-line/60 transition-colors ${
                      selectedId === row.id ? "bg-sel" : "hover:bg-inset"
                    }`}
                  >
                    {!simple && (
                      <td className="px-2 py-0">
                        <input
                          type="checkbox"
                          checked={checked.has(row.id)}
                          onChange={() => toggleRow(row.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select ${row.id}`}
                          className="cursor-pointer accent-fg"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`whitespace-nowrap px-3 py-1.5 text-[12.5px] text-fg ${
                          col.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {col.render(row)}
                      </td>
                    ))}
                    {!simple && (
                      <td className="w-6 px-1">
                        <span className="cursor-default text-muted/50">…</span>
                      </td>
                    )}
                  </motion.tr>
                ))}
                {sortedRows.length === 0 && (
                  <tr>
                    <td colSpan={columns.length + (simple ? 0 : 2)} className="px-4 py-14 text-center text-[12px] text-muted">
                      Nothing matches the current filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* footer */}
      {simple ? (
        <div className="flex h-9 shrink-0 items-center gap-2.5 border-t border-line bg-surface px-3 text-[11px] text-muted">
          <span className="tabular-nums">
            <span className="font-medium text-fg">{sortedRows.length}</span> record{sortedRows.length === 1 ? "" : "s"}
          </span>
          {footerHint && <span className="hidden truncate md:block">{footerHint}</span>}
        </div>
      ) : (
        <EditorFooter
          filteredCount={sortedRows.length}
          filterActive={!!q}
          leftHint={footerHint}
          view={view}
          onViewChange={setView}
          page={safePage}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
      )}
        {footerMeta}
      </div>

      {/* overlay (row inspector) */}
      {children}
    </div>
  );
}