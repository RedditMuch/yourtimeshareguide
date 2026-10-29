// Season chart v2, planning #36: the loading indicator, the shared cell tooltip, place search while the
// city data is still loading, and a generous speed check.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/";
const slow = (page, file, ms) => page.route(`**/52weeks/${file}`, async route => { await new Promise(r => setTimeout(r, ms)); await route.continue(); });
const settled = page => page.waitForFunction(() => document.getElementById("gridWrap").getAttribute("aria-busy") !== "true");

test("the loading indicator shows while the data arrives, fills, then hides when the chart is drawn", async ({ page }) => {
  await slow(page, "points-data.js", 1500); // the largest file arrives last
  await page.goto(URL, { waitUntil: "commit" });
  const status = page.locator("#chartStatus");
  await expect(status).toBeVisible();
  await expect(status).toContainText("Loading the season chart");
  await expect(page.locator("#chartStatus [role=progressbar]")).toHaveAttribute("aria-valuenow", /^[1-9]\d?$/); // filling, not yet done
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  await expect(status).toBeHidden();
  await expect(page.locator("#gridWrap")).toHaveAttribute("aria-busy", "false");
});

test("a slow redraw dims the chart and says Updating the chart", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 8 }); // makes the next redraws slow on any machine
  await page.evaluate(() => document.querySelector('#spanButtons [data-span="-1"]').click()); // learns the cost per cell
  await settled(page);
  const seen = await page.evaluate(() => new Promise(res => {
    const st = document.getElementById("chartStatus"), w = document.getElementById("gridWrap"), log = [];
    const mo = new MutationObserver(() => log.push({ shown: !st.hidden, busy: w.getAttribute("aria-busy"), text: st.textContent }));
    mo.observe(st, { attributes: true }); mo.observe(w, { attributes: true });
    document.querySelector('#spanButtons [data-span="10"]').click();
    const wait = () => w.getAttribute("aria-busy") === "true" ? setTimeout(wait, 20) : (mo.disconnect(), res(log)); setTimeout(wait, 0);
  }));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  expect(seen.some(x => x.shown && x.busy === "true" && x.text.includes("Updating the chart"))).toBe(true);
  await expect(page.locator("#chartStatus")).toBeHidden();
});

test("a city search typed before the city data arrives waits for it, then shows the right resorts", async ({ page }) => {
  await slow(page, "geo-data.js", 1500);
  await page.goto(URL);
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  await page.evaluate(() => {
    window.__hints = []; const h = document.getElementById("searchHint");
    new MutationObserver(() => window.__hints.push(h.textContent)).observe(h, { childList: true, characterData: true, subtree: true });
    document.getElementById("filterBox").open = true;
    const s = document.getElementById("search"); s.value = "Orlando"; s.dispatchEvent(new Event("input"));
  });
  await expect(page.locator("#gridWrap")).toHaveAttribute("aria-busy", "true");
  await expect(page.locator("#chartStatus")).toContainText("Updating the chart");
  await expect(page.locator("#searchHint")).toHaveText(/^Within 35 miles of Orlando, Florida/, { timeout: 10000 });
  await settled(page);
  expect(await page.evaluate(() => window.__hints)).toEqual([expect.stringMatching(/^Within 35 miles of Orlando/)]); // never a text-match result first
  await expect(page.locator("#grid tbody .res-name").first()).toBeVisible();
  // City suggestions arrive with the city data, but only the best few for what's typed (owner, 2026-10-29: a list of
  // 5,000+ froze iPhone Safari when the box was tapped)
  const opts = await page.locator("#places option").evaluateAll(o => o.map(x => x.value));
  expect(opts.length).toBeLessThanOrEqual(12);
  expect(opts).toContain("Orlando, Florida, United States");
});

test("one shared tooltip gives each week cell's description (pointer, tap and keyboard)", async ({ page, isMobile }) => {
  await page.goto(URL);
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  expect(await page.locator("#grid td[title]").count()).toBe(0);
  const cell = page.locator("#grid tbody td.c.sel").first();
  const expected = await cell.evaluate(td => document.getElementById("grid").__tipText(td));
  expect(expected).toMatch(/^Week \d+ · \w{3} \d+ – \w{3} \d+, \d{4} · .+ · .+/);
  if (isMobile) await cell.tap(); else await cell.hover();
  await expect(page.locator("#cellTip")).toBeVisible();
  await expect(page.locator("#cellTip")).toHaveText(expected);
  await page.locator("h1").click();
  await expect(page.locator("#cellTip")).toBeHidden();
  // Keyboard: the chosen week's first cell is the chart's Tab stop; arrow keys move along the row
  await expect(cell).toHaveAttribute("tabindex", "0");
  await cell.focus();
  await expect(cell).toHaveAttribute("aria-describedby", "cellTip");
  await page.keyboard.press("ArrowRight");
  const next = page.locator("#grid tbody tr").first().locator("td.c.sel + td.c");
  await expect(next).toBeFocused();
  await expect(page.locator("#cellTip")).toHaveText(await next.evaluate(td => document.getElementById("grid").__tipText(td)));
});

test("speed: the chart draws and redraws in reasonable time (generous limits)", async ({ page }) => {
  const t0 = Date.now();
  await page.goto(URL);
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  expect(Date.now() - t0).toBeLessThan(15000);
  const ms = await page.evaluate(() => new Promise(res => {
    const t = performance.now(); document.querySelector('#spanButtons [data-span="-1"]').click();
    const w = document.getElementById("gridWrap"), wait = () => w.getAttribute("aria-busy") === "true" ? setTimeout(wait, 10) : requestAnimationFrame(() => setTimeout(() => res(performance.now() - t)));
    wait();
  }));
  expect(ms).toBeLessThan(3000); // about 80 ms on a desktop; it was about 700 ms before planning #36
});
