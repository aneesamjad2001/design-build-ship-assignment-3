# After release: review, a hotfix, and "use it for months"

> **History, version 2.** This page describes the second version (goal + days per
> week, a set-by-set logbook). Version 3 replaced that design: the author decided the
> logbook was a chore and rebuilt the app around picking a body and a guided workout
> (see [`decisions.md`](./decisions.md)). Features named here that version 3 dropped:
> the plate calculator, editing a logged session, and log drafts. The hotfix below
> still applies (`next.config.ts`).

Written after the assignment build was deployed. It records what an independent
review found, one serious bug found by using the app like a regular user, and what
was added so the app is worth opening every week.

## 1. Independent review (Codex)

The code was reviewed read-only by Codex (an independent reviewer), asking for real
defects and what a person would still need to use it for months. It confirmed six
defects, several by actually running the code, and ranked the missing features.
Everything below was checked before being acted on.

| Finding | Verified | Done |
|---|---|---|
| Switching units rewrote saved data: a valid 500 kg set became 1,102.5 lb, which exceeds the 1,000 limit, so it could be dropped on reload; repeated toggling drifted through rounding | Yes — run | **Fixed at the root.** Each session remembers the unit it was entered in; conversion happens only for display. Saved data is never rewritten. |
| An open log form in one tab kept "100" but relabelled it kg when the unit changed in another tab | Yes | The form converts what was typed. |
| One bad set inside a session was dropped without any notice (only whole sessions were reported) | Yes — run | Any dropped data at any level is reported. |
| Bodyweight progression went backwards (10 push-ups → "try 6") | Yes — run | Unloaded movements keep their reps and suggest adding weight or slowing down. |
| "Today" stayed yesterday in a tab left open past midnight | Yes | A timer rolls the date at local midnight. |
| "New PR" could mark a repeated baseline | Yes | Compared only with strictly earlier sessions. |

Six tests were added for these (56 total).

## 2. A serious bug, found by using it the way a regular user does

Opening **Log** again after saving a workout showed the sets that had *just been
saved*; saving again created a duplicate session. Cause: the scaffold had turned on
`cacheComponents`, which keeps visited pages alive in hidden form. Earlier checks
(and the first-run test) always loaded a fresh page, so none of them could see it.

- **Fixed on `main` and deployed** as a hotfix (the two settings are off, with a comment
  explaining why).
- **Regression test** in `scripts/verify/flows-check.js`: save a workout, tap Log
  again, assert nothing is pre-filled. Verified to *fail* with the old config
  (2 stale fields) and pass with the fix.

## 3. What was added so people keep using it

Chosen from the reviewer's ranking and from asking "what goes wrong in month three?":

| Problem in real use | Feature |
|---|---|
| Phone locks or you tap another tab and lose the sets you typed | **Drafts** save as you type; Today offers *Resume*; *Start over* clears it |
| A typo in a logged weight meant deleting the whole session | **Edit any past session**, **undo** after delete, optional **session notes** |
| Months of history lives in one browser | **Backup** (.json download) and **restore** with a preview and validation |
| No reminder to actually go | **Calendar file (.ics)**: weekly workouts with an alert 30 minutes before (no server means no push notifications — your calendar does it) |
| Typing every set from scratch | **Same again** copies the last set; arrow keys nudge a value |
| Dead time between sets | **Rest timer** (1:00 / 1:30 / 2:00 / 3:00), counts against the clock so a locked phone is still right; vibration + beep + a message when done |
| Mental math at the rack | **Plate calculator** (per-side plates for lb and kg, honest about impossible weights) |
| A machine is taken / an injury | **Swap exercise** for one that trains the same muscles |
| "Am I actually getting stronger?" | **Per-lift history** with a trend line, dated sets and volume |
| Feels like a website, not an app | **Install to home screen** (manifest + icons) |

Deliberately **not** added: accounts or sync, social features, an AI coach or
readiness score, nutrition tracking, compulsory notifications, custom exercises
(a larger data-model change), and offline caching (risky without a careful strategy).

## Verification

All of the above is covered by `npm test` (56 tests) and the browser scripts in
`scripts/verify/`: `flows-check.js` (the three flows, keyboard-only journey, the
regression test), `features-check.js` (every feature above, including real file
download/upload and a fake clock for the timer), and `a11y-check.js` (axe-core on
26 screens and states, including every new dialog and error state).
