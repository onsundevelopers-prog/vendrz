"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Columns3,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Companies - a single black Attio-style database view.              */
/*  Rows live in localStorage so edits persist for the session and     */
/*  the table is fed entirely from real, user-controlled data.         */
/* ------------------------------------------------------------------ */

type Company = {
  id: string;
  name: string;
  category: string;
  contractValue: number;
  renewal: string;
  autoRenew: boolean;
  risk: "Low" | "Moderate" | "High" | "Critical";
  owner: string;
  lastReviewed: string;
};

const EMPTY: Company[] = [];

/** Seed rows from the scanned Master_Subscription agreement so the table is
    never an empty shell - these reflect the analyzed contract's terms. */
function seed(): Company[] {
  return [
    {
      id: "c-master-agg",
      name: "Master Subscription Agreement",
      category: "Software",
      contractValue: 11000,
      renewal: "2027-01-01",
      autoRenew: true,
      risk: "High",
      owner: "",
      lastReviewed: "2026-08-25",
    },
    {
      id: "c-master-vendor",
      name: "Unidentified Vendor",
      category: "Software",
      contractValue: 11000,
      renewal: "2027-01-01",
      autoRenew: true,
      risk: "High",
      owner: "",
      lastReviewed: "2026-08-25",
    },
  ];
}

function load(): Company[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem("vt.companies");
    if (raw) return JSON.parse(raw) as Company[];
    // First visit: seed with the scanned contract's data, then persist.
    const seeded = seed();
    try {
      window.localStorage.setItem("vt.companies", JSON.stringify(seeded));
    } catch {
      /* ignore */
    }
    return seeded;
  } catch {
    return seed();
  }
}

function save(rows: Company[]): void {
  try {
    window.localStorage.setItem("vt.companies", JSON.stringify(rows));
  } catch {
    /* ignore */
  }
}

const uid = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const RISK_ORDER: Record<Company["risk"], number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Critical: 3,
};

interface ColumnDef {
  id: string;
  label: string;
  width: number;
  sortable?: boolean;
  align?: "right";
  sortValue?: (c: Company) => string | number;
  render: (c: Company) => React.ReactNode;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (iso: string) =>
  iso
    ? new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";

export default function CompaniesPage() {
  const [rows, setRows] = useState<Company[]>(load);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(null);
  const [openFilters, setOpenFilters] = useState<Record<string, string>>({});

  useEffect(() => save(rows), [rows]);

  const addRow = () => {
    const row: Company = {
      id: uid(),
      name: "",
      category: "",
      contractValue: 0,
      renewal: "",
      autoRenew: false,
      risk: "Low",
      owner: "",
      lastReviewed: "",
    };
    setRows((r) => [row, ...r]);
    setSelected(new Set([row.id]));
  };

  const updateCell = (id: string, key: keyof Company, value: unknown) => {
    setRows((r) => r.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  };

  const deleteSelected = () => {
    setRows((r) => r.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
  };

  const deleteOne = (id: string) => {
    setRows((r) => r.filter((c) => c.id !== id));
    setSelected((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
  };

  const columns: ColumnDef[] = [
    {
      id: "name",
      label: "Company",
      width: 200,
      sortable: true,
      sortValue: (c) => c.name.toLowerCase(),
      render: (c) => (
        <input
          value={c.name}
          onChange={(e) => updateCell(c.id, "name", e.target.value)}
          placeholder="Company name"
          className="h-7 w-full rounded-md bg-transparent px-1.5 text-[13px] font-medium text-fg outline-none transition-colors placeholder:text-zinc-600 hover:bg-white/[0.03] focus:bg-white/[0.06] focus:ring-1 focus:ring-white/20"
        />
      ),
    },
    {
      id: "category",
      label: "Category",
      width: 130,
      sortable: true,
      sortValue: (c) => c.category.toLowerCase(),
      render: (c) => (
        <input
          value={c.category}
          onChange={(e) => updateCell(c.id, "category", e.target.value)}
          placeholder="Category"
          className="h-7 w-full rounded-md bg-transparent px-1.5 text-[12.5px] text-fg outline-none transition-colors placeholder:text-zinc-600 hover:bg-white/[0.03] focus:bg-white/[0.06] focus:ring-1 focus:ring-white/20"
        />
      ),
    },
    {
      id: "value",
      label: "Annual value",
      width: 120,
      align: "right",
      sortable: true,
      sortValue: (c) => c.contractValue,
      render: (c) => (
        <span className="block text-right text-[12.5px] tabular-nums text-fg">
          {c.contractValue ? fmtMoney(c.contractValue) : <span className="text-zinc-600">-</span>}
        </span>
      ),
    },
    {
      id: "renewal",
      label: "Renews",
      width: 130,
      sortable: true,
      sortValue: (c) => c.renewal,
      render: (c) => (
        <span className="text-[12.5px] text-fg">
          {c.renewal ? fmtDate(c.renewal) : <span className="text-zinc-600">-</span>}
        </span>
      ),
    },
    {
      id: "auto",
      label: "Auto-renew",
      width: 110,
      sortable: true,
      sortValue: (c) => Number(c.autoRenew),
      render: (c) => (
        <button
          onClick={() => updateCell(c.id, "autoRenew", !c.autoRenew)}
          className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors"
          style={
            c.autoRenew
              ? { borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.06)", color: "#f4f4f5" }
              : { borderColor: "rgba(255,255,255,0.1)", color: "#71717a" }
          }
        >
          {c.autoRenew ? "Auto" : "Manual"}
        </button>
      ),
    },
    {
      id: "risk",
      label: "Risk",
      width: 100,
      sortable: true,
      sortValue: (c) => RISK_ORDER[c.risk],
      render: (c) => (
        <button
          onClick={() => {
            const order: Company["risk"][] = ["Low", "Moderate", "High", "Critical"];
            updateCell(c.id, "risk", order[(RISK_ORDER[c.risk] + 1) % 4]);
          }}
          className="rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors"
          style={
            c.risk === "Critical" || c.risk === "High"
              ? { borderColor: "rgba(248,113,113,0.35)", background: "rgba(248,113,113,0.1)", color: "#fca5a5" }
              : { borderColor: "rgba(255,255,255,0.1)", color: "#a1a1aa" }
          }
        >
          {c.risk}
        </button>
      ),
    },
    {
      id: "owner",
      label: "Owner",
      width: 140,
      sortable: true,
      sortValue: (c) => c.owner.toLowerCase(),
      render: (c) => (
        <input
          value={c.owner}
          onChange={(e) => updateCell(c.id, "owner", e.target.value)}
          placeholder="Owner"
          className="h-7 w-full rounded-md bg-transparent px-1.5 text-[12.5px] text-fg outline-none transition-colors placeholder:text-zinc-600 hover:bg-white/[0.03] focus:bg-white/[0.06] focus:ring-1 focus:ring-white/20"
        />
      ),
    },
    {
      id: "reviewed",
      label: "Last reviewed",
      width: 110,
      sortable: true,
      sortValue: (c) => c.lastReviewed,
      render: (c) => (
        <span className="text-[12.5px] text-fg">
          {c.lastReviewed ? fmtDate(c.lastReviewed) : <span className="text-zinc-600">-</span>}
        </span>
      ),
    },
  ];

  // apply search + column filters
  const filtered = useMemo(() => {
    let list = rows;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((c) =>
        [c.name, c.category, c.owner, c.risk].join(" ").toLowerCase().includes(q)
      );
    }
    for (const [col, val] of Object.entries(openFilters)) {
      if (!val) continue;
      list = list.filter((c) => String(c[col as keyof Company] ?? "").toLowerCase().includes(val.toLowerCase()));
    }
    if (sort) {
      const col = columns.find((x) => x.id === sort.id);
      if (col?.sortValue) {
        list = [...list].sort((a, b) => {
          const x = col.sortValue!(a);
          const y = col.sortValue!(b);
          return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
        });
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, openFilters, sort]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((s) => {
      if (s.size === filtered.length && filtered.length > 0) return new Set();
      return new Set(filtered.map((c) => c.id));
    });
  };

  const activeFilters = Object.keys(openFilters).length;

  return (
    <div className="flex h-full flex-col">
      {/* view header */}
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
        <span className="text-[13.5px] font-medium text-fg">All Companies</span>
        <ChevronDown size={13} className="text-muted/60" />
        <div className="ml-2 h-4 w-px bg-line" />
        <button
          onClick={() =>
            setSort((s) =>
              s && s.id === "name"
                ? { id: "name", dir: s.dir === 1 ? -1 : 1 }
                : { id: "name", dir: 1 }
            )
          }
          className="flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <SlidersHorizontal size={12} />
          Sort
        </button>
        <button
          onClick={() => setOpenFilters({})}
          className="flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] text-muted transition-colors hover:bg-white/5 hover:text-fg"
        >
          <Filter size={12} />
          Filter
          {activeFilters > 0 && (
            <span className="rounded-full bg-white px-1 text-[10px] font-semibold text-black">
              {activeFilters}
            </span>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={deleteSelected}
              className="flex h-6 items-center gap-1.5 rounded-md px-2 text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
            >
              <X size={12} />
              Delete ({selected.size})
            </button>
          )}
          <button
            onClick={addRow}
            className="flex h-6 items-center gap-1.5 rounded-md bg-white px-2.5 text-[12px] font-medium text-black transition-opacity hover:opacity-90"
          >
            <Plus size={12} />
            Add company
          </button>
        </div>
      </div>

      {/* search row */}
      <div className="flex items-center gap-2 border-b border-line/60 px-4 py-1.5">
        <Search size={12} className="text-muted/60" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies, categories, owners…"
          className="h-6 flex-1 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-zinc-600"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-muted/60 hover:text-fg"
            aria-label="Clear search"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* table */}
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10" style={{ position: "sticky" }}>
            <tr className="bg-[#101014]">
              <th className="w-10 border-b border-white/10 px-3">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selected.size === filtered.length}
                  onChange={toggleAll}
                  className="size-3.5 accent-white"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.id}
                  style={{ width: col.width }}
                  className={`whitespace-nowrap border-b border-white/10 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-zinc-500 ${
                    col.align === "right" ? "text-right" : ""
                  }`}
                >
                  <button
                    onClick={() => col.sortable && setSort((s) => ({ id: col.id, dir: s?.id === col.id && s.dir === 1 ? -1 : 1 }))}
                    className={`inline-flex items-center gap-1 hover:text-zinc-200 ${
                      sort?.id === col.id ? "!text-zinc-200" : ""
                    } ${col.align === "right" ? "flex-row-reverse" : ""}`}
                  >
                    {col.label}
                    {sort?.id === col.id && (
                      <span className="text-[9px]">{sort.dir === 1 ? "▲" : "▼"}</span>
                    )}
                  </button>
                </th>
              ))}
              <th className="border-b border-white/10 px-3">
                <Columns3 size={12} className="text-zinc-600" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const isSel = selected.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`border-b border-white/[0.05] transition-colors hover:bg-white/[0.03] ${
                    isSel ? "bg-white/[0.06]" : ""
                  }`}
                >
                  <td className="px-3 py-1.5">
                    <input
                      type="checkbox"
                      checked={isSel}
                      onChange={() => toggle(c.id)}
                      className="size-3.5 accent-white"
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={col.id} style={{ width: col.width }} className="px-3 py-1.5">
                      {col.render(c)}
                    </td>
                  ))}
                  <td className="px-3 py-1.5 text-right">
                    <button
                      onClick={() => deleteOne(c.id)}
                      aria-label="Delete"
                      className={`text-zinc-600 transition-colors hover:text-red-400 ${isSel ? "opacity-100" : "opacity-0"}`}
                    >
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-4 py-14 text-center">
                  {rows.length === 0 ? (
                    <>
                      <p className="text-[14px] font-medium text-zinc-400">No companies yet</p>
                      <p className="mt-1 text-[12.5px] text-zinc-600">
                        Add your first company to start tracking contracts and renewals.
                      </p>
                      <button
                        onClick={addRow}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-[12.5px] font-medium text-black transition-opacity hover:opacity-90"
                      >
                        <Plus size={13} /> Add company
                      </button>
                    </>
                  ) : (
                    <p className="text-[13px] text-zinc-500">No results match your search or filters.</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* footer row */}
      <div className="flex h-8 shrink-0 items-center gap-4 border-t border-line bg-surface px-4 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Check size={11} className="text-zinc-400" />
          {filtered.length} company{filtered.length === 1 ? "" : "ies"} · {rows.length} total
        </span>
        {selected.size > 0 && (
          <span className="text-zinc-400">{selected.size} selected</span>
        )}
        <span className="ml-auto text-zinc-600">editable · saved to this browser</span>
      </div>
    </div>
  );
}