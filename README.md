# Your Timeshare Guide

Source for [yourtimeshareguide.com](https://yourtimeshareguide.com), an independent, plain-English guide for Club Wyndham owners, written by an owner.

## Two versions, side by side

While the site is under construction, the repository holds two complete versions so they can be compared. One will move to the root at launch.

| Folder | What it is |
|---|---|
| `index.html` (root) | A "coming soon" page, with no links to either version |
| `starburst/` | The owner's site: six pages and `style.css` |
| `52weeks/` | The version being built out: the Owner Atlas pages built with ChatGPT (15 pages) plus season chart v2. `index.html` is the main page |

Each folder is self-contained: it uses only relative links and shares no files with the other, so either can be moved to the root unchanged.

## Pages in `starburst/`

| Page | File | What it does |
|---|---|---|
| Home | `index.html` | What the site is and how it works |
| Points Value Calculator | `calculator.html` | Your cost per 1,000 points, compared with Wyndham's own prices |
| Season Finder | `seasons.html` | Every week of the year, color-coded by season, with points by suite size |
| Every Fee in One Place | `fees.html` | All charges in the Member's Directory, with page numbers |
| Directory Errors | `errors.html` | Mistakes found in the 2026/2027 Member's Directory |
| Helpful Resources | `resources.html` | Official links and phone numbers, and owner communities |

Shared styles are in `style.css`. The Season Finder keeps its color palette and data inside `seasons.html`.

## How the site is built

- **[Eleventy](https://www.11ty.dev/)** builds the site into `_site/`, and a GitHub Actions workflow (`.github/workflows/site.yml`) publishes it to **GitHub Pages** whenever `main` changes. Every pull request is built and checked too.
- Existing `.html` pages are **copied exactly as they are**. New pages are `.njk` files that use the shared layouts and components in `_includes/`.
- Only the site folders (`52weeks/`, `starburst/`, `assets/`), the root `index.html` and `CNAME` are published. Repository files such as this README are not.
- **Season chart v2 is protected:** the build checks that it and the files it loads match `scripts/protected-files.sha256`, and fails if they don't.
- `starburst/`: plain HTML and CSS, with a little JavaScript on the calculator and Season Finder.
- `52weeks/`: HTML pages with more JavaScript and eight stylesheets. Its saved stays, saved plans and points ledger needed a server in their original home, so they don't work here.
- `CNAME` sets the custom domain.

### Previewing

Double-click **`preview.cmd`**. It opens the site at http://localhost:8080/ and rebuilds when a file changes. Close its window to stop. (Needs Node.js 22 or later; the first run installs Eleventy.)

From a terminal: `npm ci` once, then `npm start` to preview or `npm run build` to build `_site/`.

## Checks

Every pull request is checked automatically by GitHub, and the site is published only if the checks pass. The checks open every page in a real browser (Chromium), once at phone size (390 px wide) and once at desktop size (1280 px wide), and look for:

- the page loads (no "not found") and has no JavaScript or console errors
- no sideways scrolling on a phone
- a page title, exactly one main heading (`<h1>`), and the `noindex, nofollow` tag
- accessibility problems (the axe tool, WCAG 2.1 levels A and AA)
- every link to another page of this site works
- the season chart v2 loads and draws its chart

Screenshots of every page at both sizes are saved with each run (in the pull request's "Browser checks" step, under Artifacts, for 14 days), so a reviewer can look without running anything.

**Run them yourself:** `npm ci` once, `npx playwright install chromium` once, then `npm test`. It builds the site and runs the checks (about a minute). Screenshots land in `test-results/screenshots/`, and the full report is `playwright-report/index.html`.

**Known problems (the baseline).** Some pages already had problems when the checks were added (mostly in `52weeks/`: low-contrast text, missing directory-scan images, pages that need a server). They are listed page by page in `tests/baseline.json`. The checks fail only on **new** problems (including more instances of a known accessibility problem on the same page), and print a short summary of the known ones. Fixing a known problem and then running `npm run test:update-baseline` removes it from the list.

**Updating the baseline** is acceptable only to record fixes (the list gets shorter), or when the owner has decided a new problem is acceptable. Never update it just to make a failing check go green: look at the failure first. Review the change to `tests/baseline.json` in the pull request.

## Making changes

`main` is the live site and is protected, so every change goes through a pull request:

1. `git pull`, then create a branch: `git switch -c issue-<N>-<short-slug>`.
2. Edit the pages, then preview (`preview.cmd`) and check at desktop and phone widths.
3. Commit, push, and open a pull request (`gh pr create`). The template asks how the change was checked. GitHub builds the site and runs the checks on the pull request.
4. The owner reviews and **squash-merges**. GitHub Actions publishes the site within a minute or two, and the branch is deleted.

Work is planned in a separate private repository. Agents should read [CLAUDE.md](CLAUDE.md) first.

In `starburst/`, every page repeats the same header, menu and footer, so a menu change must be made on all six pages.

## Content rules

- **Cite the source.** Facts come from the *Club Wyndham Member's Directory 2026/2027* (the page numbers printed in the blue circles) or another official Club Wyndham source.
- **Date it.** Update the "Last checked" line whenever a page's facts are re-verified.
- **Say when official material is wrong**, and show the evidence.
- **Plain language** for readers who aren't timeshare experts.
- Keep the independence and "not legal or financial advice" notice in every footer.

## Disclaimer

This is an independent site. It is not affiliated with, endorsed by, or sponsored by Club Wyndham, Wyndham Destinations, or Travel + Leisure Co. "Club Wyndham" and related names are trademarks of their owners.
