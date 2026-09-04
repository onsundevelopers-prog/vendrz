import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { ArrowRight } from "lucide-react";
import { C, FONT } from "../theme";
import { Fade, Vignette } from "../anim";

/* ENDING: quiet black. Mark, then the two-line promise, then the CTA.
   Holds on the button so the frame lands on something actionable. */

export const Scene08: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.black }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
        }}
      >
        {/* Mark */}
        <Fade at={20} dur={20} dy={24}>
          <Img
            src={staticFile("brand/logo.png")}
            style={{ width: 150, height: 150, objectFit: "contain" }}
          />
        </Fade>

        {/* Wordmark */}
        <Fade at={40} dur={18} dy={12}>
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 750,
              fontSize: 92,
              letterSpacing: "-0.045em",
              color: C.fg,
              lineHeight: 1.1,
              marginTop: 22,
            }}
          >
            N4MA
          </span>
        </Fade>

        {/* Promise */}
        <Fade at={72} dur={20} dy={14}>
          <div
            style={{
              marginTop: 30,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: FONT,
                fontWeight: 650,
                fontSize: 30,
                color: C.fg,
                letterSpacing: "-0.015em",
              }}
            >
              Know your vendors.
            </span>
            <span
              style={{
                fontFamily: FONT,
                fontWeight: 450,
                fontSize: 24,
                color: C.fg3,
              }}
            >
              Before they become problems.
            </span>
          </div>
        </Fade>

        {/* CTA */}
        <Fade at={150} dur={16} dy={16}>
          <div
            style={{
              marginTop: 56,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 18,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 12,
                padding: "17px 34px",
                borderRadius: 999,
                background: C.white,
                color: C.black,
                fontFamily: FONT,
                fontWeight: 650,
                fontSize: 19,
                letterSpacing: "-0.01em",
                boxShadow: "0 14px 44px rgba(255,255,255,0.16)",
              }}
            >
              Get started
              <ArrowRight size={19} strokeWidth={2.4} />
            </div>
            <span style={{ fontFamily: FONT, fontSize: 16, color: C.fg3 }}>
              n4ma.online
            </span>
          </div>
        </Fade>
      </div>
      <Vignette strength={0.3} />
    </AbsoluteFill>
  );
};
