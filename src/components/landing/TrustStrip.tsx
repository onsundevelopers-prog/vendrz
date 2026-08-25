const FACTS = [
  "Read-only access, always",
  "Encrypted in transit and at rest",
  "Never shared, never sold, never used for training",
  "First audit in under two minutes",
  "We cannot move money or modify accounts",
];

const VENDORS = [
  "Salesforce",
  "AWS",
  "Zoom",
  "Atlassian",
  "Okta",
  "Google Workspace",
  "Microsoft",
  "DocuSign",
  "HubSpot",
  "Snowflake",
];

function Row({ items, dot = true }: { items: string[]; dot?: boolean }) {
  return (
    <div className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center gap-3 pr-6">
          <span className="whitespace-nowrap text-[13px] tracking-tight text-muted">
            {item}
          </span>
          {dot && (
            <span className="size-1 rounded-full bg-white/20" aria-hidden="true" />
          )}
        </span>
      ))}
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="relative overflow-hidden border-y border-line bg-canvas">
      {/* soft edge fades so the loop is invisible */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-canvas to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-canvas to-transparent" />

      {/* vendor names — flask.do-style marquee, opposite direction */}
      <div className="border-b border-line/60 py-3.5">
        <div className="flex w-max animate-marquee" style={{ animationDirection: "reverse" }}>
          <Row items={VENDORS} dot={false} />
          <Row items={VENDORS} dot={false} />
        </div>
      </div>

      {/* trust facts */}
      <div className="flex w-max animate-marquee py-3.5">
        <Row items={FACTS} />
        <Row items={FACTS} />
      </div>
    </div>
  );
}
