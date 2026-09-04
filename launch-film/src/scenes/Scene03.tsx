import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import {
  Mail,
  HardDrive,
  Upload,
  FileText,
  Files,
  Cloud,
  Sparkles,
  Check,
} from "lucide-react";
import { C, FONT } from "../theme";
import { SourcePill, DocCard, WinBar, panel } from "../uikit";
import { Fade, Pop, Vignette, Reveal } from "../anim";

/* EVERYTHING IN ONE PLACE: three sources (Gmail / Drive / Upload) drop
   in along the top, beams reach down into a workspace panel where
   document cards organize themselves into a grid. VO carries the line. */

const SOURCES = [
  { icon: <Mail size={19} strokeWidth={2} />, label: "Gmail", x: 610, at: 6 },
  { icon: <HardDrive size={19} strokeWidth={2} />, label: "Google Drive", x: 960, at: 16 },
  { icon: <Upload size={19} strokeWidth={2} />, label: "Upload", x: 1310, at: 26 },
] as const;

const DOCS = [
  {
    icon: <FileText size={15} strokeWidth={2.2} />,
    accent: C.teal,
    title: "Acme Master Agreement.pdf",
    meta: "Contract · 1.2 MB",
  },
  {
    icon: <Mail size={15} strokeWidth={2.2} />,
    accent: "#7C9CF5",
    title: "Renewal notice · Feb 2026",
    meta: "Email · from Acme",
  },
  {
    icon: <Files size={15} strokeWidth={2.2} />,
    accent: C.warn,
    title: "Support Contract 2026.docx",
    meta: "Contract · 480 KB",
  },
  {
    icon: <Cloud size={15} strokeWidth={2.2} />,
    accent: "#B98CF0",
    title: "Northwind invoices",
    meta: "Drive folder · 12 files",
  },
] as const;

export const Scene03: React.FC = () => {
  const frame = useCurrentFrame();

  const panelIn = interpolate(frame, [38, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const panelY = interpolate(frame, [38, 60], [26, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Vignette strength={0.5} />

      {/* Header caption */}
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
            Everything in one place.
          </span>
          <span style={{ fontFamily: FONT, fontSize: 19, color: C.fg3 }}>
            Contracts, emails, documents, renewals.
          </span>
        </div>
      </Fade>

      {/* Sources */}
      {SOURCES.map((s, i) => {
        const beamGrow = interpolate(frame, [44 + i * 10, 84 + i * 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: "absolute",
                top: 196,
                left: s.x - 150,
                width: 300,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pop at={s.at}>
                <SourcePill icon={s.icon} label={s.label} sub={i === 2 ? "· DOCX · PDF · CSV" : undefined} />
              </Pop>
            </div>
            {/* Beam from source down to the panel */}
            <div
              style={{
                position: "absolute",
                top: 262,
                left: s.x,
                width: 2,
                height: 134 * beamGrow,
                transformOrigin: "top",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.05))",
                opacity: beamGrow * 0.7,
              }}
            />
          </React.Fragment>
        );
      })}

      {/* Central workspace panel */}
      <div
        style={{
          position: "absolute",
          top: 396,
          left: 520,
          width: 880,
          ...panel,
          opacity: panelIn,
          transform: `translateY(${panelY * (1 - panelIn)}px) scale(${0.97 + 0.03 * panelIn})`,
        }}
      >
        <WinBar title="Vendor workspace" right={<Sparkles size={13} color={C.fg3} />} />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            padding: 16,
          }}
        >
          {DOCS.map((d, i) => (
            <Pop key={i} at={56 + i * 13} scale={0.97}>
              <DocCard icon={d.icon} accent={d.accent} title={d.title} meta={d.meta} />
            </Pop>
          ))}
        </div>
      </div>

      {/* Small "organized" beat - a check row under the panel */}
      <Reveal at={126} dur={16}>
        <div
          style={{
            position: "absolute",
            top: 908,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            gap: 12,
            alignItems: "center",
          }}
        >
          <span style={{ color: C.teal, display: "flex", alignItems: "center" }}>
            <Check size={17} strokeWidth={2.4} />
          </span>
          <span style={{ fontFamily: FONT, fontSize: 18, color: C.fg2 }}>
            Organized automatically. Nothing left in a folder.
          </span>
        </div>
      </Reveal>
    </AbsoluteFill>
  );
};
