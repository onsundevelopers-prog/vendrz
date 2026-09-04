import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { C, FONT } from "../theme";
import { Eyebrow } from "../uikit";
import { Counter, Vignette } from "../anim";

/* THE OVERVIEW: zoom back from the product to the full picture - four
   stat cards animate up over dimmed real footage while the VO lands. */

const STATS = [
  {
    label: "Annual Vendor Spend",
    prefix: "$",
    to: 1.24,
    decimals: 2,
    suffix: "M",
    at: 30,
    accent: C.fg,
    icon: null,
  },
  {
    label: "Potential Savings",
    prefix: "$",
    to: 184,
    decimals: 0,
    suffix: "K",
    at: 54,
    accent: C.teal,
    icon: <TrendingUp size={15} />,
  },
  {
    label: "Upcoming Renewals",
    prefix: "",
    to: 12,
    decimals: 0,
    suffix: "",
    at: 78,
    accent: C.fg,
    icon: null,
  },
  {
    label: "At-Risk Vendors",
    prefix: "",
    to: 4,
    decimals: 0,
    suffix: "",
    at: 102,
    accent: C.danger,
    icon: <TrendingDown size={15} />,
  },
] as const;

export const Scene07: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow zoom-out reveals the whole landscape.
  const zoom = interpolate(frame, [0, 240], [1.14, 1.02], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
  });
  const footageIn = interpolate(frame, [0, 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const footageOut = interpolate(frame, [210, 236], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const footageOpacity = footageIn * footageOut;

  const titleIn = interpolate(frame, [10, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Real footage backdrop, dimmed */}
      <div style={{ position: "absolute", inset: 0, opacity: footageOpacity, overflow: "hidden" }}>
        {/* 7s clip: bounded Sequence so it unmounts cleanly at frame 210. */}
        <Sequence from={0} durationInFrames={210}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})` }}>
            <OffthreadVideo
              src={staticFile("footage-b.webm")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </Sequence>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,9,10,0.9) 0%, rgba(8,9,10,0.5) 30%, rgba(8,9,10,0.55) 60%, rgba(8,9,10,0.96) 100%)",
          }}
        />
      </div>

      {/* Title block */}
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 110,
          opacity: titleIn,
          transform: `translateY(${(1 - titleIn) * 18}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <Eyebrow>The overview</Eyebrow>
        <span
          style={{
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 52,
            letterSpacing: "-0.03em",
            color: C.fg,
            lineHeight: 1.08,
          }}
        >
          See your entire vendor landscape.
        </span>
      </div>

      {/* Stat cards */}
      <div
        style={{
          position: "absolute",
          left: 110,
          right: 110,
          bottom: 96,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 18,
        }}
      >
        {STATS.map((s, i) => {
          const cardIn = interpolate(frame, [s.at, s.at + 16], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: (t: number) => 1 - Math.pow(1 - t, 3),
          });
          const visible = frame >= s.at;
          return (
            <div
              key={i}
              style={{
                background: "rgba(16,16,20,0.66)",
                border: `1px solid ${C.hairline}`,
                borderRadius: 16,
                padding: "22px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                backdropFilter: "blur(10px)",
                opacity: visible ? cardIn : 0,
                transform: `translateY(${(1 - cardIn) * 24}px)`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontFamily: FONT, fontSize: 14.5, color: C.fg3 }}>
                  {s.label}
                </span>
                {s.icon ? (
                  <span style={{ color: s.accent, display: "flex" }}>{s.icon}</span>
                ) : null}
              </div>
              <span style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <Counter
                  to={s.to}
                  at={s.at}
                  dur={52}
                  prefix={s.prefix}
                  decimals={s.decimals}
                  style={{
                    fontFamily: FONT,
                    fontWeight: 750,
                    fontSize: 44,
                    letterSpacing: "-0.03em",
                    color: s.accent,
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT,
                    fontWeight: 650,
                    fontSize: 24,
                    color: s.accent,
                  }}
                >
                  {s.suffix}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <Vignette strength={0.6} />
    </AbsoluteFill>
  );
};
