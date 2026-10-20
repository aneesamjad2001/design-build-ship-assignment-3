/**
 * A rough daily calorie and protein starting point. Opt-in, a range not a number,
 * with a floor, adults only. It is deliberately not a tracker: nothing is logged.
 * Maintenance uses the Mifflin–St Jeor equation, which is a population estimate and
 * can be off by 10–20% for any one person.
 */

import type { Unit } from "./adapt.ts";
import type { LookId } from "./looks.ts";

export type Sex = "female" | "male";
export type Activity = "low" | "light" | "active";

export const ACTIVITY_LABELS: Record<Activity, string> = {
  low: "Mostly sitting",
  light: "Lightly active (some walking, now and then a workout)",
  active: "Active (on my feet a lot, or training most days)",
};

const MULTIPLIER: Record<Activity, number> = { low: 1.2, light: 1.375, active: 1.55 };

/** A small nudge from maintenance, by look. Positive = a little more to build, negative = a little less to lean out. */
const GOAL_ADJUST: Record<LookId, number> = {
  "broad-muscular": 0.08,
  "legs-glutes": 0.05,
  "lean-athletic": -0.05,
  "toned-defined": -0.08,
  "big-strong": 0.1,
  balanced: 0,
};

export interface NutritionProfile {
  age: number;
  sex: Sex;
  /** inches (with lb) or cm (with kg) */
  height: number;
  /** lb or kg */
  weight: number;
  unit: Unit;
  activity: Activity;
}

export interface NutritionForm {
  age: string;
  sex: string;
  height: string;
  weight: string;
  activity: string;
}

export type NutritionErrors = Partial<Record<"age" | "sex" | "height" | "weight" | "activity", string>>;

const parseNum = (t: string) => {
  const s = t.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

export function validateNutrition(form: NutritionForm, unit: Unit): { errors: NutritionErrors; profile?: NutritionProfile } {
  const errors: NutritionErrors = {};
  const age = parseNum(form.age);
  if (form.age.trim() === "") errors.age = "Enter your age in years.";
  else if (!Number.isInteger(age)) errors.age = "Enter your age as a whole number, like 28.";
  else if (age < 18) errors.age = "This estimate is for adults (18 and over). Ask a doctor or dietitian for guidance.";
  else if (age > 90) errors.age = "Enter an age between 18 and 90.";

  if (form.sex !== "female" && form.sex !== "male") errors.sex = "Pick the option the formula should use — it has two versions.";

  const [hLo, hHi] = unit === "lb" ? [48, 90] : [120, 230];
  const height = parseNum(form.height);
  if (form.height.trim() === "") errors.height = `Enter your height in ${unit === "lb" ? "inches" : "centimetres"}.`;
  else if (Number.isNaN(height)) errors.height = `Enter your height as a number, like ${unit === "lb" ? "68" : "173"}.`;
  else if (height < hLo || height > hHi) errors.height = `That looks off — height is usually between ${hLo} and ${hHi} ${unit === "lb" ? "in" : "cm"}. Check the number.`;

  const [wLo, wHi] = unit === "lb" ? [66, 660] : [30, 300];
  const weight = parseNum(form.weight);
  if (form.weight.trim() === "") errors.weight = `Enter your weight in ${unit}.`;
  else if (Number.isNaN(weight)) errors.weight = `Enter your weight as a number, like ${unit === "lb" ? "165" : "75"}.`;
  else if (weight < wLo || weight > wHi) errors.weight = `That looks off — weight is usually between ${wLo} and ${wHi} ${unit}. Check the number.`;

  if (!(form.activity in MULTIPLIER)) errors.activity = "Pick the option closest to your day-to-day life.";

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, profile: { age, sex: form.sex as Sex, height, weight, unit, activity: form.activity as Activity } };
}

export interface NutritionEstimate {
  maintenance: [number, number];
  target: [number, number];
  /** grams of protein per day */
  protein: [number, number];
  /** how the target relates to maintenance, in words */
  direction: "above" | "below" | "around";
}

const round50 = (n: number) => Math.round(n / 50) * 50;

export function bmr(p: NutritionProfile): number {
  const kg = p.unit === "lb" ? p.weight / 2.2046226218 : p.weight;
  const cm = p.unit === "lb" ? p.height * 2.54 : p.height;
  return 10 * kg + 6.25 * cm - 5 * p.age + (p.sex === "male" ? 5 : -161);
}

export function estimate(p: NutritionProfile, lookId: LookId): NutritionEstimate {
  const basal = bmr(p);
  const maintenance = basal * MULTIPLIER[p.activity];
  const adjust = GOAL_ADJUST[lookId] ?? 0;
  // never suggest eating below the body's resting needs
  const mid = Math.max(maintenance * (1 + adjust), basal);
  const kg = p.unit === "lb" ? p.weight / 2.2046226218 : p.weight;
  return {
    maintenance: [round50(maintenance * 0.93), round50(maintenance * 1.07)],
    target: [round50(mid * 0.95), round50(mid * 1.05)],
    protein: [Math.round(kg * 1.4), Math.round(kg * 2.0)],
    direction: adjust > 0.01 ? "above" : adjust < -0.01 ? "below" : "around",
  };
}
