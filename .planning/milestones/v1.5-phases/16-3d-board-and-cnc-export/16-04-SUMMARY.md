---
phase: 16-3d-board-and-cnc-export
plan: 04
subsystem: go-live
tags: [go-live, hard-edge, litres, production]
requires: [16-01, 16-02, 16-03]
provides: [the fade and the two RAILS sliders live on www.shaperassistant.com]
affects: [16-13]
tech-stack: [git worktree, Vercel, Playwright]
key-files:
  created: [.planning/phases/16-3d-board-and-cnc-export/pictures/go-live-1/live-rails.png, .planning/phases/16-3d-board-and-cnc-export/pictures/go-live-1/live-volume.png, .planning/phases/16-3d-board-and-cnc-export/pictures/go-live-1/live-check-source.tar.gz]
  modified: []
key-decisions:
  - "D-29 (recorded here as Task 1): two go-lives — the founder at plan approval, 2026-11-04"
  - "LITRES_TIP moved from 16-02's merge (b56d24d4) to 16-03's (6ff19b31) because the founder's D-31 — the litres counting exactly the foam the 3D board draws — was carried out in 16-03; the surface files are pure maths no route imports"
patterns-established:
  - "A go-live gate copy must not share node_modules with a checkout that will run npm install mid-wave"
requirements-completed: [R9, R11, R12]
duration: "the evening of 2026-11-04 (go-live 1 pushed 15:28 local)"
completed: 2026-11-04
---

# Plan 16-04: Go-live 1 — the fade and the two RAILS sliders on the live site

**The tail's hard edge now blends into the rail where the shaper sets it, on www.shaperassistant.com, and the litres
count the foam the board really holds.** Nothing is stored differently in the database; nothing on screen announces it.

## What changes for the founder

- On RAILS, with the tail's Hard Edge ticked, the Advanced menu has two new rows above Reset: Hard Edge Blends From
  (18" unless moved) and Hard Edge Ends At (where the rail has fully blended into the centre's tuck; unless moved,
  a third of the board's length less 18 inches short of the centre — 30" on a six-footer, 36" on a nine-footer).
  Both are saved with the board and come back with Reset Advanced Settings.
- The litres follow. On the live site the Fish reads 34.65 L (as before Phase 16 at two decimals), the Shortboard
  29.61 L, the Mid-length 49.40 L, the Longboard 72.35 L.
- Underneath, the litres and the coming 3D board read one set of cross-sections (16-01, 16-03), so the 3D board and
  the litres quoted beside it can never disagree. The 3D screen itself is not in this go-live; it follows in go-live 2.

## Task 1 — one go-live or two

The founder chose **two** at plan approval (D-29, 2026-11-04). Tasks 2 and 3 ran.

## Task 2 — the gate, the pictures and the founder's read-only report

**LITRES_TIP = 6ff19b31** (16-03's merge commit; the line in 16-02-SUMMARY.md says why it moved from 16-02's).

Diff checks against origin/main (a7f6600b): nothing in `drizzle/`, `lib/db/schema.ts` or `package.json`; under `app/`
and `components/` only the RAILS and store files (`design-store.tsx` and its test, `rail-band-editor.tsx`,
`rail-controls.tsx`); no route imports `board-surface`. 28 code files in all.

The gate on a `git archive 6ff19b31` copy (webpack dev server, port 3250) and on the main checkout:

| Check | Result |
|---|---|
| `npm test` | green (6,893 passed; the heavy sweeps that timed out under load passed alone) |
| `npx tsc --noEmit`, `npm run lint` | clean |
| `npm run build` | compiled |
| `npm run test:e2e:prod` | 18 passed |
| full browser suite | 1,077 passed, 58 failed in the first run (35 of them a worker crash the orchestrator caused by `npm install` on the shared node_modules); re-run alone twice under load 100–345, then once on a quiet machine: 11 of the last 12 passed; the one left, the first case of `board-lock-screens.spec.ts`'s locked-board walk, fails identically on a copy of the pre-phase code (a cold-server race, not the change). Every spec touching RAILS, VOLUME or the store passed on the first re-run. |

The founder saw `pictures/16-01-volume-before-after.png` and `pictures/16-02-rails-hard-edge-ends-at.png` again and
ran the read-only report in his own terminal. Its output, quoted:

```
saved boards: 30 (v1 5, v2 0, v3 1, v4 0, v5 24); open: 30 of 30
hard-edge report: 30 saved boards; 30 open; 27 with a hard-edged tail
feae3e49-461f-4724-93ff-74bf35e664c6: blends from 18" (default) · ends at 36 1/2" (default) — 81.91 → 81.79 L (-0.1179)
c9916d71-9b49-443d-a1bd-20c139c89dd6: blends from 18" (default) · ends at 35 1/2" (default) — 66.30 → 66.25 L (-0.0489)
47747951-7807-452e-b605-060fc28c998e: blends from 18" (default) · ends at 36 1/2" (default) — 82.05 → 82.01 L (-0.0387)
37e82b96-39d6-4f86-9bba-1c9a6acb6dfe: blends from 18" (default) · ends at 38" (default) — 47.89 → 47.86 L (-0.0320)
175c4292-57cc-4418-8aa6-8524c0cd42d6: blends from 18" (default) · ends at 34" (default) — 58.22 → 58.19 L (-0.0239)
eb03016a-1d60-4f95-8e2a-1d912750005c: blends from 18" (default) · ends at 36" (default) — 62.88 → 62.86 L (-0.0237)
b7f442ab-b12b-4938-a6c3-f8288f1f3478: blends from 18" (default) · ends at 32" (default) — 53.00 → 52.99 L (-0.0144)
c590cb3c-7a40-4942-9429-a361771e075a: blends from 18" (default) · ends at 31 1/2" (default) — 43.51 → 43.50 L (-0.0094)
04504a44-d8f1-4d96-8deb-b292729e1f09: blends from 18" (default) · ends at 31 1/2" (default) — 43.51 → 43.50 L (-0.0094)
5d6c6901-1a2f-4277-b684-939a95c25c51: blends from 18" (default) · ends at 31 1/2" (default) — 45.14 → 45.13 L (-0.0078)
9bb48fc0-8454-4d44-9bc1-eff1809079a3: blends from 18" (default) · ends at 31" (default) — 35.07 → 35.06 L (-0.0070)
8e93db88-0f8d-40b3-a9ee-ddfae1867864: blends from 18" (default) · ends at 31" (default) — 40.00 → 39.99 L (-0.0064)
4851cd17-45ae-4632-ba3f-848b756f8b04: blends from 18" (default) · ends at 30 1/2" (default) — 42.17 → 42.16 L (-0.0058)
48f9646e-5a2d-403f-b375-9480e25ebd60: blends from 18" (default) · ends at 30 1/2" (default) — 34.20 → 34.20 L (-0.0047)
d0a684c0-24e3-4a52-a4da-d162d68f0da8: blends from 18" (default) · ends at 30 1/2" (default) — 29.90 → 29.90 L (-0.0035)
ceeb8d98-7ce1-437f-a810-f5c9f3070521: blends from 18" (default) · ends at 30 1/2" (default) — 41.70 → 41.70 L (-0.0032)
b386e673-c3b5-4e7c-a6a8-b95ed12afc9f: blends from 18" (default) · ends at 29 1/2" (default) — 32.31 → 32.31 L (-0.0031)
1f9c3fba-f3e3-4f42-8a14-71234726e552: blends from 18" (default) · ends at 30 1/2" (default) — 30.56 → 30.56 L (-0.0029)
3c16edc3-c303-49a9-94a4-955ea1227092: blends from 18" (default) · ends at 30 1/2" (default) — 30.56 → 30.56 L (-0.0029)
7719b4ff-d4cb-405b-9417-e4f826ea4a3c: blends from 18" (default) · ends at 30 1/2" (default) — 28.98 → 28.98 L (-0.0027)
f8448dbf-8c4b-4d95-99d1-764569c30377: blends from 18" (default) · ends at 30 1/2" (default) — 37.63 → 37.63 L (-0.0023)
0019735e-4bc6-4f0e-877e-ead425d65d46: blends from 18" (default) · ends at 30" (default) — 41.80 → 41.80 L (-0.0021)
bae9ce3c-aa7d-44df-85c7-05219a1ee034: blends from 18" (default) · ends at 29" (default) — 30.62 → 30.61 L (-0.0020)
0c3cd028-cf9c-40bc-a007-ec72803328be: blends from 18" (default) · ends at 30" (default) — 30.55 → 30.55 L (-0.0012)
3382f88d-b8af-4869-8d3b-12eab1523b55: blends from 18" (default) · ends at 29 1/2" (default) — 25.84 → 25.84 L (-0.0004)
32925902-9c74-4de7-a1ff-0c5aa700193e: blends from 18" (default) · ends at 29" (default) — 31.32 → 31.32 L (-0.0002)
2336bc31-572b-4394-9e86-1d718649d070: blends from 18" (default) · ends at 29" (default) — 38.99 → 38.99 L (+0.0002)
largest move: feae3e49-461f-4724-93ff-74bf35e664c6, -0.1179 L
```

Read back: 30 boards, all 30 open; 27 hard-edged; every one on the defaults; the largest move −0.12 L on an 81.9 L
board, 24 of 27 under 0.05 L, 13 under 0.01 L. The founder's "Go" came on the card at 15:27 local, 2026-11-04
(after the gate's quiet re-run and the pre-phase A/B on the one stubborn case).

While reading the report the founder also asked for the sharp bottom tuck to fade like the hard edge and for the
centre-to-nose rail to blend smoothly on its own — D-32, carried as plan 16-15 after this go-live (its brief is in
`16-15-BRIEF.md`).

## Task 3 — the push and the live check

- A temporary worktree of `main` (`main` == `origin/main` == a7f6600b), `merge-tree` clean, then
  `git merge --no-ff -F <message> 6ff19b31` → **43bd948a** "The tail's hard edge now blends into the rail where the
  shaper sets it, and the litres count the foam the board really holds"; pushed in its own call;
  `git rev-parse origin/main^2` == 6ff19b31. No other branch or tag pushed.
- Vercel: the commit's status reached `success` at 15:28:41 local.
- The live check (`pictures/go-live-1/live-check-source.tar.gz`, real Chromium at 1440 × 900 against
  https://www.shaperassistant.com): the Fish opened from the setup screen; VOLUME read **34.65 L** (the regenerated
  record 34.6514 at the card's rounding); RAILS' tail Advanced menu read **Hard Edge Blends From — 18"** and
  **Hard Edge Ends At — 29 1/2"** (the Fish's own length rule). Pictures: `pictures/go-live-1/live-volume.png`,
  `pictures/go-live-1/live-rails.png`.

## Deviations from Plan

- The gate copy shared the main checkout's `node_modules` by symlink; the orchestrator's `npm install` for 16-06
  (three) rewrote it under the copy's running dev server and crashed the last 35 desktop tests of the first full run.
  Those were re-run alone; nothing in the change was involved. Rule recorded for later gate copies.
- The quiet re-run was delayed by the Wave 3–4 executors' own suites (load 100–345); the "go" waited for it.

## Self-Check: PASSED

- `git rev-parse origin/main^2` == 6ff19b31 ✓; the live VOLUME figure equals the record at two decimals ✓; the RAILS
  rows read as expected ✓; no other branch or tag pushed ✓; the report's every board opened ✓.
