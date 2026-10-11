# Design system (copied from Claude Design)

The source of truth for how the site looks is the **Your Timeshare Guide design system in Claude Design**:
https://claude.ai/artifact/Sn1itr4wptnoimJovtDDx1

Its brand book (colors, type, spacing, voice) and every component's markup and notes live there. This folder holds the two files the website builds from:

| File | What it is | Copied from Claude Design |
|---|---|---|
| `tokens.json` | Colors (light and dark), fonts, type sizes, spacing, corners | `tokens.json` |
| `components.css` | The styles of every component (`ytg-` classes) | `components/bundle.css` |

This folder is **not published**. Each build (`npm run build` or `npm start`):

- turns `tokens.json` into `assets/css/tokens.css` (`scripts/build-tokens.mjs`: `@font-face` rules for the fonts in `assets/fonts/`, light colors, and dark colors for devices set to dark or `data-theme="dark"`);
- copies `components.css` to `assets/css/components.css`.

## Changing the design

1. Change it in Claude Design first (a new component, a new variant, a color).
2. Copy that version's `tokens.json` and `components/bundle.css` here, as `tokens.json` and `components.css`, unchanged.
3. If a component's markup changed, update its macro in `_includes/components.njk` to match the component's README in Claude Design.
4. `npm test`, and look at the pages at phone and desktop width, light and dark.

Never edit these two files by hand otherwise: the next copy from Claude Design would undo the change.

## Waiting to go into Claude Design

Built here for the main page (planning #32) and marked at the end of `components.css`. Until Claude Design has them, copying `bundle.css` over `components.css` would drop them, so add them there first:

- **PageLayout**: `ytg-regions` (page regions under the heading, `space-7` apart) and `ytg-page-foot` (closing region under a hairline: downloads, "About" details).
- **FormField**: `ytg-form` (a form's fields, `space-4` apart, at most `measure` wide) and `ytg-field--inline` with `ytg-field__text` ("Within [35 miles] of the destination").
- **FactList** (new): `ytg-facts`, name and value pairs in a `<dl>` (data coverage).
- **Fixes**: SiteFooter text was centered (`.ytg-footer__inner` also has `.ytg-container`, and its `measure` max-width centered it); Disclosure showed no open/closed triangle and its text ran wider than `measure`.
