"use client";

import { X } from "lucide-react";

/** Right-side contextual inspector. Avoids navigating away from the workspace. */
export function Inspector({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  sub?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="inspector-backdrop" onClick={onClose} />
      <aside className="inspector" role="dialog" aria-label={typeof title === "string" ? title : "Inspector"}>
        <div className="panel-header">
          <div className="min-w-0">
            <p className="panel-title truncate">{title}</p>
            {sub && <p className="panel-sub truncate">{sub}</p>}
          </div>
          <button onClick={onClose} className="toolbar-btn" aria-label="Close inspector">
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-line p-3">{footer}</div>}
      </aside>
    </>
  );
}

/** Label/value row used inside inspectors and detail panels. */
export function DetailRow({
  label,
  children,
  align = "left",
}: {
  label: string;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 px-4 py-2.5">
      <span className="shrink-0 text-[11px] font-medium tracking-[-0.01em] text-muted/80">
        {label}
      </span>
      <span
        className={`min-w-0 text-[12.5px] font-medium text-fg ${
          align === "right" ? "text-right" : ""
        }`}
      >
        {children}
      </span>
    </div>
  );
}
