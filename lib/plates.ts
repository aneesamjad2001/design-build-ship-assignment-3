/** Which plates go on each side of the bar. Greedy from the heaviest plate,
 *  which is optimal for the standard plate sets used in gyms. */

import type { Unit } from "./storage.ts";

export const PLATES: Record<Unit, number[]> = {
  lb: [45, 35, 25, 10, 5, 2.5],
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
};

export const BARS: Record<Unit, number[]> = {
  lb: [45, 35],
  kg: [20, 15],
};

export interface PlateResult {
  /** plates for ONE side, heaviest first */
  perSide: { plate: number; count: number }[];
  /** the weight those plates really make, bar included */
  achieved: number;
  /** false when the target can't be built from the available plates */
  exact: boolean;
  /** target is lighter than the empty bar */
  belowBar: boolean;
}

export function plateBreakdown(target: number, bar: number, unit: Unit): PlateResult {
  if (target < bar) return { perSide: [], achieved: bar, exact: false, belowBar: true };
  let remaining = Math.round(((target - bar) / 2) * 1000) / 1000;
  const perSide: PlateResult["perSide"] = [];
  let used = 0;
  for (const plate of PLATES[unit]) {
    const count = Math.floor((remaining + 1e-9) / plate);
    if (count > 0) {
      perSide.push({ plate, count });
      remaining = Math.round((remaining - count * plate) * 1000) / 1000;
      used += count * plate;
    }
  }
  return { perSide, achieved: bar + used * 2, exact: remaining < 0.001, belowBar: false };
}

export function describePlates(r: PlateResult): string {
  if (r.belowBar) return "That's lighter than the empty bar.";
  if (r.perSide.length === 0) return "Just the bar.";
  return r.perSide.map((p) => `${p.count} × ${p.plate}`).join(" + ") + " on each side";
}
