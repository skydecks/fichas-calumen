"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export const THICKNESS_PRESETS = [
  "0.76mm",
  "1.52mm",
  "3mm",
  "4mm",
  "5mm",
  "6mm",
  "8mm",
  "10mm",
  "12mm",
  "15mm",
  "19mm",
];

export default function ThicknessSelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [custom, setCustom] = useState(
    () => Boolean(value) && !THICKNESS_PRESETS.includes(value),
  );
  const isCustom = custom || (Boolean(value) && !THICKNESS_PRESETS.includes(value));

  return (
    <div className={cn("space-y-1", className)}>
      <select
        value={isCustom ? "__custom" : value}
        onChange={(event) => {
          if (event.target.value === "__custom") {
            setCustom(true);
            onChange("");
          } else {
            setCustom(false);
            onChange(event.target.value);
          }
        }}
        className="input h-8 px-2 py-1 text-xs"
        aria-label="Espesor"
      >
        <option value="">Sin espesor</option>
        {THICKNESS_PRESETS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value="__custom">Personalizado…</option>
      </select>
      {isCustom ? (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Ej. 6.5mm"
          className="input h-8 px-2 py-1 text-xs"
          aria-label="Espesor personalizado"
        />
      ) : null}
    </div>
  );
}
