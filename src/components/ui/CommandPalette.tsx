"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search } from "lucide-react";

export interface PaletteItem {
  id: string;
  group: string;
  label: string;
  description?: string;
  keywords?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset the query and highlight when the palette opens.
  if (open && !prevOpen) {
    setPrevOpen(open);
    setQ("");
    setHi(0);
  }

  const groups = useMemo(() => {
    const query = q.trim().toLowerCase();
    const filtered = query
      ? items.filter(
          (it) =>
            it.label.toLowerCase().includes(query) ||
            (it.keywords ?? "").toLowerCase().includes(query) ||
            it.group.toLowerCase().includes(query)
        )
      : items;
    const map = new Map<string, PaletteItem[]>();
    for (const it of filtered) {
      const g = map.get(it.group) ?? [];
      g.push(it);
      map.set(it.group, g);
    }
    return [...map.entries()].map(([group, list]) => ({ group, list }));
  }, [items, q]);

  const flat = useMemo(() => groups.flatMap((g) => g.list), [groups]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHi((h) => Math.min(flat.length - 1, h + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHi((h) => Math.max(0, h - 1));
      } else if (e.key === "Enter" && flat[hi]) {
        e.preventDefault();
        flat[hi].onSelect();
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, flat, hi, onClose]);

  if (!open) return null;

  return (
    <div className="palette-overlay" onPointerDown={onClose}>
      <div className="palette" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={16} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setHi(0);
            }}
            autoFocus
            placeholder="Search vendors, contracts, pages…"
            className="palette-input"
          />
        </div>
        <div className="max-h-[46vh] overflow-y-auto py-2">
          {groups.length === 0 && (
            <p className="px-4 py-8 text-center text-[13px] text-muted">
              No results for &ldquo;{q}&rdquo;
            </p>
          )}
          {groups.map((g) => (
            <div key={g.group}>
              <div className="palette-group-label">{g.group}</div>
              {g.list.map((it) => {
                const flatIdx = flat.indexOf(it);
                return (
                  <button
                    key={it.id}
                    className={`palette-item ${flatIdx === hi ? "highlight" : ""}`}
                    onMouseEnter={() => setHi(flatIdx)}
                    onClick={() => {
                      it.onSelect();
                      onClose();
                    }}
                  >
                    {it.icon}
                    <span className="truncate">{it.label}</span>
                    {it.description && <span className="desc truncate">{it.description}</span>}
                    {flatIdx === hi && <CornerDownLeft size={13} className="ml-auto shrink-0 text-muted" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[10.5px] text-muted/70">
          <span className="flex items-center gap-1">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">↵</span>
            open
          </span>
          <span className="flex items-center gap-1">
            <span className="kbd">esc</span>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
