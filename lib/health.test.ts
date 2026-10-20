import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkinsIn, limits, parseDecimal, series, validateCheckin } from "./checkin.ts";
import type { Checkin, CheckinForm } from "./checkin.ts";
import { bmr, estimate, validateNutrition } from "./nutrition.ts";
import type { NutritionForm } from "./nutrition.ts";

const TODAY = "2026-10-20";
const blank: CheckinForm = { date: TODAY, weight: "", waist: "", chest: "", hips: "", arm: "" };

describe("check-in form", () => {
  it("needs at least one measurement, and says so", () => {
    const r = validateCheckin(blank, "lb", TODAY);
    assert.match(r.errors.form!, /at least one measurement/);
    assert.equal(r.values, undefined);
  });
  it("accepts decimals and commas, and skips empty fields", () => {
    const r = validateCheckin({ ...blank, weight: "165,5", waist: "32" }, "lb", TODAY);
    assert.deepEqual(r.errors, {});
    assert.deepEqual(r.values, { date: TODAY, weight: 165.5, waist: 32 });
  });
  it("puts each error next to its field and says what to do", () => {
    const r = validateCheckin({ ...blank, weight: "heavy", waist: "3", arm: "400" }, "lb", TODAY);
    assert.match(r.errors.weight!, /as a number/);
    assert.match(r.errors.waist!, /between 6 and 100 in/);
    assert.match(r.errors.arm!, /between 6 and 100 in/);
    assert.equal(r.errors.form, undefined);
  });
  it("uses unit-appropriate limits", () => {
    assert.deepEqual(limits("weight", "kg"), [30, 300]);
    assert.deepEqual(limits("waist", "kg"), [15, 250]);
    assert.equal(validateCheckin({ ...blank, weight: "80" }, "kg", TODAY).errors.weight, undefined);
    assert.ok(validateCheckin({ ...blank, weight: "20" }, "kg", TODAY).errors.weight);
  });
  it("rejects future and missing dates", () => {
    assert.match(validateCheckin({ ...blank, date: "2026-12-01", weight: "160" }, "lb", TODAY).errors.date!, /today or an earlier/);
    assert.match(validateCheckin({ ...blank, date: "", weight: "160" }, "lb", TODAY).errors.date!, /Pick the date/);
  });
  it("parses numbers strictly", () => {
    assert.equal(parseDecimal("12.5"), 12.5);
    assert.ok(Number.isNaN(parseDecimal("12.5.1")));
    assert.ok(Number.isNaN(parseDecimal("-3")));
    assert.ok(Number.isNaN(parseDecimal("1e3")));
  });
  it("builds oldest-first trends and converts units for display only", () => {
    const cs: Checkin[] = [
      { id: "b", date: "2026-10-10", unit: "lb", weight: 170, waist: 34, createdAt: 2 },
      { id: "a", date: "2026-09-10", unit: "lb", weight: 175, createdAt: 1 },
    ];
    assert.deepEqual(series(cs, "weight").map((p) => p.value), [175, 170]);
    assert.deepEqual(series(cs, "waist").length, 1);
    const kg = checkinsIn(cs, "kg");
    assert.equal(kg[0].weight, 77.1);
    assert.equal(kg[0].waist, 86.4);
    assert.equal(cs[0].weight, 170);
  });
});

describe("nutrition estimate", () => {
  const form: NutritionForm = { age: "28", sex: "male", height: "70", weight: "175", activity: "light" };
  it("is for adults only, and validates every field next to itself", () => {
    assert.match(validateNutrition({ ...form, age: "16" }, "lb").errors.age!, /adults/);
    assert.match(validateNutrition({ ...form, age: "" }, "lb").errors.age!, /Enter your age/);
    assert.match(validateNutrition({ ...form, sex: "" }, "lb").errors.sex!, /two versions/);
    assert.match(validateNutrition({ ...form, height: "7" }, "lb").errors.height!, /between 48 and 90 in/);
    assert.match(validateNutrition({ ...form, weight: "abc" }, "lb").errors.weight!, /as a number/);
    assert.match(validateNutrition({ ...form, activity: "" }, "lb").errors.activity!, /closest/);
    assert.deepEqual(validateNutrition(form, "lb").errors, {});
  });
  it("matches the Mifflin–St Jeor equation", () => {
    const p = validateNutrition(form, "lb").profile!;
    // 175 lb = 79.4 kg, 70 in = 177.8 cm: 10*79.4 + 6.25*177.8 - 5*28 + 5 ≈ 1771
    assert.ok(Math.abs(bmr(p) - 1771) < 5);
  });
  it("gives ranges, nudges by look, and never suggests eating below resting needs", () => {
    const p = validateNutrition(form, "lb").profile!;
    const build = estimate(p, "big-strong");
    const lean = estimate(p, "toned-defined");
    const even = estimate(p, "balanced");
    assert.ok(build.target[0] > even.target[0] && even.target[0] > lean.target[0]);
    assert.equal(build.direction, "above");
    assert.equal(lean.direction, "below");
    assert.ok(lean.target[0] >= Math.round((bmr(p) * 0.95) / 50) * 50 - 50);
    assert.ok(build.target[1] > build.target[0]);
    assert.deepEqual(even.protein, [Math.round(79.4 * 1.4), Math.round(79.4 * 2.0)].map((n, i) => (i === 0 ? n : n)).map((n) => n) as [number, number]);
  });
});
