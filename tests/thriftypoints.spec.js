// Thrifty Points: every price shown (full and each VIP discount), planning #53.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/thriftypoints.html";
const num = t => parseInt(String(t).replace(/[^\d]/g, ""), 10);
const isDash = t => !/\d/.test(t);
const dateOf = s => { const m = /^(\d\d)\/(\d\d)\/(\d\d)$/.exec(s); return Date.UTC(2000 + +m[3], +m[1] - 1, +m[2]); };

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
const heads = page => page.$$eval("#tbl thead th", ths => ths.map(th => th.textContent.replace(/[▲▼⇅]/g, "").trim()));
const daysOut = c => { const n = new Date(); return Math.round((dateOf(c[4].t) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); };

test("thriftypoints: the VIP Level dropdown tailors the columns and re-renders when changed", async ({ page }) => {
  await search(page);
  await expect(page.locator("#vip")).toHaveCount(1);
  const all = await heads(page);
  expect(all.length).toBeGreaterThan(8);
  const pcts = all.slice(9).map(num);
  expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
  expect(pcts).toContain(35);
  await page.selectOption("#vip", { label: "Non-VIP" });
  await expect.poll(async () => (await heads(page)).length).toBe(9);
  expect((await rows(page)).length).toBeGreaterThan(0);
  await page.selectOption("#vip", { label: "VIP Gold" });
  await expect.poll(async () => (await heads(page)).length).toBe(10);
  expect(num((await heads(page))[9])).toBe(35);
  for (const row of await rows(page)) {
    expect(row.length).toBe(10);
    expect(row.slice(8).some(c => !isDash(c.t) && num(c.t) <= 60000)).toBe(true);
    if (daysOut(row) > 60) expect(isDash(row[9].t)).toBe(true);
  }
  await page.selectOption("#vip", { label: "Show All Discounts" });
  await expect.poll(async () => (await heads(page)).length).toBe(all.length);
});

test("thriftypoints: every row has a price at most 60,000 and highlights match exactly", async ({ page }) => {
  await search(page);
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const row of r) {
    const prices = row.slice(8);
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
    if (d >= 0 && d <= 60) { inside++; expect(num(row[col].t)).toBe(Math.ceil(num(row[8].t) * 0.65 - 1e-6)); }
    else if (d > 60) { outside++; for (const c of row.slice(9)) expect(isDash(c.t)).toBe(true); }
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
  for (const c of r) { expect(dateOf(c[4].t)).toBeGreaterThanOrEqual(start); expect(dateOf(c[5].t)).toBeLessThanOrEqual(end); }
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

test("thriftypoints: dates are mm/dd/yy and check-out is after check-in", async ({ page }) => {
  await search(page);
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) {
    expect(c[4].t).toMatch(/^\d\d\/\d\d\/\d\d$/);
    expect(c[5].t).toMatch(/^\d\d\/\d\d\/\d\d$/);
    expect(dateOf(c[5].t)).toBeGreaterThan(dateOf(c[4].t));
  }
});

test("thriftypoints: sorting by Check-In, Nights and Reset Order", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  const first = (await rows(page))[0][0].t;
  const all = await rows(page);
  const col = i => page.locator('#tbl thead button[data-col="' + i + '"]');
  const sortAttr = i => page.locator("#tbl thead th").nth(i).getAttribute("aria-sort");
  await col(4).click();
  expect(await sortAttr(4)).toBe("ascending");
  expect(await sortAttr(5)).toBe("none");
  let r = await rows(page);
  const ins = r.map(c => dateOf(c[4].t));
  expect(ins[0]).toBe(Math.min(...ins));
  expect(ins).toEqual([...ins].sort((a, b) => a - b));
  await col(4).click();
  expect(await sortAttr(4)).toBe("descending");
  r = await rows(page);
  const ins2 = r.map(c => dateOf(c[4].t));
  expect(ins2[0]).toBe(Math.max(...ins2));
  await col(6).click(); await col(6).click();
  r = await rows(page);
  const nights = r.map(c => num(c[6].t));
  expect(nights[0]).toBe(Math.max(...nights));
  expect(await sortAttr(6)).toBe("descending");
  expect(await sortAttr(4)).toBe("none");
  await page.click("#reset");
  r = await rows(page);
  expect(r[0][0].t).toBe(first);
  expect(r.length).toBe(all.length);
  expect(await sortAttr(6)).toBe("none");
});

test("thriftypoints: City and State columns exist, State sorts with equal codes grouped, every heading has an indicator", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  const h = await heads(page);
  const si = h.indexOf("State"), ci = h.indexOf("City");
  expect(ci).toBeGreaterThanOrEqual(0);
  expect(si).toBe(ci + 1);
  expect(h).not.toContain("Location");
  expect(await page.locator("#tbl thead th button .arr").count()).toBe(h.length);
  await page.locator('#tbl thead button[data-col="' + si + '"]').click();
  const codes = (await rows(page)).map(c => c[si].t);
  expect(codes.every(c => c.length > 0)).toBe(true);
  const seen = new Set(); let prev = null;
  for (const c of codes) { if (c !== prev) { expect(seen.has(c)).toBe(false); seen.add(c); prev = c; } }
  expect(codes).toEqual([...codes].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0)));
});

test("thriftypoints: the Season cell shows the season name on its color, Full Price uses the green fit highlight, and Season sorts in groups", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  await expect(page.locator("#seasonLegend")).toHaveCount(0);
  const h = await heads(page);
  const si = h.indexOf("Season");
  expect(si).toBeGreaterThan(0);
  expect(h[si + 1]).toBe("Full Price");
  const colors = { Prime: "rgb(229, 127, 118)", High: "rgb(239, 156, 76)", Value: "rgb(247, 226, 151)", Quiet: "rgb(140, 207, 176)" };
  const cells = await page.$$eval("#body tr td[data-season]", tds => tds.map(td => ({ s: td.dataset.season, bg: getComputedStyle(td).backgroundColor, text: td.textContent.trim(), color: getComputedStyle(td).color, align: getComputedStyle(td).textAlign })));
  expect(cells.length).toBeGreaterThan(0);
  const seen = new Set();
  for (const c of cells) {
    if (!c.s) continue;
    seen.add(c.s);
    expect(c.bg).toBe(colors[c.s]);
    expect(c.text).toBe(c.s);
    expect(c.color).toBe("rgb(27, 42, 51)");
    expect(c.align).toBe("center");
  }
  expect(seen.has("Prime") || seen.has("High")).toBe(true);
  expect(seen.has("Value") || seen.has("Quiet")).toBe(true);
  const full = await page.$$eval("#body tr", (trs, i) => trs.map(tr => { const td = tr.children[i + 1]; return { bg: getComputedStyle(td).backgroundColor, cls: td.className, fit: td.dataset.fit, w: getComputedStyle(td).fontWeight }; }), si);
  for (const c of full) { expect(["rgb(229, 127, 118)", "rgb(239, 156, 76)", "rgb(247, 226, 151)", "rgb(140, 207, 176)"]).not.toContain(c.bg); if (c.fit === "true") { expect(c.cls).toContain("fit"); expect(Number(c.w)).toBeGreaterThanOrEqual(700); } }
  expect(full.some(c => c.fit === "true")).toBe(true);
  await page.locator("#tbl thead button[data-col='" + si + "']").click();
  const order = ["Prime", "High", "Value", "Quiet", ""];
  const seq = (await page.$$eval("#body tr td[data-season]", tds => tds.map(td => td.dataset.season))).map(x => order.indexOf(x));
  expect(seq).toEqual([...seq].sort((a, b) => a - b));
  await page.locator("#tbl thead button[data-col='" + si + "']").click();
  expect(await page.locator("#tbl thead th").nth(si).getAttribute("aria-sort")).toBe("descending");
});

test("thriftypoints: Club Wyndham is dropped from resort names but typing it still finds the resort", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  const names = (await rows(page)).map(c => c[0].t);
  const clubbed = names.filter(n => /^Club Wyndham/.test(n));
  expect(clubbed.length).toBeLessThan(names.length / 4);
  await page.fill("#resort", "club wyndham bonnet");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  const a = (await rows(page)).map(c => c[0].t);
  expect(a.length).toBeGreaterThan(0);
  expect(a.every(n => /bonnet/i.test(n))).toBe(true);
  await page.fill("#resort", "bonnet");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  expect((await rows(page)).length).toBe(a.length);
});

test("thriftypoints: at 1366 and 1400 px wide the table fits without inner scrolling", async ({ page }) => {
  for (const w of [1366, 1400]) {
    await page.setViewportSize({ width: w, height: 900 });
    await search(page);
    const m = await page.evaluate(() => { const s = document.getElementById("scroll"); return { sw: s.scrollWidth, cw: s.clientWidth, page: document.documentElement.scrollWidth <= document.documentElement.clientWidth }; });
    expect(m.sw).toBeLessThanOrEqual(m.cw);
    expect(m.page).toBe(true);
  }
});
