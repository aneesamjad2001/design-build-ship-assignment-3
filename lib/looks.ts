/** The bodies someone can aim for. The person picks a look in plain words;
 *  everything else (which exercises, how many sets) is worked out from it. */

import type { MuscleGroup } from "./library.ts";

export type LookId = "broad-muscular" | "legs-glutes" | "lean-athletic" | "toned-defined" | "big-strong" | "balanced";

export type Style = "size" | "strength" | "tone" | "athletic";

export interface Look {
  id: LookId;
  name: string;
  tagline: string;
  /** describes the body, not the training */
  description: string;
  /** internal only: up to three muscle groups to give extra work, best first. [] = even. */
  emphasis: MuscleGroup[];
  style: Style;
  /** adds a short cardio finisher on longer workouts */
  finisher: boolean;
  /** relative proportions used to draw the silhouette (1 = average) */
  shape: { shoulder: number; waist: number; hip: number; thigh: number; arm: number };
}

export const LOOKS: Look[] = [
  {
    id: "broad-muscular",
    name: "Muscular & broad",
    tagline: "Wide shoulders, strong back, V-shape",
    description: "A strong, wide upper body that tapers to the waist.",
    emphasis: ["shoulders", "back", "chest"],
    style: "size",
    finisher: false,
    shape: { shoulder: 1.38, waist: 0.82, hip: 0.92, thigh: 1.0, arm: 1.3 },
  },
  {
    id: "legs-glutes",
    name: "Strong legs & glutes",
    tagline: "A powerful lower body",
    description: "Strong, shapely legs and glutes with a balanced upper body.",
    emphasis: ["glutes", "quads", "hamstrings"],
    style: "size",
    finisher: false,
    shape: { shoulder: 1.0, waist: 0.8, hip: 1.28, thigh: 1.32, arm: 0.9 },
  },
  {
    id: "lean-athletic",
    name: "Lean & athletic",
    tagline: "Fit and light on your feet",
    description: "Defined, athletic muscle without the bulk.",
    emphasis: ["back", "shoulders"],
    style: "athletic",
    finisher: true,
    shape: { shoulder: 1.15, waist: 0.8, hip: 0.9, thigh: 0.98, arm: 0.95 },
  },
  {
    id: "toned-defined",
    name: "Toned & defined",
    tagline: "Firm, balanced and lean-looking",
    description: "Some muscle everywhere, with a lean, defined look.",
    emphasis: ["shoulders", "glutes", "core"],
    style: "tone",
    finisher: true,
    shape: { shoulder: 1.05, waist: 0.76, hip: 1.1, thigh: 1.05, arm: 0.88 },
  },
  {
    id: "big-strong",
    name: "Big & strong",
    tagline: "Heavy, thick and powerful",
    description: "A thick, strong body built on heavy lifts.",
    emphasis: ["chest", "back", "quads"],
    style: "strength",
    finisher: false,
    shape: { shoulder: 1.3, waist: 1.0, hip: 1.12, thigh: 1.25, arm: 1.25 },
  },
  {
    id: "balanced",
    name: "Balanced all-round",
    tagline: "Even, fit and capable",
    description: "Everything trained evenly for an all-round athletic body.",
    emphasis: [],
    style: "size",
    finisher: false,
    shape: { shoulder: 1.1, waist: 0.88, hip: 1.0, thigh: 1.05, arm: 1.05 },
  },
];

export function getLook(id: string): Look | undefined {
  return LOOKS.find((l) => l.id === id);
}

/** Shown wherever a look is chosen. Honest about what training can and can't do. */
export const LOOK_NOTE =
  "This sets the style of your training. How your body looks also depends on food, sleep and time, so we'll build toward this look, not promise it.";

export const CAN_AND_CANT: string[] = [
  "Training builds strength and muscle — that's the part this app controls.",
  "You can't choose where your body loses fat, and exercises don't target it (the evidence for spot reduction is mixed at best).",
  "\"Toned\" isn't a scientific term. It usually means some muscle plus low body fat, and body fat depends mostly on food and time.",
  "Showing up regularly matters more than a perfect plan.",
];
