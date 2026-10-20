"use client";

import { FieldError } from "./Field";
import { GOALS, MAX_DAYS, MIN_DAYS } from "@/lib/plans";
import type { Goal } from "@/lib/plans";
import type { Unit } from "@/lib/storage";

/** Tiles built on real radio inputs, so arrow keys and screen readers just work. */
const tile =
  "group relative flex cursor-pointer flex-col gap-1 border-2 border-field bg-surface p-4 transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-accent-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent";

export function GoalPicker({
  value,
  onChange,
  error,
  legend = "What are you training for?",
}: {
  value: Goal | null;
  onChange: (g: Goal) => void;
  error?: string;
  legend?: string;
}) {
  return (
    <fieldset aria-describedby={error ? "goal-error" : undefined}>
      <legend className="mb-3 font-display text-3xl font-extrabold uppercase tracking-wide">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {GOALS.map((g) => (
          <label key={g.id} className={tile}>
            <input
              type="radio"
              name="goal"
              value={g.id}
              checked={value === g.id}
              onChange={() => onChange(g.id)}
              className="sr-only"
            />
            <span className="font-display text-2xl font-extrabold uppercase tracking-wide">{g.label}</span>
            <span className="font-semibold">{g.tagline}</span>
            <span className="text-sm text-muted group-has-[:checked]:text-[#333333]">{g.detail}</span>
            <span aria-hidden className="mt-1 hidden text-sm font-extrabold uppercase tracking-wider group-has-[:checked]:block">
              ✓ Selected
            </span>
          </label>
        ))}
      </div>
      {error && (
        <div className="mt-3">
          <FieldError id="goal-error">{error}</FieldError>
        </div>
      )}
    </fieldset>
  );
}

export function DaysPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const options = Array.from({ length: MAX_DAYS - MIN_DAYS + 1 }, (_, i) => MIN_DAYS + i);
  return (
    <fieldset>
      <legend className="mb-3 font-display text-3xl font-extrabold uppercase tracking-wide">Days per week</legend>
      <div className="grid grid-cols-5 gap-2">
        {options.map((n) => (
          <label key={n} className={`${tile} items-center justify-center py-3`}>
            <input
              type="radio"
              name="days"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <span className="font-stencil text-4xl font-black leading-none">{n}</span>
            <span className="sr-only">days a week</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function UnitPicker({ value, onChange }: { value: Unit; onChange: (u: Unit) => void }) {
  return (
    <fieldset>
      <legend className="mb-3 font-display text-3xl font-extrabold uppercase tracking-wide">Weight unit</legend>
      <div className="grid max-w-xs grid-cols-2 gap-2">
        {(["lb", "kg"] as Unit[]).map((u) => (
          <label key={u} className={`${tile} items-center justify-center py-3`}>
            <input type="radio" name="unit" value={u} checked={value === u} onChange={() => onChange(u)} className="sr-only" />
            <span className="font-display text-2xl font-extrabold uppercase">{u}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
