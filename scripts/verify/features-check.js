/* Real-browser checks for the features added after the first release.
 *   npm i --no-save playwright && node scripts/verify/features-check.js   (BASE defaults to http://localhost:3000)
 */
const { chromium } = require("playwright");
const fs = require("fs");
const BASE = process.env.BASE || "http://localhost:3000";
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };
const d = (n) => { const x = new Date(); x.setDate(x.getDate() - n); return x.toLocaleDateString("en-CA"); };
const sets = (w, reps) => reps.map((r) => ({ weight: w, reps: r }));
const seed = (extra = []) => ({
  version: 1,
  profile: { goal: "muscle", daysPerWeek: 4, unit: "lb", createdAt: 1 },
  sessions: [
    { id: "s1", date: d(9), focus: "upper", createdAt: 1, unit: "lb", entries: [{ exerciseId: "bench-press", sets: sets(125, [8, 8, 7]) }, { exerciseId: "barbell-row", sets: sets(105, [8, 8]) }] },
    { id: "s2", date: d(5), focus: "upper", createdAt: 2, unit: "lb", entries: [{ exerciseId: "bench-press", sets: sets(130, [8, 8, 8]) }] },
    { id: "s3", date: d(2), focus: "upper", createdAt: 3, unit: "lb", note: "Shoulder felt tight", entries: [{ exerciseId: "bench-press", sets: sets(135, [8, 8, 6]) }] },
    ...extra,
  ],
});
const goHome = async (ctx, data = seed()) => {
  const p = await ctx.newPage();
  await p.goto(BASE + "/", { waitUntil: "networkidle" });
  await p.evaluate((s) => { localStorage.clear(); localStorage.setItem("ironlog:v1", JSON.stringify(s)); }, data);
  return p;
};
// the seed has three upper-body sessions, so the app rightly recommends lower body; pick upper explicitly
const openLogAsUpper = async (p) => {
  await p.goto(BASE + "/log", { waitUntil: "networkidle" });
  await p.getByLabel("Workout").selectOption("upper");
};
const text = async (p) => (await p.locator("body").textContent()) || "";

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  /* ---------- DRAFT: type, leave, come back ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await goHome(ctx);
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await openLogAsUpper(p);
    await p.getByLabel("Barbell bench press, set 1, weight in lb").fill("140");
    await p.getByLabel("Barbell bench press, set 1, reps").fill("8");
    await p.getByLabel("Notes").fill("felt strong");
    await p.locator('nav[aria-label="Main"] a', { hasText: "Progress" }).click(); // an accidental tap elsewhere
    await p.waitForURL(BASE + "/progress");
    await p.locator('nav[aria-label="Main"] a', { hasText: "Today" }).click();
    await p.waitForSelector("text=You have an unfinished workout");
    check(true, "");
    await p.getByRole("link", { name: "Resume" }).click();
    await p.waitForSelector("text=Resumed your unfinished workout");
    check((await p.getByLabel("Barbell bench press, set 1, weight in lb").inputValue()) === "140", "draft: weight not restored");
    check((await p.getByLabel("Barbell bench press, set 1, reps").inputValue()) === "8", "draft: reps not restored");
    check((await p.getByLabel("Notes").inputValue()) === "felt strong", "draft: note not restored");
    // reload keeps it too
    await p.reload({ waitUntil: "networkidle" });
    check((await p.getByLabel("Barbell bench press, set 1, reps").inputValue()) === "8", "draft: lost on reload");
    // start over wipes it
    await p.getByRole("button", { name: "Start over" }).click();
    check((await p.getByLabel("Workout").inputValue()) === "lower", "draft: Start over should return to today's recommended workout");
    check((await p.evaluate(() => localStorage.getItem("ironlog:draft:v1"))) === null, "draft: Start over left the saved draft");
    // saving clears the draft
    await p.getByLabel("Workout").selectOption("upper");
    await p.getByLabel("Barbell bench press, set 1, weight in lb").fill("140");
    await p.getByLabel("Barbell bench press, set 1, reps").fill("8");
    await p.getByRole("button", { name: "Save session" }).click();
    await p.waitForSelector("text=saved");
    check((await p.evaluate(() => localStorage.getItem("ironlog:draft:v1"))) === null, "draft: not cleared after saving");
    check(!(await text(p)).includes("You have an unfinished workout"), "draft: resume banner still showing after save");
    await ctx.close();
  }

  /* ---------- EDIT + UNDO DELETE + NOTES + LIFT HISTORY ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await goHome(ctx);
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await p.goto(BASE + "/progress", { waitUntil: "networkidle" });
    // lift history with a trend
    await p.getByText("Barbell bench press").first().click();
    check((await p.locator('svg[role="img"]').count()) >= 1, "history: no trend graphic for a lift with 3 sessions");
    check((await text(p)).includes("Top set weight went from 125 to 135 lb over 3 sessions"), "history: trend text missing/wrong");
    // note + edit
    await p.locator("summary", { hasText: "Upper body" }).first().click();
    check((await text(p)).includes("Shoulder felt tight"), "notes: session note not shown");
    await p.getByRole("link", { name: "Edit session" }).first().click();
    await p.waitForSelector("text=Edit session");
    const w = p.getByLabel("Barbell bench press, set 3, reps");
    check((await w.inputValue()) === "6", "edit: form not prefilled from the session");
    await w.fill("7");
    await p.getByRole("button", { name: "Save changes" }).click();
    await p.waitForURL(BASE + "/progress");
    await p.waitForSelector("text=updated");
    check((await p.evaluate(() => JSON.parse(localStorage.getItem("ironlog:v1")).sessions.find((s) => s.id === "s3").entries[0].sets[2].reps)) === 7, "edit: change not saved");
    check((await p.evaluate(() => JSON.parse(localStorage.getItem("ironlog:v1")).sessions.length)) === 3, "edit: created a duplicate instead of updating");
    // editing a deleted session says so, with a way out
    await p.goto(BASE + "/log?edit=nope", { waitUntil: "networkidle" });
    check((await text(p)).includes("isn't there any more"), "edit: missing session not explained");
    // delete → undo
    await p.goto(BASE + "/progress", { waitUntil: "networkidle" });
    await p.locator("summary", { hasText: "Upper body" }).first().click();
    await p.getByRole("button", { name: "Delete session" }).click();
    await p.getByRole("button", { name: "Delete", exact: true }).click();
    await p.waitForSelector("text=deleted");
    check((await p.evaluate(() => JSON.parse(localStorage.getItem("ironlog:v1")).sessions.length)) === 2, "undo: delete did not delete");
    await p.getByRole("button", { name: "Undo" }).click();
    check((await p.evaluate(() => JSON.parse(localStorage.getItem("ironlog:v1")).sessions.length)) === 3, "undo: did not restore the session");
    await ctx.close();
  }

  /* ---------- IN-WORKOUT TOOLS ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await goHome(ctx);
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await openLogAsUpper(p);
    // same again
    await p.getByLabel("Barbell bench press, set 1, weight in lb").fill("135");
    await p.getByLabel("Barbell bench press, set 1, reps").fill("8");
    await p.getByRole("button", { name: /^Same again/ }).first().click();
    check((await p.getByLabel("Barbell bench press, set 2, weight in lb").inputValue()) === "135", "same again: weight not copied");
    check((await p.getByLabel("Barbell bench press, set 2, reps").inputValue()) === "8", "same again: reps not copied");
    // arrow keys nudge values
    await p.getByLabel("Barbell bench press, set 3, weight in lb").focus();
    await p.keyboard.press("ArrowUp");
    check((await p.getByLabel("Barbell bench press, set 3, weight in lb").inputValue()) === "5", "arrow up: weight not stepped");
    // swap keeps typed sets
    await p.getByRole("button", { name: /^Swap Barbell bench press/ }).click();
    await p.getByLabel("Swap Barbell bench press for…").selectOption("incline-db-press");
    check((await p.locator("legend", { hasText: "Incline dumbbell press" }).count()) === 1, "swap: exercise not replaced");
    check((await p.getByLabel("Incline dumbbell press, set 1, weight in lb").inputValue()) === "135", "swap: typed sets were lost");
    // plate calculator
    await p.getByRole("button", { name: "Plate calculator" }).click();
    await p.waitForSelector("dialog[open]");
    await p.getByLabel(/Total weight on the bar/).fill("225");
    check((await text(p)).includes("2 × 45 on each side"), "plates: 225 lb not 2 × 45");
    await p.getByLabel(/Total weight on the bar/).fill("100");
    check((await text(p)).includes("1 × 25 + 1 × 2.5 on each side"), "plates: 100 lb wrong");
    await p.getByLabel(/Total weight on the bar/).fill("abc");
    check((await text(p)).includes("Enter the total weight on the bar"), "plates: bad input error missing");
    await p.keyboard.press("Escape");
    check((await p.locator("dialog[open]").count()) === 0, "plates: Escape did not close");
    check(await p.evaluate(() => document.activeElement?.textContent === "Plate calculator"), "plates: focus not returned to the button");
    await ctx.close();
  }

  /* ---------- REST TIMER (fake clock) ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.clock.install({ time: new Date() });
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.evaluate((s) => localStorage.setItem("ironlog:v1", JSON.stringify(s)), seed());
    await p.goto(BASE + "/log", { waitUntil: "networkidle" });
    await p.getByRole("button", { name: "Start a 1:00 rest" }).click();
    check(await p.getByRole("timer").isVisible(), "timer: not running after start");
    await p.clock.fastForward(20_000);
    await p.waitForTimeout(400);
    const mid = await p.getByRole("timer").textContent();
    check(/0:[34]\d/.test(mid || ""), `timer: should read ~0:40 after 20s, got ${mid}`);
    await p.getByRole("button", { name: "Add 30 seconds" }).click();
    await p.clock.fastForward(100_000);
    await p.waitForTimeout(400);
    check((await text(p)).includes("Rest over — next set"), "timer: no 'Rest over' message when it ended");
    await p.getByRole("button", { name: "Dismiss" }).click();
    check(await p.getByRole("button", { name: "Start a 1:00 rest" }).isVisible(), "timer: did not return to idle");
    await ctx.close();
  }

  /* ---------- BACKUP, RESTORE, REMINDERS ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const p = await goHome(ctx);
    p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await p.goto(BASE + "/plan", { waitUntil: "networkidle" });
    const [dl] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Download a backup" }).click()]);
    const file = await dl.path();
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    check(/^ironlog-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), "backup: odd file name " + dl.suggestedFilename());
    check(backup.app === "ironlog" && backup.sessions.length === 3 && backup.profile.goal === "muscle", "backup: contents wrong");
    // wipe everything, then restore
    await p.getByRole("button", { name: "Reset everything" }).click();
    await p.getByRole("button", { name: "Erase everything" }).click();
    await p.waitForURL(BASE + "/");
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    check((await text(p)).includes("What are you training for?"), "backup: reset did not return to first visit");
    // a profile is needed to reach Plan, so create one, then restore over it
    await p.getByText("Lean & toned").click();
    await p.getByRole("button", { name: "Show my first workout" }).click();
    await p.waitForSelector("text=Log this workout");
    await p.goto(BASE + "/plan", { waitUntil: "networkidle" });
    // a bad file is explained next to the field
    fs.writeFileSync("/tmp/not-a-backup.json", "this is not json");
    await p.setInputFiles("#backup-file", "/tmp/not-a-backup.json");
    await p.waitForSelector("text=Choose the .json file");
    check((await p.locator("#backup-file").getAttribute("aria-invalid")) === "true", "restore: bad file not marked invalid");
    // a good file previews, then restores
    await p.setInputFiles("#backup-file", file);
    await p.waitForSelector("dialog[open]");
    check((await text(p)).includes("3 sessions from"), "restore: preview does not describe the file");
    await p.getByRole("button", { name: "Restore backup" }).click();
    await p.waitForSelector("text=Backup restored");
    const restored = await p.evaluate(() => JSON.parse(localStorage.getItem("ironlog:v1")));
    check(restored.sessions.length === 3 && restored.profile.goal === "muscle", "restore: data not restored");
    // reminders
    await p.getByRole("button", { name: "Download calendar file" }).waitFor();
    for (const day of ["Monday", "Tuesday", "Thursday", "Friday"]) await p.getByLabel(day).uncheck({ force: true });
    await p.getByRole("button", { name: "Download calendar file" }).click();
    await p.waitForSelector("text=Pick at least one day");
    await p.getByLabel("Wednesday").check({ force: true });
    await p.getByLabel("Saturday").check({ force: true });
    const [ics] = await Promise.all([p.waitForEvent("download"), p.getByRole("button", { name: "Download calendar file" }).click()]);
    const body = fs.readFileSync(await ics.path(), "utf8");
    check(ics.suggestedFilename() === "ironlog-training.ics", "ics: file name");
    check((body.match(/BEGIN:VEVENT/g) || []).length === 2 && /BYDAY=WE/.test(body) && /BYDAY=SA/.test(body) && /TRIGGER:-PT30M/.test(body), "ics: contents wrong");
    check(/DTSTART:\d{8}T180000/.test(body), "ics: default time 18:00 missing");
    await ctx.close();
  }

  /* ---------- UNIT CHANGE IN ANOTHER TAB ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const a = await goHome(ctx);
    await openLogAsUpper(a);
    await a.getByLabel("Barbell bench press, set 1, weight in lb").fill("100");
    const b = await ctx.newPage();
    await b.goto(BASE + "/plan", { waitUntil: "networkidle" });
    await b.getByText("kg", { exact: true }).click();
    await b.getByRole("button", { name: "Save changes" }).click();
    await b.waitForSelector("text=now show in kg");
    await a.waitForTimeout(600);
    check((await a.getByLabel("Barbell bench press, set 1, weight in kg").inputValue()) === "45.5", "unit tab: typed 100 lb should become 45.5 kg in the open form");
    // and the saved data was never rewritten
    const raw = await b.evaluate(() => JSON.parse(localStorage.getItem("ironlog:v1")).sessions.find((s) => s.id === "s1").entries[0].sets[0].weight);
    check(raw === 125, `unit: saved weight should stay 125 (lb), got ${raw}`);
    await ctx.close();
  }

  /* ---------- INSTALLABLE ---------- */
  {
    const ctx = await browser.newContext();
    const r = await ctx.request.get(BASE + "/manifest.webmanifest");
    check(r.ok(), "manifest: not served");
    const m = await r.json();
    check(m.display === "standalone" && m.icons.length >= 3, "manifest: wrong shape");
    for (const icon of m.icons) check((await ctx.request.get(BASE + icon.src)).ok(), "manifest: icon missing " + icon.src);
    check((await ctx.request.get(BASE + "/icons/apple-touch-icon.png")).ok(), "apple touch icon missing");
    await ctx.close();
  }

  check(errors.length === 0, "console errors: " + [...new Set(errors)].join(" | "));
  await browser.close();
  console.log(problems.filter(Boolean).length ? "PROBLEMS:\n- " + problems.filter(Boolean).join("\n- ") : "ALL FEATURE CHECKS PASSED");
  process.exit(problems.filter(Boolean).length ? 1 : 0);
})();
