---
phase: 16-3d-board-and-cnc-export
plan: 13
subsystem: go-live
tags: [go-live, 3d, cnc-export, litres, production]
requires: [16-01, 16-02, 16-03, 16-04, 16-05, 16-06, 16-07, 16-08, 16-09, 16-10, 16-11, 16-12, 16-14, 16-15, 16-16, 16-17, 16-18]
provides: [the 3D screen and Export 3D Files live on www.shaperassistant.com]
affects: []
tech-stack: [git worktree, Vercel, Playwright]
key-files:
  created: [.planning/phases/16-3d-board-and-cnc-export/pictures/16-13-pictures-source.tar.gz]
  modified: []
key-decisions:
  - "The founder went live without the Shape3D test: R8's acceptance test is still open, and the Export button's caption says the export is experimental"
  - "The push waited for a clean gate even after the founder's go, and that held back 9 failures for a check first"
patterns-established: []
requirements-completed: [R7, R9, R11, R12]
duration: "2026-11-06, one evening once the gate started"
completed: 2026-11-06
---

# Plan 16-13: Go-live 2 (live and confirmed by the founder)

## The gate

Full gate at 02baad2d (2026-11-06): build, production-build specs, unit tests, types and lint all exit 0; the
desktop baseline's six pictures exit 0; the browser suite on three devices 1598 passed, 15 failed, 1171 skipped in
2.9 hours. The 15 failed were navigation or tap timeouts on a machine under load, and all 15 passed when their spec
files ran alone.

Re-check at c29fb1c5, the tip with the blend captions and the half-degree reading: build, production-build specs,
9667 unit tests, types, lint, the 15 failures' spec files, three-d-bay, phone-rails and the six baseline pictures
all passed. rails-advanced test 2 failed on all three devices because it read the Advanced menu's rows and did not
know the new caption; the test was fixed in 2924279e. In the re-run after that fix, test 10 failed once on the
computer, with its error not captured, then passed three times in a row alone. The full suite was not repeated on
the final code.

Sizes: the three chunk is 572,942 bytes raw and 142,537 gzipped and is in no route's first load; every other route
grew by about 9 KB uncompressed against origin/main. The database diff and the scratch-script check both printed
nothing.

Final gate at 022963df (2026-11-06), the tip with the theme-coloured room, the three-step Room icon, the logos and the
room filling the viewer: build, production-build specs, 9673 unit tests, types and lint all exit 0; the desktop
baseline's pictures exit 0; the browser suite on three devices 1620 passed, 9 failed, 1179 skipped in 2.5 hours. Of
the 9, 3 were one test on all three devices: board-lock-screens x-3d clicked each corner icon once and expected it to
flip, and the Room icon now has three steps. The test was out of date and was fixed in 6755d9ab; nothing in the app
changed. The other 6 were navigation timeouts on a loaded machine (legal-pages, new-board twice, old-safari-buttons,
phone-screen-tiles, contact). All six spec files were re-run on all three devices at 6755d9ab: 165 passed, 50 skipped,
and all 9 passed. One different test failed in that re-run, the iPhone's Fish tile test, the same kind of timeout
opening a preset while the sketch session loaded the machine; it and its Longboard twin then passed 10 of 10 alone.
Types and lint exit 0 at 6755d9ab. Since 022963df only that test and these notes changed. Every route's first-load
size is about 9 KB over origin/main, as before; origin/main had not moved; the database diff and the scratch-script
check printed nothing.

## The founder's reports (2026-11-06, run in his own terminal)

The temporary env file was confirmed gone after both runs. Both reports reconcile: on every board the surface report
lists, the whole move equals `this plan` plus the rail-character move, within the 0.0001 of rounding.

### Rail-character report, quoted whole

```
saved boards: 30 (v1 5, v2 0, v3 1, v4 0, v5 24); open: 30 of 30
Phase 11 boards with a blank: 0; five station thicknesses kept: 0 of 0
carried boards that no longer fit where they sit: 0 of 0
rail-character report: 30 saved boards; 30 open; 20 whose tail or nose rail differs from the centre's
5d6c6901-1a2f-4277-b684-939a95c25c51: tail Hard Edge · blends from 18" (default) · ends at 31 1/2" (default); nose Symmetrical — 45.13 → 44.98 L (-0.1523)
0019735e-4bc6-4f0e-877e-ead425d65d46: tail Hard Edge · blends from 18" (default) · ends at 30" (default); nose Symmetrical — 41.80 → 41.68 L (-0.1214)
aa3df7f0-7e98-4c5d-bb2a-451b144582be: tail Family, Single Tuck · blends from 18" (default) · ends at 31 1/2" (default); nose Family, Symmetrical — 39.24 → 39.13 L (-0.1111)
feae3e49-461f-4724-93ff-74bf35e664c6: tail Hard Edge, Family · blends from 18" (default) · ends at 36 1/2" (default); nose Family, Symmetrical — 81.79 → 81.68 L (-0.1077)
b386e673-c3b5-4e7c-a6a8-b95ed12afc9f: tail Hard Edge · blends from 18" (default) · ends at 29 1/2" (default); nose Family, Symmetrical — 32.31 → 32.21 L (-0.0946)
e42cc5dd-a904-4c2f-b0be-9c8926350e91: tail Family · blends from 18" (default) · ends at 37" (default); nose same as the centre — 83.11 → 83.17 L (+0.0606)
3382f88d-b8af-4869-8d3b-12eab1523b55: tail Hard Edge, Family · blends from 18" (default) · ends at 29 1/2" (default); nose Family, Symmetrical — 25.84 → 25.78 L (-0.0576)
85debe86-c796-4083-bf05-7125094a4a76: tail Family · blends from 18" (default) · ends at 37" (default); nose same as the centre — 80.29 → 80.34 L (+0.0556)
c9916d71-9b49-443d-a1bd-20c139c89dd6: tail Hard Edge, Family · blends from 18" (default) · ends at 35 1/2" (default); nose same as the centre — 66.25 → 66.27 L (+0.0239)
175c4292-57cc-4418-8aa6-8524c0cd42d6: tail Hard Edge · blends from 18" (default) · ends at 34" (default); nose Family — 58.19 → 58.20 L (+0.0070)
32925902-9c74-4de7-a1ff-0c5aa700193e: tail Hard Edge · blends from 18" (default) · ends at 29" (default); nose Family — 31.32 → 31.31 L (-0.0070)
4851cd17-45ae-4632-ba3f-848b756f8b04: tail Hard Edge, Family · blends from 18" (default) · ends at 30 1/2" (default); nose same as the centre — 42.16 → 42.17 L (+0.0027)
2336bc31-572b-4394-9e86-1d718649d070: tail Hard Edge · blends from 18" (default) · ends at 29" (default); nose Family — 38.99 → 38.99 L (-0.0022)
0c3cd028-cf9c-40bc-a007-ec72803328be: tail Hard Edge · blends from 18" (default) · ends at 30" (default); nose Family — 30.55 → 30.55 L (+0.0022)
9bb48fc0-8454-4d44-9bc1-eff1809079a3: tail Hard Edge · blends from 18" (default) · ends at 31" (default); nose Family — 35.06 → 35.06 L (+0.0022)
d0a684c0-24e3-4a52-a4da-d162d68f0da8: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 29.90 → 29.90 L (+0.0021)
f8448dbf-8c4b-4d95-99d1-764569c30377: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 37.63 → 37.63 L (-0.0020)
48f9646e-5a2d-403f-b375-9480e25ebd60: tail Hard Edge · blends from 18" (default) · ends at 30 1/2" (default); nose Family — 34.20 → 34.20 L (+0.0014)
c590cb3c-7a40-4942-9429-a361771e075a: tail Hard Edge · blends from 18" (default) · ends at 31 1/2" (default); nose Family — 43.50 → 43.50 L (+0.0010)
04504a44-d8f1-4d96-8deb-b292729e1f09: tail Hard Edge · blends from 18" (default) · ends at 31 1/2" (default); nose Family — 43.50 → 43.50 L (+0.0010)
largest move: 5d6c6901-1a2f-4277-b684-939a95c25c51, -0.1523 L
each line is the whole rail's fade alone: what the site reads today → with that fade and nothing else; --surface-report gives what every board will read at go-live 2
```

Read back: this is the whole rail's fade alone, what the site reads today against that fade and nothing else. These
are not the figures the boards will read at go-live 2. The fade reaches 20 of the 30 saved boards, and the 10 it
leaves out have no share of this move. The largest is -0.1523 L, on a 45.13 L diamond tail with a Hard Edge tail and
a Symmetrical nose. 11 of the 20 move less than 0.01 L.

### Surface report, quoted whole

```
saved boards: 30 (v1 5, v2 0, v3 1, v4 0, v5 24); open: 30 of 30
Phase 11 boards with a blank: 0; five station thicknesses kept: 0 of 0
carried boards that no longer fit where they sit: 0 of 0
surface report: 30 saved boards; 30 open; 30 whose litres move
32925902-9c74-4de7-a1ff-0c5aa700193e: no wings · swallow tail — 31.32 → 31.47 L (+0.1493, this plan +0.1563)
0019735e-4bc6-4f0e-877e-ead425d65d46: no wings · swallow tail — 41.80 → 41.69 L (-0.1131, this plan +0.0083)
feae3e49-461f-4724-93ff-74bf35e664c6: no wings · round tail — 81.79 → 81.68 L (-0.1115, this plan -0.0038)
5d6c6901-1a2f-4277-b684-939a95c25c51: no wings · diamond tail — 45.13 → 45.24 L (+0.1043, this plan +0.2565)
aa3df7f0-7e98-4c5d-bb2a-451b144582be: no wings · pin tail — 39.24 → 39.15 L (-0.0959, this plan +0.0152)
e42cc5dd-a904-4c2f-b0be-9c8926350e91: no wings · squash tail — 83.11 → 83.16 L (+0.0545, this plan -0.0061)
85debe86-c796-4083-bf05-7125094a4a76: no wings · squash tail — 80.29 → 80.34 L (+0.0498, this plan -0.0058)
3382f88d-b8af-4869-8d3b-12eab1523b55: 1 wing · swallow tail — 25.84 → 25.87 L (+0.0254, this plan +0.0829)
c9916d71-9b49-443d-a1bd-20c139c89dd6: no wings · pin tail — 66.25 → 66.27 L (+0.0245, this plan +0.0006)
175c4292-57cc-4418-8aa6-8524c0cd42d6: no wings · pin tail — 58.19 → 58.22 L (+0.0239, this plan +0.0169)
c590cb3c-7a40-4942-9429-a361771e075a: no wings · round tail — 43.50 → 43.52 L (+0.0146, this plan +0.0135)
04504a44-d8f1-4d96-8deb-b292729e1f09: no wings · round tail — 43.50 → 43.52 L (+0.0146, this plan +0.0135)
4851cd17-45ae-4632-ba3f-848b756f8b04: no wings · round tail — 42.16 → 42.18 L (+0.0139, this plan +0.0112)
47747951-7807-452e-b605-060fc28c998e: no wings · squash tail — 82.01 → 82.00 L (-0.0101, this plan -0.0101)
ceeb8d98-7ce1-437f-a810-f5c9f3070521: no wings · squash tail — 41.70 → 41.69 L (-0.0060, this plan -0.0060)
eb03016a-1d60-4f95-8e2a-1d912750005c: no wings · squash tail — 62.86 → 62.86 L (-0.0059, this plan -0.0059)
37e82b96-39d6-4f86-9bba-1c9a6acb6dfe: no wings · pin tail — 47.86 → 47.86 L (+0.0055, this plan +0.0055)
2336bc31-572b-4394-9e86-1d718649d070: no wings · swallow tail — 38.99 → 38.99 L (-0.0049, this plan -0.0027)
d0a684c0-24e3-4a52-a4da-d162d68f0da8: no wings · round tail — 29.90 → 29.90 L (+0.0047, this plan +0.0026)
0c3cd028-cf9c-40bc-a007-ec72803328be: no wings · squash tail — 30.55 → 30.55 L (-0.0025, this plan -0.0047)
b386e673-c3b5-4e7c-a6a8-b95ed12afc9f: no wings · diamond tail — 32.31 → 32.30 L (-0.0021, this plan +0.0925)
b7f442ab-b12b-4938-a6c3-f8288f1f3478: no wings · round tail — 52.99 → 52.98 L (-0.0016, this plan -0.0016)
48f9646e-5a2d-403f-b375-9480e25ebd60: no wings · pin tail — 34.20 → 34.20 L (+0.0015, this plan +0.0001)
8e93db88-0f8d-40b3-a9ee-ddfae1867864: no wings · round tail — 39.99 → 39.99 L (-0.0013, this plan -0.0013)
7719b4ff-d4cb-405b-9417-e4f826ea4a3c: no wings · squash tail — 28.98 → 28.98 L (-0.0010, this plan -0.0010)
f8448dbf-8c4b-4d95-99d1-764569c30377: 1 wing · swallow tail — 37.63 → 37.63 L (-0.0008, this plan +0.0012)
bae9ce3c-aa7d-44df-85c7-05219a1ee034: no wings · swallow tail — 30.61 → 30.61 L (-0.0008, this plan -0.0008)
9bb48fc0-8454-4d44-9bc1-eff1809079a3: no wings · squash tail — 35.06 → 35.06 L (+0.0005, this plan -0.0017)
1f9c3fba-f3e3-4f42-8a14-71234726e552: no wings · squash tail — 30.56 → 30.56 L (-0.0004, this plan -0.0004)
3c16edc3-c303-49a9-94a4-955ea1227092: no wings · squash tail — 30.56 → 30.56 L (-0.0004, this plan -0.0004)
largest move: 32925902-9c74-4de7-a1ff-0c5aa700193e, +0.1493 L
```

Read back: this is each board's whole move at go-live 2, from what the site reads today to what it will read. All 30
saved boards move, as expected, because the tail's roll reaches every board. 2 of them have a wing. The largest whole
move is +0.1493 L, on a 31.32 L swallow tail with no wings. The largest fall is -0.1131 L, on a 41.80 L swallow tail.
16 of the 30 move less than 0.01 L. The largest share as a fraction of a board is that same swallow, under half a
percent.

## Device checks

The founder, 2026-11-06: "iphone and pad checks were good." That was before the theme-coloured room, the Room icon's
three steps and the room filling the viewer, which have been tested in the test browsers only. The Mac Safari trackpad
pinch was not reported. Both go live unchecked by hand.

## The founder's go

"push all", 2026-11-06, about 19:20, while the final gate ran. He was told the push would wait for a clean gate and
was told what goes live unconfirmed, and did not object.

Shape3D: not tested. The founder, 2026-11-06: "shape3d I'll have to come back to." He goes live without the test, as
offered. The Export button carries the caption that the export is experimental and Shape3D may or may not import the
files yet, so nobody is promised it works.

## The push

Pushed 2026-11-06 22:14:49: main 43bd948a to 1c6dc5ef, a no-fast-forward merge of 47c10337, whose tree is the branch's
exactly. origin/main^2 is 47c10337. main alone was pushed. Vercel reported success, and /design/3d went from 404 to 200
at 22:16:07.

## Live checks

On https://www.shaperassistant.com, signed out, a real browser at computer and phone sizes, nothing saved: the Shortboard
opened, its 3D screen reached ready with the logos loaded, the Room icon walked theme room, blue room, no room and back,
Export 3D Files downloaded a 5.25 MB zip, VOLUME read 29.61 L, and there were no page errors. Pictures: 
`pictures/16-13-live-computer.png` and `pictures/16-13-live-phone.png`.

## The founder's confirmation

"iphone and ipad checks good, close out phase 16", 2026-11-06, after the live checks. That covers the room as shipped on
his real iPhone and iPad.

## Left open

- R8: the Shape3D acceptance test has not been run. The founder chose to ship without it and will come back to it. Plan
  16-13's own rule allows this: the push waits for the test or for his explicit decision to ship. R8 is therefore not in
  `requirements-completed` here.
- The Mac Safari trackpad pinch and one of his own saved boards on the live 3D screen both passed by his hand, reported
  after the close: "only the shape3D is still open.  the other 2 passed."
