# Verification scripts

Real-browser checks used while building. They are not part of the app's build.

```bash
npm i --no-save playwright axe-core
npx playwright install chromium
npm run dev    # or set BASE to the deployed URL

node scripts/verify/flows-check.js   # the three flows end to end
node scripts/verify/a11y-check.js    # axe-core on every screen and state
```

`flows-check.js` covers: first visit (goal error, arrow keys, default days),
persistence across reload, the form's errors (missing reps, fractional reps,
future date) with typed values kept and focus moved, saving and the success
message, the recommendation moving on, progression hints and "Use suggestion",
coming back three days later (browser clock moved), progress and the calendar,
unit conversion, delete with a confirm (Escape cancels), reset, corrupt
storage, a **keyboard-only** journey, and no sideways scroll at 390px.

`a11y-check.js` runs axe-core (WCAG 2.0/2.1 A + AA + best practices) on 16
screens/states at 390px and 1440px.
