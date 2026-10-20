# Ironlog — project context

A gym tool for one person on one device: pick a physique goal and training days,
get today's workout immediately, log sessions, and get told what to train next.
Built for MPCS 51238 Assignment 3 (Patterns & Flows). Design, Build, Ship.

## Hard constraints (from the assignment)
- Next.js + Tailwind only. **No database, accounts, backend, or external APIs.**
  No new dependencies without a strong reason.
- Data lives in the browser's `localStorage` (key `ironlog:v1`). Never send it anywhere.
- The recommendation logic is plain rules (`lib/recommend.ts`), not AI — keep it explainable.
- Every form: one column, a real label on every field, errors **next to the field**
  that say what to do next, and **keep what the person typed** on error.
- Everything must work with a keyboard; contrast is checked, not assumed.
- No CLAUDE.md — this file is the context file.

## Design: "Iron"
Near-black concrete, safety-yellow accent used **only** for the primary action and
the focus ring. Heavy condensed uppercase display type (Big Shoulders Display),
Barlow for body. Tokens live in `app/globals.css`; use the shared components in
`components/` — do not restyle buttons/fields ad hoc.

## Layout
- `app/` — routes: `/` Today (also the first-visit onboarding), `/log`, `/progress`, `/plan`
- `lib/` — pure, tested logic: `exercises`, `plans`, `recommend`, `stats`, `storage`
- `components/` — shared UI (Button, Field, NavBar, WeekBar, …)
- `flows.md` — the flow diagrams (also in the README); `docs/research.md` — onboarding research

## Commands
`npm run dev` · `npm run build` · `npm run lint` · `npm test` (Node's built-in test runner)

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
