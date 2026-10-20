// End-to-end check of the v3 journeys in a phone-sized browser.
// Run: NODE_PATH=<dir with playwright>/node_modules BASE=http://localhost:3200 node scripts/verify/v3-check.js
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:3200";
const SHOTS = process.env.SHOTS || "/tmp/v3shots";
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
};

(async () => {
  require("fs").mkdirSync(SHOTS, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  // 1. first visit: useful immediately, and an error if you skip the choice
  await page.goto(BASE + "/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  check("first visit shows the look picker", await page.getByRole("radio").count() === 6);
  await page.screenshot({ path: `${SHOTS}/01-onboarding.png`, fullPage: true });
  await page.getByRole("button", { name: "Show my plan" }).click();
  const err = page.getByText("Pick the look you're aiming for");
  check("submitting without a look explains what to do", await err.isVisible());
  check("the error is on screen", await err.evaluate((el) => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  check("focus moves to the first look", await page.evaluate(() => document.activeElement?.getAttribute("name") === "look"));
  await page.getByText("Muscular & broad").click();
  await page.getByRole("button", { name: "Show my plan" }).click();
  await page.getByRole("heading", { name: "Your first workout" }).waitFor();
  check("Today shows the first workout", true);
  check("intro note shown", await page.getByText("Light intro").first().isVisible());
  await page.screenshot({ path: `${SHOTS}/02-today-first.png`, fullPage: true });

  // 2. how are you feeling / time options change the plan
  const countRows = () => page.locator("section[aria-labelledby=next-heading] ol li").count();
  check("first workout skips the time choice", (await page.getByText("How long do you have?").count()) === 0);
  void countRows;

  // 3. guided workout
  await page.getByRole("button", { name: "Start workout" }).click();
  await page.waitForURL("**/workout");
  await page.getByRole("heading", { level: 1 }).waitFor();
  const firstName = await page.getByRole("heading", { level: 1 }).textContent();
  check("workout opens on the first exercise", firstName === "Goblet squat", firstName);
  check("how-to is open for a new exercise", await page.locator("details[open]").count() === 1);
  check("figure is drawn", await page.locator("main svg").count() > 0);
  await page.screenshot({ path: `${SHOTS}/03-exercise.png`, fullPage: true });

  // bad weight is caught next to the field and typed text is kept
  const weight = page.getByLabel(/Weight \(lb\)/);
  await weight.fill("abc");
  await page.getByRole("button", { name: "Next exercise" }).click();
  check("bad weight shows an error", await page.getByText("Enter the weight as a number").first().isVisible());
  check("typed text kept", (await weight.inputValue()) === "abc");
  check("still on the same exercise", (await page.getByRole("heading", { level: 1 }).textContent()) === "Goblet squat");
  await weight.fill("30");
  await page.getByRole("button", { name: "Raise the weight" }).click();
  check("+ steps the weight by one dumbbell step", (await weight.inputValue()) === "35", await weight.inputValue());

  await page.getByRole("button", { name: "Set 1 of 2" }).click();
  check("rest timer starts after a set", await page.getByRole("timer").waitFor({ timeout: 2000 }).then(() => true, () => false));
  await page.getByRole("button", { name: "Set 2 of 2" }).click();
  await page.getByText("Easy", { exact: true }).click();
  await page.screenshot({ path: `${SHOTS}/04-sets-done.png`, fullPage: true });

  // reload mid-workout: place is kept
  await page.reload();
  await page.getByRole("heading", { level: 1 }).waitFor();
  check("reload keeps sets done", (await page.getByRole("button", { name: "Set 2 of 2" }).getAttribute("aria-pressed")) === "true");

  await page.getByRole("button", { name: "Next exercise" }).click();
  await page.waitForFunction(() => document.querySelector("main h1")?.textContent !== "Goblet squat");
  const second = await page.getByRole("heading", { level: 1 }).textContent();
  check("next moves to the second exercise", second === "Dumbbell bench press", second);
  check("focus on the new heading", await page.waitForFunction(() => document.activeElement?.tagName === "H1", null, { timeout: 2000 }).then(() => true, () => false));

  // swap
  const swap = page.getByRole("button", { name: /Swap it/ });
  if (await swap.count()) {
    await swap.click();
    await page.getByRole("dialog").getByRole("button", { name: "Push-up" }).click();
    await page.waitForFunction(() => document.querySelector("main h1")?.textContent === "Push-up");
    check("swap replaces the exercise", true);
  } else check("swap button available", false);

  // skip the rest
  for (let i = 0; i < 12; i++) {
    const finishNow = await page.getByRole("heading", { name: /Nice work|Finish workout/ }).count();
    if (finishNow) break;
    await page.getByRole("button", { name: "Skip this one" }).click();
    await page.waitForTimeout(150);
  }
  await page.getByRole("heading", { name: /Nice work|Finish workout/ }).waitFor();
  await page.screenshot({ path: `${SHOTS}/05-finish.png`, fullPage: true });
  await page.getByLabel(/Notes/).fill("First go.");
  await page.getByRole("button", { name: "Save workout" }).click();
  await page.waitForURL(BASE + "/");
  await page.getByText("Workout A saved").waitFor();
  check("save returns to Today with a confirmation", true);
  // 1 of 5 done (< 50%) -> repeat A
  const nextTitle = await page.locator("#next-heading").textContent();
  check("mostly-unfinished workout is repeated", nextTitle === "Workout A", nextTitle);
  check("weight remembered and raised after Easy", await page.getByText("Start with 40 lb").first().isVisible());
  const standardRows = await countRows();
  await page.getByText("Short", { exact: true }).click();
  const shortRows = await countRows();
  check("short session has fewer exercises", shortRows < standardRows, `${standardRows} -> ${shortRows}`);
  await page.getByText("Standard", { exact: true }).click();
  await page.screenshot({ path: `${SHOTS}/06-today-after.png`, fullPage: true });

  // 4. a comeback after a long gap: rewrite the saved date to 6 weeks ago
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem("ironlog:v2"));
    const t = new Date(); t.setDate(t.getDate() - 42);
    const s = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    d.workouts.forEach((w) => (w.date = s));
    localStorage.setItem("ironlog:v2", JSON.stringify(d));
  });
  await page.reload();
  await page.getByRole("heading", { name: "Welcome back" }).waitFor();
  check("comeback note after 6 weeks", await page.getByText("Welcome back after 6 weeks").first().isVisible());
  check("eased weight after a gap", await page.getByText("Start with 30 lb").first().isVisible());
  await page.getByText("Tired", { exact: true }).click();
  check("tired gives a lighter version", await page.getByText("You said you're tired").first().isVisible());

  // 5. progress, check-in, plan
  await page.getByRole("link", { name: "Progress" }).first().click();
  await page.getByRole("heading", { name: "Progress", level: 1 }).waitFor();
  check("progress lists the workout", await page.getByText("Workout A").first().isVisible());
  await page.screenshot({ path: `${SHOTS}/07-progress.png`, fullPage: true });

  await page.goto(BASE + "/checkin");
  await page.getByRole("heading", { name: "Body check-in" }).waitFor();
  await page.getByRole("button", { name: "Save check-in" }).click();
  check("empty check-in explains what to do", await page.getByText("Enter at least one measurement").first().isVisible());
  await page.getByLabel(/Waist/).fill("3x");
  await page.getByRole("button", { name: "Save check-in" }).click();
  check("bad measurement error by the field", await page.locator("#checkin-waist-error").isVisible());
  check("typed measurement kept", (await page.getByLabel(/Waist/).inputValue()) === "3x");
  await page.getByLabel(/Waist/).fill("33");
  await page.getByLabel(/Body weight/).fill("175");
  await page.getByRole("button", { name: "Save check-in" }).click();
  check("check-in saved", await page.getByText(/Check-in for .* saved/).first().isVisible());
  await page.screenshot({ path: `${SHOTS}/08-checkin.png`, fullPage: true });

  await page.goto(BASE + "/plan");
  await page.getByRole("heading", { name: "Your plan", level: 1 }).waitFor();
  check("food and sleep tips", await page.getByRole("heading", { name: "Food and sleep" }).isVisible());
  check("honest note", await page.getByRole("heading", { name: "What can training do?" }).isVisible());
  await page.getByRole("button", { name: "Show my estimate" }).click();
  check("estimate form errors", await page.getByText("Enter your age in years.").first().isVisible());
  await page.getByLabel("Age").fill("16");
  await page.getByRole("button", { name: "Show my estimate" }).click();
  check("adults only", await page.getByText("This estimate is for adults").first().isVisible());
  await page.getByLabel("Age").fill("28");
  await page.locator("label", { hasText: /^male$/i }).click();
  await page.getByLabel(/Height/).fill("70");
  await page.getByLabel(/Body weight/).fill("175");
  await page.locator("label", { hasText: "Lightly active" }).click();
  await page.getByRole("button", { name: "Show my estimate" }).click();
  check("estimate shown as ranges", await page.getByText("Starting point for your look").first().isVisible());
  await page.screenshot({ path: `${SHOTS}/09-plan.png`, fullPage: true });

  // 6. keyboard: the look picker and Start work without a mouse
  const kb = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p2 = await kb.newPage();
  await p2.goto(BASE + "/");
  await p2.getByRole("radio").first().waitFor({ state: "attached" });
  let reached = false;
  for (let i = 0; i < 12 && !reached; i++) {
    await p2.keyboard.press("Tab");
    reached = await p2.evaluate(() => document.activeElement?.getAttribute("name") === "look");
  }
  await p2.keyboard.press("ArrowRight");
  await p2.keyboard.press("Space");
  for (let i = 0; i < 6; i++) {
    await p2.keyboard.press("Tab");
    if (await p2.evaluate(() => document.activeElement?.textContent === "Show my plan")) break;
  }
  await p2.keyboard.press("Enter");
  await p2.getByRole("heading", { name: "Your first workout" }).waitFor({ timeout: 5000 }).catch(() => {});
  check("keyboard-only onboarding", (await p2.getByRole("heading", { name: "Your first workout" }).count()) === 1);

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
