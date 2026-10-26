"use client";

import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpectrumButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  href?: string;
  asChild?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/40",
  secondary:
    "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-brand-500/40",
  ghost:
    "text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500/40",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400/40",
  success:
    "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-400/40",
};

const sizeStyles: Record<string, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
  lg: "px-4 py-2.5 text-base",
};

export function SpectrumButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  disabled,
  href,
  asChild = false,
  ...props
}: SpectrumButtonProps) {
  const Common = ({
    btnChildren,
    btnDisabled,
  }: {
    btnChildren: React.ReactNode;
    btnDisabled: boolean;
  }) => (
    <button
      type="button"
      disabled={btnDisabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Procesando…</span>
        </span>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {btnChildren}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none",
          disabled || loading ? "opacity-50 cursor-not-allowed" : "",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className,
        )}
      >
        {loading ? (
          <span className="flex items-center gap-1.5">
            <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Procesando…</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </Link>
    );
  }

  if (asChild) {
    return <Common btnChildren={children} btnDisabled={disabled || loading} />;
  }

  return <Common btnChildren={children} btnDisabled={disabled || loading} />;
}
