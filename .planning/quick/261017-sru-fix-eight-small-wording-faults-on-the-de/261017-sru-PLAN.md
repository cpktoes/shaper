---
phase: quick-261017-sru
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/custom-rocker-text.ts
  - lib/geometry/custom-rocker-text.test.ts
  - components/rocker/custom-rocker-rows.tsx
  - components/outline/wing-controls.tsx
  - components/rocker/rocker-top-view.tsx
  - lib/geometry/template.ts
  - lib/geometry/template.test.ts
  - components/fins/fin-model-info.tsx
  - components/rails/rail-data-table.tsx
  - components/rails/rail-instructions.tsx
  - lib/geometry/fins.ts
  - lib/geometry/fins.test.ts
  - components/fins/fin-controls.tsx
  - components/rails/rail-callouts.ts
  - components/rails/rail-callouts.test.ts
  - components/rails/rail-plan-side-figure.tsx
  - lib/saved-blanks-preference.ts
  - lib/saved-blanks-preference.test.ts
  - components/saved-blanks-provider.tsx
  - e2e/rocker-custom.spec.ts
  - e2e/rocker-top-view.spec.ts
  - e2e/summary-rail-key.spec.ts
  - lib/geometry/outline.ts
  - lib/geometry/measure-display.ts
  - lib/geometry/measure-display.test.ts
  - components/outline/outline-controls.tsx
  - components/template/export-preview-dialog.tsx
  - components/fins/fin-data-panel.tsx
  - lib/geometry/units.ts
  - lib/geometry/units.test.ts
  - components/volume/volume-controls.tsx
  - e2e/board-length-picker.spec.ts
  - e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png
  - e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png
  - e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png
  - .planning/quick/261017-sru-fix-eight-small-wording-faults-on-the-de/261017-sru-SUMMARY.md
autonomous: true
requirements: [QT-261017-sru]

estimate:
  tokens: 90000
  raw_tokens: 90000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Every 'center' a shaper reads is spelled the American way: the TEMPLATE wing Position hint (Center 36\"), the Customize Rocker hints and floor note (At the center, Nearer the center, Floor — the tip would drop below the center), the ROCKER top view's spoken name (center mark), and the printed Full Sized Template and Paper Saver mark (Center — 19\")"
    - "MODEL INFO's Single Model paragraph reads 'can be fine-tuned'; both RAILS footnotes read 'how rail shapes affect surfboard performance'"
    - "On a Twin, FINS Advanced heads its block 'Forward Fins — Main Twins'; Thruster, Quad and 2+1 headings read exactly as before"
    - "The example rail's callout reads 'Rail Mark 1' on RAILS INSTRUCTIONS and on the printed Rail Band Instructions page, at the same height as before and overlapping nothing; the nine-line key reads Deck Mark 1, Deck Mark 3, Rail Mark 1, Rail Tuck 1 with the other five names unchanged; both FINS toe sliders read 'Toe-In — ...'"
    - "In Metric: 'Clamped to 51 mm less than Tail Block', the Paper Saver card '... Great for boards ≤52.1 cm wide.', the Full Spread note '(*Full spread may be >2x due to millimetre rounding)'. In Imperial the first and third read exactly as today and the Paper Saver card differs only in 'wide' being lower-case"
    - "A failed Remove of a saved blank says 'Couldn't remove the blank — check your connection and try again.' or, when the sign-in has lapsed, 'Sign in again to remove blanks from your account.'; saving and updating a blank keep their two messages word for word"
    - "With the board at 6'0\", the closed Board Length boxes on TEMPLATE, VOLUME and FINS read 6' and 0\", the same as their open lists"
  artifacts:
    - path: "lib/geometry/fins.ts"
      provides: "forwardFinsHeading(finSetup, forwardSectionLabel) and fullSpreadRoundingAside(system)"
    - path: "lib/geometry/measure-display.ts"
      provides: "diamondDepthClampNote(system), formatting the exported DIAMOND_BLOCK_MARGIN_MM as a mark"
    - path: "lib/geometry/template.ts"
      provides: "markLabels center = Center; PAPER_SAVER_SUITS_WIDTH_IN and paperSaverCaption(system)"
    - path: "lib/saved-blanks-preference.ts"
      provides: "the two save messages, the two remove messages and removeBlankFailureMessage(failure)"
    - path: "lib/geometry/units.ts"
      provides: "formatWholeFeet(feet) and formatWholeInches(inches) for the Board Length pickers"
    - path: "e2e/board-length-picker.spec.ts"
      provides: "browser proof that the closed boxes read 6' and 0\" on all three screens"
  key_links:
    - from: "components/fins/fin-controls.tsx"
      to: "lib/geometry/fins.ts forwardFinsHeading"
      via: "the Forward Fins block heading"
      pattern: "forwardFinsHeading\\("
    - from: "components/saved-blanks-provider.tsx removeBlank"
      to: "lib/saved-blanks-preference.ts removeBlankFailureMessage"
      via: "both failure returns (refusal and thrown error)"
      pattern: "removeBlankFailureMessage\\("
    - from: "components/outline/outline-controls.tsx Depth note"
      to: "lib/geometry/measure-display.ts diamondDepthClampNote"
      via: "SliderRow note prop"
      pattern: "diamondDepthClampNote\\("
    - from: "components/template/export-preview-dialog.tsx strip card"
      to: "lib/geometry/template.ts paperSaverCaption"
      via: "the card description, built with the shaper's system"
      pattern: "paperSaverCaption\\("
    - from: "components/fins/fin-data-panel.tsx Full Spread row"
      to: "lib/geometry/fins.ts fullSpreadRoundingAside -> finRoundingGrain"
      via: "the italic aside"
      pattern: "fullSpreadRoundingAside\\("
    - from: "Base UI Select root (outline, volume, fin controls)"
      to: "the same item list the open list renders"
      via: "the documented items prop, so Select.Value shows the item's label"
      pattern: "items=\\{"
---

<objective>
Fix eight small wording faults the founder found on the design screens. What changes for a shaper, screen by screen:

1. **Center, spelled one way.** The TEMPLATE wing Position slider's right-hand hint, the Customize Rocker hints and floor note, the ROCKER top view's spoken name, and the printed Full Sized Template and Paper Saver mark all say "center" (the app's own rule: American spelling). The printed mark is exactly as wide as before (same six letters), so nothing on the paper moves.
2. **MODEL INFO, Single Model:** "...and can be fine-tuned by the forward/aft slider..."
3. **RAILS footnote (DATA tab and INSTRUCTIONS tab):** "how rail shapes affect surfboard performance".
4. **FINS Advanced on a Twin:** the block heading reads "Forward Fins — Main Twins" instead of stopping at the dash — the same name the DATA tab ("Front Fins (Main Twins)") and the key ("Main Twins") already use.
5. **One mark, one name.** The example rail's callout says "Rail Mark 1"; the nine-line key on RAILS INSTRUCTIONS and the SUMMARY print option says "Deck Mark 1", "Deck Mark 3", "Rail Mark 1", "Rail Tuck 1"; the FINS toe sliders say "Toe-In", like the DATA tab and the McKee popup.
6. **Metric numbers that stayed in inches.** A shaper on Metric now reads "Clamped to 51 mm less than Tail Block" under a diamond tail's Depth, "Great for boards ≤52.1 cm wide." on the Print Template popup's Paper Saver card, and "(*Full spread may be >2x due to millimetre rounding)" on the FINS DATA tab. Imperial reads exactly as today, except the Paper Saver card's "Wide" becomes "wide".
7. **Removing a saved blank:** if it fails, the message says "Couldn't remove the blank..." (or "Sign in again to remove blanks from your account." when the sign-in has lapsed), not the saving message.
8. **Board Length boxes:** with the dropdown closed, TEMPLATE, VOLUME and FINS show 6' and 0" — what the open list shows — instead of a bare 6 and 0.

Purpose: the founder shows this app to shapers; every word on screen should read like a shaper wrote it, and a Metric shaper should never meet a stray inch figure.
Output: three commits of code and tests on local main (plus one commit re-recording three desktop test pictures), and a plain-English SUMMARY. No database, no migration, no deploy, no push.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@AGENTS.md
@.planning/STATE.md

<facts_established_at_plan_time>
- Base UI is `@base-ui/react` 1.7.0. `node_modules/@base-ui/react/select/root/SelectRoot.d.ts` (~:97-114) documents `items` on the Root: "When specified, `<Select.Value>` renders the label of the selected item instead of the raw value." `node_modules/@base-ui/react/internals/resolveValueLabel.js` matches an array of `{ value, label }` by `item.value === value`, so number values work as they are. `components/ui/select.tsx` exports `Select = SelectPrimitive.Root`, so `items` passes straight through; the wrapper needs no change. The only six `<SelectValue />` uses in the app are these Board Length pickers (outline-controls ~:171/:187, volume-controls ~:140/:156, fin-controls ~:284/:300).
- The feet lists differ by screen and each keeps its own: TEMPLATE 5-10, VOLUME `FEET_OPTIONS` 4-10, FINS 4-12; inches 0-11 everywhere.
- `forwardSectionLabel` is `""` for every Twin template, and that empty string is pinned by the prototype's own golden fixtures (`lib/geometry/__fixtures__/prototype-fins-golden.json`, `prototype-fins-imported-golden.json`). Rule 1 forbids hand-editing them, so the shared label stays as it is. Its only consumer is the heading at `components/fins/fin-controls.tsx` ~:522. "Main Twins" is already the key label (fins.ts ~:966) and the DATA group label "Front Fins (Main Twins)" (~:1002).
- The diamond clamp is `DIAMOND_BLOCK_MARGIN_MM = inchesToMm(2)`, module-private in `lib/geometry/outline.ts` ~:38, used at ~:201. `formatMark` gives Imperial `2"` and Metric `51 mm` (50.8 mm to the whole millimetre). `lib/geometry/measure-display.ts` already imports from `./outline` (`MEASURE_STATION_MM` for `stationLabel`), so the note goes there. outline.ts cannot import measure-display without an import cycle.
- No constant holds 20.5". It is the founder's own caption figure (commit e5e707a7, 2026-09-02), not page arithmetic: Letter's usable landscape width doubles to about 20.4", A4's to about 21.8". **Planner's decision (within the orchestrator's ruling):** a named constant in inches, `PAPER_SAVER_SUITS_WIDTH_IN = 20.5`. Imperial keeps the founder's figure as written, `≤20.5"`; the house formatter would print `20 1/2"`, so it is not used for Imperial. Metric goes through `formatDim(inchesToMm(...), "metric")`, giving `≤52.1 cm`.
- `finRoundingGrain(system)` (fins.ts ~:1184) returns Imperial `1/16"` and Metric `millimetre`.
- `RemoveUserBlankResult` failure reasons are `"signed-out" | "invalid"` (`lib/saved-blanks-preference.ts` ~:64). The Remove failure is shown in exactly one place: the saved card's Remove row (`components/rocker/blank-card.tsx` `RemoveSaved` ~:257-312, fed by `blank-picker-dialog.tsx` `removeSaved` ~:272 and then by the provider's `removeBlank`). The Customize Rocker footer (`customize-rocker-dialog.tsx` ~:124-150) only saves and updates, so it rightly keeps the save messages. No component change is needed beyond the provider.
- Callout fit was measured at plan time with a scratch vitest run of the real `buildRailCallouts` + `deOverlapCallouts` on the fixed example rail, Flat and Domed. The new label's text box is [482.4, 556.1] in viewBox units, exactly as wide as "Domed Taper", which already sits in the same column. The padded plot is 582.8 wide in both states. Every callout's height is identical before and after, in both states. The layout is in viewBox units, so the screen width cannot change this; the printed page draws the same `ExampleRailFigure` (Flat).
- The printed template's center-mark name `"Centre"` is hashed by all three frozen characterisation pins in `lib/geometry/template.test.ts` (cj5 ~:127 and 18d ~:199 through `placements`; kon ~:270 through strip `segments` and `rows`). This was measured at plan time on all 16 pinned cases: each holds at least two strings starting `"Centre` and none starting `"Center`. So hashing with every `"Center` mapped back to `"Centre` reproduces today's bytes exactly. This follows fast task 157's precedent (`boxesByThePreFastTask157Rule`): digest by the old rule so the pin still proves every OTHER byte is unchanged. The merged label already reads "Widepoint / Center" (template.test.ts ~:605).
- `e2e/summary-rail-key.spec.ts`'s `lineTickCheckbox` (~:68) finds a tick by `hasText`, which is a case-insensitive SUBSTRING match. After the rename, "Deck Mark 3" is a prefix of the untouched "Deck Mark 3 Center (full board)", so the lookup must match the WHOLE label or the click hits two ticks.
- The desktop baselines are viewport screenshots of each screen's default view (1280x800). TEMPLATE, VOLUME and FINS show the bare "6"/"0" boxes today, so those three change. ROCKER and RAILS show none of the changed wording and must stay byte-identical. No other e2e spec reads the Board Length boxes.
- This checkout's `.next/dev/lock` belongs to a dead process (pid 3995) and nothing listens on 3000. Do not touch the lock regardless (orchestrator ruling).
</facts_established_at_plan_time>

<tests_that_pin_old_wording>
Unit: lib/geometry/custom-rocker-text.test.ts ~:64-65, :77, :82-86 · lib/geometry/template.test.ts ~:357, :367, :562, :1452, :2576 and the three frozen digest pins (cj5 ~:127, 18d ~:199, kon ~:270) · components/rails/rail-callouts.test.ts ~:68, :106, :118-119, :176, :370, :377.
Playwright: e2e/rocker-custom.spec.ts ~:35, :206, :208 (title ~:196 too) · e2e/rocker-top-view.spec.ts ~:152 · e2e/summary-rail-key.spec.ts ~:36-44, :249, :251 (plus the `lineTickCheckbox` substring hazard above).
Desktop baselines that change visibly (item 8 only): e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png, volume-desktop-desktop-darwin.png, fins-desktop-desktop-darwin.png.
Nothing pins: "can fine tuned", "shapes affects", "Toe-in —", the clamp note, the Paper Saver caption, the Full Spread aside, either saved-blank message, or "Forward Fins".
</tests_that_pin_old_wording>

<browser_runs>
Playwright starts and stops its own dev server. Before the first run, check `lsof -nP -iTCP:3134 -sTCP:LISTEN` is empty (else use 3135, 3136, ...), then always run with `PW_PORT=3134 IS_WEBPACK_TEST=1 npx playwright test <specs> --project=desktop` (webpack, matching how the baselines were recorded). Never start `next dev` on 3000, never delete or edit `.next/dev/lock`. If a run is interrupted, stop only the PID that `lsof -nP -iTCP:3134` shows. In a fresh worktree, run `npx next typegen` once before `npx tsc --noEmit` if tsc complains about missing route types.
</browser_runs>

<commit_rules>
Stage only the files a task lists, by name (never `git add -A`). Commit with `git commit -F <scratch file>`: a plain-English subject a shaper can read (given per task), a short plain-English body, then a blank line and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. In new code comments, describe the change by concept rather than quoting the old wording. No push, no deploy, no database.
</commit_rules>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Pure wording — center, fine-tuned, affect, the Twin heading, one name per mark, and the Remove message (items 1-5 and 7)</name>
  <files>lib/geometry/custom-rocker-text.ts, lib/geometry/custom-rocker-text.test.ts, components/rocker/custom-rocker-rows.tsx, components/outline/wing-controls.tsx, components/rocker/rocker-top-view.tsx, lib/geometry/template.ts, lib/geometry/template.test.ts, components/fins/fin-model-info.tsx, components/rails/rail-data-table.tsx, components/rails/rail-instructions.tsx, lib/geometry/fins.ts, lib/geometry/fins.test.ts, components/fins/fin-controls.tsx, components/rails/rail-callouts.ts, components/rails/rail-callouts.test.ts, components/rails/rail-plan-side-figure.tsx, lib/saved-blanks-preference.ts, lib/saved-blanks-preference.test.ts, components/saved-blanks-provider.tsx, e2e/rocker-custom.spec.ts, e2e/rocker-top-view.spec.ts, e2e/summary-rail-key.spec.ts</files>
  <read_first>lib/geometry/custom-rocker-text.ts (~:40-80), lib/geometry/template.ts (~:220-250), lib/geometry/template.test.ts (~:60-370, the three frozen pins and the fast task 157 helper), lib/geometry/fins.ts (~:760-770, ~:960-1005, ~:1176-1197), components/rails/rail-callouts.ts (~:110-135, ~:240-265), components/rails/rail-callouts.test.ts (~:330-445), components/saved-blanks-provider.tsx (~:95-112, ~:208-232), lib/saved-blanks-preference.ts (~:29-66), e2e/summary-rail-key.spec.ts (~:30-95)</read_first>
  <behavior>
    - bendStartText(null, system) is "At the center" in both systems; bendStartHints gives ["Near the nose", "At the center"] / ["Near the nose", "Nearer the center"] for the nose and the mirror pair for the tail; FLOOR_HINT is "Floor — the tip would drop below the center".
    - markLabels(system).center is "Center" in both systems; a strip mark segment for the center reads "Center — " followed by its width.
    - The three frozen digest pins still pass with their digest maps untouched, and each also proves the real data now holds the new name (at least one string starting "Center, none starting "Centre).
    - forwardFinsHeading("twin", "") is "Forward Fins — Main Twins" for every twin template; thruster and quad give "Forward Fins — Front Pair"; 2plus1 gives "Forward Fins — Side Bites"; the twin suffix equals the name the twin result's key and DATA group already use.
    - The example rail's callouts include "Rail Mark 1" and no "Rail Mk1"; the apex column still reads Rail Mark 1, Corner Cut, Apex, Tuck 1 at least RAIL_CALLOUT_MIN_GAP apart; every callout's text box lies inside the padded bounds for BOTH Flat and Domed.
    - The save messages are byte-identical to today; removeBlankFailureMessage({ ok: false, reason: "signed-out" }) is "Sign in again to remove blanks from your account."; reason "invalid" and a null failure (a thrown error) give "Couldn't remove the blank — check your connection and try again."
  </behavior>
  <action>
Write the failing unit expectations first (the behaviour list above), then make them pass. Every change below is wording only: no number, layout constant, key, variable name or stored value moves.

**Item 1, center (American spelling, per lib/geometry/blank-reasons.ts ~:12):**
- lib/geometry/custom-rocker-text.ts: bendStartText's null case returns "At the center"; FLOOR_HINT becomes "Floor — the tip would drop below the center"; bendStartHints' center end becomes "At the center" / "Nearer the center". Update this file's doc comments that quote those strings. In components/rocker/custom-rocker-rows.tsx (~:123), update the quoted value-box string in the comment to the new spelling.
- components/outline/wing-controls.tsx (~:94): the hint word becomes "Center".
- components/rocker/rocker-top-view.tsx (~:213): the spoken name says "center mark".
- lib/geometry/template.ts markLabels (~:237): center becomes "Center". This is the printed Full Sized Template and Paper Saver mark name. The letters are the same, so the printed width is identical.
- lib/geometry/template.test.ts: change the pins at ~:357, :367, :562, :1452 and :2576 to "Center".
- Frozen pins: next to boxesByThePreFastTask157Rule, add one helper (document it in the same dated style). It takes the pin's combined object and serialises it with JSON.stringify. It then asserts that the serialised text contains at least one string starting with a double quote followed by Center, and none starting with a double quote followed by the old spelling. Finally it replaces every quote-plus-new-spelling with quote-plus-old-spelling and returns the first 16 hex characters of the sha256. Use it in place of the inline digest line in all three frozen pins (cj5, 18d, kon). Leave every EXPECTED_* digest map and every other line in those blocks untouched. Add one dated amendment sentence to each pin's header: quick 261017-sru moved the printed center mark to the American spelling on purpose, and the pin hashes it by its old name so it still proves every other byte is unchanged.
- Code identifiers and code comments that say centre (centreAt, centreIn, etc.) stay as they are.

**Item 2:** components/fins/fin-model-info.tsx (~:42-43): the Single Model sentence reads "...and can be fine-tuned by the forward/aft slider in the advanced menu...". Keep "can be fine-tuned" on one source line.

**Item 3:** components/rails/rail-data-table.tsx (~:154) and components/rails/rail-instructions.tsx (~:181): "how rail shapes affects" becomes "how rail shapes affect". Change only that word; the `&apos;` and `&rsquo;` entities stay exactly as they are.

**Item 4:** Do NOT change forwardSectionLabel (the prototype golden fixtures pin it, Rule 1). In lib/geometry/fins.ts:
- Add one module-level constant for the twin pair's name, "Main Twins".
- Use it where the key label (~:966) and the DATA group label "Front Fins (Main Twins)" (~:1002) already name the twins. Their output must be byte-identical, and the existing golden tests prove that.
- Add the exported pure function forwardFinsHeading(finSetup: FinSetup, forwardSectionLabel: string): string. It returns "Forward Fins — " followed by the twin name for "twin", and by forwardSectionLabel otherwise.

In components/fins/fin-controls.tsx (~:522), render the heading from forwardFinsHeading(spec.finSetup, flags.forwardSectionLabel). In lib/geometry/fins.test.ts, cover all five setups (both twin templates) and tie the twin suffix to the twin result's own key label.

**Item 5:**
- components/rails/rail-callouts.ts (~:124): the railMk1 anchor's name becomes "Rail Mark 1". Keep the key railMk1.
- components/rails/rail-callouts.test.ts: rename the expected name at ~:68, :106, :118-119, :176, :370 and :377 (titles included). Extend test (j) to loop over Flat and Domed, as test (d) already does. Plan-time measurement: the label fits with 26.7 units to spare in both states.
- components/rails/rail-plan-side-figure.tsx (~:94-101): "Deck Marks 1" becomes "Deck Mark 1", "Deck Marks 3" becomes "Deck Mark 3", "Rail Marks 1" becomes "Rail Mark 1", "Rail Tucks 1" becomes "Rail Tuck 1". The other five labels, including "Deck Mark 3 Center (full board)", stay.
- The plural guide sentences in rail-instructions.tsx (~:159, :164, "Use Deck Marks (solid lines)...") are about the marks in general and stay.
- components/fins/fin-controls.tsx (~:553 and ~:674): both slider labels read "Toe-In — " followed by the mark. The sentence-case "View precise McKee toe-in aim tables" link stays.

**Item 7:**
- In lib/saved-blanks-preference.ts, export four message constants beside SAVED_BLANKS_FULL_MESSAGE. The two save messages are moved from the provider word for word ("Sign in again to save blanks to your account." and "Couldn't save the blank — check your connection and try again."). The two new remove messages are "Sign in again to remove blanks from your account." and "Couldn't remove the blank — check your connection and try again.".
- Also export the pure function removeBlankFailureMessage(failure: Extract<RemoveUserBlankResult, { ok: false }> | null): string. A "signed-out" reason gives the remove sign-in sentence; anything else, and null, give the remove connection sentence.
- In components/saved-blanks-provider.tsx, replace the two local message consts with the imported save constants (saveBlank, updateBlank and refusalMessage keep their exact wording). Make removeBlank's two failure returns use removeBlankFailureMessage(result) and removeBlankFailureMessage(null) in its catch.
- Add the tests to lib/saved-blanks-preference.test.ts, pinning all four sentences exactly.

**Browser specs:**
- e2e/rocker-custom.spec.ts: update FLOOR_HINT (~:35), the aria-valuetext and row text (~:206, :208) and the test title (~:196).
- e2e/rocker-top-view.spec.ts (~:152): update the regex to "center mark".
- e2e/summary-rail-key.spec.ts: update RAIL_LINE_KEY_LABELS (~:36-44) and the two lines at ~:249/:251. Make lineTickCheckbox match the label's WHOLE text, using an anchored regex with the label's special characters escaped, so "Deck Mark 3" cannot also catch "Deck Mark 3 Center (full board)".

Commit subject: "Wording: center spelled one way, each rail mark called by one name, and a failed Remove says remove"
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/custom-rocker-text.test.ts lib/geometry/template.test.ts lib/geometry/fins.test.ts lib/geometry/fins-imported.test.ts components/rails/rail-callouts.test.ts lib/saved-blanks-preference.test.ts && npx tsc --noEmit && npm run lint && test "$(grep -c 'can be fine-tuned' components/fins/fin-model-info.tsx)" -ge 1 && test "$(grep -cE 'rail shapes affect( |$)' components/rails/rail-data-table.tsx)" -eq 1 && test "$(grep -cE 'rail shapes affect( |$)' components/rails/rail-instructions.tsx)" -eq 1 && test "$(grep -c 'Toe-In — ' components/fins/fin-controls.tsx)" -eq 2 && grep -q 'forwardFinsHeading(' components/fins/fin-controls.tsx && grep -q 'removeBlankFailureMessage(' components/saved-blanks-provider.tsx && PW_PORT=3134 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-custom.spec.ts e2e/rocker-top-view.spec.ts e2e/summary-rail-key.spec.ts --project=desktop</automated>
  </verify>
  <done>All listed unit suites pass, including the three frozen digest pins with their digest maps unchanged. tsc and lint are clean. The three Playwright specs pass on desktop. One commit holds exactly the files this task lists.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Metric — the diamond clamp note, the Paper Saver width and the Full Spread note (item 6)</name>
  <files>lib/geometry/outline.ts, lib/geometry/measure-display.ts, lib/geometry/measure-display.test.ts, components/outline/outline-controls.tsx, lib/geometry/template.ts, lib/geometry/template.test.ts, components/template/export-preview-dialog.tsx, lib/geometry/fins.ts, lib/geometry/fins.test.ts, components/fins/fin-data-panel.tsx</files>
  <read_first>lib/geometry/outline.ts (~:33-40, ~:195-205), lib/geometry/measure-display.ts (~:56-90, ~:205-235), components/outline/outline-controls.tsx (~:125-135, ~:383-417), components/template/export-preview-dialog.tsx (~:80-100, ~:195-205, ~:320-335), components/fins/fin-data-panel.tsx (~:60-85)</read_first>
  <behavior>
    - diamondDepthClampNote("imperial") is exactly 'Clamped to 2" less than Tail Block'; diamondDepthClampNote("metric") is "Clamped to 51 mm less than Tail Block" and equals the sentence built from formatMark(DIAMOND_BLOCK_MARGIN_MM, "metric").
    - paperSaverCaption("imperial") is exactly 'True-size, full-length landscape print. Great for boards ≤20.5" wide.'; paperSaverCaption("metric") is "True-size, full-length landscape print. Great for boards ≤52.1 cm wide." and contains formatDim(inchesToMm(PAPER_SAVER_SUITS_WIDTH_IN), "metric").
    - fullSpreadRoundingAside("imperial") is exactly '(*Full spread may be >2x due to 1/16" rounding)'; fullSpreadRoundingAside("metric") is "(*Full spread may be >2x due to millimetre rounding)"; both contain finRoundingGrain(system).
  </behavior>
  <action>
Write the failing unit expectations first, then make them pass. No 25.4 or 10 anywhere: every figure goes through lib/geometry/units.ts and lib/geometry/measure-display.ts (Rule 2).

**6a, TEMPLATE Depth note (diamond tail):**
- In lib/geometry/outline.ts, export DIAMOND_BLOCK_MARGIN_MM (~:38) with a one-line doc: the room the diamond's point keeps from the tail block. Its value and its use at ~:201 do not change.
- In lib/geometry/measure-display.ts, add the exported diamondDepthClampNote(system: UnitsSystem): string beside stationLabel. It reads "Clamped to " + formatMark(DIAMOND_BLOCK_MARGIN_MM, system) + " less than Tail Block". It is a mark, like the Depth label it sits under.
- In components/outline/outline-controls.tsx (~:414), the SliderRow note uses diamondDepthClampNote(system) when diamondDepthClamped is true.
- Tests go in lib/geometry/measure-display.test.ts.

**6b, Print Template popup, Paper Saver card:**
- In lib/geometry/template.ts, near the strip layout, add the exported constant PAPER_SAVER_SUITS_WIDTH_IN = 20.5. Its doc says: the founder's own caption figure (commit e5e707a7, 2026-09-02), a rule of thumb rather than page arithmetic.
- Add the exported paperSaverCaption(system: UnitsSystem): string. Imperial writes the founder's figure as written, the constant followed by a straight inch mark (planner's decision: Imperial stays reading 20.5" rather than the formatter's 20 1/2"). Metric writes formatDim(inchesToMm(PAPER_SAVER_SUITS_WIDTH_IN), "metric"). Both read "True-size, full-length landscape print. Great for boards ≤" + figure + " wide." with "wide" lower-case.
- In components/template/export-preview-dialog.tsx, make the strip card's description come from paperSaverCaption(system), using the system the component already reads with useUnits (~:201). For example, turn ARTIFACT_CARDS into a small function of system, keeping the other two cards' titles and descriptions byte-identical.
- Tests go in lib/geometry/template.test.ts, outside the frozen blocks.

**6c, FINS DATA tab, Full Spread row:**
- In lib/geometry/fins.ts beside finRoundingGrain, add the exported fullSpreadRoundingAside(system: UnitsSystem): string. It returns "(*Full spread may be >2x due to " + finRoundingGrain(system) + " rounding)".
- In components/fins/fin-data-panel.tsx (~:75), the italic aside renders fullSpreadRoundingAside(system), using the system the panel already has. The rendered Imperial text must be byte-identical to today: "Full Spread " then the italic "(*Full spread may be >2x due to 1/16" rounding)".
- Tests go in lib/geometry/fins.test.ts beside the finRoundingNote tests (~:579).

Commit subject: "Metric: the diamond-tail note, the Paper Saver's width and the Full Spread note read in metric"
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/measure-display.test.ts lib/geometry/template.test.ts lib/geometry/fins.test.ts lib/geometry/outline.test.ts && npx tsc --noEmit && npm run lint && grep -q 'diamondDepthClampNote(' components/outline/outline-controls.tsx && grep -q 'paperSaverCaption(' components/template/export-preview-dialog.tsx && grep -q 'fullSpreadRoundingAside(' components/fins/fin-data-panel.tsx</automated>
  </verify>
  <done>Imperial and Metric cases pass for all three sentences, and the Imperial strings match today's exactly except "wide". The three components call the new functions. tsc and lint are clean. One commit holds exactly this task's files.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: The closed Board Length boxes read 6' and 0" (item 8), then re-record three desktop pictures and write the SUMMARY</name>
  <files>lib/geometry/units.ts, lib/geometry/units.test.ts, components/outline/outline-controls.tsx, components/volume/volume-controls.tsx, components/fins/fin-controls.tsx, e2e/board-length-picker.spec.ts, e2e/desktop-baseline.spec.ts-snapshots/outline-desktop-desktop-darwin.png, e2e/desktop-baseline.spec.ts-snapshots/volume-desktop-desktop-darwin.png, e2e/desktop-baseline.spec.ts-snapshots/fins-desktop-desktop-darwin.png, .planning/quick/261017-sru-fix-eight-small-wording-faults-on-the-de/261017-sru-SUMMARY.md</files>
  <read_first>components/ui/select.tsx (Select is the Base UI Root itself), node_modules/@base-ui/react/select/root/SelectRoot.d.ts (~:97-125, items and itemToStringLabel), node_modules/@base-ui/react/select/value/SelectValue.d.ts, lib/geometry/units.ts (~:340-386, wholeFeetAndInches and formatFeetInches), e2e/desktop-regression.spec.ts (~:38, the desktop-only skip pattern), e2e/desktop-baseline.spec.ts (~:120-160)</read_first>
  <behavior>
    - formatWholeFeet(6) is "6'"; formatWholeInches(0) is '0"'; formatWholeInches(11) is '11"'.
    - For every feet 4-12 and inches 0-11, formatWholeFeet(f) + formatWholeInches(i) equals formatFeetInches(inchesToMm(f * 12 + i)), so the two boxes always read like the "Board Length — 6'0"" label above them.
    - In the browser (desktop), on /design/outline, /design/volume and /design/fins, the two closed Board Length boxes read exactly 6' and 0". On TEMPLATE, opening the feet box shows the option 7', picking it makes the closed box read 7' and the label read "Board Length — 7'0"".
  </behavior>
  <action>
**Item 8, one item list feeding both the open list and the closed box:**
- In lib/geometry/units.ts beside wholeFeetAndInches, add formatWholeFeet(feet: number): string and formatWholeInches(inches: number): string. Each is the whole number followed by a straight foot or inch mark, the same text the options show today. These controls are Imperial-only, so there is no Metric branch.
- Add the behaviour tests to lib/geometry/units.test.ts, including the loop tying them to formatFeetInches.
- In each of components/outline/outline-controls.tsx, components/volume/volume-controls.tsx and components/fins/fin-controls.tsx, build module-level item lists from that screen's own values: TEMPLATE 5-10, VOLUME its FEET_OPTIONS and INCHES_OPTIONS, FINS 4-12, inches 0-11. Each entry is value plus a label from formatWholeFeet or formatWholeInches.
- Pass each list to its Select root as the documented items prop (Base UI 1.7.0: Select.Value then shows the selected item's label). Render the SelectItems from the same list, with the label as the item text.
- Values, onValueChange handlers, disabled rules and class names are unchanged. components/ui/select.tsx needs no change. Leave it alone unless tsc proves otherwise, and if so say why in the SUMMARY.

**Browser proof:** create e2e/board-length-picker.spec.ts, skipped on any project other than desktop (the desktop-regression.spec.ts ~:38 pattern).
- On each of the three screens, the only `[data-slot="select-trigger"]` elements are the two Board Length boxes. Assert their text is exactly 6' and 0".
- On TEMPLATE only (its pickers are enabled by default; on VOLUME and FINS they are greyed while the board's own shape is used), open the feet box, pick the option 7', and assert the closed box reads 7' and the label reads "Board Length — 7'0"".

**Desktop pictures:**
- Run e2e/desktop-baseline.spec.ts without updating. Exactly TEMPLATE, VOLUME and FINS must fail. If ROCKER or RAILS fails, stop and report: that would be an unplanned visible change.
- Open each of the three diff images under test-results with the Read tool and confirm the only difference is the text in the two Board Length boxes.
- Re-record only those three with the update-snapshots option and -g "TEMPLATE|VOLUME|FINS", then run the spec again without it and see all five pass.
- `git status --short e2e/` must show only the three PNGs and the new spec.

**Commits:**
- Code and tests: "Board Length boxes read 6' and 0\" when closed, the same as their lists".
- Then, separately, the three PNGs: "Desktop test pictures: re-recorded with the Board Length boxes reading 6' and 0\"".

**Final gates:** the full `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, and the plan-level `<verification>` Playwright list, all green.

**SUMMARY:** write .planning/quick/261017-sru-fix-eight-small-wording-faults-on-the-de/261017-sru-SUMMARY.md in plain English for the founder.
- Cover each of the eight fixes as the screen now reads, in both systems where it differs.
- State the two decisions: the Paper Saver figure stays 20.5" in Imperial, and the printed template's center mark changed too, with the frozen pins hashing it by its old name.
- Give the test and baseline list and the final gate counts.
- Do not commit the SUMMARY (the orchestrator's docs commit carries it).
  </action>
  <verify>
    <automated>npx vitest run lib/geometry/units.test.ts && npx tsc --noEmit && npm run lint && PW_PORT=3134 IS_WEBPACK_TEST=1 npx playwright test e2e/board-length-picker.spec.ts e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts --project=desktop && npx vitest run</automated>
  </verify>
  <done>The closed boxes read 6' and 0" on all three screens in the browser, and the open lists are unchanged. All five desktop baselines pass, only the three named PNGs were re-recorded, and the full vitest suite, tsc and lint are green. Two commits are on local main (code, then pictures). The SUMMARY is written.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → removeUserBlank server action | Unchanged. Only the sentence shown for a refusal changes; the action's own sign-in and ownership checks are untouched. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-261017-01 | Information disclosure | saved-blank Remove messages | low | accept | The messages say only that the sign-in lapsed or the connection failed, the same facts the save messages already show; no ids or server detail. |
| T-261017-02 | Tampering | frozen characterisation pins in lib/geometry/template.test.ts | medium | mitigate | The helper asserts the new name is present and the old one absent before mapping, so it can never go vacuous or hide a real tile-grid or strip change. The digest maps are untouched. |
| T-261017-SC | Tampering | package installs | low | accept | None: no package is added, removed or upgraded. |
</threat_model>

<verification>
- `npx vitest run` (all suites), `npx tsc --noEmit` and `npm run lint` all green after Task 3.
- `PW_PORT=3134 IS_WEBPACK_TEST=1 npx playwright test e2e/rocker-custom.spec.ts e2e/rocker-top-view.spec.ts e2e/summary-rail-key.spec.ts e2e/board-length-picker.spec.ts e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts --project=desktop` passes.
- Leftover sweep (plan-level, reported in the SUMMARY): a grep over app/, components/, lib/ and e2e/ for the old visible wording listed in `tests_that_pin_old_wording`, skipping comment lines, returns nothing.
- `git log --oneline -4` shows the four commits above and nothing staged beyond them; `git status --short` shows only the unstaged SUMMARY.
</verification>

<success_criteria>
- All eight faults read as the must_haves truths describe, in Imperial and in Metric.
- No geometry number, stored value, golden fixture, digest map or layout constant changed. ROCKER and RAILS desktop pictures are byte-identical; only the TEMPLATE, VOLUME and FINS pictures are re-recorded.
- Every test that pinned the old wording now pins the new wording; the new pure functions each have Imperial and Metric (where relevant) tests.
</success_criteria>

<output>
Create `.planning/quick/261017-sru-fix-eight-small-wording-faults-on-the-de/261017-sru-SUMMARY.md` when done.
</output>
