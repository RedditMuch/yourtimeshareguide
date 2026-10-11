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
- Never commit zip files, scans of the directory, or anything private. Everything in this repository is public, and GitHub Pages publishes the whole repository root, including this file.

## Site facts

- Since 2026-10-11 (planning issue #18) the repository holds two versions for comparison, and the owner will keep one at launch:
  - `starburst/`: the owner's site, six pages. Plain HTML and CSS with no build step. `style.css` is shared within the folder; `seasons.html` carries its own inline styles and data. The header, menu and footer are repeated in all six pages, so change all of them together.
  - `52weeks/`: "Owner Atlas", the friend's ChatGPT-built site (15 pages), copied from the zip's `site/public/` with only `noindex` added. Directory scans and photos were left out by the owner's decision, so those images are blank. Saved stays, saved plans and the points ledger need a server and don't work here.
  - The root `index.html` is a standalone "coming soon" page with no links to either folder.
- Each folder is self-contained: relative links only and no files shared between them, so either can be moved to the root unchanged. Keep it that way.
- Every page keeps `noindex, nofollow` until launch (#17).
- To preview, open the `.html` file in a browser. Check phone width (about 400 px) as well as desktop.
