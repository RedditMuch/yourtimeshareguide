// Update Meeting Calculator "Buy the Numbers" (planning #45). Read-only: the page is not edited here.
// The page remembers inputs in localStorage; each test gets a fresh browser context, so every load starts from the page defaults.
// Since 10/28 the page has the side-by-side layout: Points Comparison boxes in #pair, advice cards in #adv, no Reservation Transactions.
import { test, expect } from "@playwright/test";

const URL = "/52weeks/buythenumbers.html";
const BASE = { price: "30,000", apr: "12", term: "10", newPer1k: "7.84" };

// Points are filled first, because typing Current Points sets VIP Status to match; a status given here is chosen after that
async function setup(page, { status, cur, add, clear = false, ...rest }) {
  await page.goto(URL);
  if (clear) await page.locator("#clr").click();
  const values = { curPts: cur, addPts: add, ...(clear ? {} : BASE), ...rest };
  for (const [id, v] of Object.entries(values)) if (v !== undefined) await page.fill("#" + id, String(v));
  if (status) await page.selectOption("#vipSt", status);
  await page.locator("#pair .pbox").first().waitFor();
}

const boxes = page => page.locator("#pair .pbox");
const boxText = async (page, i) => (await boxes(page).nth(i).innerText()).replace(/\s+/g, " ");

test("page basics: title, h1, noindex, site header and footer", async ({ page }) => {
  await page.goto(URL);
  await expect(page).toHaveTitle("Buy the Numbers: Update Meeting Calculator");
  await expect(page.locator("h1")).toHaveText("Buy the Numbers");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("header.mast")).toHaveCount(1);
  await expect(page.locator("footer.site-foot")).toHaveCount(1);
  await expect(page.locator("body")).not.toContainText("Reservation Transaction");
});

test("non-VIP 140,000 + 150,000: 2 then 4 credits, buy 10,000 more for VIP Bronze", async ({ page }) => {
  await setup(page, { cur: "140,000", add: "150,000" });
  expect(await boxText(page, 0)).toContain("2 Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("4 Housekeeping Credits");
  const more = page.locator(".consider.more");
  await expect(more.locator(".cdir")).toContainText("10,000 MORE");
  await expect(more).toContainText("Reaches VIP Bronze");
});

test("non-VIP 285,000 + 20,000: 4 then 5 credits, buy 5,000 less", async ({ page }) => {
  await setup(page, { cur: "285,000", add: "20,000" });
  expect(await boxText(page, 0)).toContain("4 Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("5 Housekeeping Credits");
  await expect(page.locator(".consider.less .cdir")).toContainText("5,000 LESS");
});

test("Silver 500,000 + 70,000: 9 then 10 credits, buy 10,000 less", async ({ page }) => {
  await setup(page, { status: "silver", cur: "500,000", add: "70,000" });
  expect(await boxText(page, 0)).toContain("9 Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("10 Housekeeping Credits");
  await expect(page.locator(".consider.less .cdir")).toContainText("10,000 LESS");
});

test("Grandfathered Gold: unlimited credits, no fewer-points advice", async ({ page }) => {
  await setup(page, { status: "ggold", cur: "140,000", add: "150,000" });
  expect(await boxText(page, 0)).toContain("Unlimited Housekeeping Credits");
  expect(await boxText(page, 1)).toContain("Unlimited Housekeeping Credits");
  await expect(page.locator(".consider.less")).toHaveCount(0);
});

test("VIP Gold 140,000 + 150,000: 6 credits including +4", async ({ page }) => {
  await setup(page, { status: "gold", cur: "140,000", add: "150,000" });
  const t = await boxText(page, 0);
  expect(t).toContain("6 Housekeeping Credits");
  expect(t).toContain("+4");
});

test("new owner: Clear All Fields then a first purchase", async ({ page }) => {
  await setup(page, { clear: true, add: "200,000", price: "25,000", apr: "12", term: "10", newPer1k: "8.50", inc: "3" });
  const t = await boxText(page, 0);
  expect(t).toContain("200,000 pts");
  expect(t).toContain("2 Housekeeping Credits");
  await expect(page.locator(".consider.more .cdir").first()).toContainText("10,000 MORE");
});

test("leftover points count from the last 70,000 step: 3,000,000 leaves 60,000", async ({ page }) => {
  await setup(page, { cur: "3,000,000", add: "0" });
  expect(await boxText(page, 0)).toContain("60,000 extra pts, no extra benefit");
});

test("advice changes while typing: 200,000 + 100,000 is a Sweet Spot at VIP Bronze", async ({ page }) => {
  await setup(page, { cur: "200,000", add: "90,000" });
  await expect(page.locator(".sweet")).toHaveCount(0);
  await page.fill("#addPts", "100,000");
  await expect(page.locator(".sweet")).toContainText("VIP Bronze");
  expect(await boxText(page, 1)).toContain("5 Housekeeping Credits");
});

test("phone width: no sideways scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
