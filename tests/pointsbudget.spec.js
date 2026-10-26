// Where Can My Points Take Me? (pointsbudget.html; called Thrifty Points until 2026-10-25): every price shown (full and each VIP discount), planning #53.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/pointsbudget.html";
const open = async page => { await page.goto(URL); await page.selectOption("#size", { label: "All Sizes" }); };
const num = t => parseInt(String(t).replace(/[^\d]/g, ""), 10);
const isDash = t => !/\d/.test(t);
const dateOf = s => { const m = /^(\d\d)\/(\d\d)\/(\d\d)$/.exec(s); return Date.UTC(2000 + +m[3], +m[1] - 1, +m[2]); };

async function search(page, { points = "60,000", from, to, vip = "Show All Discounts" } = {}) {
  await open(page);
  await page.fill("#pts", points);
  if (vip) await page.selectOption("#vip", { label: vip });
  if (from) await page.fill("#from", from);
  if (to) await page.fill("#to", to);
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
}
// Columns as rows() and heads() return them (they skip Points Left Over, the 3rd column on the page, and the More Dates button):
// 0 Season, 1 Full Price, 2 Resort, 3 City, 4 State, 5 Room Type, 6 Building, 7 Check-In, 8 Check-Out, 9 Nights, 10 VIP Discount Date (only with VIP prices), 11.. discount columns
const rows = page => page.$$eval("#body tr:not(.sub)", trs => trs.map(tr => [...tr.children].filter(td => !td.classList.contains("left")).map(td => { const c = td.cloneNode(true); c.querySelectorAll("button, small").forEach(b => b.remove()); return { t: c.textContent.trim(), fit: td.dataset.fit, cls: td.className }; })));
const heads = page => page.$$eval("#tbl thead th", ths => ths.map(th => th.innerText.replace(/[▲▼⇅]/g, "").replace(/\s+/g, " ").trim()).filter(t => t !== "Points Left Over"));
const col = (page, i) => page.locator('#tbl thead button[data-col="' + (i >= 2 ? i + 1 : i) + '"]');   // page column for a heads() index
const sortOf = (page, i) => page.locator("#tbl thead th").nth(i >= 2 ? i + 1 : i).getAttribute("aria-sort");
const daysOut = c => { const n = new Date(); return Math.round((dateOf(c[7].t) - Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())) / 864e5); };

test("pointsbudget: the VIP Level dropdown tailors the columns and re-renders when changed", async ({ page }) => {
  await search(page);
  await expect(page.locator("#vip")).toHaveCount(1);
  const all = await heads(page);
  expect(all.length).toBeGreaterThan(8);
  const pcts = all.slice(11).map(num);
  expect(pcts).toEqual([...pcts].sort((a, b) => a - b));
  expect(pcts).toContain(35);
  await page.selectOption("#vip", { label: "Non-VIP" });
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

test("pointsbudget: every row has a price at most 60,000 and highlights match exactly", async ({ page }) => {
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

test("pointsbudget: 35% Off is the rounded-up full price times 0.65 for every stay, near or far; no dashes", async ({ page }) => {
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

test("pointsbudget: results stay inside the chosen date range", async ({ page }) => {
  const now = new Date(); const iso = d => new Date(d).toISOString().slice(0, 10);
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) + 100 * 864e5, end = start + 30 * 864e5;
  await search(page, { from: iso(start), to: iso(end) });
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) { expect(dateOf(c[7].t)).toBeGreaterThanOrEqual(start); expect(dateOf(c[8].t)).toBeLessThanOrEqual(end); }
});

test("pointsbudget: no console errors and no sideways scrolling; the table sits in a labelled scroll region", async ({ page }) => {
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

test("pointsbudget: dates are mm/dd/yy and check-out is after check-in", async ({ page }) => {
  await search(page);
  const r = await rows(page);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) {
    expect(c[7].t).toMatch(/^\d\d\/\d\d\/\d\d$/);
    expect(c[8].t).toMatch(/^\d\d\/\d\d\/\d\d$/);
    expect(dateOf(c[8].t)).toBeGreaterThan(dateOf(c[7].t));
  }
});

test("pointsbudget: sorting by Check-In, Nights and Reset Order", async ({ page }) => {
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

test("pointsbudget: City and State columns exist, State sorts with equal codes grouped, every heading has an indicator", async ({ page }) => {
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

test("pointsbudget: the Season cell shows the season name on its color, Full Price uses the green fit highlight, and Season sorts in groups", async ({ page }) => {
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

test("pointsbudget: Club Wyndham is dropped from resort names but typing it still finds the resort", async ({ page }) => {
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

test("pointsbudget: at 1366 and 1400 px wide the table fits without inner scrolling, with a margin", async ({ page }) => {
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

test("pointsbudget: no duplicate resort and room type rows, short State codes, sort resets when the VIP Level changes", async ({ page }) => {
  await open(page);
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

test("pointsbudget: Location finds a state, a resort name and a city with a radius; VIP Discount Date is 60 days before check-in", async ({ page }) => {
  await open(page);
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
  await page.selectOption("#vip", { label: "Non-VIP" });
  await expect.poll(async () => (await heads(page)).length).toBe(10);
  expect(await heads(page)).not.toContain("VIP Discount Date");
});

test("pointsbudget: Discovery Resorts Only shows only resorts on Club Wyndham's Discovery list (owner, 2026-10-25)", async ({ page }) => {
  await open(page);
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

test("pointsbudget: starts for a new owner: Not VIP, 1 Bedroom, 2 to 7 nights, Points Left Over after Full Price", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator("#size option:checked")).toHaveText("1 Bedroom");
  await expect(page.locator("#size option").last()).toHaveText("All Sizes");
  await expect(page.locator("#vip option").last()).toHaveText("Show All Discounts");
  await expect(page.locator("#vip option:checked")).toHaveText("Non-VIP");
  await expect(page.locator("#minN")).toHaveValue("2");
  await expect(page.locator("#maxN")).toHaveValue("7");
  await expect(page.locator("h1")).toHaveText("Where Can My Points Take Me?");
  await expect(page.locator(".sub").first()).toHaveText("Find resorts, travel dates and room types that fit your Club Wyndham points budget.");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Find stays that fit your points and explore your options.");
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

test("pointsbudget: broad settings show the count and one row per resort and room type; More Dates opens that row's other stays", async ({ page }) => {
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

test("pointsbudget: narrow settings list every stay that fits, more than one per room type", async ({ page }) => {
  const n = new Date(), iso = d => new Date(d).toISOString().slice(0, 10), start = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) + 30 * 864e5;
  await open(page);
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

test("pointsbudget: with VIP prices shown, Points Left Over names its price level and equals the points minus that price", async ({ page }) => {
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

test("pointsbudget: building names are split out of the room type in all three printed forms (owner, 2026-10-25)", async ({ page }) => {
  const look = async q => {
    await open(page);
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

test("pointsbudget: SeaWatch's second chart shows as Villas, and no Building is ever a placeholder like Chart 1 (owner, 2026-10-25)", async ({ page }) => {
  await open(page);
  await page.fill("#pts", "400,000");
  await page.fill("#loc", "SeaWatch");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  const r = await page.$$eval("#body tr:not(.sub)", trs => trs.map(tr => [tr.children[6].innerText.trim(), tr.children[7].innerText.trim()]));
  expect(r).toContainEqual(["1 Bedroom Deluxe", "Villas"]);
  expect(r).toContainEqual(["1 Bedroom Deluxe", "Towers & North Tower"]);
  await page.fill("#loc", "");
  await page.click("#go");
  await page.click("#all").catch(() => {});
  const blds = await page.$$eval("#body td.bld", tds => tds.map(td => td.innerText.trim()));
  expect(blds.filter(b => /^(Chart \d+|All listed suites)$/i.test(b))).toEqual([]);
});

test("pointsbudget: rows with week-by-week nightly points are searched, e.g. Ocean Boulevard Towers 1 and 2 (owner, 2026-10-25)", async ({ page }) => {
  await open(page);
  await page.fill("#pts", "400,000");
  await page.fill("#loc", "Ocean Boulevard");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  const blds = new Set(await page.$$eval("#body tr:not(.sub) td.bld", tds => tds.map(td => td.innerText.trim())));
  for (const t of ["Tower 1", "Tower 2", "Tower 3", "Tower 4"]) expect(blds.has(t)).toBe(true);
});

test("pointsbudget: the old thriftypoints.html address forwards to pointsbudget.html, keeping the hash", async ({ page }) => {
  await page.goto("/52weeks/thriftypoints.html#x");
  await expect(page).toHaveURL(/\/52weeks\/pointsbudget\.html#x$/);
  await expect(page.locator("h1")).toHaveText("Where Can My Points Take Me?");
});

test("pointsbudget: Check-In Day buttons and Weeknights Only; the day shows under each date (owner, 2026-10-25)", async ({ page }) => {
  const dow = s => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(dateOf(s)).getUTCDay()];
  const cells = () => page.$$eval("#body tr:not(.sub)", trs => trs.map(tr => [tr.children[8].innerText.trim().split("\n"), tr.children[9].innerText.trim().split("\n"), tr.children[10].innerText.trim()]));
  await open(page);
  await page.fill("#pts", "60,000");
  await page.click('button.grpday[data-days="5,6"]');   // Weekend link: Fri and Sat only
  await expect(page.locator("button.day[aria-pressed=true]")).toHaveCount(2);
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  for (const [ci, co] of await cells()) {
    expect(["Fri", "Sat"]).toContain(ci[1]);
    expect(ci[1]).toBe(dow(ci[0]));
    expect(co[1]).toBe(dow(co[0]));
  }
  await page.click('button.grpday[data-days="0,1,2,3,4"]');   // Weekday link: Sun to Thu only
  await expect(page.locator("button.day[aria-pressed=true]")).toHaveCount(5);
  await page.check("#wkn");
  await page.click("#go");
  await expect(page.locator("#body tr").first()).toBeVisible();
  for (const [ci, co, n] of await cells()) {
    expect(["Sun", "Mon", "Tue", "Wed", "Thu"]).toContain(ci[1]);
    expect(num(n)).toBeLessThanOrEqual(5);
    for (let d = dateOf(ci[0]); d < dateOf(co[0]); d += 864e5) expect([5, 6]).not.toContain(new Date(d).getUTCDay());
  }
  for (const d of await page.$$eval("button.day[aria-pressed=true]", bs => bs.map(b => b.dataset.d))) await page.click('button.day[data-d="' + d + '"]');
  await expect(page.locator("button.day[aria-pressed=true]")).toHaveCount(0);
  await page.click("#go");
  await expect(page.locator("#err")).toHaveText("Pick at least one check-in day.");
});

test("pointsbudget: one night shows the red note; the availability notice sits below the results (owner, 2026-10-25)", async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator("#oneNight")).toBeHidden();
  await page.fill("#minN", "1");
  await expect(page.locator("#oneNight")).toBeVisible();
  await expect(page.locator("#oneNight")).toHaveText("For information only: Club Wyndham's minimum booking is 2 nights.");
  await expect(page.locator("#oneNight")).toHaveCSS("color", "rgb(185, 28, 28)");
  await page.fill("#minN", "2");
  await expect(page.locator("#oneNight")).toBeHidden();
  const order = await page.evaluate(() => { const n = document.getElementById("notice"), r = document.getElementById("resCard"); return !!(r.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING); });
  expect(order).toBe(true);
});

test("pointsbudget: day buttons are solid green when on and red-outlined with grey text when off; Max Nights warns above 5 with weeknights (owner, 2026-10-25)", async ({ page }) => {
  await page.goto(URL);
  const sun = page.locator('button.day[data-d="0"]');
  await expect(sun).toHaveCSS("background-color", "rgb(21, 128, 61)");
  await sun.click();
  await expect(sun).toHaveAttribute("aria-pressed", "false");
  await expect(sun).toHaveCSS("border-top-color", "rgb(185, 28, 28)");
  await expect(sun).toHaveCSS("color", "rgb(107, 114, 128)");
  await expect(page.locator("#maxWarn")).toBeHidden();
  await page.check("#wkn");
  await expect(page.locator("#maxWarn")).toBeVisible();
  await expect(page.locator("#maxWarn")).toHaveText("Max Nights needs to be 5 or less for weeknight-only stays.");
  await page.fill("#maxN", "5");
  await expect(page.locator("#maxWarn")).toBeHidden();
  await page.fill("#maxN", "6");
  await expect(page.locator("#maxWarn")).toBeVisible();
  await page.uncheck("#wkn");
  await expect(page.locator("#maxWarn")).toBeHidden();
});

test("pointsbudget: weeknights only selects Sun to Wed for 2 night stays (Sun to Tue for 3); picking Weekend again unchecks it (owner, 2026-10-25)", async ({ page }) => {
  await page.goto(URL);
  const on = () => page.$$eval("button.day[aria-pressed=true]", bs => bs.map(b => b.textContent).join(","));
  await page.check("#wkn");
  expect(await on()).toBe("Sun,Mon,Tue,Wed");
  await page.fill("#minN", "3");
  expect(await on()).toBe("Sun,Mon,Tue");
  await page.fill("#minN", "1");
  expect(await on()).toBe("Sun,Mon,Tue,Wed,Thu");
  await page.click('button.grpday[data-days="5,6"]');
  await expect(page.locator("#wkn")).not.toBeChecked();
  await expect(page.locator("button.day[aria-pressed=true]")).toHaveCount(2);
});
