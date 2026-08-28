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
  /* Primary - white pill, black text, hover scale up */
  primary:
    "bg-white text-black hover:scale-[1.02] hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
  /* Secondary - transparent, hairline border, hover soft dark bg fill */
  outline:
    "border border-white/15 text-fg hover:bg-white/10 hover:border-white/25",
  ghost: "text-muted hover:text-fg hover:bg-white/5",
  dark: "bg-white/10 text-fg hover:bg-white/[0.16]",
  danger:
    "border border-zinc-300/30 bg-zinc-400/10 text-zinc-100 hover:bg-zinc-400/20",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-4 text-[12.5px] gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-[15px] gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", href, className = "", children, ...rest }, ref) => {
    const classes = [
      "inline-flex items-center justify-center rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 ease-out select-none whitespace-nowrap",
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
