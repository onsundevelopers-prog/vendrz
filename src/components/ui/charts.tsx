"use client";

import { motion } from "framer-motion";

/* ------------------------------------------------------------------ */
/*  Lightweight SVG charts - dense, hairline, no chart library.       */
/* ------------------------------------------------------------------ */

const ease = [0.22, 1, 0.36, 1] as const;

export function BarChart({
  data,
  height = 180,
  color = "#a1a1aa",
  highlightLast = true,
  format = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  highlightLast?: boolean;
  format?: (v: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 640;
  const pad = 4;
  const bw = (W - pad * 2) / data.length;
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (height - 28));
          const x = pad + i * bw + bw * 0.22;
          const w = bw * 0.56;
          const last = highlightLast && i === data.length - 1;
          return (
            <motion.rect
              key={i}
              x={x}
              y={height - h}
              width={w}
              height={h}
              rx={2}
              fill={last ? color : "rgba(255,255,255,0.16)"}
              initial={{ height: 0, y: height }}
              animate={{ height: h, y: height - h }}
              transition={{ duration: 0.7, delay: 0.04 * i, ease }}
            />
          );
        })}
      </svg>
      <div className="mt-1.5 flex justify-between border-t border-line/60 pt-1.5 text-[9.5px] tracking-tight text-muted/80">
        {data.map((d, i) => (
          <span key={i} title={format(d.value)}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AreaChart({
  data,
  height = 200,
  color = "#a1a1aa",
  fillId,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fillId: string;
}) {
  const W = 640;
  const H = height;
  const max = Math.max(...data.map((d) => d.value), 1);
  const step = W / (data.length - 1);
  const pts = data.map((d, i) => [i * step, H - 8 - (d.value / max) * (H - 24)] as const);
  const line = smoothPath(pts);
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={0}
          x2={W}
          y1={H * f}
          y2={H * f}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="3 4"
        />
      ))}
      <motion.path
        d={area}
        fill={`url(#${fillId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease }}
      />
      <motion.circle
        cx={last[0]}
        cy={last[1]}
        r="4"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 1, ease }}
      />
    </svg>
  );
}

/* Catmull-Rom → cubic bezier for a smooth, continuous curve */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)];
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    const [x3, y3] = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
  }
  return d;
}

export function Sparkline({
  data,
  width = 96,
  height = 28,
  color = "#a1a1aa",
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = Math.max(max - min, 1);
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => [i * step, height - 2 - ((v - min) / range) * (height - 4)] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="shrink-0">
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function DonutChart({
  data,
  size = 168,
  thickness = 16,
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const R = (size - thickness) / 2;
  const CIRC = 2 * Math.PI * R;
  const offsets = data.map((d, i) =>
    data.slice(0, i).reduce((a, x) => a + (x.value / total) * CIRC, 0)
  );
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const len = (d.value / total) * CIRC;
          return (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={R}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${CIRC - len}`}
              strokeDashoffset={-offsets[i]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.08 }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {centerValue && (
          <span className="text-[22px] font-semibold tracking-tight text-fg">{centerValue}</span>
        )}
        {centerLabel && (
          <span className="mt-0.5 text-[9.5px] uppercase tracking-[0.14em] text-muted">{centerLabel}</span>
        )}
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max = 100,
  color = "#a1a1aa",
  className = "",
}: {
  value: number;
  max?: number;
  color?: string;
  className?: string;
}) {
  const pctW = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08] ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pctW}%` }}
        transition={{ duration: 0.8, ease }}
      />
    </div>
  );
}
