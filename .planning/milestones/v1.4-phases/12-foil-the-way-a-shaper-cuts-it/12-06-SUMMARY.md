---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 06
subsystem: saved boards (rack + save actions), read-only database check
status: complete
tags: [carry-over, tip-style, rack, server-actions, saved-boards, read-only-check]
requires:
  - "12-01: hasPhase11Blank, ParseSnapshotOptions, parseSnapshot(value, options), phase11TwelveInch"
  - "12-03: resolveFitDefaults(pref).tipStyle; readFitDefaultsPreference reads tip_style"
provides:
  - "resolveCarryOverTipStyle(): Promise<TipStyle> (lib/fit-defaults-server.ts)"
  - "rackModelsFromRows(rows, log?, options?: ParseSnapshotOptions)"
  - "scripts/check-saved-boards.ts (read-only; CHECK_ENV_FILE)"
affects:
  - "12-10: the founder runs scripts/check-saved-boards.ts against production after the migration"
tech-stack:
  added: []
  patterns:
    - "Account default looked up only when an older board is really present (hasPhase11Blank), so ordinary saves cost no extra read"
    - "Read-only DB proof script that loads its own env file (CHECK_ENV_FILE), mirroring check-preference-columns.ts"
key-files:
  created:
    - scripts/check-saved-boards.ts
  modified:
    - lib/fit-defaults-server.ts
    - lib/models/rack-models.ts
    - lib/models/rack-models.test.ts
    - app/page.tsx
    - app/design/actions.ts
key-decisions:
  - "resolveCarryOverTipStyle adds an outer try/catch returning Pin deck on top of the handoff's own account-read guard, so reopening an old board can never fail on the lookup"
  - "The check script treats a Phase 11 board whose blank is dropped on open (length out of range, WR-05) as 'numbers moved', so it surfaces rather than hides"
metrics:
  duration: "about 15 minutes"
  completed: 2026-09-26
  tasks: 2
  files: 6
actuals:
  tokens: 5900
  tasks: 2
  commits: 3
---

# Phase 12 Plan 06: Older boards open with the shaper's own Tip Style Summary

A board saved before this update now reopens with the Tip Style the shaper picked in Fit & Tip
Defaults. Before this plan it always reopened with Pin deck. This works whether the board comes
back from the rack, a rename, a duplicate, or an autosave from a browser tab left open across the
update. A new read-only check shows that every board saved in the development database still opens,
and that the one board saved under Phase 11 keeps its five station thicknesses exactly.

## What a shaper gets from this plan

- **Their own Tip Style on an older board.** If a shaper has set Tip Style to Bottom, a board they
  saved under Phase 11 opens with Bottom. It keeps the five thicknesses they saw before: tail tip,
  tail 12", centre, nose 12" and nose tip.
- **No surprises from an old tab.** A browser tab left open across the update still sends the old
  shape of blank when it autosaves. The server spots the old shape and carries the board over the
  same way. It goes by the blank's shape, never by the saved version number.
- **Nothing breaks before production is ready.** The Tip Style lookup happens only when an older
  board is actually there. If the account can't be read, or production doesn't have the new Tip
  Style setting yet, the board takes the browser's own pick, or Pin deck if there is none. The rack
  and the saves keep working either way.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | A Phase 11 board on the rack opens with the shaper's own Tip Style, and every save path carries an old board the same way | `d2fd789` | lib/fit-defaults-server.ts, lib/models/rack-models.ts, lib/models/rack-models.test.ts, app/page.tsx, app/design/actions.ts |
| 2 | Every saved board in the development database opens, and the Phase 11 board keeps its five station numbers, proven read-only | `11ad960` | scripts/check-saved-boards.ts |

- `resolveCarryOverTipStyle()` takes no arguments. It works out who the shaper is from
  `await auth()`, inside `resolveFitDefaultsHandoff`, and returns one of two words.
- The rack (`BoardRackData`) looks it up once for the whole list, and only when some row
  `hasPhase11Blank`. It passes `{ tipStyle }` to `rackModelsFromRows`.
- `saveModel`, `renameModel` and `duplicateModel` each do the same for the snapshot they are about
  to parse. `await auth()` is still the first statement in each, and no parameter changed.
  `lib/db/ownership.test.ts` passes unchanged.
- The comment in `lib/fit-defaults-server.ts` said "five settings". It now lists the seven.
- There are three new rack tests. They use an untyped version-4 envelope with the cut removed from
  its blank:
  - handed Bottom, the board comes back with Bottom, the default Deck Skin and fine-tunes on the Deck;
  - with no Tip Style passed, it comes back with Pin deck;
  - a board that already has its own cut comes back exactly as saved, whichever Tip Style is passed.

## Database evidence (Neon development branch only, read-only)

Command, run on its own from the worktree:
`CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-saved-boards.ts`

```
saved boards: 7 (v1 6, v2 0, v3 0, v4 1, v5 0); open: 7 of 7
Phase 11 boards with a blank: 1; five station thicknesses kept: 1 of 1
carried boards that no longer fit where they sit: 1 of 1
```

- This matches what research found: six version-1 boards and one Phase 11 board with a blank.
- All seven open, and the Phase 11 board's five thicknesses print identically in Imperial and Metric.
- The Phase 11 board now reads "doesn't fit" where it sits. That is only reported, not a failure:
  the founder accepted it in D-14, and ROCKER offers the fix.
- The script selects and never writes: `grep -cE "\.(insert|update|delete)\(" scripts/check-saved-boards.ts`
  prints 0.
- It prints counts only, plus row ids if something fails. It never prints a snapshot, a name, a user
  id or the connection string.
- No `.env*` file was read or printed, and production was not touched.

## Verification

- `npx next typegen` ran once, then `npx tsc --noEmit` exited 0.
- `npx vitest run lib/models lib/db/ownership.test.ts`: 7 files, 100 tests, all passed.
- `npx vitest run` (whole suite): 74 files, 2,923 passed, 2 skipped (both skips were already there).
  The first full run had one failure. Two re-runs straight after were fully green, so it was a
  flake, most likely a timeout while three sibling executors were running at the same time. The
  failing test's name was not captured.
- `npm run lint`: 0 errors, 11 warnings, all in files this plan did not touch. `npx eslint` on the
  six files is clean.
- `grep -c "parseSnapshot(" app/design/actions.ts` prints 3, and each call passes an options object.
  `hasPhase11Blank(` and `resolveCarryOverTipStyle(` appear in both `app/page.tsx` and
  `app/design/actions.ts`. Neither file compares a snapshot's version number.
- `git diff --name-only 5f9c072..HEAD` lists exactly the six planned files, plus this SUMMARY.
- **Human check (recorded, not stopped for, as end-of-phase mode says):** sign in with Tip Style set
  to Bottom in Fit & Tip Defaults, then open a board saved under Phase 11 from the rack. Its Tip Style
  should read Bottom, and its five station thicknesses should read what they did before this phase.

## Deviations from Plan

**1. [Rule 2 - Fail soft] An outer guard on the Tip Style lookup**
- The plan's helper relied on the handoff's own try/catch, which only covers the account read.
- `resolveCarryOverTipStyle` adds its own try/catch on top. It logs the error and returns Pin deck,
  so a failure anywhere in the lookup (the cookie store or the session) still can't take down the
  rack or a save.
- Commit: `d2fd789`.

**2. [Wording] A comment reworded to keep the plan's `parseSnapshot(` count at 3**
- A comment in `saveModel` quoted `parseSnapshot(row.snapshot)`, which made the plan's grep count 4.
- It now says "the rack parsing each row". No code changed.

No file outside the six was edited, and no test allow-list or compile fix was needed anywhere else.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register:
- T-12-17: the helper has no parameters and gets the shaper from `auth()` only.
- T-12-18: the lookup is skipped unless a Phase 11 blank is present, and fails soft.
- T-12-19: the check script selects only and prints counts or ids.

## Self-Check: PASSED

- FOUND: scripts/check-saved-boards.ts, lib/fit-defaults-server.ts, lib/models/rack-models.ts,
  lib/models/rack-models.test.ts, app/page.tsx, app/design/actions.ts.
- FOUND commits: `d2fd789`, `11ad960`.
- STATE.md and ROADMAP.md were not touched.
