"use client";

import { useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type HTMLMotionProps,
} from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Shared landing motion system.                                      */
/*                                                                     */
/*  One easing curve everywhere (fast attack, long glide - the Framer  */
/*  / iOS standard), stagger offsets, and two primitives:              */
/*    <Reveal>   - fade + rise (+ optional scale) on viewport entry    */
/*    <CountUp>  - number that counts up when scrolled into view       */
/*  Everything animates transform/opacity only, so sections stay on    */
/*  the compositor thread (60fps). `once: true` keeps sections stable  */
/*  after entry - no re-triggering, no layout shift.                   */
/* ------------------------------------------------------------------ */

export const EASE = [0.22, 1, 0.36, 1] as const;

export const STAGGER_MS = 70;

type RevealProps = HTMLMotionProps<"div"> & {
  /** Rise distance in px. 0 = fade/scale only. */
  rise?: number;
  /** Start scale. 1 = no scale-in. */
  scaleFrom?: number;
  /** Extra delay before this element starts (s). */
  delay?: number;
  /** Re-trigger every time the element enters the viewport. */
  everyEntry?: boolean;
};

export function Reveal({
  rise = 18,
  scaleFrom = 1,
  delay = 0,
  everyEntry = false,
  transition,
  ...rest
}: RevealProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: rise, scale: scaleFrom }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{
        once: !everyEntry,
        margin: "-64px 0px -64px 0px",
      }}
      transition={
        transition ?? {
          duration: 0.7,
          delay,
          ease: EASE,
        }
      }
      style={{ willChange: "transform, opacity" }}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  CountUp - animates from 0 (or `from`) to `to` when the element     */
/*  enters the viewport. Rendered as tabular figures so digits don't   */
/*  shift width mid-count. Uses a spring for a physical settle.        */
/* ------------------------------------------------------------------ */

export function CountUp({
  to,
  from = 0,
  prefix = "",
  suffix = "",
  duration = 1.4,
  className,
}: {
  to: number;
  from?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-48px" });
  const raw = useMotionValue(from);
  // Spring smooths the count; duration tuning keeps it readable.
  const spring = useSpring(raw, {
    duration: duration * 1000,
    bounce: 0,
  });
  const display = useTransform(spring, (v) =>
    `${prefix}${Math.round(v).toLocaleString("en-US")}${suffix}`
  );

  useEffect(() => {
    if (inView) raw.set(to);
  }, [inView, raw, to]);

  return (
    <motion.span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {display}
    </motion.span>
  );
}
