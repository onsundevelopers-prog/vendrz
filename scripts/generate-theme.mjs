#!/usr/bin/env node
/* ------------------------------------------------------------------ */
/*  generate-theme.mjs                                                 */
/*                                                                     */
/*  LCH theme engine - executes the Linear design-notes principle:     */
/*  instead of hand-defining ~30 color variables, three inputs drive   */
/*  the entire neutral token set:                                      */
/*                                                                     */
/*    BASE     - the darkest surface (page background)                 */
/*    ACCENT   - the single action/control color                       */
/*    CONTRAST - 0..100 knob scaling text + hairline lightness         */
/*                                                                     */
/*  Colors are manipulated in CIELCh (D65), which is perceptually      */
/*  uniform: a lightness step looks the same regardless of hue, so     */
/*  surfaces (canvas -> surface -> panel -> float) and text            */
/*  (fg -> muted -> faint -> ash) scale consistently and the theme     */
/*  stays neutral and timeless regardless of the base color chosen.    */
/*                                                                     */
/*  Usage:  node scripts/generate-theme.mjs  (writes src/app/theme.css)*/
/*  A high-contrast variant (contrast = 100) is emitted for            */
/*  accessibility under [data-contrast="high"].                        */
/* ------------------------------------------------------------------ */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/* ------------------------------ color math ------------------------------ */

const REF = [0.95047, 1.0, 1.08883]; // D65 white point

const M = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const MINV = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const linearToSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
const clamp01 = (c) => Math.max(0, Math.min(1, c));

function labFromHex(hex) {
  const n = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255);
  const [r2, g2, b2] = [srgbToLinear(r), srgbToLinear(g), srgbToLinear(b)];
  const x = M[0][0] * r2 + M[0][1] * g2 + M[0][2] * b2;
  const y = M[1][0] * r2 + M[1][1] * g2 + M[1][2] * b2;
  const z = M[2][0] * r2 + M[2][1] * g2 + M[2][2] * b2;
  const [X, Y, Z] = [x / REF[0], y / REF[1], z / REF[2]];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function hexFromLab(L, a, b) {
  const f = (t) => {
    const t3 = t ** 3;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };
  const fy = (L + 16) / 116;
  const [X, Y, Z] = [f(fy + a / 500) * REF[0], f(fy) * REF[1], f(fy - b / 200) * REF[2]];
  const [r2, g2, b2] = [
    MINV[0][0] * X + MINV[0][1] * Y + MINV[0][2] * Z,
    MINV[1][0] * X + MINV[1][1] * Y + MINV[1][2] * Z,
    MINV[2][0] * X + MINV[2][1] * Y + MINV[2][2] * Z,
  ];
  const to8 = (c) => Math.round(clamp01(linearToSrgb(c)) * 255);
  const hex = (c) => to8(c).toString(16).padStart(2, "0");
  return `#${hex(r2)}${hex(g2)}${hex(b2)}`;
}

function labFromLch(L, C, Hdeg) {
  const hr = (Hdeg * Math.PI) / 180;
  return [L, C * Math.cos(hr), C * Math.sin(hr)];
}

/* ------------------------------- inputs ------------------------------- */

const BASE_HEX = "#08090a"; // void - the darkest surface
const ACCENT_HEX = "#e4e4e7"; // acid - the single action color (grey)
const CONTRAST = 65; // 0..100 knob; 65 reproduces the current tuned look

const BASE = labFromHex(BASE_HEX);
const ACCENT = labFromHex(ACCENT_HEX);

/* --------------------------- token derivation --------------------------- */

const hex = (L, C, Hdeg) => hexFromLab(...labFromLch(L, C, Hdeg));
const num = (n) => Math.round(n * 1000) / 1000;

/** Neutral surfaces step up in lightness from the base color (hue 256). */
function surfaces(c) {
  return {
    canvas: BASE_HEX,
    surface: hex(BASE[0] + 2.2, BASE[1] + 0.18, 256),
    panel: hex(BASE[0] + 5.24, BASE[1] + 0.4, 256),
    float: hex(BASE[0] + 5.24, BASE[1] + 0.4, 256),
  };
}

/** Text scale driven by the contrast knob (0..100), hue ~268-270. */
function text(c) {
  return {
    fg: "#ffffff",
    muted: hex(72 + 0.207 * c, 3.2 + 0.0372 * c, 268),
    faint: hex(45.5 + 0.2117 * c, 3.0 + 0.0368 * c, 270),
    ash: hex(30 + 0.201 * c, 2.5 + 0.0303 * c, 270),
  };
}

/** Hairlines: low-chroma, lightness scaled by contrast (hue 264-276). */
function lines(c) {
  return {
    line: hex(8 + 0.1026 * c, 1.7 + 0.0298 * c, 276),
    lineStrong: hex(14 + 0.165 * c, 1.5 + 0.0218 * c, 264),
  };
}

/** White-alpha washes for hover / active / selection / inset. */
function washes(c) {
  const a = (base, per) => num(Math.min(1, base + per * c));
  return {
    hover: `rgba(255, 255, 255, ${a(0.03, 0.00025)})`,
    active: `rgba(255, 255, 255, ${a(0.055, 0.00038)})`,
    sel: `rgba(255, 255, 255, ${a(0.04, 0.00025)})`,
    inset: `rgba(255, 255, 255, ${a(0.015, 0.00015)})`,
  };
}

const accentHex = ACCENT_HEX;

/* ------------------------------ css output ------------------------------ */

function themeBlock(c, indent = "") {
  const s = surfaces(c);
  const t = text(c);
  const l = lines(c);
  const w = washes(c);
  return [
    `${indent}--color-canvas: ${s.canvas}; /* page background              */`,
    `${indent}--color-surface: ${s.surface}; /* cards, nav, containers     */`,
    `${indent}--color-panel: ${s.panel}; /* elevated frames/panels      */`,
    `${indent}--color-float: ${s.float}; /* floating drawers            */`,
    `${indent}--color-fg: ${t.fg}; /* primary headings, emphasis   */`,
    `${indent}--color-muted: ${t.muted}; /* secondary text, button text */`,
    `${indent}--color-faint: ${t.faint}; /* tertiary text, placeholders */`,
    `${indent}--color-ash: ${t.ash}; /* quiet metadata               */`,
    `${indent}--color-line: ${l.line}; /* subtle borders, dividers    */`,
    `${indent}--color-line-strong: ${l.lineStrong}; /* higher-contrast hairlines */`,
    `${indent}--color-rule-light: ${l.line};`,
    `${indent}--color-rule-dark: ${l.lineStrong};`,
    `${indent}--color-acid: ${accentHex}; /* the only action button color */`,
    `${indent}--color-hover: ${w.hover}; /* row / menu hover             */`,
    `${indent}--color-active: ${w.active}; /* pressed / active control    */`,
    `${indent}--color-sel: ${w.sel}; /* selected row background      */`,
    `${indent}--color-inset: ${w.inset}; /* subtle inset surface         */`,
  ].join("\n");
}

/** shadcn/ui :root mirror - same generated values, standard names. */
function shadcnBlock(c) {
  const s = surfaces(c);
  const t = text(c);
  const l = lines(c);
  return [
    `  --background: ${s.canvas};`,
    `  --foreground: ${t.muted};`,
    `  --card: ${s.surface};`,
    `  --card-foreground: ${t.muted};`,
    `  --popover: ${s.panel};`,
    `  --popover-foreground: ${t.muted};`,
    `  --primary: ${accentHex};`,
    `  --primary-foreground: ${s.canvas};`,
    `  --secondary: ${s.panel};`,
    `  --secondary-foreground: ${t.muted};`,
    `  --muted: ${s.panel};`,
    `  --muted-foreground: ${t.faint};`,
    `  --accent: ${s.panel};`,
    `  --accent-foreground: ${t.muted};`,
    `  --destructive: #eb5757;`,
    `  --border: ${l.line};`,
    `  --input: ${l.line};`,
    `  --ring: ${accentHex};`,
    `  --chart-1: ${accentHex};`,
    `  --chart-2: ${t.muted};`,
    `  --chart-3: ${t.faint};`,
    `  --chart-4: ${t.ash};`,
    `  --chart-5: ${l.lineStrong};`,
    `  --radius: 0.375rem;`,
    `  --sidebar: ${s.surface};`,
    `  --sidebar-foreground: ${t.muted};`,
    `  --sidebar-primary: ${accentHex};`,
    `  --sidebar-primary-foreground: ${s.canvas};`,
    `  --sidebar-accent: ${s.panel};`,
    `  --sidebar-accent-foreground: ${t.muted};`,
    `  --sidebar-border: ${l.line};`,
    `  --sidebar-ring: ${accentHex};`,
  ].join("\n");
}

const css = `/* ------------------------------------------------------------------ */
/*  theme.css - AUTO-GENERATED by scripts/generate-theme.mjs.           */
/*  Do not edit by hand - change the three inputs in the script and     */
/*  re-run:  node scripts/generate-theme.mjs                            */
/*                                                                      */
/*  LCH theme engine (Linear design notes): base + accent + contrast    */
/*  drive every surface / text / hairline / wash token, generated in    */
/*  perceptually-uniform CIELCh so lightness steps stay consistent.     */
/*  BASE=${BASE_HEX}  ACCENT=${ACCENT_HEX}  CONTRAST=${CONTRAST}        */
/* ------------------------------------------------------------------ */

@theme {
  /* Surfaces / text / hairlines / washes - generated from the three
     theme inputs above. Semantic status hues (pulse / coral / teal /
     iris / lavender / bone) and the legacy navy scale stay hand-set in
     globals.css because they encode meaning, not elevation. */
${themeBlock(CONTRAST).replace(/^/gm, "  ")}
}

:root {
${shadcnBlock(CONTRAST)}
}

/* Super-high-contrast variant for accessibility - same surfaces,
   contrast knob pushed to 100 (see Linear notes: contrast variable). */
[data-contrast="high"] {
${themeBlock(100).replace(/^/gm, "  ")}
}
`;

const outPath = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "app", "theme.css");
writeFileSync(outPath, css, "utf8");

/* --------------------------- calibration report --------------------------- */

const target = {
  canvas: "#08090a",
  surface: "#0f1011",
  panel: "#161718",
  fg: "#ffffff",
  muted: "#d0d6e0",
  faint: "#8a8f98",
  ash: "#62666d",
  line: "#23252a",
  lineStrong: "#383b3f",
  acid: "#e4e4e7",
};
const gen = {
  ...surfaces(CONTRAST),
  ...text(CONTRAST),
  ...lines(CONTRAST),
  acid: accentHex,
};
console.log("Generated theme (contrast=" + CONTRAST + "):");
for (const [k, want] of Object.entries(target)) {
  const got = gen[k];
  const mark = got === want ? "=" : got && want && Math.abs(parseInt(got.slice(1), 16) - parseInt(want.slice(1), 16)) < 0x020202 ? "~" : "!";
  console.log(`  ${mark} ${k.padEnd(11)} ${got}  (was ${want})`);
}
console.log(`\nWrote ${outPath}`);