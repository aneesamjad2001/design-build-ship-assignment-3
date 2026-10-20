"use client";

import { useState } from "react";
import { Button, ButtonLink } from "./Button";
import { Banner } from "./Banner";
import { Calendar } from "./Calendar";
import { FlashBanner } from "./FlashBanner";
import { ConfirmDialog } from "./Modal";
import { LoadingState, NeedsProfile } from "./States";
import { Sparkline } from "./Sparkline";
import { WeekBar } from "./WeekBar";
import { daysBetween, shortDate } from "@/lib/dates";
import { DAYS, getExercise } from "@/lib/exercises";
import { goalLabel, planFor } from "@/lib/plans";
import { daysInWeek, latestIsRecord, liftHistory, liftSummaries, totalTrainingDays, trainingDates, weeklyStreak } from "@/lib/stats";
import { fmtWeight } from "@/lib/storage";
import type { Profile, Session, SetEntry } from "@/lib/storage";
import { deleteSession, restoreSession, useIronlog, useToday } from "@/lib/store";

export function ProgressView() {
  const snap = useIronlog();
  const today = useToday();
  if (!snap.ready || !today) return <LoadingState />;
  if (!snap.data.profile) return <NeedsProfile what="Progress shows your plan and your lifts." />;
  return <Progress profile={snap.data.profile} sessions={snap.data.sessions} today={today} />;
}

const fmtSet = (s: SetEntry, unit: string) => `${s.weight ? `${fmtWeight(s.weight)} ${unit} × ` : ""}${s.reps}`;

function Progress({ profile, sessions, today }: { profile: Profile; sessions: Session[]; today: string }) {
  const [toDelete, setToDelete] = useState<Session | null>(null);
  const [undo, setUndo] = useState<Session | null>(null);
  const unit = profile.unit;
  const done = daysInWeek(sessions, today);
  const target = profile.daysPerWeek;
  const streak = weeklyStreak(sessions, target, today);
  const lifts = liftSummaries(sessions);
  const history = [...sessions].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
  const cycle = planFor(profile.goal, profile.daysPerWeek);

  return (
    <div className="flex flex-col gap-8">
      <FlashBanner />
      {undo && (
        <Banner
          tone="info"
          title={`${DAYS[undo.focus].label} on ${shortDate(undo.date)} deleted`}
          action={
            <Button
              variant="secondary"
              className="!min-h-11 !text-base"
              onClick={() => {
                restoreSession(undo);
                setUndo(null);
              }}
            >
              Undo
            </Button>
          }
        >
          It&apos;s gone from your history and personal bests — unless you undo.
        </Banner>
      )}
      <header>
        <h1 className="font-display text-5xl font-black uppercase leading-none tracking-wide">Progress</h1>
        <p className="mt-2 text-muted">
          {goalLabel(profile.goal)} · {target} days a week
        </p>
      </header>

      <section aria-labelledby="week" className="border border-line bg-surface p-5">
        <h2 id="week" className="font-display text-3xl font-extrabold uppercase tracking-wide">
          This week
        </h2>
        <WeekBar done={done} target={target} />
        <p className="mt-2 text-center text-lg font-semibold">
          {done} of {target} sessions · {streak > 0 ? `${streak}-week streak` : "no streak yet"}
        </p>
        <p className="mt-1 text-center text-sm text-muted">{totalTrainingDays(sessions)} {totalTrainingDays(sessions) === 1 ? "day" : "days"} at the gym in total</p>
      </section>

      {sessions.length === 0 ? (
        <section aria-labelledby="plan" className="border-2 border-ink bg-surface p-5">
          <h2 id="plan" className="font-display text-3xl font-extrabold uppercase tracking-wide">
            Your week, ready to go
          </h2>
          <p className="mt-1 text-muted">Nothing logged yet — here&apos;s the rotation your plan follows. Your progress fills in as you train.</p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {cycle.map((d, i) => (
              <li key={i} className="flex items-center gap-3 border border-line bg-raised px-4 py-3">
                <span className="font-stencil text-3xl font-black text-muted">{i + 1}</span>
                <span>
                  <span className="block font-display text-xl font-bold uppercase tracking-wide">{DAYS[d].label}</span>
                  <span className="text-sm text-muted">{DAYS[d].focus}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <ButtonLink href="/log" variant="primary">
              Log your first session
            </ButtonLink>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="cal" className="border border-line bg-surface p-5">
            <h2 id="cal" className="sr-only">
              Calendar
            </h2>
            <Calendar trained={trainingDates(sessions)} today={today} />
          </section>

          <section aria-labelledby="lifts">
            <h2 id="lifts" className="font-display text-3xl font-extrabold uppercase tracking-wide">
              Your lifts
            </h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {lifts.map(({ exerciseId, last, best }) => {
                const hist = liftHistory(sessions, exerciseId);
                const times = hist.length;
                // "New" only while it is: the latest log beat every earlier session, within the last two weeks
                const isPR = times > 1 && latestIsRecord(sessions, exerciseId) && daysBetween(last.date, today) <= 14;
                const weighted = hist.some((h) => (h.top.weight ?? 0) > 0);
                const trend = hist.map((h) => (weighted ? (h.top.weight ?? 0) : h.top.reps));
                const trendText =
                  times > 1
                    ? `${weighted ? `Top set weight` : "Top set reps"} went from ${fmtWeight(trend[0])} to ${fmtWeight(trend[trend.length - 1])}${weighted ? ` ${unit}` : ""} over ${times} sessions`
                    : "";
                return (
                  <li key={exerciseId}>
                    <details>
                      <summary className="cursor-pointer py-3">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                          <p className="text-lg font-semibold">
                            {getExercise(exerciseId)?.name}{" "}
                            {isPR && (
                              <span className="ml-1 border border-ink px-1.5 py-0.5 align-middle font-display text-sm font-extrabold uppercase tracking-wider">
                                New PR
                              </span>
                            )}
                          </p>
                          <p className="font-stencil text-2xl font-black tracking-wide">{fmtSet(best.set, unit)}</p>
                        </div>
                        <p className="text-sm text-muted">
                          Best on {shortDate(best.date)} · last time {fmtSet(last.set, unit)} on {shortDate(last.date)} · {times}{" "}
                          {times === 1 ? "session" : "sessions"}
                        </p>
                      </summary>
                      <div className="pb-4">
                        {times > 1 && (
                          <div className="mb-3">
                            <Sparkline values={trend} label={trendText} />
                            <p className="mt-1 text-sm text-muted">{trendText}.</p>
                          </div>
                        )}
                        <ol className="flex flex-col divide-y divide-line border-y border-line">
                          {[...hist].reverse().map((h, i) => (
                            <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2 text-sm">
                              <span className="font-semibold">{shortDate(h.date)}</span>
                              <span className="text-muted">{h.sets.map((set) => fmtSet(set, unit)).join("  ·  ")}</span>
                              <span className="text-muted">
                                {fmtWeight(h.volume)} {weighted ? unit : "reps"} total
                              </span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="history">
            <h2 id="history" className="font-display text-3xl font-extrabold uppercase tracking-wide">
              Sessions
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {history.map((s) => {
                const setCount = s.entries.reduce((n, e) => n + e.sets.length, 0);
                return (
                  <li key={s.id} className="border border-line bg-surface">
                    <details>
                      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-2">
                        <span>
                          <span className="block font-display text-xl font-bold uppercase tracking-wide">{DAYS[s.focus].label}</span>
                          <span className="text-sm text-muted">
                            {shortDate(s.date)} · {s.entries.length} {s.entries.length === 1 ? "exercise" : "exercises"} · {setCount} {setCount === 1 ? "set" : "sets"}
                          </span>
                        </span>
                        <span aria-hidden className="text-muted">
                          ▾
                        </span>
                      </summary>
                      <div className="border-t border-line px-4 py-3">
                        <ul className="flex flex-col gap-2">
                          {s.entries.map((e) => (
                            <li key={e.exerciseId}>
                              <p className="font-semibold">{getExercise(e.exerciseId)?.name}</p>
                              <p className="text-sm text-muted">{e.sets.map((set) => fmtSet(set, unit)).join("  ·  ")}</p>
                            </li>
                          ))}
                        </ul>
                        {s.note && (
                          <p className="mt-3 border-l-4 border-line pl-3 text-sm text-muted">
                            <span className="font-semibold text-ink">Note: </span>
                            {s.note}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ButtonLink href={`/log?edit=${s.id}`} variant="secondary" className="!min-h-11 !text-base">
                            Edit session
                          </ButtonLink>
                          <Button variant="danger" className="!min-h-11 !text-base" onClick={() => setToDelete(s)}>
                            Delete session
                          </Button>
                        </div>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete this session?"
        body={
          toDelete
            ? `${DAYS[toDelete.focus].label} on ${shortDate(toDelete.date)} will be removed from your history and personal bests.`
            : ""
        }
        confirmLabel="Delete"
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) setUndo(deleteSession(toDelete.id));
          setToDelete(null);
        }}
      />
    </div>
  );
}
