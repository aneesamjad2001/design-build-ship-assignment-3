/* End-to-end check of Ironlog's three flows in a real browser.
 *   npm i --no-save playwright && npx playwright install chromium
 *   node scripts/verify/flows-check.js            (BASE defaults to http://localhost:3000)
 */
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3000";
const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };
// Wait for client-side navigation without throwing: report where we ended up instead.
async function waitUrl(pg, path, what) {
  try {
    await pg.waitForFunction((u) => location.href === u, BASE + path, { timeout: 15000 });
    return true;
  } catch {
    const body = ((await pg.locator("body").textContent()) || "").replace(/\s+/g, " ").slice(0, 160);
    problems.push(`${what}: expected ${BASE + path} but at ${pg.url()} — page says: "${body}"`);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  // textContent, not innerText: the design uppercases headings with CSS
  const text = async () => (await page.locator("body").textContent()) || "";

  /* ---- FIRST VISIT ---- */
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  check((await text()).includes("What are you training for?"), "first visit: goal picker not shown");
  check(!(await text()).includes("0 of"), "first visit: should not show empty stats");
  // submit with no goal → error beside the field, focus moves to the goals
  await page.getByRole("button", { name: "Show my first workout" }).click();
  check((await text()).includes("Pick a goal so we can build your first workout."), "first visit: missing goal error not shown");
  check(await page.evaluate(() => document.activeElement?.getAttribute("name") === "goal"), "first visit: focus did not move to goal radios");
  // focus ring appears at once (never fades in from white)
  await page.locator('input[name="goal"]').first().focus();
  await page.keyboard.press("ArrowDown");
  check(await page.evaluate(() => getComputedStyle(document.activeElement.closest("label")).outlineColor === "rgb(255, 214, 10)"), "first visit: goal tile focus ring is not the instant accent color");
  await page.keyboard.press("ArrowUp");
  // keyboard: arrow keys move the radio selection
  await page.locator('input[name="goal"]').first().focus();
  await page.keyboard.press("ArrowDown");
  check(await page.locator('input[name="goal"]').nth(1).isChecked(), "first visit: arrow key did not select next goal");
  await page.keyboard.press("ArrowUp");
  // pick Build muscle, 4 days (default), submit with Enter-equivalent click
  check(await page.locator('input[name="days"]').nth(2).isChecked(), "first visit: default is not 4 days");
  await page.getByRole("button", { name: "Show my first workout" }).click();
  await page.waitForSelector("text=Log this workout");
  let t = await text();
  check(t.includes("Upper body"), "first workout should be Upper body for a 4-day muscle plan");
  check(t.includes("Barbell bench press"), "first workout missing exercises");
  check(!t.includes("Days at the gym"), "first workout: stats card should be hidden before any session");

  // after onboarding swaps to Today, focus lands on the new heading, at the top
  const landed0 = await page
    .waitForFunction(() => document.activeElement?.tagName === "H1" && scrollY === 0, null, { timeout: 4000 })
    .then(() => true, () => false);
  check(landed0, "onboarding: focus/scroll did not reset to the new heading");

  /* ---- persistence across reload ---- */
  await page.reload({ waitUntil: "networkidle" });
  check((await text()).includes("Log this workout"), "reload: profile not remembered");
  const stored = await page.evaluate(() => localStorage.getItem("ironlog:v1"));
  check(stored && JSON.parse(stored).profile?.goal === "muscle", "storage: profile not saved to localStorage");

  /* ---- navigation moves focus to the new page's heading ---- */
  await page.locator('nav[aria-label="Main"] a', { hasText: "Progress" }).click();
  await waitUrl(page, "/progress", "nav to Progress");
  // the heading takes a few frames to render on a cold route, so wait for it rather than guess a delay
  const landed = await page
    .waitForFunction(() => document.activeElement?.tagName === "H1" && document.activeElement.textContent === "Progress" && scrollY === 0, null, { timeout: 4000 })
    .then(() => true, () => false);
  check(landed, "navigation: focus did not move to the new page's heading");

  /* ---- THE FORM ---- */
  await page.goto(BASE + "/log", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Save session" }).click();
  check((await text()).includes("Enter the reps for at least one set"), "form: empty-save error missing");
  check(await page.evaluate(() => document.activeElement?.id === "form-summary"), "form: focus not on the error summary after an empty save");
  check(await page.locator("#form-summary").isVisible(), "form: empty-save error summary not visible");
  check(await page.evaluate(() => { const r = document.getElementById("form-summary").getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), "form: empty-save error is off-screen");

  const w = page.getByLabel("Barbell bench press, set 1, weight in lb");
  const r = page.getByLabel("Barbell bench press, set 1, reps");
  await w.fill("135");
  await page.getByRole("button", { name: "Save session" }).click();
  check((await text()).includes("Set 1: Enter how many reps you did at this weight."), "form: reps-required error not beside the field");
  check((await w.inputValue()) === "135", "form: typed weight was lost on error");
  check(await page.evaluate(() => document.activeElement?.id === "ex0-set0-reps"), "form: focus not on invalid reps field");
  check((await r.getAttribute("aria-invalid")) === "true", "form: invalid field not marked aria-invalid");
  check(((await r.getAttribute("aria-describedby")) || "").includes("error"), "form: error not tied to the field");

  await r.fill("8.5");
  await page.getByRole("button", { name: "Save session" }).click();
  check((await text()).includes("whole number from 1 to 100"), "form: fractional reps error missing");
  check((await w.inputValue()) === "135" && (await r.inputValue()) === "8.5", "form: typed values lost");

  await page.getByLabel("Date").fill("2099-01-01");
  await r.fill("8");
  await page.getByRole("button", { name: "Save session" }).click();
  check((await text()).includes("Pick today or an earlier date"), "form: future date error missing");
  check((await r.inputValue()) === "8" && (await w.inputValue()) === "135", "form: values lost after date error");
  // fix the date (today) and save
  const today = await page.evaluate(() => new Date().toLocaleDateString("en-CA"));
  await page.getByLabel("Date").fill(today);
  await page.getByRole("button", { name: "Save session" }).click();
  await waitUrl(page, "/", "after save/reset");
  t = await text();
  check(t.includes("Upper body saved"), "save: success message missing on Today");
  check(t.includes("1 of 4 sessions"), "save: week progress not updated");
  check(t.includes("Lower body"), "recommendation: should move on to lower body");
  check(t.includes("Start light"), "recommendation: new lifts should say to start light");
  // choosing Upper body again on the log form shows the progression hint and can fill it in
  await page.goto(BASE + "/log", { waitUntil: "networkidle" });
  await page.getByLabel("Workout").selectOption("upper");
  check((await text()).includes("Last: 135 lb × 8 → try 135 lb × 9"), "log: progression hint missing for a lift with history");
  await page.getByRole("button", { name: "Use suggestion" }).first().click();
  check((await page.getByLabel("Barbell bench press, set 1, weight in lb").inputValue()) === "135", "log: Use suggestion did not fill the weight");
  check((await page.getByLabel("Barbell bench press, set 1, reps").inputValue()) === "9", "log: Use suggestion did not fill the reps");
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  t = await text();
  check(t.includes("Upper body, today") || t.includes("upper body, today"), "welcome: last-session line missing");

  /* ---- COMING BACK, days later ---- */
  const later = await ctx.newPage();
  await later.clock.setFixedTime(new Date(Date.now() + 3 * 86400000));
  await later.goto(BASE + "/", { waitUntil: "networkidle" });
  const lt = (await later.locator("body").textContent()) || "";
  check(lt.includes("Welcome back"), "return: no welcome back");
  check(lt.includes("3 days ago"), "return: last session not described relative to today");
  check(lt.includes("Lower body"), "return: next workout missing");
  await later.close();

  /* ---- PROGRESS ---- */
  await page.goto(BASE + "/progress", { waitUntil: "networkidle" });
  t = await text();
  check(t.includes("Barbell bench press") && t.includes("135 lb × 8"), "progress: lift not listed");
  check(t.includes("1 of 4 sessions"), "progress: week count missing");
  check((await page.locator("table td", { hasText: /trained/ }).count()) >= 1, "progress: calendar doesn't mark the trained day");
  // unit change converts saved weights
  await page.goto(BASE + "/plan", { waitUntil: "networkidle" });
  await page.getByText("kg", { exact: true }).click();
  await page.getByRole("button", { name: /Save/ }).click();
  check((await text()).includes("now show in kg"), "plan: unit change message missing");
  await page.goto(BASE + "/progress", { waitUntil: "networkidle" });
  check((await text()).includes("61 kg × 8"), "progress: weight not converted to kg (135 lb → 61 kg)");
  // delete via confirm dialog; Escape cancels first
  await page.getByText("Upper body").first().click();
  await page.getByRole("button", { name: "Delete session" }).click();
  await page.waitForSelector("dialog[open]");
  await page.keyboard.press("Escape");
  check((await page.locator("dialog[open]").count()) === 0, "delete: Escape did not close the confirm");
  check((await text()).includes("61 kg × 8"), "delete: cancelling removed data");
  await page.getByRole("button", { name: "Delete session" }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.waitForSelector("text=Log your first session");
  check((await text()).includes("Your week, ready to go"), "progress: plan-only state missing after delete");

  /* ---- RESET ---- */
  await page.goto(BASE + "/plan", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Reset everything" }).click();
  await page.getByRole("button", { name: "Erase everything" }).click();
  await waitUrl(page, "/", "after save/reset");
  check((await text()).includes("What are you training for?"), "reset: did not return to first visit");
  check((await page.evaluate(() => localStorage.getItem("ironlog:v1"))) === null, "reset: storage not cleared");

  /* ---- CORRUPT STORAGE never crashes ---- */
  await page.evaluate(() => localStorage.setItem("ironlog:v1", "{not json"));
  await page.reload({ waitUntil: "networkidle" });
  check((await text()).includes("What are you training for?"), "corrupt storage: app did not recover to first visit");


  /* ---- KEYBOARD ONLY: first visit → log → save, no mouse ---- */
  {
    const kctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const k = await kctx.newPage();
    await k.goto(BASE + "/", { waitUntil: "networkidle" });
    const tabTo = async (pred, max = 40) => {
      for (let i = 0; i < max; i++) {
        await k.keyboard.press("Tab");
        if (await k.evaluate(pred)) return true;
      }
      return false;
    };
    check(await tabTo(() => document.activeElement?.getAttribute("name") === "goal"), "keyboard: cannot Tab to the goal choices");
    await k.keyboard.press("ArrowDown"); // lean
    await k.keyboard.press("ArrowDown"); // strength
    check(await k.locator('input[name="goal"]').nth(2).isChecked(), "keyboard: arrows do not choose a goal");
    check(await tabTo(() => document.activeElement?.getAttribute("name") === "days"), "keyboard: cannot Tab to the day choices");
    check(await tabTo(() => document.activeElement?.textContent?.includes("Show my first workout")), "keyboard: cannot Tab to the submit button");
    await k.keyboard.press("Enter");
    await k.waitForSelector("text=Log this workout");
    const stored = JSON.parse(await k.evaluate(() => localStorage.getItem("ironlog:v1")));
    check(stored.profile.goal === "strength", "keyboard: the goal chosen with arrow keys was not saved");
    // go to Log with the nav links
    check(await tabTo(() => document.activeElement?.textContent === "Log this workout"), "keyboard: cannot reach the primary action");
    await k.keyboard.press("Enter");
    await waitUrl(k, "/log", "keyboard: Enter on the primary action");
    check(await tabTo(() => document.activeElement?.id === "ex0-set0-reps", 80), "keyboard: cannot Tab to the first reps field");
    await k.keyboard.type("5");
    check(await tabTo(() => document.activeElement?.textContent?.includes("Save session"), 120), "keyboard: cannot Tab to Save session");
    await k.keyboard.press("Enter");
    await waitUrl(k, "/", "keyboard: saving with Enter");
    check((await k.locator("body").textContent()).includes("saved"), "keyboard: saving with Enter did not work");
    // visible focus ring: the focused control shows an outline
    await k.keyboard.press("Tab");
    const outline = await k.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
    check(outline !== "none", "keyboard: focused control has no visible outline");
    await kctx.close();
  }

  /* ---- no sideways scroll on any route, 390px ---- */
  for (const route of ["/", "/log", "/progress", "/plan"]) {
    await page.goto(BASE + route, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(overflow <= 1, `${route}: horizontal overflow ${overflow}px at 390px`);
  }

  check(errors.length === 0, "console errors: " + [...new Set(errors)].join(" | "));
  await browser.close();
  console.log(problems.length ? "PROBLEMS:\n- " + problems.join("\n- ") : "ALL FLOW CHECKS PASSED");
  process.exit(problems.length ? 1 : 0);
})();
