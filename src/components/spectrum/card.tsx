"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpectrumCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "bordered" | "elevated";
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export function SpectrumCard({
  children,
  padding = "md",
  variant = "bordered",
  header,
  footer,
  className,
  ...props
}: SpectrumCardProps) {
  const paddingStyles: Record<string, string> = {
    none: "",
    sm: "p-4",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
  };
  const variantStyles: Record<string, string> = {
    default: "border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]",
    bordered: "border-2 border-slate-200 bg-white shadow-xs",
    elevated: "border border-slate-200 bg-white shadow-sm",
  };

  return (
    <div
      className={cn(
        "rounded-2xl flex min-w-0 flex-col",
        variantStyles[variant],
        paddingStyles[padding],
        className,
      )}
      {...props}
    >
      {header && <div className="mb-4 flex items-start justify-between gap-3">{header}</div>}
      <div className="min-w-0 flex-1">{children}</div>
      {footer && <div className="mt-4 flex items-center justify-end gap-2">{footer}</div>}
    </div>
  );
}

export interface SpectrumCardSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function SpectrumCardSection({
  title,
  subtitle,
  actions,
  children,
  className,
}: SpectrumCardSectionProps & { children?: React.ReactNode }) {
  return (
    <section className={cn("overflow-hidden", className)}>
      {title || actions ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {title && (
              <h2 className="h-section">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="card-pad">{children}</div>
    </section>
  );
}
