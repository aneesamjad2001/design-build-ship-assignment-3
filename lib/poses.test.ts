import { test } from "node:test";
import assert from "node:assert/strict";
import { FIGURE_ALT, FLOOR, POSES, RIG, STROKE, VIEW_H, VIEW_W, easeInOut, keyframes, poseAt, solvePose } from "./poses.ts";
import type { Bone, JointName, Point, Pose, PoseSet, Prim, Solved } from "./poses.ts";

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

/** progress values to sample: every keyframe boundary region plus the midpoint of the blend */
const SAMPLES = [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9, 1];

const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const names = (s: Solved) => Object.keys(s.joints) as JointName[];
const solveAt = (id: string, t: number): Solved => solvePose(poseAt(POSES[id], t));
const key = (b: Bone) => `${b.from}>${b.to}`;

/** the nominal length of each kind of bone (bars between the two shoulders or hips are only checked for constancy) */
const NOMINAL: Record<string, number> = {
  "hip>shoulder": RIG.torso,
  "shoulder>neck": RIG.neck,
  "hipN>kneeN": RIG.thigh,
  "hipF>kneeF": RIG.thigh,
  "kneeN>ankleN": RIG.shin,
  "kneeF>ankleF": RIG.shin,
  "ankleN>toeN": RIG.foot,
  "ankleF>toeF": RIG.foot,
  "shoulderN>elbowN": RIG.upperArm,
  "shoulderF>elbowF": RIG.upperArm,
  "elbowN>handN": RIG.forearm,
  "elbowF>handF": RIG.forearm,
};

function flexion(pose: Pose, joint: "knee" | "elbow"): number[] {
  return [pose[joint], pose.far?.[joint] ?? pose[joint]];
}

function points(p: Prim): Point[] {
  if (p.kind === "line") return [p.a, p.b];
  return [
    [p.c[0] - p.r, p.c[1] - p.r],
    [p.c[0] + p.r, p.c[1] + p.r],
  ];
}

test("every exercise has a pose, and no pose is left without an exercise", () => {
  for (const id of IDS) assert.ok(Object.hasOwn(POSES, id), `missing pose for ${id}`);
  assert.deepEqual(Object.keys(POSES).sort(), [...IDS].sort());
});

test("every pose has a one-sentence alt text", () => {
  assert.deepEqual(Object.keys(FIGURE_ALT).sort(), [...IDS].sort());
  for (const id of IDS) {
    const alt = FIGURE_ALT[id];
    assert.equal(typeof alt, "string", id);
    assert.ok(alt.trim().length > 20, `${id}: alt text is empty or too short`);
    assert.equal(alt, alt.trim(), `${id}: alt text has stray whitespace`);
    assert.ok(alt.endsWith("."), `${id}: alt text should end with a full stop`);
    assert.equal(alt.split(/[.!?]\s/).length, 1, `${id}: alt text should be a single sentence`);
  }
});

test("keyframes of one exercise share a view and an anchor joint, so blending is well defined", () => {
  for (const id of IDS) {
    const set: PoseSet = POSES[id];
    const frames = keyframes(set);
    assert.ok(frames.length >= 2, id);
    for (const f of frames) {
      assert.equal(f.view, set.view, `${id}: view differs between keyframes`);
      assert.equal(f.facing, frames[0].facing, `${id}: facing differs`);
      assert.equal(f.anchor.joint, frames[0].anchor.joint, `${id}: anchor joint differs`);
    }
  }
});

test("every solved joint is finite and inside the 240x160 viewBox at every keyframe and while blending", () => {
  for (const id of IDS) {
    const ts = [...SAMPLES, ...keyframes(POSES[id]).map((_, i, all) => i / (all.length - 1))];
    for (const t of ts) {
      const s = solveAt(id, t);
      for (const name of names(s)) {
        const [x, y] = s.joints[name];
        assert.ok(Number.isFinite(x) && Number.isFinite(y), `${id} t=${t} ${name} is not finite`);
        const pad = name === "head" ? RIG.headR : STROKE / 2;
        assert.ok(x >= pad && x <= VIEW_W - pad, `${id} t=${t} ${name} x=${x.toFixed(1)} leaves the viewBox`);
        assert.ok(y >= pad && y <= VIEW_H - pad, `${id} t=${t} ${name} y=${y.toFixed(1)} leaves the viewBox`);
      }
    }
  }
});

test("equipment is finite and stays inside the viewBox", () => {
  for (const id of IDS) {
    for (const t of SAMPLES) {
      const s = solveAt(id, t);
      assert.ok(s.equipment.length > 0, `${id} has no equipment at all`);
      for (const prim of s.equipment) {
        for (const [x, y] of points(prim)) {
          assert.ok(Number.isFinite(x) && Number.isFinite(y), `${id} t=${t} equipment is not finite`);
          assert.ok(x >= -0.5 && x <= VIEW_W + 0.5 && y >= -0.5 && y <= VIEW_H + 0.5, `${id} t=${t} equipment point (${x.toFixed(1)}, ${y.toFixed(1)}) leaves the viewBox`);
        }
      }
    }
  }
});

test("limbs are rigid: every bone keeps its length through the whole blend", () => {
  for (const id of IDS) {
    const rest = solveAt(id, 0);
    for (const t of SAMPLES) {
      const s = solveAt(id, t);
      s.bones.forEach((b, i) => {
        const len = dist(s.joints[b.from], s.joints[b.to]);
        const len0 = dist(rest.joints[rest.bones[i].from], rest.joints[rest.bones[i].to]);
        assert.ok(Math.abs(len - len0) < 1e-6, `${id} t=${t} bone ${key(b)} changed length (${len0.toFixed(3)} -> ${len.toFixed(3)})`);
        const nominal = NOMINAL[key(b)];
        if (nominal !== undefined) assert.ok(Math.abs(len - nominal) < 1e-6, `${id} bone ${key(b)} is ${len.toFixed(3)}, expected ${nominal}`);
      });
      assert.ok(Math.abs(dist(s.joints.neck, s.joints.head) - RIG.headR) < 1e-6, `${id} t=${t} head is detached from the neck`);
    }
  }
});

test("joints bend the way people do: no knee or elbow bends backwards", () => {
  for (const id of IDS) {
    for (const f of keyframes(POSES[id])) {
      for (const knee of flexion(f, "knee")) assert.ok(knee >= -1 && knee <= 150, `${id}: knee flexion ${knee}`);
      for (const elbow of flexion(f, "elbow")) assert.ok(elbow >= -1 && elbow <= 155, `${id}: elbow flexion ${elbow}`);
    }
  }
});

test("nobody sinks into the floor", () => {
  const tolerance = 1.5; // a planted hand or foot may be a pixel or so off while blending
  for (const id of IDS) {
    const floorY = POSES[id].floorY;
    if (floorY === null) continue;
    for (const t of SAMPLES) {
      const s = solveAt(id, t);
      for (const name of names(s)) {
        const low = s.joints[name][1] + (name === "head" ? RIG.headR : STROKE / 2);
        assert.ok(low <= floorY + tolerance, `${id} t=${t} ${name} reaches y=${low.toFixed(1)}, below the floor at ${floorY}`);
      }
    }
  }
});

test("the endpoints of the blend are exactly the first and last keyframes", () => {
  for (const id of IDS) {
    const set = POSES[id];
    const same = (a: Solved, b: Solved) => names(a).every((n) => dist(a.joints[n], b.joints[n]) < 1e-9);
    assert.ok(same(solvePose(poseAt(set, 0)), solvePose(set.start)), `${id}: t=0 is not the start pose`);
    assert.ok(same(solvePose(poseAt(set, 1)), solvePose(set.end)), `${id}: t=1 is not the end pose`);
    assert.ok(same(solvePose(poseAt(set, -3)), solvePose(set.start)), `${id}: t below 0 should clamp`);
    assert.ok(same(solvePose(poseAt(set, 7)), solvePose(set.end)), `${id}: t above 1 should clamp`);
  }
});

test("a mirrored pose is the exact mirror image about its anchor", () => {
  for (const id of ["goblet-squat", "romanian-deadlift", "dead-bug"]) {
    const pose = POSES[id].end;
    const a = solvePose(pose);
    const b = solvePose({ ...pose, facing: -1 });
    const mid = pose.anchor.at[0];
    for (const name of names(a)) {
      assert.ok(Math.abs(b.joints[name][0] - (2 * mid - a.joints[name][0])) < 1e-9, `${id} ${name}: x is not mirrored`);
      assert.ok(Math.abs(b.joints[name][1] - a.joints[name][1]) < 1e-9, `${id} ${name}: y changed when mirroring`);
    }
  }
});

test("solvePose is pure", () => {
  for (const id of IDS) {
    const pose = POSES[id].end;
    const snapshot = JSON.stringify({ ...pose, gear: null });
    const a = solvePose(pose);
    const b = solvePose(pose);
    assert.deepEqual(a, b, `${id}: solving twice gave different results`);
    assert.equal(JSON.stringify({ ...pose, gear: null }), snapshot, `${id}: solvePose mutated its input`);
  }
});

test("each exercise actually moves between start and end", () => {
  for (const id of IDS) {
    const a = solveAt(id, 0);
    const b = solveAt(id, 1);
    const travel = Math.max(...names(a).map((n) => dist(a.joints[n], b.joints[n])));
    // the plank is an isometric hold: it only breathes
    const least = id === "plank" ? 1 : 12;
    assert.ok(travel >= least, `${id}: nothing moves enough (${travel.toFixed(1)}px)`);
  }
});

test("easing starts and ends gently and never goes backwards", () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.ok(Math.abs(easeInOut(0.5) - 0.5) < 1e-12);
  let last = 0;
  for (let i = 1; i <= 100; i++) {
    const v = easeInOut(i / 100);
    assert.ok(v >= last, "easing went backwards");
    last = v;
  }
  assert.ok(easeInOut(0.1) < 0.1, "should ease in");
  assert.ok(easeInOut(0.9) > 0.9, "should ease out");
});

/* ---- form: the poses show the movement the way a coach would teach it ---- */

/** distance of point p from the infinite line through a and b */
function offLine(p: Point, a: Point, b: Point): number {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  return Math.abs(dx * (a[1] - p[1]) - (a[0] - p[0]) * dy) / Math.hypot(dx, dy);
}

test("goblet squat: thighs reach about parallel, torso stays fairly upright", () => {
  const top = solveAt("goblet-squat", 0).joints;
  const bottom = solveAt("goblet-squat", 1).joints;
  assert.ok(top.hip[1] < bottom.hip[1] - 25, "hips should drop a long way");
  assert.ok(Math.abs(bottom.hip[1] - bottom.kneeN[1]) <= 8, "thigh should be close to parallel with the floor");
  assert.ok(bottom.kneeN[0] > bottom.ankleN[0], "knees travel forward over the feet");
  assert.ok(Math.abs(bottom.shoulder[0] - bottom.hip[0]) < RIG.torso * Math.sin((35 * Math.PI) / 180), "torso leans less than 35 degrees");
});

test("romanian deadlift: hips hinge back, back stays straight, knees stay soft", () => {
  const s = solveAt("romanian-deadlift", 1);
  const j = s.joints;
  assert.ok(j.hip[0] < j.ankleN[0] + 6, "hips sit back over the heels");
  assert.ok(j.shoulder[0] - j.hip[0] > 25, "torso leans well forward");
  assert.ok(offLine(j.head, j.hip, j.shoulder) < 1, "neck stays in line with the back");
  const pose = POSES["romanian-deadlift"].end;
  assert.ok(pose.knee > 5 && pose.knee < 35, "soft knees, not locked and not squatting");
  assert.ok(j.handN[1] > j.kneeN[1] - 6, "weights slide down to about knee height");
});

test("push-up and plank: one straight line from head to heels", () => {
  for (const id of ["push-up", "plank"]) {
    for (const t of SAMPLES) {
      const j = solveAt(id, t).joints;
      assert.ok(offLine(j.hip, j.shoulder, j.ankleN) < 2, `${id} t=${t}: hips sag or pike`);
      assert.ok(offLine(j.kneeN, j.shoulder, j.ankleN) < 2, `${id} t=${t}: knees bend`);
    }
  }
});

test("push-up: hands stay planted while the chest lowers", () => {
  const rest = solveAt("push-up", 0).joints;
  for (const t of SAMPLES) {
    const j = solveAt("push-up", t).joints;
    assert.ok(Math.abs(j.handN[0] - rest.handN[0]) < 1.5, `t=${t}: hand slides sideways`);
    assert.ok(Math.abs(j.handN[1] - rest.handN[1]) < 1.6, `t=${t}: hand lifts or sinks`);
    assert.ok(Math.abs(j.toeN[0] - rest.toeN[0]) < 1.5, `t=${t}: toes slide`);
  }
  assert.ok(solveAt("push-up", 1).joints.shoulder[1] > rest.shoulder[1] + 15, "chest lowers");
});

test("plank: forearms flat on the floor, elbows under the shoulders", () => {
  const j = solveAt("plank", 0).joints;
  assert.ok(Math.abs(j.elbowN[1] - (FLOOR - STROKE / 2)) < 0.5, "elbow rests on the floor");
  assert.ok(Math.abs(j.handN[1] - (FLOOR - STROKE / 2)) < 0.5, "hand rests on the floor");
  assert.ok(Math.abs(j.shoulder[0] - j.elbowN[0]) < 1, "elbow is directly under the shoulder");
});

test("hip thrust: at the top, shoulder, hip and knee line up with the shins vertical", () => {
  const j = solveAt("hip-thrust", 1).joints;
  assert.ok(offLine(j.hip, j.shoulder, j.kneeN) < 2, "shoulder-hip-knee should be a straight line");
  assert.ok(Math.abs(j.kneeN[0] - j.ankleN[0]) < 1.5, "shin is vertical");
  assert.ok(j.hip[1] < solveAt("hip-thrust", 0).joints.hip[1] - 10, "hips are driven up");
  for (const t of SAMPLES) {
    assert.ok(Math.abs(solveAt("hip-thrust", t).joints.shoulder[1] - solveAt("hip-thrust", 0).joints.shoulder[1]) < 0.01, "upper back stays on the bench");
  }
});

test("presses finish with straight arms over the shoulders", () => {
  for (const id of ["dumbbell-bench-press", "incline-dumbbell-press", "dumbbell-shoulder-press"]) {
    const j = solveAt(id, 1).joints;
    assert.ok(j.handN[1] < j.shoulder[1] - 38, `${id}: hands end well above the shoulders`);
    assert.ok(Math.abs(j.handN[0] - j.shoulder[0]) < 8, `${id}: hands end over the shoulders`);
  }
});

test("lateral raise: arms finish level with the shoulders", () => {
  const j = solveAt("lateral-raise", 1).joints;
  assert.ok(Math.abs(j.handN[1] - j.shoulderN[1]) < 8 && Math.abs(j.handF[1] - j.shoulderF[1]) < 8, "hands at shoulder height");
  assert.ok(j.handN[0] - j.shoulderN[0] > 35 && j.shoulderF[0] - j.handF[0] > 35, "arms reach out to the sides");
  assert.equal(POSES["lateral-raise"].view, "front");
});

test("hanging knee raise: hands stay on the bar, knees come up", () => {
  const rest = solveAt("hanging-knee-raise", 0).joints;
  const up = solveAt("hanging-knee-raise", 1).joints;
  assert.ok(dist(rest.handN, up.handN) < 0.01, "hands do not leave the bar");
  assert.ok(up.kneeN[1] < rest.kneeN[1] - 15, "knees rise");
  assert.ok(Math.abs(up.kneeN[1] - up.hip[1]) < 14, "knees come up to about hip height or higher");
});

test("dead bug: opposite arm and leg reach out while the others stay up", () => {
  const start = solveAt("dead-bug", 0).joints;
  const end = solveAt("dead-bug", 1).joints;
  assert.ok(Math.abs(start.kneeN[0] - start.hip[0]) < 1.5 && start.kneeN[1] < start.hip[1] - 20, "tabletop: knees stacked over the hips");
  assert.ok(end.ankleN[0] - end.hip[0] > 45, "one leg reaches out long");
  assert.ok(end.shoulderF[0] - end.handF[0] > 35, "the opposite arm reaches overhead");
  assert.ok(end.handN[1] < end.shoulder[1] - 35, "the other arm stays pointing up");
});
