export function Logo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">
        noma
      </span>
    </span>
  );
}
