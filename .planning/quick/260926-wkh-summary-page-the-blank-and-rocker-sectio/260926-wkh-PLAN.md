---
phase: quick-260926-wkh
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/summary/order-form.tsx
  - e2e/summary-blank.spec.ts
autonomous: true
requirements: [QT-260926-wkh]

estimate:
  # Small in edited lines, heavy in browser-test output. Task 1 is one destructured field, one
  # derived string, one label, two comments and a new two-test browser spec, then tsc/vitest/lint
  # and that spec on three projects. Task 2 is one class, one comment and a third browser test,
  # then every Summary spec, the desktop baseline and a hash check. Most of the cost is the runs.
  tokens: 60000
  raw_tokens: 60000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "On the Summary, page 2's Shaper Use Only box has a field labelled Blank on its own full-width line directly above Board # and Price. The old two-part label is gone. Board Name, Board # and Price read exactly as before."
    - "When the board has no blank (a fresh board, or one whose blank was removed on ROCKER), the Blank field is an empty ruled line the shop writes on, the same as before."
    - "After a shaper picks a blank on ROCKER, the Blank field prints that blank read-only as vendor then name on one line (for example US Blanks 6'2\"A). That is the same identity ROCKER gives it, taken from the board's own copy of the blank."
    - "Every blank in the three catalogues prints whole in the Blank field, with no '…' cut-off, both on screen and on paper. Board # and Price keep a ruled line to write on."
    - "Nothing else on the form changes. The five desktop reference pictures are byte-identical (SHA-256 before and after), every Summary browser spec passes, and components/summary/order-form-primitives.tsx is untouched."
  artifacts:
    - path: components/summary/order-form.tsx
      provides: "The Shaper Use Only box's Blank field, printing the picked blank's vendor and name or a ruled line"
      contains: "label=\"Blank\""
    - path: e2e/summary-blank.spec.ts
      provides: "Browser proof covering three things: the ruled line with no blank, the picked blank's name printing, and every catalogue name fitting on screen and in print"
      contains: "parseCsv"
  key_links:
    - from: components/summary/order-form.tsx
      to: components/design/design-store.tsx
      via: "useDesign().blank (BoardBlank | null); the printed text is blank.copy.vendor + ' ' + blank.copy.name"
      pattern: "blank\\.copy\\.vendor"
    - from: e2e/summary-blank.spec.ts
      to: lib/blanks/csv.ts
      via: "relative import of parseCsv to read vendor and blank_name from db/seed/blanks/*.csv for the fits-every-name check"
      pattern: "from \"\\.\\./lib/blanks/csv\""
---

<objective>
The founder's words: "the summary page has a Blank and Rocker section. Let's reduce the name to just Blank, and add the blank name used on the rocker page."

In the app: page 2 of the printed order form, the Shaper Reference sheet, ends with a shaded **Shaper Use Only** box. Its second row holds three write-in lines: a two-part blank-and-rocker field, Board # and Price. This plan renames that field to **Blank**. When the board was designed on a blank picked on ROCKER, the field prints that blank's vendor then name, read-only (`US Blanks 6'2"A`). When the board has no blank, it stays a ruled line for the shop to write in.

The brief put this box on page 1. It is on page 2: the code's own comment says the front is the customer's copy and the back is the shaper's.

**One departure from the brief, measured, and settled by the founder (Task 2).** The brief said to keep the field's width share (`flex-[1.4]`). Measured at plan time, that share cuts off 19 of the 162 blank names in the catalogues with a "…", on screen and on paper. Examples: `Marko Foam 10'0" MK-SUP-STD`, `Marko Foam 6'0" M-Regular`, `US Blanks 10'4"A SUP EPS`. `OrderFormField` truncates on purpose and must not be redesigned, so the field needs more room. **The founder chose (2026-09-27): the Blank field gets a full-width line of its own, directly above the Board # and Price row.** Every name then has the whole box width (about 404 px on screen and 328 px in print — more than the widest name needs), and Board # and Price each keep half of their own row, a LONGER writing line than today, not a shorter one. Task 1 stands on its own with the old share; Task 2 makes the layout change.

Purpose: the shop's record of the job names the exact blank the board's numbers were cut from, with nothing to copy across by hand from ROCKER.
Output: the relabelled, live Blank field. A new browser spec covers three things: the blank line, the printed name, and every catalogue name fitting on screen and on paper. The SUMMARY carries a plain-English note for the founder.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@components/summary/order-form.tsx
@components/summary/order-form-primitives.tsx
@e2e/rocker-blanks.spec.ts

<interfaces>
From components/design/design-store.tsx (DesignContextValue, read through `useDesign()`):
- `blank: BoardBlank | null`: the board's blank by value, or null for the hand-set rocker. The default board has `blank: null`.

From lib/geometry/blank.ts:
- `interface BoardBlank { copy: BlankRecord; placement; nose12Offset; tail12Offset; deckSkin; tipStyle; fineTuneSurface }`
- `interface BlankRecord { vendor: string /* e.g. Marko Foam */; name: string /* e.g. 6'0" M-Regular */; ... }`

From components/summary/order-form-primitives.tsx (DO NOT EDIT):
- `OrderFormField({ label, value?, onChange?, placeholder?, prefix?, className?, labelClassName? })`. With `value` omitted or empty it draws a ruled line holding a non-breaking space. With `value` and no `onChange` it draws a read-only printed value in a `truncate` span. The markup is a `<label>` holding a caption `<span>` with the text `{label}:` (a `prefix` span when set) and then the value `<span>`, which is the label's last child.

How ROCKER names a blank. No shared formatter exists (grep at plan time). Every place writes the same inline template, vendor, one space, name:
- components/rocker/blank-picker.tsx:114: the row's accessible name is `Use ${record.vendor} ${record.name}`, plus `, doesn't fit: <reason>` on a greyed row.
- components/rocker/rocker-datasheet.tsx:230: `BLANK — ${vendor} ${name}` (upper-cased).
- components/rocker/rocker-viewer.tsx:705: the drawing's description.

From lib/blanks/csv.ts (no imports, safe to import from e2e by relative path; e2e/prod/slider-dots.spec.ts already imports lib/ modules this way):
- `parseCsv(text: string): string[][]`. Row 0 is the header. The catalogue headers start `vendor,blank_name,...`.

Browser-test idioms to copy from e2e/rocker-blanks.spec.ts (helpers there are module-local; each spec in this repo carries its own):
- `dismissChrome(page)`: the sign-in banner key in sessionStorage and the toolbar tip key in localStorage, set before navigation.
- `openRocker(page)`: goto /design/rocker, wait for the list named "Blanks", then the hydration wait on the first row button and the search box (`__reactFiber` check).
- The first fitting row is `list.locator('li[data-group="fits"] button').first()`. The picked card is `[data-picked-blank]`.
- Walking between screens keeps the design: `page.getByRole("link", { name: "RAILS", exact: true }).filter({ visible: true }).first().click()`. The Summary link's name is `SUMMARY` on the desktop nav and the phone tab bar alike (components/site-nav.tsx NAV_LINKS).
- Print media: `page.emulateMedia({ media: "print" })` / `"screen"`, as in e2e/summary-rail-instructions-fit.spec.ts.
</interfaces>

<plan_time_measurements>
Measured by the planner on main at 1d2ee9b. The probe was a throwaway Playwright script against a seed-csv dev server, run on Desktop Chrome at 1280×800. It picked the first fitting blank on ROCKER and walked to SUMMARY by the nav link. Then, in the order form's DOM, it swapped the field's caption text for `Blank:` and put each catalogue name into the value span, comparing `scrollWidth` with `clientWidth`. Print figures are under `emulateMedia({ media: "print" })`. Nothing was written to the repo. These numbers tell the executor what to expect; they do not replace its own runs.

- The first fitting blank for the default board is `US Blanks 6'2"A`. The row's aria-label reads `Use US Blanks 6'2"A` and its `[data-blank-name]` reads `6'2"A`. The pick survives the client-side walk to SUMMARY.
- The field's caption `<span>` sits directly inside a `<label>`, which is what the spec's locator depends on.
- Value type size on page 2 is 18.9 px on screen and 15.8 px in print.
- The catalogue has 162 unique vendor-plus-name strings. The widest is `Marko Foam 10'0" MK-SUP-STD`: 297 px on screen, 248 px in print. The default board's ROCKER list shows only 141 blanks ("Show all 141 blanks") and omits the widest names. That is why the fits-every-name check reads the catalogue CSVs, not the list.

| Blank field share | Screen: field / room for the name / names cut off | Print: field / room / cut off | Board # and Price room to write, screen · print |
|---|---|---|---|
| flex-[1.4] (today) | 318 / 234 / **19 of 162** | 258 / 187 / **19 of 162** | 123 & 136 · 97 & 107 |
| flex-[2] | 386 / 303 / 0 | 313 / 242 / **3 of 162** | 89 & 102 · 69 & 79 |
| flex-[2.2] (measured, not chosen) | 404 / 321 / 0 | 328 / 257 / 0 | 80 & 93 · 62 & 72 |
| flex-[2.4] | 421 / 338 / 0 | 341 / 271 / 0 | 72 & 85 · 55 & 65 |

With the old caption, the field kept only 123 px (screen) and 94 px (print) of room for its value. The shorter `Blank:` caption alone frees about 110 px, and that is still not enough at flex-[1.4].

Desktop baseline pictures at 1d2ee9b (SHA-256). None of them shows the Summary, so all five must stay byte-identical:
- fins: a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62
- outline: ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0
- rails: 6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373
- rocker: 0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9
- volume: b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34

Nothing in the unit suite or the source-contract tests pins this field. components/summary/order-form-preview.test.ts, order-form-print.test.ts and rail-instructions-sheet.test.ts don't mention its label, its flex share or the field count, and no e2e spec mentions Shaper Use Only, Board # or the old label. So no existing assertion needs updating. The new spec is the first proof of this box.
</plan_time_measurements>
</context>

<tasks>

<task type="tracer">
  <name>Task 1: The order form's Blank field prints the blank picked on ROCKER</name>
  <files>components/summary/order-form.tsx, e2e/summary-blank.spec.ts</files>
  <action>
End to end, one path: the board's blank in the design store → the order form → the printed field. This is a browser test that picks a blank on ROCKER and reads it on SUMMARY.

In components/summary/order-form.tsx, inside `OrderForm`:
1. Add `blank` to the fields destructured from `useDesign()` (around line 205).
2. Next to the other derived labels (after `finSetupLabel`, around line 243), derive the printed text once as a string or undefined. With a blank it is `blank.copy.vendor`, one space, `blank.copy.name`. With no blank it is `undefined`. This is the same inline template ROCKER uses in its DATASHEET group label, its drawing's description and its picker's accessible name. No shared formatter exists and this task does not add one. The text comes from the board's own copy of the blank (Phase 11 D-01), so it names the blank this sheet's numbers were cut from, even after a catalogue correction. It is plain text, so no unit conversion is involved (CLAUDE.md Rule 2 does not apply).
3. In the Shaper Use Only box's second row (line 729), rename the field's label to exactly `Blank`, dropping the ampersand entity and the second word. Pass the derived text as `value`, with no `onChange`, so it prints read-only when there is a blank. With `undefined` the primitive draws its ruled line, unchanged. Keep `className="flex-[1.4]"` in this task; Task 2 owns the width. Keep the element on one line, because Task 2's grep reads that line. Do not touch Board # or Price, and do not edit order-form-primitives.tsx.
4. Update the two comments so they match the box. The block comment above the FormBox (lines 705-714) currently lists "the blank number, the price and the rocker the blank came off" as the shop's record; say instead that the blank, the board number and the price are the shop's record of the job. The inline comment above Board Name (lines 720-721) says the rest of the box is written in by the shop. Say that Board Name is live. Say that Blank prints the blank picked on ROCKER when the board has one and is a ruled line for the shop otherwise. Say that Board # and Price are written in by the shop. Keep the wording plain; do not quote the old label text anywhere in the file.

Create e2e/summary-blank.spec.ts. It is a new file: none of the five existing Summary specs is about the form's words. Give it a plain-English header comment covering what the field is, the two states, and that it runs signed out on the seed-csv catalogue like rocker-blanks.spec.ts. Also say that, as there, no blank name is typed: every name is read off the page. Copy the `dismissChrome`, `openRocker` (with its hydration wait) and first-fitting-row helpers from e2e/rocker-blanks.spec.ts. Do not edit rocker-blanks.spec.ts: the sibling quick task 260926-wmf (blank-maker tick boxes) may be changing that file and the ROCKER list. Add a small helper for the field, for example `blankField(page)` = `page.getByText("Blank:", { exact: true }).locator("xpath=..")`, with the value at `.locator("span").last()`. Write two tests in one `test.describe("Summary — the Shaper Use Only box's Blank field")`, running on all three projects with no skips:
- "with no blank picked, the Blank field is a ruled line for the shop to write in": goto /design/summary. The field locator has count 1 and the value matches `/^\s*$/`. The value span holds a non-breaking space, and JS `\s` matches it.
- "a blank picked on ROCKER prints on the order form as vendor then name": `openRocker`. Read the first fitting row's `aria-label` BEFORE picking. Take the expected text by stripping the leading `Use ` and any `, doesn't fit: …` suffix. Click the row, then expect the picked card to be visible. Click the SUMMARY link (the visible one, first), expect the URL /design/summary, and expect the field's value `toHaveText(expected)`.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npx vitest run && npm run lint   # in a fresh worktree run `npx next typegen` first</automated>
    <automated>IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/summary-blank.spec.ts   # worktree; first confirm `lsof -ti :3161` prints nothing. Expect 6 passed (2 tests x iphone, android, desktop)</automated>
    <automated>test "$(grep -c 'label="Blank"' components/summary/order-form.tsx)" = 1 && ! grep -q -F '&amp; Rocker' components/summary/order-form.tsx && grep -q 'blank\.copy\.vendor' components/summary/order-form.tsx && grep -F 'label="Blank"' components/summary/order-form.tsx | grep -q -F 'flex-[1.4]'</automated>
    <automated>test "$(git diff --name-only HEAD~1 HEAD | sort | tr '\n' ' ')" = "components/summary/order-form.tsx e2e/summary-blank.spec.ts "   # run after this task's commit</automated>
  </verify>
  <done>
The Summary's Shaper Use Only box reads Blank:, Board #:, Price:. A fresh board shows an empty ruled line after Blank. After picking the first fitting blank on ROCKER and walking to SUMMARY, the field prints that blank's vendor and name exactly as ROCKER's row names it. tsc, vitest and lint are clean and the new spec passes 6 of 6. Committed alone with a plain-English subject such as `feat: the order form's Blank field prints the blank picked on ROCKER`. The message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The Blank field is wide enough to print every blank's full name</name>
  <files>components/summary/order-form.tsx, e2e/summary-blank.spec.ts</files>
  <behavior>
    - Before the width change, the new desktop test fails and lists about 19 cut-off names, `Marko Foam 10'0" MK-SUP-STD` among them. That proves the check bites.
    - After the change, it passes on screen and under print media: every vendor-plus-name in db/seed/blanks/*.csv has `scrollWidth <= clientWidth` in the Blank field's value span.
    - It reads more than 100 names, so an empty read can never pass vacuously.
  </behavior>
  <action>
RED first. Add a third test to e2e/summary-blank.spec.ts: "every blank in the catalogue prints whole in the Blank field, on screen and on paper". It is desktop-only, with `test.skip(testInfo.project.name !== "desktop", "measures the printed sheet; one engine is enough")`. The reason: print media is what matters, and a phone lays the sheet out at the same design width.

Read every `db/seed/blanks/*.csv` with node:fs `readdirSync`/`readFileSync`, from `join(__dirname, "..", "db", "seed", "blanks")`. Split each with `parseCsv`, imported by relative path from `../lib/blanks/csv`. Find the `vendor` and `blank_name` columns by header name and collect the unique `vendor + " " + blank_name` strings. Expect more than 100.

On /design/summary (no blank needed), wait for `document.fonts.ready`. Then, in one `evaluate` on the field's value span: set its `textContent` to each name in turn, collect the names whose `scrollWidth > clientWidth`, and restore a single non-breaking space at the end. Do it under screen media, then under `page.emulateMedia({ media: "print" })`, then set screen back. Expect both collected lists `toEqual([])`, so a failure names every blank that would be cut off. Explain in a comment why this test puts text into the field instead of picking each blank: no single board's ROCKER list offers every blank (the default board lists 141 of the catalogue's blanks and none of the widest), and the question is whether the field has room, which does not depend on how a blank got picked. Run the test and confirm it fails with the long names.

GREEN. In components/summary/order-form.tsx, move the Blank field OUT of the three-field row onto a full-width line of its own, directly above the row that keeps Board # and Price (the founder's choice, 2026-09-27). Keep the `<OrderFormField label="Blank" …>` element on one line (the grep gates read it) with no `flex-[…]` share — a full-width block (`className="w-full"` if the primitive needs it, otherwise none). Board # and Price stay `flex-1` inside their `flex gap-6` row, so each now takes half that row. Add a short comment above the two rows explaining the layout, with the plan-time figures:
- the widest catalogue name needs about 297 px on screen and 248 px in print;
- on the shared row the old share cut off 19 of 162 names;
- a line of its own gives the name the whole box width, and Board # and Price a longer line each than before.
Keep the comment plain. Run the test to green.

Then run every Summary spec and the desktop baseline. The Summary box sits at the foot of page 2 and nothing in the baseline shows the Summary, so the five baseline pictures must not change. Never pass `--update-snapshots`.
  </action>
  <verify>
    <automated>npx tsc --noEmit && npm run lint</automated>
    <automated>IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/summary-   # worktree, port checked free first; runs summary-blank plus the five existing Summary specs on all three projects, with each spec's own skips</automated>
    <automated>IS_WEBPACK_TEST=1 PW_PORT=3161 npx playwright test e2e/desktop-baseline.spec.ts --project=desktop   # expect 5 passed</automated>
    <automated>test -z "$(git status --porcelain e2e/desktop-baseline.spec.ts-snapshots)" && shasum -a 256 e2e/desktop-baseline.spec.ts-snapshots/*.png | grep -c -E '^(a925ba158835322b653696718a8c1356500967b11466d191bb2c50ad97896b62|ef4fa37e7b2d7b6d644e9262d82548833fde54c1a6f52b5e3e73a894107f36c0|6c2c6b2be7e1e35d4b55f6e443b0cf52c0059139937f8e49661f6398761b2373|0dc0ba2610300d9b468321a1df07da5e8a1de1602e6c10602fc445dce938cae9|b80a752b7b8a5e89862145d1b8e263dde60c074056ea837487e0306fa15f8e34) '   # must print 5</automated>
    <automated>! (grep -F 'label="Blank"' components/summary/order-form.tsx | grep -q 'flex-\[') && test "$(grep -n -F 'label="Blank"' components/summary/order-form.tsx | cut -d: -f1)" -lt "$(grep -n -F 'label="Board #"' components/summary/order-form.tsx | cut -d: -f1)" && grep -q 'from "\.\./lib/blanks/csv"' e2e/summary-blank.spec.ts && test -z "$(git diff --name-only HEAD~2 HEAD -- components/summary/order-form-primitives.tsx lib components/design components/rocker e2e/rocker-blanks.spec.ts)"   # run after this task's commit</automated>
  </verify>
  <done>
The desktop test failed before the change, naming the cut-off blanks, and passes after it, on screen and in print. Every Summary spec and the desktop baseline pass. The five baseline pictures carry the same SHA-256 as at 1d2ee9b. Committed alone with a plain-English subject such as `fix: the order form's Blank field has a line of its own, so every blank's full name prints`. The message ends with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| blank catalogue → order form | Vendor and blank names come from the catalogue (the database in production, the committed CSVs in tests) by way of the board's own copy of the blank. They are printed on a shop document. |
| order form → the shop floor | A shop reads the printed Blank field to choose the foam. A wrong or cut-off name is a wrong blank pulled from the rack. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wkh-01 | Tampering (markup injection through a catalogue name) | order-form.tsx Blank field | low | mitigate | The name goes in as a React text child through the existing `OrderFormField` `value` prop, never as HTML (the same rule as T-11-32 on ROCKER). No `dangerouslySetInnerHTML`. |
| T-wkh-02 | Tampering (integrity of what the shop reads) | the printed Blank field | medium | mitigate | The text is the board's own copy of its blank, vendor then name, the identity ROCKER shows (Task 1's browser test compares the two exactly). Task 2's test proves no catalogue name is cut off on paper. |
| T-wkh-03 | Information disclosure | whole change | low | accept | No new data, endpoint, storage key or package. One field reads a value the design already carries. |
</threat_model>

<verification>
- `npx tsc --noEmit`, `npx vitest run` and `npm run lint` are clean.
- e2e/summary-blank.spec.ts passes: 2 tests on iphone, android and desktop, plus the desktop-only catalogue-fit test.
- Every `e2e/summary-*.spec.ts` passes with its own skips.
- `e2e/desktop-baseline.spec.ts --project=desktop` passes 5 of 5, and all five pictures keep their 1d2ee9b SHA-256.
- components/summary/order-form-primitives.tsx, lib/, components/design/, components/rocker/ and e2e/rocker-blanks.spec.ts are untouched.
- `npm run build` is the orchestrator's, from the main checkout.
</verification>

<success_criteria>
A shaper who picked a blank on ROCKER prints the order form and finds that blank named in full in the Shaper Use Only box, under the plain label Blank. A board with no blank still gives the shop an empty line to write on, and nothing else on either printed page moves.
</success_criteria>

<output>
Create `.planning/quick/260926-wkh-summary-page-the-blank-and-rocker-sectio/260926-wkh-SUMMARY.md` when done. Include both commit hashes and the before-and-after baseline hashes. Add a short "Note for the founder" in plain English covering four things: the field's new name; what prints when a blank is picked and when it isn't; that 19 of the catalogue's longer names (mostly Marko Foam and the SUP blanks) would have printed cut off at the old width; and that Blank now sits on a line of its own, so the Board # and Price writing lines are longer than before (each half their row).
</output>
