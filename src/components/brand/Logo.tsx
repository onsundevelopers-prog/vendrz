export function Logo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">
        Vendor <span className="font-normal text-muted">Watchtower</span>
      </span>
    </span>
  );
}
