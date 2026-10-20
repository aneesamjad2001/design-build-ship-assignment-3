/** Validation for the "Log a session" form. Pure so it can be tested; the
 *  messages say what to do next, and the form keeps whatever was typed. */

import { isDateString } from "./dates.ts";
import { DAYS } from "./exercises.ts";
import type { DayType } from "./exercises.ts";
import { MAX_REPS, MAX_WEIGHT } from "./storage.ts";
import type { ExerciseEntry } from "./storage.ts";

export interface FormSet {
  weight: string;
  reps: string;
}

export interface FormExercise {
  exerciseId: string;
  sets: FormSet[];
}

export interface SessionForm {
  date: string;
  focus: string;
  exercises: FormExercise[];
}

export type FormErrors = Record<string, string>;

export const setKey = (ex: number, set: number, field: "weight" | "reps") => `ex${ex}.set${set}.${field}`;

export interface ValidationResult {
  errors: FormErrors;
  /** Present only when valid. */
  session?: { date: string; focus: DayType; entries: ExerciseEntry[] };
}

/** Parse a typed weight: "135", "135.5", "135,5". Returns NaN when unreadable. */
export function parseWeight(text: string): number {
  const t = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

export function validateSession(form: SessionForm, today: string): ValidationResult {
  const errors: FormErrors = {};

  if (!form.date) {
    errors.date = "Pick the date of your session.";
  } else if (!isDateString(form.date)) {
    errors.date = "Enter the date as month, day and year — or pick it from the calendar.";
  } else if (form.date > today) {
    errors.date = "Pick today or an earlier date — future sessions can't be logged yet.";
  }

  if (!(form.focus in DAYS)) {
    errors.focus = "Choose which workout you did.";
  }

  const entries: ExerciseEntry[] = [];
  form.exercises.forEach((ex, ei) => {
    const sets: ExerciseEntry["sets"] = [];
    ex.sets.forEach((s, si) => {
      const weightText = s.weight.trim();
      const repsText = s.reps.trim();
      if (!weightText && !repsText) return; // an untouched row is simply skipped

      let weight: number | null = null;
      if (weightText) {
        const w = parseWeight(weightText);
        if (Number.isNaN(w) || w > MAX_WEIGHT) {
          errors[setKey(ei, si, "weight")] =
            `Enter the weight as a number from 0 to ${MAX_WEIGHT.toLocaleString("en-US")}, or leave it blank for bodyweight.`;
        } else {
          weight = w;
        }
      }

      if (!repsText) {
        errors[setKey(ei, si, "reps")] = "Enter how many reps you did at this weight.";
      } else if (!/^\d+$/.test(repsText) || Number(repsText) < 1 || Number(repsText) > MAX_REPS) {
        errors[setKey(ei, si, "reps")] = `Enter reps as a whole number from 1 to ${MAX_REPS}.`;
      } else if (!errors[setKey(ei, si, "weight")]) {
        sets.push({ weight, reps: Number(repsText) });
      }
    });
    if (sets.length > 0) entries.push({ exerciseId: ex.exerciseId, sets });
  });

  const hasFieldErrors = Object.keys(errors).length > 0;
  if (!hasFieldErrors && entries.length === 0) {
    errors.form = "Enter the reps for at least one set, then save.";
  }

  if (Object.keys(errors).length > 0) return { errors };
  return { errors, session: { date: form.date, focus: form.focus as DayType, entries } };
}
