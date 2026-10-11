// Eleventy builds the site into _site/, which GitHub Actions publishes.
//
// Two kinds of page live side by side:
// - Existing .html files are copied byte-for-byte and never run through a
//   template engine. Season chart v2 is one of these and must stay that way
//   (see CLAUDE.md, "Season chart v2 is protected").
// - New pages are .njk files that use the shared layout and components in
//   _includes/ (layouts/base.njk and components.njk). 52weeks/booking.njk builds
//   to 52weeks/booking.html (not to 52weeks/booking/index.html), so addresses
//   and relative links stay the same. A .njk page must not share its name with
//   an .html file; scripts/check-build.mjs fails the build if one does.
//
// The design system (design-system/, copied from Claude Design) is not
// published itself. Each build turns design-system/tokens.json into
// assets/css/tokens.css, copies design-system/components.css to
// assets/css/components.css and design-system/ytg.js (the components that
// need a script, such as Progress) to assets/js/ytg.js; the layout loads all three.
//
// Only the site folders and root files listed in scripts/site-files.mjs are
// published, so repository files such as README.md and CLAUDE.md never reach
// the live site.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildTokens, TOKENS_OUTPUT, TOKENS_SOURCE } from "./scripts/build-tokens.mjs";
import { ASSET_EXTENSIONS, ROOT_FILES, SITE_FOLDERS } from "./scripts/site-files.mjs";

export default function (eleventyConfig) {
  for (const folder of SITE_FOLDERS) {
    eleventyConfig.addPassthroughCopy(`${folder}/**/*.{${ASSET_EXTENSIONS.join(",")}}`);
  }
  for (const file of ROOT_FILES) {
    eleventyConfig.addPassthroughCopy(file);
  }

  // Design system: tokens.css is generated before every build (and every
  // rebuild while previewing); components.css and ytg.js are copied as they are.
  const designFiles = {
    "/assets/css/components.css": "design-system/components.css",
    "/assets/js/ytg.js": "design-system/ytg.js",
  };
  const versions = new Map();
  eleventyConfig.on("eleventy.before", ({ directories }) => {
    const tokensFile = buildTokens(TOKENS_SOURCE, join(directories.output, TOKENS_OUTPUT));
    // Short content hashes for cache-busting (see the "versioned" filter).
    const hash = (file) => createHash("sha256").update(readFileSync(file)).digest("hex").slice(0, 10);
    versions.set(`/${TOKENS_OUTPUT}`, hash(tokensFile));
    for (const [url, source] of Object.entries(designFiles)) versions.set(url, hash(source));
  });
  for (const [url, source] of Object.entries(designFiles)) {
    eleventyConfig.addPassthroughCopy({ [source]: url.slice(1) });
  }

  // "/assets/css/components.css" becomes "/assets/css/components.css?v=<hash of its
  // content>", so a returning visitor never gets new pages with old styles from the
  // browser's cache (GitHub Pages lets browsers keep files for 10 minutes).
  eleventyConfig.addFilter("versioned", (url) => {
    if (!versions.has(url)) throw new Error(`versioned: no design-system file at ${url}`);
    return `${url}?v=${versions.get(url)}`;
  });
  eleventyConfig.addWatchTarget("design-system/");

  // Dates for LastChecked. Front matter may give "2026-10-11" as text or as a
  // date (YAML reads an unquoted 2026-10-11 as a date at midnight UTC).
  const asDate = (value) => (value instanceof Date ? value : new Date(`${value}T00:00:00Z`));
  // 2026-10-11 becomes "2026-10-11" (for <time datetime>).
  eleventyConfig.addFilter("isoDate", (value) => asDate(value).toISOString().slice(0, 10));
  // 2026-10-11 becomes "October 11, 2026" (dates are written out in full).
  eleventyConfig.addFilter("longDate", (value) =>
    asDate(value).toLocaleDateString("en-US", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }),
  );

  // Every .njk page builds to the .html file of the same name. A page can
  // still set its own permalink in its front matter.
  eleventyConfig.addGlobalData("permalink", "{{ page.filePathStem }}.html");

  eleventyConfig.ignores.add("node_modules/**");
  eleventyConfig.ignores.add("scripts/**");
  eleventyConfig.ignores.add("tests/**");
  eleventyConfig.ignores.add(".github/**");
  eleventyConfig.ignores.add("design-system/**");

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    // .html is deliberately not a template format: existing pages are copied
    // as they are, never processed.
    templateFormats: ["njk"],
    htmlTemplateEngine: false,
  };
}
