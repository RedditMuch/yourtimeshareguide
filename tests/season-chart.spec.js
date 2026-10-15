// Season chart v2 (protected; this test only reads it). It must load cleanly and draw its chart.
import { test, expect } from "@playwright/test";

test("season chart v2 loads and draws the chart", async ({ page, baseURL }) => {
  const origin = new URL(baseURL).origin;
  const errors = [];
  page.on("pageerror", e => errors.push(`page error: ${e.message}`));
  page.on("console", msg => {
    const url = msg.location().url;
    if (msg.type() === "error" && (!url || url.startsWith(origin))) errors.push(`console: ${msg.text()}`);
  });

  const response = await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
  expect(response.status()).toBe(200);
  await expect(page.locator("h1")).toHaveText("52-week season chart");

  // The script fills <table id="grid"> with one row per resort; an empty result shows a single "No resorts match" cell.
  const rows = page.locator("#grid tbody tr");
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThan(10);
  await expect(page.locator("#grid td.empty")).toHaveCount(0);

  expect(errors).toEqual([]);
});

// A slow redraw finishes in the next frame, with the chart marked busy until then (planning #36): wait for it.
const settled = page => page.waitForFunction(() => document.getElementById("gridWrap").getAttribute("aria-busy") !== "true");

// ---- Planning #38: the owner's list of name and filter fixes. One check per item; rows are found by resort name. ----
const ALL_COLLECTIONS = ["Club Wyndham", "Margaritaville Vacation Club", "Club Pass", "Affiliate", "Associate"];

// Opens the chart with saved filters (the chart reads them from localStorage), optionally selects every room type or one size,
// and returns every row: resort name, building lines, room type, whether it's gray.
async function chartRows(page, { collections = ALL_COLLECTIONS, query = "", cwa = false, size = "all", showAll = true } = {}) {
  const state = { collections: { set: collections }, cwaOnly: cwa, query, span: 0, showAll };
  await page.addInitScript(s => localStorage.setItem("ytg-season-chart-v2", s), JSON.stringify(state));
  await page.goto("/52weeks/seasons-v2.html");
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  await page.evaluate(() => { document.getElementById("filterBox").open = true; }); // folded on a phone
  if (size === "all") { await page.evaluate(() => { const s = document.querySelector("#bedrooms"); s.value = "all"; s.dispatchEvent(new Event("change")); }); await settled(page); }
  else if (size) await page.evaluate(g => { const s = document.querySelector("#bedrooms"); s.value = g; s.dispatchEvent(new Event("change")); }, size); await settled(page); // the filters are folded on a phone
  return page.evaluate(() => { let cur = null;
    return [...document.querySelectorAll("#grid tbody tr")].map(tr => { const th = tr.querySelector("th.res");
      if (th) cur = { resort: th.querySelector(".res-name").textContent, buildings: [...th.querySelectorAll(".res-bldg")].map(b => b.textContent) };
      if (!cur) return null; const typ = tr.querySelector("td.typ");
      const row = { resort: cur.resort, buildings: cur.buildings, type: typ ? typ.textContent : "", gray: tr.classList.contains("gray"), first: !!th };
      return row; }).filter(Boolean); });
}
const of = (rows, name) => rows.filter(r => r.resort === name);

test.describe("season chart v2 names (planning #38)", () => {
  let rows;
  test.beforeEach(async ({ page }) => { rows = await chartRows(page); });

  test("item 3: WorldMark Scottsdale lists the Studio Hotel first", () => {
    const types = of(rows, "WorldMark Scottsdale").map(r => r.type);
    expect(types[0]).toBe("Studio Hotel");
    expect(types.slice(0, 4)).toEqual(["Studio Hotel", "1 BR Suite", "1 BR Deluxe", "1 BR Penthouse"]);
  });

  test("item 4: WorldMark Santa Fe is one resort with its 4 sizes in chart order", () => {
    const sf = of(rows, "WorldMark Santa Fe");
    expect(sf.filter(r => r.first)).toHaveLength(1);
    expect(sf.map(r => r.type)).toEqual(["Hotel Room", "Compact Studio", "1 BR Compact", "1 BR"]);
    expect(sf[0].buildings).toEqual([]);
  });

  test("item 5: Flagstaff room types carry no building names", () => {
    const fl = of(rows, "Flagstaff");
    expect(fl.map(r => r.type)).toContain("2 BR Lockoff");
    for (const r of fl) expect(r.type).not.toMatch(/Tanglewood|Ridgewood/);
  });

  test("item 6: each building on its own right-justified line", async ({ page }) => {
    const fl = of(rows, "Flagstaff").map(r => r.buildings);
    expect(fl).toContainEqual(["Tanglewood I & II", "Ridgewood I", "Ridgewood II - Buildings 1A-15A"]);
    expect(fl).toContainEqual(["Ridgewood II - Buildings 16A-24A"]);
    expect(of(rows, "Palm-Aire").map(r => r.buildings)).toContainEqual(["Fountain Palm", "Sabal Palm"]);
    // SeaWatch: "Towers & North Tower" named from the resort map (owner, 2026-10-11)
    expect(of(rows, "SeaWatch Resort").map(r => r.buildings)).toContainEqual(["South Tower 1", "South Tower 2", "North Tower"]);
    const style = await page.locator(".res-bldg").first().evaluate(e => { const c = getComputedStyle(e); return [c.display, c.textAlign]; });
    expect(style).toEqual(["block", "right"]);
  });

  test("item 7: Makai shows no \"All listed suites\" building", () => {
    for (const name of ["Makai Club", "Makai Club Cottages"]) {
      const m = of(rows, name);
      expect(m.length).toBeGreaterThan(0);
      for (const r of m) expect(r.buildings).toEqual([]);
    }
  });

  test("item 8: Cabin Share I is a building of Angel Fire Resort, like Cabin Share II", () => {
    expect(of(rows, "Angel Fire Resort - Cabin Share I")).toHaveLength(0);
    const af = of(rows, "Angel Fire Resort");
    expect(af.filter(r => r.first)).toHaveLength(af.map(r => r.buildings.join()).filter((v, i, a) => a.indexOf(v) === i).length);
    const by = Object.fromEntries(af.map(r => [r.type, r.buildings]));
    expect(by["3 BR"]).toEqual(["Cabin Share I"]);
    expect(by["3 BR Deluxe"]).toEqual(["Cabin Share II"]);
    expect(by["1 BR Deluxe Lockoff"]).toEqual(["Eagle Wing Suites"]);
  });

  test("Angel Fire Resort: the 1 BR Deluxe Lockoff costs a Hotel Studio plus a Hotel Room Deluxe", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html"); // chart note: "A Hotel Studio and a Hotel Room Deluxe equals total point value for a 1 BR Deluxe Lockoff"
    const sums = await page.evaluate(() => { const r = window.CLUB_PASS_POINTS.resorts["Angel Fire Resort"].tables[0];
      return r.bands.map(b => [b.rates["Eagle Wing Suites 1 BR Deluxe Lockoff"].join(), b.rates["Eagle Wing Suites Hotel Studio"].map((x, i) => x + b.rates["Eagle Wing Suites Hotel Room Deluxe"][i]).join()]); });
    expect(sums).toHaveLength(4);
    for (const [lock, sum] of sums) expect(lock).toBe(sum);
  });

  test("Villas at Fairfield: two listings; the first lists four buildings, Lake Tara Townhouses III has only 2 BR", () => {
    const v = of(rows, "Villas at Fairfield"), by = {};
    for (const r of v) (by[r.buildings.join(" | ")] ||= []).push(r.type);
    expect(by).toEqual({
      "Lake Tara Gardens | Lake Tara Townhouses | Lake Tara Townhouses II | Tara Cove": ["Studio", "1 BR", "2 BR", "2 BR Loft"],
      "Lake Tara Townhouses III": ["2 BR"] });
    expect(v.filter(r => r.first)).toHaveLength(2);
  });

  test("an affiliate dot stays on the same line as the end of the resort name", async ({ page }) => {
    const r = await chartRows(page, { query: "Auberge du Lac Morency" });
    expect(of(r, "Club GeoPremiere at Auberge du Lac Morency").length).toBeGreaterThan(0);
    const gap = await page.evaluate(() => { const b = document.querySelector("#grid .res-name"), d = b.querySelector(".dot.aff"), rects = [...b.querySelector(".nw").getClientRects()];
      const dr = d.getBoundingClientRect(), last = rects[rects.length - 1]; return { dotTop: dr.top, dotBottom: dr.bottom, textTop: last.top, textBottom: last.bottom, lines: rects.length }; });
    expect(gap.dotTop).toBeGreaterThanOrEqual(gap.textTop - 2);
    expect(gap.dotBottom).toBeLessThanOrEqual(gap.textBottom + 2);
  });

  test("items 9 and 11: no \"(listed twice)\" at Cypress Palms or Ocean Walk", () => {
    for (const name of ["Cypress Palms", "Ocean Walk"]) {
      const r = of(rows, name);
      expect(r.map(x => x.type)).toContain("1 BR Deluxe");
      for (const x of r) expect(x.type).not.toContain("listed twice");
    }
  });

  test("item 10: Ocean Ridge room types carry no building names", () => {
    const o = of(rows, "Ocean Ridge");
    for (const r of o) expect(r.type).not.toMatch(/Village|Beach Walk|SouthPointe|—/);
    const b = o.map(r => r.buildings.join(" / "));
    for (const name of ["The Village", "Beach Walk", "SouthPointe", "Bay Point at Edisto / Fairway Terrace / Marsh Point Villas I & II"]) expect(b).toContain(name);
  });

  test("item 12: Pagosa room types carry no building names", () => {
    const p = of(rows, "Pagosa");
    for (const r of p) expect(r.type).not.toMatch(/Teal|Peregrine|Eagle|Ptarmigan|—/);
    const b = p.map(r => r.buildings.join(" / "));
    for (const name of ["Teal Landing", "Peregrine Townhomes", "Eagle’s Loft / Ptarmigan Townhomes"]) expect(b).toContain(name);
  });

  test("item 13: Fairfield Sapphire Valley has its buildings under the resort name, not in room types", () => {
    const s = of(rows, "Resort at Fairfield Sapphire Valley");
    for (const r of s) { expect(r.type).not.toMatch(/Mountain Laurel|Fairway|Foxhunt|—/); expect(r.buildings.length).toBeGreaterThan(0); }
    const b = s.map(r => r.buildings.join(" / "));
    expect(b).toContain("Mountain Laurel");
    expect(b).toContain("Fairway Forest / Foxhunt");
  });

  test("item 14: Royal Garden's room type reads Studio-J (Asian Inspired)", () => {
    const rg = of(rows, "Royal Garden at Waikiki");
    expect(rg.map(r => r.type)).toContain("Studio-J (Asian Inspired)");
    for (const r of rg) expect(r.buildings).toEqual([]);
  });

  test("item 15: Towers on the Grove spells Oceanfront and Oceanview without hyphens", () => {
    const t = of(rows, "Towers on the Grove").map(r => r.type);
    for (const x of t) expect(x).not.toMatch(/Ocean-/);
    expect(t).toEqual(expect.arrayContaining(["Studio Oceanview", "1 BR Oceanview", "1 BR Oceanfront", "2 BR Oceanfront"]));
  });
});

test("item 1: every resort name is ink and bold, including gray rows", async ({ page }) => {
  await chartRows(page, { size: "4 Bedroom" });
  await expect(page.locator("#grid tbody tr.gray .res-name").first()).toBeVisible();
  const looks = await page.locator("#grid .res-name").evaluateAll(els => [...new Set(els.map(e => { const c = getComputedStyle(e); return c.color + " " + c.fontWeight; }))]);
  expect(looks).toHaveLength(1);
  expect(Number(looks[0].split(" ").pop())).toBeGreaterThanOrEqual(600);
});

test("item 2: searching United States shows no Associate resorts", async ({ page }) => {
  const rows = await chartRows(page, { query: "United States", size: null });
  await expect(page.locator("#grid tbody .dot.assoc")).toHaveCount(0);
  for (const name of ["Cairns", "Sydney", "Wanaka"]) expect(of(rows, name)).toHaveLength(0);
  expect(of(rows, "Angel Fire Resort").length).toBeGreaterThan(0); // US affiliates still show
});

// ---- Owner, 2026-10-12: the Collections section (resort types and the CWA Trust). Ticked boxes combine with OR; nothing ticked means all. ----
const resortTotal = async page => Number((await page.locator("#count").textContent()).match(/\/\s*(\d+)/)[1]); // "have / total resorts"
const names = rows => [...new Set(rows.map(r => r.resort))];
const tick = (page, sel) => page.evaluate(s => document.querySelector(s).click(), sel).then(() => settled(page));

test.describe("season chart v2 Collections filters (2026-10-12)", () => {
  test("the message shows only when nothing is selected, and stays visible when Collections is folded", async ({ page }) => {
    await chartRows(page, { size: null, collections: ["Club Wyndham"] });
    const msg = page.locator("#collectionHint");
    await expect(msg).toBeHidden();
    await tick(page, '#collectionChecks input[value="Club Wyndham"]');
    await expect(msg).toBeVisible();
    await expect(msg).toHaveText("No collections are selected, so all collections are shown.");
    await page.evaluate(() => { document.getElementById("collectionBox").open = false; });
    await expect(msg).toBeVisible();
    await tick(page, "#cwaOnly");
    await expect(msg).toBeHidden(); // the CWA box counts as a selection
  });

  test("Club Wyndham Access alone shows exactly the 79 CWA resorts", async ({ page }) => {
    const rows = await chartRows(page, { size: null, collections: [], cwa: true });
    expect(await resortTotal(page)).toBe(79);
    expect(names(rows)).toContain("Royal Vista"); // in the directory's CWA data; not on Club Wyndham's own CWA page (planning #25)
    expect(names(rows)).not.toContain("WorldMark Scottsdale");
  });

  test("CWA is one more box in the list: with every collection ticked, ticking or unticking it changes nothing", async ({ page }) => {
    // Root cause of the 79 / 79 vs 220 / 225 report: CWA used to be a separate AND filter, so a ticked CWA hid every non-CWA resort
    // even with all collections ticked.
    await chartRows(page, { size: "all", cwa: true });
    const withCwa = await resortTotal(page);
    await tick(page, "#cwaOnly");
    const without = await resortTotal(page);
    expect(withCwa).toBe(without);
    expect(without).toBeGreaterThan(200);
  });

  test("CWA adds its resorts to the ticked resort types (Affiliate + CWA > Affiliate alone)", async ({ page }) => {
    await chartRows(page, { size: null, collections: ["Affiliate"] });
    const affiliate = await resortTotal(page);
    await tick(page, "#cwaOnly");
    expect(await resortTotal(page)).toBeGreaterThan(affiliate);
  });

  test("Associate alone shows the 7 ANZ resorts", async ({ page }) => {
    await chartRows(page, { size: null, collections: ["Associate"] });
    expect(await resortTotal(page)).toBe(7);
    await expect(page.locator("#grid tbody .dot.assoc")).toHaveCount(7);
  });

  test("no Locations buttons; resort types are in the owner's order", async ({ page }) => {
    await chartRows(page, { size: null });
    await expect(page.locator("#placeChecks")).toHaveCount(0);
    const labels = await page.locator("#collectionChecks .lbl").allTextContents();
    expect(labels.map(l => l.replace(/Points coming soon|\(Australia & New Zealand\)|Australia & New Zealand/, "").trim())).toEqual(["Club Wyndham", "Affiliate", "WorldMark / Club Pass", "Margaritaville", "Associate"]);
    await expect(page.locator("#collectionChecks .coll-sep")).toHaveCount(1);
  });

  test("Collections rows are evenly spaced with same-size boxes", async ({ page }) => {
    await chartRows(page, { size: null });
    await page.evaluate(() => { document.getElementById("filterBox").open = true; });
    const boxes = await page.locator("#collectionBox input[type=checkbox]").evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
    expect(boxes).toHaveLength(6);
    for (const b of boxes) expect(b).toEqual(boxes[0]);
  });
});

// ---- Owner, 2026-10-12: Bedrooms / Room Types, search aliases, Reset / Clear, Weeks shown ----
test.describe("season chart v2 filters round (2026-10-12)", () => {
  const pick = async (page, v) => { await page.evaluate(v => { const s = document.querySelector("#bedrooms"); s.value = v; s.dispatchEvent(new Event("change")); }, v); await settled(page); };
  const search = async (page, q) => { await page.evaluate(q => { const s = document.querySelector("#search"); s.value = q; s.dispatchEvent(new Event("input")); }, q); await page.waitForTimeout(400); await settled(page); };

  test("Room Types is always shown; None = (0 of N); ALL and Presidential select the right types", async ({ page }) => {
    await chartRows(page, { size: null });
    await page.evaluate(() => { document.getElementById("filterBox").open = true; });
    const sum = page.locator("#typeSummary");
    await expect(page.locator("#typeBox > summary")).toContainText("Room Types");
    await pick(page, "");
    await expect(page.locator("#typeBox")).toBeVisible();
    await expect(sum).toHaveText(/^\(0 of \d+\)$/);
    const total = Number((await sum.textContent()).match(/of (\d+)/)[1]);
    await pick(page, "all");
    await expect(sum).toHaveText(`(${total} of ${total})`);
    await pick(page, "presidential");
    await expect(sum).toHaveText(`(10 of ${total})`);
    const ticked = await page.locator("#typeTree input[value]:checked").evaluateAll(els => els.map(e => e.value));
    expect(ticked.every(v => /presidential/.test(v))).toBe(true);
    // unticking every type sets Bedrooms to None
    await pick(page, "1 Bedroom");
    for (const v of await page.locator("#typeTree input[value]:checked").evaluateAll(els => els.map(e => e.value))) await page.evaluate(v => document.querySelector(`#typeTree input[value="${v}"]`).click(), v);
    await settled(page);
    await expect(page.locator("#bedrooms")).toHaveValue("");
  });

  test("country names and aliases find the right resorts", async ({ page }) => {
    await chartRows(page, { size: null });
    const count = async q => { await search(page, q); return (await page.locator("#grid td.empty").count()) ? 0 : await resortTotal(page); };
    const us = await count("United States");
    expect(us).toBeGreaterThan(100);
    expect(await count("US")).toBe(us);
    expect(await count("USA")).toBe(us);
    const pr = await count("Puerto Rico");
    expect(pr).toBeGreaterThan(0);
    expect(await count("PR")).toBe(pr);
    const nz = await count("New Zealand");
    expect(await count("NZ")).toBe(nz);
  });

  test("Reset and Clear links; Weeks shown options", async ({ page }) => {
    await chartRows(page, { size: null });
    await page.evaluate(() => { document.getElementById("filterBox").open = true; });
    await search(page, "Arizona");
    await tick(page, "#cwaOnly");
    await tick(page, "#clearSearch");
    await expect(page.locator("#search")).toHaveValue("");
    await pick(page, "all");
    await tick(page, "#reset");
    await expect(page.locator("#bedrooms")).toHaveValue("1 Bedroom");
    expect(await page.locator("#collectionChecks input:checked").evaluateAll(els => els.map(e => e.value))).toEqual(["Club Wyndham", "Affiliate"]);
    await expect(page.locator("#cwaOnly")).not.toBeChecked();
    await expect(page.locator("#filterBox .fold-body > button.reset")).toHaveCount(0);
    expect(await page.locator("#spanButtons button").allTextContents()).toEqual(["Selected", "1", "2", "5", "10", "15", "All"]);
  });

  test("By Week / By Dates box: Title Case labels, same size in both modes, equal control heights", async ({ page }) => {
    await chartRows(page, { size: null });
    const box = () => page.locator(".timebox").boundingBox();
    const week = await box();
    expect((await page.locator(".mode-opt").allTextContents()).map(t => t.trim())).toEqual(["By Week", "By Dates"]);
    await expect(page.locator("label[for=week]")).toHaveText("Vacation Week");
    const h = await page.evaluate(() => ["#week", "#spanButtons"].map(s => document.querySelector(s).getBoundingClientRect().height));
    expect(h[0]).toBe(h[1]);
    await page.locator(".mode-opt", { hasText: "By Dates" }).click();
    const dates = await box();
    expect(dates.height).toBe(week.height);
    expect(dates.width).toBe(week.width);
    await expect(page.locator("label[for=startDate]")).toHaveText("Start Date");
    await expect(page.locator("label[for=endDate]")).toHaveText("End Date");
    await expect(page.locator("#clearDates")).toHaveText("Clear Dates");
    expect((await page.locator("#startDate").boundingBox()).height).toBe((await page.locator("#endDate").boundingBox()).height);
    await page.locator(".mode-opt", { hasText: "By Week" }).click();
    expect((await box()).height).toBe(week.height);
  });

  test("polish 2: date inputs share a line with the week controls; Clear Dates sits right above the By Dates button; box stays compact", async ({ page }) => {
    await chartRows(page, { size: null });
    const isPhone = (page.viewportSize()?.width ?? 1280) < 600;
    const rect = s => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(), t = document.querySelector(".timebox").getBoundingClientRect(); return { x: r.x, y: r.y - t.y, w: r.width, h: r.height, b: r.bottom - t.y }; }, s);
    const wk = await rect("#week");
    const week = await page.locator(".timebox").boundingBox();
    await expect(page.locator("#clearDates")).toBeHidden();
    await page.locator(".mode-opt", { hasText: "By Dates" }).click();
    await expect(page.locator("#clearDates")).toBeVisible();
    const ds = await rect("#startDate"), de = await rect("#endDate"), clr = await rect("#clearDates");
    const btn = await page.locator(".mode-opt", { hasText: "By Dates" }).evaluate(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y - document.querySelector(".timebox").getBoundingClientRect().y, w: r.width }; });
    expect(ds.y).toBe(wk.y); expect(ds.h).toBe(wk.h);
    expect(de.y).toBe(ds.y); expect(de.h).toBe(ds.h);
    expect(clr.b).toBeLessThanOrEqual(btn.y);
    expect(btn.y - clr.b).toBeLessThan(12);
    expect(Math.abs((clr.x + clr.w / 2) - (btn.x + btn.w / 2))).toBeLessThan(3);
    expect((await page.locator(".timebox").boundingBox()).height).toBe(week.height);
    expect(week.height).toBeLessThan(isPhone ? 220 : 110);
    if (isPhone) expect(clr.h).toBeGreaterThanOrEqual(32);
    await page.locator(".mode-opt", { hasText: "By Week" }).click();
    await expect(page.locator("#clearDates")).toBeHidden();
    expect((await rect("#week")).y).toBe(wk.y);
  });

  test("polish 2: Location header, placeholder, dot, and the Explore popup opens only on click or key", async ({ page }) => {
    await chartRows(page, { size: null });
    const isPhone = (page.viewportSize()?.width ?? 1280) < 600;
    await page.evaluate(() => { document.getElementById("filterBox").open = true; });
    await expect(page.locator("label.sub-label[for=search]")).toHaveText("City & State, Resort Name, State or Country");
    await expect(page.locator("#search")).toHaveAttribute("placeholder", "e.g. Bay Club, Maine, Canada");
    const gap = await page.evaluate(() => document.querySelector("label.sub-label[for=search]").getBoundingClientRect().top - document.querySelector("#locationTitle").getBoundingClientRect().bottom);
    expect(gap).toBeLessThanOrEqual(4);
    const dot = await page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(), d = document.querySelector(".label-tools .dot-sep"); return { txt: d.textContent, aria: d.getAttribute("aria-hidden"), l: r(".label-tools .dot-sep").left - r("#countryTipBtn").right, rt: r("#clearSearch").left - r(".label-tools .dot-sep").right }; });
    expect(dot.txt).toBe("·"); expect(dot.aria).toBe("true");
    expect(Math.abs(dot.l - dot.rt)).toBeLessThan(2);
    if (!isPhone) { await page.locator("#countryTipBtn").hover(); await page.waitForTimeout(300); await expect(page.locator("#countryTip")).toBeHidden(); }
    await expect(page.locator("#countryTipBtn")).toHaveAttribute("aria-expanded", "false");
    await page.locator("#countryTipBtn").click();
    await expect(page.locator("#countryTip")).toBeVisible();
    await expect(page.locator("#countryTipBtn")).toHaveAttribute("aria-expanded", "true");
    const tip = await page.evaluate(() => { const p = document.querySelector("#countryTip"), c = p.getBoundingClientRect(), mid = c.left + c.width / 2, m = s => { const r = p.querySelector(s).getBoundingClientRect(); return r.left + r.width / 2; }; return { title: m(".tip-title") - mid, choose: m(".tip-choose") - mid, ct: p.querySelector(".tip-choose").textContent, ta: getComputedStyle(p.querySelector(".tip-title")).textAlign, tc: getComputedStyle(p.querySelector(".tip-choose")).textAlign, indent: p.querySelector("#countryList button").getBoundingClientRect().left - c.left, h: c.height }; });
    expect(tip.ct).toBe("Choose From:"); expect(tip.ta).toBe("center"); expect(tip.tc).toBe("center");
    expect(Math.abs(tip.title)).toBeLessThan(3); expect(Math.abs(tip.choose)).toBeLessThan(3);
    expect(tip.indent).toBeGreaterThan(24);
    expect(tip.h).toBeLessThan(isPhone ? 290 : 270); // includes the blank line under the last country (owner, 2026-10-13)
    await page.keyboard.press("Escape");
    await expect(page.locator("#countryTip")).toBeHidden();
    await page.locator("#countryTipBtn").focus(); await page.keyboard.press("Enter");
    await expect(page.locator("#countryTip")).toBeVisible();
    await page.locator("h1").click();
    await expect(page.locator("#countryTip")).toBeHidden();
  });

  test("countries info lists the eight places and fills the search", async ({ page }) => {
    await chartRows(page, { size: null });
    await page.evaluate(() => { document.getElementById("filterBox").open = true; });
    await page.locator("#countryTipBtn").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#countryTip")).toBeVisible();
    expect(await page.locator("#countryList button").allTextContents()).toEqual(["Australia", "Canada", "Fiji", "Mexico", "New Zealand", "Puerto Rico", "United States", "US Virgin Islands"]);
    await page.locator("#countryList button", { hasText: "Fiji" }).click();
    await expect(page.locator("#search")).toHaveValue("Fiji");
  });
});

// ---- Owner, 2026-10-12: "To see more resorts" chips, and the country message ----
test.describe("season chart v2 To see more resorts (2026-10-12)", () => {
  const more = page => page.locator("#more");
  const chip = (page, act) => page.locator(`#more .more-chip[data-act="${act}"]`);
  const checked = page => page.locator("#collectionChecks input:checked").evaluateAll(els => els.map(e => e.value));
  const search = async (page, q) => { await page.evaluate(q => { const s = document.querySelector("#search"); s.value = q; s.dispatchEvent(new Event("input")); }, q); await page.waitForTimeout(400); await settled(page); };

  test("nothing hidden: says you are seeing every matching resort", async ({ page }) => {
    await chartRows(page, { size: "all" });
    await expect(more(page)).toHaveAttribute("aria-live", "polite");
    await expect(more(page)).toContainText("You’re seeing every resort that matches.");
    await expect(page.locator("#more .more-chip")).toHaveCount(0);
  });

  test("Collections chip adds the collections needed", async ({ page }) => {
    await chartRows(page, { collections: ["Club Wyndham"], size: "1 Bedroom" });
    await expect(chip(page, "collections")).toContainText(/\+\d+ resorts? in other collections/);
    await expect(chip(page, "collections")).toContainText("Add them");
    await chip(page, "collections").focus(); await page.keyboard.press("Enter"); await settled(page);
    expect((await checked(page)).length).toBeGreaterThan(1);
    await expect(chip(page, "collections")).toHaveCount(0);
    await expect(more(page)).toContainText("every resort that matches");
  });

  test("Collections chip also shows when nothing matches", async ({ page }) => {
    await chartRows(page, { collections: ["Club Wyndham"], size: "1 Bedroom", query: "Fiji" });
    await expect(page.locator("#grid td.empty")).toHaveCount(1);
    await expect(chip(page, "collections")).toBeVisible();
    await chip(page, "collections").click(); await settled(page);
    await expect(page.locator("#grid td.empty")).toHaveCount(0);
  });

  test("Seasons chip: other seasons this week", async ({ page }) => {
    await chartRows(page, { size: "1 Bedroom" });
    await page.locator("#seasonList .season-opt[data-season]:not([data-season=''])").evaluateAll(els => { const b = els.find(e => !e.disabled); b.click(); });
    await settled(page);
    await expect(chip(page, "seasons")).toContainText(/\+\d+ resorts? in other seasons this week/);
    await chip(page, "seasons").click(); await settled(page);
    await expect(page.locator("#seasonList .season-opt[aria-pressed=true]")).toHaveText(/All/);
    await expect(chip(page, "seasons")).toHaveCount(0);
  });

  test("Sizes chip: resorts without the selected size", async ({ page }) => {
    // The "show all resorts" box is gone from the grid; only an older saved state can still hide resorts without the size
    await chartRows(page, { size: "Studio", showAll: false });
    await expect(chip(page, "sizes")).toContainText(/\+\d+ resorts? without studios/);
    await chip(page, "sizes").click(); await settled(page);
    await expect(page.locator("#bedrooms")).toHaveValue("all");
    await expect(chip(page, "sizes")).toHaveCount(0);
  });

  test("Search chip clears a narrowing search", async ({ page }) => {
    await chartRows(page, { size: "all" });
    await search(page, "Arizona");
    await expect(chip(page, "search")).toContainText(/\+\d+ resorts?/);
    await chip(page, "search").click(); await settled(page);
    await expect(page.locator("#search")).toHaveValue("");
    await expect(chip(page, "search")).toHaveCount(0);
  });

  test("Reset still returns to the defaults", async ({ page }) => {
    await chartRows(page, { collections: ["Club Wyndham"], size: "1 Bedroom" });
    await chip(page, "collections").click(); await settled(page);
    await tick(page, "#reset");
    expect(await checked(page)).toEqual(["Club Wyndham", "Affiliate"]);
  });

  test("choosing Fiji in the countries list selects its collections and shows the message", async ({ page }) => {
    await chartRows(page, { collections: ["Club Wyndham"], size: "1 Bedroom" });
    await page.locator("#countryTipBtn").focus(); await page.keyboard.press("Enter");
    await page.locator("#countryList button", { hasText: "Fiji" }).click(); await settled(page);
    expect(await checked(page)).toContain("Club Pass");
    await expect(page.locator("#grid td.empty")).toHaveCount(0);
    await expect(more(page).locator(".note")).toContainText("Showing Fiji resorts. For the most resorts:");
    await expect(chip(page, "allcoll")).toHaveText("All collections");
    await expect(chip(page, "allseasons")).toHaveText("All seasons");
  });

  test("typing a country never changes Collections, but shows the chips", async ({ page }) => {
    await chartRows(page, { collections: ["Club Wyndham", "Affiliate"], size: "1 Bedroom" });
    for (const q of ["Fiji", "PR", "NZ", "USVI", "US", "USA", "United States"]) {
      await search(page, q);
      expect(await checked(page)).toEqual(["Club Wyndham", "Affiliate"]);
      await expect(more(page).locator(".note")).toContainText("resorts. For the most resorts:");
    }
    await search(page, "Fiji");
    await chip(page, "allcoll").click(); await settled(page);
    expect(await checked(page)).toContain("Club Pass");
    await expect(page.locator("#grid td.empty")).toHaveCount(0);
  });
});

// ---- Owner, 2026-10-13: Collections Select All / Clear, filter order ----
test.describe("season chart v2 round 5 (2026-10-13)", () => {
  test("Select All skips CWA, Clear clears everything including CWA; Bedrooms and Room Types sit below Collections", async ({ page }) => {
    await chartRows(page, { size: null });
    await page.evaluate(() => { document.getElementById("filterBox").open = true; });
    await expect(page.locator("#collAll")).toHaveText("Select All");
    await expect(page.locator("#collClear")).toHaveText("Clear");
    await page.evaluate(() => document.getElementById("cwaOnly").click());
    await page.locator("#collAll").click();
    await settled(page);
    const on = await page.locator("#collectionChecks input").evaluateAll(els => els.map(e => e.checked));
    expect(on.length).toBeGreaterThan(0); expect(on.every(Boolean)).toBe(true);
    await expect(page.locator("#cwaOnly")).toBeChecked(); // Select All leaves CWA as it was
    await page.evaluate(() => document.getElementById("cwaOnly").click());
    await page.locator("#collAll").click(); await settled(page);
    await expect(page.locator("#cwaOnly")).not.toBeChecked(); // and never turns it on
    await page.evaluate(() => document.getElementById("cwaOnly").click());
    await page.locator("#collClear").click(); await settled(page);
    expect(await page.locator("#collectionChecks input:checked").count()).toBe(0);
    await expect(page.locator("#cwaOnly")).not.toBeChecked();
    const order = await page.evaluate(() => { const y = id => document.getElementById(id).getBoundingClientRect().top; return [y("collectionBox"), y("bedrooms"), y("typeBox")]; });
    expect(order[0]).toBeLessThan(order[1]); expect(order[1]).toBeLessThan(order[2]);
  });
});

test.describe("season chart v2 weekday and weekend columns (planning #47)", () => {
  test("By Week shows Weekday and Weekend columns after the weeks; By Dates shows Total instead", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    const heads = await page.locator("#grid thead th").allTextContents();
    expect(heads.slice(-2).map(t => t.slice(0, 7))).toEqual(["Weekday", "Weekend"]);
    const filled = await page.locator("#grid tbody td.nt.wd").evaluateAll(tds => tds.filter(t => /\d/.test(t.textContent)).length);
    expect(filled).toBeGreaterThan(0);
    expect(await page.locator("#grid tbody tr:first-child td.nt").count()).toBe(2);
    await page.locator(".mode-opt", { hasText: "By Dates" }).click();
    await page.locator("#startDate").fill("2026-11-02"); await page.locator("#endDate").fill("2026-11-06");
    await expect(page.locator("#grid thead th.tot")).toHaveCount(1);
    expect(await page.locator("#grid thead th.nt").count()).toBe(0);
  });
});

test.describe("season chart v2 week 53 follows week 52 (planning #48)", () => {
  test("week 53 shows week 52 values with a slashed overlay and a note", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    await page.locator("#week").selectOption({ label: (await page.locator("#week option").allTextContents()).find(t => /^Week 53/.test(t.trim())) });
    await expect(page.locator("#grid td.w53").first()).toBeAttached();
    const same = await page.evaluate(() => {
      const heads = [...document.querySelectorAll("#grid thead th.wk")];
      const i52 = heads.findIndex(h => h.querySelector("b")?.textContent === "52"), i53 = heads.findIndex(h => h.querySelector("b")?.textContent === "53");
      const rows = [...document.querySelectorAll("#grid tbody tr")].filter(r => r.querySelector("td.w53"));
      return { ok: i52 >= 0 && i53 === i52 + 1 && rows.length > 0 && rows.every(r => { const cs = r.querySelectorAll("td.c"), a = cs[i52], b = cs[i53]; return a.textContent === b.textContent && [...a.classList].find(c => /^s-/.test(c)) === [...b.classList].find(c => /^s-/.test(c)); }) };
    });
    expect(same.ok).toBe(true);
    await expect(page.locator("#week53Note")).toBeVisible();
    await expect(page.locator("#week53Note")).toContainText("follows week 52");
  });
});
