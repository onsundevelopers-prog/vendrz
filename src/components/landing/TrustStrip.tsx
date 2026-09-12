const FACTS = [
  "Reads contracts, invoices, and subscription terms",
  "Every finding cites its source document",
  "Annual impact calculated from your own terms",
  "Deadline tracking for renewals and cancellation windows",
  "No credit card required for the 30-day trial",
];

const SOURCES = [
  "PDF & DOCX uploads",
  "Gmail (read-only)",
  "Google Drive (read-only)",
  "Slack (read-only)",
];

export function TrustStrip() {
  return (
    <div className="border-y border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-1.5 border-b border-line/60 px-5 py-3 lg:px-8">
        <span className="shrink-0 text-[12px] font-[510] tracking-[-0.01em] text-ash">
          N4MA reads
        </span>
        {SOURCES.map((v) => (
          <span key={v} className="text-[12.5px] font-normal tracking-[-0.011em] text-muted">
            {v}
          </span>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-1.5 px-5 py-3 lg:px-8">
        {FACTS.map((f) => (
          <span key={f} className="text-[12px] font-normal tracking-[-0.01em] text-faint">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
