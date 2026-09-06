/* ------------------------------------------------------------------ */
/*  Brand mark - the company's real logo (public/brand/logo.png).      */
/*                                                                     */
/*  Rendered exactly as provided: no re-encoding, no crop, no tint,    */
/*  no resynthesis. The only thing CSS controls is the display size    */
/*  (object-contain keeps the 1:1 asset undistorted).                  */
/*                                                                     */
/ *  Sizes: "sm" (24px), "md" (32px, default), "lg" (48px for navbar),   */
/*  "xl" (120px for hero/auth). The size prop controls display size;    */
/*  the img is always rendered 1:1 with object-contain.                */
/* ------------------------------------------------------------------ */

export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const box = size === "xl" ? "h-30 w-30" : size === "lg" ? "h-12 w-12" : size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- brand asset must render 1:1, never re-encoded */}
      <img
        src="/brand/logo.png"
        alt="flask"
        width={2000}
        height={2000}
        className={`block ${box} object-contain`}
      />
    </span>
  );
}