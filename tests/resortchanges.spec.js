// Coming Soon and Recently Departed Resorts (resortchanges.html): the two lists and their sources.
import { test, expect } from "@playwright/test";

test("resortchanges: coming soon and departed lists, every row has a source", async ({ page }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(String(e.message ?? e)));
  await page.goto("/52weeks/resortchanges.html");
  await expect(page.locator("h1")).toHaveText("Coming Soon and Recently Departed Resorts");
  await expect(page.locator("h2")).toHaveText(["Coming Soon", "Recently Departed"]);
  const tables = page.locator("table.ytg-table");
  await expect(tables).toHaveCount(2);
  const soon = tables.nth(0).locator("tbody tr"), gone = tables.nth(1).locator("tbody tr");
  expect(await soon.count()).toBeGreaterThanOrEqual(2);
  expect(await gone.count()).toBeGreaterThanOrEqual(22);
  for (const row of [...await soon.all(), ...await gone.all()]) {
    expect((await row.locator("td").last().textContent()).trim()).not.toBe("");
  }
  expect(errors).toEqual([]);
});
