"use client";

/* ------------------------------------------------------------------ */
/*  n4ma motion language - Apple-style springs, no glow.            */
/*                                                                     */
/*  Restrained, physical-feeling motion: everything eases on a soft    */
/*  spring (deceleration-style, not bounce), reveals travel a few      */
/*  px with a subtle fade, and numbers roll up rather than pop.        */
/*  Nothing glows, nothing bounces badly, nothing over-animates.       */
/*  Implemented with CSS keyframes + transitions (no framer-motion)    */
/*  so the dashboard ships zero motion-library JS.                     */
/* ------------------------------------------------------------------ */

import { forwardRef, useEffect, useRef, useState } from "react";

/* The signature n4ma easing - Apple's "decelerate" spring sampled
   with a near-flat settle. Used everywhere we need a soft ease. */
export const SPRING = [0.22, 1, 0.36, 1] as const;

/* Hover/press springs - stiff so feedback feels instant. */
export const PRESS_SPRING = { type: "spring", stiffness: 500, damping: 30 } as const;
export const HOVER_SPRING = { type: "spring", stiffness: 380, damping: 28 } as const;

/** Short, restrained fade + rise reveal (8px). For cards, rows, panels. */
export const fadeUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, delay, ease: SPRING } },
});

/** Micro-reveal for list children - a touch less travel (4px). */
export const microUp = (delay = 0) => ({
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, delay, ease: SPRING } },
});

/**
 * Reveal - drop-in `<div>` that fades/rises when it enters the viewport.
 * `once` defaults true (element animates only the first time it appears).
 * Uses IntersectionObserver + a CSS transition (framer-free).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  y = 8,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  once?: boolean;
  y?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) obs.disconnect();
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { threshold: 0.1, rootMargin: "-60px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  const Comp = as as "div";
  return (
    <Comp
      ref={ref as never}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "none" : `translateY(${y}px)`,
        transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </Comp>
  );
}

/** Pressure-lift card wrapper - subtle y-lift on hover, no glow. */
export function LiftCard({
  children,
  className,
  hoverLift = 3,
}: {
  children: React.ReactNode;
  className?: string;
  hoverLift?: number;
}) {
  return (
    <div
      className={`lift-card ${className ?? ""}`}
      style={{ ["--lift" as string]: `${-hoverLift}px` }}
    >
      {children}
    </div>
  );
}

/* ---------------------------------- numbers ---------------------------------- */

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * useCountUp - animate a numeric value toward `target` once it is in view.
 * Returns a ref to attach and the current display value.
 */
export function useCountUp(target: number, duration = 1200) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      setDisplay(target * easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);

  return { ref, display };
}

/**
 * CountUp - render `<target>`'s formatted value, counting up from 0 when
 * it scrolls into view. Apple-style number roll, no pop.
 */
export function CountUp({
  target,
  format = (v: number) =>
    Math.round(v).toLocaleString("en-US", { maximumFractionDigits: 0 }),
  duration = 1200,
  className = "",
}: {
  target: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const { ref, display } = useCountUp(target, duration);
  return (
    <span ref={ref} className={className}>
      {format(display)}
    </span>
  );
}

/* ---------------------------------- cursor spotlight ---------------------------------- */

/**
 * useSpotlight - attach to an element (`spotlight-card`) to track the
 * cursor and drive the `.spotlight-glow` border highlight behind its
 * children. Sets `--mouse-x` / `--mouse-y` (0-100%) on the element.
 */
export function useSpotlight<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mouse-x", `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`);
      el.style.setProperty("--mouse-y", `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return ref;
}

/* ---------------------------------- layout transitions ---------------------------------- */

/**
 * FadeSwap - crossfade between two children by remounting with a short
 * 150-200ms CSS fade. Simplifies the old AnimatePresence swap - the key
 * change remounts, and `.fade-rise` plays the entrance.
 */
export function FadeSwap({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div key={delay} className="fade-rise" style={{ animationDuration: "0.2s" }}>
      {children}
    </div>
  );
}

/** Page entrance - CSS class applied once when the page mounts. */
export const pageEnter = {} as const;

/* ---------------------------------- pressable button ---------------------------------- */

/**
 * Pressable - wraps any element with Apple's instant-feedback press:
 * scale ~0.97 while held, back to 1 on release. Pure CSS (no motion lib).
 */
export function Pressable({
  children,
  className,
  as = "button",
  onClick,
  disabled,
  scale = 0.97,
}: {
  children: React.ReactNode;
  className?: string;
  as?: "button" | "a" | "div";
  onClick?: () => void;
  disabled?: boolean;
  scale?: number;
}) {
  const Comp = as;
  return (
    <Comp
      className={`pressable ${className ?? ""}`}
      onClick={onClick}
      disabled={as === "button" ? disabled : undefined}
      style={{ ["--press-scale" as string]: String(scale) }}
    >
      {children}
    </Comp>
  );
}

/* eslint-disable react/display-name */
export const RevealForward = forwardRef<HTMLDivElement, Parameters<typeof Reveal>[0]>(
  (props, ref) => <div ref={ref} {...(props as object)} />
);