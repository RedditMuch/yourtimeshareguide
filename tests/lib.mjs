// Shared helpers for the browser checks.
import fs from "node:fs";
import path from "node:path";

export const SITE = path.resolve("_site");
export const BASELINE_FILE = path.resolve("tests", "baseline.json");
export const FINDINGS_DIR = path.resolve("test-results", "findings");
export const UPDATE = process.env.UPDATE_BASELINE === "1";

/** Every built .html page, as site-relative paths such as "52weeks/index.html". */
export function discoverPages(dir = SITE, base = "") {
  if (!fs.existsSync(dir)) throw new Error('_site/ not found. Run "npm run build" first (or use "npm test").');
  const pages = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) pages.push(...discoverPages(path.join(dir, entry.name), rel));
    else if (entry.name.endsWith(".html")) pages.push(rel);
  }
  return pages.sort();
}

/** "52weeks/index.html" becomes "52weeks__index" (safe for file names). */
export const slug = page => page.replace(/\.html$/, "").replaceAll("/", "__");

export function loadBaseline() {
  try {
    return JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
  } catch {
    return { pages: {} };
  }
}

/** Baseline entry for one page: { phone: {...}, desktop: {...}, brokenLinks: [...] }. */
export function baselineFor(page) {
  return loadBaseline().pages?.[page] ?? {};
}

export function writeFinding(kind, project, page, data) {
  fs.mkdirSync(FINDINGS_DIR, { recursive: true });
  fs.writeFileSync(path.join(FINDINGS_DIR, `${kind}.${project}.${slug(page)}.json`), JSON.stringify({ page, project, kind, data }));
}

/** Pages that are slow to draw and screenshot; they get a longer timeout (test.slow()) instead of raising it for every page. */
export const HEAVY_PAGES = new Set([
  "52weeks/seasons.html",
  "52weeks/seasons-v2.html",
  "52weeks/resorts.html",
  "52weeks/fees.html",
  "52weeks/planner.html",
  "52weeks/compare.html",
  "52weeks/directory.html",
]);

/**
 * Reduces a console error to its "kind", so the baseline does not depend on timing or counts:
 * web addresses become <url>, numbers become N, and failed loads are named by file path
 * (so 196 missing charts/page-NNN.webp images are one kind).
 */
export function errorKind(text, url = "") {
  const clean = s => s.replace(/https?:\/\/[^\s)]+/g, "<url>").replace(/\d+/g, "N").slice(0, 200);
  let kind = clean(text);
  if (/^Failed to load resource/.test(text) && url) {
    try { kind += ` ${new URL(url).pathname.replace(/[^/]+(\.\w+)$/, "*$1").replace(/\d+/g, "N")}`; } catch { /* keep text only */ }
  }
  return kind;
}
