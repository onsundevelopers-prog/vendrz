"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/* ------------------------------------------------------------------ */
/*  SmoothScroll - friction-based page scrolling (Lenis).              */
/*                                                                     */
/*  Replaces the browser's default instant wheel steps with a          */
/*  damped glide matched to the house easing, so the sticky hero and   */
/*  scroll-driven sections feel fluid instead of steppy. Disabled      */
/*  entirely under prefers-reduced-motion, and it never hijacks        */
/*  input: touch, keyboard, scrollbar, and in-page anchors keep        */
/*  native behavior.                                                   */
/* ------------------------------------------------------------------ */

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // native scrolling for reduced-motion users
    }

    const lenis = new Lenis({
      duration: 1.15,
      // Match the house curve (fast attack, long glide).
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Wheel multiplier kept gentle - friction, not momentum.
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
    });

    let frame: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // In-page anchors (#how-it-works etc.) glide instead of jumping.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest?.(
        'a[href^="#"]'
      ) as HTMLAnchorElement | null;
      if (!anchor) return;
      const id = anchor.getAttribute("href")?.slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: -64 });
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);

  return null;
}
