import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { AlarmClock, TrendingUp, AlertTriangle } from "lucide-react";
import { C, FONT } from "../theme";
import { NotifCard } from "../uikit";
import { Fade, Vignette } from "../anim";

/* THE PROBLEM: three alerts land fast (f6/f20/f34), the group pulls up
   and fades out at f80, then the question hits hard before the cut. */

const ALERTS = [
  {
    icon: <AlertTriangle size={22} strokeWidth={2} />,
    accent: C.danger,
    title: "Vendor renewal in 14 days",
    sub: "Acme Software · Master agreement",
    at: 6,
  },
  {
    icon: <TrendingUp size={22} strokeWidth={2} />,
    accent: C.warn,
    title: "Price increased 18%",
    sub: "Northwind Cloud · Annual plan",
    at: 20,
  },
  {
    icon: <AlarmClock size={22} strokeWidth={2} />,
    accent: C.danger,
    title: "Contract expires tomorrow",
    sub: "Brightline Services · Support",
    at: 34,
  },
] as const;

export const Scene01: React.FC = () => {
  const frame = useCurrentFrame();

  const alertsOpacity = interpolate(frame, [74, 86], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const alertsY = interpolate(frame, [74, 90], [0, -34], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const copyOpacity = interpolate(frame, [84, 96], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const copyY = interpolate(frame, [84, 100], [16, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.black }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center" }}>
        {/* Alerts block */}
        <div
          style={{
            position: "absolute",
            top: "33%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
            opacity: alertsOpacity,
            transform: `translateY(${alertsY}px)`,
          }}
        >
          {ALERTS.map((a, i) => (
            <Fade key={i} at={a.at} dur={12} dy={-10}>
              <NotifCard icon={a.icon} accent={a.accent} title={a.title} sub={a.sub} />
            </Fade>
          ))}
        </div>

        {/* Copy block */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            textAlign: "center",
            opacity: copyOpacity,
            transform: `translateY(${copyY}px)`,
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 66,
              letterSpacing: "-0.035em",
              color: C.fg,
              lineHeight: 1.04,
            }}
          >
            Your vendors are changing.
          </span>
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 450,
              fontSize: 30,
              color: C.fg3,
              letterSpacing: "-0.01em",
            }}
          >
            Are you keeping up?
          </span>
        </div>
      </div>
      <Vignette strength={0.35} />
    </AbsoluteFill>
  );
};
