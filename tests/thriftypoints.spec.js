// Thrifty Points: every price shown (full and each VIP discount), planning #53.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/thriftypoints.html";
const num = t => parseInt(String(t).replace(/[^\d]/g, ""), 10);
const isDash = t => !/\d/.test(t);
const dateOf = s => Date.parse(s.replace(/^\w+, /, "") + " UTC");

async function search(page, { points = "60,000", from, to } = {}) {
  await page.goto(URL);
  await page.fill("#pts", points);
  if (from) await page.fill("#from", from);
  if (to) await page.fill("#to", to);
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
}
// Columns: 0 Resort, 1 Location, 2 Room Type, 3 In, 4 Out, 5 Nights, 6 Full Price, 7.. discount columns
const rows = page => page.$$eval("#body tr", trs => trs.map(tr => [...tr.children].map(td => ({ t: td.textContent.trim(), fit: td.dataset.fit, cls: td.className }))));
const heads = page => page.$$eval("#tbl thead th", ths => ths.map(th => th.textContent.trim()));
const daysOut = c => { const n = new Date(); return Math.round((dateOf(c[3].t) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); };

test("thriftypoints: no VIP select, and the headings come from the data in ascending order", async ({ page }) => {
  await search(page);
  await expect(page.locator("#vip")).toHaveCount(0);
  const h = await heads(page);
  expect(h.length).toBeGreaterThan(8);
  const pcts = h.slice(7).map(num);
  expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
  expect(pcts).toContain(35);
});

test("thriftypoints: every row has a price at most 60,000 and highlights match exactly", async ({ page }) => {
  await search(page);
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const row of r) {
    const prices = row.slice(6);
    expect(prices.some(c => !isDash(c.t) && num(c.t) <= 60000)).toBe(true);
    for (const c of prices) {
      const fits = !isDash(c.t) && num(c.t) <= 60000;
      expect(c.fit).toBe(String(fits));
      expect(c.cls.includes("fit")).toBe(fits);
    }
  }
});

test("thriftypoints: inside the window 35% Off is the rounded-up full price times 0.65; later stays show dashes", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  const col = (await heads(page)).findIndex(t => /^35%/.test(t));
  expect(col).toBeGreaterThan(6);
  let inside = 0, outside = 0;
  for (const row of await rows(page)) {
    const d = daysOut(row);
    if (d >= 0 && d <= 60) { inside++; expect(num(row[col].t)).toBe(Math.ceil(num(row[6].t) * 0.65 - 1e-6)); }
    else if (d > 60) { outside++; for (const c of row.slice(7)) expect(isDash(c.t)).toBe(true); }
  }
  expect(inside).toBeGreaterThan(0);
  expect(outside).toBeGreaterThan(0);
});

test("thriftypoints: results stay inside the chosen date range", async ({ page }) => {
  const now = new Date(); const iso = d => new Date(d).toISOString().slice(0, 10);
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + 100 * 864e5, end = start + 30 * 864e5;
  await search(page, { from: iso(start), to: iso(end) });
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) { expect(dateOf(c[3].t)).toBeGreaterThanOrEqual(start); expect(dateOf(c[4].t)).toBeLessThanOrEqual(end); }
});

test("thriftypoints: no console errors and no sideways scrolling; the table sits in a labelled scroll region", async ({ page }) => {
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await search(page);
  expect(errs).toEqual([]);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  expect(sw).toBe(true);
  const reg = page.locator("#scroll");
  await expect(reg).toHaveAttribute("tabindex", "0");
  await expect(reg).toHaveAttribute("role", "region");
  await expect(reg).toHaveAttribute("aria-label", /.+/);
});
