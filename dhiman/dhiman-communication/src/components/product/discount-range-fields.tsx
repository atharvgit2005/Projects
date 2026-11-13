"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type DiscountRangeFieldsProps = {
  minName: string;
  maxName: string;
  maxValue: number;
  defaultMin?: string;
  defaultMax?: string;
  className?: string;
};

export function DiscountRangeFields({
  minName,
  maxName,
  maxValue,
  defaultMin,
  defaultMax,
  className,
}: DiscountRangeFieldsProps) {
  const normalizedMax = Math.max(0, maxValue);
  const [minDiscount, setMinDiscount] = useState(() =>
    clamp(Number(defaultMin ?? 0) || 0, 0, normalizedMax),
  );
  const [maxDiscount, setMaxDiscount] = useState(() =>
    clamp(Number(defaultMax ?? normalizedMax) || normalizedMax, 0, normalizedMax),
  );

  return (
    <div className={cn("rounded-3xl border border-white/8 bg-white/4 p-4", className)}>
      <input type="hidden" name={minName} value={String(minDiscount)} />
      <input type="hidden" name={maxName} value={String(maxDiscount)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-slate-200">Discount range</p>
          <p className="text-xs text-slate-500">Dynamic max available now: {normalizedMax}%</p>
        </div>
        <p className="text-sm text-cyan-200">
          {minDiscount}% to {maxDiscount}%
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-200">Minimum discount</span>
          <input
            type="range"
            min={0}
            max={normalizedMax}
            value={minDiscount}
            onChange={(event) => {
              const value = clamp(Number(event.target.value) || 0, 0, maxDiscount);
              setMinDiscount(value);
            }}
            className="w-full accent-cyan-300"
          />
          <input
            type="number"
            min={0}
            max={normalizedMax}
            value={minDiscount}
            onChange={(event) => {
              const value = clamp(Number(event.target.value) || 0, 0, maxDiscount);
              setMinDiscount(value);
            }}
            className="w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm font-medium text-slate-200">Maximum discount</span>
          <input
            type="range"
            min={0}
            max={normalizedMax}
            value={maxDiscount}
            onChange={(event) => {
              const value = clamp(Number(event.target.value) || 0, minDiscount, normalizedMax);
              setMaxDiscount(value);
            }}
            className="w-full accent-cyan-300"
          />
          <input
            type="number"
            min={0}
            max={normalizedMax}
            value={maxDiscount}
            onChange={(event) => {
              const value = clamp(Number(event.target.value) || 0, minDiscount, normalizedMax);
              setMaxDiscount(value);
            }}
            className="w-full rounded-2xl border border-white/12 bg-slate-950/70 px-4 py-3 text-sm text-white"
          />
        </label>
      </div>
    </div>
  );
}
