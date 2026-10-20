# Browser checks

Playwright scripts that drive the real app. They are not part of the build or `npm test`;
install the tools somewhere outside the repo and point `NODE_PATH` at them.

```bash
npm i --prefix /tmp/ironlog-tools playwright axe-core && npx --prefix /tmp/ironlog-tools playwright install chromium
npm run build && npx next start -p 3200 &
NODE_PATH=/tmp/ironlog-tools/node_modules BASE=http://localhost:3200 node scripts/verify/v3-check.js
NODE_PATH=/tmp/ironlog-tools/node_modules BASE=http://localhost:3200 node scripts/verify/a11y-check.js
```

- `v3-check.js` — 37 checks across every journey on a 390px phone: first visit and its
  error, the guided workout (bad weight kept and flagged, −/+ steps, sets, rest timer,
  reload mid-workout, focus on the next heading, swap, skip, save), a mostly-unfinished
  workout being repeated, weight raised after "Easy", a 6-week comeback, "tired",
  check-in errors and save, the calorie estimate's errors and result, keyboard-only
  onboarding, and no page errors. Screenshots go to `$SHOTS` (default `/tmp/v3shots`).
- `a11y-check.js` — axe-core (WCAG 2.0/2.1 A + AA + best practices) on 13 states at
  390px and 1440px.

Set `BASE` to the live URL to check production.
