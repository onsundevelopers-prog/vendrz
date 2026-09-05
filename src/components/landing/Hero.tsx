"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Button } from "@/components/ui/Button";
import { EASE, CountUp } from "./motion";

/* ------------------------------------------------------------------ */
/*  Hero - sticky scroll scene.                                        */
/*                                                                     */
/*  The section is taller than the viewport; the content sticks while  */
/*  the user scrolls through it. As the page advances:                 */
/*    - the eyebrow, headline, copy and CTAs recede (rise, shrink,     */
/*      fade) at staggered depths,                                    */
/*    - the sample-review card floats FORWARD (scales up, drifts       */
/*      up), its savings figure counting up as it settles,            */
/*    - the background wash drifts slowly for depth (parallax).        */
/*  Every value is scroll-mapped through a spring, so scrolling fast   */
/*  or slow both look physically damped. Transform/opacity only.       */
/* ------------------------------------------------------------------ */

function StaggeredWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{text}</>;
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} className="inline-block overflow-hidden align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 0.75, delay: delay + i * 0.055, ease: EASE }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </>
  );
}

/* Spring-smooth any scroll-mapped MotionValue - fast attack, long glide. */
function useSmoothed(value: MotionValue<number>) {
  return useSpring(value, { stiffness: 140, damping: 26, mass: 0.6 });
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Scroll progress from the moment the section's top hits the viewport
  // top until its bottom leaves. The content is sticky for this span.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Text recedes: rises, shrinks slightly, fades.
  const eyebrowY = useSmoothed(useTransform(scrollYProgress, [0, 0.5], [0, -36]));
  const eyebrowOpacity = useTransform(scrollYProgress, [0, 0.32], [1, 0]);
  const headY = useSmoothed(useTransform(scrollYProgress, [0, 1], [0, -64]));
  const headScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const headOpacity = useTransform(scrollYProgress, [0, 0.62], [1, 0]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0]);
  const copyY = useSmoothed(useTransform(scrollYProgress, [0, 0.5], [0, -28]));
  const ctaOpacity = useTransform(scrollYProgress, [0, 0.32], [1, 0]);
  const ctaY = useSmoothed(useTransform(scrollYProgress, [0, 0.36], [0, -18]));

  // Card floats forward: scales up toward the viewer and drifts up.
  const cardY = useSmoothed(useTransform(scrollYProgress, [0, 1], [24, -24]));
  const cardScale = useTransform(scrollYProgress, [0, 1], [0.97, 1.06]);

  // Background wash drifts slowly for depth.
  const washY = useSmoothed(useTransform(scrollYProgress, [0, 1], [0, 120]));
  const washOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.35]);

  // Trust line lingers, then fades late.
  const trustOpacity = useTransform(scrollYProgress, [0, 0.55, 0.85], [1, 1, 0]);

  return (
    <section ref={sectionRef} className="relative h-[190vh] overflow-hidden bg-canvas">
      {/* sticky viewport - what the user actually sees */}
      <div className="sticky top-0 flex h-screen items-start overflow-hidden">
        {/* atmospheric floor, parallaxed */}
        <motion.div
          aria-hidden="true"
          style={reduced ? undefined : { y: washY, opacity: washOpacity }}
          className="absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(180deg,rgba(8,9,10,0)_10%,rgba(208,214,224,0.07)_100%)]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line" />

        <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-5 pb-16 pt-28 sm:pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-8 lg:pt-32">
          {/* left - the pitch, recedes on scroll */}
          <motion.div style={reduced ? undefined : { y: headY, scale: headScale, opacity: headOpacity }} className="max-w-3xl">
            <motion.p
              style={reduced ? undefined : { y: eyebrowY, opacity: eyebrowOpacity }}
              className="text-[11px] font-[510] uppercase tracking-[0.18em] text-faint"
            >
              Software spend reviews
            </motion.p>

            <h1 className="mt-5 max-w-3xl text-balance text-[44px] font-[510] leading-[1.02] tracking-[-0.022em] text-fg sm:text-[56px] lg:text-[64px]">
              <StaggeredWords text="Your business is leaking money." />
              <span className="relative mt-1 inline-block text-bone/90">
                <StaggeredWords text="N4MA finds it." delay={0.32} />
              </span>
            </h1>

            <motion.p
              style={reduced ? undefined : { y: copyY, opacity: copyOpacity }}
              className="mt-6 max-w-xl text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint"
            >
              n4ma reads the contracts and invoices behind your software
              spending and flags hidden fees, auto-renewals, price increases,
              and unused licenses. Every finding links to the exact clause, so
              you can check it yourself, with an estimate of what it costs per
              year.
            </motion.p>

            <motion.div
              style={reduced ? undefined : { y: ctaY, opacity: ctaOpacity }}
              className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
            >
              <Button href="/audit" size="lg" className="w-full sm:w-auto">
                Run a free review
              </Button>
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-1.5 px-1 py-2 text-[13.5px] font-normal text-muted transition-colors hover:text-fg"
              >
                How it works
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path d="M2 6h7M6.5 3 9 6l-2.5 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </motion.div>

            <motion.p
              style={reduced ? undefined : { opacity: trustOpacity }}
              className="mt-5 text-[11.5px] font-normal tracking-[-0.01em] text-ash"
            >
              Read-only · No signup required · First review in under two minutes
            </motion.p>
          </motion.div>

          {/* right - the sample review card, floats forward on scroll.
              Outer wrapper owns the scroll transforms; the inner card owns
              its one-time entrance, so the two never fight over a key. */}
          <motion.div
            style={reduced ? undefined : { y: cardY, scale: cardScale }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 28 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
              className="border-sheen glass-border rounded-xl p-6 backdrop-blur-xl sm:p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-[13px] font-[510] tracking-[-0.01em] text-fg">
                  Potential annual savings
                </p>
                <span className="rounded-full border border-line px-2.5 py-0.5 text-[10.5px] font-normal tracking-[-0.01em] text-muted">
                  Sample review
                </span>
              </div>

              <p className="mt-5 text-[44px] font-[510] leading-none tracking-[-0.03em] text-fg">
                <CountUp to={18420} prefix="$" duration={1.6} />
              </p>

              <div className="mt-6 divide-rule-light">
                {[
                  ["Upcoming renewal in 14 days", "$4,800"],
                  ["Unused licenses", "$7,200"],
                  ["Duplicate software", "$3,600"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4 py-3 text-[13px]"
                  >
                    <span className="font-normal tracking-[-0.01em] text-faint">{label}</span>
                    <span className="font-mono text-[12.5px] tracking-[-0.01em] text-fg">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-4 text-[11px] font-normal leading-relaxed tracking-[-0.01em] text-ash">
                Illustrative example. Your figures are computed from your own
                documents and labeled as estimates.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
