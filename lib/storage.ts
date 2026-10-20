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

function parseSession(v: unknown): Session | null {
  if (!isObject(v)) return null;
  const { id, date, focus, entries, createdAt } = v;
  if (typeof id !== "string" || !id) return null;
  if (!isDateString(date)) return null;
  if (typeof focus !== "string" || !(focus in DAYS)) return null;
  if (!Array.isArray(entries)) return null;
  const cleaned: ExerciseEntry[] = [];
  for (const e of entries) {
    if (!isObject(e) || typeof e.exerciseId !== "string" || !getExercise(e.exerciseId)) continue;
    if (!Array.isArray(e.sets)) continue;
    const sets = e.sets.map(parseSet).filter((s): s is SetEntry => s !== null);
    if (sets.length > 0) cleaned.push({ exerciseId: e.exerciseId, sets });
  }
  if (cleaned.length === 0) return null;
  return {
    id,
    date,
    focus: focus as DayType,
    entries: cleaned,
    createdAt: typeof createdAt === "number" && Number.isFinite(createdAt) ? createdAt : 0,
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
  const sessions = rawSessions.map(parseSession).filter((s): s is Session => s !== null);

  const recovered =
    (json.profile !== null && profile === null) ||
    !Array.isArray(json.sessions) ||
    sessions.length !== rawSessions.length;

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

export function convertSessions(sessions: Session[], from: Unit, to: Unit): Session[] {
  if (from === to) return sessions;
  return sessions.map((s) => ({
    ...s,
    entries: s.entries.map((e) => ({
      ...e,
      sets: e.sets.map((set) => ({
        ...set,
        weight: set.weight === null ? null : convertWeight(set.weight, from, to),
      })),
    })),
  }));
}

export function fmtWeight(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}
