/** Numbers derived from saved sessions: the week, the streak, and lifts. */

import { addDays, daysBetween, startOfWeek } from "./dates.ts";
import type { ExerciseEntry, Session, SetEntry } from "./storage.ts";

/** Distinct days someone trained. Two sessions in one day count once. */
export function trainingDates(sessions: Session[]): Set<string> {
  return new Set(sessions.map((s) => s.date));
}

export function totalTrainingDays(sessions: Session[]): number {
  return trainingDates(sessions).size;
}

/** Days trained in the Mon–Sun week containing `day`. */
export function daysInWeek(sessions: Session[], day: string): number {
  const start = startOfWeek(day);
  const end = addDays(start, 6);
  let n = 0;
  for (const d of trainingDates(sessions)) if (d >= start && d <= end) n++;
  return n;
}

/**
 * Consecutive weeks that hit the weekly target. The week in progress counts
 * once it is met, but never breaks the streak while it is still open.
 * (The current target is applied to past weeks — a simplification.)
 */
export function weeklyStreak(sessions: Session[], target: number, today: string): number {
  if (sessions.length === 0 || target < 1) return 0;
  const earliest = [...trainingDates(sessions)].sort()[0];
  const met = (weekStart: string) => daysInWeek(sessions, weekStart) >= target;

  let week = startOfWeek(today);
  let streak = 0;
  if (met(week)) streak++;
  week = addDays(week, -7);
  while (week >= startOfWeek(earliest) && met(week)) {
    streak++;
    week = addDays(week, -7);
  }
  return streak;
}

export function lastSession(sessions: Session[]): Session | undefined {
  let best: Session | undefined;
  for (const s of sessions) {
    if (!best || s.date > best.date || (s.date === best.date && s.createdAt > best.createdAt)) best = s;
  }
  return best;
}

export function daysSince(date: string, today: string): number {
  return daysBetween(date, today);
}

/** The set that best represents an exercise: heaviest weight, then most reps. */
export function topSet(sets: SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null;
  for (const s of sets) if (!best || compareSets(s, best) > 0) best = s;
  return best;
}

/** > 0 when a is a better set than b. Bodyweight (null) counts as weight 0. */
export function compareSets(a: SetEntry, b: SetEntry): number {
  const wa = a.weight ?? 0;
  const wb = b.weight ?? 0;
  if (wa !== wb) return wa - wb;
  return a.reps - b.reps;
}

export interface LiftRecord {
  date: string;
  set: SetEntry;
}

/** Most recent session containing the exercise, as its top set. */
export function lastTime(sessions: Session[], exerciseId: string): LiftRecord | null {
  let found: { s: Session; e: ExerciseEntry } | null = null;
  for (const s of sessions) {
    const e = s.entries.find((x) => x.exerciseId === exerciseId);
    if (!e) continue;
    if (!found || s.date > found.s.date || (s.date === found.s.date && s.createdAt > found.s.createdAt)) {
      found = { s, e };
    }
  }
  if (!found) return null;
  const set = topSet(found.e.sets);
  return set ? { date: found.s.date, set } : null;
}

/** Best set ever logged for an exercise, with the day it happened. */
export function personalBest(sessions: Session[], exerciseId: string): LiftRecord | null {
  let best: LiftRecord | null = null;
  for (const s of sessions) {
    const e = s.entries.find((x) => x.exerciseId === exerciseId);
    if (!e) continue;
    const set = topSet(e.sets);
    if (set && (!best || compareSets(set, best.set) > 0)) best = { date: s.date, set };
  }
  return best;
}

/** Exercises with their latest and best records, most recently done first. */
export function liftSummaries(sessions: Session[]) {
  const ids = new Set<string>();
  for (const s of sessions) for (const e of s.entries) ids.add(e.exerciseId);
  return [...ids]
    .map((exerciseId) => ({
      exerciseId,
      last: lastTime(sessions, exerciseId)!,
      best: personalBest(sessions, exerciseId)!,
    }))
    .sort((a, b) => (a.last.date < b.last.date ? 1 : a.last.date > b.last.date ? -1 : 0));
}

/**
 * Exercises where a new session beats everything logged before it. The very
 * first time an exercise is logged sets the baseline — that is not a PR.
 */
export function findNewPRs(prior: Session[], entries: ExerciseEntry[]): { exerciseId: string; set: SetEntry }[] {
  const prs: { exerciseId: string; set: SetEntry }[] = [];
  for (const entry of entries) {
    const baseline = personalBest(prior, entry.exerciseId);
    const top = topSet(entry.sets);
    if (baseline && top && compareSets(top, baseline.set) > 0) prs.push({ exerciseId: entry.exerciseId, set: top });
  }
  return prs;
}
