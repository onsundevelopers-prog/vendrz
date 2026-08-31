/* ------------------------------------------------------------------ */
/*  Brand mark - the company's real logo (public/brand/logo.png).      */
/*                                                                     */
/*  Rendered exactly as provided: no re-encoding, no crop, no tint,    */
/*  no resynthesis. The only thing CSS controls is the display size    */
/*  (object-contain keeps the 1:1 asset undistorted).                  */
/* ------------------------------------------------------------------ */

export function Logo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- brand asset must render 1:1, never re-encoded */}
      <img
        src="/brand/logo.png"
        alt="n4ma"
        width={2000}
        height={2000}
        className="block h-[22px] w-[22px] object-contain"
      />
    </span>
  );
}