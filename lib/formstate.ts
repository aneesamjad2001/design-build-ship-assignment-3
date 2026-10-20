/** Pure helpers for the log form's state, kept out of the component so they can be tested. */

import { alternativesFor } from "./exercises.ts";
import { workoutFor } from "./plans.ts";
import { recommend } from "./recommend.ts";
import { convertWeight, fmtWeight } from "./storage.ts";
import type { Profile, Session, Unit } from "./storage.ts";
import { parseWeight } from "./validate.ts";
import type { FormSet, SessionForm } from "./validate.ts";

export const blankSets = (n: number): FormSet[] => Array.from({ length: n }, () => ({ weight: "", reps: "" }));

export const isBlankSet = (s: FormSet) => !s.weight.trim() && !s.reps.trim();

/** Today's recommended workout, ready to fill in. */
export function freshForm(profile: Profile, sessions: Session[], today: string): SessionForm {
  const focus = recommend(profile, sessions, today).day;
  return {
    date: today,
    focus,
    exercises: workoutFor(profile.goal, focus).map((p) => ({
      exerciseId: p.exercise.id,
      sets: blankSets(p.prescription.sets),
    })),
  };
}

/** An existing session as editable text fields. */
export function formFromSession(s: Session): SessionForm {
  return {
    date: s.date,
    focus: s.focus,
    exercises: s.entries.map((e) => ({
      exerciseId: e.exerciseId,
      sets: e.sets.map((x) => ({ weight: x.weight === null ? "" : fmtWeight(x.weight), reps: String(x.reps) })),
    })),
  };
}

/** Re-express every typed weight in another unit (unreadable text is left alone). */
export function convertFormWeights(form: SessionForm, from: Unit, to: Unit): SessionForm {
  if (from === to) return form;
  return {
    ...form,
    exercises: form.exercises.map((ex) => ({
      ...ex,
      sets: ex.sets.map((s) => {
        const w = parseWeight(s.weight);
        return Number.isNaN(w) ? s : { ...s, weight: fmtWeight(convertWeight(w, from, to)) };
      }),
    })),
  };
}

/**
 * "Same again": copy the last filled-in set into the next empty row, or add a
 * new row if there is none. The common gym pattern is the same weight for all sets.
 */
export function repeatLastSet(sets: FormSet[]): FormSet[] {
  let src = -1;
  sets.forEach((s, i) => {
    if (!isBlankSet(s)) src = i;
  });
  if (src === -1) return sets; // nothing to repeat yet
  const copy = { ...sets[src] };
  const next = sets.findIndex((s, i) => i > src && isBlankSet(s));
  if (next !== -1) return sets.map((s, i) => (i === next ? copy : s));
  return [...sets, copy];
}

/** ArrowUp/ArrowDown on a field: nudge the number by `step`, never below `min`. */
export function stepValue(text: string, delta: number, step: number, min: number): string {
  const current = text.trim() === "" ? 0 : parseWeight(text);
  if (Number.isNaN(current)) return text;
  const next = Math.max(min, Math.round((current + delta * step) * 100) / 100);
  return fmtWeight(next);
}

/** Other exercises that train the same muscles, for swapping one you can't do today. */
export function swapOptions(exerciseId: string, inForm: string[]) {
  return alternativesFor(exerciseId).filter((e) => !inForm.includes(e.id));
}
