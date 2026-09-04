const FACTS = [
  "Read-only access to Gmail, Google Drive & Slack",
  "Encrypted in transit and at rest",
  "Never shared, never sold, never used for training",
  "First review in under two minutes",
  "We cannot move money or modify accounts",
];

const SOURCES = [
  "Software contracts",
  "Invoices & order forms",
  "Subscription terms",
  "Renewal notices",
];

export function TrustStrip() {
  return (
    <div className="border-y border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-1.5 border-b border-line/60 px-5 py-3 lg:px-8">
        <span className="shrink-0 text-[12px] font-[510] tracking-[-0.01em] text-ash">
          Watches your
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
