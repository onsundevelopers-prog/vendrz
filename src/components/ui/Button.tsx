"use client";

import Link from "next/link";
import { forwardRef } from "react";

type Variant = "primary" | "outline" | "ghost" | "dark" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  href?: string;
}

const VARIANTS: Record<Variant, string> = {
  /* Primary - the single chromatic action: acid lime, void text, 6px radius */
  primary:
    "bg-acid text-[#08090a] hover:bg-[#eefc35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-acid",
  /* Secondary - transparent, graphite hairline, mist text, hover fills */
  outline:
    "border border-line text-muted hover:border-line-strong hover:bg-white/[0.04] hover:text-fg",
  ghost: "text-faint hover:text-fg hover:bg-white/5",
  dark: "bg-white/10 text-muted hover:bg-white/[0.16] hover:text-fg",
  danger: "border border-coral/40 bg-coral/10 text-[#f5b5b5] hover:bg-coral/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-4 text-[12.5px] gap-1.5",
  md: "h-10 px-4 text-[13.5px] gap-2",
  lg: "h-11 px-6 text-[14px] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", href, className = "", children, ...rest }, ref) => {
    const classes = [
      "inline-flex items-center justify-center rounded-md font-[510] tracking-[-0.011em] transition-all duration-200 ease-out select-none whitespace-nowrap",
      "disabled:opacity-50 disabled:pointer-events-none",
      "active:scale-[0.98]",
      VARIANTS[variant],
      SIZES[size],
      className,
    ].join(" ");

    if (href) {
      const onClick = rest.onClick as
        | React.MouseEventHandler<HTMLAnchorElement>
        | undefined;
      return (
        <Link href={href} className={classes} onClick={onClick}>
          {children}
        </Link>
      );
    }
    return (
      <button ref={ref} className={classes} {...rest}>
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";