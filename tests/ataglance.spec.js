// At a Glance (ataglance.html): Resort History tab, filters, News and Notices, Experiences filter.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/ataglance.html";
const rows = page => page.locator("#rhTable tbody tr");

async function open(page) {
  const errors = [];
  page.on("pageerror", e => errors.push(String(e.message ?? e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL);
  await expect(page.locator("#historyTab")).toBeVisible();
  return errors;
}

test("ataglance: names, noindex and three tabs", async ({ page }) => {
  const errors = await open(page);
  await expect(page).toHaveTitle("At a Glance");
  await expect(page.locator("h1")).toHaveText("At a Glance");
  await expect(page.locator("#breadcrumbPage")).toHaveText("At a Glance");
  expect(await page.locator('meta[name="robots"]').getAttribute("content")).toContain("noindex");
  await expect(page.locator(".module-tabs button")).toHaveText([/Find a Stay/, /Browser Shortlist/, /Resort History/]);
  // planner.js rewrites the titles when it draws; ours must survive a tab change
  await page.click("#savedTab");
  await expect(page.locator("h1")).toHaveText("At a Glance");
  await expect(page).toHaveTitle("At a Glance");
  expect(errors).toEqual([]);
});

test("ataglance: the #history link opens Resort History", async ({ page }) => {
  await page.goto(URL + "#history");
  await expect(page.locator("#historyView")).toBeVisible();
  await expect(page.locator("#findView")).toBeHidden();
});

test("ataglance: Fairfield Legacy dates read Before 2000 and sort", async ({ page }) => {
  await open(page);
  await page.click("#historyTab");
  await page.selectOption("#rhOrigin", "Fairfield Legacy");
  await page.locator("th[data-k=added] button").click();
  const d = await page.$$eval("#rhTable tbody tr", trs => trs.map(tr => tr.children[4].textContent.trim()));
  expect(d).toContain("Before 2000");
  expect(d[0]).toBe("1978");
  expect(d.indexOf("Before 2000")).toBeGreaterThan(d.lastIndexOf("1999"));
});

test("ataglance: Resort History tab shows and hides with the other tabs", async ({ page }) => {
  const errors = await open(page);
  await page.click("#historyTab");
  await expect(page.locator("#historyView")).toBeVisible();
  await expect(page.locator("#findView")).toBeHidden();
  await expect(page.locator("#savedView")).toBeHidden();
  await expect(page.locator("#historyTab")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#findTab")).toHaveAttribute("aria-pressed", "false");
  await page.click("#savedTab");
  await expect(page.locator("#historyView")).toBeHidden();
  await expect(page.locator("#savedView")).toBeVisible();
  await expect(page.locator("#historyTab")).toHaveAttribute("aria-pressed", "false");
  await page.click("#historyTab");
  await page.click("#findTab");
  await expect(page.locator("#historyView")).toBeHidden();
  await expect(page.locator("#findView")).toBeVisible();
  expect(errors).toEqual([]);
});

test("ataglance: table, note, legend, headers and counts", async ({ page }) => {
  const errors = await open(page);
  await page.click("#historyTab");
  await expect(page.locator(".rh-note")).toContainText("This list is being built. Dates marked Unconfirmed have not been verified.");
  await expect(page.locator(".rh-eras .rh-era")).toHaveCount(6);
  await expect(page.locator(".rh-eras")).toContainText("Fairfield Legacy");
  await expect(page.locator(".rh-eras")).toContainText("Cendant Era");
  await expect(page.locator(".rh-eras")).toContainText("Wyndham Acquisition");
  const heads = await page.locator("#rhTable thead th").allTextContents();
  expect(heads.map(h => h.replace(/[▲▼]/g, "").trim())).toEqual(["Resort", "Collection", "Status", "Origin", "Date Added", "Date Removed", "News and Notices", "Notes", "Source"]);
  const total = await page.evaluate(() => window.RESORT_HISTORY.rows.length);
  expect(total).toBeGreaterThan(200);
  await expect(page.locator("#rhCount")).toHaveText(`Showing ${total} of ${total}`);
  expect(await rows(page).count()).toBe(total);
  await expect(page.locator(".rh-badge").first()).toBeVisible();
  await expect(page.locator(".rh-unc")).toContainText("Unconfirmed");
  const region = page.locator("#rhScroll");
  await expect(region).toHaveAttribute("role", "region");
  await expect(region).toHaveAttribute("tabindex", "0");
  await expect(region).toHaveAttribute("aria-label", /.+/);
  // every shown date is mm/dd/yy, a year, Unconfirmed or an edition window
  const dates = await page.$$eval("#rhTable tbody tr", trs => trs.flatMap(tr => [4, 5].map(i => tr.children[i + 0].textContent.replace(/Unconfirmed/g, "").trim())));
  for (const d of dates) expect(d === "" || d === "–" || /^(\d\d\/\d\d\/\d\d|\d{4}|Before 2000|Between 20\d\d\/20\d\d and 20\d\d\/20\d\d Directories)$/.test(d)).toBe(true);
  expect(errors).toEqual([]);
});

test("ataglance: filters, search ignoring punctuation, sorting", async ({ page }) => {
  await open(page);
  await page.click("#historyTab");
  const total = await page.evaluate(() => window.RESORT_HISTORY.rows.length);
  const counts = await page.evaluate(() => { const r = window.RESORT_HISTORY.rows, c = k => r.filter(x => x.status === k).length; return { a: c("Active"), d: c("Departed"), s: c("Coming Soon") }; });
  await page.selectOption("#rhStatus", "Departed");
  await expect(page.locator("#rhCount")).toHaveText(`Showing ${counts.d} of ${total}`);
  for (const t of await page.$$eval("#rhTable tbody tr", trs => trs.map(tr => tr.children[2].textContent.trim()))) expect(t).toBe("Departed");
  await page.selectOption("#rhStatus", "Coming Soon");
  await expect(page.locator("#rhCount")).toHaveText(`Showing ${counts.s} of ${total}`);
  await page.selectOption("#rhStatus", "");
  await page.selectOption("#rhOrigin", "Fairfield Legacy");
  expect(await rows(page).count()).toBeGreaterThan(10);
  await page.selectOption("#rhOrigin", "");
  // apostrophes and punctuation are ignored
  await page.fill("#rhSearch", "patriots place");
  await expect(rows(page).first()).toContainText("Patriots");
  const n1 = await rows(page).count();
  await page.fill("#rhSearch", "Patriots’ Place");
  expect(await rows(page).count()).toBe(n1);
  await page.fill("#rhSearch", "dolphins cove");
  await expect(rows(page).first()).toContainText("Dolphin");
  await page.fill("#rhSearch", "zzzzzz");
  await expect(rows(page).first()).toContainText("No resorts match");
  await expect(page.locator("#rhCount")).toHaveText(`Showing 0 of ${total}`);
  await page.fill("#rhSearch", "");
  // sorting
  await page.locator('th[data-k="name"] button').click();
  await expect(page.locator('th[data-k="name"]')).toHaveAttribute("aria-sort", "descending");
  const names = await page.$$eval("#rhTable tbody tr th", ths => ths.map(t => t.firstChild.textContent.toLowerCase()));
  expect(names).toEqual([...names].sort().reverse());
  await page.locator('th[data-k="added"] button').click();
  await expect(page.locator('th[data-k="added"]')).toHaveAttribute("aria-sort", "ascending");
  const first = await page.locator("#rhTable tbody tr").first().locator("td").nth(3).textContent();
  expect(first).not.toContain("Unconfirmed"); // dated rows come before Unconfirmed ones
});

test("ataglance: departed resorts and sources", async ({ page }) => {
  await open(page);
  await page.click("#historyTab");
  await page.selectOption("#rhStatus", "Departed");
  const must = ["Bentley Brook", "Fairfield Glade", "Skyline Tower", "El Cid El Moro", "WorldMark Valley Isle", "Crotched Mountain"];
  const text = await page.locator("#rhTable tbody").textContent();
  for (const m of must) expect(text).toContain(m);
  const bentley = page.locator("#rhTable tbody tr", { hasText: "Club Wyndham Bentley Brook" });
  await expect(bentley).toContainText("12/31/25");
  await expect(bentley.locator("a").first()).toHaveAttribute("href", /^https:\/\//);
  await expect(bentley).toContainText("Directory 2025/2026 index, Page 120 (CW search bar page 124)");
});

test("ataglance: News and Notices entry on four resorts", async ({ page }) => {
  await open(page);
  await page.click("#historyTab");
  for (const name of ["Club Wyndham Sea Gardens", "Club Wyndham Ocean Boulevard", "Club Wyndham Bonnet Creek", "WorldMark Sea Gardens"]) {
    const row = page.locator("#rhTable tbody tr", { has: page.locator("th.rh-name", { hasText: new RegExp("^" + name + "(Pompano|Lake|North|Orlando|Fort)") }) });
    await expect(row).toHaveCount(1);
    await expect(row.locator(".rh-news")).toContainText("02/27/26");
    await expect(row.locator(".rh-news")).toContainText("Experiences on the App");
    await expect(row.locator(".rh-news a")).toHaveAttribute("href", "https://clubwyndham.wyndhamdestinations.com/us/en/resorts/resort-news/2026/resort-experiences-on-the-mobile-app");
  }
  await page.fill("#rhSearch", "Anaheim");
  await expect(page.locator(".rh-news li")).toHaveCount(0);
});

test("ataglance: Experiences on the App filter on Find a Stay", async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator("#planResults .trip-candidate").first()).toBeVisible();
  const all = await page.locator("#planResults .trip-candidate").count();
  await page.check("#expFilter");
  await expect(page.locator("#expMessage")).toContainText("Experiences on the App");
  const shown = await page.locator("#planResults .trip-candidate:not([hidden])").count();
  expect(shown).toBeLessThan(all);
  for (const h of await page.locator("#planResults .trip-candidate:not([hidden]) h2").allTextContents()) expect(h).toMatch(/Bonnet Creek|Sea Gardens|Ocean Boulevard/);
  await page.uncheck("#expFilter");
  await expect(page.locator("#planResults .trip-candidate:not([hidden])")).toHaveCount(all);
  expect(errors).toEqual([]);
});

test("ataglance: no sideways scrolling and the table scrolls inside its region", async ({ page }) => {
  await open(page);
  await page.click("#historyTab");
  const m = await page.evaluate(() => ({ doc: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), win: document.documentElement.clientWidth, region: [document.getElementById("rhScroll").scrollWidth, document.getElementById("rhScroll").clientWidth] }));
  expect(m.doc).toBeLessThanOrEqual(m.win + 1);
  expect(m.region[0]).toBeGreaterThan(m.region[1]);
});
