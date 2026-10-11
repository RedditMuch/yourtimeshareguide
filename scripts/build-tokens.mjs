// Compiles the design system's tokens.json into tokens.css: @font-face rules,
// the first theme's values (light) on :root, and each other theme's values on
// [data-theme="<id>"]; dark also applies when the reader's device is set to dark
// (prefers-color-scheme), unless the page sets data-theme="light".
//
// One file, two copies kept identical: the website's scripts/build-tokens.mjs
// and the planning repository's tools/design-system/build-tokens.mjs, so the
// site and Claude Design produce the same CSS from the same tokens.json.
//
// The website's Eleventy build runs it before every build (eleventy.config.js)
// and writes _site/assets/css/tokens.css. By hand:
//   node build-tokens.mjs [tokens.json] [out.css] [fontUrlPrefix]
//   (defaults: design-system/tokens.json, _site/assets/css/tokens.css, /assets/fonts/)

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const TOKENS_SOURCE = "design-system/tokens.json";
export const TOKENS_OUTPUT = "assets/css/tokens.css"; // inside the output folder
export const FONT_URL_PREFIX = "/assets/fonts/";

/** Returns the text of tokens.css for the parsed tokens.json. */
export function tokensCss(t, fontPrefix = FONT_URL_PREFIX) {
  const themes = t.color.themes.map((th) => th.id);
  const [first, ...others] = themes;

  // A token's value is either one value for every theme (a string) or one per
  // theme ({ "light": …, "dark": … }). Plain values go in the first theme's block
  // (:root); themed values go in each theme's block. "{name}" means var(--name).
  const valueIn = (token, theme) =>
    typeof token.value === "object" && token.value !== null
      ? (token.value[theme] ?? null)
      : theme === first ? String(token.value) : null;
  const cssValue = (v) => v.replace(/^{(.+)}$/, "var(--$1)");

  const lines = [
    `/* ${t.name}: generated from design-system/tokens.json by scripts/build-tokens.mjs. Do not edit; change tokens.json in Claude Design, copy it here and rebuild. */`,
    "",
  ];

  for (const f of t.type.fonts ?? []) {
    lines.push(
      "@font-face {",
      `  font-family: "${f.family}";`,
      `  src: url("${fontPrefix}${f.file.replace(/^fonts\//, "")}") format("woff2");`,
      `  font-weight: ${f.weight};`,
      `  font-style: ${f.style ?? "normal"};`,
      "  font-display: swap;",
      "}",
    );
  }

  // Every token family (color first, then shadow, then the rest in file order).
  const familyNames = [
    "color",
    "shadow",
    ...Object.keys(t).filter((k) => !["name", "version", "meta", "color", "type", "shadow"].includes(k)),
  ].filter((k) => t[k] && Array.isArray(t[k].tokens));
  const decls = (theme) =>
    familyNames.flatMap((k) =>
      t[k].tokens
        .map((tok) => [tok.name, valueIn(tok, theme)])
        .filter(([, v]) => v !== null)
        .map(([n, v]) => `  --${n}: ${cssValue(v)};`),
    );
  const families = Object.entries(t.type.families ?? {}).map(([k, v]) => `  --font-${k}: ${v};`);
  // color-scheme tells the browser how to draw form controls and scrollbars;
  // only "light" and "dark" mean anything to it.
  const scheme = (theme) => (["light", "dark"].includes(theme) ? [`  color-scheme: ${theme};`] : []);

  lines.push("", ":root {", ...scheme(first), ...decls(first), ...families, "}");

  for (const theme of others) {
    const themed = [...scheme(theme), ...decls(theme)];
    if (theme === "dark") {
      lines.push("", "@media (prefers-color-scheme: dark) {", '  :root:not([data-theme="light"]) {', ...themed.map((d) => "  " + d), "  }", "}");
    }
    lines.push("", `[data-theme="${theme}"] {`, ...themed, "}");
  }

  return lines.join("\n") + "\n";
}

/** Reads tokens.json and writes tokens.css, creating the folder if needed. */
export function buildTokens(src = TOKENS_SOURCE, out = `_site/${TOKENS_OUTPUT}`, fontPrefix = FONT_URL_PREFIX) {
  const t = JSON.parse(readFileSync(src, "utf8"));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, tokensCss(t, fontPrefix));
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [, , src, out, prefix] = process.argv;
  console.log(`Wrote ${buildTokens(src, out, prefix)}`);
}
