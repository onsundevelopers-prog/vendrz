"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  EyeOff,
  Filter,
  GripVertical,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { ContextMenu, MenuPop, useDismiss, type MenuEntry } from "./menu";

/* ------------------------------------------------------------------ */
/*  DataTable - a dense, professional table (Excel / Linear school).  */
/*  Sorting, per-column filtering, global search, column visibility,  */
/*  resizing, reordering, row selection, pagination, right-click      */
/*  context menus, keyboard navigation, and persisted view config.    */
/* ------------------------------------------------------------------ */

export interface Column<T> {
  id: string;
  label: string;
  width?: number;
  minWidth?: number;
  align?: "left" | "right" | "center";
  sortable?: boolean;
  hideable?: boolean;
  sortValue?: (row: T) => string | number | null;
  filterValue?: (row: T) => string | number | null;
  render?: (row: T) => React.ReactNode;
  header?: React.ReactNode;
}

interface PersistedConfig {
  order: string[];
  widths: Record<string, number>;
  hidden: string[];
}

export interface RowAction<T> {
  label: string;
  onSelect: (row: T) => void;
  danger?: boolean;
  disabled?: boolean;
  kbd?: string;
}

interface DataTableProps<T> {
  /** localStorage key - column layout, widths, and visibility persist per table. */
  storageKey: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  rowActions?: (row: T) => RowAction<T>[];
  bulkActions?: { label: string; onSelect: (keys: Set<string>) => void; danger?: boolean }[];
  /** Rendered on the left of the table toolbar. */
  toolbar?: React.ReactNode;
  searchKeys?: (row: T) => string[];
  searchPlaceholder?: string;
  defaultSort?: { id: string; dir: "asc" | "desc" };
  pageSize?: number;
  emptyState?: React.ReactNode;
  maxHeight?: string;
  rowClassName?: (row: T) => string;
}

const DEFAULT_WIDTH = 150;

function loadConfig(key: string): PersistedConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`vt.tbl.${key}`);
    return raw ? (JSON.parse(raw) as PersistedConfig) : null;
  } catch {
    return null;
  }
}

export function DataTable<T>({
  storageKey,
  columns,
  rows,
  rowKey,
  onRowClick,
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowActions,
  bulkActions,
  toolbar,
  searchKeys,
  searchPlaceholder = "Search…",
  defaultSort,
  pageSize: defaultPageSize = 25,
  emptyState,
  maxHeight = "560px",
  rowClassName,
}: DataTableProps<T>) {
  /* ---------------- persisted column config ---------------- */
  const [config, setConfig] = useState<PersistedConfig>(() => {
    const saved = loadConfig(storageKey);
    const order = saved?.order ?? columns.map((c) => c.id);
    return {
      order,
      widths: saved?.widths ?? {},
      hidden: saved?.hidden ?? [],
    };
  });
  const persist = (next: PersistedConfig) => {
    setConfig(next);
    try {
      window.localStorage.setItem(`vt.tbl.${storageKey}`, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  };

  /* ---------------- local state ---------------- */
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(
    defaultSort ?? null
  );
  const [sel, setSel] = useState<Set<string>>(new Set());
  const selection = selectedKeys ?? sel;
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [menu, setMenu] = useState<"columns" | "filter" | null>(null);
  const [ctx, setCtx] = useState<{ x: number; y: number; row: T } | null>(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [dragCol, setDragCol] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  useDismiss(menu !== null, () => setMenu(null));
  useDismiss(ctx !== null, () => setCtx(null));

  const visible = useMemo(() => {
    const hiddenSet = new Set(config.hidden);
    return config.order
      .map((id) => columns.find((c) => c.id === id))
      .filter((c): c is Column<T> => c !== undefined && !hiddenSet.has(c.id));
  }, [config.order, config.hidden, columns]);

  /* ---------------- derived rows ---------------- */
  const filtered = useMemo(() => {
    let list = rows;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) =>
        (searchKeys?.(r) ?? []).some((k) => k.toLowerCase().includes(q))
      );
    }
    const activeFilters = Object.entries(filters).filter(([, v]) => v.trim());
    if (activeFilters.length > 0) {
      list = list.filter((r) =>
        activeFilters.every(([colId, v]) => {
          const col = columns.find((c) => c.id === colId);
          const val = col?.filterValue?.(r);
          return String(val ?? "").toLowerCase().includes(v.toLowerCase());
        })
      );
    }
    if (sort) {
      const col = columns.find((c) => c.id === sort.id);
      const sv = col?.sortValue;
      list = [...list].sort((a, b) => {
        const va = sv ? sv(a) : String((a as Record<string, unknown>)[sort.id] ?? "");
        const vb = sv ? sv(b) : String((b as Record<string, unknown>)[sort.id] ?? "");
        const cmp =
          typeof va === "number" && typeof vb === "number"
            ? va - vb
            : String(va).localeCompare(String(vb), undefined, { numeric: true });
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return list;
  }, [rows, query, filters, sort, columns, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const effectivePage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => filtered.slice(effectivePage * pageSize, effectivePage * pageSize + pageSize),
    [filtered, effectivePage, pageSize]
  );

  /* ---------------- selection ---------------- */
  const allSelected =
    filtered.length > 0 && filtered.every((r) => selection.has(rowKey(r)));
  const someSelected = filtered.some((r) => selection.has(rowKey(r)));

  const toggleAll = () => {
    const next = new Set(selection);
    if (allSelected) {
      for (const r of filtered) next.delete(rowKey(r));
    } else {
      for (const r of filtered) next.add(rowKey(r));
    }
    setSel(next);
    onSelectionChange?.(next);
  };

  const toggleRow = (r: T) => {
    const k = rowKey(r);
    const next = new Set(selection);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setSel(next);
    onSelectionChange?.(next);
  };

  const clearSelection = () => {
    setSel(new Set());
    onSelectionChange?.(new Set());
  };

  /* ---------------- column management ---------------- */
  const toggleColumn = (id: string) => {
    const hidden = config.hidden.includes(id)
      ? config.hidden.filter((h) => h !== id)
      : [...config.hidden, id];
    persist({ ...config, hidden });
  };

  const resetColumns = () => {
    persist({
      order: columns.map((c) => c.id),
      widths: {},
      hidden: [],
    });
  };

  const moveColumn = (from: string, to: string) => {
    if (from === to) return;
    const order = [...config.order];
    const i = order.indexOf(from);
    const j = order.indexOf(to);
    order.splice(i, 1);
    order.splice(j, 0, from);
    persist({ ...config, order });
  };

  const setWidth = (id: string, w: number) => {
    persist({ ...config, widths: { ...config.widths, [id]: Math.max(72, Math.round(w)) } });
  };

  /* ---------------- keyboard nav ---------------- */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (pageRows.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const next = Math.max(0, Math.min(pageRows.length - 1, activeIdx + dir));
      setActiveIdx(next);
      const el = scrollRef.current?.querySelector<HTMLElement>(
        `[data-row-index="${next}"]`
      );
      el?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && activeIdx >= 0 && onRowClick) {
      e.preventDefault();
      onRowClick(pageRows[activeIdx]);
    } else if (e.key === " " && activeIdx >= 0 && selectable) {
      e.preventDefault();
      toggleRow(pageRows[activeIdx]);
    }
  };

  /* ---------------- context menu ---------------- */
  const ctxItems: MenuEntry[] = (() => {
    if (!ctx) return [];
    const actions = rowActions?.(ctx.row) ?? [];
    const entries: MenuEntry[] = actions.map((a) => ({
      label: a.label,
      danger: a.danger,
      disabled: a.disabled,
      kbd: a.kbd,
      onSelect: () => a.onSelect(ctx.row),
    }));
    if (selectable) {
      entries.unshift({
        label: selection.has(rowKey(ctx.row)) ? "Deselect" : "Select",
        icon: <Check size={13} />,
        onSelect: () => toggleRow(ctx.row),
      });
    }
    if (entries.length === 0) {
      entries.push({ label: "No actions", disabled: true });
    }
    return entries;
  })();

  const filterableColumns = columns.filter((c) => c.filterValue);
  const filterCount = Object.values(filters).filter((v) => v.trim()).length;

  const colMenuItems: MenuEntry[] = [
    ...visible.map((c) => ({
      label: c.label,
      icon: config.hidden.includes(c.id) ? <EyeOff size={13} /> : <Eye size={13} />,
      onSelect: () => toggleColumn(c.id),
    })),
    { separator: true },
    { label: "Reset columns", icon: <RotateCcw size={13} />, onSelect: resetColumns },
  ];

  return (
    <div className="panel-surface overflow-hidden">
      {/* toolbar */}
      <div className="toolbar">
        {selectable && selection.size > 0 ? (
          <>
            <span className="px-1 text-[12px] font-medium text-fg">
              {selection.size} selected
            </span>
            <div className="toolbar-sep" />
            {bulkActions?.map((b) => (
              <button
                key={b.label}
                className={`toolbar-btn ${b.danger ? "text-zinc-100 hover:text-zinc-300" : ""}`}
                onClick={() => b.onSelect(selection)}
              >
                {b.label}
              </button>
            ))}
            <button className="toolbar-btn" onClick={clearSelection}>
              <X size={13} /> Clear
            </button>
            <span className="ml-auto" />
            <button className="toolbar-btn primary" onClick={toggleAll}>
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </>
        ) : (
          <>
            {toolbar}
            {searchKeys && (
              <div className="toolbar-input ml-auto w-56">
                <Search size={13} className="shrink-0 text-muted" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-[12px] text-fg outline-none placeholder:text-muted/70"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setPage(0);
                    }}
                    className="text-muted hover:text-fg"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
            {filterableColumns.length > 0 && (
              <button
                onClick={() => setMenu(menu === "filter" ? null : "filter")}
                className={`toolbar-btn ${filterCount > 0 ? "active" : ""}`}
              >
                <Filter size={13} />
                Filter
                {filterCount > 0 && (
                  <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-black">
                    {filterCount}
                  </span>
                )}
              </button>
            )}
            <button
              ref={menuRef}
              onClick={() => setMenu(menu === "columns" ? null : "columns")}
              className="toolbar-btn"
            >
              <Columns3 size={13} />
              Columns
            </button>
          </>
        )}
      </div>

      {/* filter panel */}
      {menu === "filter" && filterableColumns.length > 0 && (
        <div className="border-b border-line bg-canvas/60 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted/70">
            <Filter size={11} /> Column filters
            <span className="ml-auto normal-case tracking-normal">
              values match in any column
            </span>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filterableColumns.map((c) => (
              <label key={c.id} className="flex items-center gap-2">
                <span className="w-28 shrink-0 truncate text-[11.5px] text-muted">{c.label}</span>
                <input
                  value={filters[c.id] ?? ""}
                  onChange={(e) => {
                    setFilters((f) => ({ ...f, [c.id]: e.target.value }));
                    setPage(0);
                  }}
                  placeholder="Filter…"
                  className="toolbar-input h-7 flex-1"
                />
              </label>
            ))}
          </div>
          {filterCount > 0 && (
            <button
              className="mt-2 text-[11.5px] text-muted hover:text-fg"
              onClick={() => setFilters({})}
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* table */}
      <div
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="overflow-auto outline-none"
        style={{ maxHeight }}
      >
        <table className="ptable" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 36, padding: 0, textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={toggleAll}
                    className="accent-white"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {visible.map((c) => {
                const activeSort = sort?.id === c.id;
                return (
                  <th
                    key={c.id}
                    draggable
                    onDragStart={() => setDragCol(c.id)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragCol && dragCol !== c.id) moveColumn(dragCol, c.id);
                    }}
                    onDragEnd={() => setDragCol(null)}
                    className={`${dragCol === c.id ? "dragging" : ""} ${
                      c.align === "right" ? "!text-right" : c.align === "center" ? "!text-center" : ""
                    }`}
                    style={{ width: config.widths[c.id] ?? c.width ?? DEFAULT_WIDTH, position: "relative" }}
                  >
                    <span className="flex items-center gap-1.5">
                      <GripVertical size={11} className="shrink-0 opacity-30" />
                      {c.sortable ? (
                        <button
                          className={`flex items-center gap-1 hover:text-fg ${
                            activeSort ? "!text-fg" : ""
                          } ${c.align === "right" ? "flex-row-reverse" : ""}`}
                          onClick={() =>
                            setSort((s) =>
                              s?.id === c.id
                                ? { id: c.id, dir: s.dir === "asc" ? "desc" : "asc" }
                                : { id: c.id, dir: "asc" }
                            )
                          }
                        >
                          {c.header ?? c.label}
                          {activeSort ? (
                            sort?.dir === "asc" ? (
                              <ArrowUp size={11} />
                            ) : (
                              <ArrowDown size={11} />
                            )
                          ) : (
                            <ArrowUpDown size={11} className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        <span>{c.header ?? c.label}</span>
                      )}
                    </span>
                    <span
                      className="col-resize"
                      onPointerDown={(e) => {
                        e.preventDefault();
                        const startX = e.clientX;
                        const startW = config.widths[c.id] ?? c.width ?? DEFAULT_WIDTH;
                        const onMove = (ev: PointerEvent) =>
                          setWidth(c.id, startW + (ev.clientX - startX));
                        const onUp = () => {
                          window.removeEventListener("pointermove", onMove);
                          window.removeEventListener("pointerup", onUp);
                        };
                        window.addEventListener("pointermove", onMove);
                        window.addEventListener("pointerup", onUp);
                      }}
                    />
                  </th>
                );
              })}
              {(rowActions || onRowClick) && (
                <th style={{ width: 48, textAlign: "right" }}> </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => {
              const key = rowKey(r);
              const selected = selection.has(key);
              return (
                <tr
                  key={key}
                  data-row-index={i}
                  className={`${selected ? "selected" : ""} ${
                    activeIdx === i ? "active-row" : ""
                  } ${rowClassName?.(r) ?? ""}`}
                  onClick={() => onRowClick?.(r)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (rowActions || selectable) setCtx({ x: e.clientX, y: e.clientY, row: r });
                  }}
                >
                  {selectable && (
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleRow(r)}
                        onClick={(e) => e.stopPropagation()}
                        className="accent-white"
                        aria-label={`Select row ${i + 1}`}
                      />
                    </td>
                  )}
                  {visible.map((c) => (
                    <td
                      key={c.id}
                      className={c.align === "right" ? "!text-right" : c.align === "center" ? "!text-center" : ""}
                    >
                      {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.id] ?? "")}
                    </td>
                  ))}
                  {(rowActions || onRowClick) && (
                    <td style={{ textAlign: "right" }}>
                      <span className="text-muted/40">{activeIdx === i ? "↵" : "›"}</span>
                    </td>
                  )}
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={visible.length + (selectable ? 1 : 0) + ((rowActions || onRowClick) ? 1 : 0)}>
                  {emptyState ?? (
                    <div className="px-6 py-14 text-center">
                      <p className="text-[13px] text-muted">No rows match the current view.</p>
                      <button
                        className="mt-3 toolbar-btn active"
                        onClick={() => {
                          setQuery("");
                          setFilters({});
                          setSort(defaultSort ?? null);
                          setPage(0);
                        }}
                      >
                        <RotateCcw size={13} /> Reset view
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="flex items-center gap-3 border-t border-line px-3 py-2 text-[11.5px] text-muted">
        <span>
          <span className="font-medium text-fg">{filtered.length}</span> rows
          {selection.size > 0 && (
            <span className="text-fg"> · {selection.size} selected</span>
          )}
        </span>
        <span className="ml-auto flex items-center gap-2">
          Rows
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="h-6 rounded border border-line bg-canvas px-1 text-[11.5px] text-fg outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </span>
        <span className="text-muted/70">
          {filtered.length === 0
            ? "0–0"
            : `${effectivePage * pageSize + 1}–${Math.min(filtered.length, (effectivePage + 1) * pageSize)}`}
        </span>
        <button
          className="toolbar-btn !h-6 !px-1.5"
          disabled={effectivePage === 0}
          onClick={() => setPage(effectivePage - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="tabular-nums">
          {effectivePage + 1}/{pageCount}
        </span>
        <button
          className="toolbar-btn !h-6 !px-1.5"
          disabled={effectivePage >= pageCount - 1}
          onClick={() => setPage(effectivePage + 1)}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* popovers */}
      <MenuPop
        open={menu === "columns"}
        onClose={() => setMenu(null)}
        anchor={menuRef}
        align="end"
        items={colMenuItems}
      />
      <ContextMenu menu={ctx ? { x: ctx.x, y: ctx.y } : null} onClose={() => setCtx(null)} items={ctxItems} />
    </div>
  );
}
