"use client";

import { useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  RollingNumber — NumberFlow-style rolling digit counter.           */
/*  Each digit lives in its own vertical mask; on value change the    */
/*  column rolls to the target digit with a springy ease. Mirrors     */
/*  the number-flow web component flask.do uses for its timer.        */
/* ------------------------------------------------------------------ */

export function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

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
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animates `value` from 0 → value when the element scrolls into view.
 * Pass `start` to begin from a non-zero number.
 */
export function useCountUp(value: number, start: number, duration = 1400) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.2);
  const [display, setDisplay] = useState(start);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      setDisplay(start + (value - start) * easeOutExpo(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, start, duration]);

  return { ref, display };
}

function DigitCell({ char }: { char: string }) {
  if (!/\d/.test(char)) {
    return <span className="rn-symbol">{char}</span>;
  }
  const n = Number(char);
  return (
    <span className="rn-mask" aria-hidden="true">
      <span
        className="rn-col"
        style={{ transform: `translateY(-${n}em)` }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <span key={d} className="rn-item">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

/**
 * RollingNumber — renders `value` (formatted by `format`) with rolling
 * digit cells. Re-rolls whenever `value` changes.
 */
export function RollingNumber({
  value,
  format = (v: number) => Math.round(v).toLocaleString("en-US"),
  className = "",
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const str = format(value);
  return (
    <span className={`rn ${className}`} aria-label={str}>
      {str.split("").map((ch, i) => (
        <DigitCell key={`${i}-${ch}`} char={ch} />
      ))}
    </span>
  );
}

/**
 * AnimatedStat — counts up from 0 when scrolled into view, rendering
 * through RollingNumber for the rolling-digit effect.
 */
export function AnimatedStat({
  value,
  format = (v: number) => Math.round(v).toLocaleString("en-US"),
  duration = 1400,
  className = "",
}: {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  className?: string;
}) {
  const { ref, display } = useCountUp(value, 0, duration);
  return (
    <span ref={ref} className={`rn ${className}`}>
      {format(display)
        .split("")
        .map((ch, i) => (
          <DigitCell key={`${i}-${ch}`} char={ch} />
        ))}
    </span>
  );
}
