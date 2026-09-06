const FACTS = [
  "Works on any video - MP4, MOV, GIF, or link",
  "Feedback is automatically transcribed and timestamped",
  "Draw, annotate, and share any reference in context",
  "Organized feedback threads by scene or moment",
  "No credit card required for 14-day free trial",
];

const SOURCES = [
  "Video files",
  "Screen recordings",
  "YouTube links",
  "Drive uploads",
];

export function TrustStrip() {
  return (
    <div className="border-y border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-7 gap-y-1.5 border-b border-line/60 px-5 py-3 lg:px-8">
        <span className="shrink-0 text-[12px] font-[510] tracking-[-0.01em] text-ash">
          Flask supports
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
