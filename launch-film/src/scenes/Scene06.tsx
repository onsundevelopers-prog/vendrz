import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  Sparkles,
  MousePointer2,
  ArrowRight,
  FileSearch,
  CheckCircle2,
  Send,
} from "lucide-react";
import { C, FONT } from "../theme";
import { panel, WinBar, Button } from "../uikit";
import { Fade, Vignette, Pop } from "../anim";

/* ACTION: a vendor side panel opens with the AI recommendation, the
   user clicks "Review vendor", and the interface flows into a three-step
   action workflow. */

const STEPS = [
  { icon: <FileSearch size={15} />, label: "Review terms" },
  { icon: <CheckCircle2 size={15} />, label: "Confirm decision" },
  { icon: <Send size={15} />, label: "Send to vendor" },
] as const;

const CLICK = 172;

export const Scene06: React.FC = () => {
  const frame = useCurrentFrame();

  // Panel slides in from the right after the vendor is selected.
  const panelX = interpolate(frame, [104, 132], [560, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
  });

  // Cursor appears above the button at 148, presses it at CLICK.
  const cursorOpacity = interpolate(frame, [146, 152], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorY = interpolate(frame, [146, CLICK], [-60, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorGone = interpolate(frame, [CLICK, CLICK + 5], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Button press + white flash at CLICK.
  const press = interpolate(frame, [CLICK, CLICK + 4, CLICK + 10], [1, 0.94, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const flash = interpolate(frame, [CLICK, CLICK + 10], [0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Workflow strip appears after the click.
  const workflowIn = interpolate(frame, [198, 224], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
            From insight to action.
          </span>
          <span style={{ fontFamily: FONT, fontSize: 19, color: C.fg3 }}>
            One click to the next step.
          </span>
        </div>
      </Fade>

      {/* Vendor side panel */}
      <div
        style={{
          position: "absolute",
          right: 170,
          top: 230,
          width: 580,
          ...panel,
          transform: `translateX(${panelX}px)`,
          opacity: interpolate(frame, [100, 130], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        <WinBar
          title="Vendor · Acme Software"
          right={<span style={{ fontSize: 12, color: C.teal }}>● connected</span>}
        />
        <div
          style={{
            padding: "26px 28px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          <Pop at={118}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: FONT,
                  fontWeight: 700,
                  fontSize: 32,
                  letterSpacing: "-0.02em",
                  color: C.fg,
                }}
              >
                Acme Software
              </span>
              <div
                style={{
                  display: "flex",
                  gap: 22,
                  fontFamily: FONT,
                  fontSize: 14.5,
                  color: C.fg2,
                }}
              >
                <span>
                  Renewal <span style={{ color: C.fg, fontWeight: 600 }}>October 24</span>
                </span>
                <span>
                  Spend <span style={{ color: C.fg, fontWeight: 600 }}>$48,000/yr</span>
                </span>
              </div>
            </div>
          </Pop>

          {/* AI recommendation */}
          <Pop at={136}>
            <div
              style={{
                border: `1px solid rgba(52,191,165,0.35)`,
                background: "rgba(52,191,165,0.08)",
                borderRadius: 12,
                padding: "16px 18px",
                display: "flex",
                gap: 13,
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: C.teal, marginTop: 2, flexShrink: 0 }}>
                <Sparkles size={17} />
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontFamily: FONT, fontWeight: 650, fontSize: 16.5, color: C.fg }}>
                  Consider renegotiating.
                </span>
                <span style={{ fontFamily: FONT, fontSize: 14.5, color: C.fg2, lineHeight: 1.5 }}>
                  Pricing increased 18% since the last renewal.
                </span>
              </div>
            </div>
          </Pop>

          {/* Review button block (local coordinates for cursor + click) */}
          <div style={{ position: "relative", marginTop: 2, alignSelf: "flex-start" }}>
            {/* Cursor descending onto the button */}
            {frame >= 146 && frame < CLICK + 6 ? (
              <div
                style={{
                  position: "absolute",
                  left: 96,
                  top: cursorY,
                  color: C.white,
                  opacity: cursorOpacity * cursorGone,
                  filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.9))",
                  zIndex: 5,
                }}
              >
                <MousePointer2 size={24} fill={C.white} />
              </div>
            ) : null}

            <div
              style={{
                transform: `scale(${press})`,
                transformOrigin: "center",
                position: "relative",
              }}
            >
              <Pop at={152}>
                <Button primary style={{ padding: "13px 24px", fontSize: 16 }}>
                  Review vendor
                  <ArrowRight size={17} strokeWidth={2.4} />
                </Button>
              </Pop>
              {/* Click flash */}
              {frame >= CLICK && frame < CLICK + 10 ? (
                <div
                  style={{
                    position: "absolute",
                    inset: -4,
                    borderRadius: 999,
                    background: C.white,
                    opacity: flash,
                    pointerEvents: "none",
                  }}
                />
              ) : null}
            </div>
          </div>

          {/* Action workflow (appears after click) */}
          <div
            style={{
              opacity: workflowIn,
              transform: `translateY(${(1 - workflowIn) * 18}px)`,
              marginTop: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "14px 16px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${C.hairlineSoft}`,
                borderRadius: 12,
              }}
            >
              {STEPS.map((s, i) => (
                <React.Fragment key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ color: C.fg2 }}>{s.icon}</span>
                    <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 550, color: C.fg2 }}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 ? (
                    <span style={{ color: C.fg3 }}>
                      <ArrowRight size={14} />
                    </span>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dimmed context behind the panel */}
      <Fade at={6} dur={16} style={{ position: "absolute", left: 130, top: 250, width: 320 }}>
        <div style={{ fontFamily: FONT, fontSize: 15, color: C.fg3, lineHeight: 1.7 }}>
          <span style={{ color: C.fg2, fontWeight: 600 }}>Acme Software</span>
          <br />
          Contract score ·{" "}
          <span style={{ color: C.warn, fontWeight: 600 }}>renewal risk</span>
        </div>
      </Fade>
    </AbsoluteFill>
  );
};
