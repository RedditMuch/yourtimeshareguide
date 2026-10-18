// Club Wyndham Access Resorts (cwaresorts.html): the numbered list and its search.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/cwaresorts.html";
const count = page => page.locator("#cwa-count");

async function open(page) {
  const errors = [];
  page.on("pageerror", e => errors.push(String(e.message ?? e)));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(URL);
  return errors;
}

test("cwaresorts: 79 numbered rows, each with a phone and a directory link", async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator("h1")).toHaveText("Club Wyndham Access Resorts");
  const rows = page.locator("#cwa-table tbody tr");
  await expect(rows).toHaveCount(79);
  await expect(rows.first().locator("td").first()).toHaveText("1");
  await expect(rows.last().locator("td").first()).toHaveText("79");
  for (const r of await rows.all()) {
    await expect(r.locator('a[href^="tel:"]')).toHaveCount(1);
    const href = await r.locator('a[href*="#p="]').getAttribute("href");
    const m = href.match(/#p=(\d+)$/);
    expect(href).toContain("media.travelandleisure.com");
    // the link goes to the CW search bar page, which is the book page + 4
    await expect(r.locator(".ytg-cite")).toContainText(`CW search bar page ${Number(m[1])}`);
  }
  expect(errors).toEqual([]);
});

test("cwaresorts: search by name, city and state", async ({ page }) => {
  await open(page);
  await page.fill("#cwa-q", "bison");
  await expect(count(page)).toHaveText("1 of 79 resorts");
  await page.selectOption("#cwa-by", "city");
  await page.fill("#cwa-q", "Anaheim");
  await expect(count(page)).toHaveText("1 of 79 resorts");
  await page.selectOption("#cwa-by", "state");
  await page.fill("#cwa-q", "FL");
  await expect(page.locator("#cwa-table tbody tr:not([hidden])")).toHaveCount(16);
  await page.fill("#cwa-q", "zzz");
  await expect(page.locator("#cwa-message")).toHaveText("No resorts match.");
});

test("cwaresorts: distance from a city or a state, and Reset", async ({ page }) => {
  await open(page);
  await page.selectOption("#cwa-by", "radius");
  await expect(page.locator("#cwa-radius-field")).toBeVisible();
  await page.fill("#cwa-q", "Orlando, Florida, United States");
  await page.selectOption("#cwa-radius", "50");
  await expect(count(page)).toHaveText("4 of 79 resorts");
  await page.fill("#cwa-q", "Nevada");
  await page.selectOption("#cwa-radius", "250");
  const near = Number((await count(page).textContent()).split(" ")[0]);
  expect(near).toBeGreaterThan(0);
  await page.fill("#cwa-q", "Atlantis");
  await expect(page.locator("#cwa-message")).toContainText("not in the list");
  await page.click("button[type=reset]");
  await expect(count(page)).toHaveText("79 of 79 resorts");
});
