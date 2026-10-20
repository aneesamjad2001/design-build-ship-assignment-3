import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXERCISE_NAMES, EXERCISE_TEXT } from "./exerciseText.ts";
import type { ExerciseText } from "./exerciseText.ts";

const IDS = [
  "goblet-squat",
  "leg-press",
  "romanian-deadlift",
  "hip-thrust",
  "split-squat",
  "leg-curl",
  "leg-extension",
  "calf-raise",
  "dumbbell-bench-press",
  "incline-dumbbell-press",
  "push-up",
  "dumbbell-shoulder-press",
  "lateral-raise",
  "triceps-pushdown",
  "lat-pulldown",
  "seated-cable-row",
  "one-arm-dumbbell-row",
  "face-pull",
  "dumbbell-curl",
  "hammer-curl",
  "plank",
  "dead-bug",
  "hanging-knee-raise",
  "cable-crunch",
  "incline-walk",
];

/** Timed holds and cardio are paced by the clock, not by "reps left in the tank". */
const NOT_REP_BASED = new Set(["plank", "incline-walk"]);

const ALLOWED_KEYS = new Set(["summary", "equipment", "setup", "cues", "mistake", "startTip", "safety"]);

// Words and phrases the style guide rules out: body-outcome promises.
const BANNED: RegExp[] = [
  /\btone[ds]?\b/i,
  /\btoning\b/i,
  /\bshred(s|ded|ding)?\b/i,
  /\bburn(s|ed|ing)?\s+(fat|calories)\b/i,
  /\bmelt(s|ed|ing)?\b/i,
  /\bsculpt(s|ed|ing)?\b/i,
  /\bsix[- ]pack\b/i,
  /\b(lose|losing)\s+weight\b/i,
  /\bfat\s+loss\b/i,
];

// Jargon that would need explaining to a first-timer; say it in plain words instead.
const JARGON = new RegExp(
  "\\b(selectorized|concentric|eccentric|scapula|scapulae|retract|retraction|protract|hypertrophy|supinated|pronated|lumbar|thoracic|valgus|isometric|proprioception)\\b",
  "i",
);

const wordCount = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const sentenceCount = (s: string): number => (s.match(/[.!?](?=\s|$)/g) ?? []).length;

/** Every string a person reads for one exercise, labelled for failure messages. */
function allStrings(id: string, t: ExerciseText): Array<[string, string]> {
  const out: Array<[string, string]> = [
    [`${id}.name`, EXERCISE_NAMES[id]],
    [`${id}.summary`, t.summary],
    [`${id}.equipment`, t.equipment],
    [`${id}.mistake`, t.mistake],
    [`${id}.startTip`, t.startTip],
  ];
  t.setup.forEach((s, i) => out.push([`${id}.setup[${i}]`, s]));
  t.cues.forEach((s, i) => out.push([`${id}.cues[${i}]`, s]));
  if (t.safety !== undefined) out.push([`${id}.safety`, t.safety]);
  return out;
}

describe("exercise text: coverage", () => {
  it("lists 25 distinct exercises", () => {
    assert.equal(IDS.length, 25);
    assert.equal(new Set(IDS).size, 25);
  });

  it("has text for exactly those exercises", () => {
    assert.deepEqual(Object.keys(EXERCISE_TEXT).sort(), [...IDS].sort());
  });

  it("has a display name for exactly those exercises", () => {
    assert.deepEqual(Object.keys(EXERCISE_NAMES).sort(), [...IDS].sort());
    const names = Object.values(EXERCISE_NAMES);
    for (const name of names) assert.ok(name.trim().length > 0, "display names are not empty");
    assert.equal(new Set(names).size, names.length, "display names are unique");
  });
});

describe("exercise text: shape", () => {
  it("gives every exercise all the required fields", () => {
    for (const id of IDS) {
      const t = EXERCISE_TEXT[id];
      assert.ok(t, `${id} has an entry`);
      for (const key of ["summary", "equipment", "mistake", "startTip"] as const) {
        assert.equal(typeof t[key], "string", `${id}.${key} is a string`);
      }
      assert.ok(Array.isArray(t.setup), `${id}.setup is an array`);
      assert.ok(Array.isArray(t.cues), `${id}.cues is an array`);
      for (const s of [...t.setup, ...t.cues]) assert.equal(typeof s, "string", `${id} steps and cues are strings`);
      assert.ok(t.safety === undefined || typeof t.safety === "string", `${id}.safety is a string when present`);
      const extra = Object.keys(t).filter((k) => !ALLOWED_KEYS.has(k));
      assert.deepEqual(extra, [], `${id} has no unknown fields`);
    }
  });

  it("has exactly 3 cues and 2-3 setup steps", () => {
    for (const id of IDS) {
      const t = EXERCISE_TEXT[id];
      assert.equal(t.cues.length, 3, `${id} has 3 cues`);
      assert.ok(t.setup.length >= 2 && t.setup.length <= 3, `${id} has 2-3 setup steps, got ${t.setup.length}`);
    }
  });

  it("keeps every summary to 14 words or fewer", () => {
    for (const id of IDS) {
      const n = wordCount(EXERCISE_TEXT[id].summary);
      assert.ok(n <= 14, `${id} summary has ${n} words`);
    }
  });

  it("has no empty or untrimmed strings", () => {
    for (const id of IDS) {
      for (const [label, s] of allStrings(id, EXERCISE_TEXT[id])) {
        assert.equal(typeof s, "string", `${label} is a string`);
        assert.ok(s.length > 0, `${label} is empty`);
        assert.equal(s, s.trim(), `${label} has leading or trailing whitespace`);
      }
    }
  });

  it("keeps mistake and startTip to 1-2 sentences and safety to one", () => {
    for (const id of IDS) {
      const t = EXERCISE_TEXT[id];
      for (const [label, s] of [
        [`${id}.mistake`, t.mistake],
        [`${id}.startTip`, t.startTip],
      ] as const) {
        const n = sentenceCount(s);
        assert.ok(n >= 1 && n <= 2, `${label} has ${n} sentences`);
      }
      if (t.safety !== undefined) assert.equal(sentenceCount(t.safety), 1, `${id}.safety is one sentence`);
    }
  });
});

describe("exercise text: tone and plain language", () => {
  it("makes no body-outcome promises", () => {
    for (const id of IDS) {
      for (const [label, s] of allStrings(id, EXERCISE_TEXT[id])) {
        for (const re of BANNED) assert.ok(!re.test(s), `${label} contains banned wording (${re}): "${s}"`);
      }
    }
  });

  it("avoids unexplained jargon", () => {
    for (const id of IDS) {
      for (const [label, s] of allStrings(id, EXERCISE_TEXT[id])) {
        assert.ok(!JARGON.test(s), `${label} uses jargon: "${s}"`);
      }
    }
  });
});

describe("exercise text: how to start", () => {
  it("uses 'reps left in the tank' language for every rep-based exercise", () => {
    for (const id of IDS) {
      if (NOT_REP_BASED.has(id)) continue;
      assert.match(EXERCISE_TEXT[id].startTip, /reps left in the tank/, `${id}.startTip`);
    }
  });

  it("says so when an exercise is timed or cardio", () => {
    assert.match(EXERCISE_TEXT["plank"].startTip, /timed/i);
    assert.match(EXERCISE_TEXT["plank"].startTip, /seconds/);
    assert.match(EXERCISE_TEXT["incline-walk"].startTip, /timed/i);
    assert.match(EXERCISE_TEXT["incline-walk"].startTip, /minutes/);
  });

  it("counts dead bugs per side", () => {
    assert.match(EXERCISE_TEXT["dead-bug"].startTip, /per side/);
  });
});

describe("exercise text: safety notes where they matter", () => {
  it("warns about the risky ones", () => {
    for (const id of [
      "romanian-deadlift",
      "split-squat",
      "dumbbell-bench-press",
      "incline-dumbbell-press",
      "lat-pulldown",
      "incline-walk",
    ]) {
      assert.ok(EXERCISE_TEXT[id].safety, `${id} has a safety note`);
    }
  });

  it("never pulls the lat pulldown bar behind the neck", () => {
    assert.match(EXERCISE_TEXT["lat-pulldown"].safety ?? "", /never behind your head/);
  });
});
