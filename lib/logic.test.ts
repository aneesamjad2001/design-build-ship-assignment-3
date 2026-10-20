import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, daysBetween, monthGrid, startOfWeek } from "./dates.ts";
import { recommend, suggestNext } from "./recommend.ts";
import { workoutFor, planFor, prescribe } from "./plans.ts";
import { getExercise } from "./exercises.ts";
import { convertWeight, parseData, serialize, EMPTY_DATA } from "./storage.ts";
import type { Profile, Session } from "./storage.ts";
import { daysInWeek, findNewPRs, weeklyStreak } from "./stats.ts";
import { validateSession, setKey } from "./validate.ts";
import type { SessionForm } from "./validate.ts";

// 2026-10-19 is a Monday.
const MON = "2026-10-19";

const profile = (over: Partial<Profile> = {}): Profile => ({
  goal: "muscle",
  daysPerWeek: 4,
  unit: "lb",
  createdAt: 0,
  ...over,
});

let n = 0;
const sess = (date: string, focus: Session["focus"], exerciseId: string, weight: number | null, reps: number): Session => ({
  id: `s${n++}`,
  date,
  focus,
  entries: [{ exerciseId, sets: [{ weight, reps }] }],
  createdAt: n,
});

describe("dates", () => {
  it("weeks start on Monday", () => {
    assert.equal(startOfWeek("2026-10-18"), "2026-10-12"); // Sunday → previous Monday
    assert.equal(startOfWeek(MON), MON);
    assert.equal(startOfWeek("2026-10-21"), MON);
  });
  it("counts days across a DST change", () => {
    assert.equal(daysBetween("2026-10-31", "2026-11-02"), 2);
    assert.equal(addDays("2026-11-01", 1), "2026-11-02");
  });
  it("builds a month grid with the right number of weeks", () => {
    const grid = monthGrid(2026, 9); // October 2026 starts on a Thursday
    assert.equal(grid.length, 5);
    assert.equal(grid[0][0].date, "2026-09-28");
    assert.equal(grid[0][3].inMonth, true);
    assert.equal(grid[0][2].inMonth, false);
  });
});

describe("plans", () => {
  it("has a full rotation for every goal and day count", () => {
    for (const goal of ["muscle", "lean", "strength", "athletic"] as const) {
      for (let d = 2; d <= 6; d++) assert.equal(planFor(goal, d).length, d);
    }
  });
  it("gives strength fewer, heavier exercises", () => {
    const muscle = workoutFor("muscle", "upper");
    const strength = workoutFor("strength", "upper");
    assert.ok(strength.length < muscle.length);
    assert.deepEqual(
      [strength[0].prescription.repMin, strength[0].prescription.repMax],
      [3, 5],
    );
  });
  it("uses conditioning prescriptions on conditioning days", () => {
    const rx = prescribe("lean", "conditioning", getExercise("goblet-squat")!);
    assert.ok(rx.repMax >= 15);
  });
});

describe("recommend", () => {
  it("starts a new user at the first day of the plan", () => {
    const r = recommend(profile(), [], MON);
    assert.equal(r.day, "upper");
    assert.equal(r.status, "ready");
    assert.match(r.reason, /first day of your 4-day build muscle plan/i);
  });

  it("alternates upper and lower", () => {
    const afterUpper = [sess(addDays(MON, -2), "upper", "bench-press", 135, 8)];
    assert.equal(recommend(profile(), afterUpper, MON).day, "lower");
    const afterLower = [...afterUpper, sess(addDays(MON, -1), "lower", "squat", 185, 8)];
    // upper has rested 2 days, lower only 1
    assert.equal(recommend(profile(), afterLower, MON).day, "upper");
  });

  it("follows push → pull → legs on a 3-day split", () => {
    const p = profile({ daysPerWeek: 3 });
    const push = sess(addDays(MON, -2), "push", "bench-press", 135, 8);
    assert.equal(recommend(p, [push], MON).day, "pull");
    const pull = sess(addDays(MON, -1), "pull", "barbell-row", 115, 8);
    assert.equal(recommend(p, [push, pull], MON).day, "legs");
  });

  it("explains itself with real numbers", () => {
    const p = profile({ daysPerWeek: 3 });
    const s = [sess(addDays(MON, -5), "push", "bench-press", 135, 8), sess(addDays(MON, -3), "pull", "barbell-row", 115, 8)];
    const r = recommend(p, s, MON);
    assert.equal(r.day, "legs");
    assert.match(r.reason, /haven't logged/i);
    const withLegs = [...s, sess(addDays(MON, -2), "legs", "squat", 185, 8)];
    const r2 = recommend(p, withLegs, MON);
    assert.equal(r2.day, "push");
    assert.match(r2.reason, /last trained 5 days ago/);
  });

  it("says done for today and plans the next day", () => {
    const s = [sess(MON, "upper", "bench-press", 135, 8)];
    const r = recommend(profile(), s, MON);
    assert.equal(r.status, "trained-today");
    assert.equal(r.day, "lower");
  });

  it("advises rest when nothing has recovered yet", () => {
    const p = profile({ daysPerWeek: 3, goal: "strength" }); // full, full, full
    const s = [sess(addDays(MON, -1), "full", "squat", 185, 5)];
    const r = recommend(p, s, MON);
    assert.equal(r.status, "rest-advised");
  });

  it("does not recommend conditioning forever", () => {
    const p = profile({ goal: "lean", daysPerWeek: 3 }); // full, conditioning, full
    const cond = sess(addDays(MON, -2), "conditioning", "kettlebell-swing", 35, 15);
    const full = sess(addDays(MON, -4), "full", "squat", 185, 8);
    // conditioning was done 2 days ago, full body 4 days ago → full body
    assert.equal(recommend(p, [full, cond], MON).day, "full");
  });
});

describe("suggestNext", () => {
  const bench = getExercise("bench-press")!;
  const rx = { sets: 4, repMin: 6, repMax: 10 };
  it("adds a rep first", () => {
    const s = suggestNext(bench, rx, [sess("2026-10-12", "push", "bench-press", 135, 8)], "lb")!;
    assert.deepEqual([s.weight, s.reps], [135, 9]);
    assert.equal(s.text, "Last: 135 lb × 8 → try 135 lb × 9");
  });
  it("adds weight at the top of the range", () => {
    const s = suggestNext(bench, rx, [sess("2026-10-12", "push", "bench-press", 135, 10)], "lb")!;
    assert.deepEqual([s.weight, s.reps], [140, 6]);
  });
  it("uses smaller steps in kilograms", () => {
    const s = suggestNext(bench, rx, [sess("2026-10-12", "push", "bench-press", 60, 10)], "kg")!;
    assert.equal(s.weight, 62.5);
  });
  it("has no suggestion the first time", () => {
    assert.equal(suggestNext(bench, rx, [], "lb"), null);
  });
});

describe("stats", () => {
  it("counts a day once, even with two sessions", () => {
    const s = [sess(MON, "upper", "bench-press", 135, 8), sess(MON, "lower", "squat", 185, 8)];
    assert.equal(daysInWeek(s, MON), 1);
  });

  it("counts consecutive weeks that hit the target", () => {
    const wk = (weeksAgo: number, days: number) =>
      Array.from({ length: days }, (_, i) => sess(addDays(MON, -7 * weeksAgo + i), "full", "squat", 135, 5));
    const s = [...wk(2, 3), ...wk(1, 3), ...wk(0, 1)];
    // current week (1 of 3) is still open, so it neither counts nor breaks the streak
    assert.equal(weeklyStreak(s, 3, addDays(MON, 2)), 2);
    // once the current week is met it joins the streak
    assert.equal(weeklyStreak([...s, ...wk(0, 3).slice(1)], 3, addDays(MON, 2)), 3);
  });

  it("breaks the streak on a missed week", () => {
    const wk = (weeksAgo: number, days: number) =>
      Array.from({ length: days }, (_, i) => sess(addDays(MON, -7 * weeksAgo + i), "full", "squat", 135, 5));
    const s = [...wk(3, 3), ...wk(1, 3)]; // week 2 missed
    assert.equal(weeklyStreak(s, 3, addDays(MON, 1)), 1);
  });

  it("flags a personal record only after a baseline exists", () => {
    const prior = [sess("2026-10-12", "push", "bench-press", 135, 8)];
    const better = [{ exerciseId: "bench-press", sets: [{ weight: 140, reps: 5 }] }];
    assert.equal(findNewPRs(prior, better).length, 1);
    const same = [{ exerciseId: "bench-press", sets: [{ weight: 135, reps: 8 }] }];
    assert.equal(findNewPRs(prior, same).length, 0);
    assert.equal(findNewPRs([], better).length, 0); // first time ever: baseline, not PR
  });
});

describe("validateSession", () => {
  const form = (over: Partial<SessionForm> = {}): SessionForm => ({
    date: MON,
    focus: "push",
    exercises: [{ exerciseId: "bench-press", sets: [{ weight: "135", reps: "8" }, { weight: "", reps: "" }] }],
    ...over,
  });

  it("accepts a good session and skips untouched rows", () => {
    const r = validateSession(form(), MON);
    assert.deepEqual(r.errors, {});
    assert.deepEqual(r.session?.entries, [{ exerciseId: "bench-press", sets: [{ weight: 135, reps: 8 }] }]);
  });

  it("accepts decimals, commas, and bodyweight", () => {
    const r = validateSession(
      form({ exercises: [{ exerciseId: "push-up", sets: [{ weight: "", reps: "20" }, { weight: "62,5", reps: "5" }] }] }),
      MON,
    );
    assert.deepEqual(r.session?.entries[0].sets, [{ weight: null, reps: 20 }, { weight: 62.5, reps: 5 }]);
  });

  it("says what to do when reps are missing", () => {
    const r = validateSession(form({ exercises: [{ exerciseId: "bench-press", sets: [{ weight: "135", reps: "" }] }] }), MON);
    assert.equal(r.errors[setKey(0, 0, "reps")], "Enter how many reps you did at this weight.");
    assert.equal(r.session, undefined);
  });

  it("rejects bad reps and weights next to the right field", () => {
    const r = validateSession(
      form({ exercises: [{ exerciseId: "bench-press", sets: [{ weight: "heavy", reps: "8.5" }] }] }),
      MON,
    );
    assert.match(r.errors[setKey(0, 0, "weight")], /number from 0 to 1,000/);
    assert.match(r.errors[setKey(0, 0, "reps")], /whole number from 1 to 100/);
  });

  it("rejects future dates and requires at least one set", () => {
    assert.match(validateSession(form({ date: "2026-10-25" }), MON).errors.date, /today or an earlier date/);
    assert.match(validateSession(form({ date: "" }), MON).errors.date, /Pick the date/);
    const empty = validateSession(form({ exercises: [{ exerciseId: "bench-press", sets: [{ weight: "", reps: "" }] }] }), MON);
    assert.match(empty.errors.form, /at least one set/);
  });
});

describe("storage", () => {
  it("round-trips valid data", () => {
    const data = { ...EMPTY_DATA, profile: profile(), sessions: [sess(MON, "push", "bench-press", 135, 8)] };
    const { data: back, recovered } = parseData(serialize(data));
    assert.equal(recovered, false);
    assert.deepEqual(back, data);
  });

  it("recovers from corrupt or foreign data without throwing", () => {
    assert.equal(parseData("{not json").recovered, true);
    assert.equal(parseData('{"version":2}').recovered, true);
    assert.equal(parseData("[]").recovered, true);
    assert.deepEqual(parseData("{not json").data, EMPTY_DATA);
    assert.equal(parseData(null).recovered, false);
  });

  it("drops invalid sessions but keeps the good ones", () => {
    const good = sess(MON, "push", "bench-press", 135, 8);
    const raw = JSON.stringify({
      version: 1,
      profile: profile(),
      sessions: [good, { id: "x", date: "nope", focus: "push", entries: [] }, { id: "y", date: MON, focus: "push", entries: [{ exerciseId: "bench-press", sets: [{ weight: 100, reps: 9999 }] }] }],
    });
    const { data, recovered } = parseData(raw);
    assert.equal(recovered, true);
    assert.equal(data.sessions.length, 1);
    assert.equal(data.sessions[0].id, good.id);
  });

  it("converts weights between units, rounded to the half", () => {
    assert.equal(convertWeight(135, "lb", "kg"), 61);
    assert.equal(convertWeight(60, "kg", "lb"), 132.5);
    assert.equal(convertWeight(100, "lb", "lb"), 100);
  });
});
