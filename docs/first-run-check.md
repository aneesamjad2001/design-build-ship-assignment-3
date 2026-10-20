# First-run check

After deploying, a subagent played a **brand-new user** of the live site
(`https://design-build-ship-assignment-3.vercel.app`). It was told not to read
any code, only to judge what a person sees. It drove a real browser (Playwright)
on a phone-sized screen (390×844) and a desktop (1440×900), with the goal:
*"pick a goal, get a workout, log my first session, then come back later and see
that it remembers me and tells me what to do next."* It tried to make mistakes on
purpose, simulated coming back 3 and 6 days later, explored Progress and Plan, and
tried a keyboard-only pass.

**This is agent feedback, not human testing.** It could not test screen readers,
other browsers, or real devices.

## What worked (the agent's words, condensed)

- After 5 seconds it understood the app: "your gym coach", pick a goal and days,
  "no sign-up", "stays on this device".
- Two taps from a cold start to a workout; days default to 4, so no dead end.
- The log form was "the strongest part": a top summary ("1 thing needs fixing…
  Everything you typed is still here"), each message under the offending set
  saying what to do, typed values kept, invalid fields marked, focus moved to
  the first problem, and future dates blocked.
- After saving it saw "Upper body saved, 6 sets logged" and the next workout with
  a plain-language "Why".
- Coming back worked: "Welcome back, last session lower body, 3 days ago",
  Upper body recommended because it was last trained 6 days ago, and last-time
  numbers on each lift.

## Problems found, and what was done

| # | Finding | Severity | Verified? | Decision |
|---|---|---|---|---|
| 1 | Pressing Save with nothing entered: the message sat ~2,500px below the field that got focus, so on a phone only a focused box and no explanation was visible | medium-high | **Yes** — measured at 2,561px off-screen | **Fixed.** The message now appears in the alert at the top of the form, and focus moves to that alert. |
| 2 | "Last 115 × 10 → try 120 × 6" looked like a bug (why do reps drop?) | medium | Yes | **Fixed.** It now says "(top of the range, so add weight)". |
| 3 | Keyboard: focus reset to the top after navigating; ~66 Tab presses to reach Save; goal-card focus ring looked thin and white | medium | Partly: the ring really did start white — my own color transition faded it in over ~150ms | **Fixed.** Focus moves to the new page's heading after navigation and after onboarding; a "Skip to Save session" link; focus styles no longer transition, so the yellow ring shows instantly. |
| 4 | After onboarding on mobile, the page stayed scrolled to the bottom | low-medium | Yes | **Fixed** with the same focus-and-scroll-to-top. |
| 5 | After the very first save: "Welcome back" and "1 days at the gym" | low | Yes | **Fixed.** "Nice work today" right after a session; correct singular/plural. |
| 6 | Progress is thin after one session (best = last, no trend) | low | Yes | **Not changed.** It fills in as you train; a trend chart is out of scope for "keep it simple". |
| 7 | Fixed bottom nav overlaps content; shows during onboarding | low | Content has room to scroll past it; showing the nav during onboarding is deliberate (never a dead end — Log/Progress explain "Pick a goal first") | **Not changed.** |
| 8 | Plan: button label flips between "Save plan"/"Save changes"; message below the button; rotation preview "didn't change" when switching goal | low | Label/placement yes. The preview is **not a bug**: Build muscle and Get stronger have the *same* 4-day rotation (Upper·Lower·Upper·Lower) — they differ in sets and reps, which the preview didn't show | **Fixed:** constant "Save changes", message above the button, and the goal's rep scheme now shown under the rotation. |
| — | "Reset everything" may not confirm | — | **Wrong** — it opens a confirm dialog (an existing test covers it) | No change. |

## Questions a new user would still have (noted, not built)

Export/move data to another phone; swapping an exercise you can't do; why these
exact exercises for the goal. The first two are deliberately out of scope
(accounts and sync come next week; simplicity). "What counts toward the streak?"
and "what if I train on a different day?" are now answered in one line each on
the Today screen.

## Evidence

- `before-empty-save.jpg` / `after-empty-save.jpg` — where the empty-save message
  was, and where it is now (390px wide).
- `before-first-save-mobile.jpg` — the screen right after the first save, before
  the "Nice work today" and singular/plural fixes.
