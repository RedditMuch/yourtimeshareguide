# Your Timeshare Guide

Source for [yourtimeshareguide.com](https://yourtimeshareguide.com), an independent, plain-English guide for Club Wyndham owners, written by an owner.

## Two versions, side by side

While the site is under construction, the repository holds two complete versions so they can be compared. One will move to the root at launch.

| Folder | What it is |
|---|---|
| `index.html` (root) | A "coming soon" page, with no links to either version |
| `starburst/` | The owner's site: six pages and `style.css` |
| `52weeks/` | An alternative version built with ChatGPT ("Owner Atlas"), 15 pages |

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

- `starburst/`: plain HTML and CSS, with a little JavaScript on the calculator and Season Finder. There's no build step or framework.
- `52weeks/`: HTML pages with more JavaScript and eight stylesheets. Its saved stays, saved plans and points ledger needed a server in their original home, so they don't work here.
- Hosted on **GitHub Pages** from the `main` branch, at the repository root.
- `CNAME` sets the custom domain. `.nojekyll` tells GitHub Pages to serve the files exactly as they are.

## Making changes

`main` is the live site and is protected, so every change goes through a pull request:

1. `git pull`, then create a branch: `git switch -c issue-<N>-<short-slug>`.
2. Edit the HTML or CSS, then open the page in a browser to check it at desktop and phone widths.
3. Commit, push, and open a pull request (`gh pr create`). The template asks how the change was checked.
4. The owner reviews and **squash-merges**. The live site updates within a minute or two, and the branch is deleted.

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
