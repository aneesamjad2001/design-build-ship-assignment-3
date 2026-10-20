import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBackup, describeBackup, readBackup } from "./backup.ts";
import { EMPTY_DATA, convertWeight, parseData, serialize, weightsIn, workoutsIn } from "./data.ts";
import type { Data } from "./data.ts";
import { INPROGRESS_KEY, parseInProgress } from "./inprogress.ts";
import { buildWorkout } from "./workouts.ts";
import { getLook } from "./looks.ts";

const workout = (over: object = {}) => ({
  id: "w1", date: "2026-10-19", key: "A", unit: "lb", createdAt: 1,
  exercises: [{ exerciseId: "goblet-squat", setsDone: 3, setsPlanned: 3, weight: 40, feedback: "right" }],
  ...over,
});
const good: Data = {
  ...EMPTY_DATA,
  profile: { lookId: "balanced", time: "standard", unit: "lb", createdAt: 1 },
  workouts: [workout() as never],
  weights: { "goblet-squat": { weight: 40, unit: "lb", rightStreak: 1, updatedAt: "2026-10-19" } },
};

describe("loading saved data", () => {
  it("round-trips", () => {
    const r = parseData(serialize(good));
    assert.equal(r.recovered, false);
    assert.deepEqual(r.data, good);
  });
  it("recovers from corrupt or foreign data without throwing", () => {
    for (const raw of ["{nope", "[]", '{"version":1}', '{"version":3}']) {
      const r = parseData(raw);
      assert.equal(r.recovered, true, raw);
      assert.deepEqual(r.data, EMPTY_DATA);
    }
    assert.equal(parseData(null).recovered, false);
  });
  it("drops bad pieces, keeps the good ones, and says it did", () => {
    const raw = JSON.stringify({
      ...good,
      workouts: [workout(), workout({ id: "x", date: "nope" }), workout({ id: "y", exercises: [{ exerciseId: "goblet-squat", setsDone: 3, setsPlanned: 3, weight: 5000 }] })],
    });
    const r = parseData(raw);
    assert.equal(r.recovered, true);
    assert.equal(r.data.workouts.length, 1);
  });
  it("reports a single bad exercise inside an otherwise fine workout", () => {
    const w = workout({ exercises: [{ exerciseId: "goblet-squat", setsDone: 3, setsPlanned: 3, weight: 40 }, { exerciseId: "not-real", setsDone: 1, setsPlanned: 3, weight: 1 }] });
    const r = parseData(JSON.stringify({ ...good, workouts: [w] }));
    assert.equal(r.recovered, true);
    assert.equal(r.data.workouts[0].exercises.length, 1);
  });
});

describe("units", () => {
  it("converts only for display and never drifts or drops a heavy lift", () => {
    const kg = { ...(workout() as never as Data["workouts"][number]), unit: "kg" as const, exercises: [{ exerciseId: "leg-press", setsDone: 3, setsPlanned: 3, weight: 500 }] };
    const shown = workoutsIn([kg], "lb");
    assert.equal(shown[0].exercises[0].weight, 1102.5);
    assert.equal(kg.exercises[0].weight, 500);
    assert.equal(workoutsIn(workoutsIn([kg], "lb"), "kg")[0].exercises[0].weight, 500 * 1);
    const back = parseData(serialize({ ...good, workouts: [kg] }));
    assert.equal(back.recovered, false);
    assert.equal(back.data.workouts.length, 1);
  });
  it("converts remembered weights and rounds to the half", () => {
    assert.equal(convertWeight(135, "lb", "kg"), 61);
    assert.equal(weightsIn(good.weights, "kg")["goblet-squat"].weight, 18);
  });
});

describe("backup", () => {
  it("round-trips through a file and describes what's in it", () => {
    const r = readBackup(buildBackup(good, new Date("2026-10-20T10:00:00Z")));
    assert.equal(r.ok, true);
    if (r.ok) assert.match(describeBackup(r.data), /1 workout from .* to .* · Balanced all-round\./);
  });
  it("explains what's wrong with a bad file", () => {
    for (const t of ["", "  ", "not json", "[]", '{"version":2,"profile":null,"workouts":[]}', '{"hello":1}']) {
      const r = readBackup(t);
      assert.equal(r.ok, false, t);
      if (!r.ok) assert.match(r.error, /Choose/);
    }
  });
});

describe("workout in progress", () => {
  const NOW = 1_800_000_000_000;
  const planned = buildWorkout(getLook("balanced")!, "A", "standard");
  const raw = (over: object = {}) =>
    JSON.stringify({ startedAt: NOW - 1000, unit: "lb", feeling: "normal", planned, index: 1, progress: { "goblet-squat": { setsDone: 2, weight: "40" } }, note: "", ...over });
  it("restores a recent one", () => {
    const p = parseInProgress(raw(), NOW);
    assert.equal(p?.index, 1);
    assert.equal(p?.progress["goblet-squat"].setsDone, 2);
  });
  it("ignores old, malformed, or hostile ones", () => {
    assert.equal(parseInProgress(raw({ startedAt: NOW - 25 * 3600 * 1000 }), NOW), null);
    assert.equal(parseInProgress("{nope", NOW), null);
    assert.equal(parseInProgress(null, NOW), null);
    assert.equal(parseInProgress(raw({ feeling: "angry" }), NOW), null);
    assert.equal(parseInProgress(raw({ index: 99 }), NOW), null);
    assert.equal(parseInProgress(raw({ planned: { ...planned, exercises: [{ exerciseId: "nope", sets: 3, min: 8, max: 12, core: true }] } }), NOW), null);
    assert.ok(INPROGRESS_KEY.startsWith("ironlog:"));
  });
});
