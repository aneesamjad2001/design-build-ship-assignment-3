"use client";

import type { ReactNode } from "react";

/** A short row of mutually exclusive choices, built on real radio inputs
 *  (arrow keys work). Selected is an ink fill, never the accent colour. */
export function Segmented<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
  hint,
}: {
  legend: string;
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; sub?: ReactNode }[];
  hint?: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-base font-semibold">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label
            key={o.value}
            className="group flex min-h-14 cursor-pointer flex-col items-center justify-center border-2 border-field bg-surface px-2 py-2 text-center transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-accent-ink has-[:focus-visible]:transition-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent"
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            <span className="font-display text-xl font-extrabold uppercase tracking-wide">{o.label}</span>
            {o.sub && <span className="text-xs text-muted group-has-[:checked]:text-[#333333]">{o.sub}</span>}
          </label>
        ))}
      </div>
      {hint && <p className="mt-2 text-sm text-muted">{hint}</p>}
    </fieldset>
  );
}
