/**
 * What to train next — plain rules, no AI, so the "why" is always true.
 *
 * For each day type in the user's plan, find how long its muscles have rested
 * (from the exercises actually logged). Recommend the most rested day type;
 * on a tie, follow the plan's rotation after the last workout.
 */

import { addDays, daysBetween } from "./dates.ts";
import { DAYS, getExercise } from "./exercises.ts";
import type { DayType, Exercise, Muscle } from "./exercises.ts";
import { goalLabel, planFor } from "./plans.ts";
import type { Prescription } from "./plans.ts";
import { fmtWeight } from "./storage.ts";
import type { Profile, Session, Unit } from "./storage.ts";
import { lastSession, lastTime } from "./stats.ts";

export type Status = "ready" | "trained-today" | "rest-advised";

export interface Recommendation {
  status: Status;
  day: DayType;
  reason: string;
}

/** Latest date each muscle was trained, from the exercises that were logged. */
export function lastTrainedByMuscle(sessions: Session[]): Map<Muscle, string> {
  const map = new Map<Muscle, string>();
  const mark = (m: Muscle, date: string) => {
    const prev = map.get(m);
    if (!prev || date > prev) map.set(m, date);
  };
  for (const s of sessions) {
    if (s.focus === "conditioning") mark("conditioning", s.date);
    for (const e of s.entries) {
      const ex = getExercise(e.exerciseId);
      if (ex) for (const m of ex.primary) mark(m, s.date);
    }
  }
  return map;
}

/** Days the *least* rested muscle of this day type has had off. Infinity = never trained. */
function restDays(day: DayType, last: Map<Muscle, string>, asOf: string): number {
  let min = Infinity;
  for (const m of DAYS[day].muscles) {
    const when = last.get(m);
    if (when) min = Math.min(min, daysBetween(when, asOf));
  }
  return min;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function when(n: number): string {
  return n <= 0 ? "today" : n === 1 ? "yesterday" : `${n} days ago`;
}

function reasonFor(day: DayType, rest: number, noSessions: boolean, profile: Profile): string {
  if (noSessions) {
    return `The first day of your ${profile.daysPerWeek}-day ${goalLabel(profile.goal).toLowerCase()} plan.`;
  }
  const info = DAYS[day];
  if (!Number.isFinite(rest)) {
    return day === "conditioning"
      ? "You haven't logged conditioning yet."
      : `You haven't logged ${info.focus} yet.`;
  }
  return day === "conditioning"
    ? `Conditioning was last done ${when(rest)}.`
    : `${cap(info.focus)} were last trained ${when(rest)}.`;
}

export function recommend(profile: Profile, sessions: Session[], today: string): Recommendation {
  const cycle = planFor(profile.goal, profile.daysPerWeek);
  const candidates = [...new Set(cycle)];
  const trainedToday = sessions.some((s) => s.date === today);
  // After training today, "next up" is judged as of tomorrow.
  const asOf = trainedToday ? addDays(today, 1) : today;

  const last = lastTrainedByMuscle(sessions);
  const latest = lastSession(sessions);

  // Rotate candidates so ties resolve to the day after the last workout.
  let ordered = candidates;
  if (latest) {
    const i = candidates.indexOf(latest.focus);
    if (i >= 0) ordered = [...candidates.slice(i + 1), ...candidates.slice(0, i + 1)];
  }

  let best = ordered[0];
  let bestRest = restDays(best, last, asOf);
  for (const day of ordered.slice(1)) {
    const r = restDays(day, last, asOf);
    if (r > bestRest) {
      best = day;
      bestRest = r;
    }
  }

  const restNow = restDays(best, last, today);
  const reason = reasonFor(best, restNow, sessions.length === 0, profile);

  if (trainedToday) return { status: "trained-today", day: best, reason };
  // Under two days off and nothing better available: recovery is the plan.
  if (bestRest < 2 && best !== "conditioning") {
    return {
      status: "rest-advised",
      day: best,
      reason: `${cap(DAYS[best].focus)} were trained ${when(restNow)} — they grow while they recover.`,
    };
  }
  return { status: "ready", day: best, reason };
}

export interface Suggestion {
  weight: number | null;
  reps: number;
  text: string;
}

/** Progressive overload: add a rep, then add weight once the top of the range is reached. */
export function suggestNext(
  exercise: Exercise,
  rx: Prescription,
  sessions: Session[],
  unit: Unit,
): Suggestion | null {
  const last = lastTime(sessions, exercise.id);
  if (!last) return null;
  const { weight, reps } = last.set;
  const bump = exercise.kind === "compound" ? (unit === "lb" ? 5 : 2.5) : unit === "lb" ? 2.5 : 1;

  let nextWeight = weight;
  let nextReps: number;
  const loaded = !!weight && weight > 0;
  if (reps >= rx.repMax) {
    // unloaded movements can't "add weight", so keep the reps instead of resetting them
    nextWeight = loaded ? weight + bump : weight;
    nextReps = loaded ? rx.repMin : reps;
  } else if (reps < rx.repMin) {
    nextReps = rx.repMin;
  } else {
    nextReps = Math.min(reps + 1, rx.repMax);
  }

  const w = (x: number | null) => (x && x > 0 ? `${fmtWeight(x)} ${unit} × ` : "");
  const bumped = reps >= rx.repMax && loaded;
  const stalled = reps >= rx.repMax && !loaded;
  return {
    weight: nextWeight,
    reps: nextReps,
    text: `Last: ${w(weight)}${reps} → try ${w(nextWeight)}${nextReps}${bumped ? " (top of the range, so add weight)" : stalled ? " (top of the range — add weight or slow the reps down)" : ""}`,
  };
}
