"use client";

import { useRef, useState } from "react";
import { Banner } from "./Banner";
import { Button, ButtonLink } from "./Button";
import { DaysPicker, GoalPicker } from "./Pickers";
import { LoadingState, SafetyNote } from "./States";
import { WeekBar } from "./WeekBar";
import { parseDate, relativeDay } from "@/lib/dates";
import { focusPageHeading } from "@/lib/focus";
import { DAYS } from "@/lib/exercises";
import { DEFAULT_DAYS, goalLabel, planFor, repRange, workoutFor } from "@/lib/plans";
import type { Goal } from "@/lib/plans";
import { recommend, suggestNext } from "@/lib/recommend";
import { daysInWeek, lastSession, totalTrainingDays, weeklyStreak } from "@/lib/stats";
import type { Profile, Session } from "@/lib/storage";
import { setFlash, startProfile, useFlash, useIronlog, useToday } from "@/lib/store";

export function TodayView() {
  const snap = useIronlog();
  const today = useToday();
  if (!snap.ready || !today) return <LoadingState />;
  if (!snap.data.profile) return <Onboarding />;
  return (
    <Today
      profile={snap.data.profile}
      sessions={snap.data.sessions}
      today={today}
      persistent={snap.persistent}
      recovered={snap.recovered}
    />
  );
}

/* ------------------------------------------------------------------ */
/* First visit: two taps from a cold start to a real workout.          */
/* ------------------------------------------------------------------ */

function Onboarding() {
  const [goal, setGoal] = useState<Goal | null>(null);
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) {
      setError("Pick a goal so we can build your first workout.");
      // keep the person where the problem is
      formRef.current?.querySelector<HTMLInputElement>('input[name="goal"]')?.focus();
      return;
    }
    startProfile({ goal, daysPerWeek: days });
    focusPageHeading();
  }

  const split = goal ? planFor(goal, days) : null;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="font-display text-xl font-bold uppercase tracking-widest text-muted">Welcome to Ironlog</p>
        <h1 className="mt-1 font-display text-5xl font-black uppercase leading-none tracking-wide sm:text-6xl">
          Your gym coach, in your pocket
        </h1>
        <p className="mt-3 max-w-prose text-lg text-muted">
          Tell us your goal and how often you can train. You&apos;ll get today&apos;s workout in one tap — no sign-up,
          no tour. Everything stays on this device.
        </p>
      </header>

      <form ref={formRef} onSubmit={submit} noValidate className="flex flex-col gap-8">
        <GoalPicker
          value={goal}
          onChange={(g) => {
            setGoal(g);
            setError(undefined);
          }}
          error={error}
        />
        <DaysPicker value={days} onChange={setDays} />

        {split && (
          <p className="border-l-4 border-line pl-4 text-muted" aria-live="polite">
            <span className="font-semibold text-ink">Your week:</span>{" "}
            {split.map((d) => DAYS[d].label).join(" → ")}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="primary" className="w-full sm:w-auto sm:self-start">
            Show my first workout
          </Button>
          <SafetyNote />
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Today: the reason to come back.                                      */
/* ------------------------------------------------------------------ */

function Today({
  profile,
  sessions,
  today,
  persistent,
  recovered,
}: {
  profile: Profile;
  sessions: Session[];
  today: string;
  persistent: boolean;
  recovered: boolean;
}) {
  const flash = useFlash();

  const rec = recommend(profile, sessions, today);
  const day = DAYS[rec.day];
  const planned = workoutFor(profile.goal, rec.day);
  const done = daysInWeek(sessions, today);
  const target = profile.daysPerWeek;
  const streak = weeklyStreak(sessions, target, today);
  const total = totalTrainingDays(sessions);
  const last = lastSession(sessions);
  const firstTime = sessions.length === 0;

  const eyebrow =
    rec.status === "trained-today" ? "Done for today — next up" : rec.status === "rest-advised" ? "Recovery day suggested" : "Today's workout";
  const dateLine = parseDate(today).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      {flash && (
        <Banner
          tone="success"
          title={flash.title}
          action={
            <Button variant="ghost" onClick={() => setFlash(null)} aria-label="Dismiss message">
              Dismiss
            </Button>
          }
        >
          {flash.detail}
        </Banner>
      )}
      {!persistent && (
        <Banner tone="warning" title="Your browser is blocking storage">
          Your workouts will be lost when you close this tab. Turn off private browsing to keep them.
        </Banner>
      )}
      {recovered && (
        <Banner tone="warning" title="Some saved data couldn't be read">
          We kept everything we could. Anything unreadable was skipped.
        </Banner>
      )}

      <header>
        <p className="font-display text-xl font-bold uppercase tracking-widest text-muted">
          {firstTime ? "Your first workout is ready" : dateLine}
        </p>
        <h1 className="mt-1 font-display text-5xl font-black uppercase leading-none tracking-wide sm:text-6xl">
          {firstTime ? <>Let&apos;s get started</> : last?.date === today ? <>Nice work today</> : <>Welcome back</>}
        </h1>
        <p className="mt-2 text-lg text-muted">
          {last
            ? `Last session: ${DAYS[last.focus].label.toLowerCase()}, ${relativeDay(last.date, today)}.`
            : `${profile.daysPerWeek} days a week · ${goalLabel(profile.goal)}.`}
        </p>
      </header>

      <section aria-labelledby="workout-heading" className="border-2 border-ink bg-surface p-5">
        <p className="font-display text-lg font-bold uppercase tracking-widest text-muted">{eyebrow}</p>
        <h2 id="workout-heading" className="font-display text-5xl font-black uppercase leading-none tracking-wide">
          {day.label}
        </h2>
        <p className="mt-2 text-muted">
          <span className="font-semibold text-ink">Why: </span>
          {rec.reason}
        </p>

        <div className="mt-4">
          {rec.status === "ready" && (
            <ButtonLink href="/log" variant="primary" className="w-full sm:w-auto">
              Log this workout
            </ButtonLink>
          )}
          {rec.status === "trained-today" && (
            <ButtonLink href="/log" variant="secondary" className="w-full sm:w-auto">
              Log another session
            </ButtonLink>
          )}
          {rec.status === "rest-advised" && (
            <ButtonLink href="/log" variant="secondary" className="w-full sm:w-auto">
              Train anyway
            </ButtonLink>
          )}
        </div>

        <ol className="mt-5 divide-y divide-line border-y border-line">
          {planned.map(({ exercise, prescription }) => {
            const sug = suggestNext(exercise, prescription, sessions, profile.unit);
            return (
              <li key={exercise.id} className="flex items-baseline justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{exercise.name}</p>
                  <p className="text-sm text-muted">
                    {sug ? sug.text.replace("Last:", "Last time:") : `Start light — pick a weight you can lift ${prescription.repMax} clean times.`}
                  </p>
                </div>
                <p className="flex-none font-stencil text-2xl font-black tracking-wide">
                  {prescription.sets} × {repRange(prescription)}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      {!firstTime && (
        <section aria-labelledby="week-heading" className="border border-line bg-surface p-5">
          <h2 id="week-heading" className="font-display text-3xl font-extrabold uppercase tracking-wide">
            This week
          </h2>
          <WeekBar done={done} target={target} />
          <p className="mt-2 text-center text-lg font-semibold">
            {done >= target ? "Weekly target hit — strong work." : `${done} of ${target} sessions`}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-px bg-line text-center">
            <div className="bg-surface px-2 py-3">
              <dt className="text-sm text-muted">Week streak</dt>
              <dd className="font-stencil text-4xl font-black leading-none">{streak}</dd>
            </div>
            <div className="bg-surface px-2 py-3">
              <dt className="text-sm text-muted">Days at the gym</dt>
              <dd className="font-stencil text-4xl font-black leading-none">{total}</dd>
            </div>
          </dl>
          <p className="mt-3 text-center text-sm text-muted">
            A week counts when you train on {target} different days
            {streak === 0 ? " — hit it to start a streak." : "."}
          </p>
          <div className="mt-3 text-center">
            <ButtonLink href="/progress" variant="ghost">
              See my progress →
            </ButtonLink>
          </div>
        </section>
      )}

      <footer className="flex flex-col gap-2">
        <p className="text-sm text-muted">
          <span aria-hidden>● </span>Saved on this device. Train on a different day than planned? No problem — each
          visit picks the workout whose muscles have rested longest. Change your goal or days anytime in Plan.
        </p>
        <SafetyNote />
      </footer>
    </div>
  );
}
