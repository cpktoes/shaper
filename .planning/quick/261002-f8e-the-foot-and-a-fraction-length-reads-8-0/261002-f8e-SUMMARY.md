---
phase: quick-261002-f8e
plan: 01
subsystem: units-display
tags: [units, feet-and-inches, rocker, blanks, formatting, tests]
requires: []
provides:
  - "formatFeetInches writes the zero inches in front of a bare fraction: 8'0 1/8\", never 8'1/8\""
  - "every length in the app follows, through formatLength: ROCKER's blank rows and offer line, the Board Length line on TEMPLATE, VOLUME and FINS, the typed length box, the home screen's cards, the order form, the Full Sized Template and the Overview Sheet"
  - "parseImperial proven to read both spellings, so a length typed either way is the same length"
affects: [rocker-blank-list, summary-order-form, template-pdf, overview-pdf, home-cards]
tech-stack:
  added: []
  patterns: ["the zero is decided from the number (an exact sixteenth under one inch), never by reading the formatted string back"]
key-files:
  created: []
  modified:
    - lib/geometry/units.ts
    - lib/geometry/units.test.ts
    - lib/geometry/blank-reasons.test.ts
decisions:
  - "F-1 (confirmed by the founder on 2026-10-02 — 'Yes, 8'0 1/8\" is right — push it'): a length a fraction over a whole foot reads 8'0 1/8\" — eight foot and an eighth, as a shaper writes it. A whole number of feet stays 8'0\"."
  - "O-1: the change is inside formatFeetInches alone; formatInchesFraction keeps printing a bare 1/8\" for a mark on its own."
  - "O-4: Phase 11's archived records that quote 6'1/16\" are the record of their day and are not edited."
metrics:
  tasks: 1
status: complete
actuals:
  tokens: null  # not measured in this cloud session
  tasks: 1
  commits: 1
---

# Phase quick-261002-f8e Plan 01: A length a fraction over a whole foot reads 8'0 1/8" Summary

**A length whose inch part is only a fraction now carries its zero inches — the US Blanks 8'0"H reads `8'0 1/8"` on the ROCKER blank list, not `8'1/8"` — everywhere the app writes feet and inches, from one four-line change to the one formatter that writes them.**

## What changed, in a shaper's words

- **The reading.** A length a fraction over a whole foot used to drop the zero: 96 1/8" read `8'1/8"`, with the fraction standing where the inches go, which reads like a misprint. It now reads `8'0 1/8"` — eight foot and an eighth, the way a shaper writes it on a blank or an order. A whole number of feet reads exactly as before (`6'0"`, `8'0"`, `10'0"`), and a length with whole inches is untouched, fraction or not (`6'2"`, `6'2 1/2"`, `5'11 15/16"`).
- **Where it shows.** Every length in the app is written by the same formatter, so every one follows at once: a blank's row and the offer line beside a flag on ROCKER, the `Length and width from TEMPLATE` line, the Board Length line and typed box on TEMPLATE, VOLUME and FINS, the home screen's cards, the order form's Length cell and identification strip, and the Full Sized Template and Overview Sheet PDFs. No screen or print needed a change of its own.
- **Which numbers move.** Eleven readings in the catalogues: nine US Blanks (5'0"W `5'0 1/4"`, 6'0"P `6'0 3/4"`, 6'0"R `6'0 1/2"`, 7'1"A `7'0 7/8"`, 7'1"EA `7'0 1/2"`, 8'0"H `8'0 1/8"`, 8'1"EA `8'0 5/8"`, 10'0" EPS `10'0 3/4"`, and the 10'0"BG's deck length `10'0 3/8"`) and Marko Foam's two 6'0" blanks at 72.04" (`6'0 1/16"`). The four preset cards are whole inches, so none changes. A board set to such a length reads the same way.
- **Nothing stored moves.** This is display only (CLAUDE.md Rule 2): no saved board, no catalogue number and no stored millimetre changes, and Metric is untouched (`244.8 cm` as before). Typing either spelling into an imperial length box — `8'1/8"` or `8'0 1/8"` — still reads as the same length, so nothing a shaper typed or saw before stops being understood.
- **Marks on their own are untouched.** A rail band mark, a deck skin or a fin measurement still reads `1/8"` — a bare fraction is the right reading for a mark standing alone. Only feet-and-inches lengths gained the zero.

## Tasks and commits

| Task | What | Commit |
|------|------|--------|
| 1 | The zero inches in `formatFeetInches`, its tests, the two blank-list expectations | `ec6d842` |

BASE (the starting commit): `82de081dcdf01cb931a53ab6294e27c9c33c5fd8`.

## Evidence

- **Unit tests:** at BASE 3,614 passed / 2 skipped. After the change 3,633 passed / 2 skipped (92 files) — the 19 new cases: the new readings (`8'0 1/8"`, `6'0 1/16"`, five more), the unchanged ones (whole feet, whole inches with and without a fraction, the 1828.8 mm round-trip), every sixteenth across the board's own length range (60" to 120") printing as feet, whole inches, then an optional fraction and reading back through `parseImperial` to the same length, and eight typed spellings with and without the zero. The two `blank-reasons.test.ts` expectations for the Marko M-Regular's row and offer line now read `6'0 1/16"`. One test already expected the new reading: `summary-line.test.ts`'s shape check for the rack card line demands feet, whole inches, then an optional fraction, and passed before only because the Shortboard's length is whole inches.
- **Types and lint:** `npx tsc --noEmit` clean (after `npx next typegen`, which this fresh container needed for Next's generated `LayoutProps`); `npm run lint` clean.
- **Playwright** (one project per run on the main checkout, own dev server, Turbopack): desktop 179 passed / 148 skipped / 1 failed (6.4 min; the founder's last Mac run of the same suite: 180 passed / 148 skipped). The one failure is `e2e/desktop-regression.spec.ts`'s "ROCKER: a mouse drag of the placement slider moves the board toward the nose with no network request", which counts every request to any host between the press and the release and saw exactly one, Clerk's own script `https://example.clerk.accounts.dev/npm/@clerk/clerk-js@6/dist/clerk.browser.js`. It failed identically on one re-run (the same single URL), and identically again on the starting commit in this container, with the three changed files put back to their base versions for that run and the tree restored exactly afterwards (`git diff HEAD` empty). That failure is this container's, not the change's — see the next bullet; android 204 passed / 122 skipped / 2 failed (6.7 min; the founder's last Mac run: 206 passed / 122 skipped). The two failures are both in `e2e/outline-ghost.spec.ts` — "android: a touch drag reveals the ghost button, which hides and shows the ghost, with Export Template unmoved" and "(g2) tapping the phone undo bar's Undo button after one edit leaves no ghost" — and are this container's, not the change's (the bullet after next); iphone 199 passed / 129 skipped / 0 failed (6.3 min; the founder's last Mac run, on WebKit: 199 passed / 129 skipped). The skips are each project's own project-specific skips, as at BASE; the passed counts differ from the Mac's only by the three failures explained below.
- **Why that drag test fails here and not on the Mac:** a scratch script loaded `/design/rocker` on the suite's own dev server and did nothing else for 45 seconds, logging every request to the Clerk host. The script load fails at once with `net::ERR_TUNNEL_CONNECTION_FAILED` (this container's proxy refuses the tunnel to `example.clerk.accounts.dev`, the stand-in host the suite's non-secret key names), and Clerk's loader then retries it at 0.8, 1.5, 2.0, 2.8, 4.4 and 7.3 s, starts over at 15.9 s, and keeps going (16.2, 16.8, 17.7, 19.4, 23.4 s …) for as long as the page is open. So on this machine a ROCKER page issues a Clerk request every half-second to eight seconds with nobody touching it, and the drag's few-hundred-millisecond window catches one. The change under test is a string formatter in `lib/geometry/units.ts`; it makes no request and touches nothing on the drag path. On the founder's Mac the suite is green, as the last run above shows.
- **Why the two Android ghost tests fail here and not on the Mac:** both fail the same way on an idle machine (a clean run of the spec alone, nothing else running: 4 passed, 10 skipped, the same 2 failed) and the same way on the starting commit in this container, with the three changed files put back to their base versions (the tree restored exactly afterwards). Playwright's saved page snapshots show a tap that landed and did nothing: the ghost button still reads "Hide the ghost of the last edit" and pressed, and the Undo tap was never applied (Redo still disabled). What the two share, and the four passing Android tests in the spec lack, is a `tap()` right after a touch drag dispatched through CDP (`Input.dispatchTouchEvent`), on this container's pre-installed Chromium build 1194 — older than the build 1243 that Playwright 1.63 was built for and that the Mac runs use; every other Android tap in the suite worked (204 passed, phone menus and dialogs included). The change under test is a string formatter, and TEMPLATE's default board is 6'0", whose reading does not change.
- **Reference pictures:** none re-recorded, and none could be compared here — the five under `e2e/desktop-baseline.spec.ts-snapshots/` are macOS-rendered (`-darwin.png`) and this run was on Linux, so the desktop run used `--ignore-snapshots` and those five tests passed without a pixel comparison. They do not show a changed reading: the ROCKER picture lists 6'2"A, 6'2"AX, 6'2" MF and 6'4" SBM for the default board, none of the eleven, and the other four show no blank and a whole-inch board. The founder's Mac run is the proof for the pictures.
- **`git status`** clean after the commits.

## Deviations from Plan

None to the change or its tests. Three environment notes, none a code deviation:

- This cloud container has no GSD commands installed, so the quick-task record (this folder and the STATE.md row) was written by hand in the same shape `/gsd-quick` produces.
- The container's pre-installed Chromium is an older build than Playwright 1.63 expects, and the network policy blocks Playwright's browser downloads (`cdn.playwright.dev` and Microsoft's mirror both answer 403), so the browser suite ran through a scratch config outside the repo that launches the pre-installed Chromium for every project. **The iphone project therefore ran on Chromium with the iPhone 14 viewport, user agent, scale and touch settings — not on WebKit as the repo's config has it.** The founder's Mac run is the WebKit proof.
- Next.js refuses a second dev server from one checkout, so the three projects ran one after another rather than side by side.
- The three browser failures were each reproduced on the starting commit by putting the three changed files back to their base versions for one run (`git checkout 82de081 -- …`, the run, then `git checkout HEAD -- …`; `git diff HEAD` empty and `git status` clean afterwards) — no `git stash`, no worktree, and nothing but those three files differs between the starting commit and this change.

## Known Stubs

None.

## Threat Flags

None (no new network, auth, file-access or schema surface; no database, push or production step).

## Still to do

1. Done — the founder confirmed the reading on 2026-10-02 ("Yes, 8'0 1/8\" is right — push it") and the branch `claude/eloquent-maxwell-mbfx5m` was pushed on their go, with `main` (part 2 of the catalogue corrections, quick 261001-www) merged into it afterwards so the merge is clean; the unit suite was re-run on the merged tree.
2. Merge the branch into `main`; Vercel deploys from `main`. No migration and no reseed — nothing stored changes.
3. On the Mac: `npm run test:e2e` for the five reference pictures, the real WebKit iPhone run and the three tests that cannot pass in the cloud container.

## Self-Check: PASSED

- Files present: `lib/geometry/units.ts` (contains `const zeroInches = remainderInches > 0 && remainderInches < 1`), `lib/geometry/units.test.ts` (contains `8'0 1/8"`), `lib/geometry/blank-reasons.test.ts` (contains `6'0 1/16"`).
- Commit present: `ec6d842`.
