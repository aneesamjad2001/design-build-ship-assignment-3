/** The exercise library: standard-gym movements a beginner can learn, each with
 *  the facts the planner needs. How-to text lives in exerciseText.ts. */

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "core";

export type Pattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "push-h"
  | "push-v"
  | "pull-h"
  | "pull-v"
  | "isolation"
  | "core"
  | "cardio";

/** What a "set" is measured in. */
export type Measure = "reps" | "seconds" | "minutes";

export interface Exercise {
  id: string;
  name: string;
  /** muscles it mainly trains — used internally, never shown as homework */
  muscles: MuscleGroup[];
  pattern: Pattern;
  measure: Measure;
  /** does a weight apply? (push-ups, planks and walking don't) */
  weighted: boolean;
  lower: boolean;
  restSec: number;
  /** "Not available?" replacements, best first */
  swaps: string[];
}

const ex = (e: Exercise): Exercise => e;

export const EXERCISES: Exercise[] = [
  ex({ id: "goblet-squat", name: "Goblet squat", muscles: ["quads", "glutes"], pattern: "squat", measure: "reps", weighted: true, lower: true, restSec: 90, swaps: ["leg-press", "split-squat"] }),
  ex({ id: "leg-press", name: "Leg press", muscles: ["quads", "glutes"], pattern: "squat", measure: "reps", weighted: true, lower: true, restSec: 120, swaps: ["goblet-squat", "split-squat"] }),
  ex({ id: "romanian-deadlift", name: "Romanian deadlift", muscles: ["hamstrings", "glutes"], pattern: "hinge", measure: "reps", weighted: true, lower: true, restSec: 120, swaps: ["hip-thrust", "leg-curl"] }),
  ex({ id: "hip-thrust", name: "Hip thrust", muscles: ["glutes", "hamstrings"], pattern: "hinge", measure: "reps", weighted: true, lower: true, restSec: 90, swaps: ["romanian-deadlift", "split-squat"] }),
  ex({ id: "split-squat", name: "Split squat", muscles: ["quads", "glutes"], pattern: "lunge", measure: "reps", weighted: true, lower: true, restSec: 90, swaps: ["goblet-squat", "leg-press"] }),
  ex({ id: "leg-curl", name: "Leg curl", muscles: ["hamstrings"], pattern: "isolation", measure: "reps", weighted: true, lower: true, restSec: 60, swaps: ["romanian-deadlift", "hip-thrust"] }),
  ex({ id: "leg-extension", name: "Leg extension", muscles: ["quads"], pattern: "isolation", measure: "reps", weighted: true, lower: true, restSec: 60, swaps: ["split-squat", "goblet-squat"] }),
  ex({ id: "calf-raise", name: "Calf raise", muscles: ["calves"], pattern: "isolation", measure: "reps", weighted: true, lower: true, restSec: 60, swaps: [] }),

  ex({ id: "dumbbell-bench-press", name: "Dumbbell bench press", muscles: ["chest", "triceps", "shoulders"], pattern: "push-h", measure: "reps", weighted: true, lower: false, restSec: 90, swaps: ["push-up", "incline-dumbbell-press"] }),
  ex({ id: "incline-dumbbell-press", name: "Incline dumbbell press", muscles: ["chest", "shoulders", "triceps"], pattern: "push-h", measure: "reps", weighted: true, lower: false, restSec: 90, swaps: ["dumbbell-bench-press", "push-up"] }),
  ex({ id: "push-up", name: "Push-up", muscles: ["chest", "triceps"], pattern: "push-h", measure: "reps", weighted: false, lower: false, restSec: 90, swaps: ["dumbbell-bench-press", "incline-dumbbell-press"] }),
  ex({ id: "dumbbell-shoulder-press", name: "Dumbbell shoulder press", muscles: ["shoulders", "triceps"], pattern: "push-v", measure: "reps", weighted: true, lower: false, restSec: 90, swaps: ["lateral-raise", "push-up"] }),
  ex({ id: "lateral-raise", name: "Lateral raise", muscles: ["shoulders"], pattern: "isolation", measure: "reps", weighted: true, lower: false, restSec: 60, swaps: ["dumbbell-shoulder-press", "face-pull"] }),
  ex({ id: "triceps-pushdown", name: "Triceps pushdown", muscles: ["triceps"], pattern: "isolation", measure: "reps", weighted: true, lower: false, restSec: 60, swaps: ["push-up"] }),

  ex({ id: "lat-pulldown", name: "Lat pulldown", muscles: ["back", "biceps"], pattern: "pull-v", measure: "reps", weighted: true, lower: false, restSec: 90, swaps: ["one-arm-dumbbell-row", "seated-cable-row"] }),
  ex({ id: "seated-cable-row", name: "Seated cable row", muscles: ["back", "biceps"], pattern: "pull-h", measure: "reps", weighted: true, lower: false, restSec: 90, swaps: ["one-arm-dumbbell-row", "lat-pulldown"] }),
  ex({ id: "one-arm-dumbbell-row", name: "One-arm dumbbell row", muscles: ["back", "biceps"], pattern: "pull-h", measure: "reps", weighted: true, lower: false, restSec: 90, swaps: ["seated-cable-row", "lat-pulldown"] }),
  ex({ id: "face-pull", name: "Face pull", muscles: ["shoulders", "back"], pattern: "isolation", measure: "reps", weighted: true, lower: false, restSec: 60, swaps: ["lateral-raise", "seated-cable-row"] }),
  ex({ id: "dumbbell-curl", name: "Dumbbell curl", muscles: ["biceps"], pattern: "isolation", measure: "reps", weighted: true, lower: false, restSec: 60, swaps: ["hammer-curl"] }),
  ex({ id: "hammer-curl", name: "Hammer curl", muscles: ["biceps"], pattern: "isolation", measure: "reps", weighted: true, lower: false, restSec: 60, swaps: ["dumbbell-curl"] }),

  ex({ id: "plank", name: "Plank", muscles: ["core"], pattern: "core", measure: "seconds", weighted: false, lower: false, restSec: 45, swaps: ["dead-bug", "cable-crunch"] }),
  ex({ id: "dead-bug", name: "Dead bug", muscles: ["core"], pattern: "core", measure: "reps", weighted: false, lower: false, restSec: 45, swaps: ["plank", "cable-crunch"] }),
  ex({ id: "hanging-knee-raise", name: "Hanging knee raise", muscles: ["core"], pattern: "core", measure: "reps", weighted: false, lower: false, restSec: 60, swaps: ["cable-crunch", "dead-bug"] }),
  ex({ id: "cable-crunch", name: "Cable crunch", muscles: ["core"], pattern: "core", measure: "reps", weighted: true, lower: false, restSec: 60, swaps: ["dead-bug", "plank"] }),

  ex({ id: "incline-walk", name: "Incline walk", muscles: [], pattern: "cardio", measure: "minutes", weighted: false, lower: false, restSec: 0, swaps: [] }),
];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

export function measureLabel(m: Measure): string {
  return m === "reps" ? "reps" : m === "seconds" ? "sec" : "min";
}
