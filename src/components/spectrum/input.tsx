"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SpectrumInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export function SpectrumInput({
  label,
  hint,
  error,
  leftIcon,
  className,
  ...props
}: SpectrumInputProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="label" htmlFor={props.id}>
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          {...props}
          className={cn(
            "w-full rounded-lg border px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400",
            error
              ? "border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 pl-9"
              : "border-slate-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            leftIcon ? "pl-9" : undefined,
            className,
          )}
        />
      </div>
      {error && <p className="hint text-red-600">{error}</p>}
      {hint && !error && <p className="hint">{hint}</p>}
    </div>
  );
}

export interface SpectrumSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function SpectrumSelect({
  label,
  hint,
  leftIcon,
  className,
  ...props
}: SpectrumSelectProps) {
  return (
    <div className="space-y-1">
      {label && <label className="label" htmlFor={props.id}>{label}</label>}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {leftIcon}
          </span>
        )}
        <select
          {...props}
          className={cn(
            "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
            leftIcon ? "pl-9" : undefined,
            className,
          )}
        />
      </div>
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

export interface SpectrumTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export function SpectrumTextarea({
  label,
  hint,
  className,
  ...props
}: SpectrumTextareaProps) {
  return (
    <div className="space-y-1">
      {label && <label className="label" htmlFor={props.id}>{label}</label>}
      <textarea
        {...props}
        className={cn(
          "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition resize-y leading-relaxed",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20",
          className,
        )}
      />
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
