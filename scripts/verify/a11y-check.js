const { chromium } = require("playwright");
const fs = require("fs");
const axeSrc = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
/* axe-core audit of every screen and state of the v3 app, at phone and desktop width.
 *   NODE_PATH=<dir with playwright + axe-core>/node_modules BASE=http://localhost:3200 node scripts/verify/a11y-check.js
 */
const BASE = process.env.BASE || "http://localhost:3000";
const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toLocaleDateString("en-CA"); };
const seed = {
  version: 2,
  profile: { lookId: "lean-athletic", time: "standard", unit: "lb", createdAt: 1 },
  workouts: [
    { id: "a", date: d(9), key: "A", unit: "lb", createdAt: 1, exercises: [{ exerciseId: "goblet-squat", setsDone: 3, setsPlanned: 3, weight: 35, feedback: "easy" }, { exerciseId: "plank", setsDone: 3, setsPlanned: 3, weight: null }] },
    { id: "b", date: d(3), key: "B", unit: "lb", createdAt: 2, note: "Busy gym", exercises: [{ exerciseId: "hip-thrust", setsDone: 3, setsPlanned: 3, weight: 95 }, { exerciseId: "lat-pulldown", setsDone: 0, setsPlanned: 3, weight: null, skipped: true }] },
  ],
  weights: { "goblet-squat": { weight: 40, unit: "lb", rightStreak: 0, updatedAt: d(9) } },
  checkins: [
    { id: "c1", date: d(40), unit: "lb", weight: 180, waist: 34, createdAt: 1 },
    { id: "c2", date: d(5), unit: "lb", weight: 178, waist: 33.5, createdAt: 2 },
  ],
  nutrition: null,
};
async function run(page, label) {
  await page.waitForTimeout(600); // let transitions settle so colours are final
  await page.evaluate(axeSrc);
  const r = await page.evaluate(async () => await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } }));
  const v = r.violations.map((x) => `${x.id} (${x.impact}) ×${x.nodes.length}: ${x.nodes[0].html.slice(0, 100)}`);
  console.log((v.length ? "✗ " : "✓ ") + label + (v.length ? "\n    " + v.join("\n    ") : ""));
  return v.length;
}
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  for (const [w, h, tag] of [[390, 844, "mobile"], [1440, 900, "desktop"]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} first visit`);
    await page.getByRole("button", { name: "Show my plan" }).click();
    bad += await run(page, `${tag} first visit with error`);
    await page.evaluate((s) => localStorage.setItem("ironlog:v2", JSON.stringify(s)), seed);
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} today (returning)`);
    await page.getByRole("button", { name: "Start workout" }).click();
    await page.waitForURL("**/workout");
    await page.getByRole("heading", { level: 1 }).waitFor();
    bad += await run(page, `${tag} workout: exercise card`);
    const weight = page.getByLabel(/Weight \(lb\)/);
    if (await weight.count()) {
      await weight.fill("abc");
      await page.getByRole("button", { name: "Next exercise" }).click();
      bad += await run(page, `${tag} workout: weight error`);
      await weight.fill("40");
    }
    await page.getByRole("button", { name: /^Set 1 of/ }).click();
    bad += await run(page, `${tag} workout: set done + rest timer + feel`);
    await page.getByRole("button", { name: /Swap it/ }).click();
    bad += await run(page, `${tag} workout: swap dialog`);
    await page.keyboard.press("Escape");
    for (let i = 0; i < 12 && !(await page.getByRole("heading", { name: /Nice work|Finish workout/ }).count()); i++) {
      await page.getByRole("button", { name: "Skip this one" }).click();
      await page.waitForTimeout(120);
    }
    bad += await run(page, `${tag} workout: finish`);
    await page.goto(BASE + "/progress", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} progress`);
    await page.locator("summary").first().click();
    bad += await run(page, `${tag} progress: workout open`);
    await page.goto(BASE + "/checkin", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Save check-in" }).click();
    bad += await run(page, `${tag} check-in with error`);
    await page.goto(BASE + "/plan", { waitUntil: "networkidle" });
    bad += await run(page, `${tag} plan`);
    await page.getByRole("button", { name: "Show my estimate" }).click();
    bad += await run(page, `${tag} plan: estimate errors`);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? `\n${bad} violation group(s)` : "\nNo violations.");
  process.exit(bad ? 1 : 0);
})();
