# Design system (copied from Claude Design)

The source of truth for how the site looks is the **Your Timeshare Guide design system in Claude Design**:
https://claude.ai/artifact/Sn1itr4wptnoimJovtDDx1

Its brand book (colors, type, spacing, voice) and every component's markup and notes live there. This folder holds the three files the website builds from:

| File | What it is | Copied from Claude Design |
|---|---|---|
| `tokens.json` | Colors (light and dark), fonts, type sizes, spacing, corners | `tokens.json` |
| `components.css` | The styles of every component (`ytg-` classes) | `components/bundle.css` |
| `ytg.js` | The few components that need a script (`window.YTG`, such as `YTG.progress` for Progress) | `components/bundle.js` |

This folder is **not published**. Each build (`npm run build` or `npm start`):

- turns `tokens.json` into `assets/css/tokens.css` (`scripts/build-tokens.mjs`: `@font-face` rules for the fonts in `assets/fonts/`, light colors, and dark colors for devices set to dark or `data-theme="dark"`);
- copies `components.css` to `assets/css/components.css` and `ytg.js` to `assets/js/ytg.js`.

The page layout loads all three on every page.

## Changing the design

1. Change it in Claude Design first (a new component, a new variant, a color).
2. Copy that version's `tokens.json`, `components/bundle.css` and `components/bundle.js` here, as `tokens.json`, `components.css` and `ytg.js`, unchanged.
3. If a component's markup changed, update its macro in `_includes/components.njk` to match the component's README in Claude Design.
4. `npm test`, and look at the pages at phone and desktop width, light and dark.

If a page needs a component that isn't in Claude Design yet, it's designed there first. When that can't wait, add it at the end of `components.css` under a comment marking it as not yet in Claude Design, list it in the pull request as "to add to Claude Design", and remove the comment once the next copy from Claude Design includes it.

Current version: design system version 6 (October 11, 2026), with the owner's logo choice (variant 5D: the four-square icon beside the name).

Never edit these files by hand otherwise: the next copy from Claude Design would undo the change.

