import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { FileText, ScanLine, Check } from "lucide-react";
import { C, FONT } from "../theme";
import { panel, WinBar, DataRow } from "../uikit";
import { Fade, Vignette, Pop } from "../anim";

/* AI UNDERSTANDS THE DATA: a contract document is scanned; the AI lifts
   four fields out onto a right-hand panel, one by one, synced to VO. */

const FIELDS = [
  { label: "Renewal Date", value: "October 24, 2026", hint: "", color: C.fg, at: 118 },
  { label: "Cancellation Deadline", value: "September 24, 2026", hint: "", color: C.warn, at: 158 },
  { label: "Price Escalation", value: "Up to 12%", hint: "per term", color: C.fg, at: 198 },
  { label: "Annual Spend", value: "$48,000", hint: "", color: C.fg, at: 238 },
] as const;

const DOC_LINES = [72, 96, 62, 88, 70, 40, 84, 66, 92, 58] as const;

export const Scene04: React.FC = () => {
  const frame = useCurrentFrame();

  const scanY = interpolate(frame, [18, 150], [18, 330], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t: number) => (Math.sin(t * Math.PI * 2) + 1) / 2,
  });
  const scanOpacity = interpolate(frame, [14, 22, 150, 162], [0, 1, 1, 0], {
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
            AI understands the data.
          </span>
          <span style={{ fontFamily: FONT, fontSize: 19, color: C.fg3 }}>
            Every clause, read in seconds.
          </span>
        </div>
      </Fade>

      {/* Document panel (left) */}
      <div
        style={{
          position: "absolute",
          left: 150,
          top: 230,
          width: 600,
          ...panel,
          overflow: "hidden",
        }}
      >
        <WinBar
          title="acme-master-agreement.pdf"
          icon={<FileText size={14} color={C.fg3} />}
          right={<span style={{ color: C.fg3, fontSize: 12 }}>PDF · 14 pages</span>}
        />
        <div style={{ position: "relative", padding: "26px 28px" }}>
          {/* Document skeleton */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 15,
              transform: "scaleY(1.02)",
            }}
          >
            <div
              style={{
                width: 210,
                height: 14,
                borderRadius: 4,
                background: "rgba(255,255,255,0.28)",
                marginBottom: 6,
              }}
            />
            {DOC_LINES.map((w, i) => (
              <div
                key={i}
                style={{
                  width: `${w}%`,
                  height: 9,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.1)",
                }}
              />
            ))}
          </div>

          {/* Scan sweep */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: scanY,
              height: 56,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0) 100%)",
              opacity: scanOpacity,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: scanY,
              height: 2,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)",
              opacity: scanOpacity,
            }}
          />
        </div>
      </div>

      {/* Extraction panel (right) */}
      <div
        style={{
          position: "absolute",
          right: 150,
          top: 250,
          width: 520,
          ...panel,
        }}
      >
        <WinBar title="Extracted fields" right={<ScanLine size={13} color={C.fg3} />} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            padding: "22px 24px",
          }}
        >
          {FIELDS.map((f, i) => (
            <div key={i} style={{ opacity: frame < f.at ? 0 : 1 }}>
              <Pop at={f.at} scale={0.97}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 6px",
                    borderBottom: i < FIELDS.length - 1 ? `1px solid ${C.hairlineSoft}` : "none",
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: `${C.teal}26`,
                      color: C.teal,
                      flexShrink: 0,
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <DataRow label={f.label} value={f.value} valueColor={f.color} hint={f.hint} />
                </div>
              </Pop>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
