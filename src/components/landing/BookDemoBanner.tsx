"use client";

export function BookDemoBanner() {
  return (
    <div className="border-y border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl items-center gap-10 px-5 py-4 lg:px-8">
        <div className="shrink-0 rounded-full bg-white px-4 py-1.5 text-[12px] font-[510] tracking-[-0.01em] text-black shadow-sm">
          #1 Product of the Month
        </div>
        <p className="text-[13.5px] font-normal text-faint">
          See why creative teams are switching to Flask for video feedback.
          Book a personalized demo and see it in action with your own footage.
        </p>
        <a
          href="#pricing"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-5 py-2 text-[13px] font-[510] tracking-[-0.011em] text-black transition-colors hover:bg-bone"
        >
          Book a Demo
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M2 6h7M6.5 3 9 6l-2.5 3"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
