// Compiles the design system's tokens (design-system/tokens.json) into
// tokens.css: @font-face rules, light values on :root, and dark values both for
// readers whose device is set to dark (prefers-color-scheme) and for an
// explicit data-theme="dark". Adapted from the planning repository's
// tools/design-system/build-tokens.mjs, so the site and Claude Design produce
// the same CSS from the same file.
//
// Eleventy runs this before every build (eleventy.config.js) and writes
// _site/assets/css/tokens.css. To run it by hand:
//   node scripts/build-tokens.mjs [tokens.json] [out.css] [fontUrlPrefix]

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

  const valueIn = (token, theme) =>
    typeof token.value === "string" ? (theme === first ? token.value : null) : (token.value[theme] ?? null);
  const cssValue = (v) => v.replace(/^\{(.+)\}$/, "var(--$1)");

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

  const colorDecls = (theme) =>
    t.color.tokens
      .map((tok) => [tok.name, valueIn(tok, theme)])
      .filter(([, v]) => v !== null)
      .map(([n, v]) => `  --${n}: ${cssValue(v)};`);
  const shadowDecls = (theme) =>
    (t.shadow?.tokens ?? [])
      .map((tok) => [tok.name, valueIn(tok, theme)])
      .filter(([, v]) => v !== null)
      .map(([n, v]) => `  --${n}: ${v};`);

  const other = Object.entries(t)
    .filter(([k, v]) => !["name", "version", "meta", "color", "type", "shadow"].includes(k) && v && Array.isArray(v.tokens))
    .flatMap(([, v]) => v.tokens.map((tok) => `  --${tok.name}: ${tok.value};`));
  const families = Object.entries(t.type.families ?? {}).map(([k, v]) => `  --font-${k}: ${v};`);

  lines.push("", ":root {", "  color-scheme: light;", ...colorDecls(first), ...shadowDecls(first), ...other, ...families, "}");

  for (const theme of others) {
    const decls = [`  color-scheme: ${theme};`, ...colorDecls(theme), ...shadowDecls(theme)];
    if (theme === "dark") {
      lines.push("", "@media (prefers-color-scheme: dark) {", '  :root:not([data-theme="light"]) {', ...decls.map((d) => "  " + d), "  }", "}");
    }
    lines.push("", `:root[data-theme="${theme}"] {`, ...decls, "}");
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
