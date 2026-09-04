import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  staticFile,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { C, FONT } from "../theme";
import { Eyebrow } from "../uikit";
import { Fade, Vignette } from "../anim";

/* INTRODUCING N4MA: black -> logomark breathes -> real product footage
   fades in with a slow push, "Meet N4MA" copy lands over the lower
   third. Ends on the live dashboard, cut into Scene 3. */

export const Scene02: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo block leaves as footage arrives.
  const logoOpacity = interpolate(frame, [150, 176], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const logoY = interpolate(frame, [150, 180], [0, -26], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Footage: visible from 176, push-in across the rest of the scene.
  const footageIn = interpolate(frame, [176, 205], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const push = interpolate(frame, [180, 300], [1.02, 1.1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
  });

  return (
    <AbsoluteFill style={{ background: C.black }}>
      {/* Logomark intro */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 26,
          opacity: logoOpacity,
          transform: `translateY(${logoY}px)`,
        }}
      >
        <Fade at={12} dur={14} dy={16}>
          <Eyebrow>Introducing</Eyebrow>
        </Fade>
        <Fade at={22} dur={18} dy={20}>
          <Img
            src={staticFile("brand/logo.png")}
            style={{ width: 180, height: 180, objectFit: "contain" }}
          />
        </Fade>
        <Fade at={30} dur={16}>
          <span
            style={{
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 88,
              letterSpacing: "-0.04em",
              color: C.fg,
              lineHeight: 1,
            }}
          >
            N4MA
          </span>
        </Fade>
      </div>

      {/* Real footage push */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: footageIn,
          overflow: "hidden",
        }}
      >
        {/* Play the 6.5s clip starting at scene frame 105 so it runs out
            exactly at the scene end (frame 300) with no tail to error on. */}
        <Sequence from={105} durationInFrames={195}>
          <div style={{ position: "absolute", inset: 0, transform: `scale(${push})` }}>
            <OffthreadVideo
              src={staticFile("footage-a.webm")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </Sequence>
        {/* Legibility gradients */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(8,9,10,0.72) 0%, rgba(8,9,10,0.05) 26%, rgba(8,9,10,0.05) 62%, rgba(8,9,10,0.94) 100%)",
          }}
        />
        {/* Copy lower-left */}
        <div
          style={{
            position: "absolute",
            left: 110,
            bottom: 120,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Fade at={40} dur={12}>
            <span
              style={{
                fontFamily: FONT,
                fontWeight: 700,
                fontSize: 74,
                letterSpacing: "-0.035em",
                color: C.fg,
                lineHeight: 1.04,
              }}
            >
              Meet N4MA.
            </span>
          </Fade>
          <Fade at={60} dur={14} dy={10}>
            <span
              style={{
                fontFamily: FONT,
                fontWeight: 450,
                fontSize: 28,
                color: "#C8C8CF",
                letterSpacing: "-0.01em",
              }}
            >
              The command center for your vendors.
            </span>
          </Fade>
        </div>
        <Vignette strength={0.8} />
      </div>
    </AbsoluteFill>
  );
};
