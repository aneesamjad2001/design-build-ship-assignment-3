"use client";

import { useState } from "react";
import { Button } from "./Button";
import { Field, Input, Select } from "./Field";
import { Dialog } from "./Modal";
import { BARS, describePlates, plateBreakdown } from "@/lib/plates";
import { fmtWeight } from "@/lib/storage";
import type { Unit } from "@/lib/storage";
import { parseWeight } from "@/lib/validate";

/** "What do I put on the bar?" — the arithmetic nobody wants to do mid-set. */
export function PlateCalculator({ unit }: { unit: Unit }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [barIdx, setBarIdx] = useState(0);
  const [asked, setAsked] = useState(false);

  const bar = BARS[unit][barIdx];
  const target = parseWeight(text);
  const valid = !Number.isNaN(target) && target > 0 && target <= 1500;
  const result = valid ? plateBreakdown(target, bar, unit) : null;
  const error = asked && !valid ? `Enter the total weight on the bar, for example ${unit === "lb" ? "185" : "80"}.` : undefined;

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)} className="!min-h-11 !text-base">
        Plate calculator
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="plates-title">
        <div className="p-6">
          <h2 id="plates-title" className="font-display text-3xl font-extrabold uppercase tracking-wide">
            Plate calculator
          </h2>
          <form
            className="mt-4 flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setAsked(true);
            }}
          >
            <Field id="plate-target" label={`Total weight on the bar (${unit})`} error={error}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="decimal"
                  autoComplete="off"
                  value={text}
                  invalid={!!error}
                  placeholder={unit === "lb" ? "185" : "80"}
                  onChange={(e) => {
                    setText(e.target.value);
                    setAsked(true);
                  }}
                />
              )}
            </Field>
            <Field id="plate-bar" label="Bar">
              {(p) => (
                <Select {...p} value={barIdx} onChange={(e) => setBarIdx(Number(e.target.value))}>
                  {BARS[unit].map((b, i) => (
                    <option key={b} value={i}>
                      {b} {unit} bar{i === 0 ? " (standard)" : ""}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </form>

          <div aria-live="polite" className="mt-5 min-h-16 border-l-4 border-line pl-4">
            {result && (
              <>
                <p className="font-display text-3xl font-extrabold uppercase leading-tight tracking-wide">{describePlates(result)}</p>
                {!result.belowBar && (
                  <p className="mt-1 text-muted">
                    {result.exact
                      ? `= ${fmtWeight(result.achieved)} ${unit} with the ${bar} ${unit} bar.`
                      : `Closest you can load is ${fmtWeight(result.achieved)} ${unit} — ${fmtWeight(target)} isn't possible with standard plates.`}
                  </p>
                )}
              </>
            )}
            {!result && <p className="text-muted">Type a weight to see which plates to load on each side.</p>}
          </div>

          <div className="mt-6 flex justify-end">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
