// Update Meeting Calculator "Buy the Numbers" (planning #45). Read-only: the page is not edited here.
// The page remembers inputs in localStorage; each test gets a fresh browser context, so every load starts from the page defaults.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/buythenumbers.html";
const BASE = { price: "30,000", apr: "12", term: "10", newPer1k: "7.84" };

async function setup(page, { status = "non", cur, add, clear = false, ...rest }) {
  await page.goto(URL);
  if (clear) await page.locator("#clr").click();
  await page.selectOption("#vipSt", status);
  const values = { curPts: cur, addPts: add, ...(clear ? {} : BASE), ...rest };
  for (const [id, v] of Object.entries(values)) if (v !== undefined) await page.fill("#" + id, String(v));
  await page.locator("#perk .live .box").first().waitFor();
}

const boxes = page => page.locator("#perk .live .box");
const boxText = async (page, i) => (await boxes(page).nth(i).innerText()).replace(/\s+/g, " ");

test("page basics: title, h1, noindex", async ({ page }) => {
  await page.goto(URL);
  await expect(page).toHaveTitle("Buy the Numbers: Update Meeting Calculator");
  await expect(page.locator("h1")).toHaveText("Buy the Numbers");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});

test("non-VIP 140,000 + 150,000: 2 then 4 credits, buy 10,000 more", async ({ page }) => {
  await setup(page, { cur: "140,000", add: "150,000" });
  expect(await boxText(page, 0)).toContain("2 Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("4 Housekeeping Credits");
  await expect(page.locator(".consider .cdir")).toContainText("10,000");
  await expect(page.locator(".consider .cdir")).toHaveClass(/more/);
  await expect(page.locator(".consider li").filter({ hasText: "Adds 1 Housekeeping Credit for a Total of 5 Housekeeping Credits and reaches VIP Bronze" })).toHaveCount(1);
});

test("non-VIP 285,000 + 20,000: 4 then 5 credits, buy 5,000 less", async ({ page }) => {
  await setup(page, { cur: "285,000", add: "20,000" });
  expect(await boxText(page, 0)).toContain("4 Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("5 Housekeeping Credits");
  await expect(page.locator(".consider .cdir")).toContainText("5,000");
  await expect(page.locator(".consider .cdir")).toHaveClass(/less/);
});

test("Silver 500,000 + 70,000: 9 then 10 credits, buy 10,000 less", async ({ page }) => {
  await setup(page, { status: "silver", cur: "500,000", add: "70,000" });
  expect(await boxText(page, 0)).toContain("9 Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("10 Housekeeping Credits");
  await expect(page.locator(".consider .cdir")).toContainText("10,000");
  await expect(page.locator(".consider .cdir")).toHaveClass(/less/);
});

test("Grandfathered Gold: unlimited credits and no suggestion", async ({ page }) => {
  await setup(page, { status: "ggold", cur: "140,000", add: "150,000" });
  expect(await boxText(page, 0)).toContain("Unlimited Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("Unlimited Housekeeping Credits");
  await expect(page.locator(".consider")).toHaveCount(0);
});

test("VIP Gold 140,000 + 150,000: 6 credits including +4, one reservation transaction", async ({ page }) => {
  await setup(page, { status: "gold", cur: "140,000", add: "150,000" });
  const t = await boxText(page, 0);
  expect(t).toContain("6 Housekeeping Credits");
  expect(t).toContain("+4");
  expect(t).toContain("1 Reservation Transaction");
  expect(t).not.toContain("Unlimited Reservation");
});

test("new owner: Clear All Fields then a first purchase", async ({ page }) => {
  await setup(page, { clear: true, add: "200,000", price: "25,000", apr: "12", term: "10", newPer1k: "8.50", inc: "3" });
  const t = await boxText(page, 0);
  expect(t).toContain("200,000 pts");
  expect(t).toContain("2 Housekeeping Credits");
  await expect(page.locator(".consider .cdir")).toContainText("10,000");
  await expect(page.locator(".consider .cdir")).toHaveClass(/more/);
});

test("non-VIP 70,000 + 7,000: reservation transaction shown, nothing earns nothing", async ({ page }) => {
  await setup(page, { cur: "70,000", add: "7,000" });
  const t = await boxText(page, 1);
  expect(t).toContain("1 Reservation Transaction");
  expect(t).not.toContain("earn nothing");
});

test("non-VIP 3,000,000 points: 60,000 earn nothing (42 x 70,000 = 2,940,000)", async ({ page }) => {
  await setup(page, { cur: "3,000,000", add: "0" });
  expect(await boxText(page, 0)).toContain("60,000 pts earn nothing");
});

test("phone width: no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
