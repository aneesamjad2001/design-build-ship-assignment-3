/** The saved data's shape, plus loading it defensively. Browser storage can
 *  hold anything (old versions, hand edits, a cleared half-write), so we
 *  validate on the way in and never let bad data crash the app. */

import { isDateString } from "./dates.ts";
import { DAYS, getExercise } from "./exercises.ts";
import type { DayType } from "./exercises.ts";
import { GOALS, clampDays } from "./plans.ts";
import type { Goal } from "./plans.ts";

export const STORAGE_KEY = "ironlog:v1";
export const MAX_REPS = 100;
export const MAX_WEIGHT = 1000;

export type Unit = "lb" | "kg";

export interface Profile {
  goal: Goal;
  daysPerWeek: number;
  unit: Unit;
  createdAt: number;
}

export interface SetEntry {
  /** null = bodyweight / not recorded */
  weight: number | null;
  reps: number;
}

export interface ExerciseEntry {
  exerciseId: string;
  sets: SetEntry[];
}

export interface Session {
  id: string;
  date: string;
  focus: DayType;
  entries: ExerciseEntry[];
  createdAt: number;
  /** The unit these weights were entered in. Saved data is never converted
   *  in place — conversion happens only when displaying, so switching units
   *  back and forth can't drift or drop anything. */
  unit: Unit;
}

export interface Data {
  version: 1;
  profile: Profile | null;
  sessions: Session[];
}

export const EMPTY_DATA: Data = { version: 1, profile: null, sessions: [] };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseSet(v: unknown): SetEntry | null {
  if (!isObject(v)) return null;
  const { weight, reps } = v;
  if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 1 || reps > MAX_REPS) return null;
  if (weight !== null && weight !== undefined) {
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0 || weight > MAX_WEIGHT) return null;
    return { weight, reps };
  }
  return { weight: null, reps };
}

/** A session plus how many pieces of it had to be thrown away to make it valid. */
function parseSession(v: unknown, fallbackUnit: Unit): { session: Session | null; dropped: number } {
  if (!isObject(v)) return { session: null, dropped: 1 };
  const { id, date, focus, entries, createdAt, unit } = v;
  if (typeof id !== "string" || !id) return { session: null, dropped: 1 };
  if (!isDateString(date)) return { session: null, dropped: 1 };
  if (typeof focus !== "string" || !(focus in DAYS)) return { session: null, dropped: 1 };
  if (!Array.isArray(entries)) return { session: null, dropped: 1 };
  const cleaned: ExerciseEntry[] = [];
  let dropped = 0;
  for (const e of entries) {
    if (!isObject(e) || typeof e.exerciseId !== "string" || !getExercise(e.exerciseId) || !Array.isArray(e.sets)) {
      dropped++;
      continue;
    }
    const sets = e.sets.map(parseSet).filter((s): s is SetEntry => s !== null);
    dropped += e.sets.length - sets.length;
    if (sets.length > 0) cleaned.push({ exerciseId: e.exerciseId, sets });
    else dropped++;
  }
  if (cleaned.length === 0) return { session: null, dropped: dropped + 1 };
  return {
    session: {
      id,
      date,
      focus: focus as DayType,
      entries: cleaned,
      createdAt: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : 0,
      // sessions saved before units were tracked per session were kept in the profile's unit
      unit: unit === "kg" || unit === "lb" ? unit : fallbackUnit,
    },
    dropped,
  };
}

function parseProfile(v: unknown): Profile | null {
  if (!isObject(v)) return null;
  const { goal, daysPerWeek, unit, createdAt } = v;
  if (!GOALS.some((g) => g.id === goal)) return null;
  if (typeof daysPerWeek !== "number" || !Number.isFinite(daysPerWeek)) return null;
  return {
    goal: goal as Goal,
    daysPerWeek: clampDays(daysPerWeek),
    unit: unit === "kg" ? "kg" : "lb",
    createdAt: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : 0,
  };
}

export interface Loaded {
  data: Data;
  /** True when something unreadable was dropped, so we can say so. */
  recovered: boolean;
}

/** Turn whatever was in storage into valid data. Never throws. */
export function parseData(raw: string | null): Loaded {
  if (raw === null || raw === "") return { data: EMPTY_DATA, recovered: false };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { data: EMPTY_DATA, recovered: true };
  }
  if (!isObject(json) || json.version !== 1) return { data: EMPTY_DATA, recovered: true };

  const profile = json.profile === null ? null : parseProfile(json.profile);
  const rawSessions = Array.isArray(json.sessions) ? json.sessions : [];
  const sessions: Session[] = [];
  let dropped = 0;
  for (const raw of rawSessions) {
    const r = parseSession(raw, profile?.unit ?? "lb");
    dropped += r.dropped;
    if (r.session) sessions.push(r.session);
  }

  // anything discarded at any level — a whole session or a single set — is reported
  const recovered = (json.profile !== null && profile === null) || !Array.isArray(json.sessions) || dropped > 0;

  return { data: { version: 1, profile, sessions }, recovered };
}

export function serialize(data: Data): string {
  return JSON.stringify(data);
}

const LB_PER_KG = 2.2046226218;

/** Convert a weight between units, rounded to the nearest half. */
export function convertWeight(w: number, from: Unit, to: Unit): number {
  if (from === to) return w;
  const raw = from === "lb" ? w / LB_PER_KG : w * LB_PER_KG;
  return Math.round(raw * 2) / 2;
}

/** Sessions as shown in `to`. Each is converted from the unit it was entered
 *  in, so nothing is converted twice and the saved originals stay untouched. */
export function sessionsIn(sessions: Session[], to: Unit): Session[] {
  return sessions.map((s) =>
    s.unit === to
      ? s
      : {
          ...s,
          unit: to,
          entries: s.entries.map((e) => ({
            ...e,
            sets: e.sets.map((set) => ({
              ...set,
              weight: set.weight === null ? null : convertWeight(set.weight, s.unit, to),
            })),
          })),
        },
  );
}

export function fmtWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}
