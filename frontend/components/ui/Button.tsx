import * as React from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-electric-500 to-electric-700 text-white hover:from-electric-400 hover:to-electric-600 btn-glow",
  secondary: "glass text-ink-50 hover:bg-ink-800/70",
  ghost: "text-ink-100 hover:bg-ink-800/60",
  outline:
    "border border-ink-700 text-ink-50 hover:border-electric-500/60 hover:text-white",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 " +
  "disabled:pointer-events-none disabled:opacity-60";

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], className);
}

interface ButtonOwnProps {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

export type ButtonProps = ButtonOwnProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Lightweight `asChild`: when true and children is a single element, clone it and
 * apply the button classes. Lets us style `<Link>` triggers without a Slot dep.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, children, ...props }, ref) => {
    const classes = buttonClasses({ variant, size, className });

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
