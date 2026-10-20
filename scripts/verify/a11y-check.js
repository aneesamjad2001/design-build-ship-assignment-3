const { chromium } = require("playwright");
const fs = require("fs");
const axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
/* axe-core audit of every screen and state.
 *   npm i --no-save playwright axe-core && node scripts/verify/a11y-check.js
 */
const BASE = process.env.BASE || "http://localhost:3000";
const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toLocaleDateString("en-CA"); };
const seed = { version: 1, profile: { goal: "muscle", daysPerWeek: 4, unit: "lb", createdAt: 1 }, sessions: [
  { id: "z", date: d(8), focus: "upper", createdAt: 0, unit: "lb", entries: [{ exerciseId: "bench-press", sets: [{ weight: 125, reps: 8 }] }] },
  { id: "a", date: d(3), focus: "upper", createdAt: 1, unit: "lb", note: "Shoulder felt tight", entries: [{ exerciseId: "bench-press", sets: [{ weight: 135, reps: 8 }, { weight: 135, reps: 7 }] }] },
  { id: "b", date: d(1), focus: "lower", createdAt: 2, unit: "lb", entries: [{ exerciseId: "squat", sets: [{ weight: 185, reps: 8 }] }] },
] };
async function run(page, label) {
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async () => await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } }));
  const v = r.violations.map((x) => `${x.id} (${x.impact}) ×${x.nodes.length}: ${x.nodes[0].html.slice(0, 90)}`);
  console.log((v.length ? "✗ " : "✓ ") + label + (v.length ? "\n    " + v.join("\n    ") : ""));
  return v.length;
}
(async () => {
  const b = await chromium.launch(); let bad = 0;
  for (const [w, h, tag] of [[390, 844, "mobile"], [1440, 900, "desktop"]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} first visit`);
    await page.getByRole("button", { name: "Show my first workout" }).click();
    bad += await run(page, `${tag} first visit with error`);
    await page.evaluate((s) => localStorage.setItem("ironlog:v1", JSON.stringify(s)), seed);
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} today (returning)`);
    await page.goto(BASE + "/log", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} log form`);
    await page.getByLabel(/set 1, weight/).first().fill("abc");
    await page.getByRole("button", { name: "Save session" }).click();
    bad += await run(page, `${tag} log form with errors`);
    await page.goto(BASE + "/progress", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} progress`);
    await page.locator("summary", { hasText: /Upper body|Lower body/ }).first().click();
    await page.getByRole("button", { name: "Delete session" }).click();
    await page.waitForSelector("dialog[open]");
    await page.waitForTimeout(600); // let the open animation finish so axe measures settled colors
    bad += await run(page, `${tag} progress with confirm dialog open`);
    await page.keyboard.press("Escape");
    await page.goto(BASE + "/plan", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} plan (goal, reminders, backup)`);
    await page.getByRole("button", { name: "Download calendar file" }).waitFor();
    for (const day of ["Monday", "Tuesday", "Thursday", "Friday"]) await page.getByLabel(day).uncheck({ force: true });
    await page.getByRole("button", { name: "Download calendar file" }).click();
    await page.waitForTimeout(600); // let the tiles finish fading so axe measures settled colors
    bad += await run(page, `${tag} plan with a reminder error`);
    // expanded lift history and session detail with note + edit link
    await page.goto(BASE + "/progress", { waitUntil: "networkidle" });
    await page.getByText("Barbell bench press").first().click();
    await page.locator("summary", { hasText: "Upper body" }).first().click();
    bad += await run(page, `${tag} progress with lift history + session detail expanded`);
    // edit mode
    await page.goto(BASE + "/log?edit=a", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} edit session`);
    // new log: swap open, plate calculator open, rest timer showing
    await page.goto(BASE + "/log", { waitUntil: "networkidle" });
    await page.getByLabel("Workout").selectOption("upper");
    await page.getByRole("button", { name: /^Swap Barbell bench press/ }).click();
    bad += await run(page, `${tag} log with swap open + rest timer`);
    await page.getByRole("button", { name: "Plate calculator" }).click();
    await page.waitForSelector("dialog[open]");
    await page.getByLabel(/Total weight on the bar/).fill("225");
    await page.waitForTimeout(600);
    bad += await run(page, `${tag} plate calculator open`);
    await page.keyboard.press("Escape");
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `\n${bad} screens with violations` : "\nNo axe violations on any screen/state");
})();
