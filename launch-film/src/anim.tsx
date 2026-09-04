import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { C } from "./theme";
import { easings } from "./anim/easings";

/* ------------------------------------------------------------------ */
/*  Primitive motion helpers. All entrance animations are opacity +    */
/*  small translate/scale, never decorative bounce beyond a soft pop.  */
/* ------------------------------------------------------------------ */

/** Fade + rise entrance. */
export const Fade: React.FC<{
  children: React.ReactNode;
  at?: number;
  dur?: number;
  dy?: number;
  from?: number;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, at = 0, dur = 16, dy = 14, from = 0, style, className }) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  const opacity = interpolate(local, [0, 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(local, [0, dur], [dy, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.outExpo,
  });
  if (local < from) return null;
  return (
    <div
      className={className}
      style={{
        opacity: local < 0 ? 0 : opacity,
        transform: local < 0 ? undefined : `translateY(${y}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Scale pop-in with a soft overshoot (capped), for cards/chips. */
export const Pop: React.FC<{
  children: React.ReactNode;
  at?: number;
  scale?: number;
  style?: React.CSSProperties;
  className?: string;
}> = ({ children, at = 0, scale = 1, style, className }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - at;
  const s = spring({
    frame: local,
    fps,
    config: { damping: 14, stiffness: 160, mass: 0.6 },
  });
  if (local < 0) return null;
  return (
    <div
      className={className}
      style={{
        opacity: interpolate(local, [0, 4], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
        transform: `scale(${scale * (0.86 + 0.14 * s)})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Left-to-right mask reveal for lines of copy / UI bars. */
export const Reveal: React.FC<{
  children: React.ReactNode;
  at?: number;
  dur?: number;
  horizontal?: boolean;
  style?: React.CSSProperties;
}> = ({ children, at = 0, dur = 18, horizontal = true, style }) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  const p = interpolate(local, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: easings.outExpo,
  });
  if (local < 0) return null;
  return (
    <div
      style={{
        ...style,
        clipPath: horizontal
          ? `inset(0 ${(1 - p) * 100}% 0 0)`
          : `inset(${(1 - p) * 100}% 0 0 0)`,
      }}
    >
      {children}
    </div>
  );
};

/** Character-by-character typewriter. */
export const Typed: React.FC<{
  text: string;
  at?: number;
  cps?: number; // chars per second
  style?: React.CSSProperties;
}> = ({ text, at = 0, cps = 18, style }) => {
  const frame = useCurrentFrame();
  const chars = Math.max(0, Math.floor((frame - at) * (cps / 30)));
  if (frame < at) return null;
  return (
    <span style={{ ...style }} aria-label={text}>
      {text.slice(0, chars)}
    </span>
  );
};

/** Blinking caret for typing states. */
export const Caret: React.FC<{ color?: string; height?: number }> = ({
  color = C.fg2,
  height = 18,
}) => {
  const frame = useCurrentFrame();
  const on = Math.floor(frame / 12) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height,
        marginLeft: 2,
        verticalAlign: "-3px",
        background: color,
        opacity: on ? 1 : 0.15,
      }}
    />
  );
};

/** Typing dots indicator (three staggered pulses). */
export const TypingDots: React.FC<{ at?: number }> = ({ at = 0 }) => {
  const frame = useCurrentFrame();
  const local = frame - at;
  if (local < 0) return null;
  return (
    <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}>
      {[0, 1, 2].map((i) => {
        const p = interpolate(local, [i * 5, i * 5 + 8, i * 5 + 16], [0.2, 1, 0.2], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: C.fg3,
              opacity: p,
            }}
          />
        );
      })}
    </span>
  );
};

/** Eased numeric counter. */
export const Counter: React.FC<{
  to: number;
  at?: number;
  dur?: number;
  prefix?: string;
  decimals?: number;
  style?: React.CSSProperties;
}> = ({ to, at = 0, dur = 50, prefix = "", decimals = 0, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - at, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const val = to * p;
  const formatted =
    decimals > 0
      ? val.toFixed(decimals)
      : Math.round(val).toLocaleString("en-US");
  return <span style={style}>{`${prefix}${formatted}`}</span>;
};

/** Full-frame subtle vignette. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.5 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse 75% 65% at 50% 45%, transparent 55%, rgba(0,0,0,${0.55 * strength}))`,
    }}
  />
);

/** Fade-out helper at the very end of a scene (pre-cut). */
export const Out: React.FC<{ at: number; dur?: number; children?: React.ReactNode }> = ({
  at,
  dur = 10,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [at, at + dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <div style={{ opacity }}>{children}</div>;
};
