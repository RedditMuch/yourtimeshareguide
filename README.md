# Your Timeshare Guide

Source for [yourtimeshareguide.com](https://yourtimeshareguide.com), an independent, plain-English guide for Club Wyndham owners, written by an owner.

## Pages

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

- Plain HTML and CSS, with a little JavaScript on the calculator and Season Finder. There's no build step or framework.
- Hosted on **GitHub Pages** from the `main` branch, at the repository root.
- `CNAME` sets the custom domain. `.nojekyll` tells GitHub Pages to serve the files exactly as they are.

## Making changes

1. `git pull` to get the latest version.
2. Edit the HTML or CSS, then open the page in a browser to check it.
3. Commit and `git push`. The live site updates within a minute or two.

Every page repeats the same header, menu and footer, so a menu change must be made on all six pages.

## Content rules

- **Cite the source.** Facts come from the *Club Wyndham Member's Directory 2026/2027* (the page numbers printed in the blue circles) or another official Club Wyndham source.
- **Date it.** Update the "Last checked" line whenever a page's facts are re-verified.
- **Say when official material is wrong**, and show the evidence.
- **Plain language** for readers who aren't timeshare experts.
- Keep the independence and "not legal or financial advice" notice in every footer.

## Disclaimer

This is an independent site. It is not affiliated with, endorsed by, or sponsored by Club Wyndham, Wyndham Destinations, or Travel + Leisure Co. "Club Wyndham" and related names are trademarks of their owners.
