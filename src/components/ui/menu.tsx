"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  Menu primitives: outside-click dismissal + fixed-position menus.  */
/*  Position is computed at render time (the trigger already exists),  */
/*  so no measurement effects are needed.                             */
/* ------------------------------------------------------------------ */

export function useDismiss(
  active: boolean,
  onClose: () => void,
  ref?: React.RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!active) return;
    const onPointer = (e: PointerEvent) => {
      if (ref?.current && ref.current.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [active, onClose, ref]);
}

export interface MenuEntry {
  label?: string;
  /** Renders as a section header. */
  kind?: "label";
  separator?: boolean;
  icon?: React.ReactNode;
  kbd?: string;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

function MenuBody({ items, onPick }: { items: MenuEntry[]; onPick: () => void }) {
  return (
    <>
      {items.map((it, i) => {
        if (it.separator) return <div key={i} className="menu-sep" />;
        if (it.kind === "label")
          return (
            <div key={i} className="menu-label">
              {it.label}
            </div>
          );
        return (
          <button
            key={i}
            className={`menu-item ${it.danger ? "danger" : ""}`}
            disabled={it.disabled}
            onClick={() => {
              onPick();
              it.onSelect?.();
            }}
          >
            {it.icon}
            {it.label}
            {it.kbd && <span className="kbd">{it.kbd}</span>}
          </button>
        );
      })}
    </>
  );
}

/** Anchored popover menu (drops below the trigger button). */
export function MenuPop({
  open,
  onClose,
  anchor,
  items,
  align = "start",
}: {
  open: boolean;
  onClose: () => void;
  anchor: React.RefObject<HTMLElement | null>;
  items: MenuEntry[];
  align?: "start" | "end";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(open, onClose, ref);

  if (!open) return null;
  const rect = anchor.current?.getBoundingClientRect();
  if (!rect) return null;
  const w = 210;
  const left =
    align === "end"
      ? Math.max(8, rect.right - w)
      : Math.min(window.innerWidth - w - 8, Math.max(8, rect.left));
  return (
    <div ref={ref} className="menu-pop" style={{ top: rect.bottom + 6, left }}>
      <MenuBody items={items} onPick={onClose} />
    </div>
  );
}

/** Right-click context menu at an arbitrary screen position. */
export function ContextMenu({
  menu,
  onClose,
  items,
}: {
  menu: { x: number; y: number } | null;
  onClose: () => void;
  items: MenuEntry[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(menu !== null, onClose, ref);

  if (!menu) return null;
  const w = 200;
  const h = Math.min(320, items.length * 29 + 14);
  const left = Math.min(window.innerWidth - w - 8, Math.max(8, menu.x));
  const top = Math.min(window.innerHeight - h - 8, Math.max(8, menu.y));
  return (
    <div ref={ref} className="menu-pop" style={{ top, left }}>
      <MenuBody items={items} onPick={onClose} />
    </div>
  );
}
