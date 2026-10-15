// What gets published: shared by eleventy.config.js and scripts/check-build.mjs.

// Folders whose files are published. .njk pages may also live at the
// repository root (see ROOT_NJK_FILES below).
export const SITE_FOLDERS = ["52weeks", "starburst", "assets"];

// .njk files at the repository root that build to a root-level page
// (index.njk -> the root index.html). scripts/check-build.mjs checks each
// one actually built, the same way it checks .njk files inside SITE_FOLDERS.
export const ROOT_NJK_FILES = ["index.njk"];

// Files at the repository root that are published if they exist.
export const ROOT_FILES = ["index.html", "comingsoon.html", "CNAME", "404.html", "robots.txt", "favicon.ico", "sitemap.xml", "site.webmanifest"];

// File types copied as they are. A file of any other type in a site folder fails the build
// (scripts/check-build.mjs), so nothing is ever left off the live site by accident.
export const ASSET_EXTENSIONS = [
  "html", "css", "js", "mjs", "json", "txt", "xml", "csv", "webmanifest",
  "svg", "png", "jpg", "jpeg", "gif", "webp", "avif", "ico",
  "woff2", "woff", "ttf", "otf",
  "pdf", "xlsx", "mp4", "webm",
];

// Files in site folders that are never published and need no check.
export const IGNORED_NAMES = [".DS_Store", "Thumbs.db", "desktop.ini"];

// Files the build makes from the design system (design-system/, which is not
// itself published). scripts/check-build.mjs checks each one is in _site/.
// - tokens.css is generated from design-system/tokens.json by scripts/build-tokens.mjs;
// - tokens-no-fonts.css is tokens.css without its @font-face rules (eleventy.config.js; season chart v2, planning #36);
// - components.css and ytg.js are design-system/components.css and ytg.js, copied as they are.
export const TOKENS_NO_FONTS_OUTPUT = "assets/css/tokens-no-fonts.css";
export const GENERATED_FILES = ["assets/css/tokens.css", TOKENS_NO_FONTS_OUTPUT, "assets/css/components.css", "assets/js/ytg.js"];
