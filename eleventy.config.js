// Eleventy builds the site into _site/, which GitHub Actions publishes.
//
// Two kinds of page live side by side:
// - Existing .html files are copied byte-for-byte and never run through a
//   template engine. Season chart v2 is one of these and must stay that way
//   (see CLAUDE.md, "Season chart v2 is protected").
// - New pages are .njk files that use the shared layouts and components in
//   _includes/. 52weeks/booking.njk builds to 52weeks/booking.html (not to
//   52weeks/booking/index.html), so addresses and relative links stay the same.
//   A .njk page must not share its name with an .html file;
//   scripts/check-build.mjs fails the build if one does.
//
// Only the site folders and root files listed in scripts/site-files.mjs are
// published, so repository files such as README.md and CLAUDE.md never reach
// the live site.

import { ASSET_EXTENSIONS, ROOT_FILES, SITE_FOLDERS } from "./scripts/site-files.mjs";

export default function (eleventyConfig) {
  for (const folder of SITE_FOLDERS) {
    eleventyConfig.addPassthroughCopy(`${folder}/**/*.{${ASSET_EXTENSIONS.join(",")}}`);
  }
  for (const file of ROOT_FILES) {
    eleventyConfig.addPassthroughCopy(file);
  }

  // Every .njk page builds to the .html file of the same name. A page can
  // still set its own permalink in its front matter.
  eleventyConfig.addGlobalData("permalink", "{{ page.filePathStem }}.html");

  eleventyConfig.ignores.add("node_modules/**");
  eleventyConfig.ignores.add("scripts/**");
  eleventyConfig.ignores.add("tests/**");
  eleventyConfig.ignores.add(".github/**");

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
