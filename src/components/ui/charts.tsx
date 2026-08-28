"use client";

/* ------------------------------------------------------------------ */
/*  Analytical SVG charts - axes, gridlines, labels, tooltips.        */
/*  These are data instruments, not decoration: every mark maps to    */
/*  a real value from the user's records.                             */
/*  Motion follows the Apple language: marks grow into place on a     */
/*  soft ease (bars rise from zero, the area line draws left→right,   */
/*  donut segments sweep) - restrained, no glow.                      */
/* ------------------------------------------------------------------ */

import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export function BarChart({
  data,
  height = 200,
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
  const H = height;
  // Left gutter for y-axis tick labels (fits "$1.2M" etc.)
  const padL = 44;
  const padR = 6;
  const padT = 8;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const bw = plotW / data.length;

  // 4 gridlines: 0%, 33%, 67%, 100% of max.
  const ticks = [0, 1, 2, 3].map((i) => ({
    y: padT + plotH - (i / 3) * plotH,
    value: (max * i) / 3,
  }));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: H }}>
        {/* gridlines + y-axis tick labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={t.y}
              y2={t.y}
              stroke={i === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}
              strokeDasharray={i === 0 ? undefined : "3 4"}
            />
            <text x={padL - 6} y={t.y + 3} textAnchor="end" fontSize="8.5" fill="rgba(255,255,255,0.4)" fontFamily="var(--font-geist-mono), monospace">
              {format(t.value)}
            </text>
          </g>
        ))}

        {/* bars - grow up from the baseline, staggered, on a soft ease */}
        {data.map((d, i) => {
          const h = Math.max(1, (d.value / max) * plotH);
          const x = padL + i * bw + bw * 0.2;
          const w = bw * 0.6;
          const last = highlightLast && i === data.length - 1;
          return (
            <g key={i}>
              <motion.rect
                x={x}
                width={w}
                fill={last ? color : "rgba(255,255,255,0.16)"}
                initial={{ height: 0, y: padT + plotH }}
                animate={{ height: h, y: padT + plotH - h }}
                transition={{ duration: 0.65, delay: i * 0.03, ease: EASE }}
              />
              <title>{`${d.label}: ${format(d.value)}`}</title>
            </g>
          );
        })}
      </svg>
      {/* x-axis labels */}
      <div className="mt-1 flex justify-between border-t border-line/60 pt-1 text-[9.5px] tracking-tight text-muted/80">
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
  format = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  fillId: string;
  format?: (v: number) => string;
}) {
  const W = 640;
  const H = height;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const range = Math.max(max - min, 1);
  const padL = 44;
  const padR = 6;
  const padT = 8;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const step = plotW / (data.length - 1);
  const pts = data.map((d, i) => [
    padL + i * step,
    padT + plotH - ((d.value - min) / range) * plotH,
  ] as const);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${padL + plotW},${padT + plotH} L${padL},${padT + plotH} Z`;
  const last = pts[pts.length - 1];

  const ticks = [0, 1, 2, 3].map((i) => ({
    y: padT + plotH - (i / 3) * plotH,
    value: min + (range * i) / 3,
  }));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={t.y}
              y2={t.y}
              stroke={i === 0 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}
              strokeDasharray={i === 0 ? undefined : "3 4"}
            />
            <text x={padL - 6} y={t.y + 3} textAnchor="end" fontSize="8.5" fill="rgba(255,255,255,0.4)" fontFamily="var(--font-geist-mono), monospace">
              {format(t.value)}
            </text>
          </g>
        ))}
        <motion.path
          d={area}
          fill={`url(#${fillId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.15, ease: EASE }}
        />
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r="3"
          fill={color}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.75, type: "spring", stiffness: 500, damping: 28 }}
        >
          <title>{`${data[data.length - 1]?.label}: ${format(data[data.length - 1]?.value ?? 0)}`}</title>
        </motion.circle>
      </svg>
      <div className="mt-1 flex justify-between border-t border-line/60 pt-1 text-[9.5px] tracking-tight text-muted/80">
        {data.map((d, i) => (
          <span key={i} title={format(d.value)}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
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
              initial={{ strokeDasharray: `0 ${CIRC}` }}
              animate={{
                strokeDasharray: `${len} ${CIRC - len}`,
                strokeDashoffset: -offsets[i],
              }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: EASE }}
            >
              <title>{`${d.name}: ${d.value}`}</title>
            </motion.circle>
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
    <div className={`h-1 w-full overflow-hidden rounded-sm bg-white/[0.08] ${className}`}>
      <motion.div
        className="h-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pctW}%` }}
        transition={{ duration: 0.7, ease: EASE }}
      />
    </div>
  );
}
