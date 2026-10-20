# How similar tools welcome a new user

Three subagents each studied one tool from public material only (help centers,
store listings, third-party onboarding teardowns). None could install the apps,
so every claim below is sourced or marked as inferred. Where a source couldn't
be opened or contradicted another, the agent said so, and so do we.

## Fitbod — goal-based workout generator

- **Asks:** experience, goal (Build Muscle / Get Lean / Get Stronger), and
  available equipment. A teardown counts 14 onboarding steps (not itemized).
  Days per week is set later in "My Plan".
- **First useful thing:** a generated first workout, personalized from the
  answers — but a paywall sits between the generated workout and starting it
  (ScreensDesign), and a third-party source says new users get 3 free workouts
  (unverified on Fitbod's own pages).
- **Brings people back:** per-muscle recovery (0–100%, shown as a heat map)
  drives what to train next; a weekly workout goal drives reminders and
  streaks that count consecutive weeks and reset to 0 with no grace period;
  estimated 1RM tracks progress. ([Fitbod help center](https://help.fitbod.me),
  [ScreensDesign](https://screensdesign.com/showcase/fitbod-gym-fitness-planner))
- **Good:** gets from questions to a concrete workout, and *explains why*
  through the recovery map. **Weak:** 14 steps plus a paywall before starting;
  detailed equipment selection adds length.

## Strong — workout logger

- **Asks:** sign-up first (Apple sign-in, or username/email/password), with no
  goal quiz. Account creation is described as mandatory and flagged as friction
  ([ScreensDesign teardown](https://screensdesign.com/showcase/strong-workout-tracker-gym-log)).
  Sources conflicted on the trial/paywall details.
- **First useful thing:** logging a first workout takes roughly 10–15 taps
  (inferred). The first screen "could feel slightly empty"; example templates
  exist but no first workout is highlighted.
- **Logging:** fast set-by-set entry with an automatic rest timer; PRs and
  charts live one tap away on an exercise detail screen, advanced charts
  premium. Reminders and streaks: not found.
- **Good:** a clean main log with deeper data one tap away. **Weak:** forced
  sign-up and thin first-run guidance; no recommendation or "what's next".

## Nike Training Club — guided programs

- **Asks:** a welcome screen (Join Us / Sign In), then a full Nike account
  (email verification, date of birth) *before* any personalization, then
  gear preference and weekly workout frequency — about 1.5–2 minutes in the
  recorded flow ([ScreensDesign](https://screensdesign.com/apps/nike-training-club-wellness/)).
  A 2020 teardown summary (not directly readable) says goals weren't asked up
  front; plans with a questionnaire come later.
- **Brings people back:** badges and trophies for total workouts, frequency, and
  weekly/monthly streaks ([Nike](https://www.nike.com/gb/ntc-time-to-move));
  reminders with little granularity; 4–6 week plans that adjust (Nike JP).
  Next-workout logic: not found.
- **Good:** very few questions — frequency is the one input driving
  scheduling. **Weak:** a sign-up wall before the first workout; goal choice is
  disconnected from "do something now".

## What this decided for our tool

| Decision | Borrowed from | Avoided |
|---|---|---|
| First visit asks only **goal + days per week**, then shows today's workout | Fitbod's goal → first workout; Nike's frequency question | Fitbod's 14 steps and equipment quiz; Strong/Nike sign-up walls |
| **No account at all** — data stays on the device, saying so plainly | — | Every tool's account gate before value |
| A visible **"why this workout"** line on the recommendation | Fitbod's recovery explanation | An opaque "AI picked it" feel |
| **Weekly** target and a streak of consecutive weeks hitting it | Fitbod/Nike weekly streaks | Daily streaks that punish a rest day |
| Fast per-set logging with **last-time hints** and PRs one tap away | Strong's clean logger | Strong's empty first screen |
| Never a dead-end empty screen: Progress shows the plan, not blanks | Strong's weakness, inverted | — |

*These are agent-compiled public-source findings, not hands-on use of the apps.*
