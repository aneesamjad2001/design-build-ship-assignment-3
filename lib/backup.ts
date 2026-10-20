/** Backup and restore: a plain JSON file the person can keep. The same
 *  validation as loading from the browser applies, so a bad or foreign file
 *  can never corrupt what's on the device. */

import { shortDate, toDateString } from "./dates.ts";
import { parseData } from "./data.ts";
import type { Data } from "./data.ts";
import { getLook } from "./looks.ts";

export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export function buildBackup(data: Data, now: Date = new Date()): string {
  return JSON.stringify({ app: "ironlog", exportedAt: now.toISOString(), ...data }, null, 2);
}

export function backupFileName(now: Date = new Date()): string {
  return `ironlog-backup-${toDateString(now)}.json`;
}

export type ReadResult = { ok: true; data: Data; recovered: boolean } | { ok: false; error: string };

/** Turn the text of a chosen file into data, or an error that says what to do. */
export function readBackup(text: string): ReadResult {
  if (text.length > MAX_BACKUP_BYTES) {
    return { ok: false, error: "That file is too large to be an Ironlog backup. Choose the .json file you downloaded from Ironlog." };
  }
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "That file is empty. Choose the .json backup you downloaded from Ironlog." };
  try {
    JSON.parse(trimmed);
  } catch {
    return { ok: false, error: "That isn't an Ironlog backup — the file can't be read. Choose the .json file you downloaded from Ironlog." };
  }
  const { data, recovered } = parseData(trimmed);
  if (!data.profile) {
    return { ok: false, error: "That file has no Ironlog plan in it. Choose a backup you downloaded from Ironlog." };
  }
  return { ok: true, data, recovered };
}

/** One line for the confirm box: what is in the file. */
export function describeBackup(data: Data): string {
  const n = data.workouts.length;
  const look = data.profile ? (getLook(data.profile.lookId)?.name ?? "a saved plan") : "no plan";
  if (n === 0) return `A plan only (${look}) with no workouts.`;
  const dates = data.workouts.map((w) => w.date).sort();
  return `${n} ${n === 1 ? "workout" : "workouts"} from ${shortDate(dates[0])} to ${shortDate(dates[dates.length - 1])} · ${look}.`;
}
