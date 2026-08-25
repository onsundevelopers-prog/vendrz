"use client";

import {
  useRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

/* ------------------------------------------------------------------ */
/*  Cursor spotlight (Linear style) - a radial glow that follows the  */
/*  pointer across dark card surfaces.                                 */
/* ------------------------------------------------------------------ */

export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const onMouseMove = (e: MouseEvent<T>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  };

  return { ref, onMouseMove };
}

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Traveling 1px border-beam around the perimeter (active/focused cards). */
  beam?: boolean;
  children: ReactNode;
}

export function SpotlightCard({
  beam = false,
  className = "",
  children,
  ...rest
}: SpotlightCardProps) {
  const { ref, onMouseMove } = useSpotlight<HTMLDivElement>();

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      className={`spotlight-card ${beam ? "border-beam" : ""} ${className}`}
      {...rest}
    >
      <div className="spotlight-glow" aria-hidden="true" />
      {children}
    </div>
  );
}
