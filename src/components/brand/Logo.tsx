/* ------------------------------------------------------------------ */
/*  Brand mark - black 3/4 circle (bottom-right quadrant cut away)    */
/*  on an off-white #efefef tile. Solid black core at the center      */
/*  fades into a stippled / halftone dot texture toward the curved    */
/*  edge, matching the reference mark. Rendered as inline SVG so it   */
/*  stays crisp at every size; the "n4ma" wordmark follows in the     */
/*  readable light tone.                                              */
/* ------------------------------------------------------------------ */

export function Logo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden="true"
        className="flex size-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#efefef]"
      >
        <svg viewBox="0 0 64 64" className="size-[15px]" focusable="false">
          <defs>
            {/* solid core -> fade toward the outer edge */}
            <radialGradient id="ph-solid" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#000000" />
              <stop offset="24%" stopColor="#000000" />
              <stop offset="38%" stopColor="rgba(0,0,0,0.9)" />
              <stop offset="50%" stopColor="rgba(0,0,0,0.62)" />
              <stop offset="64%" stopColor="rgba(0,0,0,0.34)" />
              <stop offset="78%" stopColor="rgba(0,0,0,0.14)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0)" />
            </radialGradient>

            {/* halftone mask: dense stipple in the ring, fading at the outer edge */}
            <radialGradient id="ph-dots-mask" cx="50%" cy="50%" r="50%">
              <stop offset="40%" stopColor="#000000" stopOpacity="0" />
              <stop offset="55%" stopColor="#000000" stopOpacity="0.75" />
              <stop offset="72%" stopColor="#000000" stopOpacity="1" />
              <stop offset="88%" stopColor="#000000" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>

            <mask id="ph-dots-maskref">
              <rect width="64" height="64" fill="url(#ph-dots-mask)" />
            </mask>

            {/* stipple dots covering the 3/4 disc, gated by the mask */}
            <pattern
              id="ph-dots"
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2.5" cy="2.5" r="1.35" fill="#000000" />
            </pattern>
          </defs>

          {/* 3/4 circle: straight right from center, arc over the top /
              left / bottom, straight up to close - bottom-right quadrant
              left as empty background */}
          <path
            d="M32 32 L56 32 A24 24 0 1 1 32 56 L32 32 Z"
            fill="url(#ph-solid)"
          />
          <g mask="url(#ph-dots-maskref)">
            <path
              d="M32 32 L56 32 A24 24 0 1 1 32 56 L32 32 Z"
              fill="url(#ph-dots)"
            />
          </g>
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">
        n4ma
      </span>
    </span>
  );
}