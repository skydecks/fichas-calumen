"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpectrumBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "slate" | "blue" | "green" | "amber" | "red";
}

const variantStyles: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-brand-100 text-brand-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
};

export function SpectrumBadge({
  variant = "slate",
  className,
  ...props
}: SpectrumBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset",
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

export const STATUS_BADGE_VARIANTS: Record<string, string> = {
  BORRADOR: "slate",
  REVISADA: "amber",
  EMITIDA: "green",
  ARCHIVADA: "red",
  PROSPECTO: "slate",
  EN_DISENO: "blue",
  COTIZADO: "amber",
  ADJUDICADO: "green",
  CERRADO: "slate",
  active: "green",
  inactive: "slate",
};
