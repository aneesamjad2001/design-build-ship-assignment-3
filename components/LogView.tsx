"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { Field, FieldError, Input, Select } from "./Field";
import { LoadingState, NeedsProfile, SafetyNote } from "./States";
import { DAYS, DAY_ORDER, EXERCISES, getExercise } from "@/lib/exercises";
import type { DayType } from "@/lib/exercises";
import { repRange, workoutFor } from "@/lib/plans";
import type { Prescription } from "@/lib/plans";
import { recommend, suggestNext } from "@/lib/recommend";
import type { Suggestion } from "@/lib/recommend";
import { findNewPRs } from "@/lib/stats";
import { convertWeight, fmtWeight } from "@/lib/storage";
import type { Profile, Session } from "@/lib/storage";
import { addSession, setFlash, useIronlog, useToday } from "@/lib/store";
import { parseWeight, setKey, validateSession } from "@/lib/validate";
import type { FormErrors, SessionForm } from "@/lib/validate";

export function LogView() {
  const snap = useIronlog();
  const today = useToday();
  if (!snap.ready || !today) return <LoadingState />;
  if (!snap.data.profile) return <NeedsProfile what="Logging is built around your plan." />;
  return <LogForm profile={snap.data.profile} sessions={snap.data.sessions} today={today} />;
}

const blankSets = (n: number) => Array.from({ length: n }, () => ({ weight: "", reps: "" }));
const hasTyped = (ex: { sets: { weight: string; reps: string }[] }) =>
  ex.sets.some((s) => s.weight.trim() || s.reps.trim());
const idFor = (key: string) => key.replace(/\./g, "-");
const without = (errs: FormErrors, ...keys: string[]): FormErrors =>
  Object.fromEntries(Object.entries(errs).filter(([k]) => !keys.includes(k)));

function planForFocus(profile: Profile, focus: DayType) {
  return workoutFor(profile.goal, focus);
}

function LogForm({ profile, sessions, today }: { profile: Profile; sessions: Session[]; today: string }) {
  const router = useRouter();
  const [form, setForm] = useState<SessionForm>(() => {
    const focus = recommend(profile, sessions, today).day;
    return {
      date: today,
      focus,
      exercises: planForFocus(profile, focus).map((p) => ({
        exerciseId: p.exercise.id,
        sets: blankSets(p.prescription.sets),
      })),
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // If the unit is switched in another tab while this form is open, convert what has
  // been typed — otherwise "100" typed as lb would silently be saved as 100 kg.
  const [formUnit, setFormUnit] = useState(profile.unit);
  if (formUnit !== profile.unit) {
    setFormUnit(profile.unit);
    setForm((f) => ({
      ...f,
      exercises: f.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => {
          const w = parseWeight(s.weight);
          return Number.isNaN(w) ? s : { ...s, weight: fmtWeight(convertWeight(w, formUnit, profile.unit)) };
        }),
      })),
    }));
  }
  const pendingFocus = useRef<string | null>(null);
  const unit = profile.unit;

  // After errors render, move the cursor to the first problem — what was typed stays.
  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  }, [errors]);

  const rxFor = (exerciseId: string): Prescription => {
    const planned = planForFocus(profile, form.focus as DayType).find((p) => p.exercise.id === exerciseId);
    if (planned) return planned.prescription;
    const ex = getExercise(exerciseId)!;
    return ex.kind === "isolation" ? { sets: 3, repMin: 10, repMax: 15 } : { sets: 3, repMin: 6, repMax: 12 };
  };

  function changeFocus(next: string) {
    // Keep anything already typed; swap in the new workout's other exercises.
    const prescribed = planForFocus(profile, next as DayType).map((p) => {
      const existing = form.exercises.find((e) => e.exerciseId === p.exercise.id);
      return existing && hasTyped(existing)
        ? existing
        : { exerciseId: p.exercise.id, sets: blankSets(p.prescription.sets) };
    });
    const kept = form.exercises.filter((e) => hasTyped(e) && !prescribed.some((p) => p.exerciseId === e.exerciseId));
    setForm({ ...form, focus: next, exercises: [...prescribed, ...kept] });
  }

  const patchExercise = (ei: number, fn: (sets: SessionForm["exercises"][number]["sets"]) => SessionForm["exercises"][number]["sets"]) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e, i) => (i === ei ? { ...e, sets: fn(e.sets) } : e)) }));

  function setField(ei: number, si: number, field: "weight" | "reps", value: string) {
    patchExercise(ei, (sets) => sets.map((s, i) => (i === si ? { ...s, [field]: value } : s)));
    const key = setKey(ei, si, field);
    if (errors[key] || errors.form) {
      setErrors((prev) => without(prev, key, "form"));
    }
  }

  function fillSuggestion(ei: number, s: Suggestion, count: number) {
    patchExercise(ei, () =>
      Array.from({ length: count }, () => ({ weight: s.weight && s.weight > 0 ? fmtWeight(s.weight) : "", reps: String(s.reps) })),
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    const result = validateSession(form, today);
    if (!result.session) {
      setErrors(result.errors);
      const keys = Object.keys(result.errors);
      const first = keys.includes("date") ? "date" : keys.includes("focus") ? "focus" : keys.find((k) => k !== "form");
      pendingFocus.current = first ? idFor(first) : "form-summary";
      return;
    }
    setSaving(true);
    const prs = findNewPRs(sessions, result.session.entries);
    const sets = result.session.entries.reduce((n, en) => n + en.sets.length, 0);
    addSession(result.session);
    setFlash({
      title: `${DAYS[result.session.focus].label} saved`,
      detail:
        prs.length > 0
          ? `New personal best: ${prs
              .map((p) => `${getExercise(p.exerciseId)?.name} ${p.set.weight ? `${fmtWeight(p.set.weight)} ${unit} × ` : ""}${p.set.reps}`)
              .join(", ")}.`
          : `${sets} sets logged. Nice work.`,
    });
    router.push("/");
  }

  const errorCount = Object.keys(errors).filter((k) => k !== "form").length;
  const available = EXERCISES.filter((e) => !form.exercises.some((x) => x.exerciseId === e.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/" className="inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-ink hover:underline">
          ← Back to Today
        </Link>
        <h1 className="mt-1 font-display text-5xl font-black uppercase leading-none tracking-wide">Log a session</h1>
        <p className="mt-2 text-muted">
          Filled in with today&apos;s recommendation. Enter what you actually lifted — blank rows are skipped.
        </p>
      </div>

      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <a
          href="#save-session"
          onClick={(e) => {
            e.preventDefault();
            document.getElementById("save-session")?.focus();
          }}
          className="skip-link"
        >
          Skip to Save session
        </a>

        {(errorCount > 0 || errors.form) && (
          <div
            id="form-summary"
            tabIndex={-1}
            role="alert"
            className="border-l-4 border-danger bg-surface px-4 py-3 font-semibold outline-none"
          >
            {errorCount > 0
              ? `${errorCount === 1 ? "1 thing needs fixing" : `${errorCount} things need fixing`} before this can be saved.`
              : errors.form}{" "}
            Everything you typed is still here.
          </div>
        )}

        <Field id="date" label="Date" error={errors.date}>
          {(p) => (
            <Input
              {...p}
              type="date"
              value={form.date}
              max={today}
              invalid={!!errors.date}
              onChange={(e) => {
                setForm({ ...form, date: e.target.value });
                if (errors.date) setErrors((prev) => without(prev, "date"));
              }}
            />
          )}
        </Field>

        <Field
          id="focus"
          label="Workout"
          hint={`Trains ${DAYS[form.focus as DayType]?.focus ?? "your chosen muscles"}.`}
          error={errors.focus}
        >
          {(p) => (
            <Select {...p} value={form.focus} invalid={!!errors.focus} onChange={(e) => changeFocus(e.target.value)}>
              {DAY_ORDER.map((d) => (
                <option key={d} value={d}>
                  {DAYS[d].label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        {form.exercises.map((ex, ei) => {
          const info = getExercise(ex.exerciseId)!;
          const rx = rxFor(ex.exerciseId);
          const sug = suggestNext(info, rx, sessions, unit);
          return (
            <fieldset key={ex.exerciseId} className="border border-line bg-surface p-4">
              <legend className="px-2 font-display text-2xl font-extrabold uppercase tracking-wide">{info.name}</legend>
              <p className="text-sm text-muted">
                Aim for {rx.sets} × {repRange(rx)} ·{" "}
                {sug ? sug.text : `no history yet — start light, pick a weight you can lift ${rx.repMax} clean times`}
              </p>

              <div className="mt-3 grid grid-cols-[1.75rem_1fr_1fr_2.75rem] items-start gap-x-2 gap-y-2">
                <span aria-hidden />
                <span className="text-sm font-semibold text-muted">Weight ({unit})</span>
                <span className="text-sm font-semibold text-muted">Reps</span>
                <span aria-hidden />
                {ex.sets.map((s, si) => {
                  const wKey = setKey(ei, si, "weight");
                  const rKey = setKey(ei, si, "reps");
                  const wId = idFor(wKey);
                  const rId = idFor(rKey);
                  return (
                    <SetRow
                      key={si}
                      n={si + 1}
                      name={info.name}
                      unit={unit}
                      weight={s.weight}
                      reps={s.reps}
                      weightId={wId}
                      repsId={rId}
                      weightError={errors[wKey]}
                      repsError={errors[rKey]}
                      weightPlaceholder={sug?.weight ? fmtWeight(sug.weight) : "—"}
                      repsPlaceholder={String(sug?.reps ?? rx.repMin)}
                      canRemove={ex.sets.length > 1}
                      onWeight={(v) => setField(ei, si, "weight", v)}
                      onReps={(v) => setField(ei, si, "reps", v)}
                      onRemove={() => patchExercise(ei, (sets) => sets.filter((_, i) => i !== si))}
                    />
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => patchExercise(ei, (sets) => [...sets, { weight: "", reps: "" }])}>
                  Add set
                </Button>
                {sug && (
                  <Button variant="ghost" onClick={() => fillSuggestion(ei, sug, ex.sets.length)}>
                    Use suggestion
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== ei) }))}
                >
                  Skip exercise<span className="sr-only"> {info.name}</span>
                </Button>
              </div>
            </fieldset>
          );
        })}

        {available.length > 0 && (
          <Field id="add-exercise" label="Add another exercise" optional>
            {(p) => (
              <Select
                {...p}
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) setForm((f) => ({ ...f, exercises: [...f.exercises, { exerciseId: id, sets: blankSets(3) }] }));
                }}
              >
                <option value="">Choose an exercise…</option>
                {available.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        )}

        <div className="flex flex-col gap-3">
          {errors.form && <FieldError>{errors.form}</FieldError>}
          <Button id="save-session" type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto sm:self-start">
            Save session
          </Button>
          <SafetyNote />
        </div>
      </form>
    </div>
  );
}

function SetRow(props: {
  n: number;
  name: string;
  unit: string;
  weight: string;
  reps: string;
  weightId: string;
  repsId: string;
  weightError?: string;
  repsError?: string;
  weightPlaceholder: string;
  repsPlaceholder: string;
  canRemove: boolean;
  onWeight: (v: string) => void;
  onReps: (v: string) => void;
  onRemove: () => void;
}) {
  const { n, name } = props;
  return (
    <>
      <span aria-hidden className="pt-3 text-center font-stencil text-2xl font-black text-muted">
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <label htmlFor={props.weightId} className="sr-only">
          {name}, set {n}, weight in {props.unit}
        </label>
        <Input
          id={props.weightId}
          inputMode="decimal"
          autoComplete="off"
          value={props.weight}
          placeholder={props.weightPlaceholder}
          invalid={!!props.weightError}
          aria-invalid={props.weightError ? true : undefined}
          aria-describedby={props.weightError ? `${props.weightId}-error` : undefined}
          onChange={(e) => props.onWeight(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={props.repsId} className="sr-only">
          {name}, set {n}, reps
        </label>
        <Input
          id={props.repsId}
          inputMode="numeric"
          autoComplete="off"
          value={props.reps}
          placeholder={props.repsPlaceholder}
          invalid={!!props.repsError}
          aria-invalid={props.repsError ? true : undefined}
          aria-describedby={props.repsError ? `${props.repsId}-error` : undefined}
          onChange={(e) => props.onReps(e.target.value)}
        />
      </div>
      {props.canRemove ? (
        <button
          type="button"
          onClick={props.onRemove}
          aria-label={`Remove set ${n} of ${name}`}
          className="flex h-12 w-11 items-center justify-center text-2xl text-muted hover:text-ink"
        >
          <span aria-hidden>×</span>
        </button>
      ) : (
        <span aria-hidden />
      )}
      {(props.weightError || props.repsError) && (
        <div className="col-span-4 flex flex-col gap-1 pb-1">
          {props.weightError && <FieldError id={`${props.weightId}-error`}>Set {n}: {props.weightError}</FieldError>}
          {props.repsError && <FieldError id={`${props.repsId}-error`}>Set {n}: {props.repsError}</FieldError>}
        </div>
      )}
    </>
  );
}
