---
phase: quick-260926-wmf
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/blanks/vendors.ts
  - lib/blanks/vendors.test.ts
  - lib/blank-makers-preference.ts
  - lib/blank-makers-preference.test.ts
  - lib/db/schema.ts
  - lib/db/queries.ts
  - lib/db/ownership.test.ts
  - app/actions/blank-makers.ts
  - scripts/check-preference-columns.ts
  - drizzle/0007_hidden_blank_makers.sql
  - drizzle/meta/0007_snapshot.json
  - drizzle/meta/_journal.json
  - lib/blank-makers-server.ts
  - components/blank-makers-provider.tsx
  - app/layout.tsx
  - components/settings-menu.tsx
  - components/design/phone-menu.tsx
  - e2e/blank-makers.spec.ts
  - lib/geometry/blank-reasons.ts
  - lib/geometry/blank-reasons.test.ts
  - components/rocker/use-blank-list.ts
  - components/rocker/blank-picker.tsx
  - components/rocker/blank-flag.tsx
autonomous: true
requirements: [QT-260926-wmf]

estimate:
  # Three tasks. Task 1 is the heaviest: two new pure modules with their tests, one column, a
  # generated migration applied to the development database with a before/after proof, one account
  # read, one Server Action and the ownership test. Task 2 is a provider copied from a sibling, the
  # layout wiring, the menu rows and the first browser tests. Task 3 is small in edited lines, but it
  # carries the full Playwright run, and most of its cost is that run's output.
  tokens: 220000
  raw_tokens: 220000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The gear menu (the desktop gear, and the phone top bar's Menu) has a BLANK MAKERS group under BLANKS, with one tick box for each of US Blanks, Arctic Foam and Marko Foam. For a shaper who has never touched them, all three are ticked, and nothing about the choice is saved until they tick or untick one."
    - "The whole menu fits on the screen. When it is taller than the screen it scrolls inside itself, so the tick boxes can be reached on an iPhone. Each tick-box row is at least 44px tall under a finger. The rows work from the keyboard (arrow keys to move, Space or Enter to tick)."
    - "Unticking a maker takes effect at once, with no reload. Its blanks leave the ROCKER list entirely (they are not greyed), and they leave the 'closest blank that fits' offer. The list intro gains one line: 'Showing US Blanks and Marko Foam only — change in Settings' (or 'Showing US Blanks only — change in Settings'). The judging of every blank still shown is unchanged."
    - "The last ticked maker cannot be unticked. Its row is disabled and reads 'Keep at least one maker ticked', so the filter can never empty the list."
    - "The board's own picked blank stays exactly as it is when its maker is unticked. The filter shapes the list and never the board, and presets keep their picks whatever is ticked."
    - "The choice is remembered like Units. Signed out, the browser keeps it (localStorage plus a cookie the server reads, so the first paint is already right after a reload). Signed in, it is saved on the account in user_preferences.hidden_blank_makers and follows the shaper to any device, with the same sign-in handoff rules."
    - "Every stored value is untrusted. A maker name the app does not know is ignored, and a malformed value reads as every maker on. So does a value that hides every maker. The save refuses anything but known maker names."
    - "The development database has the new nullable text column. scripts/check-preference-columns.ts exits 1 before the migration and 0 after, and production is not touched. The deploy is held until the founder migrates production."
    - "With every maker ticked, nothing on screen changes: the five desktop baseline pictures pass unchanged, byte for byte, and every 'three catalogs' sentence reads exactly as before."
  artifacts:
    - path: lib/blanks/vendors.ts
      provides: "KNOWN_BLANK_VENDORS (the three catalogue makers), the pure record filter, the intro line and the catalogs phrase"
      contains: "KNOWN_BLANK_VENDORS"
    - path: lib/blank-makers-preference.ts
      provides: "The fourth account preference: the hidden makers, allow-listed, cookie, handoff and the last-maker rule"
      contains: "decidePreferenceHandoff"
    - path: drizzle/0007_hidden_blank_makers.sql
      provides: "One additive column and nothing else"
      contains: "ADD COLUMN \"hidden_blank_makers\" text"
    - path: app/actions/blank-makers.ts
      provides: "The save, identity from auth() only, input allow-listed all-or-nothing"
      contains: "await auth()"
    - path: components/blank-makers-provider.tsx
      provides: "useBlankMakers(): the hidden makers and setMakerShown, with the browser store, the account write queue, adoption and promotion"
      contains: "useSyncExternalStore"
    - path: components/settings-menu.tsx
      provides: "The BLANK MAKERS tick boxes, one Menu.CheckboxItem per maker"
      contains: "Menu.CheckboxItem"
    - path: components/rocker/use-blank-list.ts
      provides: "The ROCKER list and the offer, judged only over the makers a shaper shows"
      contains: "filterShownBlanks"
    - path: e2e/blank-makers.spec.ts
      provides: "The browser proof on iPhone, Android and desktop"
    - path: scripts/check-preference-columns.ts
      provides: "The read-only proof, now also checking hidden_blank_makers"
      contains: "hidden_blank_makers"
  key_links:
    - from: components/settings-menu.tsx
      to: components/blank-makers-provider.tsx
      via: "useBlankMakers().setMakerShown on each tick box's onCheckedChange"
      pattern: "setMakerShown"
    - from: components/blank-makers-provider.tsx
      to: app/actions/blank-makers.ts
      via: "createPreferenceWriteQueue save calls saveBlankMakersPreference"
      pattern: "saveBlankMakersPreference"
    - from: app/layout.tsx
      to: lib/blank-makers-server.ts
      via: "resolveBlankMakersHandoff in the layout's Promise.all, handed to BlankMakersProvider"
      pattern: "resolveBlankMakersHandoff"
    - from: components/rocker/use-blank-list.ts
      to: lib/blanks/vendors.ts
      via: "filterShownBlanks over the prepared catalogue, so the list and the flag's offer share one filter"
      pattern: "filterShownBlanks"
    - from: app/actions/blank-makers.ts
      to: lib/db/schema.ts
      via: "upsert of userPreferences.hiddenBlankMakers"
      pattern: "hiddenBlankMakers"
---

<objective>
Give shapers three tick boxes in the settings menu, one per blank maker (US Blanks, Arctic Foam,
Marko Foam), all ticked to start. An unticked maker's blanks leave the ROCKER blank list and the
"closest blank that fits" offer. The choice follows the shaper's account the way Units and Fit & Tip
Defaults do. The founder said: "add a Blank Manufacturer tick boxes under settings. by default all are
on. Un selecting a mfg removes it from the blank suggestions on the rocker page." And in his earlier
note: "Default is all, but many users will have a preference or limitation."

Purpose: a shaper who buys from one supplier stops scrolling past two thirds of the list every time.
Output: one new nullable account column, applied to the development database with a read-only proof;
a fourth account preference built on the existing handoff helper; the menu rows; the ROCKER filter;
unit tests; a Playwright spec on all three device profiles.

Source coverage audit (quick task: no RESEARCH.md, no CONTEXT.md; the orchestrator's design points
and the founder's storage decision stand in for them):

| Source | Item | Covered by |
|--------|------|-----------|
| GOAL | Tick boxes in settings, all on by default | Task 2 |
| GOAL | Unticked maker removed from ROCKER suggestions | Task 3 |
| REQ | QT-260926-wmf | Tasks 1-3 |
| CONTEXT | Founder's storage decision: follow the account like Units / Fit & Tip Defaults | Tasks 1, 2 |
| CONTEXT | Design point 1: nullable text column of HIDDEN makers, allow-listed, fail soft, additive 0007 | Task 1 |
| CONTEXT | Design point 2: BLANK MAKERS group, CheckboxItems, 44px on touch, keyboard, saves at once, last one locked | Task 2 |
| CONTEXT | Design point 3: left out (not greyed), out of the offer, intro line, picked blank untouched, presets untouched, client-side filter | Task 3 |
| CONTEXT | Design point 4: unit tests + Playwright spec on three profiles + baseline unchanged | Tasks 1-3 |
| CONTEXT | Design point 5: before/after database evidence; production step for the founder | Task 1, final section |
| CONTEXT | Design point 6: Rules 1/2, no dependency, plain English, one commit per task, the gates | every task |

Planner choices (the orchestrator's discretion areas, or places where the code forced a decision):
- The group is a sibling `Menu.Group` labelled `Blank Makers` directly under the existing BLANKS group
  (Fit & Tip Defaults), spaced like Theme under Units. It gets its own accessible group name, which the
  spec uses.
- Plan-time measurement (Playwright, iPhone 14 profile, ROCKER page): the phone menu popup is already
  664px tall, starting at y=60 on a 664px-tall screen. Its bottom edge is at 724, so it is already 60px
  off-screen. Base UI reports 599.5px of available height. The new group adds roughly 180px on a
  phone, which would put all three tick boxes off-screen. So both popups (the desktop gear and the
  phone Menu) get a height limit of Base UI's available height and scroll inside themselves. Measured
  on the desktop (1280x800), the popup is 538px tall and the change makes no visible difference there.
- The whole hidden list is saved as one value, like Units (last pick wins across devices). A per-maker
  patch like Fit & Tip Defaults would be over-built for three tick boxes.
- The code forces a copy fix: three existing sentences say "the three catalogs" (the two empty-list
  messages and the F5 "nothing fits" line). With a maker hidden they would be false. For example, "the
  longest blank in the three catalogs" would quote a length from a hidden maker's blank. They gain a
  catalogs phrase ("the US Blanks catalog", "the US Blanks and Marko Foam catalogs"). With every maker
  on, the phrase is exactly "the three catalogs", so every existing test and picture stays the same.
- The last-ticked hint reads `Keep at least one maker ticked`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md
@.planning/todos/pending/2026-09-26-blank-manufacturer-tick-boxes-in-settings.md
@.planning/phases/12-foil-the-way-a-shaper-cuts-it/12-02-SUMMARY.md

# The pattern to copy (the fourth instance of the account preference)
@lib/preference-handoff.ts
@lib/fit-defaults-preference.ts
@lib/fit-defaults-server.ts
@app/actions/fit-defaults.ts
@app/actions/units.ts
@components/fit-defaults-provider.tsx
@lib/db/schema.ts
@lib/db/queries.ts
@lib/db/ownership.test.ts
@scripts/check-preference-columns.ts
@app/layout.tsx

# The menu
@components/settings-menu.tsx
@components/design/phone-menu.tsx

# The ROCKER list and its sentences
@components/rocker/use-blank-list.ts
@components/rocker/blank-picker.tsx
@components/rocker/blank-flag.tsx
@lib/geometry/blank-reasons.ts
@lib/blanks/seed-files.ts

# Browser-test idioms to copy (menu opening with retry, ROCKER hydration wait, centre typing)
@e2e/fit-defaults.spec.ts
@e2e/rocker-blanks.spec.ts

<interfaces>
Facts verified at plan time. Use these directly; there is no need to re-explore.

- Catalogue makers, from the vendor column of each CSV in the order `SEED_CSV_FILES` reads them:
  "US Blanks", "Arctic Foam", "Marko Foam". `readSeedCatalog()` (lib/blanks/seed-files.ts, Node only)
  returns every `BlankRecord` with `.vendor` and `.name`.
- `PreparedBlank` carries `.record` (a `BlankRecord`). `useBlankList(records)` returns
  `{ prepared, recordOf, list, ctx, board }`. It has exactly two consumers: `BlankListBody`
  (blank-picker.tsx: list, `catalogueExtremes(prepared)`, `emptyListMessage`) and `OfferBody`
  (blank-flag.tsx: `nearestFit(current, list.fits, foil.center)`, and F5 renders
  `NOTHING_FITS_SENTENCE`). So filtering `prepared` inside the hook filters the list, the empty-list
  extremes and the offer together. The picked card reads the board's own copy (`blank.copy`) and the
  flag reads `preparedBlank` from the design store, and neither passes through this hook.
- Blank row accessible name: `Use {vendor} {name}` (plus `, doesn't fit: …` when greyed). The list is
  `role=list` named "Blanks". State A shows 6 rows, then a `Show all {n} blanks` button. Search box:
  searchbox "Search blanks". An empty search reads `No blanks match "{query}".`
- The picked card is `[data-picked-blank]`; its meta line starts with the vendor. The offer line is
  `[data-blank-offer]`, starting "Closest blank that fits: ". The flag is `[data-blank-flag]`.
- `lib/geometry/blank-reasons.ts`: `NOTHING_FITS_SENTENCE = "No blank in the three catalogs fits this
  board right now."`. `emptyListMessage(kind, numbers, system)` uses "the longest blank in the three
  catalogs is" (length) and "Nothing in the three catalogs is both" (both). The thickness body names no
  catalogue.
- Base UI 1.7.0 `Menu.CheckboxItem`: props `checked`, `onCheckedChange(checked)`, `disabled`, `label`,
  `closeOnClick` (default false). It renders role `menuitemcheckbox` with `aria-checked`, and carries the
  data attributes data-checked / data-unchecked / data-disabled. A disabled item stays focusable
  (`focusableWhenDisabled: true`) and gets `aria-disabled="true"`. `Menu.CheckboxItemIndicator` exists.
  `Menu.Group` + `Menu.GroupLabel` render a role=group named by the label. Items must be direct
  children of their group, or components that return the item directly (as ThemeRow does). A wrapper
  DOM node makes rows inert.
- Base UI's `Menu.Positioner` sets the CSS variable `--available-height` (599.5px measured on the
  iPhone 14 profile). The Tailwind v4 class `max-h-(--available-height)` reads it, in the same form as
  the popup's existing `origin-(--transform-origin)`.
- `lib/db/ownership.test.ts` lists each action file by path in five places: a path constant, a
  source read, the auth-before-db list, the signatures list and the owned-table statement list. It
  also has one "exports exactly the expected action" test per file.
- The check script today prints two lines and exits 1 on any missing column. The development
  database currently records 7 migrations (0000-0006); after 0007 it should record 8.
- Playwright: projects iphone, android, desktop (1280x800). The dev server runs on PW_PORT and reads
  the catalogue from the seed CSVs (`SHAPER_BLANKS_SOURCE=seed-csv`). Clerk never settles under the
  fake keys, so every test runs signed out. The desktop baseline spec never opens the menu.
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: A place on the shaper's account to remember which blank makers they want to see</name>
  <files>lib/blanks/vendors.ts, lib/blanks/vendors.test.ts, lib/blank-makers-preference.ts, lib/blank-makers-preference.test.ts, lib/db/schema.ts, lib/db/queries.ts, app/actions/blank-makers.ts, lib/db/ownership.test.ts, scripts/check-preference-columns.ts, drizzle/0007_hidden_blank_makers.sql, drizzle/meta/0007_snapshot.json, drizzle/meta/_journal.json</files>
  <precondition>The main checkout's development env file is reachable from this worktree: the before-check below prints its two-line report naming hidden_blank_makers as missing (exit 1), not "Could not check the user_preferences columns".</precondition>
  <reversibility rating="reversible">One nullable text column on the development branch only. Nothing else reads it until this plan's own code, it can be removed later with no data any other feature needs, and Neon's "Reset from parent" restores the development branch. Production is the founder's separate step after this plan.</reversibility>
  <behavior>
    - vendors: KNOWN_BLANK_VENDORS equals, in order, the set of distinct vendors readSeedCatalog() returns (US Blanks, Arctic Foam, Marko Foam). That is the drift guard: a fourth CSV maker fails this test.
    - vendors: filterShownBlanks(items, [], vendorOf) returns the very same array (same reference). With ["Arctic Foam"] it drops exactly the Arctic Foam items and keeps order. An item whose vendor is not a known maker is always kept.
    - vendors: blankMakersNote([]) is null. ["Arctic Foam"] gives "Showing US Blanks and Marko Foam only — change in Settings". ["Arctic Foam","Marko Foam"] gives "Showing US Blanks only — change in Settings". Names always come in KNOWN order, whatever order the hidden list has.
    - vendors: catalogsPhrase([]) is exactly "the three catalogs". ["Arctic Foam"] gives "the US Blanks and Marko Foam catalogs". ["Arctic Foam","Marko Foam"] gives "the US Blanks catalog".
    - preference: parseHiddenBlankMakers keeps only known maker names (strings, exact case), removes repeats and returns KNOWN order. Anything that is not an array gives null. An array hiding every known maker gives null (all on). An array of only unknown names gives [].
    - preference: parseHiddenBlankMakersColumn(text) reads the JSON text of the account column. null, empty, malformed JSON or a non-array all give null. It never throws.
    - preference: parseHiddenBlankMakersInput (the Server Action's strict reader) returns null to reject the whole call when the value is not an array, is longer than the known list, has any element that is not exactly a known name, has a repeat, or hides every maker. Otherwise it returns the list in KNOWN order.
    - preference: the cookie string carries the percent-encoded JSON, Path=/, Max-Age=31536000 and SameSite=Lax, with no Secure and no HttpOnly. parseBlankMakersCookieValue and readBlankMakersCookie round-trip it, give null for a missing, undecodable or junk value, and never throw.
    - preference: writeBlankMakersToBrowser tries the storage write and the cookie write each on its own. A throwing storage sink still sets the cookie, and the reverse holds too.
    - preference: decideBlankMakersHandoff follows the five rules of decidePreferenceHandoff with fallback []. Signed in with an account value: the account wins and is adopted into the browser. Signed in with only a browser value: it is promoted to the account. Neither: [], with nothing written. Signed out: the browser value or [].
    - preference: isLastShownMaker(hidden, vendor) is true only for the one maker still shown. withMakerShown(hidden, vendor, false) refuses to hide the last shown maker and returns the same makers. Ticking a maker shows it again. The result is always in KNOWN order.
    - preference: hiddenBlankMakersColumnValue(hidden) is the JSON text written to the column, and parseHiddenBlankMakersColumn reads it back unchanged.
  </behavior>
  <action>
Build the storage half of the feature, following the account-preference pattern (Units, the print tick, Fit & Tip Defaults). Implements design points 1 and 5 and the founder's storage decision. Write each test file first (RED), then the module (GREEN).

1. Record the desktop baseline pictures first, for the end-of-plan check: run `shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/*.png` and keep the five hashes for the SUMMARY.

2. Create `lib/blanks/vendors.ts`: pure, with no React, browser, database or Node import. Include:
   - `KNOWN_BLANK_VENDORS`, the readonly list "US Blanks", "Arctic Foam", "Marko Foam" (as const, in catalogue file order), and the type `BlankVendor`.
   - `isKnownBlankVendor(value: unknown)`, a type guard with exact string match.
   - `shownBlankVendors(hidden)`: the known makers in order, minus the hidden ones.
   - `filterShownBlanks<T>(items, hidden, vendorOf)`: returns `items` itself when nothing is hidden, so memo dependencies downstream stay stable and nothing is re-judged; otherwise the items whose vendor is not hidden.
   - `blankMakersNote(hidden)`: null when nothing is hidden, otherwise "Showing {names} only — change in Settings", with an em dash and spaces around it. The names come from shownBlankVendors, joined as "A", "A and B", or "A, B and C".
   - `catalogsPhrase(hidden)`: "the three catalogs" when nothing is hidden, otherwise "the {names} catalog" for one maker shown and "the {names} catalogs" for more, with the same join.
   Doc-comment the module in plain English: why the hidden set is stored rather than the shown set (a maker added later starts on), and why the known list is a literal checked against the CSVs rather than read from them (seed-files.ts reads the disk and is Node only, and this runs in the browser). Tests go in `lib/blanks/vendors.test.ts`. The drift test imports `readSeedCatalog` from `./seed-files`.

3. Create `lib/blank-makers-preference.ts`, pure and as dependency-free as `lib/fit-defaults-preference.ts`. It imports only `./blanks/vendors` and `./preference-handoff`. It exports the constants `BLANK_MAKERS_STORAGE_KEY` and `BLANK_MAKERS_COOKIE_NAME` (both "shaper-blank-makers") and `BLANK_MAKERS_COOKIE_MAX_AGE_SECONDS` (31536000), and every function named in the behavior block: parseHiddenBlankMakers, parseHiddenBlankMakersColumn, parseHiddenBlankMakersInput, hiddenBlankMakersColumnValue, blankMakersCookieString, parseBlankMakersCookieValue, readBlankMakersCookie, writeBlankMakersToBrowser (with sinks `{ setStorage, setCookie }` exactly like the fit-defaults one), `BlankMakersHandoff` (`{ hidden, adoptIntoBrowser, promoteToAccount }`), decideBlankMakersHandoff, isLastShownMaker and withMakerShown. Mirror the fit-defaults module's doc-comment register. In plain English, say that null means "not chosen" and renders as every maker on, and that a default nobody chose is never written. Also say that a value hiding every maker is read as all on, so the list can never be emptied. Tests go in `lib/blank-makers-preference.test.ts`, in the style of `lib/fit-defaults-preference.test.ts`.

4. Extend the read-only proof `scripts/check-preference-columns.ts` BEFORE touching the schema. Add `{ name: "hidden_blank_makers", type: "text" }` to its column list and to the `column_name in (...)` list of its information_schema select. Change the summary wording so the line reads, for example: `user_preferences: planer_max_depth_mm double precision, deck_skin_mm double precision, tip_style text, hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm kept`. Keep the rest exactly as it is: select-only, the two printed lines, exit 1 on any missing or wrong column or when the retired column is gone, only names, types and a count ever printed, and the `--verbose` failure behaviour. Update the header: it now also proves quick task 260926-wmf's `hidden_blank_makers` (migration 0007). Keep its production one-liner exactly as it stands and add that the founder runs it after `npm run db:migrate:prod` and before this quick task's deploy too. Then run the BEFORE check as its own command, exactly `CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts`. Expect exit 1 with `hidden_blank_makers missing (3 of 4 columns)` and `drizzle migrations recorded: 7` (whatever count it prints, the after-check must print one more). Paste both lines and the exit code into the SUMMARY.

5. In `lib/db/schema.ts`, add `hiddenBlankMakers: text("hidden_blank_makers")` to `userPreferences` after `tipStyle`, nullable with no default. The comment explains it holds the makers a shaper switched off in the gear menu, as JSON text of catalogue vendor names; null means not chosen, which means every maker is on; and the allow-list lives in `lib/blank-makers-preference.ts`. Add one sentence to the header paragraph. Do not change any other column. The retired `extraCenterThicknessMm` stays declared.

6. Generate the migration: `npm run db:generate -- --name hidden_blank_makers` (no database needed). This writes `drizzle/0007_hidden_blank_makers.sql`, `drizzle/meta/0007_snapshot.json` and the journal entry. The SQL must be exactly the single statement `ALTER TABLE "user_preferences" ADD COLUMN "hidden_blank_makers" text;`. If drizzle-kit asks any question, proposes any other statement (a removal, a renaming, a type change, a second table) or writes anything else into the SQL, STOP: undo the generated files and report back without migrating. Never hand-edit the generated files.

7. Apply it to the DEVELOPMENT branch only, as its own command: `MIGRATE_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx drizzle-kit migrate`. Its "applied successfully" line proves nothing on its own. Then run the AFTER check with the same command as step 4. Expect exit 0, `hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm kept` and one more migration recorded than before. Paste it into the SUMMARY's "Database evidence (Neon development branch only)" block, following 12-02-SUMMARY.md's shape. Never read, print, copy or write any env file, never name an env-file path in a command that does anything else, and never touch production.

8. In `lib/db/queries.ts`, add `readBlankMakersPreference(clerkId): Promise<BlankVendor[] | null>`. It is one select of ONLY `hiddenBlankMakers` where `clerkUserId` matches, read through `parseHiddenBlankMakersColumn`, and a missing row gives null. Follow the read-only contract doc of its siblings. Every other read keeps selecting only its own columns.

9. Create `app/actions/blank-makers.ts` ("use server"), copying `app/actions/units.ts` / `fit-defaults.ts`. Export exactly one action, `saveBlankMakersPreference(hidden: readonly string[]): Promise<void>`. It calls `await auth()` first and returns quietly when signed out. It runs `parseHiddenBlankMakersInput` and returns without writing on null. It upserts `{ clerkUserId: userId, hiddenBlankMakers: hiddenBlankMakersColumnValue(parsed) }`, and on conflict of `userPreferences.clerkUserId` sets only `hiddenBlankMakers` and `updatedAt`. No user id parameter. Doc comment in the house register: the whole hidden list is one value, like Units, so the last pick wins across devices.

10. Extend `lib/db/ownership.test.ts` for the new file in all five places (path constant, source read, auth-before-db list, signatures list, owned-table statement list). Add an "app/actions/blank-makers.ts exports exactly the expected action and no others" test expecting `["saveBlankMakersPreference"]`, and update the first test's title to name the new file.

11. Gates, in a fresh worktree: `npx next typegen` once, then `npx tsc --noEmit`, the targeted vitest files, the whole `npx vitest run` and `npm run lint` (0 errors, and no new warnings in these files). Commit once, with a subject for shapers, for example: `feat: a place on your account to remember which blank makers you want to see`, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  </action>
  <verify>
    <automated>npx next typegen && npx tsc --noEmit && npx vitest run lib/blanks/vendors.test.ts lib/blank-makers-preference.test.ts lib/db/ownership.test.ts && npx vitest run && npm run lint && test "$(cat drizzle/0007_hidden_blank_makers.sql)" = 'ALTER TABLE "user_preferences" ADD COLUMN "hidden_blank_makers" text;'</automated>
    <automated>CHECK_ENV_FILE=/Users/kontoes/Code/shaper/.env.local npx --no-install tsx scripts/check-preference-columns.ts   # its own command: exit 1 before step 7, exit 0 after</automated>
  </verify>
  <done>
    - Both new test files pass, as do the ownership test, the whole unit suite, tsc and lint.
    - `drizzle/0007_hidden_blank_makers.sql` is exactly one ADD COLUMN statement, generated rather than hand-written, with its snapshot and journal entry (idx 7, tag 0007_hidden_blank_makers).
    - The check script exited 1 before the migrate and 0 after on the development branch. Both outputs are pasted into the SUMMARY with their exit codes, and production was not touched.
    - `git diff --name-only` for this commit lists exactly the twelve files in `<files>`. Nothing under `components/`, `e2e/` or `app/layout.tsx` has changed yet, and `package.json` and `package-lock.json` are unchanged.
    - The only imports in `lib/blanks/vendors.ts` and `lib/blank-makers-preference.ts` are each other and `./preference-handoff`.
  </done>
</task>

<task type="auto">
  <name>Task 2: Tick boxes for US Blanks, Arctic Foam and Marko Foam in the settings menu</name>
  <files>lib/blank-makers-server.ts, components/blank-makers-provider.tsx, app/layout.tsx, components/settings-menu.tsx, components/design/phone-menu.tsx, e2e/blank-makers.spec.ts</files>
  <action>
Wire the stored choice to the screen and draw the tick boxes. Implements design point 2 and the browser half of the founder's storage decision.

1. Create `lib/blank-makers-server.ts`, copying `lib/fit-defaults-server.ts`'s `resolveFitDefaultsHandoff`. `resolveBlankMakersHandoff(): Promise<BlankMakersHandoff>` gets `await auth()`; reads the browser value with `parseBlankMakersCookieValue(cookieStore.get(BLANK_MAKERS_COOKIE_NAME)?.value ?? null)`; when signed in, reads the account with `readBlankMakersPreference` inside try/catch, which degrades to null on any failure (a database problem, or production not yet carrying the column between a push and the production migration) and logs "Shaper: failed to read blank makers preference"; then calls `decideBlankMakersHandoff`.

2. Create `components/blank-makers-provider.tsx` ("use client"), a near copy of `components/fit-defaults-provider.tsx` without the dialog. It needs the same-tab listener set plus the `storage` event, the blocked-storage fallback, a RAW-string snapshot (the value is an array, so parse once per change in a useMemo through parseHiddenBlankMakers, treating null as []), the `reconciledRef` guard, the adoption effect, the once-only promotion effect, and `createPreferenceWriteQueue` with `saveBlankMakersPreference` as its save and real timers, disposed on unmount. The context value is `{ hidden: readonly BlankVendor[]; setMakerShown(vendor: BlankVendor, shown: boolean): void }`. `setMakerShown` reads fresh from the snapshot and computes the next list with `withMakerShown`. It does nothing when the list is unchanged, which includes the refused last-maker case. Otherwise it writes the browser store, flips reconciled, emits synchronously so the list changes on this same tap, and asks the queue to save the whole new list. Export `useBlankMakers()`, which throws outside the provider like its siblings. Doc comment: like Units, this describes how a shaper works, not what a board is. It lives outside the design store and a saved board's data, so ticking never marks a board unsaved.

3. In `app/layout.tsx`, add `resolveBlankMakersHandoff()` as a fourth entry in the existing `Promise.all`. Mount `<BlankMakersProvider handoff={blankMakersHandoff}>` directly inside `FitDefaultsProvider`, wrapping `ThemeProvider`, so the nav's gear, the phone menu and every screen can read it. Update the layout's doc comment from three handoffs to four.

4. In `components/settings-menu.tsx`'s `SettingsMenuContent`, add a new sibling `Menu.Group` with `className="mt-1.5"` directly AFTER the existing BLANKS group (the Fit & Tip Defaults row). Its first child is a `Menu.GroupLabel` reading `Blank Makers`, in the same classes as the other group labels. Then comes one `BlankMakerRow` per entry of `KNOWN_BLANK_VENDORS`. The component returns a `Menu.CheckboxItem` directly, with no wrapper DOM node, as ThemeRow does. Each row:
   - checked when the maker is not hidden; `onCheckedChange={(checked) => setMakerShown(vendor, checked)}`; `closeOnClick={false}` so several can be ticked in one visit; `label={vendor}` for typeahead.
   - `disabled` when `isLastShownMaker(hidden, vendor)`.
   - row classes matching the Fit & Tip row: flex, gap-2.5, rounded-md, px-2, py-1.5, outline-none, select-none, `coarse:min-h-11`, `data-highlighted:bg-surf-well` and cursor-pointer, plus `data-disabled:cursor-default`. Pointer decides size only; nothing reads width.
   - on the left, a square tick box: a 16px (size-4) shrink-0 box with 4px corners and a 1px border in the surf-ink-muted colour, holding a `Menu.CheckboxItemIndicator` that shows `CheckIcon` (size-3.5, text-surf-accent-ink) when ticked. That is the same accent-on-panel pair the radio rows' check already uses, so no new colour pair needs a contrast check.
   - then the maker's name (text-sm text-surf-ink). On the locked row only, a second line in text-[11px] text-surf-ink-muted reads `Keep at least one maker ticked`. Never fade anything with opacity.
   Update `SettingsMenuContent`'s header comment to mention the BLANK MAKERS group and why rows are components returning the item directly.

5. Make both menus fit the screen. Add `max-h-(--available-height) overflow-y-auto` to the `Menu.Popup` className in `components/settings-menu.tsx` AND in `components/design/phone-menu.tsx`. Measured at plan time on the iPhone 14 profile: the phone popup is already 664px tall from y=60 on a 664px screen, 60px past the bottom edge, and this group adds about 180px more. Add a one-line comment giving the reason. Touch nothing else in phone-menu.tsx.

6. Create `e2e/blank-makers.spec.ts`, running on all three projects. Copy its helpers from `e2e/fit-defaults.spec.ts`: the banner/tip dismissal init scripts, `menuTrigger` (Settings on desktop, the banner's Menu on phones) and the open-with-retry idiom, adapted to wait for `page.getByRole("group", { name: "Blank Makers" })`. Locate rows as `group.getByRole("menuitemcheckbox", { name: /^US Blanks/ })` and so on. Import `KNOWN_BLANK_VENDORS` from `../lib/blanks/vendors` and `BLANK_MAKERS_COOKIE_NAME` / `BLANK_MAKERS_STORAGE_KEY` from `../lib/blank-makers-preference`. Tests, all starting on /design/outline:
   - "all three makers are ticked for a shaper who never touched them": three rows in KNOWN order, each `aria-checked="true"`, none `aria-disabled="true"`. No cookie named BLANK_MAKERS_COOKIE_NAME in `page.context().cookies()`, and nothing under the storage key (a default nobody chose is never written). Once the popup's zoom-in animation has finished (copy the `settled` helper from fit-defaults.spec.ts), its bounding box bottom is at or above the viewport height, so the whole menu fits the screen. On the iphone and android projects, each row's offsetHeight is at least 44.
   - "unticking a maker is remembered by the browser after a reload": untick Arctic Foam and see it become `aria-checked="false"` with the menu still open. The cookie is present, and its decoded JSON value is `["Arctic Foam"]`. Reload and reopen the menu: Arctic Foam is still unticked, and the other two are ticked.
   - "the last ticked maker cannot be unticked": untick Arctic Foam, then Marko Foam. The US Blanks row is `aria-disabled="true"`, stays `aria-checked="true"` and contains `Keep at least one maker ticked`. Click it with `{ force: true }` (Playwright otherwise waits on an aria-disabled element) and it is still ticked. Tick Marko Foam again and US Blanks is no longer disabled.
   The account round trip is not testable here (Clerk never settles under the suite's fake keys). It is the recorded human check below.

7. Gates: `npx tsc --noEmit`, `npx vitest run`, `npm run lint`. First check that nothing is listening on the port (`lsof -ti :3162` prints nothing), then run `IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/blank-makers.spec.ts e2e/fit-defaults.spec.ts e2e/phone-layout.spec.ts e2e/touch-sizing.spec.ts e2e/desktop-baseline.spec.ts`. Commit once, for example: `feat: tick boxes for US Blanks, Arctic Foam and Marko Foam in the settings menu`, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run && npm run lint && IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/blank-makers.spec.ts e2e/fit-defaults.spec.ts e2e/phone-layout.spec.ts e2e/touch-sizing.spec.ts e2e/desktop-baseline.spec.ts</automated>
    <human-check>Signed in on a real account (end-of-plan walk-through, after the production migration): untick Marko Foam in the gear menu, then open the site signed in on a second browser or device. Marko Foam is unticked there too. Tick it again and the first browser follows after a reload.</human-check>
  </verify>
  <done>
    - The gear menu and the phone Menu both show BLANK MAKERS with three ticked tick boxes. Ticking and unticking saves at once and survives a reload. The last ticked maker is disabled with its hint.
    - The popup fits the screen on all three projects, and the rows are at least 44px on both phones.
    - The new spec passes 3 tests on each of the 3 projects. fit-defaults, phone-layout, touch-sizing and the desktop baseline pass unchanged, and `git status --porcelain -- e2e/desktop-baseline.spec.ts-snapshots` prints nothing.
    - The ROCKER list is not filtered yet. That is Task 3, and nothing under `components/rocker/` changed in this commit.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: An unticked blank maker leaves the ROCKER blank list</name>
  <files>lib/geometry/blank-reasons.ts, lib/geometry/blank-reasons.test.ts, components/rocker/use-blank-list.ts, components/rocker/blank-picker.tsx, components/rocker/blank-flag.tsx, e2e/blank-makers.spec.ts</files>
  <behavior>
    - emptyListMessage with no fifth argument returns exactly today's text (every existing assertion in blank-reasons.test.ts is untouched and passes).
    - emptyListMessage("length", numbers, system, "the US Blanks catalog") reads "... and the longest blank in the US Blanks catalog is ...". The "both" body reads "Nothing in the US Blanks and Marko Foam catalogs is both ...".
    - nothingFitsSentence() equals NOTHING_FITS_SENTENCE, which is unchanged. nothingFitsSentence("the US Blanks catalog") is "No blank in the US Blanks catalog fits this board right now."
  </behavior>
  <action>
Make the list honour the tick boxes. Implements design point 3 (and the remaining tests of design point 4). The filter runs in the browser, inside the hook, so a tick applies without a reload and the board's own blank is never involved.

1. RED then GREEN in `lib/geometry/blank-reasons.ts` and its test. Give `emptyListMessage` an optional last parameter `catalogs: string = "the three catalogs"` and use it in place of the two literal "the three catalogs" phrases (the length body and the both body). Add `nothingFitsSentence(catalogs: string = "the three catalogs")`, which returns "No blank in {catalogs} fits this board right now.", and redefine `NOTHING_FITS_SENTENCE` as `nothingFitsSentence()` so its value is byte-for-byte the same. Add the new cases to `lib/geometry/blank-reasons.test.ts` without editing or deleting any existing line. This module does not import the vendors module: callers pass the phrase in.

2. In `components/rocker/use-blank-list.ts`, read `hidden` from `useBlankMakers()`. Keep `prepareCatalogue(records)` exactly as it is, so the 150-odd blanks are still fitted once per visit and a tick never re-fits one. Then filter its result: `shown = useMemo(() => filterShownBlanks(catalogue.prepared, hidden, (blank) => blank.record.vendor), [catalogue.prepared, hidden])`. Judge `listBlanks` over `shown`, and return `prepared: shown` (so the empty-list extremes only quote shown makers) alongside the unchanged `recordOf`. This single change filters both the list and the flag's offer (`nearestFit` reads `list.fits`). Update the hook's doc comment: the verdicts still depend only on the board and the fit rules, and the maker filter only decides which blanks are judged at all. With every maker on, `filterShownBlanks` hands back the same array, so nothing is re-judged.

3. In `components/rocker/blank-picker.tsx`:
   - In `BlankBrowser`, directly under the existing intro `div`, render `blankMakersNote(hidden)` when it is not null, as its own `div` with `data-blank-makers-note` and the intro's classes (text-xs text-surf-ink-muted). With every maker on, nothing is rendered, so the ROCKER picture does not move.
   - In `BlankListBody`, pass `catalogsPhrase(hidden)` as the new last argument of `emptyListMessage`.
   - Update the file header's "one list across all three vendors" sentence to say the list covers the makers ticked in the settings menu.
   Do not change the picked card, `isSameBlank`, the search, the row markup or state C.

4. In `components/rocker/blank-flag.tsx`'s `OfferBody`, render `nothingFitsSentence(catalogsPhrase(hidden))` in place of `NOTHING_FITS_SENTENCE` for F5 (and drop that import if it becomes unused). Update the header's offer bullet: the offer only considers makers ticked in the settings menu. `PickedBlankFlag`, the floor checks and `BlankFlag` stay as they are. The board's own blank is never filtered.

5. Leave these untouched, which is how presets keep their picks and how the board keeps its blank: `components/design/design-store.tsx`, `lib/blanks/preset-blanks.ts`, `lib/db/blanks.ts`, `app/design/rocker/page.tsx`, `components/rocker/rocker-editor.tsx`, `components/rocker/rocker-controls.tsx`.

6. Add to `e2e/blank-makers.spec.ts` on all three projects. Copy `openRocker`, `blankList`, `firstFittingRow`, `pickedCard` and `typeCenterThickness` from `e2e/rocker-blanks.spec.ts`, including its hydration wait. Close the menu with Escape before touching the list.
   - "unticking a maker leaves its blanks out of the ROCKER list and says so": open ROCKER. The note `[data-blank-makers-note]` is absent. Expand with `Show all N blanks`, collect every row's aria-label, and confirm some contain "Arctic Foam". Search "Arctic" and see rows, then clear the search. Untick Arctic Foam in the menu. The note reads exactly `Showing US Blanks and Marko Foam only — change in Settings`. Expand again: no row label contains "Arctic Foam", some contain "US Blanks" and some contain "Marko Foam", and the total is smaller than before. Search "Arctic" and get `No blanks match "Arctic".`. Untick Marko Foam too, and the note reads `Showing US Blanks only — change in Settings`.
   - "a picked blank stays on the board when its maker is unticked, and the offer never names that maker": open ROCKER. Read the first fitting row's aria-label and find its maker V among KNOWN_BLANK_VENDORS. Pick it and remember its name, then untick V in the menu. The picked card still shows the same name and still names V on its meta line. Type a centre of `3 1/2` with `typeCenterThickness`. The flag says "This blank doesn't fit your board" and the card still shows the same name. Then EITHER `[data-blank-offer]` exists and does not contain V, OR the flag contains the F5 line naming the two shown makers' catalogs (build the expected text with nothingFitsSentence and catalogsPhrase imported from the lib files, never typed by hand). Finally, click Change Blank and search V's name, and get the "No blanks match" line.

7. Final gates. Run `npx tsc --noEmit`, `npx vitest run` and `npm run lint`. Check the port is free (`lsof -ti :3162` prints nothing). Run `IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/blank-makers.spec.ts e2e/rocker-blanks.spec.ts e2e/touch-sizing.spec.ts e2e/fit-defaults.spec.ts e2e/desktop-baseline.spec.ts`, then the FULL suite with `IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test`. Every test must pass: this plan re-records no picture, so any failure is real and must be investigated, never re-recorded away. Re-run `shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/*.png` and confirm the five hashes match Task 1's step 1. Put both lists in the SUMMARY. Leave `npm run build` to the orchestrator after the merge (Turbopack can't build from a worktree). Commit once, for example: `feat: an unticked blank maker leaves the ROCKER blank list`, ending with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.

8. Write the SUMMARY in plain English for a shaper: what the tick boxes do, what is remembered where, that the picked blank and presets are untouched, the database evidence block from Task 1, the baseline hashes, and the production step below restated for the orchestrator.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run && npm run lint && IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test e2e/blank-makers.spec.ts e2e/rocker-blanks.spec.ts e2e/touch-sizing.spec.ts e2e/fit-defaults.spec.ts e2e/desktop-baseline.spec.ts && IS_WEBPACK_TEST=1 PW_PORT=3162 npx playwright test && test -z "$(git status --porcelain -- e2e/desktop-baseline.spec.ts-snapshots)"</automated>
  </verify>
  <done>
    - With a maker unticked, the ROCKER list and the offer never show its blanks, and the intro carries the one-line note. The judging of every shown blank is unchanged.
    - The picked blank survives its maker being unticked. Presets and the design store are untouched: `git diff --name-only` since the plan's base commit lists none of the six files in step 5.
    - The blank-reasons test diff has additions only (`git diff --numstat` shows 0 deletions for lib/geometry/blank-reasons.test.ts), and NOTHING_FITS_SENTENCE still reads "No blank in the three catalogs fits this board right now."
    - The new spec passes 5 tests on each of the 3 projects. The full Playwright suite passes. The desktop baseline passes 5 of 5 with byte-identical PNG hashes.
    - tsc, the full unit suite and lint are clean, and package.json and package-lock.json are unchanged across all three commits.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → Server Action | `saveBlankMakersPreference` receives a list from client code, which anyone can call with any value |
| browser cookie / localStorage → server render and provider | a hand-edited cookie or storage entry is read on every request and every tab |
| account column → reader | a drifted or hand-edited `hidden_blank_makers` value is read on every signed-in request |
| developer shell → development database | the migrate and the read-only check run against the Neon development branch from a worktree |
| deploy → production database | Drizzle names every column on every insert, so code that knows the column must not reach a database that lacks it |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wmf-01 | Tampering | app/actions/blank-makers.ts | medium | mitigate | `parseHiddenBlankMakersInput` is all-or-nothing: an array no longer than the known list, every element exactly a known maker name, no repeats, not hiding every maker. Anything else writes nothing. The column is only ever written as `hiddenBlankMakersColumnValue(parsed)`. |
| T-wmf-02 | Elevation of Privilege | app/actions/blank-makers.ts | high | mitigate | Identity comes only from `await auth()`, which runs before the database call, and there is no user id parameter. `lib/db/ownership.test.ts` is extended to enforce both, plus the owned-table constraint and "exports exactly one action". |
| T-wmf-03 | Tampering | cookie, localStorage, account column readers | low | mitigate | `parseHiddenBlankMakers`, `parseHiddenBlankMakersColumn` and the cookie readers keep only known names and never throw. Malformed values, and values hiding every maker, read as every maker on (fail soft). |
| T-wmf-04 | Information Disclosure | scripts/check-preference-columns.ts | medium | mitigate | It stays select-only, against information_schema and the migrations count. It prints only column names, types and a count, never the connection string or row data. Failures print the error kind and code only, unless `--verbose` is given. No env file is ever read, printed or written by hand. |
| T-wmf-05 | Denial of Service | production user_preferences inserts | high | mitigate | Additive-first order (CLAUDE.md Database): the founder runs `npm run db:migrate:prod` and the read-only check BEFORE the deploy, and the orchestrator holds the push until the check exits 0. The account read degrades to the cookie on failure, and the write queue's retry ladder is bounded. |
| T-wmf-06 | Tampering | drizzle/0007_hidden_blank_makers.sql | high | mitigate | The generated SQL must equal the single ADD COLUMN statement (a positive exact-match gate). Anything else stops the task before any migrate. The development branch only, and production is never touched here. |
| T-wmf-07 | Information Disclosure | shaper-blank-makers cookie | low | accept | It is not HttpOnly and not Secure, like its siblings: the browser is the writer, and a list of public catalogue maker names carries nothing sensitive. |
| T-wmf-08 | Tampering (XSS) | menu rows, ROCKER note | low | mitigate | Maker names come only from the `KNOWN_BLANK_VENDORS` literal after the allow-list, and they are rendered as React text, never as HTML. |

No package is installed (no new dependency, and package.json is unchanged), so there is no supply-chain row.
</threat_model>

<verification>
- `npx tsc --noEmit`, `npx vitest run` and `npm run lint` are clean after every commit (three commits, one per task).
- The development database proof: exit 1 before and exit 0 after, both pasted into the SUMMARY. The 0007 SQL is exactly one ADD COLUMN.
- The Playwright runs: blank-makers (5 tests x 3 projects), rocker-blanks, touch-sizing, fit-defaults, phone-layout and the desktop baseline in the worktree, then the full suite, all green.
- The desktop baseline PNG hashes are identical before and after, and `git status` shows no change under `e2e/desktop-baseline.spec.ts-snapshots`.
- Nothing in the design store, the preset blanks, the server catalogue read or the ROCKER page loader changed.
</verification>

<success_criteria>
- A shaper sees BLANK MAKERS in the settings menu with three ticked boxes, on a phone and on a desktop, and can reach every box.
- Unticking a maker removes its blanks from the ROCKER list and the offer at once, and says so in one line. The last maker can't be unticked. The picked blank and presets are untouched.
- The choice is remembered in the browser now and on the account once production is migrated.
- With everything ticked, the app looks and reads exactly as before.
</success_criteria>

<output>
Create `.planning/quick/260926-wmf-blank-maker-tick-boxes-in-settings-all-o/260926-wmf-SUMMARY.md` when done, with the "Database evidence (Neon development branch only)" block in 12-02-SUMMARY.md's shape, the baseline hashes before and after, and the production step below.
</output>

## Production step for the founder (after the merge, BEFORE any deploy)

The orchestrator must NOT push `main` or otherwise deploy this work until both steps below have run
and the check has exited 0. The reason: Drizzle names every column of `user_preferences` on every
insert. Code that knows `hidden_blank_makers` would break every Units, print-option and Fit & Tip
Defaults save for signed-in shapers until the column exists in production.

1. From the main checkout, on the branch that carries migration 0007 (local `main` after the merge):
   `npm run db:migrate:prod`
2. Then, as its own command, the read-only proof (the shape documented in the header of
   `scripts/check-preference-columns.ts`):
   `bash -c 'trap "rm -f .env.production.pull" EXIT; npx vercel env pull --yes --environment=production .env.production.pull && CHECK_ENV_FILE=.env.production.pull npx --no-install tsx scripts/check-preference-columns.ts'`
   Expect `... hidden_blank_makers text (4 of 4 columns); extra_center_thickness_mm kept`, one more
   migration recorded than before, and exit 0.
3. Only then push `main` and let Vercel deploy. After that, walk the signed-in account round trip
   (Task 2's human check) on www.shaperassistant.com.
