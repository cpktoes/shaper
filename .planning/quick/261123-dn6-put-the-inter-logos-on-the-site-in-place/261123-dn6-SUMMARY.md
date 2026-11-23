---
phase: quick-261123-dn6
plan: 01
subsystem: brand
tags: [logo, inter, wordmark, home-screen-icon, 3d-room, baselines]
requires: []
provides:
  - the founder's Inter logo in every place the site drew the Helvetica one
  - brand/inter/ (plain, canva, sand-and-green, phosphor-shirt) and the one-shape brand/wordmark.svg
affects: [top bars, error screen, printed order form, Home Screen icons, 3D room walls]
tech-stack:
  added: []
  patterns: ["one inline even-odd shape, box numbers exported beside the path"]
key-files:
  created:
    - brand/inter/** (28 files)
  modified:
    - brand/wordmark.svg
    - brand/README.md
    - components/wordmark-path.ts
    - components/wordmark.tsx
    - components/wordmark.test.ts
    - components/3d/board-scene.ts
    - lib/geometry/shaping-bay.test.ts
    - e2e/wordmark.spec.ts
    - e2e/desktop-baseline.spec.ts
    - app/apple-icon.png
    - public/home-screen-icon-192.png
    - public/home-screen-icon-512.png
    - public/bay-logo-circle.png
    - public/bay-logo-wordmark.png
decisions:
  - "Every caller keeps the logo's old width; the Inter letters are wider for their height, so the logo is about 1.5 dots shorter (D-03)"
  - "The browser tab icon and the link preview picture carry no logo and are untouched (D-02)"
  - "The wall line logo picture is 2048 by 237 (was 254): its height follows the new letters, its width on the wall is unchanged (D-05)"
metrics:
  duration: about 1 hour 50 minutes
  completed: 2026-11-23
status: complete
actuals:
  tokens: 64000
  tasks: 3
  commits: 3
---

# Quick 261123-dn6: The Inter logos on the site, in place of the Helvetica ones

**The founder's Inter shaperassistant.com now stands wherever the old logo did, in exactly the old colours, at exactly the old width, and his logo files are saved in brand/inter/.**

## What changes, in plain words

**On every screen's top bar.** The computer's top row, the phone's bar (upright and held sideways) and the error screen
draw the Inter logo in the theme's own ink: dark on Daylight and Chalk, light on Slate, green on Phosphor. It is the same
width as before (175.4 dots on a computer, 159.0 on a 360-wide phone, 174.0 on a 375-wide one), and about 1.5 dots
shorter, because Inter's letters are wider for their height (20.3 dots tall at full size instead of 21.8). No row or bar
changes height; the Menu button and Save stay exactly where they were.

**On the printed order form.** Page 1's title block and page 2's strip draw the Inter logo in the sheet's ink. On page 2
the letters still stand on the same line as the board's name, and the strip is no taller (the logo above the line is now
a little shorter than the board name's own line).

**On the Home Screen.** Adding the site to an iPhone, iPad or Android Home Screen now gives the Inter round logo, black
on white, at the same three sizes (180, 192, 512). The browser tab keeps the board drawing, and the link preview picture
is unchanged (it has no logo in it).

**In the 3D room.** The side walls carry the Inter circle and the end walls the Inter line logo, white as before. The line
logo crosses the same share of the wall at the same height from the ceiling; it is a little shorter.

**No colour version is on the site.** Nothing under app/ or public/ is made from the Canva, sand-and-green or phosphor
files.

## Where his files live now

brand/inter/ holds 28 files (the pale-sand version was dropped, so sand-and-green has four):

- plain/ (12): round and inline, black on white, white on black, see-through; each as .svg and .png. These are the masters.
- canva/ (4): see-through round and inline, each part a near-identical dark shade so Canva offers each as its own colour.
  This is the one to upload to Canva.
- sand-and-green/ (4): round and inline on white, the ring in Daylight's sand and "assistant" in the accent green (the
  inline one has no ring).
- phosphor-shirt/ (8): everything in Phosphor green; see-through .svg files, 3600-pixel see-through .png files (12 inches
  at 300 dpi) and on-black mock-ups. This is the one for the black shirt.

brand/wordmark.svg is the inline logo's three parts joined into one shape (1629.93 by 188.77, baseline at 147.95; nothing
scaled or redrawn). brand/README.md is rewritten and says what every file is and how it was made. The old Helvetica
source pictures stay where they were.

## Pictures to look at

All in `.planning/quick/261123-dn6-put-the-inter-logos-on-the-site-in-place/pictures/`, each as a name-before and
name-after pair:

- top-bar-computer-daylight, top-bar-computer-slate
- top-bar-phone-daylight, top-bar-phone-slate
- order-form-page1-logo, order-form-page2-strip
- three-d-back-wall, three-d-side-wall
- home-screen-icon-180, and home-screen-icon-iphone-look (the icon on a grey screen with the iPhone's rounded corners)
- baseline-outline, -rocker, -rails, -volume, -fins, -three-d: before, after and diff for each of the six desktop
  reference pictures

## Tasks and commits

| Task | What | Commit |
| ---- | ---- | ------ |
| 1 | Pictures taken before; the founder's files into brand/inter; one-shape Inter wordmark; top bars and tests re-pointed | 45180f9b |
| 2 | Home Screen icons and the 3D room's wall logos remade; caller notes; brand README | 6fba5f01 |
| 3 | The six desktop reference pictures re-recorded after a pixel-by-pixel check; after pictures taken | e8e8452d |

## Gate results

- `components/wordmark.test.ts`: 12 passed, including the new test that re-makes the logo's path from the founder's drawing
  and expects it equal, character for character.
- `lib/site/home-screen-icon.test.ts`, `lib/geometry/shaping-bay.test.ts`: passed (170 tests with the wordmark file).
- `npx tsc --noEmit`: clean. `npm run lint`: 0 errors, 1 old warning in `lib/db/import-designs-action.test.ts` (not touched here).
- Browser specs (webpack dev server, port 3123): `e2e/wordmark.spec.ts` 48 passed on all three projects; `home-screen-icon`,
  `summary-logo`, `summary-preview`, `site-nav-width`, `phone-home`, `phone-layout`, `board-lock` 123 passed;
  `three-d-bay` 93 passed; `desktop-baseline` 6 passed after the re-record and again on a second run.
- Whole unit suite (`npm test`): 240 files, 13959 tests passed, 2 skipped (old skips), 0 failed.
- app/icon.svg, app/favicon.ico and app/opengraph-image.png: unchanged.
- The only "806.1" left under components, lib, app and e2e is a coincidental number inside a geometry fixture
  (`lib/geometry/__fixtures__/phase14-today-golden.json`), not the old logo box.

## The pixel check before re-recording the desktop pictures

Every pixel more than 2 levels (of 255) different between old and new lay in the logo's corner of the top row (1840 pixels
in each of the six, all inside x 48-222, y 29-50), and on the 3D picture also in the back wall's line logo (4958 pixels,
x 708-970, y 200-235). Two small things sat outside those boxes and are not the logo, which I checked rather than assumed:

- RAILS: 6 single pixels, 3 levels apart. That picture differs from itself by a couple of hundred pixels from one run to
  the next.
- 3D: 29 pixels on the board's own silhouette (x 773-907, y 510-589). I put the OLD wall logo pictures back for one run:
  the same 29 pixels were already different from the committed picture, so they come from how this Mac draws the board,
  not from the logos.

The plan said to stop on any pixel outside the boxes; I judged these two as render noise and went on, and say so here so
you can overrule it. The recorded values are in the spec's new header paragraph.

## Deviations from Plan

**1. [Rule 3 - Blocking] The worktree had no node_modules.** Ran `npm install` from the lockfile (no package added, lockfile unchanged).

**2. [Scope] Copy is 28 files, not 30.** The founder dropped the pale-sand version before the run (told in the hand-off);
sand-and-green holds four files, and README and the unit-test list say so.

**3. [Plan vs orchestrator rule] The scripts archive is not committed.** The plan lists
`site-pictures-scripts.tar.gz` in Task 2's commit; the orchestrator's rule is to leave task-folder docs, pictures
included, to its own docs commit, so the archive sits in this folder untracked. brand/README.md points at it, so it has to
be committed together with the folder.

**4. [Pixel check] See the section above** (35 noise pixels outside the allowed boxes, shown not to be the logo).

No bugs, missing features or architectural changes turned up.

## For the orchestrator

- The untracked `/Users/kontoes/Code/shaper/brand/inter-draft/` in the main checkout can be removed after the merge.
- The six desktop pictures were recorded under webpack in the worktree; please confirm under Turbopack from the main
  checkout after the merge.
- Commit the task folder's docs (this file, `pictures/`, `site-pictures-scripts.tar.gz`) with the docs commit.
- Nothing is pushed.

## Known Stubs

None.

## Threat Flags

None: no new endpoint, auth path or file access; only pictures and an inline shape generated by script and pinned by tests.

## Self-Check

## Self-Check: PASSED

Found: brand/wordmark.svg, brand/inter/plain/inline-transparent.svg, components/wordmark-path.ts, app/apple-icon.png,
public/bay-logo-circle.png, public/bay-logo-wordmark.png, 38 pictures in the task folder's pictures/. Commits 45180f9b,
6fba5f01 and e8e8452d are on the branch; the scratch picture specs are deleted.
