// Thrifty Points: VIP status and the 60-day VIP points discount (planning #53).
import { test, expect } from "@playwright/test";

const URL = "/52weeks/thriftypoints.html";
const num = t => parseInt(String(t).replace(/[^\d]/g, ""), 10);

async function search(page, { points = "60,000", vip = "" } = {}) {
  await page.goto(URL);
  await page.fill("#pts", points);
  await page.selectOption("#vip", vip);
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
}
const rows = page => page.$$eval("#body tr", trs => trs.map(tr => [...tr.children].map(td => td.textContent.trim())));
// Columns: 0 Resort, 1 Location, 2 Room Type, 3 In, 4 Out, 5 Nights, 6 Full, 7 Discount, 8 Used, 9 Left
const dateOf = s => Date.parse(s.replace(/^\w+, /, "") + " UTC");

test("thriftypoints: a non-VIP search with 60,000 points returns stays at or under 60,000 with no discount", async ({ page }) => {
  await search(page);
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) { expect(num(c[8])).toBeLessThanOrEqual(60000); expect(num(c[8])).toBe(num(c[6])); expect(c[7]).not.toMatch(/\d/); }
});

test("thriftypoints: Platinum shows 50% on stays within 60 days and Points Used is the rounded-up half", async ({ page }) => {
  await search(page, { vip: "Platinum" });
  const r = await rows(page);
  const disc = r.filter(c => /50/.test(c[7]));
  expect(disc.length).toBeGreaterThan(0);
  for (const c of disc) expect(num(c[8])).toBe(Math.ceil(num(c[6]) * 0.5));
  for (const c of r) expect(num(c[8])).toBeLessThanOrEqual(60000);
});

test("thriftypoints: a stay starting more than 60 days out is never discounted", async ({ page }) => {
  await search(page, { vip: "Gold" });
  await page.click("#all").catch(() => {});
  const r = await rows(page);
  const now = new Date(); const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  for (const c of r) {
    const days = Math.round((dateOf(c[3]) - today) / 864e5);
    if (days > 60) { expect(c[7]).not.toMatch(/\d/); expect(num(c[8])).toBe(num(c[6])); }
    else expect(num(c[8])).toBe(Math.ceil(num(c[6]) * 0.65 - 1e-6));
  }
});

test("thriftypoints: results stay inside the chosen date range", async ({ page }) => {
  await page.goto(URL);
  const now = new Date(); const iso = d => new Date(d).toISOString().slice(0, 10);
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + 100 * 864e5, end = start + 30 * 864e5;
  await page.fill("#from", iso(start)); await page.fill("#to", iso(end));
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) { expect(dateOf(c[3])).toBeGreaterThanOrEqual(start); expect(dateOf(c[4])).toBeLessThanOrEqual(end); }
});

test("thriftypoints: no console errors", async ({ page }) => {
  const errs = [];
  page.on("pageerror", e => errs.push(String(e)));
  page.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
  await search(page, { vip: "Founders" });
  expect(errs).toEqual([]);
});
