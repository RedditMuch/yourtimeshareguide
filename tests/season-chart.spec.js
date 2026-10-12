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

// ---- Planning #38: the owner's list of name and filter fixes. One check per item; rows are found by resort name. ----
const ALL_COLLECTIONS = ["Club Wyndham", "Margaritaville Vacation Club", "Club Pass", "Affiliate", "Associate"];
const ALL_PLACES = ["us", "ca", "mx", "isl", "anz"];

// Opens the chart with saved filters (the chart reads them from localStorage), optionally selects every room type or one size,
// and returns every row: resort name, building lines, room type, whether it's gray.
async function chartRows(page, { collections = ALL_COLLECTIONS, places = ALL_PLACES, size = "all" } = {}) {
  const state = { collections: { set: collections }, places: { set: places }, span: 0 };
  await page.addInitScript(s => localStorage.setItem("ytg-season-chart-v2", s), JSON.stringify(state));
  await page.goto("/52weeks/seasons-v2.html");
  await expect(page.locator("#grid tbody tr").first()).toBeVisible();
  if (size === "all") await page.evaluate(() => document.querySelector("[data-types=all]").click());
  else if (size) await page.evaluate(g => { const s = document.querySelector("#bedrooms"); s.value = g; s.dispatchEvent(new Event("change")); }, size); // the filters are folded on a phone
  return page.evaluate(() => { let cur = null;
    return [...document.querySelectorAll("#grid tbody tr")].map(tr => { const th = tr.querySelector("th.res");
      if (th) cur = { resort: th.querySelector(".res-name").textContent, buildings: [...th.querySelectorAll(".res-bldg")].map(b => b.textContent) };
      const typ = tr.querySelector("td.typ");
      const row = { resort: cur.resort, buildings: cur.buildings, type: typ ? typ.textContent : "", gray: tr.classList.contains("gray"), first: !!th };
      return row; }); });
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
    expect(fl).toContainEqual(["Tanglewood I & II", "Ridgewood I", "Ridgewood II Buildings 1A-15A"]);
    expect(of(rows, "Palm-Aire").map(r => r.buildings)).toContainEqual(["Fountain Palm", "Sabal Palm"]);
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

  test("item 8: Angel Fire Resort - Cabin Share I doesn't repeat Cabin Share I as a building", () => {
    const af = of(rows, "Angel Fire Resort - Cabin Share I");
    expect(af.map(r => r.type)).toEqual(["3 BR"]);
    expect(af[0].buildings).toEqual([]);
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

test("item 2: United States only shows no Associate resorts", async ({ page }) => {
  const rows = await chartRows(page, { places: ["us"], size: null });
  await expect(page.locator("#grid tbody .dot.assoc")).toHaveCount(0);
  for (const name of ["Cairns", "Sydney", "Wanaka"]) expect(of(rows, name)).toHaveLength(0);
  expect(of(rows, "Angel Fire Resort").length).toBeGreaterThan(0); // US affiliates still show
});

test("item 2: Australia & New Zealand shows the Associate resorts", async ({ page }) => {
  const rows = await chartRows(page, { places: ["anz"], size: null });
  expect(of(rows, "Sydney").length).toBeGreaterThan(0);
  expect(new Set(rows.map(r => r.resort)).size).toBe(7);
});
