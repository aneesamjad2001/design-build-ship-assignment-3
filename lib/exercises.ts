/** The bundled exercise library and the building blocks of a training split.
 *  Everything is a weight × reps movement so one logging form fits all of it. */

export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core"
  | "conditioning";

export type Kind = "compound" | "isolation" | "conditioning";

export interface Exercise {
  id: string;
  name: string;
  /** Muscles this movement mainly trains — used to judge what is rested. */
  primary: Muscle[];
  kind: Kind;
}

export type DayType =
  | "push"
  | "pull"
  | "legs"
  | "upper"
  | "lower"
  | "full"
  | "conditioning";

export interface DayInfo {
  id: DayType;
  label: string;
  /** Plain-language muscles for the "why this workout" line. */
  focus: string;
  /** Muscles that must be rested for this day to be a good choice. */
  muscles: Muscle[];
  /** Ordered best-first; goals take the first few. */
  exercises: string[];
}

export const EXERCISES: Exercise[] = [
  { id: "bench-press", name: "Barbell bench press", primary: ["chest"], kind: "compound" },
  { id: "incline-db-press", name: "Incline dumbbell press", primary: ["chest"], kind: "compound" },
  { id: "cable-fly", name: "Cable fly", primary: ["chest"], kind: "isolation" },
  { id: "push-up", name: "Push-up", primary: ["chest"], kind: "compound" },
  { id: "overhead-press", name: "Overhead press", primary: ["shoulders"], kind: "compound" },
  { id: "lateral-raise", name: "Lateral raise", primary: ["shoulders"], kind: "isolation" },
  { id: "face-pull", name: "Face pull", primary: ["shoulders", "back"], kind: "isolation" },
  { id: "triceps-pushdown", name: "Triceps pushdown", primary: ["triceps"], kind: "isolation" },
  { id: "barbell-row", name: "Barbell row", primary: ["back"], kind: "compound" },
  { id: "lat-pulldown", name: "Lat pulldown", primary: ["back"], kind: "compound" },
  { id: "seated-cable-row", name: "Seated cable row", primary: ["back"], kind: "compound" },
  { id: "biceps-curl", name: "Dumbbell curl", primary: ["biceps"], kind: "isolation" },
  { id: "hammer-curl", name: "Hammer curl", primary: ["biceps"], kind: "isolation" },
  { id: "squat", name: "Barbell back squat", primary: ["quads", "glutes"], kind: "compound" },
  { id: "romanian-deadlift", name: "Romanian deadlift", primary: ["hamstrings", "glutes"], kind: "compound" },
  { id: "leg-press", name: "Leg press", primary: ["quads"], kind: "compound" },
  { id: "lunge", name: "Walking lunge", primary: ["quads", "glutes"], kind: "compound" },
  { id: "goblet-squat", name: "Goblet squat", primary: ["quads"], kind: "compound" },
  { id: "leg-curl", name: "Leg curl", primary: ["hamstrings"], kind: "isolation" },
  { id: "calf-raise", name: "Standing calf raise", primary: ["calves"], kind: "isolation" },
  { id: "hanging-leg-raise", name: "Hanging leg raise", primary: ["core"], kind: "isolation" },
  { id: "cable-crunch", name: "Cable crunch", primary: ["core"], kind: "isolation" },
  { id: "kettlebell-swing", name: "Kettlebell swing", primary: ["conditioning"], kind: "conditioning" },
  { id: "box-jump", name: "Box jump", primary: ["conditioning"], kind: "conditioning" },
  { id: "medicine-ball-slam", name: "Medicine-ball slam", primary: ["conditioning"], kind: "conditioning" },
  { id: "burpee", name: "Burpee", primary: ["conditioning"], kind: "conditioning" },
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

export const DAYS: Record<DayType, DayInfo> = {
  push: {
    id: "push",
    label: "Push day",
    focus: "chest, shoulders and triceps",
    muscles: ["chest", "shoulders", "triceps"],
    exercises: ["bench-press", "overhead-press", "incline-db-press", "lateral-raise", "triceps-pushdown", "cable-fly"],
  },
  pull: {
    id: "pull",
    label: "Pull day",
    focus: "back and biceps",
    muscles: ["back", "biceps"],
    exercises: ["barbell-row", "lat-pulldown", "seated-cable-row", "face-pull", "biceps-curl", "hammer-curl"],
  },
  legs: {
    id: "legs",
    label: "Leg day",
    focus: "quads, hamstrings and glutes",
    muscles: ["quads", "hamstrings", "glutes"],
    exercises: ["squat", "romanian-deadlift", "leg-press", "leg-curl", "calf-raise", "hanging-leg-raise"],
  },
  upper: {
    id: "upper",
    label: "Upper body",
    focus: "chest, back, shoulders and arms",
    muscles: ["chest", "back", "shoulders", "biceps", "triceps"],
    exercises: ["bench-press", "barbell-row", "overhead-press", "lat-pulldown", "biceps-curl", "triceps-pushdown"],
  },
  lower: {
    id: "lower",
    label: "Lower body",
    focus: "quads, hamstrings, glutes and calves",
    muscles: ["quads", "hamstrings", "glutes", "calves"],
    exercises: ["squat", "romanian-deadlift", "lunge", "leg-curl", "calf-raise", "cable-crunch"],
  },
  full: {
    id: "full",
    label: "Full body",
    focus: "legs, chest, back and shoulders",
    muscles: ["quads", "hamstrings", "chest", "back", "shoulders"],
    exercises: ["squat", "bench-press", "barbell-row", "overhead-press", "romanian-deadlift", "hanging-leg-raise"],
  },
  conditioning: {
    id: "conditioning",
    label: "Conditioning",
    focus: "heart rate, power and work capacity",
    muscles: ["conditioning"],
    exercises: ["kettlebell-swing", "goblet-squat", "push-up", "box-jump", "medicine-ball-slam", "burpee"],
  },
};

export const DAY_ORDER: DayType[] = ["push", "pull", "legs", "upper", "lower", "full", "conditioning"];

export function muscleLabel(m: Muscle): string {
  return m === "conditioning" ? "conditioning" : m;
}

/** Other movements that share a primary muscle, same kind first — for swapping. */
export function alternativesFor(id: string): Exercise[] {
  const ex = byId.get(id);
  if (!ex) return [];
  return EXERCISES.filter((e) => e.id !== id && e.kind !== "conditioning" && ex.kind !== "conditioning" && e.primary.some((m) => ex.primary.includes(m))).sort(
    (a, b) => Number(b.kind === ex.kind) - Number(a.kind === ex.kind),
  );
}
