import React from "react";
import { Img, staticFile } from "remotion";
import { C, FONT } from "./theme";

/* ------------------------------------------------------------------ */
/*  Schematic N4MA UI kit. Dark surfaces, hairline borders, Inter.    */
/*  Faithful to the real app: zinc text scale, 10-12px radii, quiet    */
/*  chrome with semantic accent only where meaning demands it.         */
/* ------------------------------------------------------------------ */

export const panel: React.CSSProperties = {
  background: C.panel,
  border: `1px solid ${C.hairline}`,
  borderRadius: 12,
  boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
};

export const PANEL_BAR_H = 40;

/** Small traffic-dot window header strip used by panels. */
export const WinBar: React.FC<{
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ title, icon, right, style }) => (
  <div
    style={{
      height: PANEL_BAR_H,
      padding: "0 14px",
      display: "flex",
      alignItems: "center",
      gap: 10,
      borderBottom: `1px solid ${C.hairlineSoft}`,
      ...style,
    }}
  >
    <span style={{ display: "flex", gap: 5 }}>
      <span style={{ width: 9, height: 9, borderRadius: 5, background: "#3a3a41" }} />
      <span style={{ width: 9, height: 9, borderRadius: 5, background: "#3a3a41" }} />
      <span style={{ width: 9, height: 9, borderRadius: 5, background: "#3a3a41" }} />
    </span>
    {icon}
    <span
      style={{
        color: C.fg2,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "-0.01em",
      }}
    >
      {title}
    </span>
    <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
      {right}
    </span>
  </div>
);

/** N4MA logomark: square app icon + wordmark. */
export const LogoLockup: React.FC<{
  size?: number;
  wordmark?: boolean;
  style?: React.CSSProperties;
}> = ({ size = 96, wordmark = true, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: size * 0.28, ...style }}>
    <Img
      src={staticFile("brand/logo.png")}
      style={{ width: size, height: size, objectFit: "contain", borderRadius: size * 0.18 }}
    />
    {wordmark && (
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 700,
          fontSize: size * 0.62,
          letterSpacing: "-0.03em",
          color: C.fg,
        }}
      >
        N4MA
      </span>
    )}
  </div>
);

/** Small eyebrow label. */
export const Eyebrow: React.FC<{
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}> = ({ children, color = C.fg3, style }) => (
  <div
    style={{
      fontFamily: FONT,
      fontSize: 15,
      fontWeight: 600,
      letterSpacing: "0.32em",
      textTransform: "uppercase",
      color,
      ...style,
    }}
  >
    {children}
  </div>
);

/** Alert-style notification card used in Scene 1. */
export const NotifCard: React.FC<{
  icon: React.ReactNode;
  accent: string;
  title: string;
  sub: string;
  style?: React.CSSProperties;
}> = ({ icon, accent, title, sub, style }) => (
  <div
    style={{
      ...panel,
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "18px 22px",
      minWidth: 560,
      maxWidth: 640,
      ...style,
    }}
  >
    <div
      style={{
        width: 46,
        height: 46,
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `${accent}1F`,
        color: accent,
        flexShrink: 0,
      }}
    >
      {icon}
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 20, color: C.fg, letterSpacing: "-0.01em" }}>
        {title}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 14.5, color: C.fg3 }}>
        {sub}
      </span>
    </div>
  </div>
);

/** A "data row" of label + value used across panels. */
export const DataRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
  hint?: string;
  style?: React.CSSProperties;
}> = ({ label, value, valueColor = C.fg, hint, style }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 4,
      padding: "0 4px",
      ...style,
    }}
  >
    <span style={{ fontFamily: FONT, fontSize: 13, color: C.fg3, letterSpacing: "0.01em" }}>
      {label}
    </span>
    <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
      <span style={{ fontFamily: FONT, fontWeight: 650, fontSize: 25, color: valueColor, letterSpacing: "-0.02em" }}>
        {value}
      </span>
      {hint ? (
        <span style={{ fontFamily: FONT, fontSize: 13, color: C.fg3 }}>{hint}</span>
      ) : null}
    </span>
  </div>
);

/** Vendor alert chip (small horizontal card). */
export const VendorAlert: React.FC<{
  dot: string;
  name: string;
  detail: string;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ dot, name, detail, icon, style }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 13,
      padding: "13px 16px",
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${C.hairlineSoft}`,
      borderRadius: 10,
      ...style,
    }}
  >
    <span style={{ width: 9, height: 9, borderRadius: 5, background: dot, flexShrink: 0 }} />
    <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 16, color: C.fg, flexShrink: 0 }}>
      {name}
    </span>
    <span style={{ flex: 1 }} />
    <span style={{ fontFamily: FONT, fontSize: 14.5, color: C.fg2 }}>{detail}</span>
    {icon}
  </div>
);

/** Source pill (Gmail / Drive / Upload). */
export const SourcePill: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub?: string;
  style?: React.CSSProperties;
}> = ({ icon, label, sub, style }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 18px",
      background: C.panel,
      border: `1px solid ${C.hairline}`,
      borderRadius: 999,
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      ...style,
    }}
  >
    <span style={{ display: "flex", color: C.fg2 }}>{icon}</span>
    <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 16.5, color: C.fg }}>{label}</span>
    {sub ? (
      <span style={{ fontFamily: FONT, fontSize: 13, color: C.fg3 }}>{sub}</span>
    ) : null}
  </div>
);

/** Small document card used in the "everything converges" grid. */
export const DocCard: React.FC<{
  icon: React.ReactNode;
  accent: string;
  title: string;
  meta: string;
  style?: React.CSSProperties;
}> = ({ icon, accent, title, meta, style }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "13px 14px",
      background: "rgba(255,255,255,0.035)",
      border: `1px solid ${C.hairlineSoft}`,
      borderRadius: 10,
      ...style,
    }}
  >
    <span
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `${accent}1F`,
        color: accent,
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      <span
        style={{
          fontFamily: FONT,
          fontWeight: 550,
          fontSize: 14,
          color: C.fg,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {title}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 12, color: C.fg3 }}>{meta}</span>
    </div>
  </div>
);

/** A rounded rectangular button (white primary or ghost). */
export const Button: React.FC<{
  children: React.ReactNode;
  primary?: boolean;
  style?: React.CSSProperties;
}> = ({ children, primary = true, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 26px",
      borderRadius: 999,
      fontFamily: FONT,
      fontWeight: 600,
      fontSize: 17,
      letterSpacing: "-0.01em",
      background: primary ? C.white : "transparent",
      color: primary ? C.black : C.fg,
      border: primary ? "none" : `1px solid rgba(255,255,255,0.25)`,
      boxShadow: primary ? "0 12px 34px rgba(255,255,255,0.14)" : "none",
      ...style,
    }}
  >
    {children}
  </div>
);
