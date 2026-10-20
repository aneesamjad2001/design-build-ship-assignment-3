import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CompletedWorkout, DoneExercise } from "./adapt.ts";
import { exercisesDone, hasDoneExercise, liftSeries, totalSets, weightedLifts, workoutDates } from "./progress.ts";
import { getLook } from "./looks.ts";
import { validateWeightText } from "./weightInput.ts";
import { buildWorkout, swapPlanned } from "./workouts.ts";

const done = (exerciseId: string, setsDone: number, weight: number | null, extra: Partial<DoneExercise> = {}): DoneExercise => ({
  exerciseId,
  setsDone,
  setsPlanned: 3,
  weight,
  ...extra,
});

const w = (id: string, date: string, exercises: DoneExercise[], createdAt = 1): CompletedWorkout => ({ id, date, key: "A", unit: "lb", exercises, createdAt });

const history = [
  w("2", "2026-10-12", [done("goblet-squat", 3, 40), done("plank", 3, null)], 2),
  w("1", "2026-10-05", [done("goblet-squat", 3, 35), done("dumbbell-bench-press", 0, 30, { skipped: true })], 1),
  w("3", "2026-10-19", [done("goblet-squat", 0, 45), done("dumbbell-bench-press", 3, 30)], 3),
];

describe("progress numbers", () => {
  it("collects the days trained", () => {
    assert.deepEqual([...workoutDates(history)].sort(), ["2026-10-05", "2026-10-12", "2026-10-19"]);
  });

  it("builds a weight trend oldest first and ignores skipped or unfinished entries", () => {
    assert.deepEqual(liftSeries(history, "goblet-squat").map((p) => p.weight), [35, 40]);
    assert.deepEqual(liftSeries(history, "dumbbell-bench-press").map((p) => p.weight), [30]);
    assert.deepEqual(liftSeries(history, "plank"), []);
  });

  it("lists exercises most recently done first", () => {
    assert.deepEqual(exercisesDone(history), ["dumbbell-bench-press", "goblet-squat", "plank"]);
  });

  it("lists lifts that have a recorded weight", () => {
    assert.deepEqual(weightedLifts(history), ["dumbbell-bench-press", "goblet-squat"]);
  });

  it("totals the sets that were done", () => {
    assert.equal(totalSets(history), 3 + 3 + 3 + 3);
  });

  it("knows whether an exercise has been done before", () => {
    assert.equal(hasDoneExercise(history, "plank"), true);
    assert.equal(hasDoneExercise(history, "leg-press"), false);
    assert.equal(hasDoneExercise([], "plank"), false);
  });
});

describe("weight box", () => {
  it("accepts blank, whole, decimal and comma numbers", () => {
    assert.deepEqual(validateWeightText("", "lb"), { value: null });
    assert.deepEqual(validateWeightText(" 45 ", "lb"), { value: 45 });
    assert.deepEqual(validateWeightText("22.5", "kg"), { value: 22.5 });
    assert.deepEqual(validateWeightText("22,5", "kg"), { value: 22.5 });
  });

  it("explains what to do for anything else", () => {
    for (const bad of ["abc", "-5", "45lb", "1e3", "4 5"]) {
      const r = validateWeightText(bad, "lb");
      assert.equal(r.value, null);
      assert.match(r.error ?? "", /number in lb/);
    }
    assert.match(validateWeightText("5000", "lb").error ?? "", /more than 1000/);
  });
});

describe("not available swaps", () => {
  const look = getLook("balanced")!;
  const base = buildWorkout(look, "A", "standard");

  it("keeps the slot and uses the right scheme for the new movement", () => {
    const squat = base.exercises.find((p) => p.exerciseId === "goblet-squat")!;
    const swapped = swapPlanned(squat, "leg-press", look.style)!;
    assert.equal(swapped.exerciseId, "leg-press");
    assert.equal(swapped.core, squat.core);
    assert.ok(swapped.sets >= 2);
  });

  it("changes reps to seconds when swapping to a timed hold", () => {
    const crunch = { exerciseId: "dead-bug", sets: 3, min: 8, max: 12, core: false };
    const plank = swapPlanned(crunch, "plank", look.style)!;
    assert.deepEqual([plank.min, plank.max], [30, 45]);
  });

  it("refuses an unknown exercise", () => {
    assert.equal(swapPlanned(base.exercises[0], "nonsense", look.style), null);
  });
});
