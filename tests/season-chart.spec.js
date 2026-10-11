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
