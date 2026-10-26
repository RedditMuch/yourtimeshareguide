// Thrifty Points: every price shown (full and each VIP discount), planning #53.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/thriftypoints.html";
const num = t => parseInt(String(t).replace(/[^\d]/g, ""), 10);
const isDash = t => !/\d/.test(t);
const dateOf = s => { const m = /^(\d\d)\/(\d\d)\/(\d\d)$/.exec(s); return Date.UTC(2000 + +m[3], +m[1] - 1, +m[2]); };

async function search(page, { points = "60,000", from, to, vip = "Show All Discounts" } = {}) {
  await page.goto(URL);
  await page.fill("#pts", points);
  if (vip) await page.selectOption("#vip", { label: vip });
  if (from) await page.fill("#from", from);
  if (to) await page.fill("#to", to);
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
}
// Columns as rows() and heads() return them (they skip Points Left Over, the 3rd column on the page, and the More Dates button):
// 0 Season, 1 Full Price, 2 Resort, 3 City, 4 State, 5 Room Type, 6 Building, 7 Check-In, 8 Check-Out, 9 Nights, 10 VIP Discount Date (only with VIP prices), 11.. discount columns
const rows = page => page.$$eval("#body tr:not(.sub)", trs => trs.map(tr => [...tr.children].filter(td => !td.classList.contains("left")).map(td => { const c = td.cloneNode(true); c.querySelectorAll("button").forEach(b => b.remove()); return { t: c.textContent.trim(), fit: td.dataset.fit, cls: td.className }; })));
const heads = page => page.$$eval("#tbl thead th", ths => ths.map(th => th.innerText.replace(/[▲▼⇅]/g, "").replace(/\s+/g, " ").trim()).filter(t => t !== "Points Left Over"));
const col = (page, i) => page.locator('#tbl thead button[data-col="' + (i >= 2 ? i + 1 : i) + '"]');   // page column for a heads() index
const sortOf = (page, i) => page.locator("#tbl thead th").nth(i >= 2 ? i + 1 : i).getAttribute("aria-sort");
const daysOut = c => { const n = new Date(); return Math.round((dateOf(c[7].t) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); };

test("thriftypoints: the VIP Level dropdown tailors the columns and re-renders when changed", async ({ page }) => {
  await search(page);
  await expect(page.locator("#vip")).toHaveCount(1);
  const all = await heads(page);
  expect(all.length).toBeGreaterThan(8);
  const pcts = all.slice(11).map(num);
  expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
  expect(pcts).toContain(35);
  await page.selectOption("#vip", { label: "Not VIP" });
  await expect.poll(async () => (await heads(page)).length).toBe(10);
  expect((await rows(page)).length).toBeGreaterThan(0);
  await page.selectOption("#vip", { label: "VIP Gold" });
  await expect.poll(async () => (await heads(page)).length).toBe(12);
  expect(num((await heads(page))[11])).toBe(35);
  for (const row of await rows(page)) {
    expect(row.length).toBe(12);
    expect([row[1], row[11]].some(c => !isDash(c.t) && num(c.t) <= 60000)).toBe(true);
    expect(isDash(row[11].t)).toBe(false);
  }
  await page.selectOption("#vip", { label: "Show All Discounts" });
  await expect.poll(async () => (await heads(page)).length).toBe(all.length);
});

test("thriftypoints: every row has a price at most 60,000 and highlights match exactly", async ({ page }) => {
  await search(page);
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const row of r) {
    const prices = [row[1]].concat(row.slice(11));
    expect(prices.some(c => !isDash(c.t) && num(c.t) <= 60000)).toBe(true);
    for (const c of prices) {
      const fits = !isDash(c.t) && num(c.t) <= 60000;
      expect(c.fit).toBe(String(fits));
      expect(c.cls.includes("fit")).toBe(fits);
    }
  }
});

test("thriftypoints: 35% Off is the rounded-up full price times 0.65 for every stay, near or far; no dashes", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  const col = (await heads(page)).findIndex(t => /^35%/.test(t));
  expect(col).toBeGreaterThan(6);
  let near = 0, far = 0;
  for (const row of await rows(page)) {
    const d = daysOut(row);
    expect(num(row[col].t)).toBe(Math.ceil(num(row[1].t) * 0.65 - 1e-6));
    for (const c of row.slice(11)) expect(isDash(c.t)).toBe(false);
    if (d <= 60) near++; else far++;
  }
  expect(near).toBeGreaterThan(0);
  expect(far).toBeGreaterThan(0);
});

test("thriftypoints: results stay inside the chosen date range", async ({ page }) => {
  const now = new Date(); const iso = d => new Date(d).toISOString().slice(0, 10);
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + 100 * 864e5, end = start + 30 * 864e5;
  await search(page, { from: iso(start), to: iso(end) });
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) { expect(dateOf(c[7].t)).toBeGreaterThanOrEqual(start); expect(dateOf(c[8].t)).toBeLessThanOrEqual(end); }
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
    expect(c[7].t).toMatch(/^\d\d\/\d\d\/\d\d$/);
    expect(c[8].t).toMatch(/^\d\d\/\d\d\/\d\d$/);
    expect(dateOf(c[8].t)).toBeGreaterThan(dateOf(c[7].t));
  }
});

test("thriftypoints: sorting by Check-In, Nights and Reset Order", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  const first = (await rows(page))[0][2].t;
  const all = await rows(page);
  const c = i => col(page, i), sortAttr = i => sortOf(page, i);
  await c(7).click();
  expect(await sortAttr(7)).toBe("ascending");
  expect(await sortAttr(8)).toBe("none");
  let r = await rows(page);
  const ins = r.map(c => dateOf(c[7].t));
  expect(ins[0]).toBe(Math.min(...ins));
  expect(ins).toEqual([...ins].sort((a, b) => a - b));
  await c(7).click();
  expect(await sortAttr(7)).toBe("descending");
  r = await rows(page);
  const ins2 = r.map(c => dateOf(c[7].t));
  expect(ins2[0]).toBe(Math.max(...ins2));
  await c(9).click(); await c(9).click();
  r = await rows(page);
  const nights = r.map(c => num(c[9].t));
  expect(nights[0]).toBe(Math.max(...nights));
  expect(await sortAttr(9)).toBe("descending");
  expect(await sortAttr(7)).toBe("none");
  await page.click("#reset");
  r = await rows(page);
  expect(r[0][2].t).toBe(first);
  expect(r.length).toBe(all.length);
  expect(await sortAttr(8)).toBe("none");
});

test("thriftypoints: City and State columns exist, State sorts with equal codes grouped, every heading has an indicator", async ({ page }) => {
  await search(page, { points: "150,000" });
  await page.click("#all").catch(() => {});
  const h = await heads(page);
  const si = h.indexOf("State"), ci = h.indexOf("City");
  expect(ci).toBeGreaterThanOrEqual(0);
  expect(si).toBe(ci + 1);
  expect(h).not.toContain("Location");
  expect(await page.locator("#tbl thead th button .arr").count()).toBe(h.length + 1); // heads() skips Points Left Over
  await col(page, si).click();
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
  expect(si).toBe(0);
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
  const names = (await rows(page)).map(c => c[2].t);
  const clubbed = names.filter(n => /^Club Wyndham/.test(n));
  expect(clubbed.length).toBeLessThan(names.length / 4);
  await page.fill("#loc", "club wyndham bonnet");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  const a = (await rows(page)).map(c => c[2].t);
  expect(a.length).toBeGreaterThan(0);
  expect(a.every(n => /bonnet/i.test(n))).toBe(true);
  await page.fill("#loc", "bonnet");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  expect((await rows(page)).length).toBe(a.length);
});

test("thriftypoints: at 1366 and 1400 px wide the table fits without inner scrolling, with a margin", async ({ page }) => {
  for (const w of [1366, 1400]) {
    await page.setViewportSize({ width: w, height: 900 });
    await search(page);
    for (const wide of [false, true]) {
      if (wide) await page.addStyleTag({ content: "body{letter-spacing:0.02em}" }); // simulates wider fonts on another system
      const m = await page.evaluate(() => {
        const s = document.getElementById("scroll"), t = document.getElementById("tbl");
        t.style.width = "1px"; const need = t.getBoundingClientRect().width; t.style.width = "";   // narrowest the table can be
        return { sw: s.scrollWidth, cw: s.clientWidth, margin: Math.round(s.clientWidth - need), page: document.documentElement.scrollWidth <= document.documentElement.clientWidth };
      });
      console.log("width", w, wide ? "wide text" : "normal", "margin", m.margin);
      if (!wide) {   // widened text is measured for information only
        expect(m.sw).toBeLessThanOrEqual(m.cw);
        expect(m.margin).toBeGreaterThanOrEqual(16);
        expect(m.page).toBe(true);
      }
    }
  }
});

test("thriftypoints: no duplicate resort and room type rows, short State codes, sort resets when the VIP Level changes", async ({ page }) => {
  await page.goto(URL);
  await page.selectOption("#vip", { label: "Show All Discounts" });
  await page.fill("#pts", "400,000");
  await page.fill("#minN", "1");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  await page.click("#all").catch(() => {});
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(100);
  const keys = r.map(c => [c[2].t, c[5].t, c[6].t].join("|"));
  expect(new Set(keys).size).toBe(keys.length);
  for (const c of r) expect(c[4].t.length).toBeLessThanOrEqual(2);
  await expect(page.locator('label[for="from"]')).not.toContainText("mm");
  await col(page, 7).click();
  expect(await sortOf(page, 7)).toBe("ascending");
  await page.selectOption("#vip", { label: "VIP Gold" });
  await expect.poll(async () => (await heads(page)).length).toBe(12);
  expect(await page.locator('#tbl thead th[aria-sort="ascending"], #tbl thead th[aria-sort="descending"]').count()).toBe(0);
});

test("thriftypoints: Location finds a state, a resort name and a city with a radius; VIP Discount Date is 60 days before check-in", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator("#area")).toHaveCount(0);
  await expect(page.locator("#state")).toHaveCount(0);
  await expect(page.locator("#radius")).toBeDisabled();
  await page.selectOption("#vip", { label: "Show All Discounts" });
  await page.fill("#pts", "150,000");
  await page.fill("#loc", "Tennessee");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  let r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  expect(r.every(c => c[4].t === "TN")).toBe(true);
  const h = await heads(page);
  expect(h.slice(0, 2)).toEqual(["Season", "Full Price"]);
  expect(h[10]).toBe("VIP Discount Date");
  const n = new Date(), today = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate());
  for (const c of r) {
    const d = dateOf(c[7].t) - 60 * 864e5;
    if (d <= today) expect(c[10].t).toBe("Now"); else expect(dateOf(c[10].t)).toBe(d);
  }
  await page.fill("#loc", "Orlando, Florida, United States");
  await page.locator("#loc").focus();
  await expect(page.locator("#radius")).toBeEnabled();
  await page.selectOption("#radius", "50");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  expect(r.every(c => c[4].t === "FL")).toBe(true);
  await page.selectOption("#vip", { label: "Not VIP" });
  await expect.poll(async () => (await heads(page)).length).toBe(10);
  expect(await heads(page)).not.toContain("VIP Discount Date");
});

test("thriftypoints: Discovery Resorts Only shows only resorts on Club Wyndham's Discovery list (owner, 2026-10-25)", async ({ page }) => {
  await page.goto(URL);
  await page.fill("#pts", "150,000");
  await page.fill("#loc", "Nevada");
  await page.check("#disc");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  const list = await page.evaluate(() => window.DISCOVERY.names.map(n => n.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim()));
  const names = [...new Set((await rows(page)).map(c => c[2].t))];
  expect(names.length).toBeGreaterThan(0);
  for (const n of names) expect(list.some(l => l.endsWith(n.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim()))).toBe(true);
  await page.uncheck("#disc");
  await page.click("#go");
  await expect.poll(async () => new Set((await rows(page)).map(c => c[2].t)).size).toBeGreaterThan(names.length);
});

test("thriftypoints: starts for a new owner: Not VIP, 2 to 7 nights, Points Left Over after Full Price", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator("#vip option:checked")).toHaveText("Not VIP");
  await expect(page.locator("#minN")).toHaveValue("2");
  await expect(page.locator("#maxN")).toHaveValue("7");
  await expect(page.locator(".sub").first()).toContainText("Have points left over?");
  await expect(page.locator("#notice")).toContainText("Not Live Availability");
  await expect(page.locator("#notice a")).toHaveAttribute("href", /clubwyndham/);
  await page.fill("#pts", "60,000");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  const h = await page.$$eval("#tbl thead th", ths => ths.map(th => th.innerText.replace(/[▲▼⇅]/g, "").replace(/\s+/g, " ").trim()));
  expect(h.slice(0, 3)).toEqual(["Season", "Full Price", "Points Left Over"]);
  expect(h).not.toContain("VIP Discount Date");
  const cells = await page.$$eval("#body tr:not(.sub)", trs => trs.map(tr => [tr.children[1].textContent, tr.children[2].textContent, tr.children[10].textContent]));
  for (const [full, left, n] of cells) { expect(num(full) + num(left)).toBe(60000); expect(num(n)).toBeLessThanOrEqual(7); }
});

test("thriftypoints: broad settings show the count and one row per resort and room type; More Dates opens that row's other stays", async ({ page }) => {
  await search(page, { vip: null });
  const many = page.locator("#many");
  await expect(many).toBeVisible();
  await expect(many).toContainText(/Your settings match [\d,]+ possible stays/);
  const total = num((await many.textContent()).match(/match ([\d,]+)/)[1]);
  expect(total).toBeGreaterThan(500);
  await expect(page.locator("#status")).toContainText("resorts and room types");
  const r = await rows(page);
  const keys = r.map(c => [c[2].t, c[5].t, c[6].t].join("|"));
  expect(new Set(keys).size).toBe(keys.length);
  const btn = page.locator("#body button.more").first();
  const others = num(await btn.textContent());
  await btn.click();
  const sub = await page.$$eval("#body tr.sub", trs => trs.filter(tr => tr.children.length > 3).map(tr => [tr.children[1].textContent, tr.children[3].textContent, tr.children[6].textContent]));
  expect(sub.length).toBe(Math.min(25, others));
  for (const [full, res, room] of sub) { expect(num(full)).toBeLessThanOrEqual(60000); expect(res).toBe(r[0][2].t); expect(room).toBe(r[0][5].t); }
  await page.locator("#body button.more").first().click();
  await expect(page.locator("#body tr.sub")).toHaveCount(0);
  await page.locator('#many button[data-fix="7"]').click();
  await expect(page.locator("#minN")).toHaveValue("7");
  await expect(page.locator("#maxN")).toHaveValue("7");
});

test("thriftypoints: narrow settings list every stay that fits, more than one per room type", async ({ page }) => {
  const n = new Date(), iso = d => new Date(d).toISOString().slice(0, 10), start = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) + 30 * 864e5;
  await page.goto(URL);
  await page.fill("#pts", "100,000");
  await page.fill("#loc", "bonnet creek");
  await page.fill("#minN", "4");
  await page.fill("#maxN", "4");
  await page.fill("#from", iso(start));
  await page.fill("#to", iso(start + 30 * 864e5));
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  await expect(page.locator("#many")).toBeHidden();
  await expect(page.locator("#status")).toContainText(/^All [\d,]+ stays that fit/);
  await page.click("#all").catch(() => {});
  const r = await rows(page);
  const keys = r.map(c => [c[2].t, c[5].t, c[6].t].join("|"));
  expect(new Set(keys).size).toBeLessThan(keys.length);
  for (const c of r) { expect(num(c[1].t)).toBeLessThanOrEqual(100000); expect(num(c[9].t)).toBe(4); }
  await expect(page.locator("#body button.more")).toHaveCount(0);
});

test("thriftypoints: with VIP prices shown, Points Left Over names its price level and equals the points minus that price", async ({ page }) => {
  await search(page);
  const h = await page.$$eval("#tbl thead th", ths => ths.map(th => th.innerText.replace(/[▲▼⇅]/g, "").replace(/\s+/g, " ").trim()));
  const data = await page.$$eval("#body tr:not(.sub)", trs => trs.map(tr => [...tr.children].map(td => td.innerText.trim())));
  expect(data.length).toBeGreaterThan(0);
  for (const c of data) {
    const [left, level] = c[2].split("\n");
    const i = level === "Full Price" ? 1 : h.findIndex(t => / Off /.test(t + " ") && t.split(" ").includes(level));
    expect(i).toBeGreaterThan(0);
    expect(num(left)).toBe(60000 - num(c[i]));
  }
});

test("thriftypoints: building names are split out of the room type in all three printed forms (owner, 2026-10-25)", async ({ page }) => {
  const look = async q => {
    await page.goto(URL);
    await page.fill("#pts", "400,000");
    await page.fill("#loc", q);
    await page.click("#go");
    await expect(page.locator("#body tr").first()).toBeVisible();
    return page.$$eval("#body tr:not(.sub)", trs => trs.map(tr => [tr.children[6].innerText.trim(), tr.children[7].innerText.trim()]));
  };
  for (const q of ["Sea Gardens", "Palm-Aire", "Smugglers"]) {
    for (const [room, bldg] of await look(q)) {
      expect(room).not.toMatch(/[():]| — /);
      expect(bldg.length).toBeGreaterThan(0);
    }
  }
  const sg = await look("Sea Gardens");
  expect(sg).toContainEqual(["Studio Deluxe", "Ocean View"]);
  expect(sg).toContainEqual(["1 Bedroom Deluxe", "Ocean Palms"]);
  expect(await look("Smugglers")).toContainEqual(["1 Bedroom Deluxe", "Mountain Laurels"]);
  expect(await look("Royal Garden at Waikiki")).toContainEqual(["Studio-J (Asian Inspired)", ""]);
});
