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
