/** Numbers for the Progress screen, worked out from saved workouts. */

import type { CompletedWorkout } from "./adapt.ts";

/** Days (YYYY-MM-DD) on which at least one workout was saved. */
export function workoutDates(workouts: CompletedWorkout[]): Set<string> {
  return new Set(workouts.map((w) => w.date));
}

const byTime = (a: CompletedWorkout, b: CompletedWorkout) => (a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1);

export interface LiftPoint {
  date: string;
  weight: number;
  setsDone: number;
}

/** The weight used for one exercise in each workout that included it, oldest first. */
export function liftSeries(workouts: CompletedWorkout[], exerciseId: string): LiftPoint[] {
  const points: LiftPoint[] = [];
  for (const w of [...workouts].sort(byTime)) {
    const e = w.exercises.find((x) => x.exerciseId === exerciseId);
    if (e && !e.skipped && e.setsDone > 0 && e.weight !== null) points.push({ date: w.date, weight: e.weight, setsDone: e.setsDone });
  }
  return points;
}

/** Exercises done at least once, most recently done first. */
export function exercisesDone(workouts: CompletedWorkout[]): string[] {
  const seen: string[] = [];
  for (const w of [...workouts].sort(byTime).reverse()) {
    for (const e of w.exercises) {
      if (!e.skipped && e.setsDone > 0 && !seen.includes(e.exerciseId)) seen.push(e.exerciseId);
    }
  }
  return seen;
}

/** Exercises that have a recorded weight at least once (what "Your lifts" lists). */
export function weightedLifts(workouts: CompletedWorkout[]): string[] {
  return exercisesDone(workouts).filter((id) => liftSeries(workouts, id).length > 0);
}

export function totalSets(workouts: CompletedWorkout[]): number {
  return workouts.reduce((n, w) => n + w.exercises.reduce((m, e) => m + (e.skipped ? 0 : e.setsDone), 0), 0);
}

/** Has this exercise been done before? (Decides whether the how-to opens by default.) */
export function hasDoneExercise(workouts: CompletedWorkout[], exerciseId: string): boolean {
  return workouts.some((w) => w.exercises.some((e) => e.exerciseId === exerciseId && !e.skipped && e.setsDone > 0));
}
