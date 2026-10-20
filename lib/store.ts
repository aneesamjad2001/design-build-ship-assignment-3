"use client";

/**
 * Browser storage as a small external store. Reads are validated (see data.ts),
 * writes fall back to memory if the browser blocks storage, and other tabs stay in
 * sync through the `storage` event. Nothing leaves the device.
 *
 * What is stored is never rewritten when the unit changes: every workout, weight
 * and check-in keeps the unit it was entered in, and is converted for display only.
 */

import { useSyncExternalStore } from "react";
import { buildBackup } from "./backup";
import { checkinsIn } from "./checkin";
import type { Checkin } from "./checkin";
import { todayString } from "./dates";
import { EMPTY_DATA, STORAGE_KEY, parseData, serialize, weightsIn, workoutsIn } from "./data";
import type { Data, Profile } from "./data";
import { updateBook } from "./adapt";
import type { CompletedWorkout, Unit } from "./adapt";
import type { LookId } from "./looks";
import type { NutritionProfile } from "./nutrition";
import type { TimeOption } from "./workouts";

export interface Snapshot {
  /** false until the browser has been read (server render and first paint) */
  ready: boolean;
  /** what the app shows: weights and measurements converted to the profile's unit */
  data: Data;
  recovered: boolean;
  /** false when the browser refused to save, so data lives only in this tab */
  persistent: boolean;
}

const LOADING: Snapshot = { ready: false, data: EMPTY_DATA, recovered: false, persistent: true };

let writeFailed = false;
let memoryRaw: string | null = null;
let cacheRaw: string | null | undefined;
let cache: Snapshot = LOADING;
/** what is actually stored */
let cacheStored: Data = EMPTY_DATA;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  if (writeFailed) return memoryRaw;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    writeFailed = true;
    return memoryRaw;
  }
}

function getSnapshot(): Snapshot {
  const raw = readRaw();
  if (raw === cacheRaw && cache.ready) return cache;
  cacheRaw = raw;
  const { data, recovered } = parseData(raw);
  cacheStored = data;
  const unit = data.profile?.unit;
  const shown: Data = unit
    ? { ...data, workouts: workoutsIn(data.workouts, unit), weights: weightsIn(data.weights, unit), checkins: checkinsIn(data.checkins, unit) }
    : data;
  cache = { ready: true, data: shown, recovered, persistent: !writeFailed };
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function commit(data: Data) {
  const raw = serialize(data);
  memoryRaw = raw;
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
    writeFailed = false;
  } catch {
    writeFailed = true;
  }
  emit();
}

/** The stored data, for writing back. Never the converted view. */
const current = (): Data => {
  getSnapshot();
  return cacheStored;
};

export function useIronlog(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** First pick creates the profile; later picks just change the look. */
export function chooseLook(lookId: LookId) {
  const d = current();
  const profile: Profile = d.profile ? { ...d.profile, lookId } : { lookId, time: "standard", unit: "lb", createdAt: Date.now() };
  commit({ ...d, profile });
}

export function updateProfile(patch: Partial<Pick<Profile, "time" | "unit">>) {
  const d = current();
  if (!d.profile) return;
  commit({ ...d, profile: { ...d.profile, ...patch } });
}

export function setTime(time: TimeOption) {
  updateProfile({ time });
}

export function setUnit(unit: Unit) {
  updateProfile({ unit });
}

/** Save a finished workout and fold its weights and feedback into the memory. */
export function saveWorkout(w: Omit<CompletedWorkout, "id" | "createdAt" | "unit">): CompletedWorkout {
  const d = current();
  const unit = d.profile?.unit ?? "lb";
  const workout: CompletedWorkout = { ...w, id: newId(), createdAt: Date.now(), unit };
  commit({ ...d, workouts: [...d.workouts, workout], weights: updateBook(d.weights, workout) });
  return workout;
}

/** Remove a workout and hand back exactly what was stored, so it can be restored. */
export function deleteWorkout(id: string): CompletedWorkout | null {
  const d = current();
  const removed = d.workouts.find((w) => w.id === id) ?? null;
  commit({ ...d, workouts: d.workouts.filter((w) => w.id !== id) });
  return removed;
}

export function restoreWorkout(w: CompletedWorkout) {
  const d = current();
  if (d.workouts.some((x) => x.id === w.id)) return;
  commit({ ...d, workouts: [...d.workouts, w] });
}

export function addCheckin(values: Omit<Checkin, "id" | "createdAt" | "unit">): Checkin {
  const d = current();
  const c: Checkin = { ...values, id: newId(), createdAt: Date.now(), unit: d.profile?.unit ?? "lb" };
  commit({ ...d, checkins: [...d.checkins, c] });
  return c;
}

export function deleteCheckin(id: string): Checkin | null {
  const d = current();
  const removed = d.checkins.find((c) => c.id === id) ?? null;
  commit({ ...d, checkins: d.checkins.filter((c) => c.id !== id) });
  return removed;
}

export function restoreCheckin(c: Checkin) {
  const d = current();
  if (d.checkins.some((x) => x.id === c.id)) return;
  commit({ ...d, checkins: [...d.checkins, c] });
}

export function saveNutrition(profile: NutritionProfile | null) {
  const d = current();
  commit({ ...d, nutrition: profile });
}

export function resetAll() {
  memoryRaw = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem("ironlog:workout:v2");
  } catch {
    writeFailed = true;
  }
  emit();
}

/** The stored data as a downloadable backup (weights in the unit each was entered in). */
export function exportBackup(): string {
  return buildBackup(current());
}

/** Replace everything on this device with a validated backup. */
export function restoreFromBackup(data: Data) {
  commit(data);
}

/* "Today" that stays right when a tab is left open, including past midnight. */
function subscribeToday(cb: () => void): () => void {
  const onVisible = () => document.visibilityState === "visible" && cb();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", cb);
  let timer: ReturnType<typeof setTimeout>;
  const schedule = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    timer = setTimeout(() => {
      cb();
      schedule();
    }, midnight.getTime() - now.getTime());
  };
  schedule();
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", cb);
  };
}

export function useToday(): string {
  return useSyncExternalStore(subscribeToday, () => todayString(), () => "");
}

/* A one-shot message handed from one screen to the next, e.g. "Workout saved". */
export interface Flash {
  title: string;
  detail?: string;
  /** the page that should show it */
  path: string;
}

let flash: Flash | null = null;
const flashListeners = new Set<() => void>();

export function getFlash(): Flash | null {
  return flash;
}

export function setFlash(f: Flash | null) {
  flash = f;
  flashListeners.forEach((l) => l());
}

export function useFlash(): Flash | null {
  return useSyncExternalStore(
    (cb) => {
      flashListeners.add(cb);
      return () => flashListeners.delete(cb);
    },
    () => flash,
    () => null,
  );
}
