import { DAYS, getExercise } from "./exercises.ts";
import type { DayType, Exercise } from "./exercises.ts";

export type Goal = "muscle" | "lean" | "strength" | "athletic";

export const GOALS: { id: Goal; label: string; tagline: string; detail: string }[] = [
  {
    id: "muscle",
    label: "Build muscle",
    tagline: "Bigger and fuller",
    detail: "Moderate weights, 6–15 reps, plenty of volume.",
  },
  {
    id: "lean",
    label: "Lean & toned",
    tagline: "Lose fat, keep muscle",
    detail: "Strength work plus conditioning days to burn energy.",
  },
  {
    id: "strength",
    label: "Get stronger",
    tagline: "Heavier lifts",
    detail: "Fewer exercises, heavy sets of 3–5 on the big lifts.",
  },
  {
    id: "athletic",
    label: "Athletic",
    tagline: "Fit, fast and powerful",
    detail: "Explosive lifts, jumps and conditioning in the mix.",
  },
];

export function goalLabel(g: Goal): string {
  return GOALS.find((x) => x.id === g)?.label ?? g;
}

export const MIN_DAYS = 2;
export const MAX_DAYS = 6;
export const DEFAULT_DAYS = 4;

type Cycle = DayType[];

const SPLITS: Record<Goal, Record<number, Cycle>> = {
  muscle: {
    2: ["full", "full"],
    3: ["push", "pull", "legs"],
    4: ["upper", "lower", "upper", "lower"],
    5: ["push", "pull", "legs", "upper", "lower"],
    6: ["push", "pull", "legs", "push", "pull", "legs"],
  },
  lean: {
    2: ["full", "conditioning"],
    3: ["full", "conditioning", "full"],
    4: ["upper", "lower", "conditioning", "full"],
    5: ["upper", "lower", "conditioning", "full", "conditioning"],
    6: ["push", "pull", "legs", "conditioning", "upper", "lower"],
  },
  strength: {
    2: ["full", "full"],
    3: ["full", "full", "full"],
    4: ["upper", "lower", "upper", "lower"],
    5: ["upper", "lower", "upper", "lower", "full"],
    6: ["push", "pull", "legs", "push", "pull", "legs"],
  },
  athletic: {
    2: ["full", "conditioning"],
    3: ["full", "conditioning", "full"],
    4: ["lower", "upper", "conditioning", "full"],
    5: ["lower", "upper", "conditioning", "full", "conditioning"],
    6: ["lower", "upper", "conditioning", "lower", "upper", "conditioning"],
  },
};

export function clampDays(n: number): number {
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(n)));
}

/** The weekly rotation for a goal and a number of training days. */
export function planFor(goal: Goal, days: number): Cycle {
  return SPLITS[goal][clampDays(days)];
}

export interface Prescription {
  sets: number;
  repMin: number;
  repMax: number;
}

/** Sets and rep range for one movement. */
export function prescribe(goal: Goal, day: DayType, ex: Exercise): Prescription {
  if (day === "conditioning" || ex.kind === "conditioning") {
    if (goal === "athletic") return { sets: 4, repMin: 6, repMax: 10 };
    return { sets: 4, repMin: 12, repMax: 20 };
  }
  const compound = ex.kind === "compound";
  switch (goal) {
    case "muscle":
      return compound ? { sets: 4, repMin: 6, repMax: 10 } : { sets: 3, repMin: 10, repMax: 15 };
    case "lean":
      return compound ? { sets: 3, repMin: 8, repMax: 12 } : { sets: 3, repMin: 12, repMax: 15 };
    case "strength":
      return compound ? { sets: 5, repMin: 3, repMax: 5 } : { sets: 3, repMin: 8, repMax: 12 };
    case "athletic":
      return compound ? { sets: 4, repMin: 4, repMax: 6 } : { sets: 3, repMin: 8, repMax: 12 };
  }
}

const EXERCISE_COUNT: Record<Goal, number> = { muscle: 5, lean: 5, strength: 4, athletic: 5 };

export interface PlannedExercise {
  exercise: Exercise;
  prescription: Prescription;
}

/** The exercises for a day, in order, with their prescriptions. */
export function workoutFor(goal: Goal, day: DayType): PlannedExercise[] {
  return DAYS[day].exercises
    .slice(0, EXERCISE_COUNT[goal])
    .map((id) => getExercise(id))
    .filter((e): e is Exercise => Boolean(e))
    .map((exercise) => ({ exercise, prescription: prescribe(goal, day, exercise) }));
}

export function repRange(p: Prescription): string {
  return p.repMin === p.repMax ? `${p.repMin}` : `${p.repMin}–${p.repMax}`;
}
