# Decisions

Who decided what, so it can be explained honestly in class.

## The author decided
- **The tool:** a gym tool that takes a goal ("what kind of body I want") and
  recommends exercises, then tracks days at the gym and exercises done and
  recommends what to do next based on that.
- **Four physique goals** (build muscle / lean & toned / get stronger /
  athletic) rather than three goals or body-part focus.
- **First visit asks only goal + days per week.**
- **All four retention hooks:** next-workout recommendation, weekly target +
  streak, progress on lifts, and a days-at-the-gym calendar.
- **The "Iron" visual direction** (industrial, near-black, safety yellow) over a
  chalkboard or locker-room look.

## The agent proposed (the author has not yet reviewed these in detail)
- Recommendations as **plain rules, not AI** — required by "no external APIs",
  and it keeps the "why" explainable.
- **Weekly (not daily) streaks**, after research showed Fitbod and Nike do the same.
- **A barbell that loads plates** as the week's progress visual.
- Logging rows in a logbook layout (weight | reps per set) instead of stacking
  every input vertically — a deliberate reading of "one column": fields never
  sit in side-by-side *columns of the page*, but a set pairs weight and reps.
- Hiding the stats card on the very first visit (a card of zeros is an empty
  screen in disguise) and putting the workout before the stats on return.
- Dropping the stencil numeral font after seeing it was hard to read.
- `lb` as the default unit with a kg switch that converts saved weights.

## Cut for simplicity
Accounts and sync (next week), equipment and experience questions on first
visit, editing past sessions (delete only), rest timer, exercise videos,
per-set effort ratings, notifications.

## Version 3: rebuilt around the author's own problem (Oct 20)

**The author decided:**
- **The real problem:** "I don't go to the gym often, and when I go I have no plan."
  Logging every set is a chore nobody keeps up; the app should say exactly what to do.
- **Pick a body, not muscles:** "I just want to tell it what kind of body I'm aiming
  for." No shoulder/back talk, no body map.
- **No equipment question:** assume a standard gym.
- **Keep the honest note** (training controls training; food, sleep and time matter;
  "toned" depends on body fat).
- **Build four extras:** food and sleep tips, "How are you feeling?", a monthly body
  check-in, and meal/calorie/weight tracking.
- Build it in small pieces with commits, so the work can be reviewed as it goes.

**The agent proposed (and the author accepted by building on it):**
- Three repeating full-body workouts (A/B/C) not tied to weekdays, so a missed week
  leaves no gap; easing back in after 2+ weeks; repeating a workout less than half done.
- "Finished" as one tap per set, plus remembered weights moved by Easy / Just right /
  Hard, instead of a logbook.
- Guided one-exercise-at-a-time gym mode with figures, how-to text, swap and skip.
- Dropping streaks, which punish the irregular gym-goer the app is for.
- For the fourth extra: an **optional calorie and protein estimate** (ranges, adults
  only, never below resting needs) **instead of meal logging and weight goals** —
  logging needs a food database (an outside service the assignment rules out) and is
  the chore the app removes; weight targets were flagged as risky for body image.
  The author asked for it anyway; this is the agent's call, explained in the README.

**Cut for simplicity:** muscle and equipment questions, streaks, meal logging, weight
goals, daily sleep logs, exercise videos, accounts and sync.
