/** The weight box in a workout: blank is fine, anything else must be a real number. */

import { parseDecimal } from "./checkin.ts";
import { MAX_WEIGHT } from "./data.ts";
import type { Unit } from "./adapt.ts";

export function validateWeightText(text: string, unit: Unit): { value: number | null; error?: string } {
  const t = text.trim();
  if (!t) return { value: null };
  const n = parseDecimal(t);
  if (Number.isNaN(n)) return { value: null, error: `Enter the weight as a number in ${unit}, like ${unit === "lb" ? "45 or 22.5" : "20 or 12.5"} — or leave it blank.` };
  if (n > MAX_WEIGHT) return { value: null, error: `That's more than ${MAX_WEIGHT} ${unit}. Check the number.` };
  return { value: n };
}
