export function riskTone(score: number): {
  chip: string;
  text: string;
  bar: string;
} {
  if (score >= 80)
    return {
      chip: "bg-white/10 text-fg ring-white/20",
      text: "text-fg",
      bar: "bg-white",
    };
  if (score >= 60)
    return {
      chip: "bg-white/[0.07] text-zinc-300 ring-white/15",
      text: "text-zinc-300",
      bar: "bg-zinc-300",
    };
  if (score >= 35)
    return {
      chip: "bg-white/[0.06] text-zinc-400 ring-white/10",
      text: "text-zinc-400",
      bar: "bg-zinc-400",
    };
  return {
    chip: "bg-white/[0.05] text-zinc-500 ring-white/10",
    text: "text-zinc-500",
    bar: "bg-zinc-500",
  };
}

export function RiskBadge({
  score,
  label,
  size = "md",
}: {
  score: number;
  label?: string;
  size?: "sm" | "md" | "lg";
}) {
  const tone = riskTone(score);
  const sizing =
    size === "lg"
      ? "px-3.5 py-1.5 text-[15px]"
      : size === "sm"
        ? "px-2 py-0.5 text-xs"
        : "px-2.5 py-1 text-[13px]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${tone.chip} ${sizing}`}
    >
      <span className={`size-1.5 rounded-full ${tone.bar}`} />
      {score}
      {label ? <span className="font-sans font-medium opacity-75">{label}</span> : null}
    </span>
  );
}

export function RiskBar({ score, className = "" }: { score: number; className?: string }) {
  const tone = riskTone(score);
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08] ${className}`}>
      <div
        className={`h-full rounded-full ${tone.bar}`}
        style={{ width: `${score}%` }}
      />
    </div>
  );
}
