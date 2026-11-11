---
phase: 17-bottom-contours
plan: 16
subsystem: go-live
status: complete
tags: [bottom, contours, go-live, gate, production]
requires:
  - 17-01..17-15 (every plan of the phase, merged)
  - the code review's fixes and the founder's rulings D-43, D-44 and D-45
provides:
  - BOTTOM live on https://www.shaperassistant.com as main ff5818c0
affects: []
tech-stack:
  added: []
key-files:
  created:
    - .planning/phases/17-bottom-contours/pictures/before-*.png, after-*.png, 17-16-angle-*.png, 17-16-pictures-source.tar.gz
completed: 2026-11-10
---

# 17-16 — BOTTOM goes live

BOTTOM is on the live site. Pushed 2026-11-10 at 7:25 pm on the founder's "Go"; the live site answered with the new page at 7:26 pm.

- **What was checked:** the branch tip `25fa9fed` (code), then `3882780b` (the same code plus the pictures).
- **What is live:** main `ff5818c0`, a merge of `3882780b` onto `79294d56`. The merge's files are identical to the checked tip.
- **No database change, no new package.** Nothing was migrated.

## The gate at 25fa9fed

| Check | Result |
|---|---|
| Route types, TypeScript, lint | pass (lint's one known warning, `lib/db/import-designs-action.test.ts:42`) |
| Unit tests | 209 files, 12,115 passed, 2 skipped |
| Production build and the production-build browser tests | pass |
| Desktop baseline pictures under Turbopack | pass — nothing moved for a mouse |
| Full browser suite (webpack, one worker, 3.2 h) | 1,818 passed, 1,365 skipped, 9 failed |

The nine failures, each re-run alone:

- Seven passed at the first re-run alone: `new-board:122`, `site-footer:61`, `three-d-bay:260`, `three-d-bay:299` (Android), `summary-planing:754` (desktop), `phone-screen-tiles:100` and `:450` (iPhone). The machine was three hours into the run.
- `summary-blank:197` (iPhone) timed out again in a batch, then passed alone under both webpack and Turbopack.
- `phone-sideways-top-bar:327` (iPhone) is a flaky stopwatch. All eight design pages, BOTTOM included, show the thin bar every time. The test sometimes runs out of its 15 seconds loading the home page straight after 3D, on the webpack test server only: alone it failed twice, then passed twice in a row; under Turbopack it passes. **Follow-up:** give that page load a longer allowance.

## The founder's steps

- **The channels' Angle and the deep-channel warning:** "Angle and warning approved." (D-44, D-45).
- **The Channels GUIDE card** reworded on his word to name the three ways to lay them (`25fa9fed`).
- **His devices and a signed-in save:** his main folder was pointed at the tip and his preview run on port 3005 over Wi-Fi with his real sign-in. He answered the go-live card "Go", whose words were: "My devices look right and a saved board came back with its cut."
- **D-34, D-35, D-39:** no new answer was given at the gate; they shipped as written in `17-CONTEXT.md`.
- **Production's saved boards**, run by him in his own terminal from the main folder at the tip. The pulled settings file was confirmed gone afterwards.

```
saved boards: 31 (v1 5, v2 0, v3 1, v4 0, v5 25); open: 31 of 31
Phase 11 boards with a blank: 0; five station thicknesses kept: 0 of 0
carried boards that no longer fit where they sit: 0 of 0
bottom report: 31 saved boards; 31 open; 0 with a cut; 0 whose litres differ from today's
37e82b96-39d6-4f86-9bba-1c9a6acb6dfe: opens · no cut — 47.86 L (same as today)
bae9ce3c-aa7d-44df-85c7-05219a1ee034: opens · no cut — 30.61 L (same as today)
1f9c3fba-f3e3-4f42-8a14-71234726e552: opens · no cut — 30.56 L (same as today)
3c16edc3-c303-49a9-94a4-955ea1227092: opens · no cut — 30.56 L (same as today)
eb03016a-1d60-4f95-8e2a-1d912750005c: opens · no cut — 62.86 L (same as today)
0c3cd028-cf9c-40bc-a007-ec72803328be: opens · no cut — 30.99 L (same as today)
2336bc31-572b-4394-9e86-1d718649d070: opens · no cut — 38.99 L (same as today)
3382f88d-b8af-4869-8d3b-12eab1523b55: opens · no cut — 25.87 L (same as today)
0019735e-4bc6-4f0e-877e-ead425d65d46: opens · no cut — 41.69 L (same as today)
aa3df7f0-7e98-4c5d-bb2a-451b144582be: opens · no cut — 39.15 L (same as today)
4851cd17-45ae-4632-ba3f-848b756f8b04: opens · no cut — 42.18 L (same as today)
c590cb3c-7a40-4942-9429-a361771e075a: opens · no cut — 43.52 L (same as today)
f8448dbf-8c4b-4d95-99d1-764569c30377: opens · no cut — 37.47 L (same as today)
d11f7346-62ab-4333-a92a-2e45c771e556: opens · no cut — 39.21 L (same as today)
47747951-7807-452e-b605-060fc28c998e: opens · no cut — 82.00 L (same as today)
b7f442ab-b12b-4938-a6c3-f8288f1f3478: opens · no cut — 52.98 L (same as today)
175c4292-57cc-4418-8aa6-8524c0cd42d6: opens · no cut — 58.22 L (same as today)
e42cc5dd-a904-4c2f-b0be-9c8926350e91: opens · no cut — 83.16 L (same as today)
9bb48fc0-8454-4d44-9bc1-eff1809079a3: opens · no cut — 35.06 L (same as today)
ceeb8d98-7ce1-437f-a810-f5c9f3070521: opens · no cut — 41.69 L (same as today)
48f9646e-5a2d-403f-b375-9480e25ebd60: opens · no cut — 34.20 L (same as today)
feae3e49-461f-4724-93ff-74bf35e664c6: opens · no cut — 81.68 L (same as today)
04504a44-d8f1-4d96-8deb-b292729e1f09: opens · no cut — 43.52 L (same as today)
d0a684c0-24e3-4a52-a4da-d162d68f0da8: opens · no cut — 29.90 L (same as today)
8e93db88-0f8d-40b3-a9ee-ddfae1867864: opens · no cut — 39.99 L (same as today)
c9916d71-9b49-443d-a1bd-20c139c89dd6: opens · no cut — 66.27 L (same as today)
32925902-9c74-4de7-a1ff-0c5aa700193e: opens · no cut — 31.47 L (same as today)
b386e673-c3b5-4e7c-a6a8-b95ed12afc9f: opens · no cut — 32.30 L (same as today)
85debe86-c796-4083-bf05-7125094a4a76: opens · no cut — 80.34 L (same as today)
5d6c6901-1a2f-4277-b684-939a95c25c51: opens · no cut — 45.24 L (same as today)
7719b4ff-d4cb-405b-9417-e4f826ea4a3c: opens · no cut — 28.98 L (same as today)
every saved board opens flat, with the litres it reads today: yes
```

In plain English: 31 saved boards, every one opens, none has a cut in its bottom, and every litres figure is the one it read before BOTTOM existed.

## The live check

`/design/bottom` answered 404 before the push and 200 at 7:26 pm. The top row lists eight screens, BOTTOM between ROCKER and RAILS; the page carries its GUIDE tab; the home page, RAILS, FINS, SUMMARY, 3D and Privacy all answer.

## Still open (none blocks the live site)

- The phase's verification, the founder's walk-through (UAT) and closing the phase in the roadmap.
- A clearer sentence for the deep-channel warning (D-45; the review's IN-02), words to the founder first; IN-01 and IN-03.
- A pictured GUIDE card for each way of laying channels; BOTTOM's GUIDE adopting Phase 18's shared card.
- `phone-sideways-top-bar:327`'s allowance for the home page under webpack.
- From the founder's looks: the Angle's Reset can sit under the floating Undo/Redo pair on a phone until scrolled; "set by hand" wraps to two lines on a computer; eight channels reach the inch floor almost at once; whether a NOSE/CENTER/TAIL tap should scroll its section to the top; the 177-dot controls box on the shortest upright iPhone and the sideways page at 360 dots; FINS' two 42-dot buttons; one slow slider drag as one Undo step; his iPhone print of the new page.
- `17-UI-SPEC.md` still shows the old Run option words; CLAUDE.md does not yet describe BOTTOM's GUIDE beside the other five.
