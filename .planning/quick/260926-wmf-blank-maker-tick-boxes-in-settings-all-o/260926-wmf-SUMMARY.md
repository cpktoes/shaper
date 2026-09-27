---
phase: quick-260926-wmf
plan: 01
status: complete
subsystem: settings menu, account preferences, ROCKER blank list
tags: [blanks, settings, preferences, rocker, migration]
requires:
  - lib/preference-handoff.ts (the shared sign-in handoff and write queue)
  - Phase 11/12 blank catalogue and ROCKER list
provides:
  - BLANK MAKERS tick boxes in the gear menu and the phone Menu
  - user_preferences.hidden_blank_makers (migration 0007, development branch only)
  - the ROCKER list and offer filtered to the ticked makers
affects:
  - app/layout.tsx (a fourth handoff)
  - both menu popups (height-limited, scroll inside themselves)
tech-stack:
  added: []
  patterns:
    - fourth instance of the account-preference pattern (pure module + server read + provider + Server Action)
key-files:
  created:
    - lib/blanks/vendors.ts
    - lib/blanks/vendors.test.ts
    - lib/blank-makers-preference.ts
    - lib/blank-makers-preference.test.ts
    - lib/blank-makers-server.ts
    - app/actions/blank-makers.ts
    - components/blank-makers-provider.tsx
    - drizzle/0007_hidden_blank_makers.sql
    - drizzle/meta/0007_snapshot.json
    - e2e/blank-makers.spec.ts
  modified:
    - lib/db/schema.ts
    - lib/db/queries.ts
    - lib/db/ownership.test.ts
    - scripts/check-preference-columns.ts
    - drizzle/meta/_journal.json
    - app/layout.tsx
    - components/settings-menu.tsx
    - components/design/phone-menu.tsx
    - lib/geometry/blank-reasons.ts
    - lib/geometry/blank-reasons.test.ts
    - components/rocker/use-blank-list.ts
    - components/rocker/blank-picker.tsx
    - components/rocker/blank-flag.tsx
decisions:
  - The hidden makers are stored rather than the shown ones, so a maker added later starts ticked for everyone.
  - The whole hidden list is saved as one value, like Units, so the last pick wins across devices.
  - Both menu popups are limited to the screen height Base UI measures and scroll inside themselves, because the phone menu was already 60px past the bottom of an iPhone screen before this group was added.
metrics:
  duration: about 45 minutes
  completed: 2026-09-27
actuals:
  tokens: 25800
  tasks: 3
  commits: 4
---

# Quick Task 260926-wmf: Blank Maker Tick Boxes Summary

The gear menu now has a BLANK MAKERS group with tick boxes for US Blanks, Arctic Foam and Marko Foam, all ticked to start. Unticking a maker takes its blanks out of the ROCKER blank list and out of the "closest blank that fits" offer straight away, and the choice is remembered on the account like Units.

## What a shaper sees

- **The tick boxes.** In the gear menu on a desktop, or the Menu button in a phone's top bar, a new BLANK MAKERS group sits under BLANKS (Fit & Tip Defaults). It has one tick box per maker. A shaper who has never touched them sees all three ticked, and nothing is saved until they change one. Ticking or unticking takes effect at once and leaves the menu open, so several can be changed in one visit. Each row is at least 44px tall under a finger, and the rows work from the keyboard.
- **The last one is locked.** The last maker still ticked can't be unticked. Its row reads "Keep at least one maker ticked", so the list can never end up empty.
- **The menu fits the screen.** On an iPhone the menu was already 60px taller than the screen before this change. Both menus now stop at the bottom of the screen and scroll inside themselves, so every tick box can be reached. On a desktop nothing looks different.
- **The ROCKER list.** An unticked maker's blanks leave the list entirely (they are not greyed out) and never appear in the offer. One line appears under the list intro, for example "Showing US Blanks and Marko Foam only — change in Settings". The empty-list and "nothing fits" sentences name only the catalogs being searched ("the longest blank in the US Blanks catalog is ..."). Every blank still shown is judged exactly as before.
- **The board keeps its blank.** A blank already picked stays on the board when its maker is unticked, and presets keep their picks. The filter decides what the list shows and never changes the board.
- **With every maker ticked, nothing changes.** The five desktop baseline pictures are byte-for-byte identical, and every "three catalogs" sentence reads exactly as it did.

## Where the choice is remembered

- **Signed out:** in this browser (local storage plus a cookie the server reads), so the very first paint after a reload is already right.
- **Signed in:** on the account, in the new `user_preferences.hidden_blank_makers` column, so it follows the shaper to any device. It uses the same sign-in rules as Units: an account value wins, and a browser-only pick is copied up to an account that has none.
- **Every stored value is checked before use.** An unknown maker name is ignored. A malformed value, or one that would hide every maker, reads as all makers ticked. The save refuses anything but known maker names.

## Commits

| Task | What it did | Commit |
|------|-------------|--------|
| 1 | A place on your account to remember which blank makers you want to see (pure rules + tests, the column, migration 0007 on development, the account read, the save, the ownership test) | ad12e4a |
| 2 | Tick boxes for US Blanks, Arctic Foam and Marko Foam in the settings menu (server read, provider, layout, menu rows, popup height limit, first browser tests) | 55c17dc |
| 3 | An unticked blank maker leaves the ROCKER blank list (sentences name the shown catalogs, the list hook filter, the note line, the ROCKER browser tests) | c79bb53 |

## Database evidence (Neon development branch only)

The generated SQL, `drizzle/0007_hidden_blank_makers.sql`, is exactly one statement. It was checked with an exact-match test before migrating:

```
ALTER TABLE "user_preferences" ADD COLUMN "hidden_blank_makers" text;
```

BEFORE `drizzle-kit migrate`: `CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts`

```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers missing (3 of 4 columns); extra_center_thickness_mm kept
drizzle migrations recorded: 7
exit 1
```

Migrate, run in the worktree against the development branch: `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate` printed "migrations applied successfully!".

AFTER, the same check command:

```
user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm kept
drizzle migrations recorded: 8
exit 0
```

Production was not touched. No env file was read, printed or written, and nothing named a production env file.

## Desktop baseline pictures (no re-record)

`shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/*.png`: the before hashes were taken before any code changed, and the after hashes after the full browser run. `git status --porcelain -- e2e/desktop-baseline.spec.ts-snapshots` prints nothing.

| Picture | Before | After |
|---------|--------|-------|
| fins-desktop-desktop-darwin.png | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 | a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62 |
| outline-desktop-desktop-darwin.png | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 | ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0 |
| rails-desktop-desktop-darwin.png | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 | 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373 |
| rocker-desktop-desktop-darwin.png | 0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9 | 0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9 |
| volume-desktop-desktop-darwin.png | b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34 | b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34 |

## Test results (worktree, webpack dev server on port 3162)

- `npx tsc --noEmit`: clean (after one `npx next typegen`).
- `npx vitest run`: 76 files, 3024 passed, 2 skipped.
- `npm run lint`: 0 errors. The 11 warnings are all pre-existing, in files this task didn't touch.
- `e2e/blank-makers.spec.ts`: 5 tests on each of iPhone, Android and desktop, 15 of 15 passed.
- Task 2 set (blank-makers, fit-defaults, phone-layout, touch-sizing, desktop-baseline): 100 passed, 61 skipped (device-specific), 1 failed. The failure is the warm-up artifact described under Deviations.
- Task 3 set (blank-makers, rocker-blanks, touch-sizing, fit-defaults, desktop-baseline): 107 passed, 34 skipped, 0 failed.
- Full suite (591 tests), run one device at a time in two halves each so every run fit in the foreground: desktop 92 passed, iPhone 122 passed, Android 132 passed, 244 skipped. There was one iPhone timeout, described under Deviations.
- `npm run build` was not run here. Turbopack can't build from a worktree, so that is the orchestrator's step after the merge.

## Human checks recorded (not automatable here)

1. **Account round trip, signed in.** Clerk never settles under the test suite's fake keys, so this can only be walked by hand, and only after the production migration. Untick Marko Foam in the gear menu on www.shaperassistant.com, then open the site signed in on a second browser or device: Marko Foam should be unticked there too. Tick it again, reload the first browser, and it should follow.
2. **A real-phone look at the menu now that it scrolls.** On a real iPhone (and ideally a Pixel), open the top bar's Menu. The menu should stop at the bottom of the screen, scroll smoothly inside itself with a thumb, and reach all three BLANK MAKERS tick boxes. Nothing on the page behind should scroll instead. Playwright's emulated iPhone measured the fit, but a real Safari scroll feel is worth a look.

## Production step for the founder (after the merge, BEFORE any deploy)

The orchestrator must NOT push `main` or otherwise deploy this work until both steps below have run and the check has exited 0. The reason: Drizzle names every column of `user_preferences` on every insert. Code that knows `hidden_blank_makers` would break every Units, print-option and Fit & Tip Defaults save for signed-in shapers until the column exists in production.

1. From the main checkout, on the branch that carries migration 0007 (local `main` after the merge):
   `npm run db:migrate:prod`
2. Then, as its own command, the read-only proof (the shape documented in the header of `scripts/check-preference-columns.ts`):
   `bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'`
   Expect `... hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm kept`, one more migration recorded than before, and exit 0.
3. Only then push `main` and let Vercel deploy. After that, walk the signed-in account round trip (human check 1 above) on www.shaperassistant.com.

## Deviations

No code deviations: the plan was followed as written, touching exactly its 23 files. Two browser-test failures came up while running the suites. Both were investigated and neither is caused by this change:

1. **phone-layout, iPhone, "Width and the hand-set rocker are on screen ..."** failed once in the Task 2 run with `page.goto: Navigation to "/design/rocker" is interrupted by another navigation to "/design/outline"`. Repeated 4 times, it failed only on the first run, and the server log showed `Fast Refresh had to perform a full reload` at that moment. The first visit to ROCKER after this worktree's dev server starts compiles that page, which reloads the page the test is still on. The other 3 runs passed, and so did the same test in the later full iPhone run. This is a test-server warm-up artifact, not the tick boxes. Main's warm Turbopack server is the real gate.
2. **touch-sizing, iPhone, "ROCKER: every blank row ... is finger-sized"** hit its 30-second limit once in the full iPhone run, while a sibling task was running its own browser suite on the same machine. Repeated alone 3 times it passed all 3, in 7 to 13 seconds. It also passed in the Task 3 targeted run. With every maker ticked, the filter hands back the very same list, so this test's ROCKER page does no extra work.

A tooling note, not a code change: the Edit tool dropped a trailing space in the check script's summary line on the first pass (`columns);extra_center...`). It was caught on the first before-check run and fixed before any output was recorded. The outputs above are from the corrected script.

## Known Stubs

None.

## Threat Flags

None. Every surface this task added (the Server Action, the cookie, the account column, the check script) is in the plan's threat register, and each `mitigate` item is implemented: an all-or-nothing input check, identity from `auth()` only (enforced by the ownership test), fail-soft readers, a select-only check script that prints names and counts only, and an exact-match gate on the generated SQL.

## Self-Check: PASSED

- All 10 created files exist on disk. The three task commits (ad12e4a, 55c17dc, c79bb53) are in `git log`.
- `drizzle/0007_hidden_blank_makers.sql` matches the single ADD COLUMN statement exactly.
- `git diff --name-only bb6fae2 HEAD` lists exactly the plan's 23 files. `package.json`, `package-lock.json`, STATE.md, ROADMAP.md, the design store, the preset blanks, the server catalogue read and the ROCKER page loader are unchanged.
- `git diff --numstat` for `lib/geometry/blank-reasons.test.ts` shows 35 additions and 0 deletions, and `NOTHING_FITS_SENTENCE` still reads "No blank in the three catalogs fits this board right now."
