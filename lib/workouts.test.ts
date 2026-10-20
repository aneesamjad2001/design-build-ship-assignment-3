import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXERCISES, getExercise } from "./library.ts";
import { LOOKS, getLook } from "./looks.ts";
import { TIME_OPTIONS, WORKOUT_KEYS, buildWorkout, planOverview, reentry } from "./workouts.ts";

const look = (id: string) => getLook(id)!;
const ids = (w: ReturnType<typeof buildWorkout>) => w.exercises.map((e) => e.exerciseId);

describe("library", () => {
  it("has 25 exercises, each with swaps that exist and no self-swaps", () => {
    assert.equal(EXERCISES.length, 25);
    for (const e of EXERCISES) {
      for (const s of e.swaps) {
        assert.ok(getExercise(s), `${e.id} swaps to unknown ${s}`);
        assert.notEqual(s, e.id);
      }
    }
  });
  it("has unique ids", () => {
    assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length);
  });
});

describe("every look builds sane workouts", () => {
  for (const l of LOOKS) {
    for (const key of WORKOUT_KEYS) {
      for (const time of TIME_OPTIONS) {
        it(`${l.id} · ${key} · ${time}`, () => {
          const w = buildWorkout(l, key, time);
          assert.ok(w.exercises.length >= 4, "at least four exercises");
          assert.equal(new Set(ids(w)).size, w.exercises.length, "no duplicate exercises");
          for (const e of w.exercises) {
            assert.ok(getExercise(e.exerciseId), "known exercise");
            assert.ok(e.sets >= 1 && e.sets <= 5);
            assert.ok(e.min >= 1 && e.max >= e.min);
          }
          assert.ok(w.minutes >= 10 && w.minutes <= 120, `minutes ${w.minutes}`);
        });
      }
    }
  }
});

describe("time options", () => {
  it("short keeps only the essentials at two sets; long adds extras", () => {
    const l = look("broad-muscular");
    const short = buildWorkout(l, "A", "short");
    const standard = buildWorkout(l, "A", "standard");
    const long = buildWorkout(l, "A", "long");
    assert.ok(short.exercises.every((e) => e.core && e.sets <= 2));
    assert.ok(short.exercises.length < standard.exercises.length);
    assert.ok(standard.exercises.length < long.exercises.length);
    assert.ok(short.minutes < standard.minutes && standard.minutes < long.minutes);
  });
  it("every workout is full-body: it always has a squat/hinge move, a push and a pull", () => {
    for (const l of LOOKS) for (const k of WORKOUT_KEYS) {
      const patterns = new Set(buildWorkout(l, k, "short").exercises.map((e) => getExercise(e.exerciseId)!.pattern));
      assert.ok(patterns.has("squat") || patterns.has("hinge"), `${l.id} ${k} lower`);
      assert.ok([...patterns].some((p) => p.startsWith("push")), `${l.id} ${k} push`);
      assert.ok([...patterns].some((p) => p.startsWith("pull")), `${l.id} ${k} pull`);
    }
  });
});

describe("looks change the plan", () => {
  it("'strength' uses heavier, lower-rep main lifts than 'tone'", () => {
    const strong = buildWorkout(look("big-strong"), "A", "standard").exercises[1];
    const tone = buildWorkout(look("toned-defined"), "A", "standard").exercises[1];
    assert.ok(strong.max < tone.min + 1 || strong.max <= 8);
    assert.ok(tone.min >= 12);
    assert.ok(strong.sets >= 4);
  });
  it("looks with a cardio finisher get one on standard and long, never on short", () => {
    const l = look("lean-athletic");
    assert.ok(ids(buildWorkout(l, "A", "standard")).includes("incline-walk"));
    assert.ok(ids(buildWorkout(l, "A", "long")).includes("incline-walk"));
    assert.ok(!ids(buildWorkout(l, "A", "short")).includes("incline-walk"));
    assert.ok(!ids(buildWorkout(look("broad-muscular"), "A", "long")).includes("incline-walk"));
  });
  it("emphasised looks give extra sets to the movements that train what they're built around", () => {
    const glutes = buildWorkout(look("legs-glutes"), "B", "standard").exercises.find((e) => e.exerciseId === "hip-thrust")!;
    const balanced = buildWorkout(look("balanced"), "B", "standard").exercises.find((e) => e.exerciseId === "hip-thrust")!;
    assert.ok(glutes.sets > balanced.sets);
  });
  it("different looks pick different extras, and the three workouts differ", () => {
    const a = ids(buildWorkout(look("broad-muscular"), "A", "long")).join();
    const b = ids(buildWorkout(look("legs-glutes"), "A", "long")).join();
    assert.notEqual(a, b);
    const overview = planOverview(look("balanced")).map((w) => ids(w).join());
    assert.equal(new Set(overview).size, 3);
  });
});

describe("adjustments", () => {
  const l = look("balanced");
  it("the first workout is a light intro: two sets, no extras, no finisher", () => {
    const w = buildWorkout(look("lean-athletic"), "A", "long", { intro: true });
    assert.ok(w.exercises.every((e) => e.sets <= 2));
    assert.ok(!ids(w).includes("incline-walk"));
    assert.ok(w.notes.some((n) => /intro/i.test(n)));
  });
  it("re-entry scales with time away and is silent under two weeks", () => {
    assert.equal(reentry(3).note, null);
    assert.equal(reentry(13).note, null);
    assert.equal(reentry(null).note, null);
    assert.match(reentry(15).note!, /2 weeks/);
    assert.match(reentry(30).note!, /4 weeks/);
    assert.ok(reentry(15).weightFactor > reentry(30).weightFactor && reentry(30).weightFactor > reentry(70).weightFactor);
    const normal = buildWorkout(l, "A", "standard", { daysAway: 3 });
    const back = buildWorkout(l, "A", "standard", { daysAway: 40 });
    assert.ok(back.exercises.every((e) => e.sets === 2 || getExercise(e.exerciseId)!.measure === "minutes"));
    assert.ok(normal.exercises.some((e) => e.sets === 3));
    assert.ok(back.notes.some((n) => /easing in/i.test(n)));
  });
  it("tired means shorter and lighter, with the reason shown", () => {
    const normal = buildWorkout(l, "A", "standard");
    const tired = buildWorkout(l, "A", "standard", { feeling: "tired" });
    assert.ok(tired.exercises.length < normal.exercises.length);
    assert.ok(tired.minutes < normal.minutes);
    assert.ok(tired.notes.some((n) => /tired/i.test(n)));
  });
  it("skipped exercises come back as labelled make-ups, but not in a short session", () => {
    const w = buildWorkout(l, "B", "standard", { makeUps: ["leg-curl"] });
    assert.equal(w.exercises.find((e) => e.exerciseId === "leg-curl")?.note, "Skipped last time");
    assert.ok(!ids(buildWorkout(l, "B", "short", { makeUps: ["leg-curl"] })).includes("leg-curl"));
  });
  it("a swap replaces the exercise in place", () => {
    const w = buildWorkout(l, "A", "standard", { swaps: { "goblet-squat": "leg-press" } });
    assert.equal(w.exercises[0].exerciseId, "leg-press");
  });
});
