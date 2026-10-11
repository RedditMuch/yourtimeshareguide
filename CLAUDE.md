# Instructions for Claude and other agents

This repository is the public source of **yourtimeshareguide.com**. Every merge to `main` goes live within minutes.

## Before you start

1. `git pull` here and in the private planning repository `RedditMuch/yourtimeshareguide-planning` (cloned at `C:\AllFiles\Claude\yourtimeshareguide-planning`).
2. Read its `CLAUDE.md` and `docs/WORKFLOW.md`. The backlog, milestones and handoff notes are in that repository's issues. This repository has issues turned off.
3. Continue unfinished work first: issues labeled `status: in progress`, and open pull requests here (`gh pr list`).

## How changes are made

- `main` is protected: every change needs a pull request, and force-pushes and branch deletion are blocked.
- Branch name: `issue-<N>-<short-slug>`, where N is the planning-repository issue number.
- Open a **draft** PR early and push often, so unfinished work is never stuck on one computer.
- The PR description must say `Closes RedditMuch/yourtimeshareguide-planning#<N>`.
- Before stopping with work unfinished, push and leave a handoff comment on the issue (format in `docs/WORKFLOW.md`).
- **Only the owner merges.** Never merge without the owner's explicit OK in the current session.

## Content rules

- Cite the *Club Wyndham Member's Directory 2026/2027* by its **printed** blue-circle page number, or an official Club Wyndham link.
- Update a page's "Last checked" date whenever its facts are re-verified.
- Plain language for owners who aren't experts. Keep the independence and "not legal or financial advice" footer on every page.
- Never commit zip files, scans of the directory, or anything private. Everything in this repository is public (anyone can read it on GitHub), even though only the built site is published at yourtimeshareguide.com.

## Site facts

- Since 2026-10-11 (planning issue #18) the repository holds two versions for comparison, and the owner will keep one at launch:
  - `starburst/`: the owner's site, six pages. Plain HTML and CSS with no build step. `style.css` is shared within the folder; `seasons.html` carries its own inline styles and data. The header, menu and footer are repeated in all six pages, so change all of them together.
  - `52weeks/`: "Owner Atlas", the friend's ChatGPT-built site (15 pages, plus season chart v2), copied from the zip's `site/public/` with only `noindex` added. Directory scans and photos were left out by the owner's decision, so those images are blank. Saved stays, saved plans and the points ledger need a server and don't work here.
  - The root `index.html` is a standalone "coming soon" page with no links to either folder.
- Each folder is self-contained: relative links only and no files shared between them, so either can be moved to the root unchanged. Keep it that way. **One exception (planning #28, owner's request):** `52weeks/index.html` is the main page and links every page of both versions, so it links to `../starburst/`. If 52weeks moves to the root, change those links to `starburst/`.
- **Season chart v2 is protected** (owner, 2026-10-11): it's the core of the project and the version that continues to be built out. Never change `52weeks/seasons-v2.html`, `.css`, `.js`, `club-pass-points.js`, or the files v2 loads (`data.js`, `geo-data.js`, `geo.js`, `points-data.js`, `reference-data.js`, `logo-band.svg`, `logo-icon.svg`) unless the owner asks for that change in the current session. A snapshot is kept as the tag `season-chart-v2-2026-10-11`, which can't be moved or deleted. To check nothing changed: `git diff --stat season-chart-v2-2026-10-11 -- <those files>` (no output means unchanged).
- Every page keeps `noindex, nofollow` until launch (#17).

## How the site is built (since planning #29)

- **Eleventy** builds `_site/`; `.github/workflows/site.yml` builds every pull request and publishes `main` to GitHub Pages. Only `52weeks/`, `starburst/`, `assets/`, the root `index.html` and `CNAME` are published (`eleventy.config.js`).
- **Existing `.html` files are copied byte-for-byte, never run through a template engine.** `.html` is deliberately not a template format. New pages are `.njk` files using the shared layouts and components in `_includes/`; `52weeks/x.njk` builds to `52weeks/x.html` (global permalink), so a page converted to `.njk` replaces its `.html` file at the same address. `npm run build` also runs `scripts/check-build.mjs`, which fails if a `.njk` and an `.html` share a name or if any site file is missing from `_site/` (what's published is listed in `scripts/site-files.mjs`).
- **Reuse components, don't remake them per page.** New components and page designs are designed in the Claude Design design system first (planning #31), then built once in `_includes/` and `assets/`.
- `npm run check:protected` fails if season chart v2 or any file it loads differs from `scripts/protected-files.sha256` (line endings ignored). It runs on every pull request.
- Browser checks (planning #30): `npm test` builds, then Playwright opens every built page at phone and desktop size (errors, sideways scrolling, title, one h1, noindex, axe accessibility, internal links, season chart v2) and saves screenshots to `test-results/screenshots/`. Existing problems are recorded in `tests/baseline.json`; tests fail only on new ones. After fixing a known problem, run `npm run test:update-baseline`; never use it to hide a new failure. CI runs these in the `test` job, and publishing to Pages waits for it. `scripts/serve.mjs` is the static server they use (`--password` adds Basic auth).
- Preview: `preview.cmd` (double-click) or `npm start`, at http://localhost:8080/. The preview server adds a live-reload `<script>` to pages it serves; the built files don't have it. Check phone width (about 400 px) as well as desktop.
- Private share links (planning #34): `share.cmd` or `node scripts/share.mjs [--hours N | --minutes N]` builds the site, serves `_site/` with a fresh password through `scripts/serve.mjs`, and opens a Cloudflare quick tunnel. It stops by itself after 2 hours (default, max 24), on Ctrl+C, or when the window closes.
- Windows: Git converts line endings to CRLF on checkout; the repository stores LF. Compare files with line endings normalized.
