import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ArrowUp, ShieldAlert, Sparkles } from "lucide-react";
import { C, FONT } from "../theme";
import { panel, WinBar, VendorAlert } from "../uikit";
import { Fade, Vignette, TypingDots, Pop, Caret } from "../anim";

/* THE AI: a chat window with a typed question, a working beat, the
   answer "7 vendors require attention", then three vendor alerts
   materialize underneath as the AI expands the results. */

const ALERTS = [
  {
    dot: C.danger,
    name: "Acme Software",
    detail: "Renewal approaching · 14 days",
    at: 162,
  },
  {
    dot: C.warn,
    name: "Northwind Cloud",
    detail: "Price increase detected",
    at: 202,
  },
  {
    dot: C.danger,
    name: "Brightline Services",
    detail: "Cancellation window closing",
    at: 242,
  },
] as const;

export const Scene05: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Camera settles the window gently as the scene opens.
  const settle = interpolate(frame, [0, 24], [1.035, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
  });

  const qText = "What contracts need attention this month?";
  const charsTyped = Math.max(0, Math.floor((frame - 12) * (18 / fps)));

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Vignette strength={0.5} />

      {/* Header */}
      <Fade at={0} dur={14} dy={12} style={{ position: "absolute", top: 64, left: 110 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 46,
              letterSpacing: "-0.03em",
              color: C.fg,
            }}
          >
            Just ask.
          </span>
          <span style={{ fontFamily: FONT, fontSize: 19, color: C.fg3 }}>
            Plain English, real answers.
          </span>
        </div>
      </Fade>

      {/* Chat window */}
      <div
        style={{
          position: "absolute",
          top: 240,
          left: 560,
          width: 800,
          ...panel,
          transform: `scale(${settle})`,
        }}
      >
        <WinBar
          title="N4MA AI"
          icon={<Sparkles size={13} color={C.teal} />}
          right={<span style={{ fontSize: 11.5, color: C.fg3 }}>gpt-style agent · read-only</span>}
        />
        <div style={{ padding: "24px 26px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* User bubble */}
          <Fade at={6} dur={12} style={{ alignSelf: "flex-end", maxWidth: 560 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.09)",
                border: `1px solid ${C.hairline}`,
                borderRadius: 14,
                borderBottomRightRadius: 4,
                padding: "13px 18px",
              }}
            >
              <span style={{ fontFamily: FONT, fontSize: 17.5, color: C.fg, lineHeight: 1.45 }}>
                {qText.slice(0, charsTyped)}
                {frame >= 12 && frame < 12 + qText.length * (fps / 18) ? <Caret height={20} /> : null}
              </span>
            </div>
          </Fade>

          {/* Typing dots */}
          <Fade at={78} dur={8} style={{ display: "flex", padding: "0 2px" }}>
            <TypingDots at={78} />
          </Fade>

          {/* Assistant answer */}
          <Fade at={96} dur={16} dy={12}>
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Sparkles size={14} color={C.fg} />
              </span>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.hairlineSoft}`,
                  borderRadius: 14,
                  borderTopLeftRadius: 4,
                  padding: "14px 18px",
                }}
              >
                <span style={{ fontFamily: FONT, fontSize: 17.5, color: C.fg, lineHeight: 1.45 }}>
                  Found{" "}
                  <span style={{ fontWeight: 750, fontSize: 24, color: C.fg }}>
                    7 vendors
                  </span>{" "}
                  that need attention.
                </span>
              </div>
            </div>
          </Fade>
        </div>
      </div>

      {/* Expanding alert rows below the window */}
      <div
        style={{
          position: "absolute",
          top: 686,
          left: 640,
          width: 640,
          display: "flex",
          flexDirection: "column",
          gap: 11,
        }}
      >
        {ALERTS.map((a, i) => (
          <div key={i} style={{ opacity: frame < a.at ? 0 : 1 }}>
            <Pop at={a.at} scale={0.97}>
              <VendorAlert
                dot={a.dot}
                name={a.name}
                detail={a.detail}
                icon={<ArrowUp size={13} style={{ transform: "rotate(45deg)" }} color={C.fg3} />}
              />
            </Pop>
          </div>
        ))}
      </div>

      {/* Danger hint caption bottom-right once rows land */}
      <Fade at={262} dur={16}>
        <div
          style={{
            position: "absolute",
            bottom: 64,
            right: 110,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontFamily: FONT,
            fontSize: 16.5,
            color: C.fg3,
          }}
        >
          <ShieldAlert size={16} color={C.danger} />
          AI flags what humans miss.
        </div>
      </Fade>
    </AbsoluteFill>
  );
};
