// Checks the built site (_site/) after `eleventy` runs:
// - every file in the site folders and every published root file is in _site/
//   (so a new file type is never silently left off the live site);
// - the files generated from the design system (tokens.css, components.css) are there;
// - no .njk page shares its name with an .html file (Eleventy would silently
//   publish only one of them).
//
// Usage: node scripts/check-build.mjs   (runs as part of `npm run build`)

import { existsSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { ASSET_EXTENSIONS, GENERATED_FILES, IGNORED_NAMES, ROOT_FILES, SITE_FOLDERS } from "./site-files.mjs";

const problems = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const sources = [
  ...SITE_FOLDERS.filter((folder) => existsSync(folder)).flatMap(walk),
  ...ROOT_FILES.filter((file) => existsSync(file)),
];

for (const file of sources) {
  const name = file.split("/").pop();
  if (IGNORED_NAMES.includes(name)) continue;
  const ext = extname(file).slice(1).toLowerCase();

  if (ext === "njk") {
    const html = file.replace(/\.njk$/, ".html");
    if (existsSync(html)) problems.push(`${file} and ${html} would both build to ${html}; rename or remove one`);
    else if (!existsSync(join("_site", html))) problems.push(`${file} did not build to _site/${html}`);
    continue;
  }
  if (!ASSET_EXTENSIONS.includes(ext) && !ROOT_FILES.includes(file)) {
    problems.push(`${file} is not published: add ".${ext}" to ASSET_EXTENSIONS in scripts/site-files.mjs, or move it out of the site folders`);
    continue;
  }
  if (!existsSync(join("_site", file))) problems.push(`${file} is missing from _site/`);
}

for (const file of GENERATED_FILES) {
  if (!existsSync(join("_site", file))) problems.push(`_site/${file} was not generated from design-system/ (see eleventy.config.js)`);
}

if (problems.length) {
  console.error("Build check FAILED:");
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`Build check passed: ${sources.length} site files and ${GENERATED_FILES.length} design-system files are all in _site/.`);
