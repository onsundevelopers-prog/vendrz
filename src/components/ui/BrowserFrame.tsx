
/**
 * Browser chrome wrapper - makes a product panel read as a real application
 * window instead of a decorative card.
 */
export function BrowserFrame({
  url,
  children,
  className = "",
  dark = true,
  right,
}: {
  url: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
  right?: React.ReactNode;
}) {
  const chrome = dark ? "bg-panel border-line" : "bg-surface border-line";
  const urlBar = dark ? "bg-black/40 border-line text-muted" : "bg-black/40 border-line text-muted";

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-glow ${chrome} ${className}`}
    >
      {/* chrome bar */}
      <div className={`flex items-center gap-3 border-b px-4 py-3 ${dark ? "border-line" : "border-line"}`}>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-white/[0.12]" />
          <span className="size-2.5 rounded-full bg-white/[0.12]" />
          <span className="size-2.5 rounded-full bg-white/[0.12]" />
        </div>
        <div className={`flex h-7 min-w-0 flex-1 items-center justify-center rounded-md border px-3 ${urlBar}`}>
          <span className="truncate text-[11.5px] tracking-tight">{url}</span>
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  );
}
