"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface SpectrumStatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  variant?: "default" | "brand";
  className?: string;
}

export function SpectrumStatCard({
  label,
  value,
  hint,
  icon,
  variant = "default",
  className,
}: SpectrumStatCardProps) {
  const borderColor =
    variant === "brand" ? "border-2 border-brand-500" : "border border-slate-200";
  const valueColor =
    variant === "brand" ? "text-brand-600" : "text-slate-900";

  return (
    <div className={cn("rounded-2xl bg-white p-5 sm:p-6 shadow-xs", borderColor, className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className={cn("mt-2 text-2xl font-semibold tracking-tight", valueColor)}>
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
        </div>
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            {icon}
          </span>
        ) : null}
      </div>
    </div>
  );
}
