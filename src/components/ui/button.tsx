"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "ghost" | "outline" | "subtle" | "danger";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  default:
    "bg-accent text-accent-fg hover:brightness-110 shadow-[0_0_0_1px_hsl(var(--accent)/0.4),0_8px_24px_-8px_hsl(var(--accent)/0.6)]",
  ghost: "hover:bg-surface-2 text-fg/80 hover:text-fg",
  outline: "border border-border bg-transparent hover:bg-surface-2 text-fg",
  subtle: "bg-surface-2 text-fg hover:brightness-125",
  danger: "bg-warn/90 text-white hover:bg-warn",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  icon: "h-9 w-9",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
