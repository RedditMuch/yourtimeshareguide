// Eleventy builds the site into _site/, which GitHub Actions publishes.
//
// Two kinds of page live side by side:
// - Existing .html files are copied byte-for-byte and never run through a
//   template engine. Season chart v2 is one of these and must stay that way
//   (see CLAUDE.md, "Season chart v2 is protected").
// - New pages are .njk files that use the shared layouts and components in
//   _includes/. Each builds to the .html file of the same name.
//
// Only the folders listed below are published, so repository files such as
// README.md and CLAUDE.md never reach the live site.

const SITE_FOLDERS = ["52weeks", "starburst", "assets"];
const ASSET_TYPES = "html,css,js,mjs,svg,png,jpg,jpeg,gif,webp,avif,ico,woff2,xlsx,pdf,txt,json";

export default function (eleventyConfig) {
  for (const folder of SITE_FOLDERS) {
    eleventyConfig.addPassthroughCopy(`${folder}/**/*.{${ASSET_TYPES}}`);
  }
  eleventyConfig.addPassthroughCopy("index.html");
  eleventyConfig.addPassthroughCopy("CNAME");

  // Only these folders hold templates; everything else (tests, scripts,
  // node_modules) is ignored.
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
