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
/*  Hero - sticky scroll scene for video feedback product.            */
/*                                                                     */
/*  Mirrors flask.do's minimal black premium layout:                  */
/*    - centered eyebrow, big two-line heading, muted subcopy         */
/*    - two CTAs (Try free = white pill, Book demo = dark pill)       */
/*    - the product recording sits below as the hero visual           */
/*  Scroll behavior: text recedes, recording floats forward.         */
/*  NOTE: product copy is intentionally the FLASK video feedback      */
/*  product, not N4MA. If you want N4MA wording, that is a copy     */
/*  change only - the layout and hero video placement stay the same. */
/* ------------------------------------------------------------------ */

function StaggeredWords({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{text}</>;
  const words = text.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden align-bottom"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{
              duration: 0.75,
              delay: delay + i * 0.055,
              ease: EASE,
            }}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </>
  );
}

/* Spring-smooth any scroll-mapped MotionValue. */
function useSmoothed(value: MotionValue<number>) {
  return useSpring(value, { stiffness: 140, damping: 26, mass: 0.6 });
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  // Scroll progress through the section.
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

  // Recording floats forward: scales up toward the viewer and drifts up.
  const videoY = useSmoothed(useTransform(scrollYProgress, [0, 1], [24, -24]));
  const videoScale = useTransform(scrollYProgress, [0, 1], [0.97, 1.04]);

  // Trust line lingers, then fades late.
  const trustOpacity = useTransform(scrollYProgress, [0, 0.55, 0.85], [1, 1, 0]);

  return (
    <section ref={sectionRef} className="relative h-[190vh] overflow-hidden bg-canvas">
      {/* sticky viewport - what the user actually sees */}
      <div className="sticky top-0 flex h-screen items-start overflow-hidden">
        {/* atmospheric floor, parallaxed */}
        <motion.div
          aria-hidden="true"
          style={reduced ? undefined : { y: videoY, opacity: 0.4 }}
          className="absolute inset-x-0 top-0 h-[560px] bg-[linear-gradient(180deg,rgba(8,9,10,0)_10%,rgba(255,255,255,0.04)_100%)]"
        />
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-line" />

        <div className="relative mx-auto grid w-full max-w-[1200px] grid-cols-1 items-center gap-12 px-5 pb-16 pt-28 sm:pb-20 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8 lg:px-8 lg:pt-32">
          {/* left - the pitch, recedes on scroll */}
          <motion.div
            style={reduced ? undefined : { y: headY, scale: headScale, opacity: headOpacity }}
            className="max-w-3xl"
          >
            {/* Product Hunt badge */}
            <div className="mb-6 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-[11px] font-[510] tracking-[0.04em] uppercase text-muted">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-coral text-white text-[10px] font-bold">
                  P
                </span>
                Product Hunt
                <span className="ml-1.5 text-ash">#1 Product of the Month</span>
              <span className="ml-2 flex h-4 w-4 items-center justify-center rounded-full border border-line text-[9px] text-ash" aria-hidden="true">✦</span>
              </span>
            </div>

            <h1 className="mt-5 max-w-3xl text-balance text-[44px] font-[510] leading-[1.02] tracking-[-0.022em] text-fg sm:text-[56px] lg:text-[64px]">
              <StaggeredWords text="Scan your contracts in minutes," />
              <span className="relative mt-1 inline-block text-bone/90">
                <StaggeredWords text="without the spreadsheets." delay={0.32} />
              </span>
            </h1>

            <motion.p
              style={reduced ? undefined : { y: copyY, opacity: copyOpacity }}
              className="mt-6 max-w-xl text-pretty text-[16px] font-normal leading-[1.5] tracking-[-0.011em] text-faint"
            >
              Upload a contract, or connect Gmail, Google Drive, or Slack read-only,
              and N4MA finds the renewal dates, cancellation deadlines, price escalations,
              fees, and auto-renewals - each with its source document and an annual-cost
              estimate. The review is free and takes under two minutes.
            </motion.p>

            <motion.div
              style={reduced ? undefined : { y: ctaY, opacity: ctaOpacity }}
              className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
            >
              <Button href="/auth?mode=signup" size="lg" className="w-full sm:w-auto bg-white text-black hover:bg-bone">
                Try N4MA Free
              </Button>
              <a
                href="#how-it-works"
                className="group inline-flex items-center gap-1.5 px-1 py-2 text-[13.5px] font-normal text-muted transition-colors hover:text-fg"
              >
                Run a free review
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  <path
                    d="M2 6h7M6.5 3 9 6l-2.5 3"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </motion.div>

            <motion.p
              style={reduced ? undefined : { opacity: trustOpacity }}
              className="mt-5 text-[11.5px] font-normal tracking-[-0.01em] text-ash"
            >
              No credit card required · Free 14-day trial · Works on any contract
            </motion.p>
          </motion.div>

          {/* right - the product recording, floats forward on scroll */}
          <motion.div
            style={reduced ? undefined : { y: videoY, scale: videoScale }}
            className="relative mx-auto w-full max-w-md lg:max-w-none"
          >
            <motion.div
              initial={reduced ? undefined : { opacity: 0, y: 28 }}
              animate={reduced ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
              className="border-sheen rounded-xl sm:rounded-2xl overflow-hidden bg-surface"
            >
              {/* Video player frame - mirrors flask.do UI preview */}
              <div className="relative aspect-video w-full overflow-hidden">
                {/* Subtle top bar like the flask UI */}
                <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 border-b border-line/40 bg-surface/80 px-3 backdrop-blur-sm">
                  <span className="text-[11px] font-[510] tracking-[-0.01em] text-fg">n4ma</span>
                  <span className="h-3 w-px bg-line" />
                  <span className="text-[11px] font-normal tracking-[-0.01em] text-muted">
                    Adobe / EULA
                  </span>
                  <span className="ml-auto text-[10px] font-mono text-ash">v2</span>
                </div>

                {/* The hero recording */}
                <video
                  src="/hero-video.mp4"
                  className="h-full w-full object-contain bg-black/40"
                  autoPlay
                  muted
                  loop
                  playsInline
                  aria-label="N4MA contract review product demo"
                />

                {/* Play overlay hint */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 hover:opacity-100">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/10 backdrop-blur-sm">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M6 4l10 5-10 5V4z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Subtle label under the video */}
              <div className="mx-4 mb-4 flex items-center gap-3 border-t border-line/40 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-surface ring-1 ring-line">
                  <span className="text-[9px] font-bold text-fg">N</span>
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-[12px] font-[510] tracking-[-0.01em] text-fg">N4MA Workspace</span>
                  <span className="text-[10.5px] font-normal tracking-[-0.01em] text-muted">
                    Adobe EULA Review
                  </span>
                </div>
                <span className="text-[10px] font-mono text-ash">42:12</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
