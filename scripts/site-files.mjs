// What gets published: shared by eleventy.config.js and scripts/check-build.mjs.

// Folders whose files are published (and the only places .njk pages may live).
export const SITE_FOLDERS = ["52weeks", "starburst", "assets"];

// Files at the repository root that are published if they exist.
export const ROOT_FILES = ["index.html", "CNAME", "404.html", "robots.txt", "favicon.ico", "sitemap.xml", "site.webmanifest"];

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
// - components.css is design-system/components.css, copied as it is.
export const GENERATED_FILES = ["assets/css/tokens.css", "assets/css/components.css"];
