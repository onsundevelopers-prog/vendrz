/* ------------------------------------------------------------------ */
/*  N4 monogram mark - black "N"+"4" glyph on the off-white tile       */
/*  (#F7F6F2), identical to the favicon and the reference PNG.         */
/*  Rendered as inline SVG so it stays crisp at every size and on      */
/*  every surface; the wordmark follows in the readable light tone.    */
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
        className="flex size-[22px] shrink-0 items-center justify-center rounded-[6px] bg-[#F7F6F2]"
      >
        <svg viewBox="0 0 64 64" className="size-[15px]" focusable="false">
          <g
            fill="none"
            stroke="#000000"
            strokeWidth="9"
            strokeLinecap="butt"
            strokeLinejoin="miter"
          >
            {/* 4 - diagonal rising right, horizontal bar, vertical drop */}
            <path d="M12 30 L20 10" />
            <path d="M12 30 L52 30" />
            <path d="M52 30 L52 60" />
            {/* N - left bar with sloped top, diagonal to bottom right,
                right stem shared with the 4's vertical */}
            <path d="M16 60 L16 38 L28 44" />
            <path d="M16 38 L52 60" />
          </g>
        </svg>
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">
        Noma
      </span>
    </span>
  );
}
