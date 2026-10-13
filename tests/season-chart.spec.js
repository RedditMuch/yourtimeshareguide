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

  test("no Select all / Clear links and no Locations buttons; resort types are in the owner's order", async ({ page }) => {
    await chartRows(page, { size: null });
    await expect(page.locator("[data-coll], [data-types], #placeChecks")).toHaveCount(0);
    const labels = await page.locator("#collectionChecks .lbl").allTextContents();
    expect(labels.map(l => l.replace(/Points coming soon|\(Australia & New Zealand\)|Australia & New Zealand/, "").trim())).toEqual(["Club Wyndham", "Affiliate", "WorldMark / Club Pass ($99)", "Margaritaville", "Associate"]);
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

  test("By Week / By Dates box: Title Case labels, same size in both modes, equal control heights, Clear Dates above the inputs", async ({ page }) => {
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
    const g = await page.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { clearBottom: r("#clearDates").bottom, inputTop: r("#endDate").top, sh: r("#startDate").height, eh: r("#endDate").height }; });
    expect(g.clearBottom).toBeLessThanOrEqual(g.inputTop);
    expect(g.sh).toBe(g.eh);
    await page.locator(".mode-opt", { hasText: "By Week" }).click();
    expect((await box()).height).toBe(week.height);
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
