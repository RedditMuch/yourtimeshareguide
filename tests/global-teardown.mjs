// Runs after every test run. Prints the known problems that are still present, and
// (with UPDATE_BASELINE=1, via `npm run test:update-baseline`) rewrites tests/baseline.json.
import fs from "node:fs";
import path from "node:path";
import { FINDINGS_DIR, BASELINE_FILE, UPDATE, loadBaseline } from "./lib.mjs";

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortKeys(value[k])]));
  return value;
}

export default async function () {
  if (!fs.existsSync(FINDINGS_DIR)) return;
  const results = fs.readdirSync(FINDINGS_DIR).map(f => JSON.parse(fs.readFileSync(path.join(FINDINGS_DIR, f), "utf8")));
  const current = {};
  for (const { page, project, kind, data } of results) {
    if (kind === "links") {
      if (data.brokenLinks.length) (current[page] ??= {}).brokenLinks = data.brokenLinks;
    } else if (Object.keys(data).length) {
      (current[page] ??= {})[project] = data;
    }
  }

  if (UPDATE) {
    const out = {
      _note: "Problems that already existed when the checks were added. Regenerate with `npm run test:update-baseline`. Tests fail only on problems not listed here.",
      pages: sortKeys(current),
    };
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(out, null, 2) + "\n");
    console.log(`\nBaseline updated: ${Object.keys(current).length} pages have known problems (tests/baseline.json).`);
    return;
  }

  // Summary of baseline problems that are still present.
  const baseline = loadBaseline().pages ?? {};
  const counts = {};
  const axeCounts = {};
  const bump = (obj, key, n = 1) => (obj[key] = (obj[key] ?? 0) + n);
  const affected = new Set();
  for (const [page, entry] of Object.entries(current)) {
    const known = baseline[page] ?? {};
    for (const project of ["phone", "desktop"]) {
      for (const [key, value] of Object.entries(entry[project] ?? {})) {
        const knownValue = known[project]?.[key];
        if (knownValue === undefined) continue;
        if (key === "axe") {
          for (const id of Object.keys(value).filter(id => id in knownValue)) {
            bump(counts, "axe");
            bump(axeCounts, id);
            affected.add(page);
          }
        } else {
          bump(counts, key);
          affected.add(page);
        }
      }
    }
    if (entry.brokenLinks && known.brokenLinks) {
      bump(counts, "brokenLinks", entry.brokenLinks.length);
      affected.add(page);
    }
  }
  if (!affected.size) return;
  const top = Object.entries(axeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => `${id} x${n}`).join(", ");
  console.log(
    `\nKnown problems still present (listed in tests/baseline.json): ${affected.size} pages. ` +
      Object.entries(counts).map(([k, n]) => `${k}: ${n}`).join(", ") +
      (top ? `. Most common accessibility rules: ${top}.` : "."),
  );
}
