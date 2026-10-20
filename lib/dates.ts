/** Calendar days as local "YYYY-MM-DD" strings — what people mean by "today". */

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayString(now: Date = new Date()): string {
  return toDateString(now);
}

export function isDateString(s: unknown): s is string {
  if (typeof s !== "string") return false;
  const m = PATTERN.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

export function parseDate(s: string): Date {
  const m = PATTERN.exec(s);
  if (!m) throw new Error(`Bad date: ${s}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

/** Whole days from a to b (positive when b is later). DST-safe. */
export function daysBetween(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  const ua = Date.UTC(pa.getFullYear(), pa.getMonth(), pa.getDate());
  const ub = Date.UTC(pb.getFullYear(), pb.getMonth(), pb.getDate());
  return Math.round((ub - ua) / 86_400_000);
}

/** The Monday of the week containing s. */
export function startOfWeek(s: string): string {
  const d = parseDate(s);
  const offset = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(s, -offset);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(month0: number): string {
  return MONTHS[month0];
}

/** Weeks (Mon–Sun) covering a month; each cell is a date string. */
export function monthGrid(year: number, month0: number): { date: string; inMonth: boolean }[][] {
  const firstDate = new Date(year, month0, 1);
  const leading = (firstDate.getDay() + 6) % 7; // blank cells before the 1st (Mon-first)
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const weekCount = Math.ceil((leading + daysInMonth) / 7);
  let cursor = startOfWeek(toDateString(firstDate));
  const weeks: { date: string; inMonth: boolean }[][] = [];
  for (let w = 0; w < weekCount; w++) {
    const row: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      row.push({ date: cursor, inMonth: parseDate(cursor).getMonth() === month0 });
      cursor = addDays(cursor, 1);
    }
    weeks.push(row);
  }
  return weeks;
}

/** "Mon, Oct 19" */
export function shortDate(s: string): string {
  const d = parseDate(s);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "today", "yesterday", "3 days ago" */
export function relativeDay(from: string, today: string): string {
  const n = daysBetween(from, today);
  if (n === 0) return "today";
  if (n === 1) return "yesterday";
  return `${n} days ago`;
}
