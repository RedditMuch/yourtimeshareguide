# Your Timeshare Guide

Source for [yourtimeshareguide.com](https://yourtimeshareguide.com), an independent, plain-English guide for Club Wyndham owners, written by an owner.

## Two versions, side by side

While the site is under construction, the repository holds two complete versions so they can be compared. One will move to the root at launch.

| Folder | What it is |
|---|---|
| `index.html` (root) | A "coming soon" page, with no links to either version |
| `starburst/` | The owner's site: six pages and `style.css` |
| `52weeks/` | The version being built out: the Owner Atlas pages built with ChatGPT (15 pages) plus season chart v2. The main page, `index.html`, is built from `index.njk` with the design system |

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
- Existing `.html` pages are **copied exactly as they are**. New pages are `.njk` files that use the shared layout and components in `_includes/` (see "Design system" below).
- Only the site folders (`52weeks/`, `starburst/`, `assets/`), the root `index.html` and `CNAME` are published, plus `assets/css/tokens.css` and `assets/css/components.css`, which the build makes from `design-system/`. Repository files such as this README are not.
- **Season chart v2 is protected:** the build checks that it and the files it loads match `scripts/protected-files.sha256`, and fails if they don't.
- `starburst/`: plain HTML and CSS, with a little JavaScript on the calculator and Season Finder.
- `52weeks/`: HTML pages with more JavaScript and eight stylesheets. Its saved stays, saved plans and points ledger needed a server in their original home, so they don't work here.
- `CNAME` sets the custom domain.

### Previewing

Double-click **`preview.cmd`**. It opens the site at http://localhost:8080/ and rebuilds when a file changes. Close its window to stop. (Needs Node.js 22 or later; the first run installs Eleventy.)

From a terminal: `npm ci` once, then `npm start` to preview or `npm run build` to build `_site/`.

### Sharing a preview with a friend

Double-click **`share.cmd`** to get a private, temporary link a friend can open to look at the site and give feedback. (To choose how long it lasts, run `share.cmd 4` for 4 hours. The default is 2 hours and the most is 24.)

- It builds the site, then prints a short message with a link, a password and the time the link stops working. The message (without the password) is also copied, so you can paste it into an email or text. The password appears on screen only: send it in a separate message. If someone tries a wrong password 20 times, sharing stops by itself.
- The link and password are **new every time**. Anyone who has both can view the site until the link expires, so send them only to people you trust. The user name can be anything.
- It works **only while this computer is on and the window is open**. Closing the window, pressing Ctrl+C or reaching the end time stops it completely.
- The window shows when pages are opened (no names or addresses), so you can see when your friend is looking.
- It needs Node.js and `cloudflared` (free, from Cloudflare). From a terminal: `node scripts/share.mjs --hours 3` or `--minutes 30`.

## Design system

The site's look (colors, fonts, spacing and components such as the header, link lists, cards and buttons) is designed in **Claude Design**, which is the source of truth: https://claude.ai/artifact/Sn1itr4wptnoimJovtDDx1. Its brand book explains the rules. The main page (`52weeks/index.njk`) is the first page built with it; the other pages follow (planning #33).

| Where | What |
|---|---|
| `design-system/` | `tokens.json` and `components.css`, copied unchanged from Claude Design. Not published |
| `scripts/build-tokens.mjs` | Turns `tokens.json` into `assets/css/tokens.css` on every build (fonts, light and dark colors) |
| `assets/fonts/` | The four font files (Bricolage Grotesque, Atkinson Hyperlegible Next and Mono) and their SIL Open Font License texts. Nothing loads from Google |
| `_includes/layouts/base.njk` | The page frame: head, skip link, header and menu, page heading, footer |
| `_includes/components.njk` | One macro per component, writing exactly the design system's markup |
| `_data/site.js` | The site name and the header menu |
| `_data/mainPage.js` | The main page's links, as data |

**Making a page.** A page is a `.njk` file with a few settings at the top, then its content built from components:

```njk
---
layout: layouts/base.njk
title: Fees
lead: Every Club Wyndham fee, in one place.
description: One sentence for search results.
checked: 2026-10-11
---
{%- import "components.njk" as ui -%}
{{ ui.tag("In progress", "success") }}
{{ ui.linkList({ id: "plan", label: "Plan a stay", links: [{ title: "Find a stay", href: "planner.html", desc: "Nearby resorts and points budgets." }] }) }}
<p>Prime weeks cost the most points {{ ui.citation(241) }}.</p>
```

`title` is the page's main heading and its tab title ("Fees · Your Timeshare Guide"). `checked` adds the "Last checked" date. `scripts` lists JavaScript files to load. Pages add **no styles of their own**: if a page needs something the design system doesn't have, it is designed in Claude Design first.

**Updating from Claude Design.** Copy the new `tokens.json` and `components/bundle.css` into `design-system/` (as `tokens.json` and `components.css`), update any changed macro in `_includes/components.njk`, then run `npm test` and look at the pages in light and dark. Details are in `design-system/README.md`.

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
