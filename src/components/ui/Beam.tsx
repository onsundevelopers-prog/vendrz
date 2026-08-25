"use client";

import { useId } from "react";

/* ------------------------------------------------------------------ */
/*  Beam — exact port of flask.do's animated light-beam sweep.        */
/*  A traveling radial-gradient beam breathes, spikes, edge-fades and */
/*  hue-shifts along the bottom edge of the wrapped element.          */
/*  Keyframes + layering mirror the flask.do implementation.          */
/* ------------------------------------------------------------------ */

interface BeamProps {
  children?: React.ReactNode;
  className?: string;
  /** Global intensity multiplier (0–1). Default 1. */
  strength?: number;
  /** Beam palette as [core, deep, accent, glow] RGB triplets. */
  colors?: [string, string, string, string];
  /** Fixed keyframe suffix so SSR + client hydration match. */
  idSuffix?: string;
  style?: React.CSSProperties;
}

export function Beam({
  children,
  className = "",
  strength = 1,
  colors,
  idSuffix,
  style,
}: BeamProps) {
  const rawId = useId();
  const suffix = (idSuffix ?? rawId).replace(/[^a-zA-Z0-9]/g, "");
  const [core, deep, accent, glow] = colors ?? [
    "52, 211, 153", // emerald-400
    "16, 185, 129", // emerald-500
    "45, 212, 191", // teal-400
    "110, 231, 183", // emerald-300
  ];

  const css = buildBeamCss(suffix, { core, deep, accent, glow });

  return (
    <div
      data-beam={suffix}
      data-active
      className={className}
      style={{ ...style, ["--beam-strength" as string]: strength }}
    >
      {children}
      <div data-beam-bloom />
      <style>{css}</style>
    </div>
  );
}

function buildBeamCss(
  id: string,
  c: { core: string; deep: string; accent: string; glow: string }
): string {
  const X = `--beam-x-${id}`;
  const W = `--beam-w-${id}`;
  const H = `--beam-h-${id}`;
  const EDGE = `--beam-edge-${id}`;
  const SPIKE = `--beam-spike-${id}`;
  const SPIKE2 = `--beam-spike2-${id}`;
  const OP = `--beam-opacity-${id}`;
  const S = "var(--beam-strength, 1)";

  return `
  [data-beam="${id}"] {
    position: relative;
    border-radius: 28px;
    overflow: visible;
  }
  [data-beam="${id}"][data-active] {
    animation:
      beam-travel-${id} 2.4s linear infinite,
      beam-edge-fade-${id} 2.4s linear infinite,
      beam-breathe-${id} 3.1s ease-in-out infinite,
      beam-spike-${id} 3.2s ease-in-out infinite,
      beam-spike2-${id} 4.1s ease-in-out infinite,
      beam-fade-in-${id} 0.15s ease forwards;
  }
  [data-beam="${id}"][data-fading] {
    animation:
      beam-travel-${id} 2.4s linear infinite,
      beam-edge-fade-${id} 2.4s linear infinite,
      beam-breathe-${id} 3.1s ease-in-out infinite,
      beam-spike-${id} 3.2s ease-in-out infinite,
      beam-spike2-${id} 4.1s ease-in-out infinite,
      beam-fade-out-${id} 0.15s ease forwards;
  }

  /* core glow along the bottom edge */
  [data-beam="${id}"][data-active]::after,
  [data-beam="${id}"][data-fading]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 27px;
    padding: 1px;
    clip-path: inset(0 round 28px);
    background:
      radial-gradient(
        ellipse calc(24px * var(${W})) calc(28px * var(${H})) at calc(var(${X}) * 100%) calc(100% + 2px),
        rgba(255, 255, 255, 0.38) 0%,
        rgba(255, 255, 255, 0.12) 30%,
        transparent 65%
      ),
      radial-gradient(ellipse calc(340px * var(${W})) calc(48px * var(${H})) at calc(var(${X}) * 100%) calc(100% + 2px), rgb(${c.core}), transparent),
      radial-gradient(ellipse calc(44px * var(${W})) calc(12px * var(${H})) at calc(var(${X}) * 100% + 60px) calc(100%), rgba(${c.accent}, 0.12), transparent),
      radial-gradient(ellipse calc(300px * var(${W})) calc(40px * var(${H})) at calc(var(${X}) * 100% - 60px) calc(100% + 2px), rgb(${c.deep}), transparent),
      radial-gradient(ellipse calc(250px * var(${W})) calc(44px * var(${H})) at calc(var(${X}) * 100% - 90px) calc(100%), rgb(${c.deep}), transparent),
      radial-gradient(ellipse calc(40px * var(${W})) calc(11px * var(${H})) at calc(var(${X}) * 100% + 80px) calc(100% - 1px), rgba(${c.glow}, 0.30), transparent),
      radial-gradient(ellipse calc(300px * var(${W})) calc(32px * var(${H})) at calc(var(${X}) * 100% + 36px) calc(100% + 1px), rgb(${c.glow}), transparent),
      radial-gradient(ellipse calc(270px * var(${W})) calc(30px * var(${H})) at calc(var(${X}) * 100% - 36px) calc(100%), rgb(${c.glow}), transparent),
      radial-gradient(ellipse calc(230px * var(${W})) calc(36px * var(${H})) at calc(var(${X}) * 100% + 110px) calc(100% + 1px), rgb(${c.deep}), transparent),
      radial-gradient(ellipse calc(220px * var(${W})) calc(38px * var(${H})) at calc(var(${X}) * 100% - 110px) calc(100% - 1px), rgb(${c.glow}), transparent);
    -webkit-mask:
      radial-gradient(
        ellipse calc(156px * var(${W})) calc(60px * var(${H})) at calc(var(${X}) * 100%) 100%,
        white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
      ),
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: source-in, xor;
    mask:
      radial-gradient(
        ellipse calc(156px * var(${W})) calc(60px * var(${H})) at calc(var(${X}) * 100%) 100%,
        white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
      ),
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: intersect, exclude;
    pointer-events: none;
    z-index: 2;
    opacity: calc(var(${OP}) * var(${EDGE}) * 0.72 * ${S});
    animation: beam-hue-shift-${id} 12s ease-in-out infinite;
  }

  /* wide soft under-glow */
  [data-beam="${id}"][data-active]::before,
  [data-beam="${id}"][data-fading]::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 28px;
    background:
      radial-gradient(ellipse calc(300px * var(${W})) calc(40px * var(${H})) at calc(var(${X}) * 100%) calc(100%), rgba(${c.core}, 0.70), transparent),
      radial-gradient(ellipse calc(36px * var(${W})) calc(10px * var(${H})) at calc(var(${X}) * 100% + 60px) calc(100% - 3px), rgba(${c.accent}, 0.08), transparent),
      radial-gradient(ellipse calc(260px * var(${W})) calc(34px * var(${H})) at calc(var(${X}) * 100% - 60px) calc(100%), rgba(${c.deep}, 0.68), transparent),
      radial-gradient(ellipse calc(220px * var(${W})) calc(38px * var(${H})) at calc(var(${X}) * 100% - 90px) calc(100% - 2px), rgba(${c.deep}, 0.60), transparent),
      radial-gradient(ellipse calc(36px * var(${W})) calc(9px * var(${H})) at calc(var(${X}) * 100% + 80px) calc(100% - 1px), rgba(${c.glow}, 0.15), transparent),
      radial-gradient(ellipse calc(260px * var(${W})) calc(28px * var(${H})) at calc(var(${X}) * 100% + 36px) calc(100%), rgba(${c.glow}, 0.65), transparent),
      radial-gradient(ellipse calc(220px * var(${W})) calc(26px * var(${H})) at calc(var(${X}) * 100% - 36px) calc(100% - 2px), rgba(${c.glow}, 0.58), transparent),
      radial-gradient(ellipse calc(190px * var(${W})) calc(32px * var(${H})) at calc(var(${X}) * 100% + 110px) calc(100%), rgba(${c.deep}, 0.62), transparent),
      radial-gradient(ellipse calc(170px * var(${W})) calc(34px * var(${H})) at calc(var(${X}) * 100% - 110px) calc(100% - 1px), rgba(${c.glow}, 0.65), transparent);
    box-shadow: inset 0 0 9px 1px rgba(255, 255, 255, 0.1);
    -webkit-mask-image:
      radial-gradient(
        ellipse calc(156px * var(${W})) calc(60px * var(${H})) at calc(var(${X}) * 100%) 100%,
        white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
      ),
      linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
      linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
    -webkit-mask-composite: source-in, source-over;
    mask-image:
      radial-gradient(
        ellipse calc(156px * var(${W})) calc(60px * var(${H})) at calc(var(${X}) * 100%) 100%,
        white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
      ),
      linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
      linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
    mask-composite: intersect, add;
    pointer-events: none;
    z-index: 1;
    opacity: calc(var(${OP}) * var(${EDGE}) * 0.70 * ${S});
    clip-path: inset(0 round 28px);
    animation: beam-hue-shift-${id} 12s ease-in-out infinite;
  }

  /* blurred bloom layer */
  [data-beam="${id}"] [data-beam-bloom] {
    display: none;
    position: absolute;
    inset: 0;
    border-radius: 27px;
    padding: 0;
    -webkit-mask:
      radial-gradient(
        ellipse calc(380px * var(${W})) calc(170px * var(${H})) at calc(var(${X}) * 100%) 100%,
        white 0%, rgba(255, 255, 255, 0.65) 40%, transparent 100%
      );
    -webkit-mask-composite: source-over;
    mask:
      radial-gradient(
        ellipse calc(380px * var(${W})) calc(170px * var(${H})) at calc(var(${X}) * 100%) 100%,
        white 0%, rgba(255, 255, 255, 0.65) 40%, transparent 100%
      );
    mask-composite: add;
    background:
      radial-gradient(ellipse calc(0.8px * var(${SPIKE})) calc(92px * var(${H}) * var(--beam-line-scale, 1)) at 8% calc(100% - 2px), rgb(${c.glow}), rgb(${c.glow}) 30%, transparent 88%),
      radial-gradient(ellipse calc(10px * var(${SPIKE2})) calc(35px * var(${H}) * var(--beam-line-scale, 1)) at 22% calc(100% - 4px), rgba(${c.glow}, 0.55), rgba(${c.glow}, 0.49) 50%, transparent 95%),
      radial-gradient(ellipse calc(2px * (2 - var(${SPIKE}))) calc(72px * var(${H}) * var(--beam-line-scale, 1)) at 36% calc(100% - 3px), rgb(${c.core}), rgba(${c.core}, 1) 40%, transparent 90%),
      radial-gradient(ellipse calc(14px * var(${SPIKE2})) calc(28px * var(${H}) * var(--beam-line-scale, 1)) at 50% calc(100% - 2px), rgba(${c.accent}, 0.08), rgba(${c.accent}, 0.03) 55%, transparent 96%),
      radial-gradient(ellipse calc(1.2px * (2 - var(${SPIKE2}))) calc(85px * var(${H}) * var(--beam-line-scale, 1)) at 64% calc(100% - 4px), rgb(${c.deep}), rgba(${c.deep}, 1) 35%, transparent 89%),
      radial-gradient(ellipse calc(7px * var(${SPIKE})) calc(45px * var(${H}) * var(--beam-line-scale, 1)) at 78% calc(100% - 2px), rgba(${c.glow}, 0.15), rgba(${c.glow}, 0.06) 48%, transparent 94%),
      radial-gradient(ellipse calc(0.6px * (2 - var(${SPIKE}))) calc(60px * var(${H}) * var(--beam-line-scale, 1)) at 92% calc(100% - 3px), rgb(${c.glow}), rgba(${c.glow}, 1) 42%, transparent 91%),
      radial-gradient(ellipse calc(40px * var(${SPIKE})) calc(28px * var(${SPIKE2})) at calc(var(${X}) * 100%) calc(100% + 1px), rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.9) 20%, rgba(255, 255, 255, 0.5) 50%, transparent 100%),
      radial-gradient(ellipse calc(110px * var(${W})) calc(80px * var(${H}) * var(--beam-line-scale, 1)) at calc(var(${X}) * 100%) 100%, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.12) 25%, rgba(255, 255, 255, 0.03) 55%, transparent 80%);
    pointer-events: none;
    z-index: 3;
    opacity: 0;
  }
  [data-beam="${id}"][data-active] [data-beam-bloom],
  [data-beam="${id}"][data-fading] [data-beam-bloom] {
    display: block;
    opacity: calc(var(${OP}) * var(${EDGE}) * 0.80 * ${S});
    animation: beam-hue-shift-bloom-${id} 8s ease-in-out infinite;
  }

  @keyframes beam-travel-${id} {
    0%   { ${X}: -0.02; ${W}: 1.0; }
    10%  { ${X}: 0.10;  ${W}: 1.1; }
    20%  { ${X}: 0.22;  ${W}: 1.2; }
    30%  { ${X}: 0.33;  ${W}: 1.3; }
    40%  { ${X}: 0.43;  ${W}: 1.4; }
    50%  { ${X}: 0.5;   ${W}: 1.5; }
    60%  { ${X}: 0.57;  ${W}: 1.4; }
    70%  { ${X}: 0.67;  ${W}: 1.3; }
    80%  { ${X}: 0.78;  ${W}: 1.2; }
    90%  { ${X}: 0.90;  ${W}: 1.1; }
    100% { ${X}: 1.02;  ${W}: 1.0; }
  }
  @keyframes beam-edge-fade-${id} {
    0%    { ${EDGE}: 0; }
    3%    { ${EDGE}: 0.4; }
    10%   { ${EDGE}: 1; }
    90%   { ${EDGE}: 1; }
    97%   { ${EDGE}: 0.4; }
    100%  { ${EDGE}: 0; }
  }
  @keyframes beam-breathe-${id} {
    0%, 100% { ${H}: 0.8; }
    25%      { ${H}: 1.25; }
    55%      { ${H}: 0.85; }
    80%      { ${H}: 1.3; }
  }
  @keyframes beam-spike-${id} {
    0%   { ${SPIKE}: 0.8; }
    25%  { ${SPIKE}: 1.3; }
    50%  { ${SPIKE}: 0.9; }
    75%  { ${SPIKE}: 1.4; }
    100% { ${SPIKE}: 0.8; }
  }
  @keyframes beam-spike2-${id} {
    0%   { ${SPIKE2}: 1.2; }
    25%  { ${SPIKE2}: 0.7; }
    50%  { ${SPIKE2}: 1.4; }
    75%  { ${SPIKE2}: 0.8; }
    100% { ${SPIKE2}: 1.2; }
  }
  @keyframes beam-fade-in-${id} {
    to { ${OP}: 1; }
  }
  @keyframes beam-fade-out-${id} {
    from { ${OP}: 1; }
    to { ${OP}: 0; }
  }
  @keyframes beam-hue-shift-${id} {
    0% { filter: hue-rotate(-0deg) brightness(1.30) saturate(1.20); }
    50% { filter: hue-rotate(0deg) brightness(1.30) saturate(1.20); }
    100% { filter: hue-rotate(-0deg) brightness(1.30) saturate(1.20); }
  }
  @keyframes beam-hue-shift-bloom-${id} {
    0% { filter: blur(18px) hue-rotate(-10deg) brightness(1.30) saturate(1.20); }
    50% { filter: blur(18px) hue-rotate(10deg) brightness(1.30) saturate(1.20); }
    100% { filter: blur(18px) hue-rotate(-10deg) brightness(1.30) saturate(1.20); }
  }
  `;
}
