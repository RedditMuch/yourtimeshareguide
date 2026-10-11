// Checks that season chart v2 and the files it loads are unchanged, both in
// the source and in the built site (_site/), against scripts/protected-files.sha256.
// Line endings are normalized first, so Windows and GitHub give the same answer.
//
// Usage: node scripts/check-protected.mjs
// Exits with an error if any protected file is missing or different.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const listFile = new URL("./protected-files.sha256", import.meta.url);
const entries = readFileSync(listFile, "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [hash, path] = line.split(/\s+/);
    return { hash, path };
  });

function fingerprint(file) {
  // latin1 maps each byte to one character, so this is safe for any file.
  const text = readFileSync(file).toString("latin1").replaceAll("\r\n", "\n");
  return createHash("sha256").update(Buffer.from(text, "latin1")).digest("hex");
}

const roots = ["."];
if (existsSync("_site")) roots.push("_site");

const problems = [];
for (const root of roots) {
  for (const { hash, path } of entries) {
    const file = `${root}/${path}`;
    if (!existsSync(file)) problems.push(`missing: ${file}`);
    else if (fingerprint(file) !== hash) problems.push(`changed: ${file}`);
  }
}

if (problems.length) {
  console.error("Season chart v2 protection check FAILED:");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    "These files are protected (CLAUDE.md). Undo the change, or, if the owner " +
      "asked for it, update scripts/protected-files.sha256 in the same pull request.",
  );
  process.exit(1);
}

console.log(
  `Season chart v2 protection check passed: ${entries.length} files unchanged in ${roots.join(" and ")}.`,
);
