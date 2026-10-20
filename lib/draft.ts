/** An unfinished workout, saved as you type so a locked phone, a switched app,
 *  or an accidental tap on another tab doesn't cost you the sets you entered. */

import { DAYS, getExercise } from "./exercises.ts";
import type { Unit } from "./storage.ts";
import type { SessionForm } from "./validate.ts";

export const DRAFT_KEY = "ironlog:draft:v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface Draft {
  savedAt: number;
  unit: Unit;
  note: string;
  form: SessionForm;
}

/** Has anything actually been typed? An untouched prefilled form isn't worth saving. */
export function hasTypedData(form: SessionForm, note = ""): boolean {
  return note.trim() !== "" || form.exercises.some((e) => e.sets.some((s) => s.weight.trim() !== "" || s.reps.trim() !== ""));
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Validate whatever is in storage. Old (over a day) or malformed drafts are ignored. */
export function parseDraft(raw: string | null, now: number): Draft | null {
  if (!raw) return null;
  let j: unknown;
  try {
    j = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(j) || typeof j.savedAt !== "number" || now - j.savedAt > MAX_AGE_MS || now < j.savedAt - 60_000) return null;
  if (j.unit !== "lb" && j.unit !== "kg") return null;
  const form = j.form;
  if (!isObj(form) || typeof form.date !== "string" || typeof form.focus !== "string" || !(form.focus in DAYS)) return null;
  if (!Array.isArray(form.exercises) || form.exercises.length > 20) return null;
  const exercises = [];
  for (const e of form.exercises) {
    if (!isObj(e) || typeof e.exerciseId !== "string" || !getExercise(e.exerciseId) || !Array.isArray(e.sets) || e.sets.length > 30) return null;
    const sets = [];
    for (const s of e.sets) {
      if (!isObj(s) || typeof s.weight !== "string" || typeof s.reps !== "string" || s.weight.length > 12 || s.reps.length > 6) return null;
      sets.push({ weight: s.weight, reps: s.reps });
    }
    exercises.push({ exerciseId: e.exerciseId, sets });
  }
  return {
    savedAt: j.savedAt,
    unit: j.unit,
    note: typeof j.note === "string" ? j.note.slice(0, 500) : "",
    form: { date: form.date, focus: form.focus, exercises },
  };
}

/* Storage access — all failures are swallowed: a draft is a convenience, never a requirement. */

export function readDraft(now: number = Date.now()): Draft | null {
  try {
    return parseDraft(window.localStorage.getItem(DRAFT_KEY), now);
  } catch {
    return null;
  }
}

export function writeDraft(form: SessionForm, unit: Unit, note: string, now: number = Date.now()) {
  try {
    if (hasTypedData(form, note)) {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: now, unit, note, form } satisfies Draft));
    } else {
      window.localStorage.removeItem(DRAFT_KEY);
    }
  } catch {
    /* storage unavailable or full */
  }
}

export function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
