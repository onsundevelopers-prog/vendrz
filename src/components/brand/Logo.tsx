export function Logo({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white text-[12px] font-bold leading-none text-black">
        V
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.02em] text-fg">
        Vendrz
      </span>
    </span>
  );
}
