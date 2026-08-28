const FACTS = [
  "Read-only access, always",
  "Encrypted in transit and at rest",
  "Never shared, never sold, never used for training",
  "First review in under two minutes",
  "We cannot move money or modify accounts",
];

const SOURCES = [
  "Vendor contracts",
  "Invoices & order forms",
  "Renewal notices",
  "PDF · DOCX",
];

export function TrustStrip() {
  return (
    <div className="border-y border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-1.5 border-b border-line/60 px-5 py-3 lg:px-8">
        <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted/60">
          Reads your own
        </span>
        {SOURCES.map((v) => (
          <span key={v} className="text-[12.5px] tracking-tight text-muted">
            {v}
          </span>
        ))}
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-1.5 px-5 py-3 lg:px-8">
        {FACTS.map((f) => (
          <span key={f} className="text-[12px] tracking-tight text-muted/70">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
