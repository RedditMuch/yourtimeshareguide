// Per-page checks at phone and desktop size, plus internal links.
//
// Problems that already existed are listed in tests/baseline.json. A test fails
// only for a problem that is NOT in the baseline (a new one). Problems still
// present from the baseline are summarised at the end of the run.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { discoverPages, slug, baselineFor, writeFinding, errorKind, HEAVY_PAGES, UPDATE } from "./lib.mjs";

const pages = discoverPages();
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

test.describe("pages", () => {
  for (const page of pages) {
    test(page, async ({ page: browserPage, baseURL }, testInfo) => {
      test.slow(HEAVY_PAGES.has(page)); // 3x timeout for heavy pages only
      const project = testInfo.project.name;
      const origin = new URL(baseURL).origin;
      const pageErrors = [];
      const consoleErrors = [];
      browserPage.on("pageerror", e => pageErrors.push(errorKind(String(e.message ?? e))));
      browserPage.on("console", msg => {
        if (msg.type() !== "error") return;
        // Ignore failures to load things from other websites (fonts etc.); they depend on the network, not on our code.
        const url = msg.location().url || "";
        if (url && !url.startsWith(origin)) return;
        consoleErrors.push(errorKind(msg.text(), url));
      });

      const response = await browserPage.goto(`/${page}`, { waitUntil: "load" });
      await browserPage.waitForTimeout(400); // let deferred scripts draw
      // Scroll through the page so lazy-loaded images are requested every time; otherwise which ones fail depends on timing.
      await browserPage.evaluate(async () => {
        for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise(r => setTimeout(r, 30));
        }
        window.scrollTo(0, 0);
      });
      await browserPage.waitForTimeout(500);

      const deviceWidth = testInfo.project.use.viewport.width; // not window.innerWidth: on a phone it grows to fit wide content
      const dom = await browserPage.evaluate(deviceWidth => ({
        // innerWidth is included because on a phone it grows when something sticks out to the right.
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth) > deviceWidth + 1,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth),
        innerWidth: deviceWidth,
        title: document.title.trim(),
        hasTitleTag: !!document.querySelector("head > title"),
        robots: [...document.querySelectorAll('meta[name="robots"]')].map(m => m.content.trim().toLowerCase()),
        h1Count: document.querySelectorAll("h1").length,
      }), deviceWidth);

      const axe = await new AxeBuilder({ page: browserPage }).withTags(AXE_TAGS).analyze();
      // rule id -> number of elements with that problem
      const axeRules = {};
      for (const v of axe.violations) axeRules[v.id] = v.nodes.length;

      const screenshotFile = path.join("test-results", "screenshots", project, `${slug(page)}.png`);
      fs.mkdirSync(path.dirname(screenshotFile), { recursive: true });
      await browserPage.screenshot({ path: screenshotFile, fullPage: true });

      // Each flag is present only when there is a problem.
      const status = response.status();
      const found = {
        ...(status !== 200 && { status }),
        ...(pageErrors.length && { pageErrors: [...new Set(pageErrors)].sort() }),
        ...(consoleErrors.length && { consoleErrors: [...new Set(consoleErrors)].sort() }),
        ...(dom.overflow && { overflow: true }),
        ...(!dom.hasTitleTag || !dom.title ? { noTitle: true } : {}),
        ...(!dom.robots.includes("noindex, nofollow") && { noRobots: true }),
        ...(dom.h1Count !== 1 && { h1: dom.h1Count }),
        ...(Object.keys(axeRules).length && { axe: axeRules }),
      };
      writeFinding("page", project, page, found);
      if (UPDATE) return;

      const base = baselineFor(page)[project] ?? {};
      const label = `${page} (${project})`;
      expect.soft(status, `${label}: page should return 200`).toBe(200);
      const newPageErrors = [...new Set(pageErrors)].filter(k => !(base.pageErrors ?? []).includes(k));
      expect.soft(newPageErrors, `${label}: new uncaught page errors`).toEqual([]);
      const newKinds = [...new Set(consoleErrors)].filter(k => !(base.consoleErrors ?? []).includes(k));
      expect.soft(newKinds, `${label}: new kinds of console error`).toEqual([]);
      expect
        .soft(!dom.overflow || !!base.overflow, `${label}: sideways scrolling (page is ${dom.scrollWidth}px wide, screen is ${dom.innerWidth}px)`)
        .toBe(true);
      expect.soft(!found.noTitle || !!base.noTitle, `${label}: missing <title>`).toBe(true);
      expect.soft(!found.noRobots || !!base.noRobots, `${label}: missing <meta name="robots" content="noindex, nofollow">`).toBe(true);
      expect.soft(dom.h1Count === 1 || base.h1 === dom.h1Count, `${label}: expected exactly one <h1>, found ${dom.h1Count}`).toBe(true);
      // A rule fails if it is new, or affects more elements than the baseline allows (fewer is fine).
      const worseAxe = Object.entries(axeRules)
        .filter(([id, count]) => count > (base.axe?.[id] ?? 0))
        .map(([id, count]) => `${id}: ${count} elements (baseline allows ${base.axe?.[id] ?? 0})`);
      expect.soft(worseAxe, `${label}: new or increased accessibility problems (axe)`).toEqual([]);
    });
  }
});

test.describe("internal links", () => {
  for (const page of pages) {
    test(page, async ({ page: browserPage, request, baseURL }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "Links are the same at both sizes; checked once.");
      const origin = new URL(baseURL).origin;
      await browserPage.goto(`/${page}`, { waitUntil: "load" });
      await browserPage.waitForTimeout(400);
      const hrefs = await browserPage.evaluate(() => [...document.querySelectorAll("a[href], area[href]")].map(a => a.href));

      const targets = new Set();
      for (const href of hrefs) {
        let url;
        try {
          url = new URL(href);
        } catch {
          continue;
        }
        // Skip other websites, mailto:, tel:, data: and javascript: links.
        if (url.origin !== origin || !/^https?:$/.test(url.protocol)) continue;
        targets.add(url.pathname);
      }

      const broken = [];
      for (const target of [...targets].sort()) {
        const res = await request.get(target);
        if (res.status() !== 200) broken.push(`${target} (${res.status()})`);
      }
      writeFinding("links", "desktop", page, { brokenLinks: broken });
      if (UPDATE) return;

      const known = baselineFor(page).brokenLinks ?? [];
      expect(
        broken.filter(b => !known.includes(b)),
        `${page}: links that do not work`,
      ).toEqual([]);
    });
  }
});
