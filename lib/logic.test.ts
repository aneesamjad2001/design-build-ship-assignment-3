import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, daysBetween, monthGrid, startOfWeek } from "./dates.ts";
import { recommend, suggestNext } from "./recommend.ts";
import { workoutFor, planFor, prescribe } from "./plans.ts";
import { getExercise } from "./exercises.ts";
import { convertWeight, parseData, serialize, sessionsIn, EMPTY_DATA } from "./storage.ts";
import type { Profile, Session } from "./storage.ts";
import { daysInWeek, findNewPRs, latestIsRecord, liftHistory, weeklyStreak } from "./stats.ts";
import { validateSession, setKey } from "./validate.ts";
import type { SessionForm } from "./validate.ts";
import { buildBackup, describeBackup, readBackup } from "./backup.ts";
import { hasTypedData, parseDraft } from "./draft.ts";
import { describePlates, plateBreakdown } from "./plates.ts";
import { buildCalendar, fold, isTime, nextWeekday, suggestedDays } from "./ics.ts";
import { convertFormWeights, formFromSession, repeatLastSet, stepValue, swapOptions } from "./formstate.ts";

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
  unit: "lb",
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
    assert.match(s.text, /top of the range, so add weight/);
  });
  it("uses smaller steps in kilograms", () => {
    const s = suggestNext(bench, rx, [sess("2026-10-12", "push", "bench-press", 60, 10)], "kg")!;
    assert.equal(s.weight, 62.5);
  });
  it("never sends an unloaded movement backwards at the top of the range", () => {
    const pushUp = getExercise("push-up")!;
    const s = suggestNext(pushUp, { sets: 4, repMin: 6, repMax: 10 }, [sess("2026-10-12", "push", "push-up", null, 10)], "lb")!;
    assert.equal(s.reps, 10); // not reset to 6
    assert.match(s.text, /add weight or slow the reps down/);
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

  it("only calls the latest log a record if it beats strictly earlier sessions", () => {
    const first = sess("2026-10-10", "push", "bench-press", 135, 8);
    const sameAgain = sess("2026-10-12", "push", "bench-press", 135, 8);
    const heavier = sess("2026-10-14", "push", "bench-press", 140, 5);
    assert.equal(latestIsRecord([first, sameAgain], "bench-press"), false); // a repeat is not a PR
    assert.equal(latestIsRecord([first, sameAgain, heavier], "bench-press"), true);
    assert.equal(latestIsRecord([first], "bench-press"), false); // a baseline is not a PR
    // two identical sessions on the same day must not both look like records
    const a = { ...sess(MON, "push", "bench-press", 150, 5), createdAt: 1 };
    const b = { ...sess(MON, "push", "bench-press", 150, 5), createdAt: 2 };
    assert.equal(latestIsRecord([first, a, b], "bench-press"), false);
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

  it("keeps a session's original unit and only converts for display", () => {
    const kgSession: Session = { ...sess(MON, "legs", "squat", 500, 3), unit: "kg" };
    const shown = sessionsIn([kgSession], "lb");
    assert.equal(shown[0].entries[0].sets[0].weight, 1102.5); // shown in lb…
    assert.equal(kgSession.entries[0].sets[0].weight, 500); // …the original is untouched
    // a 500 kg lift survives a save/load round trip even though 1102.5 > 1000
    const data = { ...EMPTY_DATA, profile: profile({ unit: "lb" }), sessions: [kgSession] };
    const back = parseData(serialize(data));
    assert.equal(back.recovered, false);
    assert.equal(back.data.sessions.length, 1);
    // switching back and forth never drifts: always converted from the original
    const lb = sessionsIn(sessionsIn([kgSession], "lb"), "kg");
    assert.equal(lb[0].entries[0].sets[0].weight, 500);
  });

  it("reports partial corruption, not just lost sessions", () => {
    const raw = JSON.stringify({
      version: 1,
      profile: profile(),
      sessions: [
        { id: "x", date: MON, focus: "push", createdAt: 1, unit: "lb", entries: [{ exerciseId: "bench-press", sets: [{ weight: 100, reps: 8 }, { weight: 100, reps: 9999 }] }] },
      ],
    });
    const { data, recovered } = parseData(raw);
    assert.equal(recovered, true);
    assert.equal(data.sessions[0].entries[0].sets.length, 1);
  });

  it("gives sessions saved before units were tracked the profile's unit", () => {
    const raw = JSON.stringify({
      version: 1,
      profile: profile({ unit: "kg" }),
      sessions: [{ id: "old", date: MON, focus: "push", createdAt: 1, entries: [{ exerciseId: "bench-press", sets: [{ weight: 60, reps: 8 }] }] }],
    });
    assert.equal(parseData(raw).data.sessions[0].unit, "kg");
  });

  it("converts weights between units, rounded to the half", () => {
    assert.equal(convertWeight(135, "lb", "kg"), 61);
    assert.equal(convertWeight(60, "kg", "lb"), 132.5);
    assert.equal(convertWeight(100, "lb", "lb"), 100);
  });
});

describe("backup", () => {
  const data = { ...EMPTY_DATA, profile: profile(), sessions: [sess("2026-10-12", "push", "bench-press", 135, 8), sess(MON, "pull", "barbell-row", 115, 8)] };

  it("round-trips through a file", () => {
    const r = readBackup(buildBackup(data, new Date("2026-10-20T10:00:00Z")));
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.recovered, false);
      assert.deepEqual(r.data.sessions.map((s) => s.id), data.sessions.map((s) => s.id));
      assert.equal(r.data.profile?.goal, "muscle");
    }
  });

  it("explains what is wrong with a bad file and what to do", () => {
    for (const text of ["", "   ", "not json at all", "[]", '{"version":1,"profile":null,"sessions":[]}', '{"hello":"world"}']) {
      const r = readBackup(text);
      assert.equal(r.ok, false, `should reject: ${text}`);
      if (!r.ok) assert.match(r.error, /Choose/);
    }
  });

  it("flags a backup that had to be cleaned", () => {
    const dirty = JSON.stringify({ version: 1, profile: profile(), sessions: [{ id: "x", date: "bad", focus: "push", entries: [] }, ...data.sessions] });
    const r = readBackup(dirty);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.recovered, true);
  });

  it("describes what is inside", () => {
    assert.match(describeBackup(data), /2 sessions from .* to .* · Build muscle, 4 days a week/);
    assert.match(describeBackup({ ...data, sessions: [] }), /plan only/i);
  });
});

describe("draft", () => {
  const NOW = 1_800_000_000_000;
  const form = (reps = ""): SessionForm => ({ date: MON, focus: "push", exercises: [{ exerciseId: "bench-press", sets: [{ weight: "135", reps }] }] });
  const raw = (over: object = {}) => JSON.stringify({ savedAt: NOW - 1000, unit: "lb", note: "", form: form("8"), ...over });

  it("only counts typed data", () => {
    assert.equal(hasTypedData({ date: MON, focus: "push", exercises: [{ exerciseId: "bench-press", sets: [{ weight: "", reps: "" }] }] }), false);
    assert.equal(hasTypedData(form("8")), true);
    assert.equal(hasTypedData({ date: MON, focus: "push", exercises: [] }, "felt strong"), true);
  });

  it("restores a recent draft", () => {
    const d = parseDraft(raw(), NOW);
    assert.equal(d?.form.exercises[0].sets[0].reps, "8");
  });

  it("ignores old, malformed, or hostile drafts instead of crashing", () => {
    assert.equal(parseDraft(raw({ savedAt: NOW - 25 * 3600 * 1000 }), NOW), null);
    assert.equal(parseDraft("{nope", NOW), null);
    assert.equal(parseDraft(null, NOW), null);
    assert.equal(parseDraft(raw({ unit: "stone" }), NOW), null);
    assert.equal(parseDraft(raw({ form: { date: MON, focus: "dance", exercises: [] } }), NOW), null);
    assert.equal(parseDraft(raw({ form: { date: MON, focus: "push", exercises: [{ exerciseId: "nope", sets: [] }] } }), NOW), null);
  });
});

describe("plates", () => {
  it("loads the bar greedily, per side", () => {
    assert.deepEqual(plateBreakdown(225, 45, "lb").perSide, [{ plate: 45, count: 2 }]);
    assert.deepEqual(plateBreakdown(135, 45, "lb").perSide, [{ plate: 45, count: 1 }]);
    assert.deepEqual(plateBreakdown(100, 45, "lb").perSide, [{ plate: 25, count: 1 }, { plate: 2.5, count: 1 }]);
    assert.deepEqual(plateBreakdown(62.5, 20, "kg").perSide, [{ plate: 20, count: 1 }, { plate: 1.25, count: 1 }]);
  });
  it("says so when the weight can't be built or is under the bar", () => {
    const odd = plateBreakdown(46, 45, "lb");
    assert.equal(odd.exact, false);
    assert.equal(odd.achieved, 45);
    assert.equal(plateBreakdown(30, 45, "lb").belowBar, true);
    assert.equal(describePlates(plateBreakdown(45, 45, "lb")), "Just the bar.");
    assert.equal(describePlates(plateBreakdown(225, 45, "lb")), "2 × 45 on each side");
  });
});

describe("form helpers", () => {
  const set = (weight: string, reps: string) => ({ weight, reps });
  it("repeats the last filled set into the next empty row", () => {
    const out = repeatLastSet([set("135", "8"), set("", ""), set("", "")]);
    assert.deepEqual(out, [set("135", "8"), set("135", "8"), set("", "")]);
  });
  it("adds a row when there is no empty one, and does nothing with nothing to copy", () => {
    assert.equal(repeatLastSet([set("135", "8"), set("135", "7")]).length, 3);
    const blank = [set("", ""), set("", "")];
    assert.equal(repeatLastSet(blank), blank);
  });
  it("re-expresses typed weights in another unit and leaves junk alone", () => {
    const f = { date: MON, focus: "push", exercises: [{ exerciseId: "bench-press", sets: [set("135", "8"), set("abc", "8"), set("", "8")] }] };
    const kg = convertFormWeights(f, "lb", "kg").exercises[0].sets;
    assert.equal(kg[0].weight, "61");
    assert.equal(kg[1].weight, "abc");
    assert.equal(kg[2].weight, "");
  });
  it("steps a number up and down, never below the minimum, and leaves junk alone", () => {
    assert.equal(stepValue("135", 1, 5, 0), "140");
    assert.equal(stepValue("135", -1, 5, 0), "130");
    assert.equal(stepValue("", 1, 5, 0), "5");
    assert.equal(stepValue("2", -1, 5, 0), "0");
    assert.equal(stepValue("8", -1, 1, 1), "7");
    assert.equal(stepValue("1", -1, 1, 1), "1");
    assert.equal(stepValue("abc", 1, 5, 0), "abc");
    assert.equal(stepValue("62.5", 1, 2.5, 0), "65");
  });
  it("turns a saved session back into editable text", () => {
    const s = { ...sess(MON, "push", "bench-press", 135.5, 8), entries: [{ exerciseId: "push-up", sets: [{ weight: null, reps: 20 }] }, { exerciseId: "bench-press", sets: [{ weight: 135.5, reps: 8 }] }] };
    const form = formFromSession(s);
    assert.deepEqual(form.exercises[0].sets, [set("", "20")]);
    assert.deepEqual(form.exercises[1].sets, [set("135.5", "8")]);
  });
  it("offers swaps that train the same muscle, never the exercise itself or ones already in the session", () => {
    const opts = swapOptions("bench-press", ["bench-press"]).map((e) => e.id);
    assert.ok(opts.includes("incline-db-press") && opts.includes("push-up"));
    assert.ok(!opts.includes("bench-press") && !opts.includes("squat"));
    assert.ok(!swapOptions("bench-press", ["incline-db-press"]).some((e) => e.id === "incline-db-press"));
    assert.equal(swapOptions("kettlebell-swing", []).length, 0); // conditioning isn't swapped for strength work
  });
});

describe("lift history", () => {
  it("lists each session once, oldest first, with top set and volume", () => {
    const a = { ...sess("2026-10-12", "push", "bench-press", 135, 8), entries: [{ exerciseId: "bench-press", sets: [{ weight: 135, reps: 8 }, { weight: 145, reps: 5 }] }] };
    const b = sess("2026-10-05", "push", "bench-press", 125, 10);
    const h = liftHistory([a, b, sess("2026-10-08", "pull", "barbell-row", 100, 8)], "bench-press");
    assert.deepEqual(h.map((x) => x.date), ["2026-10-05", "2026-10-12"]);
    assert.deepEqual(h[1].top, { weight: 145, reps: 5 });
    assert.equal(h[1].volume, 135 * 8 + 145 * 5);
    assert.equal(h[0].volume, 1250);
  });
  it("counts reps alone as the volume of bodyweight sets", () => {
    const h = liftHistory([{ ...sess("2026-10-12", "push", "push-up", null, 20), entries: [{ exerciseId: "push-up", sets: [{ weight: null, reps: 20 }, { weight: null, reps: 15 }] }] }], "push-up");
    assert.equal(h[0].volume, 35);
  });
});

describe("calendar reminders", () => {
  const NOW = new Date(2026, 9, 20, 9, 30, 0); // Tue Oct 20 2026, local time
  it("builds one weekly event per chosen day, with a 30-minute alarm", () => {
    const ics = buildCalendar({ days: [0, 2, 4], time: "18:00", siteUrl: "https://example.com", now: NOW });
    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 3);
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=MO/);
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=WE/);
    assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=FR/);
    assert.match(ics, /TRIGGER:-PT30M/);
    assert.match(ics, /DTSTART:20261026T180000/); // next Monday after Tue Oct 20
    assert.match(ics, /DTEND:20261026T190000/);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n") && ics.endsWith("END:VCALENDAR\r\n"));
  });
  it("starts today when today is a chosen day, and handles an evening that crosses midnight", () => {
    assert.equal(nextWeekday("2026-10-20", 1), "2026-10-20"); // Tuesday itself
    assert.equal(nextWeekday("2026-10-20", 0), "2026-10-26");
    assert.match(buildCalendar({ days: [1], time: "23:30", minutes: 60, siteUrl: "x", now: NOW }), /DTEND:20261020T003000/);
  });
  it("never repeats a day and keeps lines within 75 bytes", () => {
    const ics = buildCalendar({ days: [0, 0, 0], time: "07:15", siteUrl: "https://example.com/" + "a".repeat(200), now: NOW });
    assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, 1);
    for (const line of ics.split("\r\n")) assert.ok(new TextEncoder().encode(line).length <= 75, `too long: ${line.length}`);
    assert.equal(fold("a".repeat(100)).split("\r\n").length, 2);
  });
  it("suggests a spread of days and validates times", () => {
    assert.deepEqual(suggestedDays(3), [0, 2, 4]);
    assert.equal(suggestedDays(4).length, 4);
    assert.equal(isTime("18:00"), true);
    assert.equal(isTime("25:00"), false);
    assert.equal(isTime(""), false);
  });
});
