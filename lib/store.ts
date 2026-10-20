"use client";

/**
 * Browser storage as a small external store. Reads are validated (see
 * storage.ts), writes fall back to memory if the browser blocks storage, and
 * other tabs stay in sync through the `storage` event. Nothing leaves the
 * device.
 */

import { useSyncExternalStore } from "react";
import { todayString } from "./dates";
import {
  EMPTY_DATA,
  STORAGE_KEY,
  convertSessions,
  parseData,
  serialize,
} from "./storage";
import type { Data, Profile, Session } from "./storage";

export interface Snapshot {
  /** false until the browser has been read (server render and first paint) */
  ready: boolean;
  data: Data;
  /** something unreadable was dropped on load */
  recovered: boolean;
  /** false when the browser refused to save, so data lives only in this tab */
  persistent: boolean;
}

const LOADING: Snapshot = { ready: false, data: EMPTY_DATA, recovered: false, persistent: true };

let writeFailed = false;
let memoryRaw: string | null = null;
let cacheRaw: string | null | undefined;
let cache: Snapshot = LOADING;
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
  cache = { ready: true, data, recovered, persistent: !writeFailed };
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

export function useIronlog(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, () => LOADING);
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const current = (): Data => getSnapshot().data;

export function startProfile(p: Pick<Profile, "goal" | "daysPerWeek">) {
  const d = current();
  commit({ ...d, profile: { goal: p.goal, daysPerWeek: p.daysPerWeek, unit: d.profile?.unit ?? "lb", createdAt: d.profile?.createdAt ?? Date.now() } });
}

/** Change goal, days, or unit. Switching unit converts every saved weight. */
export function updateProfile(patch: Partial<Pick<Profile, "goal" | "daysPerWeek" | "unit">>) {
  const d = current();
  if (!d.profile) return;
  const next: Profile = { ...d.profile, ...patch };
  const sessions = patch.unit && patch.unit !== d.profile.unit ? convertSessions(d.sessions, d.profile.unit, patch.unit) : d.sessions;
  commit({ ...d, profile: next, sessions });
}

export function addSession(s: Omit<Session, "id" | "createdAt">): Session {
  const d = current();
  const session: Session = { ...s, id: newId(), createdAt: Date.now() };
  commit({ ...d, sessions: [...d.sessions, session] });
  return session;
}

export function deleteSession(id: string) {
  const d = current();
  commit({ ...d, sessions: d.sessions.filter((s) => s.id !== id) });
}

export function resetAll() {
  memoryRaw = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    writeFailed = true;
  }
  emit();
}

/* "Today" that stays right when a tab is left open overnight. */
function subscribeToday(cb: () => void): () => void {
  const onVisible = () => document.visibilityState === "visible" && cb();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", cb);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", cb);
  };
}

export function useToday(): string {
  return useSyncExternalStore(subscribeToday, () => todayString(), () => "");
}

/* A one-shot message handed from one screen to the next, e.g. "Session saved". */
export interface Flash {
  title: string;
  detail?: string;
}

let flash: Flash | null = null;
const flashListeners = new Set<() => void>();

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
