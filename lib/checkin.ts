/** Body check-ins: a few numbers, once in a while. Trends only — never targets. */

import { isDateString } from "./dates.ts";
import type { Unit } from "./adapt.ts";

export type CheckinField = "weight" | "waist" | "chest" | "hips" | "arm";

export interface Checkin {
  id: string;
  date: string;
  /** weight in lb or kg; lengths in inches or cm (inches go with lb, cm with kg) */
  unit: Unit;
  weight?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  arm?: number;
  createdAt: number;
}

export const CHECKIN_FIELDS: { key: CheckinField; label: string }[] = [
  { key: "weight", label: "Body weight" },
  { key: "waist", label: "Waist" },
  { key: "chest", label: "Chest" },
  { key: "hips", label: "Hips" },
  { key: "arm", label: "Upper arm" },
];

export const fieldLabel = (f: CheckinField) => CHECKIN_FIELDS.find((x) => x.key === f)!.label;

export const unitFor = (field: CheckinField, unit: Unit): string => (field === "weight" ? unit : unit === "lb" ? "in" : "cm");

/** Plausible values, so a typo gets caught without ever judging a real body. */
export function limits(field: CheckinField, unit: Unit): [number, number] {
  if (field === "weight") return unit === "lb" ? [66, 660] : [30, 300];
  return unit === "lb" ? [6, 100] : [15, 250];
}

/** "180", "180.5", "180,5" → number; anything else → NaN. */
export function parseDecimal(text: string): number {
  const t = text.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export interface CheckinForm {
  date: string;
  weight: string;
  waist: string;
  chest: string;
  hips: string;
  arm: string;
}

export type CheckinErrors = Partial<Record<CheckinField | "date" | "form", string>>;

export function validateCheckin(
  form: CheckinForm,
  unit: Unit,
  today: string,
): { errors: CheckinErrors; values?: { date: string } & Partial<Record<CheckinField, number>> } {
  const errors: CheckinErrors = {};
  if (!form.date) errors.date = "Pick the date of this check-in.";
  else if (!isDateString(form.date)) errors.date = "Enter the date as month, day and year — or pick it from the calendar.";
  else if (form.date > today) errors.date = "Pick today or an earlier date.";

  const values: Partial<Record<CheckinField, number>> = {};
  for (const { key, label } of CHECKIN_FIELDS) {
    const text = form[key].trim();
    if (!text) continue;
    const n = parseDecimal(text);
    const [lo, hi] = limits(key, unit);
    if (Number.isNaN(n)) errors[key] = `Enter your ${label.toLowerCase()} as a number, like ${key === "weight" ? (unit === "lb" ? "165.5" : "75.5") : unit === "lb" ? "32" : "81"}.`;
    else if (n < lo || n > hi) errors[key] = `That looks off — ${label.toLowerCase()} is usually between ${lo} and ${hi} ${unitFor(key, unit)}. Check the number.`;
    else values[key] = n;
  }

  if (Object.keys(errors).length === 0 && Object.keys(values).length === 0) {
    errors.form = "Enter at least one measurement to save a check-in.";
  }
  if (Object.keys(errors).length > 0) return { errors };
  return { errors, values: { date: form.date, ...values } };
}

const IN_PER_CM = 1 / 2.54;
const LB_PER_KG = 2.2046226218;

function convert(field: CheckinField, v: number, from: Unit, to: Unit): number {
  if (from === to) return v;
  const factor = field === "weight" ? (from === "lb" ? 1 / LB_PER_KG : LB_PER_KG) : from === "lb" ? 2.54 : IN_PER_CM;
  return Math.round(v * factor * 10) / 10;
}

/** Check-ins as shown in `to`, converted from the unit each was entered in. */
export function checkinsIn(checkins: Checkin[], to: Unit): Checkin[] {
  return checkins.map((c) => {
    if (c.unit === to) return c;
    const next: Checkin = { ...c, unit: to };
    for (const { key } of CHECKIN_FIELDS) {
      const v = c[key];
      if (v !== undefined) next[key] = convert(key, v, c.unit, to);
    }
    return next;
  });
}

/** Oldest first, one point per check-in that recorded this field. */
export function series(checkins: Checkin[], field: CheckinField): { date: string; value: number }[] {
  return checkins
    .filter((c) => c[field] !== undefined)
    .sort((a, b) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1))
    .map((c) => ({ date: c.date, value: c[field] as number }));
}
