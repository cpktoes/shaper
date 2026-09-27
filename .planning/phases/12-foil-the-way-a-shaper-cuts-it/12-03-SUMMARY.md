---
phase: 12-foil-the-way-a-shaper-cuts-it
plan: 03
subsystem: fit defaults, blank list, ROCKER screen
status: complete
tags: [fit-defaults, planer-max-depth, deck-skin, tip-style, blank-list, centre-floor, e2e, baseline]
requires:
  - "12-01: DEFAULT_BLANK_CUT, TipStyle, BoardBlank/BoardOnBlankInput cut fields, cutOf (transitional)"
  - "12-02: userPreferences.planerMaxDepthMm / deckSkinMm / tipStyle (development database migrated)"
provides:
  - "FitDefaultsMmKey, FitDefaultsKey (+tipStyle), FitDefaultsPreference / FitDefaults (seven settings), FIT_DEFAULTS_MM_KEYS, FIT_DEFAULTS_KEYS (seven), parseTipStyleValue, FitDefaultsColumnValues"
  - "FIT_DEFAULTS_RANGE_IN.planerMaxDepth (1/16\"-1/4\") and .deckSkin (1/16\"-1/2\") — the one range constant the sidebar's Deck Skin will share"
  - "FitSettings = { extraLength, planerMaxDepth, widthMargin }"
  - "floorCheck(prepared, board: { length, centerThickness, deckSkin? }, settings) — centre floor = target + skin + one pass (D-10)"
  - "CenterFloorRules; listIntro(rules, system); floorShortfallMessage(kind, shortBy, rules, system); emptyListMessage(kind, { …, rules }, system)"
  - "useCenterFloorRules() and useBoardCut() in components/rocker/use-blank-list.ts"
  - "provider setDefault(key: FitDefaultsMmKey, value) (12-04 widens it to Tip Style)"
  - "the re-recorded ROCKER desktop baseline"
affects:
  - "12-04 (dialog Tip Style row + provider Tip Style setter build on FitDefaultsKey/parseTipStyleValue; settings-menu detail line and its e2e assertion)"
  - "12-05 (picked blanks carry their own cut; the list/flag already read blank.deckSkin/tipStyle/fineTuneSurface first)"
  - "12-07 (fitAt / one-pass-at-placement — untouched here)"
  - "12-09 (cut fields required; every literal written here states its cut)"
tech-stack:
  added: []
  patterns:
    - "Per-key typed helpers (parseField / setField, generic K) so one loop over seven differently-typed settings stays type-safe"
    - "Key-remapped mapped type for the account columns (FitDefaultsColumnValues) so the text Tip Style column and the number columns type-check against Drizzle"
    - "One hook (useBoardCut) is the only place the list, its sentences and the flag read the board's cut"
key-files:
  created: []
  modified:
    - lib/fit-defaults-preference.ts
    - lib/fit-defaults-preference.test.ts
    - lib/db/queries.ts
    - lib/db/fit-defaults-save.test.ts
    - lib/geometry/blank.ts
    - lib/geometry/blank-fit.ts
    - lib/geometry/blank-fit.test.ts
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - components/rocker/use-blank-list.ts
    - components/rocker/blank-flag.tsx
    - components/rocker/blank-picker.tsx
    - components/fit-defaults-dialog.tsx
    - components/fit-defaults-provider.tsx
    - e2e/fit-defaults.spec.ts
    - e2e/rocker-blanks.spec.ts
    - e2e/desktop-baseline.spec.ts
    - e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png
key-decisions:
  - "The board's cut for the list and flag comes from one hook, useBoardCut(): the picked blank's own skin / Tip Style / fine-tune surface, else the live account Deck Skin and Tip Style defaults and DEFAULT_BLANK_CUT's fine-tune surface; useCenterFloorRules() takes its skin from the same hook, so words and verdicts always use one number"
  - "floorCheck reads the skin through cutOf(board), so it is the same single fallback 12-01 set up and 12-09 deletes"
  - "The Tip Style handoff is decided per field exactly like the numbers — an account Tip Style and a browser Deck Skin both survive a sign-in"
metrics:
  duration: "about 45 minutes"
  completed: 2026-09-26
  tasks: 3
  files: 18
actuals:
  tokens: 29400
  tasks: 3
  commits: 3
---

# Phase 12 Plan 03: Planer Max Depth replaces Extra Center Thickness Summary

A blank now counts as thick enough when its printed center leaves room for your board's Deck Skin
plus one bottom pass of your planer, not a flat 3/8" of spare. The gear menu, the account, the blank
list's wording, the too-thin flag and the empty-list messages all say this, and each quotes the same
numbers the list is judged with.

## What a shaper sees

- **Fit & Tip Defaults** now has six number rows. Under WHICH BLANKS FIT: Extra Length, then
  **Planer Max Depth** (default 1/8" / 3 mm, where Extra Center Thickness was), then Width Margin.
  Under NEW BOARDS START WITH, with the hint "Boards you've already started keep their own.":
  **Deck Skin** (default 1/8" / 3 mm), then the two tips. Planer Max Depth is bounded 1/16"–1/4" and
  Deck Skin 1/16"–1/2", both in 1/16" steps. Restore Defaults returns every setting to "not chosen".
  The Tip Style row is 12-04's; the setting itself (Pin deck by default) is already stored and read.
- **More blanks can be listed.** Out of the box the center floor is the target + 1/4" (the 1/8" skin
  plus one 1/8" pass) instead of target + 3/8". At the default board's usual centres the list gets
  longer, and every blank the old rule listed is still listed (a test proves this at 2 1/4", 2 1/2",
  2 3/4" and 3").
- **The list's opening line** reads "Shortest first. Each is at least 2" longer than your board, with
  room at the center for a 1/8" deck skin and a 1/8" bottom pass. …". With no blank picked it quotes
  the account's Deck Skin default and changes the moment that default changes. With a blank picked it
  quotes the board's own skin.
- **The too-thin flag (F4)** reads "It's {amount} too thin at the center — there isn't room for your
  {skin} deck skin and a {pass} bottom pass." The **empty lists** E2 and E3 name the skin and the pass
  too, and E2 points you to "change your Deck Skin or Planer Max Depth". The headings are unchanged.
- **Your account** reads the three new settings and has stopped reading Extra Center Thickness. The
  database column is still declared and still there, but nothing reads it or writes it (D-19). An old
  cookie or browser entry that still holds it is ignored. A save that names it is refused whole, and
  so is a save with any Tip Style other than Pin deck or Bottom.

## Tasks

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Planer Max Depth sets the centre floor, with the board's Deck Skin; Extra Center Thickness gone (tracer, one atomic commit) | `21b3924` | the 14 lib/ and components/ files |
| 2 | The dialog and the ROCKER flag proven in real browsers | `46f9858` | e2e/fit-defaults.spec.ts, e2e/rocker-blanks.spec.ts |
| 3 | ROCKER desktop picture re-recorded for the list intro's new wording | `f3d999d` | e2e/desktop-baseline.spec.ts, rocker-desktop-desktop-darwin.png |

## R7 order (checked before the first edit, and again at the end)

- All six named-test titles are present on the base: five in `lib/geometry/blank-fit.test.ts` and one
  in `lib/models/design-snapshot.test.ts`. Three of them are written in the source with an escaped
  `\"`, so a plain `grep -cF` with a bare `"` misses them. Found with a looser grep, one each.
- `git diff --name-only main..HEAD -- components` was empty before Task 1.
- The plan's ancestry proof passes. The sixth named test landed in `c610ac9` (12-01), the first
  commit on the branch to touch `components/` is `21b3924` (this plan), and
  `git merge-base --is-ancestor c610ac9 21b3924` exits 0.

## Desktop baselines (SHA-256)

| Picture | Before | After |
|---------|--------|-------|
| outline (TEMPLATE) | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 (unchanged) |
| rails | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 (unchanged) |
| fins | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 (unchanged) |
| volume | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 | e6d97a8ddbe815b1d5b32f2593762c6c7c3faf3885d5f94375a3fcf5ba5a8372 (unchanged) |
| rocker | 2767ca46503c9e6ea72d2d76c0672e8c52e867b912317ba6870809c08ad6eb13 | 75ee2ce14d11fadb7d863762f4a2f72c8f8a367c1960080a8e5509ba55101731 (re-recorded once) |

- **Before re-recording**, the spec ran without updating and only ROCKER failed (9,368 pixels,
  0.01 of the image). The diff image showed the intro now wraps onto one more line and pushes the
  search box and the list down by that line. The first four rows are the same blanks in the same
  order (6'2"A, 6'2"AX, 6'2" MF, 6'4" SBM). Nothing else changed: not the drawing, the Center
  Thickness section or the top bar.
- **The new picture** was checked before committing. The new sentence is readable and there is no
  red "Issue" badge. The small round "N" in the corner is Next's normal dev-server mark, and the
  previous picture has it too.
- **After re-recording**, the whole spec passed 10 of 10 with `--repeat-each 2` and no update flag.
- **Which server rendered the new picture:** the webpack dev server (`IS_WEBPACK_TEST=1`, port 3153)
  in this worktree, on this Mac. The other four pictures matched their existing images under it. If
  the orchestrator's Turbopack run from the main checkout disagrees with ROCKER, it may re-record
  ROCKER once there, as the spec's header note says.
- `--update-snapshots` was passed exactly once, with `-g "ROCKER"` on the desktop project only.

## Verification

- `npx next typegen` (once), then `npx tsc --noEmit`: clean.
- `npx vitest run lib/fit-defaults-preference.test.ts lib/geometry/blank-reasons.test.ts lib/geometry/blank-fit.test.ts lib/blanks lib/db`:
  9 files, 257 passed.
- `npx vitest run` (whole suite): 74 files, 2,920 passed, 2 skipped (both skips were already there).
- `npm run lint`: 0 errors and the same 11 old warnings, all in `scripts/extract-prototype-*.mjs`.
- `npx --no-install tsx --tsconfig ./tsconfig.json scripts/generate-preset-blanks.ts` wrote the same four
  picks (Marko Foam 6'4" TP, Arctic Foam 5'10" MF, Marko Foam 7'5" Machine All, US Blanks 9'3"Y, each
  at 0). `git diff --exit-code lib/blanks/preset-blanks.generated.json` exits 0.
- Acceptance greps:
  - The filtered `extraCenterThickness\b` grep over lib/, components/ and app/ (tests and comments
    excluded) prints nothing.
  - ``grep -rnE "[\"'`]Extra Center Thickness" components lib`` prints nothing.
  - `grep -c extraCenterThicknessMm lib/db/schema.ts` prints 1.
  - `parseTipStyleValue` is exported. `bottom pass` and `deck skin` appear in blank-reasons.ts.
    `useCenterFloorRules` is exported.
  - The only `Extra Center Thickness` left in e2e/fit-defaults.spec.ts is a `toHaveCount(0)` check.
- `IS_WEBPACK_TEST=1 PW_PORT=3153 npx playwright test e2e/fit-defaults.spec.ts e2e/rocker-blanks.spec.ts e2e/new-board.spec.ts`
  on desktop, Android and iPhone: 51 passed, 3 skipped. All three skips were already there: two
  iPhone skips in new-board, and the desktop skip of the touch-size test.
- No `25.4` or `/ 10` in any changed source file. Every number in a sentence goes through `formatMark`
  / `formatLength`. Every default and bound is authored through `inchesToMm` or `DEFAULT_BLANK_CUT`.
- package.json, package-lock.json, lib/db/schema.ts, drizzle/, STATE.md and ROADMAP.md are untouched.
  `git diff --name-only b592519..HEAD` lists exactly the eighteen allowed files. This SUMMARY is the
  nineteenth, in its own commit.

## Deviations from Plan

None that change behaviour or scope. Three small things to know:

1. **An extra export in an allowed file: `useBoardCut()`.** It sits in
   `components/rocker/use-blank-list.ts` next to `useCenterFloorRules()`. It returns the board's cut
   exactly as the plan specifies for the list's `ctx.board`:
   `blank?.deckSkin ?? defaults.deckSkin`, `blank?.tipStyle ?? defaults.tipStyle`, and
   `blank?.fineTuneSurface ?? DEFAULT_BLANK_CUT.fineTuneSurface`. The list, `useCenterFloorRules` and
   the flag all read from it rather than repeating the fallbacks three times, so the flag's verdict
   and its F4 sentence cannot drift apart.
2. **An extra exported type: `FitDefaultsColumnValues`.** Once Tip Style is a text column, one shared
   `Mm | null` column type no longer type-checks against Drizzle's `.values()`. This type gives each
   column its setting's own type. `app/actions/fit-defaults.ts` compiles unchanged.
3. **Two comments reworded in e2e/fit-defaults.spec.ts.** They now say "the retired centre-thickness
   rule" so that the acceptance grep's only hit is the absence assertion.

No test-only allow-list or compile fix was needed outside the eighteen files.

## Known transitional behaviour (for 12-04 / 12-05)

- **A picked blank with no stored cut yet.** Until 12-05, a blank picked on this branch stores no
  Deck Skin. The list and the flag then judge it with the account's Deck Skin default, while the
  drawing, which the design store builds through `cutOf`, uses the out-of-the-box 1/8". The two
  agree unless the shaper has changed the Deck Skin default. Once 12-05 stores each picked blank's
  own cut, both read that stored cut.
- **Gear-menu wording outside this plan's files.** The row's detail line still reads "Spare foam and
  tip thickness" (`components/settings-menu.tsx`), and e2e/fit-defaults.spec.ts still asserts that
  text. The UI contract changes it to "Spare foam, planer, skin and tips". Whichever plan edits
  settings-menu.tsx (12-04 by the dialog split) must update that assertion.
- **Doc comments outside this plan's files** still say "five" settings or mention Extra Center
  Thickness: `lib/fit-defaults-server.ts`, `app/actions/fit-defaults.ts` (12-04's), and the
  `lib/db/schema.ts` column comments. Only the comments are stale. The code they describe is correct.

## Human check (recorded, not stopped for; end-of-phase mode)

- Open the new ROCKER baseline beside the previous one
  (`git show f3d999d^:e2e/desktop-baseline.spec.ts-snapshots/rocker-desktop-desktop-darwin.png`).
  Only the list intro's wording, and the rows it pushes down by one line, should differ.
- Signed in, open Fit & Tip Defaults, set Planer Max Depth and Deck Skin, and reload on another
  device. Both should follow the account. The e2e suite runs signed out, so the account round trip
  is covered by the unit tests of the handoff and the save SQL.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-12-08 and T-12-09 are mitigated and unit-tested:
- Stored values: an unknown or legacy key is ignored, and a Tip Style other than `pinDeck` or
  `bottom` reads as null.
- Patches: the whole patch is rejected for an unknown or retired key, or for any bad value.
- Saves: the insert and update column sets never name `extraCenterThicknessMm`, and the save SQL
  test proves Restore Defaults writes exactly the seven columns plus `updated_at`.

T-12-10 is unchanged. T-12-11: the list is memoised on the board, its cut and the three rules, never
the placement, and the "under 250 ms" judging test still passes. T-12-12: one named re-record,
guarded by the diff inspection and the four unchanged hashes.

## Self-Check: PASSED

- All eighteen modified files exist. The re-recorded PNG's hash is 75ee2ce1…1731.
- Commits `21b3924`, `46f9858` and `f3d999d` are on this branch, each ending with the
  `Co-Authored-By: Claude Fable 5.1` trailer.
- The four untouched baselines' hashes match the plan exactly.
