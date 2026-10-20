# Ironlog — project context

A gym coach for one person on one device, built for someone who goes to the gym
irregularly and arrives with no plan: pick the kind of body you're aiming for, get an
exact workout right away, do it one exercise at a time, and come back whenever to be
told what's next. Built for MPCS 51238 Assignment 3 (Patterns & Flows).

## Hard constraints (from the assignment)
- Next.js + Tailwind only. **No database, accounts, backend, or external APIs.**
  No new dependencies without a strong reason.
- Data lives in the browser's `localStorage` (keys `ironlog:v2`, and
  `ironlog:workout:v2` for a workout in progress). Never send it anywhere.
- The planning logic is plain rules (`lib/workouts.ts`, `lib/adapt.ts`), not AI. Keep
  every "why" on screen true.
- Every form: one column, a real label on every field, errors **next to the field**
  that say what to do next, and **keep what the person typed** on error.
- Everything must work with a keyboard; contrast is checked, not assumed.
- This file is the context file. `CLAUDE.md` holds only `@AGENTS.md`, because Claude Code
  loads CLAUDE.md, not AGENTS.md, by itself. Put nothing else in CLAUDE.md.

## Product rules (from the author)
- The person picks a **look in plain words**. Never ask them to pick muscles or
  equipment; assume a standard commercial gym and offer a swap when something's busy.
- No streaks, no "you missed" guilt. A gap leads to an easier workout, not a warning.
- Be honest: training builds toward a look, it never promises one (`LOOK_NOTE`,
  `CAN_AND_CANT` in `lib/looks.ts`).
- No food logging or weight targets. The calorie estimate is opt-in, ranges only,
  adults only, never below resting needs.

## Design: "Iron"
Near-black concrete, safety-yellow accent used **only** for the primary action and the
focus ring (selected choices are white). Big Shoulders for display, Barlow for body.
Tokens live in `app/globals.css`; use the shared components in `components/` — do not
restyle buttons or fields ad hoc.

## Layout
- `app/` — routes: `/` Today (also first-visit onboarding), `/workout`, `/progress`,
  `/checkin`, `/plan`
- `lib/` — pure, tested logic: `looks`, `library`, `workouts`, `adapt`, `data`,
  `inprogress`, `progress`, `checkin`, `nutrition`, `exerciseText`, `poses`, `backup`
- `components/` — shared UI
- `flows.md` — the flow diagram (also in the README); `docs/` — research, decisions,
  first-run checks
- `scripts/verify/` — Playwright journey check and axe audit (not part of the build)

## Commands
`npm run dev` · `npm run build` · `npm run lint` · `npm test` (Node's built-in test runner)

## Gotchas
- Keep `cacheComponents` / `partialPrefetching` **off** in `next.config.ts`: they keep
  old screens alive with stale form state.
- `react-hooks/purity` flags `Date.now()` in components; use `nowMs()` from `lib/clock.ts`
  in handlers.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
