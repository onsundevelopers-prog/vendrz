/* ------------------------------------------------------------------ */
/*  Brand mark - the company's real logo (public/brand/logo.png).      */
/*                                                                     */
/*  Rendered exactly as provided: no re-encoding, no crop, no tint,    */
/*  no resynthesis. The only thing CSS controls is the display size    */
/*  (object-contain keeps the 1:1 asset undistorted).                  */
/*                                                                     */
/*  Sizes: "md" (32px) is the default used in the navbar, dashboard     */
/*  header and footer; "lg" (160px) is reserved for the auth page's     */
/*  brand panel where the logo anchors the layout.                     */
/* ------------------------------------------------------------------ */

export function Logo({
  className = "",
  size = "md",
}: {
  className?: string;
  size?: "md" | "lg";
}) {
  const box = size === "lg" ? "h-40 w-40" : "h-8 w-8";
  return (
    <span className={`inline-flex shrink-0 items-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- brand asset must render 1:1, never re-encoded */}
      <img
        src="/brand/logo.png"
        alt="n4ma"
        width={2000}
        height={2000}
        className={`block ${box} object-contain`}
      />
    </span>
  );
}