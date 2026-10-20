"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Banner } from "./Banner";
import { Button, ButtonLink } from "./Button";
import { Field, FieldError, Input, Select, Textarea } from "./Field";
import { PlateCalculator } from "./PlateCalculator";
import { RestTimer } from "./RestTimer";
import { LoadingState, NeedsProfile, SafetyNote } from "./States";
import { clearDraft, readDraft, writeDraft } from "@/lib/draft";
import { DAYS, DAY_ORDER, EXERCISES, getExercise } from "@/lib/exercises";
import type { DayType } from "@/lib/exercises";
import { blankSets, convertFormWeights, formFromSession, freshForm, isBlankSet, repeatLastSet, stepValue, swapOptions } from "@/lib/formstate";
import { repRange, workoutFor } from "@/lib/plans";
import type { Prescription } from "@/lib/plans";
import { suggestNext } from "@/lib/recommend";
import type { Suggestion } from "@/lib/recommend";
import { findNewPRs } from "@/lib/stats";
import { MAX_NOTE, fmtWeight } from "@/lib/storage";
import type { Profile, Session } from "@/lib/storage";
import { addSession, setFlash, updateSession, useIronlog, useToday } from "@/lib/store";
import { setKey, validateSession } from "@/lib/validate";
import type { FormErrors, SessionForm } from "@/lib/validate";

export function LogView() {
  const snap = useIronlog();
  const today = useToday();
  const editId = useSearchParams().get("edit");
  if (!snap.ready || !today) return <LoadingState />;
  if (!snap.data.profile) return <NeedsProfile what="Logging is built around your plan." />;

  const editing = editId ? (snap.data.sessions.find((s) => s.id === editId) ?? null) : null;
  if (editId && !editing) {
    return (
      <section className="border border-line bg-surface p-6">
        <h1 className="font-display text-4xl font-extrabold uppercase tracking-wide">That session isn&apos;t there any more</h1>
        <p className="mt-2 text-muted">It may have been deleted. Your other sessions are in Progress.</p>
        <div className="mt-5">
          <ButtonLink href="/progress" variant="primary">
            Back to Progress
          </ButtonLink>
        </div>
      </section>
    );
  }
  return <LogForm key={editing?.id ?? "new"} profile={snap.data.profile} sessions={snap.data.sessions} today={today} editing={editing} />;
}

const hasTyped = (ex: { sets: { weight: string; reps: string }[] }) => ex.sets.some((s) => !isBlankSet(s));
const idFor = (key: string) => key.replace(/\./g, "-");
const without = (errs: FormErrors, ...keys: string[]): FormErrors =>
  Object.fromEntries(Object.entries(errs).filter(([k]) => !keys.includes(k)));

function LogForm({ profile, sessions, today, editing }: { profile: Profile; sessions: Session[]; today: string; editing: Session | null }) {
  const router = useRouter();
  const unit = profile.unit;
  // what "last time" means when editing: everything except the session being edited
  const history = editing ? sessions.filter((s) => s.id !== editing.id) : sessions;

  const [init] = useState(() => {
    if (editing) return { form: formFromSession(editing), note: editing.note ?? "", resumedAt: null as number | null };
    const draft = readDraft();
    if (draft) return { form: convertFormWeights(draft.form, draft.unit, unit), note: draft.note, resumedAt: draft.savedAt as number | null };
    return { form: freshForm(profile, sessions, today), note: "", resumedAt: null as number | null };
  });
  const [form, setForm] = useState<SessionForm>(init.form);
  const [note, setNote] = useState(init.note);
  const [resumedAt, setResumedAt] = useState(init.resumedAt);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [swapping, setSwapping] = useState<number | null>(null);
  const pendingFocus = useRef<string | null>(null);
  const saved = useRef(false);

  // If the unit is switched in another tab while this form is open, convert what has
  // been typed — otherwise "100" typed as lb would silently be saved as 100 kg.
  const [formUnit, setFormUnit] = useState(unit);
  if (formUnit !== unit) {
    setFormUnit(unit);
    setForm((f) => convertFormWeights(f, formUnit, unit));
  }

  // Save as you type, so a locked phone or an accidental tap elsewhere never costs you your sets.
  useEffect(() => {
    if (!editing && !saved.current) writeDraft(form, unit, note);
  }, [form, note, unit, editing]);

  // After errors render, move the cursor to the first problem — what was typed stays.
  useEffect(() => {
    if (pendingFocus.current) {
      document.getElementById(pendingFocus.current)?.focus();
      pendingFocus.current = null;
    }
  }, [errors]);

  const rxFor = (exerciseId: string): Prescription => {
    const planned = workoutFor(profile.goal, form.focus as DayType).find((p) => p.exercise.id === exerciseId);
    if (planned) return planned.prescription;
    const ex = getExercise(exerciseId)!;
    return ex.kind === "isolation" ? { sets: 3, repMin: 10, repMax: 15 } : { sets: 3, repMin: 6, repMax: 12 };
  };

  function changeFocus(next: string) {
    // Keep anything already typed; swap in the new workout's other exercises.
    const prescribed = workoutFor(profile.goal, next as DayType).map((p) => {
      const existing = form.exercises.find((e) => e.exerciseId === p.exercise.id);
      return existing && hasTyped(existing) ? existing : { exerciseId: p.exercise.id, sets: blankSets(p.prescription.sets) };
    });
    const kept = form.exercises.filter((e) => hasTyped(e) && !prescribed.some((p) => p.exerciseId === e.exerciseId));
    setForm({ ...form, focus: next, exercises: [...prescribed, ...kept] });
  }

  const patchSets = (ei: number, fn: (sets: SessionForm["exercises"][number]["sets"]) => SessionForm["exercises"][number]["sets"]) =>
    setForm((f) => ({ ...f, exercises: f.exercises.map((e, i) => (i === ei ? { ...e, sets: fn(e.sets) } : e)) }));

  function setField(ei: number, si: number, field: "weight" | "reps", value: string) {
    patchSets(ei, (sets) => sets.map((s, i) => (i === si ? { ...s, [field]: value } : s)));
    const key = setKey(ei, si, field);
    if (errors[key] || errors.form) setErrors((prev) => without(prev, key, "form"));
  }

  function fillSuggestion(ei: number, s: Suggestion, count: number) {
    patchSets(ei, () =>
      Array.from({ length: count }, () => ({ weight: s.weight && s.weight > 0 ? fmtWeight(s.weight) : "", reps: String(s.reps) })),
    );
  }

  function startOver() {
    clearDraft();
    setForm(freshForm(profile, sessions, today));
    setNote("");
    setResumedAt(null);
    setErrors({});
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
    const sets = result.session.entries.reduce((n, en) => n + en.sets.length, 0);

    if (editing) {
      updateSession(editing.id, { ...result.session, note });
      setFlash({ title: `${DAYS[result.session.focus].label} updated`, detail: `${sets} sets saved.`, path: "/progress" });
      router.push("/progress");
      return;
    }

    const prs = findNewPRs(sessions, result.session.entries);
    saved.current = true;
    clearDraft();
    addSession({ ...result.session, ...(note.trim() ? { note: note.trim() } : {}) });
    setFlash({
      title: `${DAYS[result.session.focus].label} saved`,
      detail:
        prs.length > 0
          ? `New personal best: ${prs
              .map((p) => `${getExercise(p.exerciseId)?.name} ${p.set.weight ? `${fmtWeight(p.set.weight)} ${unit} × ` : ""}${p.set.reps}`)
              .join(", ")}.`
          : `${sets} sets logged. Nice work.`,
      path: "/",
    });
    router.push("/");
  }

  const errorCount = Object.keys(errors).filter((k) => k !== "form").length;
  const inForm = form.exercises.map((e) => e.exerciseId);
  const available = EXERCISES.filter((e) => !inForm.includes(e.id));
  const weightStep = unit === "lb" ? 5 : 2.5;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={editing ? "/progress" : "/"}
          className="inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-ink hover:underline"
        >
          ← Back to {editing ? "Progress" : "Today"}
        </Link>
        <h1 className="mt-1 font-display text-5xl font-black uppercase leading-none tracking-wide">
          {editing ? "Edit session" : "Log a session"}
        </h1>
        <p className="mt-2 text-muted">
          {editing
            ? "Fix a weight, a rep, or the date. Blank rows are skipped."
            : "Filled in with today's recommendation. Enter what you actually lifted — blank rows are skipped."}
        </p>
      </div>

      {resumedAt && (
        <Banner
          tone="info"
          title="Resumed your unfinished workout"
          action={
            <Button variant="ghost" onClick={startOver} className="!min-h-11">
              Start over
            </Button>
          }
        >
          Saved at {new Date(resumedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}. It saves itself as you type.
        </Banner>
      )}

      <div className="flex flex-wrap gap-2">
        <PlateCalculator unit={unit} />
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
          Skip to {editing ? "Save changes" : "Save session"}
        </a>

        {(errorCount > 0 || errors.form) && (
          <div id="form-summary" tabIndex={-1} role="alert" className="border-l-4 border-danger bg-surface px-4 py-3 font-semibold outline-none">
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

        <Field id="focus" label="Workout" hint={`Trains ${DAYS[form.focus as DayType]?.focus ?? "your chosen muscles"}.`} error={errors.focus}>
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
          const sug = suggestNext(info, rx, history, unit);
          const options = swapOptions(ex.exerciseId, inForm);
          return (
            <fieldset key={`${ex.exerciseId}-${ei}`} className="border border-line bg-surface p-4">
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
                  return (
                    <SetRow
                      key={si}
                      n={si + 1}
                      name={info.name}
                      unit={unit}
                      weight={s.weight}
                      reps={s.reps}
                      weightId={idFor(wKey)}
                      repsId={idFor(rKey)}
                      weightError={errors[wKey]}
                      repsError={errors[rKey]}
                      weightPlaceholder={sug?.weight ? fmtWeight(sug.weight) : "—"}
                      repsPlaceholder={String(sug?.reps ?? rx.repMin)}
                      weightStep={weightStep}
                      canRemove={ex.sets.length > 1}
                      onWeight={(v) => setField(ei, si, "weight", v)}
                      onReps={(v) => setField(ei, si, "reps", v)}
                      onRemove={() => patchSets(ei, (sets) => sets.filter((_, i) => i !== si))}
                    />
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => patchSets(ei, (sets) => repeatLastSet(sets))} className="!min-h-11 !text-base">
                  Same again<span className="sr-only"> for {info.name}</span>
                </Button>
                <Button variant="secondary" onClick={() => patchSets(ei, (sets) => [...sets, { weight: "", reps: "" }])} className="!min-h-11 !text-base">
                  Add set<span className="sr-only"> to {info.name}</span>
                </Button>
                {sug && (
                  <Button variant="ghost" onClick={() => fillSuggestion(ei, sug, ex.sets.length)} className="!min-h-11 !text-base">
                    Use suggestion<span className="sr-only"> for {info.name}</span>
                  </Button>
                )}
                {options.length > 0 && (
                  <Button variant="ghost" onClick={() => setSwapping(swapping === ei ? null : ei)} aria-expanded={swapping === ei} className="!min-h-11 !text-base">
                    Swap<span className="sr-only"> {info.name}</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSwapping(null);
                    setForm((f) => ({ ...f, exercises: f.exercises.filter((_, i) => i !== ei) }));
                  }}
                  className="!min-h-11 !text-base"
                >
                  Skip exercise<span className="sr-only"> {info.name}</span>
                </Button>
              </div>

              {swapping === ei && options.length > 0 && (
                <div className="mt-3 border-t border-line pt-3">
                  <Field id={`swap-${ei}`} label={`Swap ${info.name} for…`} hint="Trains the same muscles. What you've typed for this exercise stays.">
                    {(p) => (
                      <Select
                        {...p}
                        value=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) return;
                          setForm((f) => ({ ...f, exercises: f.exercises.map((x, i) => (i === ei ? { ...x, exerciseId: id } : x)) }));
                          setSwapping(null);
                        }}
                      >
                        <option value="">Choose a replacement…</option>
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
              )}
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

        <Field id="note" label="Notes" optional hint={`How it felt, a tweak to remember, something to watch. ${note.length}/${MAX_NOTE}`}>
          {(p) => <Textarea {...p} value={note} maxLength={MAX_NOTE} onChange={(e) => setNote(e.target.value)} />}
        </Field>

        <div className="flex flex-col gap-3">
          {errors.form && <FieldError>{errors.form}</FieldError>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button id="save-session" type="submit" variant="primary" disabled={saving} className="w-full sm:w-auto">
              {editing ? "Save changes" : "Save session"}
            </Button>
            {editing && (
              <ButtonLink href="/progress" variant="secondary" className="w-full sm:w-auto">
                Cancel
              </ButtonLink>
            )}
          </div>
          <SafetyNote />
        </div>
      </form>

      {/* room so the rest timer never covers the last field */}
      {!editing && <div className="h-16" aria-hidden />}
      {!editing && <RestTimer />}
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
  weightStep: number;
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
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              props.onWeight(stepValue(props.weight, e.key === "ArrowUp" ? 1 : -1, props.weightStep, 0));
            }
          }}
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
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              props.onReps(stepValue(props.reps, e.key === "ArrowUp" ? 1 : -1, 1, 1));
            }
          }}
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
