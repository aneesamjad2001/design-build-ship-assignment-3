"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Banner } from "./Banner";
import { Button } from "./Button";
import { ConfirmDialog } from "./Modal";
import { DaysPicker, GoalPicker, UnitPicker } from "./Pickers";
import { LoadingState, NeedsProfile } from "./States";
import { DAYS } from "@/lib/exercises";
import { GOALS, planFor } from "@/lib/plans";
import type { Goal } from "@/lib/plans";
import type { Profile, Unit } from "@/lib/storage";
import { resetAll, updateProfile, useIronlog } from "@/lib/store";

export function PlanView() {
  const snap = useIronlog();
  if (!snap.ready) return <LoadingState />;
  if (!snap.data.profile) return <NeedsProfile what="Your plan is where you change it." />;
  return <PlanForm profile={snap.data.profile} sessionCount={snap.data.sessions.length} />;
}

function PlanForm({ profile, sessionCount }: { profile: Profile; sessionCount: number }) {
  const router = useRouter();
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [days, setDays] = useState(profile.daysPerWeek);
  const [unit, setUnit] = useState<Unit>(profile.unit);
  const [saved, setSaved] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const split = planFor(goal, days);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const unitChanged = unit !== profile.unit;
    updateProfile({ goal, daysPerWeek: days, unit });
    setSaved(
      unitChanged && sessionCount > 0
        ? `Plan updated. Your saved weights now show in ${unit} (the originals are kept exactly as you entered them).`
        : "Plan updated. Today's workout now follows it.",
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="font-display text-5xl font-black uppercase leading-none tracking-wide">Your plan</h1>
        <p className="mt-2 text-muted">Change your goal, your days, or your units any time. Your history stays.</p>
      </header>

      <form onSubmit={save} className="flex flex-col gap-8">
        <GoalPicker
          legend="Goal"
          value={goal}
          onChange={(g) => {
            setGoal(g);
            setSaved(null);
          }}
        />
        <DaysPicker
          value={days}
          onChange={(n) => {
            setDays(n);
            setSaved(null);
          }}
        />
        <UnitPicker
          value={unit}
          onChange={(u) => {
            setUnit(u);
            setSaved(null);
          }}
        />

        <section aria-labelledby="split" className="border border-line bg-surface p-5">
          <h2 id="split" className="font-display text-3xl font-extrabold uppercase tracking-wide">
            Your weekly rotation
          </h2>
          <ol className="mt-3 flex flex-wrap gap-2">
            {split.map((d, i) => (
              <li key={i} className="border border-line bg-raised px-3 py-2 font-display text-lg font-bold uppercase tracking-wide">
                <span className="mr-2 font-stencil text-muted">{i + 1}</span>
                {DAYS[d].label}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-muted">
            <span className="font-semibold text-ink">{GOALS.find((g) => g.id === goal)?.label}:</span>{" "}
            {GOALS.find((g) => g.id === goal)?.detail}
          </p>
          <p className="mt-2 text-sm text-muted">
            Each visit recommends the day whose muscles have rested longest, so skipping a day never breaks the plan.
          </p>
        </section>

        <div className="flex flex-col gap-3">
          {saved && <Banner tone="success" title={saved} />}
          <Button type="submit" variant="primary" className="w-full sm:w-auto sm:self-start">
            Save changes
          </Button>
        </div>
      </form>

      <section aria-labelledby="data" className="border-t border-line pt-6">
        <h2 id="data" className="font-display text-3xl font-extrabold uppercase tracking-wide">
          Your data
        </h2>
        <p className="mt-2 max-w-prose text-muted">
          Everything lives in this browser on this device — there&apos;s no account and nothing is sent anywhere. Clearing
          your browser&apos;s site data will erase it.
        </p>
        <div className="mt-4">
          <Button variant="danger" onClick={() => setConfirmReset(true)}>
            Reset everything
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmReset}
        title="Erase all your data?"
        body={`This deletes your plan and ${sessionCount} saved ${sessionCount === 1 ? "session" : "sessions"} from this device. It can't be undone.`}
        confirmLabel="Erase everything"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          resetAll();
          router.push("/");
        }}
      />
    </div>
  );
}
