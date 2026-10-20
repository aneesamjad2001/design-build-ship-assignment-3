/** Stick-figure rig, forward kinematics and pose data for the exercise demos.
 *
 *  Everything is pure: a Pose is an anchor (one joint pinned to a point in the 240x160 drawing box)
 *  plus joint ANGLES in degrees; solvePose turns it into joint coordinates, bones and equipment
 *  shapes. Animation blends the angles (never the coordinates), so limbs keep their length.
 *  Each exercise has a start and an end keyframe, plus optional `via` keyframes in between for
 *  movements that keep a hand or foot planted (a straight blend would let it slide or sink).
 *
 *  Angle conventions, side view (the figure faces +x; `facing: -1` mirrors it):
 *    torso     lean from vertical, forward positive (-90 = lying on the back, head to the left)
 *    hip       hip flexion: thigh swung forward of the torso line (0 = standing straight)
 *    knee      knee flexion (the shin swings backward; 0 = straight)
 *    ankle     plantar-flexion in degrees (toes down +); "flat" = foot level; { world } = foot
 *              pointing along that compass direction (0 = down, 90 = forward, 180 = up)
 *    shoulder  arm swung forward of the torso line (0 = hanging along the torso)
 *    elbow     elbow flexion (the forearm swings forward and up; 0 = straight)
 *  Front view: hip and shoulder are abduction from straight down, elbow tucks the forearm down.
 *  Top view (bird's eye, facing up the page): shoulder is the arm's swing from straight ahead
 *  (90 = straight out to the side), elbow folds the forearm forward and inward.
 *  Far-side limbs are drawn dimmed and a few pixels back; `far` overrides their angles.
 *
 *  To add an exercise: add a `makeSet` entry to POSES and a sentence to FIGURE_ALT. lib/poses.test.ts
 *  checks every pose stays in frame, keeps rigid limbs, bends joints the right way and stays off the floor. */

export type Point = readonly [number, number];

export const VIEW_W = 240;
export const VIEW_H = 160;
/** y of the floor line. A flat foot's centre line sits half a stroke above it. */
export const FLOOR = 146;
export const STROKE = 7;

/** Segment lengths in viewBox units. */
export const RIG = {
  torso: 33,
  neck: 5,
  headR: 8.5,
  upperArm: 22,
  forearm: 22,
  thigh: 28,
  shin: 27,
  foot: 13,
} as const;

const FAR_OFFSET: Point = [-4, -2];
const FRONT_HIP_HALF = 5;
const FRONT_SHOULDER_HALF = 11;
const TOP_SHOULDER_HALF = 14;

export type JointName =
  | "hip"
  | "shoulder"
  | "neck"
  | "head"
  | "hipN"
  | "hipF"
  | "shoulderN"
  | "shoulderF"
  | "kneeN"
  | "ankleN"
  | "toeN"
  | "kneeF"
  | "ankleF"
  | "toeF"
  | "elbowN"
  | "handN"
  | "elbowF"
  | "handF";

export type Joints = Record<JointName, Point>;
export type Ankle = number | "flat" | { world: number };

export interface Limbs {
  hip: number;
  knee: number;
  ankle: Ankle;
  shoulder: number;
  elbow: number;
}

export type Tone = "field" | "line" | "text";
export type Layer = "back" | "front";

/** A drawable piece of equipment, in drawing-box units. `back` shapes sit behind the figure, `front` ones in front. */
export type Prim =
  | { kind: "line"; a: Point; b: Point; tone: Tone; width: number; layer: Layer }
  | { kind: "circle"; c: Point; r: number; tone: Tone; width: number; fill: boolean; layer: Layer };

/** Equipment for one pose, computed from the solved joints so it follows the hands and feet. */
export type Gear = (j: Joints) => Prim[];

export type View = "side" | "front" | "top";

export interface Pose extends Limbs {
  view: View;
  facing: 1 | -1;
  torso: number;
  /** head tilt relative to the torso, forward positive */
  head: number;
  /** overrides for the far-side limbs (default: same angles as the near side) */
  far?: Partial<Limbs>;
  /** which joint is pinned to which world point; the root is derived from it */
  anchor: { joint: JointName; at: Point };
  gear: Gear;
}

export interface PoseSet {
  view: View;
  start: Pose;
  end: Pose;
  /** optional extra keyframes between start and end, evenly spaced in time, for movements whose
   *  contacts (planted hands or feet) a straight blend of two poses would not hold, e.g. a push-up */
  via?: Pose[];
  /** seconds for one movement leg (default 1.5) */
  move?: number;
  /** y of the floor the figure must stay above (null: no floor, e.g. hanging) */
  floorY: number | null;
}

export interface Bone {
  from: JointName;
  to: JointName;
  side: "near" | "far" | "core";
  /** arm bones of the near side are drawn after the head, so they pass in front of it */
  arm?: true;
}

export interface Solved {
  joints: Joints;
  bones: Bone[];
  headR: number;
  /** width of the gap to leave in limbs that cross the head (0: none), so the head reads as a ball */
  headGap: number;
  equipment: Prim[];
}

const rad = (d: number) => (d * Math.PI) / 180;
/** Compass direction: 0 = down, 90 = +x, 180 = up (screen y grows downward). */
const dir = (a: number): Point => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: Point, v: Point, k = 1): Point => [p[0] + v[0] * k, p[1] + v[1] * k];
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/* ------------------------------------------------------------------ solving */

interface NumLimbs {
  hip: number;
  knee: number;
  ankle: number;
  shoulder: number;
  elbow: number;
}

function resolveLimbs(pose: Pose, l: Limbs): NumLimbs {
  // compass angle of the shin; a "flat" sole is simply a foot pointing straight forward (compass 90)
  const shin = l.hip - pose.torso - l.knee;
  const ankle = l.ankle === "flat" ? shin : typeof l.ankle === "number" ? l.ankle : shin + 90 - l.ankle.world;
  return { hip: l.hip, knee: l.knee, ankle, shoulder: l.shoulder, elbow: l.elbow };
}

function nearFar(pose: Pose): { near: NumLimbs; far: NumLimbs } {
  const base: Limbs = { hip: pose.hip, knee: pose.knee, ankle: pose.ankle, shoulder: pose.shoulder, elbow: pose.elbow };
  return { near: resolveLimbs(pose, base), far: resolveLimbs(pose, { ...base, ...pose.far }) };
}

/** Leg chain from the hip, unmirrored (figure facing +x). */
function leg(root: Point, torso: number, l: NumLimbs): [Point, Point, Point] {
  const thigh = l.hip - torso;
  const shin = thigh - l.knee;
  const foot = shin + 90 - l.ankle;
  const knee = add(root, dir(thigh), RIG.thigh);
  const ankle = add(knee, dir(shin), RIG.shin);
  const toe = add(ankle, dir(foot), RIG.foot);
  return [knee, ankle, toe];
}

/** Arm chain from the shoulder, unmirrored. */
function arm(shoulder: Point, torso: number, l: NumLimbs): [Point, Point] {
  const upper = l.shoulder - torso;
  const lower = upper + l.elbow;
  const elbow = add(shoulder, dir(upper), RIG.upperArm);
  const hand = add(elbow, dir(lower), RIG.forearm);
  return [elbow, hand];
}

function solveSide(pose: Pose): Joints {
  const sx = pose.facing;
  const root: Point = [0, 0];
  const mir = (p: Point): Point => [p[0] * sx, p[1]];
  const { near, far } = nearFar(pose);
  const t = pose.torso;
  const up: Point = [Math.sin(rad(t)), -Math.cos(rad(t))];
  const shoulderL = add(root, up, RIG.torso);
  const headDir: Point = [Math.sin(rad(t + pose.head)), -Math.cos(rad(t + pose.head))];
  const neckL = add(shoulderL, headDir, RIG.neck);
  const headL = add(neckL, headDir, RIG.headR);
  const [kneeN, ankleN, toeN] = leg(root, t, near);
  const [kneeF, ankleF, toeF] = leg(root, t, far);
  const [elbowN, handN] = arm(shoulderL, t, near);
  const [elbowF, handF] = arm(shoulderL, t, far);
  const off: Point = [FAR_OFFSET[0] * sx, FAR_OFFSET[1]];
  const back = (p: Point): Point => add(mir(p), off);
  return {
    hip: root,
    hipN: root,
    hipF: back(root),
    shoulder: mir(shoulderL),
    shoulderN: mir(shoulderL),
    shoulderF: back(shoulderL),
    neck: mir(neckL),
    head: mir(headL),
    kneeN: mir(kneeN),
    ankleN: mir(ankleN),
    toeN: mir(toeN),
    kneeF: back(kneeF),
    ankleF: back(ankleF),
    toeF: back(toeF),
    elbowN: mir(elbowN),
    handN: mir(handN),
    elbowF: back(elbowF),
    handF: back(handF),
  };
}

function solveFront(pose: Pose): Joints {
  const { near, far } = nearFar(pose);
  const root: Point = [0, 0];
  const t = pose.torso;
  const up: Point = [Math.sin(rad(t)), -Math.cos(rad(t))];
  const shoulder = add(root, up, RIG.torso);
  const headDir = up;
  const neck = add(shoulder, headDir, RIG.neck);
  const head = add(neck, headDir, RIG.headR);
  const hipN: Point = [FRONT_HIP_HALF, 0];
  const hipF: Point = [-FRONT_HIP_HALF, 0];
  const shN: Point = add(shoulder, [FRONT_SHOULDER_HALF, 0]);
  const shF: Point = add(shoulder, [-FRONT_SHOULDER_HALF, 0]);
  // legs: abduction `hip`, shin continues straight down-and-in by `knee`
  const legSide = (h: Point, l: NumLimbs, s: number): [Point, Point, Point] => {
    const thighA = l.hip;
    const shinA = l.hip - l.knee;
    const knee: Point = [h[0] + s * Math.sin(rad(thighA)) * RIG.thigh, h[1] + Math.cos(rad(thighA)) * RIG.thigh];
    const ankle: Point = [knee[0] + s * Math.sin(rad(shinA)) * RIG.shin, knee[1] + Math.cos(rad(shinA)) * RIG.shin];
    const toe: Point = [ankle[0] + s * RIG.foot, ankle[1]];
    return [knee, ankle, toe];
  };
  const armSide = (s0: Point, l: NumLimbs, s: number): [Point, Point] => {
    const elbow: Point = [s0[0] + s * Math.sin(rad(l.shoulder)) * RIG.upperArm, s0[1] + Math.cos(rad(l.shoulder)) * RIG.upperArm];
    const fa = l.shoulder - l.elbow;
    const hand: Point = [elbow[0] + s * Math.sin(rad(fa)) * RIG.forearm, elbow[1] + Math.cos(rad(fa)) * RIG.forearm];
    return [elbow, hand];
  };
  const [kneeN, ankleN, toeN] = legSide(hipN, near, 1);
  const [kneeF, ankleF, toeF] = legSide(hipF, far, -1);
  const [elbowN, handN] = armSide(shN, near, 1);
  const [elbowF, handF] = armSide(shF, far, -1);
  return { hip: root, hipN, hipF, shoulder, shoulderN: shN, shoulderF: shF, neck, head, kneeN, ankleN, toeN, kneeF, ankleF, toeF, elbowN, handN, elbowF, handF };
}

/** Bird's-eye view of a person facing up the screen. The root is the shoulder centre; `shoulder` is the
 *  arm's horizontal swing from straight forward (90 = straight out to the side, >90 = behind the body)
 *  and `elbow` folds the forearm forward and inward. Legs are hidden under the body. */
function solveTop(pose: Pose): Joints {
  const { near, far } = nearFar(pose);
  const root: Point = [0, 0];
  const shN: Point = [TOP_SHOULDER_HALF, 0];
  const shF: Point = [-TOP_SHOULDER_HALF, 0];
  const neck: Point = [0, -RIG.neck];
  const head: Point = [0, -RIG.neck - RIG.headR];
  const armSide = (s0: Point, l: NumLimbs, sgn: number): [Point, Point] => {
    const elbow: Point = [s0[0] + sgn * Math.sin(rad(l.shoulder)) * RIG.upperArm, s0[1] - Math.cos(rad(l.shoulder)) * RIG.upperArm];
    const fa = l.shoulder - l.elbow;
    const hand: Point = [elbow[0] + sgn * Math.sin(rad(fa)) * RIG.forearm, elbow[1] - Math.cos(rad(fa)) * RIG.forearm];
    return [elbow, hand];
  };
  const [elbowN, handN] = armSide(shN, near, 1);
  const [elbowF, handF] = armSide(shF, far, -1);
  const body: Point = [0, 10];
  return {
    hip: body, hipN: body, hipF: body, shoulder: root, shoulderN: shN, shoulderF: shF, neck, head,
    kneeN: body, ankleN: body, toeN: body, kneeF: body, ankleF: body, toeF: body,
    elbowN, handN, elbowF, handF,
  };
}

const TOP_BONES: Bone[] = [
  { from: "shoulderF", to: "shoulderN", side: "core" },
  { from: "shoulder", to: "neck", side: "core" },
  { from: "shoulderN", to: "elbowN", side: "near", arm: true },
  { from: "elbowN", to: "handN", side: "near", arm: true },
  { from: "shoulderF", to: "elbowF", side: "near", arm: true },
  { from: "elbowF", to: "handF", side: "near", arm: true },
];

const SIDE_BONES: Bone[] = [
  { from: "hipF", to: "kneeF", side: "far" },
  { from: "kneeF", to: "ankleF", side: "far" },
  { from: "ankleF", to: "toeF", side: "far" },
  { from: "shoulderF", to: "elbowF", side: "far" },
  { from: "elbowF", to: "handF", side: "far" },
  { from: "hip", to: "shoulder", side: "core" },
  { from: "shoulder", to: "neck", side: "core" },
  { from: "hipN", to: "kneeN", side: "near" },
  { from: "kneeN", to: "ankleN", side: "near" },
  { from: "ankleN", to: "toeN", side: "near" },
  { from: "shoulderN", to: "elbowN", side: "near", arm: true },
  { from: "elbowN", to: "handN", side: "near", arm: true },
];

const FRONT_BONES: Bone[] = [
  { from: "hip", to: "shoulder", side: "core" },
  { from: "shoulder", to: "neck", side: "core" },
  { from: "hipF", to: "hipN", side: "core" },
  { from: "shoulderF", to: "shoulderN", side: "core" },
  { from: "hipN", to: "kneeN", side: "near" },
  { from: "kneeN", to: "ankleN", side: "near" },
  { from: "ankleN", to: "toeN", side: "near" },
  { from: "hipF", to: "kneeF", side: "near" },
  { from: "kneeF", to: "ankleF", side: "near" },
  { from: "ankleF", to: "toeF", side: "near" },
  { from: "shoulderN", to: "elbowN", side: "near", arm: true },
  { from: "elbowN", to: "handN", side: "near", arm: true },
  { from: "shoulderF", to: "elbowF", side: "near", arm: true },
  { from: "elbowF", to: "handF", side: "near", arm: true },
];

/** Pure: pose in, world-space joints / bones / equipment out. */
export function solvePose(pose: Pose): Solved {
  const local = pose.view === "front" ? solveFront(pose) : pose.view === "top" ? solveTop(pose) : solveSide(pose);
  const pin = local[pose.anchor.joint];
  const dx = pose.anchor.at[0] - pin[0];
  const dy = pose.anchor.at[1] - pin[1];
  const joints = {} as Joints;
  (Object.keys(local) as JointName[]).forEach((k) => {
    joints[k] = [local[k][0] + dx, local[k][1] + dy];
  });
  return {
    joints,
    bones: pose.view === "front" ? FRONT_BONES : pose.view === "top" ? TOP_BONES : SIDE_BONES,
    headR: RIG.headR,
    headGap: pose.view === "side" ? 2.8 : 0,
    equipment: pose.gear(joints),
  };
}

/* ------------------------------------------------------------ interpolation */

export function easeInOut(u: number): number {
  const x = Math.min(1, Math.max(0, u));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Blend two keyframes by interpolating angles and the anchor point (t: 0..1). */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const na = nearFar(a);
  const nb = nearFar(b);
  const mix = (x: NumLimbs, y: NumLimbs): NumLimbs => ({
    hip: lerp(x.hip, y.hip, t),
    knee: lerp(x.knee, y.knee, t),
    ankle: lerp(x.ankle, y.ankle, t),
    shoulder: lerp(x.shoulder, y.shoulder, t),
    elbow: lerp(x.elbow, y.elbow, t),
  });
  const near = mix(na.near, nb.near);
  const far = mix(na.far, nb.far);
  return {
    view: a.view,
    facing: a.facing,
    torso: lerp(a.torso, b.torso, t),
    head: lerp(a.head, b.head, t),
    ...near,
    far,
    anchor: { joint: a.anchor.joint, at: [lerp(a.anchor.at[0], b.anchor.at[0], t), lerp(a.anchor.at[1], b.anchor.at[1], t)] },
    gear: a.gear,
  };
}

/** Pose at progress t (0 = start, 1 = end), blending between neighbouring keyframes. */
export function poseAt(set: PoseSet, t: number): Pose {
  const keys = keyframes(set);
  const x = Math.min(1, Math.max(0, t)) * (keys.length - 1);
  const i = Math.min(keys.length - 2, Math.floor(x));
  return lerpPose(keys[i], keys[i + 1], x - i);
}

export function keyframes(set: PoseSet): Pose[] {
  return [set.start, ...(set.via ?? []), set.end];
}

/* ------------------------------------------------------------ gear builders */

const line = (a: Point, b: Point, tone: Tone = "field", width = 3, layer: Layer = "back"): Prim => ({ kind: "line", a, b, tone, width, layer });
const ring = (c: Point, r: number, tone: Tone = "text", width = 3.5, layer: Layer = "front"): Prim => ({ kind: "circle", c, r, tone, width, fill: false, layer });
const dot = (c: Point, r: number, tone: Tone = "field", layer: Layer = "back"): Prim => ({ kind: "circle", c, r, tone, width: 0, fill: true, layer });

const floorLine = (y = FLOOR, x1 = 10, x2 = 230): Prim => line([x1, y], [x2, y], "line", 2);
const pad = (a: Point, b: Point, w = 7, layer: Layer = "back"): Prim => line(a, b, "field", w, layer);
/** dumbbell seen end-on (handle points at the camera) */
const plate = (c: Point): Prim => ring(c, 5.5, "text", 4);
/** dumbbell seen from the side, handle along compass angle `a` */
function dumbbell(c: Point, a: number): Prim[] {
  const d = dir(a);
  const n: Point = [d[1], -d[0]];
  const plateAt = (k: number): Prim => line(add(add(c, d, k), n, -8), add(add(c, d, k), n, 8), "text", 5.5, "front");
  return [line(add(c, d, -8), add(c, d, 8), "text", 3.4, "front"), plateAt(-8.5), plateAt(8.5)];
}
const bench = (x1: number, x2: number, y: number): Prim[] => [
  pad([x1, y], [x2, y], 8),
  line([x1 + 10, y + 4], [x1 + 10, FLOOR], "field", 3),
  line([x2 - 10, y + 4], [x2 - 10, FLOOR], "field", 3),
];
const cable = (a: Point, b: Point, layer: Layer = "back"): Prim[] => [line(a, b, "field", 1.6, layer), dot(a, 3.2, "field", layer)];

/* ----------------------------------------------------------------- builders */

interface Shared {
  view?: View;
  facing?: 1 | -1;
  joint: JointName;
  gear: Gear;
  move?: number;
  floorY?: number | null;
}
interface Key {
  at: Point;
  torso: number;
  hip: number;
  knee: number;
  ankle?: Ankle;
  shoulder: number;
  elbow: number;
  head?: number;
  far?: Partial<Limbs>;
}

function makeSet(s: Shared, a: Key, b: Key, ...vias: Key[]): PoseSet {
  const frame = (k: Key): Pose => ({
    view: s.view ?? "side",
    facing: s.facing ?? 1,
    torso: k.torso,
    head: k.head ?? 0,
    hip: k.hip,
    knee: k.knee,
    ankle: k.ankle ?? "flat",
    shoulder: k.shoulder,
    elbow: k.elbow,
    far: k.far,
    anchor: { joint: s.joint, at: k.at },
    gear: s.gear,
  });
  return {
    view: s.view ?? "side",
    start: frame(a),
    end: frame(b),
    via: vias.length ? vias.map(frame) : undefined,
    move: s.move,
    floorY: s.floorY === undefined ? FLOOR : s.floorY,
  };
}

const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
const unit = (v: Point): Point => {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
};
/** the side of a right-facing limb/torso that points away from the body's front */
const backOf = (d: Point): Point => [d[1], -d[0]];
/** the sole side of a right-facing foot with direction f */
const soleOf = (f: Point): Point => [-f[1], f[0]];

/* ------------------------------------------------------------------- legs */

const legPressGear: Gear = (j) => {
  const d = unit(sub(j.shoulder, j.hip));
  const nb = backOf(d);
  const f = unit(sub(j.toeN, j.ankleN));
  const n = soleOf(f);
  const c = add(add(j.ankleN, f, 6), n, 7);
  return [
    floorLine(),
    pad(add(j.hip, [-16, 8]), add(j.hip, [12, 8]), 9),
    pad(add(j.hip, nb, 8), add(add(j.hip, nb, 8), d, 50), 9),
    line(add(j.hip, [-4, 12]), [j.hip[0] - 10, FLOOR], "field", 4),
    line(add(j.hip, [-4, 12]), [j.hip[0] + 22, FLOOR], "field", 4),
    line(add(c, f, -22), add(c, f, 22), "field", 6),
    line(add(add(c, n, 8), f, -16), add(add(c, n, 8), f, 16), "line", 5),
    line(add(add(c, n, 15), f, -12), add(add(c, n, 15), f, 12), "line", 5),
  ];
};

const hipThrustGear: Gear = (j) => [floorLine(), ...bench(j.shoulder[0] - 34, j.shoulder[0] + 6, 123), plate(j.handN)];

const legCurlGear: Gear = (j) => {
  const lever = unit(sub(j.ankleN, j.kneeN));
  const roller = add(j.ankleN, backOf(lever), -5);
  return [
    floorLine(),
    pad([j.hip[0] - 36, j.hip[1] + 8], [j.shoulder[0] + 14, j.hip[1] + 8], 9),
    line([j.hip[0] - 30, j.hip[1] + 12], [j.hip[0] - 30, FLOOR], "field", 3),
    line([j.shoulder[0], j.hip[1] + 12], [j.shoulder[0], FLOOR], "field", 3),
    line(j.kneeN, roller, "field", 3),
    ring(roller, 5, "field", 4, "front"),
  ];
};

const legExtensionGear: Gear = (j) => {
  const d = unit(sub(j.shoulder, j.hip));
  const nb = backOf(d);
  const lever = unit(sub(j.ankleN, j.kneeN));
  const roller = add(j.ankleN, [lever[1], -lever[0]], 5);
  return [
    floorLine(),
    pad(add(j.hip, [-18, 8]), add(j.hip, [14, 8]), 9),
    pad(add(j.hip, nb, 8), add(add(j.hip, nb, 8), d, 46), 9),
    line([j.hip[0] - 4, j.hip[1] + 12], [j.hip[0] - 4, FLOOR], "field", 4),
    line(add(j.kneeN, [0, 6]), roller, "field", 3),
    ring(roller, 5, "field", 4, "front"),
  ];
};

/* -------------------------------------------------------------- upper body */

const benchPressGear: Gear = (j) => [floorLine(), ...bench(58, 160, 123), plate(j.handN)];

const inclinePressGear: Gear = (j) => {
  const d = unit(sub(j.shoulder, j.hip));
  const nb = backOf(d);
  const top = add(add(j.hip, nb, 8), d, 64);
  return [
    floorLine(),
    pad(add(j.hip, [-14, 8]), add(j.hip, [28, 8]), 9),
    pad(add(j.hip, nb, 8), top, 9),
    line(add(j.hip, [8, 12]), [j.hip[0] + 8, FLOOR], "field", 4),
    line(add(add(j.hip, nb, 8), d, 26), [j.hip[0] - 28, FLOOR], "field", 4),
    plate(j.handN),
  ];
};

const shoulderPressGear: Gear = (j) => {
  const d = unit(sub(j.shoulder, j.hip));
  const nb = backOf(d);
  const top = add(add(j.hip, nb, 8), d, 60);
  return [
    floorLine(),
    pad(add(j.hip, [-12, 8]), add(j.hip, [24, 8]), 9),
    pad(add(j.hip, nb, 8), top, 9),
    line(add(j.hip, [4, 12]), [j.hip[0] + 4, FLOOR], "field", 4),
    plate(j.handN),
  ];
};

const pushdownGear: Gear = (j) => [
  floorLine(),
  line([168, FLOOR], [168, 16], "field", 5),
  line([168, 16], [120, 16], "field", 4),
  ...cable([120, 16], j.handN),
  dot(j.handN, 4.5, "text", "front"),
];

/* ---------------------------------------------------------- pulling, curls, core */

const latPulldownGear: Gear = (j) => [
  floorLine(),
  pad(add(j.hip, [-12, 8]), add(j.hip, [22, 8]), 9),
  line(add(j.hip, [4, 12]), [j.hip[0] + 4, FLOOR], "field", 4),
  line([158, FLOOR], [158, 14], "field", 5),
  line([158, 14], [110, 14], "field", 4),
  ...cable([110, 14], j.handN),
  dot(add(j.hip, [26, -11]), 6.5, "field"),
  line(add(j.hip, [26, -11]), [158, 64], "field", 3),
  line(add(j.handN, [-10, 0]), add(j.handN, [10, 0]), "text", 3.5, "front"),
];

const cableRowGear: Gear = (j) => [
  floorLine(),
  pad(add(j.hip, [-14, 8]), add(j.hip, [6, 8]), 9),
  line(add(j.hip, [-4, 12]), [j.hip[0] - 4, FLOOR], "field", 4),
  line([j.ankleN[0] + 6, 108], [j.ankleN[0] + 6, FLOOR], "field", 5),
  line([212, FLOOR], [212, 100], "field", 5),
  ...cable([212, 124], j.handN),
  dot(j.handN, 4.5, "text", "front"),
];

const oneArmRowGear: Gear = (j) => [floorLine(), ...bench(60, 182, 123), ...dumbbell(j.handN, 90)];

const hammerGear: Gear = (j) => {
  const a = (Math.atan2(j.handN[0] - j.elbowN[0], j.handN[1] - j.elbowN[1]) * 180) / Math.PI;
  return [floorLine(), ...dumbbell(j.handN, a + 90)];
};

const hangingGear: Gear = () => [
  line([68, 11], [168, 11], "field", 4),
  line([68, 11], [68, 154], "field", 4),
  line([168, 11], [168, 154], "field", 4),
];

const cableCrunchGear: Gear = (j) => [
  floorLine(),
  line([206, FLOOR], [206, 18], "field", 5),
  line([206, 18], [150, 18], "field", 4),
  ...cable([150, 18], j.handN),
  dot(j.handN, 4.5, "text", "front"),
];

const facePullGear: Gear = (j) => [
  line([84, 12], [156, 12], "field", 5),
  ...cable([120, 12], j.handN),
  ...cable([120, 12], j.handF),
  dot(j.handN, 3.6, "text", "front"),
  dot(j.handF, 3.6, "text", "front"),
];

/** treadmill belt rising to the right at 10 degrees; y of its top surface at x */
const beltTop = (x: number) => 134 - Math.tan((10 * Math.PI) / 180) * (x - 30);
const treadmillGear: Gear = () => [
  floorLine(),
  line([22, beltTop(22) + 3], [204, beltTop(204) + 3], "field", 6),
  line([30, beltTop(30) + 10], [196, beltTop(196) + 10], "line", 3),
  line([36, beltTop(36) + 10], [30, FLOOR], "field", 3),
  line([190, beltTop(190) + 10], [196, FLOOR], "field", 3),
  line([204, beltTop(204) + 3], [204, 50], "field", 5),
  line([188, 50], [218, 50], "field", 5),
];

export const POSES: Record<string, PoseSet> = {
  "goblet-squat": makeSet(
    { joint: "ankleN", gear: (j) => [floorLine(), ...dumbbell([j.handN[0] + 4, j.handN[1] + 9], 180)] },
    { at: [112, 142.5], torso: 3, hip: 3, knee: 3, shoulder: 18, elbow: 135 },
    { at: [112, 142.5], torso: 20, hip: 115, knee: 123, shoulder: 35, elbow: 135 },
  ),
  "leg-press": makeSet(
    { joint: "hip", gear: legPressGear },
    { at: [115, 110], torso: -45, hip: 120, knee: 95, ankle: -25, shoulder: -14, elbow: 63, head: 18 },
    { at: [115, 110], torso: -45, hip: 75, knee: 8, ankle: 5, shoulder: -14, elbow: 63, head: 18 },
  ),
  "romanian-deadlift": makeSet(
    { joint: "ankleN", gear: (j) => [floorLine(), plate(j.handN), plate(j.handF)] },
    { at: [112, 142.5], torso: 0, hip: 0, knee: 4, shoulder: 10, elbow: 5 },
    { at: [112, 142.5], torso: 70, hip: 80, knee: 22, shoulder: 48, elbow: 5 },
  ),
  "hip-thrust": makeSet(
    { joint: "shoulder", gear: hipThrustGear },
    { at: [82, 115.5], torso: -64, hip: 55, knee: 104, shoulder: -6, elbow: 49, head: 20 },
    { at: [82, 115.5], torso: -90, hip: 0, knee: 90, shoulder: 15, elbow: 0, head: 20 },
  ),
  "split-squat": makeSet(
    { joint: "ankleN", gear: (j) => [floorLine(), plate(j.handN)] },
    { at: [138, 142.5], torso: 4, hip: 32, knee: 20, shoulder: 12, elbow: 5, far: { hip: -20.7, knee: 27.7, ankle: { world: -16.8 } } },
    { at: [138, 142.5], torso: 4, hip: 84, knee: 105, shoulder: 12, elbow: 5, far: { hip: -12, knee: 89, ankle: { world: -16.8 } } },
    { at: [138, 142.5], torso: 4, hip: 62.8, knee: 74.5, shoulder: 12, elbow: 5, far: { hip: -9.8, knee: 68.1, ankle: { world: -16.8 } } },
  ),
  "leg-curl": makeSet(
    { joint: "hip", gear: legCurlGear },
    { at: [150, 108], torso: 90, hip: 0, knee: 8, ankle: 0, shoulder: 170, elbow: 10 },
    { at: [150, 108], torso: 90, hip: 0, knee: 105, ankle: 0, shoulder: 170, elbow: 10 },
  ),
  "leg-extension": makeSet(
    { joint: "hip", gear: legExtensionGear },
    { at: [95, 105], torso: -8, hip: 82, knee: 98, ankle: 0, shoulder: 12, elbow: 50 },
    { at: [95, 105], torso: -8, hip: 82, knee: 3, ankle: 0, shoulder: 12, elbow: 50 },
  ),
  "dumbbell-bench-press": makeSet(
    { joint: "hip", gear: benchPressGear },
    { at: [138, 115.5], torso: -90, hip: 0, knee: 90, shoulder: -55, elbow: 143, head: 20 },
    { at: [138, 115.5], torso: -90, hip: 0, knee: 90, shoulder: 90, elbow: 3, head: 20 },
  ),
  "incline-dumbbell-press": makeSet(
    { joint: "hip", gear: inclinePressGear },
    { at: [112, 115.5], torso: -50, hip: 40, knee: 90, shoulder: -20, elbow: 146, head: 20 },
    { at: [112, 115.5], torso: -50, hip: 40, knee: 90, shoulder: 122, elbow: 4, head: 20 },
  ),
  "push-up": makeSet(
    { joint: "toeN", gear: () => [floorLine()] },
    { at: [72, 142.5], torso: 68.7, hip: 0, knee: 0, ankle: 0, shoulder: 68.7, elbow: 0 },
    { at: [72, 142.5], torso: 84, hip: 0, knee: 0, ankle: 0, shoulder: 5, elbow: 114.4 },
    { at: [72, 142.5], torso: 72.5, hip: 0, knee: 0, ankle: 0, shoulder: 40.8, elbow: 55.4 },
    { at: [72, 142.5], torso: 76.35, hip: 0, knee: 0, ankle: 0, shoulder: 27.8, elbow: 79.6 },
    { at: [72, 142.5], torso: 80.2, hip: 0, knee: 0, ankle: 0, shoulder: 16.4, elbow: 98.5 },
  ),
  "dumbbell-shoulder-press": makeSet(
    { joint: "hip", gear: shoulderPressGear },
    { at: [110, 115.5], torso: -5, hip: 85, knee: 90, shoulder: 25, elbow: 145, head: 10 },
    { at: [110, 115.5], torso: -5, hip: 85, knee: 90, shoulder: 173, elbow: 4, head: 10 },
  ),
  "lateral-raise": makeSet(
    { view: "front", joint: "hip", gear: (j) => [floorLine(), plate(j.handN), plate(j.handF)] },
    { at: [120, 87.7], torso: 0, hip: 5, knee: 0, shoulder: 8, elbow: 8 },
    { at: [120, 87.7], torso: 0, hip: 5, knee: 0, shoulder: 88, elbow: 8 },
  ),
  "triceps-pushdown": makeSet(
    { joint: "ankleN", gear: pushdownGear },
    { at: [100, 142.5], torso: 8, hip: 8, knee: 6, shoulder: 8, elbow: 90 },
    { at: [100, 142.5], torso: 8, hip: 8, knee: 6, shoulder: 13, elbow: 0 },
  ),
  "lat-pulldown": makeSet(
    { joint: "hip", gear: latPulldownGear },
    { at: [105, 115.5], torso: -8, hip: 82, knee: 90, shoulder: 160, elbow: 4 },
    { at: [105, 115.5], torso: -18, hip: 72, knee: 90, shoulder: -13, elbow: 145 },
  ),
  "seated-cable-row": makeSet(
    { joint: "hip", gear: cableRowGear },
    { at: [76, 128], torso: 12, hip: 112, knee: 40, ankle: { world: 180 }, shoulder: 104, elbow: 0 },
    { at: [76, 128], torso: -5, hip: 95, knee: 40, ankle: { world: 180 }, shoulder: -40, elbow: 115 },
  ),
  "one-arm-dumbbell-row": makeSet(
    { joint: "hip", gear: oneArmRowGear },
    { at: [105, 91.9], torso: 78, hip: 88.4, knee: 41.7, shoulder: 83, elbow: 3, far: { hip: 70, knee: 82, ankle: { world: -90 }, shoulder: 123, elbow: 0 } },
    { at: [105, 91.9], torso: 78, hip: 88.4, knee: 41.7, shoulder: -22, elbow: 100, far: { hip: 70, knee: 82, ankle: { world: -90 }, shoulder: 123, elbow: 0 } },
  ),
  "dumbbell-curl": makeSet(
    { joint: "ankleN", gear: (j) => [floorLine(), plate(j.handN)] },
    { at: [112, 142.5], torso: 0, hip: 0, knee: 3, shoulder: 8, elbow: 2 },
    { at: [112, 142.5], torso: 0, hip: 0, knee: 3, shoulder: 5, elbow: 145 },
  ),
  "hammer-curl": makeSet(
    { joint: "ankleN", gear: hammerGear },
    { at: [112, 142.5], torso: 0, hip: 0, knee: 3, shoulder: 8, elbow: 2 },
    { at: [112, 142.5], torso: 0, hip: 0, knee: 3, shoulder: 5, elbow: 145 },
  ),
  "dead-bug": makeSet(
    { joint: "hip", gear: () => [line([20, 148], [220, 148], "field", 4)] },
    { at: [120, 142.5], torso: -90, hip: 90, knee: 90, ankle: 0, shoulder: 90, elbow: 0, head: 24 },
    { at: [120, 142.5], torso: -90, hip: 10.5, knee: 3, ankle: 0, shoulder: 90, elbow: 0, head: 24, far: { hip: 90, knee: 90, shoulder: 172, elbow: 0 } },
  ),
  "hanging-knee-raise": makeSet(
    { joint: "handN", gear: hangingGear, floorY: null },
    { at: [118, 11], torso: 2, hip: 2, knee: 4, ankle: 45, shoulder: 174, elbow: 0, head: 50 },
    { at: [118, 11], torso: -8, hip: 100, knee: 100, ankle: 45, shoulder: 164, elbow: 0, head: 50 },
  ),
  "cable-crunch": makeSet(
    { joint: "kneeN", gear: cableCrunchGear },
    { at: [118, 142.5], torso: 6, hip: 6, knee: 90, ankle: 90, shoulder: 93, elbow: 132 },
    { at: [118, 142.5], torso: 62, hip: 62, knee: 90, ankle: 90, shoulder: 93, elbow: 132, head: 25 },
  ),
  "face-pull": makeSet(
    { view: "top", joint: "shoulder", gear: facePullGear, floorY: null },
    { at: [120, 112], torso: 0, hip: 0, knee: 0, shoulder: -9, elbow: 0 },
    { at: [120, 112], torso: 0, hip: 0, knee: 0, shoulder: 100, elbow: 148 },
  ),
  "incline-walk": makeSet(
    { joint: "hip", gear: treadmillGear, floorY: null },
    { at: [108, 63], torso: 8, hip: 40.2, knee: 19.2, ankle: { world: 100 }, shoulder: -22, elbow: 65, far: { hip: -17, knee: 11.8, ankle: { world: 40 }, shoulder: 28, elbow: 65 } },
    { at: [108, 63], torso: 8, hip: -17, knee: 11.8, ankle: { world: 40 }, shoulder: 28, elbow: 65, far: { hip: 40.2, knee: 19.2, ankle: { world: 100 }, shoulder: -22, elbow: 65 } },
    { at: [108, 63], torso: 8, hip: 10, knee: 20, ankle: { world: 98.7 }, shoulder: 3, elbow: 65, far: { hip: 10, knee: 22, ankle: { world: 98.7 }, shoulder: 3, elbow: 65 } },
  ),
  "plank": makeSet(
    { joint: "elbowN", gear: () => [floorLine()], move: 2.4 },
    { at: [150, 142.5], torso: 84, hip: 0, knee: 0, ankle: 0, shoulder: 84, elbow: 90, head: 0 },
    { at: [150, 142.5], torso: 87, hip: 4.7, knee: 0.5, ankle: 1.7, shoulder: 87, elbow: 90, head: 8 },
  ),
  "calf-raise": makeSet(
    { joint: "toeN", gear: (j) => [floorLine(), pad([118, 142], [164, 142], 8), plate(j.handN)] },
    { at: [126, 134.5], torso: 0, hip: 0, knee: 3, ankle: -16, shoulder: 8, elbow: 6 },
    { at: [126, 134.5], torso: 0, hip: 0, knee: 3, ankle: 48, shoulder: 8, elbow: 6 },
  ),
};

export const FIGURE_ALT: Record<string, string> = {
  "goblet-squat": "Side view: lower into a squat holding a dumbbell at your chest, then stand back up.",
  "leg-press": "Side view: sitting back on the machine, bend your knees to bring the platform toward you, then press it away until your legs are almost straight.",
  "romanian-deadlift": "Side view: holding a dumbbell in each hand, push your hips back and slide the weights down your legs with a flat back, then drive your hips forward to stand tall.",
  "hip-thrust": "Side view: with your upper back on a bench and your feet flat, drive your hips up until your shoulders, hips and knees line up, then lower them back down.",
  "split-squat": "Side view: in a long stance, bend both knees to lower your back knee toward the floor, then press back up.",
  "leg-curl": "Side view: lying face down on the machine, bend your knees to curl your heels toward your glutes, then lower them slowly.",
  "leg-extension": "Side view: seated on the machine, straighten your knees to lift the pad, then lower it slowly.",
  "calf-raise": "Side view: standing on a step with your heels hanging off, rise up high onto your toes, then lower your heels below the step.",
  "dumbbell-bench-press": "Side view: lying on a bench, lower a dumbbell in each hand to your chest, then press them straight up.",
  "incline-dumbbell-press": "Side view: sitting back on an inclined bench, lower the dumbbells to your upper chest, then press them straight up.",
  "push-up": "Side view: keeping your body in one straight line, lower your chest toward the floor by bending your elbows, then push back up.",
  "dumbbell-shoulder-press": "Side view: seated with your back supported, press a dumbbell in each hand from your shoulders to straight overhead, then lower them back.",
  "lateral-raise": "Front view: with a dumbbell in each hand, raise your arms out to the sides up to shoulder height, then lower them slowly.",
  "triceps-pushdown": "Side view: with your elbows pinned to your sides, push the cable handle down until your arms are straight, then let it rise back up.",
  "lat-pulldown": "Side view: seated with your thighs under the pad, pull the bar down to your upper chest by driving your elbows down, then let it rise back up.",
  "seated-cable-row": "Side view: seated with your feet on the plate, pull the handle to your stomach and squeeze your shoulder blades together, then reach forward again.",
  "one-arm-dumbbell-row": "Side view: with one hand and one knee on a bench, pull the dumbbell up toward your hip while keeping your back flat, then lower it.",
  "face-pull": "Top-down view: pull the rope toward your face with your elbows high and wide, then straighten your arms back out in front of you.",
  "dumbbell-curl": "Side view: keeping your elbows by your sides, curl the dumbbells up to your shoulders, then lower them slowly.",
  "hammer-curl": "Side view: holding the dumbbells with your palms facing each other, curl them up to your shoulders, then lower them slowly.",
  "plank": "Side view: resting on your forearms and toes, hold your body in one straight line from head to heels while you breathe steadily.",
  "dead-bug": "Side view: lying on your back with your arms up and your knees bent over your hips, lower one arm overhead and the opposite leg out straight, then bring them back.",
  "hanging-knee-raise": "Side view: hanging from a bar, lift your knees up toward your chest, then lower your legs back down without swinging.",
  "cable-crunch": "Side view: kneeling with the rope held at your head, curl your chest down toward your knees, then rise back up.",
  "incline-walk": "Side view: walk at a steady pace on a treadmill set to an incline, standing tall and swinging your arms.",
};
