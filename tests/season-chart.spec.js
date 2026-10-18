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
    await expect(page.locator("#grid tbody .dot.assoc")).toHaveCount(7); // one listing and one dot per resort (Sydney Suites was removed 10/18/26: the owner could not verify it exists)
  });

  test("no Locations buttons; resort types are in the owner's order", async ({ page }) => {
    await chartRows(page, { size: null });
    await expect(page.locator("#placeChecks")).toHaveCount(0);
    const labels = await page.locator("#collectionChecks .lbl").allTextContents();
    expect(labels.map(l => l.replace(/No Points Chart Available|Points coming soon|\(Australia & New Zealand\)|Australia & New Zealand/, "").trim())).toEqual(["Club Wyndham", "Affiliate", "WorldMark / Club Pass", "Margaritaville", "Associate"]);
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
    // every room type whose name says Presidential (plain ones and named ones such as 2 BR Presidential Lower), nothing else
    const ticked = await page.locator("#typeTree input[value]:checked").evaluateAll(els => els.map(e => e.value));
    expect(ticked.length).toBeGreaterThanOrEqual(10);
    await expect(sum).toHaveText(`(${ticked.length} of ${total})`);
    expect(ticked.every(v => /presidential/i.test(v))).toBe(true);
    expect(await page.locator("#typeTree input[value]:not(:checked)").evaluateAll(els => els.filter(e => /presidential/i.test(e.value)).length)).toBe(0);
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

test.describe("season chart v2 nightly points for Club Wyndham (planning #52)", () => {
  test("most Club Wyndham rows now show Weekday and Weekend nightly points that add up to the weekly points", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    const r = await page.evaluate(() => {
      const rows = [...document.querySelectorAll("#grid tbody tr")], num = t => { const m = /^([\d.]+)k$/.exec(t.trim()); return m ? Math.round(parseFloat(m[1]) * 1000) : null; };
      let filled = 0, total = 0, off = 0;
      for (const tr of rows) {
        const wd = tr.querySelector("td.nt.wd"), we = tr.querySelector("td.nt.we"), cells = tr.querySelectorAll("td.c"); if (!wd || !we) continue; total++;
        const a = num(wd.textContent), b = num(we.textContent); if (a == null || b == null) continue; filled++;
        const sel = tr.querySelector("td.c.sel"), w = sel ? num(sel.textContent) : null;
        if (w != null && Math.abs(5 * a + 2 * b - w) > 0.05 * w) off++; /* k-rounded numbers: allow 5% */
      }
      return { filled, total, off };
    });
    expect(r.filled).toBeGreaterThan(r.total * 0.5);
    expect(r.off).toBe(0);
  });
});

test.describe("season chart v2 nightly data fallback (planning #52)", () => {
  test("if nightlydata.js does not load, the page still works and shows ellipses", async ({ page }) => {
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/nightlydata.js", route => route.abort());
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    const cw = await page.locator("#grid tbody td.nt.wd").evaluateAll(tds => tds.filter(t => t.textContent.trim() === "…").length);
    expect(cw).toBeGreaterThan(50);
    expect(errors).toEqual([]);
  });
});

// ---- Planning #44 and #43 (c): select a week from its header, sortable Weekday and Weekend, room types smallest to largest ----
test.describe("season chart v2 requests of 2026-10-15", () => {
  test("selecting a week header selects that week and updates the drop-down", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    const before = await page.locator("#week").inputValue();
    const buttons = page.locator("#grid thead .wk-btn");
    expect(await buttons.count()).toBeGreaterThan(5);
    const other = page.locator("#grid thead th.wk:not(.sel) .wk-btn").first();
    const idx = await other.getAttribute("data-idx"), num = (await other.locator("b").textContent()).trim();
    await expect(other).toHaveAttribute("aria-label", "Select week " + num);
    await expect(other).toHaveAttribute("title", "Select week " + num);
    await other.focus(); await page.keyboard.press("Enter"); await settled(page);
    expect(idx).not.toBe(before);
    await expect(page.locator("#week")).toHaveValue(idx);
    await expect(page.locator("#grid thead th.wk.sel b")).toHaveText(num);
    await expect(page.locator("#seasonWeek")).toHaveText(num);
    // Space works too, and the keyboard focus stays on the chosen week's header
    const next = page.locator("#grid thead th.wk:not(.sel) .wk-btn").last();
    const idx2 = await next.getAttribute("data-idx");
    await next.focus(); await page.keyboard.press("Space"); await settled(page);
    await expect(page.locator("#week")).toHaveValue(idx2);
    expect(await page.evaluate(() => document.activeElement.classList.contains("wk-btn"))).toBe(true);
  });

  test("By Dates week headers are not buttons", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    await page.locator(".mode-opt", { hasText: "By Dates" }).click(); await settled(page);
    expect(await page.locator("#grid thead th.wk").count()).toBeGreaterThan(0);
    await expect(page.locator("#grid thead .wk-btn")).toHaveCount(0);
    await page.locator("#startDate").fill("2026-11-02"); await page.locator("#endDate").fill("2026-11-06"); await settled(page);
    await expect(page.locator("#grid thead .wk-btn")).toHaveCount(0);
  });

  const nums = async (page, cls) => (await page.locator("#grid tbody td.nt." + cls).allTextContents()).map(t => t.trim()).map(t => t === "…" || t === "Not Published" || t === "" ? null : parseFloat(t));
  test("Weekday and Weekend sort both ways, with … last", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    for (const [key, cls] of [["wkday", "wd"], ["wkend", "we"]]) {
      const btn = page.locator(`#grid thead .sort[data-sort=${key}]`);
      await btn.click(); await settled(page);
      await expect(btn).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#grid thead .sort[data-sort=resort]")).toHaveAttribute("aria-pressed", "false");
      let v = await nums(page, cls);
      expect(v.some(x => x == null)).toBe(true);
      let real = v.filter(x => x != null);
      expect(v.slice(0, real.length).every(x => x != null)).toBe(true); // … only at the end
      expect(real).toEqual([...real].sort((a, b) => a - b));
      await expect(btn.locator(".arrow")).toHaveText("▲");
      await btn.click(); await settled(page);
      v = await nums(page, cls); real = v.filter(x => x != null);
      expect(v.slice(0, real.length).every(x => x != null)).toBe(true); // … still last
      expect(real).toEqual([...real].sort((a, b) => b - a));
      await expect(btn.locator(".arrow")).toHaveText("▼");
    }
  });

  test("no resort lists its room types out of size order", async ({ page }) => {
    const GROUPS = ["Hotel", "Studio", "1 Bedroom", "2 Bedroom", "3 Bedroom", "4 Bedroom", "5 Bedroom"];
    const state = { collections: { set: ALL_COLLECTIONS }, span: 0, showAll: false };
    await page.addInitScript(s => localStorage.setItem("ytg-season-chart-v2", s), JSON.stringify(state));
    await page.goto("/52weeks/seasons-v2.html", { waitUntil: "load" });
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    await page.evaluate(() => { const s = document.querySelector("#bedrooms"); s.value = "all"; s.dispatchEvent(new Event("change")); }); await settled(page);
    const rows = await page.evaluate(() => { const P = window.WEEKLY_POINTS, grp = new Map(P.classifications.map(c => [c.id, c.group]));
      const trs = [...document.querySelectorAll("#grid tbody tr")]; let g = -1;
      return document.getElementById("grid").__rows.map((r, i) => { if (trs[i].querySelector("th.res")) g++; return { g, sid: r.s.id, grp: r.p && grp.get(r.p.category), min: r.p ? Math.min(...r.p.weeklyPoints.filter(x => x != null)) : 0 }; }).filter(r => r.grp); });
    expect(rows.length).toBeGreaterThan(300);
    const bad = [];
    for (let i = 1; i < rows.length; i++) { const a = rows[i - 1], b = rows[i]; if (a.g !== b.g) continue; // a new resort or building starts here
      const d = GROUPS.indexOf(a.grp) - GROUPS.indexOf(b.grp) || a.min - b.min; if (d > 0) bad.push(a.sid + ":" + a.grp + "/" + a.min + ">" + b.grp + "/" + b.min); }
    expect(bad).toEqual([]);
    // the Room Types filter lists each size's types by their points too, smallest first
    const sizes = await page.evaluate(() => [...document.querySelectorAll("#typeTree [data-group]")].map(i => i.dataset.group));
    expect(sizes).toEqual(GROUPS.filter(g => sizes.includes(g)));
  });
});

test.describe("season chart v2 Moab 2 BR Presidential High season (planning #55)", () => {
  test("week 44 shows 350k with 42k weekday and 70k weekend nights (the book prints 350,00)", async ({ page }) => {
    await chartRows(page, { query: "Moab", size: "all" });
    const labels = await page.locator("#week option").allTextContents();
    await page.locator("#week").selectOption({ label: labels.find(t => /^Week 44\b/.test(t.trim())) });
    const r = await page.evaluate(() => {
      let cur = ""; for (const tr of document.querySelectorAll("#grid tbody tr")) {
        const th = tr.querySelector("th.res"); if (th) cur = th.textContent;
        const typ = tr.querySelector("td.typ");
        if (/Moab/.test(cur) && typ && /2 BR Presidential|2 Bedroom Presidential/.test(typ.textContent)) {
          const sel = tr.querySelector("td.c.sel"); return { week: sel && sel.textContent.trim(), wd: tr.querySelector("td.nt.wd").textContent.trim(), we: tr.querySelector("td.nt.we").textContent.trim() };
        } }
      return null; });
    expect(r).toEqual({ week: "350k", wd: "42k", we: "70k" });
  });
});

// ---- Owner, 2026-10-16: every room type the chart shows is a Room Types choice ----
test.describe("season chart v2 every room type is selectable (2026-10-16)", () => {
  const typeBox = async page => page.evaluate(() => { document.getElementById("filterBox").open = true; document.getElementById("typeBox").open = true; });
  const tick = async (page, label, on) => { await page.evaluate(([label, on]) => { const l = [...document.querySelectorAll("#typeTree label.check")].find(x => x.querySelector("input[value]") && x.textContent.trim() === label); const i = l.querySelector("input"); if (i.checked !== on) i.click(); }, [label, on]); await settled(page); };
  const types = rows => rows.map(r => r.type.trim()).filter(Boolean);

  test("Studio-J (Asian Inspired) at Royal Garden has its own Room Types choice", async ({ page }) => {
    let rows = await chartRows(page, { query: "Royal Garden" });
    expect(types(rows)).toContain("Studio-J (Asian Inspired)");
    await typeBox(page);
    expect(await page.locator("#typeTree label.check", { hasText: "Studio-J (Asian Inspired)" }).count()).toBe(1);
    await tick(page, "Studio-J (Asian Inspired)", false);
    rows = await page.evaluate(() => [...document.querySelectorAll("#grid td.typ")].map(td => ({ type: td.textContent })));
    expect(types(rows)).not.toContain("Studio-J (Asian Inspired)");
    expect(types(rows)).toContain("2 BR Presidential");
    // only Studio-J
    await page.evaluate(() => { const s = document.querySelector("#bedrooms"); s.value = "all"; s.dispatchEvent(new Event("change")); });
    await settled(page);
    for (const t of ["Studio", "1 BR Presidential", "2 BR Presidential"]) await tick(page, t, false);
    rows = await page.evaluate(() => [...document.querySelectorAll("#grid td.typ")].map(td => ({ type: td.textContent })));
    expect(types(rows)).toEqual(["Studio-J (Asian Inspired)"]);
  });

  test("every room type shown under ALL is a Room Types choice", async ({ page }) => {
    await chartRows(page, { query: "Royal Garden" });
    await typeBox(page);
    const key = t => t.split(" ").join("").toLowerCase(); // spellings that differ only by spaces are one choice ("Ocean Front", "Oceanfront")
    const labels = new Set((await page.locator("#typeTree label.check").allInnerTexts()).map(t => key(t.trim())));
    for (const q of ["Royal Garden", "Moab", "Pagosa", "Towers on the Grove"]) {
      await page.evaluate(q => { const s = document.querySelector("#search"); s.value = q; s.dispatchEvent(new Event("input")); }, q);
      await page.waitForTimeout(400); await settled(page);
      const shown = await page.evaluate(() => [...document.querySelectorAll("#grid td.typ")].map(td => td.textContent.trim()));
      for (const t of shown) if (t && !/Not Offered|coming soon|No Points Chart Available|Select a valid/i.test(t)) expect(labels.has(key(t)), q + ": " + t).toBe(true);
    }
  });

  test("a filter saved before (every category selected) still means ALL, with a true count", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html");
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    await page.evaluate(() => { const ids = window.WEEKLY_POINTS.classifications.map(c => c.id); localStorage.setItem("ytg-season-chart-v2", JSON.stringify({ collections: { set: ["Club Wyndham"] }, types: { set: ids }, span: 0, showAll: true })); });
    await page.reload();
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    await page.evaluate(() => { document.getElementById("filterBox").open = true; });
    await expect(page.locator("#bedrooms")).toHaveValue("all");
    const sum = (await page.locator("#typeSummary").textContent()).match(/(\d+) of (\d+)/);
    expect(sum[1]).toBe(sum[2]);
  });
});

// ---- Planning #40: Associate resorts (Australia and New Zealand) have their points charts ----
test.describe("season chart v2 Associate resorts show points (planning #40)", () => {
  const NAMES = ["Cairns", "Coffs Harbour", "Golden Beach", "Seven Mile Beach", "Sydney", "Torquay", "Wanaka"];

  test("the 7 Associate resorts show room types, with no \"Points chart coming soon\"", async ({ page }) => {
    const rows = await chartRows(page, { size: "all", collections: ["Associate"] });
    for (const n of NAMES) expect(rows.filter(r => r.resort.includes(n)).length, n).toBeGreaterThan(0);
    expect(rows.some(r => /coming soon/i.test(r.type))).toBe(false);
    await expect(page.locator("#grid .gap")).toHaveCount(0);
    const nights = await page.locator("#grid tbody td.nt.wd").evaluateAll(tds => tds.filter(t => /\d/.test(t.textContent)).length);
    expect(nights).toBeGreaterThanOrEqual(NAMES.length);
  });

  test("each chart adds up (Full Week = 2 x Fri-Sat + 5 x Sun-Thur) and covers weeks 1 to 52", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html");
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    const r = await page.evaluate(() => {
      const cp = window.CLUB_PASS_POINTS.resorts, out = [];
      for (const [name, c] of Object.entries(cp)) if (/^Club Wyndham (Cairns|Coffs Harbour|Golden Beach|Seven Mile Beach|Sydney|Torquay|Wanaka)$/.test(name))
        for (const t of c.tables) {
          const seen = {}; let bad = 0;
          for (const b of t.bands) { for (const w of b.weeks) seen[w] = (seen[w] || 0) + 1; for (const col of t.columns) { const [f, s, u] = b.rates[col]; if (2 * f + 5 * s !== u) bad++; } }
          const missing = []; for (let w = 1; w <= 52; w++) if (seen[w] !== 1) missing.push(w);
          out.push({ name, building: t.building, bad, missing });
        }
      return out;
    });
    expect(r.map(x => x.name).filter((v, i, a) => a.indexOf(v) === i)).toHaveLength(7);
    for (const x of r) {
      expect(x.bad, x.name).toBe(0);
      // Seven Mile Beach prints the High weeks as "35-35"; the owner decided it is a typo for 35-37, so weeks 36 and 37 are High
      expect(x.missing, x.name).toEqual([]);
    }
  });
});

test.describe("season chart v2 website names, apostrophes and departed resorts (planning #40)", () => {
  test("names follow Club Wyndham's website; no curly apostrophes; no El Cid", async ({ page }) => {
    const rows = await chartRows(page, { size: null });
    const names = [...new Set(rows.map(r => r.resort))];
    for (const n of ["Margaritaville Vacation Club by Wyndham - Atlanta", "Margaritaville Vacation Club by Wyndham - Desert Blue", "Margaritaville Vacation Club by Wyndham - Nashville", "Margaritaville Vacation Club by Wyndham - Rio Mar", "Margaritaville Vacation Club by Wyndham - St. Thomas",
      "WorldMark Chelan - Lake House", "Holua Resort at the Mauna Loa Village", "Kauai Coast Resort at the Beachboy", "Waikiki Marina Resort at the Ilikai", "Dolphin's Cove", "Governor's Green", "Suites at Fisherman's Wharf", "WorldMark Dolphin's Cove"]) expect(names, n).toContain(n);
    expect(names.filter(n => /[‘’]/.test(n))).toEqual([]);
    expect(names.filter(n => /El Cid|El Moro|Granada Hotel|Marina Beach Hotel|La Ceiba/.test(n))).toEqual([]);
    for (const n of ["WorldMark Plaza Resort & Spa", "WorldMark Canmore-Banff"]) expect(names.some(x => x.startsWith(n)), n).toBe(true);
  });

  test("searching Dolphin's with a straight or curly apostrophe, or an old name, finds the resort", async ({ page }) => {
    for (const q of ["Dolphin's", "Dolphin’s", "Margaritaville Vacation Club - Atlanta", "WorldMark Lake House"]) {
      const rows = await chartRows(page, { size: null, query: q });
      expect(rows.length, q).toBeGreaterThan(0);
    }
    const rows = await chartRows(page, { size: null, query: "Dolphin's" });
    expect(rows.map(r => r.resort)).toContain("Dolphin's Cove");
  });

  test("Harbortown Point shows points with Weekday and Weekend nights", async ({ page }) => {
    const rows = await chartRows(page, { size: "all", query: "Harbortown" });
    expect(rows.filter(r => r.resort === "Harbortown Point").map(r => r.type).sort()).toEqual(["1 BR Plus", "Studio"]);
    expect(rows.some(r => /coming soon/i.test(r.type))).toBe(false);
  });
});

// ---- Nightly points for rows with several rates inside one season (Waikiki Beach Walk, Ocean Boulevard, La Cascada) ----
test.describe("season chart v2 nightly points for several rates in one season", () => {
  const RESORTS = ["Waikiki Beach Walk", "Ocean Boulevard", "La Cascada"];

  test("By Week: every room type of these resorts shows Weekday and Weekend numbers, not …", async ({ page }) => {
    for (const q of RESORTS) {
      await chartRows(page, { query: q, size: "all", collections: ["Club Wyndham"] });
      const cells = await page.locator("#grid tbody td.nt").allTextContents();
      expect(cells.length, q).toBeGreaterThanOrEqual(10);
      expect(cells.filter(t => !/\d/.test(t)), q).toEqual([]);
    }
  });

  test("By Dates: trip totals work for these rows", async ({ page }) => {
    await chartRows(page, { query: "Ocean Boulevard", size: "all", collections: ["Club Wyndham"] });
    await page.locator(".mode-opt", { hasText: "By Dates" }).click();
    await page.locator("#startDate").fill("2026-11-02"); await page.locator("#endDate").fill("2026-11-06");
    await settled(page);
    const cells = await page.locator("#grid tbody td.c").allTextContents();
    expect(cells.length).toBeGreaterThan(10);
    expect(cells.filter(t => !/\d/.test(t))).toEqual([]);
  });

  test("every nightly row adds up: 2 x Fri-Sat + 5 x Sun-Thur equals the weekly points for every week", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html");
    const r = await page.evaluate(() => {
      const N = window.NIGHTLY_POINTS, rows = window.WEEKLY_POINTS.rows; let checked = 0, byWeek = 0; const fails = [];
      for (const p of rows) { const n = N[p.id]; if (!n) continue; if (n.byWeek) byWeek++;
        for (let w = 1; w <= 52; w++) { const wp = p.weeklyPoints[w - 1]; if (wp == null) continue;
          const x = n.byWeek ? n.byWeek[w - 1] : (n[p.weeks[w - 1]] ? [n[p.weeks[w - 1]].friSat, n[p.weeks[w - 1]].sunThu] : null); checked++;
          if (!x || 2 * x[0] + 5 * x[1] !== wp) fails.push(p.id + " week " + w); } }
      return { checked, byWeek, fails };
    });
    expect(r.byWeek).toBe(70); // 33 several-rate rows, 36 lockoffs built from their two components, Desert Rose 2 BR (High week = 236,000, calculated from its printed nightly points because the book prints 234,000)
    expect(r.fails).toEqual([]);
  });
});

test.describe("season chart v2 lockoffs and weekly-only rows", () => {
  test("a lockoff's nights are the sum of its two components' nights, every week", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html");
    const r = await page.evaluate(() => { const N = window.NIGHTLY_POINTS, rows = window.WEEKLY_POINTS.rows, by = id => rows.find(p => p.id === id);
      const get = (p, w) => { const n = N[p.id]; if (!n) return null; if (n.byWeek) return n.byWeek[w - 1]; const s = n[p.weeks[w - 1]]; return s ? [s.friSat, s.sunThu] : null; };
      let lockoffs = 0; const fails = [];
      for (const d of rows.filter(p => p.derived && N[p.id])) { lockoffs++;
        for (let w = 1; w <= 52; w++) { if (d.weeklyPoints[w - 1] == null) continue; const x = get(d, w), cs = d.components.map(c => get(by(c), w));
          if (!x || cs.some(c => !c) || x[0] !== cs.reduce((a, c) => a + c[0], 0) || x[1] !== cs.reduce((a, c) => a + c[1], 0)) fails.push(d.id + " week " + w); } }
      return { lockoffs, fails }; });
    expect(r.lockoffs).toBe(36);
    expect(r.fails).toEqual([]);
  });

  test("Fairfield Sapphire Valley says Not Published (weekly points only) instead of …", async ({ page }) => {
    await chartRows(page, { query: "Sapphire Valley", size: "all", collections: ["Club Wyndham"] });
    const cells = await page.locator("#grid tbody td.nt").allTextContents();
    expect(cells.filter(t => t.trim() === "Not Published").length).toBeGreaterThanOrEqual(8);
    expect(cells.filter(t => t.trim() === "…")).toEqual([]);
    await expect(page.locator("#grid tbody td.nt span[title*='weekly points only']").first()).toBeAttached();
    // the label (smaller text, wraps if needed) stays inside its column, so it is never cut off
    const fit = await page.locator("#grid tbody td.nt span.np").evaluateAll(sp => sp.map(x => { const td = x.parentElement; return x.scrollWidth <= td.clientWidth + 1 && x.getBoundingClientRect().right <= td.getBoundingClientRect().right + 1; }));
    expect(fit.length).toBeGreaterThanOrEqual(8);
    expect(fit.every(Boolean)).toBe(true);
  });
});


test.describe("season chart v2 WorldMark St. George and Balboa Park (2023-2024 directory charts)", () => {
  test("both show room types, nightly points and every week 1 to 52, and the sums add up", async ({ page }) => {
    await page.goto("/52weeks/seasons-v2.html");
    await expect(page.locator("#grid tbody tr").first()).toBeVisible();
    const r = await page.evaluate(() => {
      const out = {};
      for (const name of ["WorldMark St. George", "WorldMark Balboa Park"]) { const c = window.CLUB_PASS_POINTS.resorts[name], seen = {}; let bad = 0;
        for (const t of c.tables) for (const b of t.bands) { for (const w of b.weeks) seen[w] = (seen[w] || 0) + 1; for (const col of t.columns) { const [f, s, u] = b.rates[col]; if (2 * f + 5 * s !== u) bad++; } }
        out[name] = { cols: c.tables[0].columns, bad, missing: Array.from({ length: 52 }, (_, i) => i + 1).filter(w => seen[w] !== 1), notes: c.notes.join(" ") }; }
      return out; });
    expect(r["WorldMark St. George"].cols).toHaveLength(8);
    expect(r["WorldMark Balboa Park"].cols).toEqual(["Studio Hotel", "1 BR Hotel"]);
    for (const x of Object.values(r)) { expect(x.bad).toBe(0); expect(x.missing).toEqual([]); }
    expect(r["WorldMark St. George"].notes).toContain("Page 268 (CW search bar page 270)");
    expect(r["WorldMark Balboa Park"].notes).toContain("Page 241 (CW search bar page 243)");
    for (const q of ["St. George", "Balboa Park"]) {
      const rows = await chartRows(page, { query: q, size: "all", collections: ["Club Pass"] });
      expect(rows.length, q).toBeGreaterThan(1);
      const cells = await page.locator("#grid tbody td.nt").allTextContents();
      expect(cells.filter(t => !/\d/.test(t)), q).toEqual([]);
    }
  });

  test("no resort says coming soon or No Points Chart Available", async ({ page }) => {
    await chartRows(page, { size: "all" });
    await expect(page.locator("#grid")).not.toContainText(/coming soon|No Points Chart Available/i);
  });
});

test.describe("season chart v2 WorldMark Inn at the Park uses the WorldMark colors", () => {
  test("three purple tiers, with the printed names kept; Club Wyndham Inn at the Park keeps its own colors", async ({ page }) => {
    await chartRows(page, { query: "Inn at the Park", size: "all", collections: ["Club Pass", "Club Wyndham"] });
    const r = await page.evaluate(() => { const out = {}; let cur = null;
      for (const tr of document.querySelectorAll("#grid tbody tr")) { const th = tr.querySelector("th.res"); if (th) cur = th.querySelector(".res-name").textContent; const c = tr.querySelector("td.c.sel"); if (c && cur) (out[cur] ||= new Set()).add([...c.classList].find(x => /^(w|s)-/.test(x))); }
      return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, [...v]])); });
    const wm = Object.entries(r).find(([k]) => k.startsWith("WorldMark Inn at the Park"));
    expect(wm[1].every(c => /^w-/.test(c))).toBe(true);
    const cp = await page.evaluate(() => window.CLUB_PASS_POINTS.resorts["WorldMark Inn at the Park"].tables[0].bands.map(b => [b.season, b.tier, b.label]));
    expect(cp).toEqual([[null, "High", "Prime"], [null, "Medium", "High"], [null, "Low", "Value"]]);
    const cw = Object.entries(r).find(([k]) => k.startsWith("Inn at the Park") || k.startsWith("Club Wyndham Inn"));
    if (cw) expect(cw[1].every(c => /^s-/.test(c))).toBe(true);
  });
});

test("season chart v2 resort card shows the full address and phone, the printed page only, and no points tables", async ({ page }) => {
  await page.goto("/52weeks/seasons-v2.html");
  await expect(page.locator("#grid tbody .res-name").first()).toBeVisible();
  await page.locator("#grid tbody .res-name", { hasText: "Anaheim" }).first().click();
  const body = page.locator("#detailBody");
  await expect(body).toBeVisible();
  await expect(body.locator("dt", { hasText: "Address" })).toHaveCount(0);
  await expect(body.locator(".addr")).toContainText("201 West Katella Avenue");
  await expect(body.locator(".addr")).toContainText(/Anaheim, CA \d{5}/);
  await expect(body.locator('a[href^="tel:"]')).toHaveCount(1);
  await expect(body.locator("dt", { hasText: "Directory Pg" })).toHaveCount(1);
  await expect(body).not.toContainText("search bar");
  await expect(body.locator("table")).toHaveCount(0);
});

test("season chart v2 resort card puts the collection name on its own row and lists the booking limits", async ({ page }) => {
  await page.goto("/52weeks/seasons-v2.html");
  await expect(page.locator("#grid tbody .res-name").first()).toBeVisible();
  await page.locator("#search").fill("Harbortown");
  await page.locator("#grid tbody .res-name", { hasText: "Harbortown" }).first().click();
  await expect(page.locator("#detailTitle .brand")).toHaveText("Club Wyndham");
  await expect(page.locator("#detailTitle .rname")).toHaveText("Harbortown Point");
  await expect(page.locator("#detailBody h3", { hasText: "Booking Limits" })).toBeVisible();
  await expect(page.locator("#detailBody ul.limits")).toContainText("Sunday check-in");
  await page.locator("#closeDetail").click();
  await page.locator("#search").fill("Anaheim");
  await page.locator("#grid tbody .res-name", { hasText: "Anaheim" }).first().click();
  await expect(page.locator("#detailBody ul.limits")).toHaveCount(0);
});

test("season chart v2 has no Sydney Suites anywhere (owner could not verify it exists, 10/18/26)", async ({ page }) => {
  await page.goto("/52weeks/seasons-v2.html");
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  const hits = await page.evaluate(() => JSON.stringify([window.CLUB_PASS_POINTS, window.WEEKLY_POINTS, window.DIRECTORY]).match(/Sydney Suites|sydney-suites/gi) || []);
  expect(hits).toEqual([]);
  expect(await page.locator("body").innerText()).not.toContain("Sydney Suites");
});
