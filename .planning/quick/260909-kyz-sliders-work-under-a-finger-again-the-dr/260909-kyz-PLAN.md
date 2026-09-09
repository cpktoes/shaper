---
phase: quick-260909-kyz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/ui/slider.tsx
  - components/ui/slider-touch-contract.test.ts
  - e2e/slider-touch.spec.ts
autonomous: true
requirements: [QT-260909-kyz]

estimate:
  tokens: 55000
  raw_tokens: 44000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Put a finger anywhere on a slider's bar and the value jumps to where the finger landed, then follows the finger if it keeps moving. Today the bar is dead: only the little 12px dot (and an invisible ring around it) responds, and everything else on a 151px bar does nothing at all."
    - "That is true of every slider on every design screen — the Width and Offset rows folded behind Fine adjust on an upright phone, the same rows sitting in the sidebar when the phone is held sideways, and ordinary rows like RAILS' Deck Profile that were never drag-point mirrors."
    - "Dragging the dot itself still works exactly as it does today, including when the finger wanders up and down while it moves along, and the controls list underneath does not scroll away while a value is being set."
    - "On a computer with a mouse the sliders now also respond to a click on the bar — which is what a slider has always been supposed to do, and what was quietly broken here too. Nothing else about the mouse changes: the dot is the same size in the same place, the drag behaves identically, and the five desktop baseline screenshots are re-run against the existing images, never regenerated."
    - "Tabbing through a design screen from the keyboard now stops once per slider instead of twice, and a screen reader announces each slider once instead of twice — both were a side effect of the same defect."
    - "No board number changes. Nothing under lib/geometry/ is read or written differently, and no drawing, label or measurement moves by a pixel."
    - "The keyboard focus ring on a slider thumb still paints (e2e/keyboard-focus.spec.ts stays green) and every thumb's finger target is still at least 44x44 on a phone (e2e/touch-sizing.spec.ts stays green)."
  artifacts:
    - components/ui/slider.tsx
    - components/ui/slider-touch-contract.test.ts
    - e2e/slider-touch.spec.ts
  key_links:
    - "ROOT CAUSE, MEASURED not assumed: every slider in the app renders TWO thumbs stacked exactly on top of each other. Counted live at planning time on the running app — /design/outline has 22 elements carrying `data-slot=\"slider-thumb\"` for 11 sliders, /design/rails has 24 for 12. Both thumbs in a pair report the identical rectangle (x=86.5, y=529.5, 12.0 x 12.0), both carry `data-index=0`, and both contain their own hidden `<input type=\"range\">` reading the same value."
    - "WHY: components/ui/slider.tsx lines 13-17 build a `_values` array and then render one thumb per entry. When the `value` prop is not an array it falls back to a two-element array built from the min and max props. Every slider in this app passes a single number (confirmed: `grep -rn 'value={\\[' components/` finds nothing, so there is no two-ended range slider anywhere), so that fallback fires on all of them and the render loop emits two thumbs."
    - "WHY THAT KILLS THE BAR: Base UI's Root only holds ONE value, so `values.length === 1`, while `thumbRefs.current` holds 2. On a press that is not on a thumb, node_modules/@base-ui/react/slider/control/SliderControl.js `startPressing` (lines 188-230) scans the thumb list for the nearest one using `distance <= minDistance` — a non-strict compare, so with two thumbs at the identical position the LAST one wins and `pressedThumbIndexRef.current` becomes 1. `getFingerState` (line 151) then hits its own `thumbIndex >= values.length` guard, returns null, and the Control's `onPointerDown` (line 375) returns before it sets any value or focuses any thumb."
    - "PROOF the handler bails: after a mouse press on the bar, `document.activeElement` was still BODY (the Control's `focusThumb` never ran) and a MutationObserver on the value label recorded zero changes. No page errors."
    - "MEASURED BEFORE (all with a fresh page load, one gesture each): a press on the Width bar left it at 19\" at 5%, 20%, 50%, 75% and 95% along the bar — identical on Desktop Chrome 1280x800 with a real mouse, on Pixel 7 upright with CDP touch, and on Pixel 7 landscape with CDP touch. RAILS' Deck Profile and TEMPLATE's Tail Rail behaved the same. A drag started ON the dot DID work everywhere: Width 19\" -> 22 1/8\" upright, 19\" -> 23 1/2\" landscape, and still worked with 60px of vertical wander, with the controls scroller never scrolling."
    - "MEASURED AFTER (the same one-line change applied live to the running app, then reverted): thumb counts fell to 11 for 11 sliders and 12 for 12, and a bar press moved the value everywhere — desktop mouse Width 19\" -> 23\" at 75% and -> 17 5/8\" at 20%; Pixel 7 upright touch -> 22 7/8\" / 17 5/8\"; Pixel 7 landscape touch -> 23\" / 17 1/2\"; RAILS Deck Profile 1 5/16\" -> 1\" / 1 1/4\". The dot drag still worked in every case."
    - "WHY A MOUSE NEVER SHOWED IT: with a mouse you point at the 12px dot. With a finger you land somewhere along a 151.5px bar, and only a 44px window around the dot is live — roughly 71% of the bar is dead. That is the whole difference between 'fine on the desktop' and 'unusable on the phone', and it explains why the founder hit it on BOTH the sideways sidebar and the upright Fine adjust fold: it was never about where the row sits."
    - "NOT the cause, ruled out by measurement: the Fine adjust fold (D-03) and the sideways desktop-shell sidebar are both innocent — a dot drag works through either. The hidden native `<input type=\"range\">` is also not stealing the touch in Chromium: it measures `position: fixed`, 10x10, sitting exactly over the dot, `clip-path: inset(50%)`, `pointer-events: auto`, and `document.elementFromPoint` at the dot's centre returns the thumb DIV, not the input — Chromium excludes it via clip-path hit testing. It stays untouched here and is named below as the one remaining candidate if the founder's iPhone still misbehaves."
    - "BELT AND BRACES (not the proven cause, included because it is free): `touch-action` is not an inherited property. Measured on the live app, the Control div computes `touch-action: none` (it carries shadcn's `touch-none`) while the Track and the Thumb both compute `auto`. A conforming browser walks up from the touched element to the nearest scroller and honours the Control's `none` — Chromium clearly does, which is why a 60px-vertical wander mid-drag scrolled nothing. Saying `touch-none` on the Track and the Thumb as well changes nothing where the ancestor walk is honoured and closes the gap where it is not. It cannot affect a mouse: `touch-action` has no meaning for pointer input that is not touch."
    - "components/ui/slider.tsx is shadcn-generated, but it already carries this app's own `coarse:after:-inset-4` touch ring on the thumb, so an app-owned edit there is precedented. Keeping BOTH changes in that one file (rather than in app/globals.css) also keeps this task's files completely disjoint from the sibling task 260909-ktq, which is editing the viewers and e2e/touch-drag.spec.ts at the same time."
    - "e2e/touch-drag.spec.ts is OWNED BY THE SIBLING TASK 260909-ktq and must not be opened or edited here. This task's browser proof goes in a NEW file, e2e/slider-touch.spec.ts. The viewers (components/outline/outline-viewer.tsx, components/rocker/rocker-viewer.tsx) are likewise off limits."
    - "The sideways-phone test bed is `devices['Pixel 7 landscape']` (863 x 360, coarse pointer, above the 820px shell breakpoint so it renders the desktop sidebar). `defaultBrowserType` must be destructured out of that descriptor before `test.use` — it is a worker-scoped option Playwright only accepts from the config's own projects list. The recipe is already in e2e/phone-fins-landscape.spec.ts lines 35-42; copy it."
    - "Real touch input is only available on the `android` (Chromium) project, via a CDP session and `Input.dispatchTouchEvent`. Playwright's WebKit exposes no touch-drag API at all, so the iPhone itself cannot be driven from this repo — which is why the founder's own device check is the final word and is recorded as a deferred human check."
---

<objective>
Make a slider take a finger anywhere on its bar, not only on the 12px dot — on an upright phone
behind the Fine adjust fold, on a phone held sideways in the sidebar, and on every other screen
too.

Purpose: the founder wrote: "on horizontal phone screen the control point sliders are visible in
the sidebar, but not useable. Might as well turn those back on. Also, in Vertical orientation the
fine adjustment sliders are unuseable." He is describing one defect in two places, and the
diagnosis at planning time found it — and it is not what either of us assumed. Every slider in
this app draws its little dot TWICE, one exactly on top of the other. Base UI only knows about one
of them, so the moment a finger lands anywhere other than the dot, the slider looks up the wrong
dot, decides the press makes no sense, and quietly does nothing. On a computer you never notice,
because a mouse pointer lands on the dot. On a phone your finger lands on the bar, and roughly
seven tenths of that bar is dead. That is the whole bug.

Output: one line changed in the shared slider component so each slider draws one dot instead of
two; a `touch-none` belt-and-braces on the bar and the dot; a source-contract test that pins both;
and a new browser test that drives a real finger on both phone orientations and would fail today.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@components/ui/slider.tsx
@components/design/slider-row.tsx
@e2e/phone-fins-landscape.spec.ts
@e2e/touch-sizing.spec.ts
@e2e/keyboard-focus.spec.ts
@playwright.config.ts
@components/rails/view-full-sized-dialog.css.test.ts
</context>

<execution_constraints>
Work in a git worktree, never on the main checkout.

- `npm install --no-audit --no-fund` once, before any Playwright run. Browsers are already
  installed on this machine — never run `npx playwright install`.
- Every Playwright invocation carries `PW_PORT=3124`, e.g.
  `PW_PORT=3124 npx playwright test e2e/slider-touch.spec.ts --project=android`.
  Port 3000 is the founder's own dev server and must not be touched. If a dev server is needed
  outside Playwright, `curl` port 3100 first and reuse it if it answers, otherwise start one on a
  port at or above 3130 and stop it when finished. Never touch `.next/dev/lock`.
- Type check with `npx tsc --noEmit`. If a fresh worktree is missing generated route types, run
  `npx next typegen` once first.
- Unit tests with `npx vitest run` — never bare `vitest`.
- `npm run lint`.
- `npm run build` is the orchestrator's job on main after the merge, not this task's.
- NEVER pass `--update-snapshots` to Playwright. The five desktop baseline images under
  `e2e/desktop-baseline.spec.ts-snapshots/` are the contract; they get compared, not rewritten.
- Do NOT edit `e2e/touch-drag.spec.ts`, `components/outline/outline-viewer.tsx` or
  `components/rocker/rocker-viewer.tsx` — the sibling task 260909-ktq owns those files right now.
- Do NOT edit anything under `lib/geometry/`. No board number changes in this task.
- Explain every change in plain English for a shaper, in comments and in the commit subject.
</execution_constraints>

<tasks>

<task type="tracer">
  <name>Task 1: Write the browser proof first and watch it fail — a finger on the bar</name>
  <files>e2e/slider-touch.spec.ts</files>
  <precondition>Chromium and WebKit are already installed for Playwright on this machine; the suite starts its own dev server on PW_PORT=3124.</precondition>
  <action>
Create a NEW spec file (do not open e2e/touch-drag.spec.ts — the sibling task owns it). This is
the thin end-to-end slice: one real finger, one slider, both phone orientations, asserting the
number a shaper reads actually moved.

Header comment, in plain English: this file proves a shaper can set a slider by putting a finger
on the bar, not only on the little dot. Record why it must run on the android project only — real
trusted touch input comes from a Chrome DevTools Protocol session and `Input.dispatchTouchEvent`,
and Playwright's WebKit exposes no touch-drag equivalent, so the founder's own iPhone is the final
word and is checked by hand.

Follow the sibling specs' existing conventions: dismiss the sign-in banner through sessionStorage
and the toolbar tip through localStorage in an init script before navigation, exactly as
e2e/keyboard-focus.spec.ts and e2e/phone-fins-landscape.spec.ts already do, so neither strip's
height can confuse a bounding box.

Write a small helper that, given a value-label locator, walks to its row, scrolls the row's bar
into view, reads the bar's box, and returns a point a given fraction along it. Never hardcode a
coordinate — measure from the DOM.

Then three cases.

Case A, upright phone (the `android` project's own Pixel 7, no `test.use`): go to
`/design/outline`, tap the "Fine adjust" row to open the fold, then dispatch touchStart at 75%
along the Width row's bar, a short pause, touchEnd. Assert the "Width — …" label's text changed.
Then a second gesture on the same slider: touchStart on the dot's centre, six touchMove steps that
travel about 48px along the bar AND about 30px down the screen, touchEnd; assert the label changed
again and that the controls scroller's scrollTop is unchanged — a value being set must not scroll
the page out from under the shaper.

Case B, phone held sideways: its own describe with the `Pixel 7 landscape` descriptor applied via
`test.use`, destructuring `defaultBrowserType` out of it first (copy the comment and the pattern
from e2e/phone-fins-landscape.spec.ts lines 35-42), and skipping unless the project name is
`android`. Prove the bed is real before asserting anything about it: assert innerWidth is 863,
innerHeight is 360, and that `(min-width: 820px)` matches, so this really is the desktop-style
sidebar a sideways phone gets. Then the same two gestures on the Width row — which needs no Fine
adjust tap here, because at this width the row is plainly visible in the sidebar.

Case C, a slider that was never a drag-point mirror: on the upright phone go to `/design/rails`
and run the bar-press gesture on the "Deck Profile — …" row. This is what proves the defect was
never about the drag-point rows or the fold — it is every slider.

Run it and record the result verbatim in the commit body and the summary. Expect RED: at planning
time each of these bar presses left the value exactly where it started (Width stayed at 19" at 5%,
20%, 50%, 75% and 95% along the bar, on desktop mouse, Pixel 7 upright touch and Pixel 7 landscape
touch alike). If any case passes before Task 2, stop and report — the diagnosis would be wrong and
the plan needs revisiting rather than a fix landing on top of a green test.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) &amp;&amp; PW_PORT=3124 npx playwright test e2e/slider-touch.spec.ts --project=android --reporter=list; test $? -ne 0 &amp;&amp; echo "RED as expected"</automated>
  </verify>
  <done>e2e/slider-touch.spec.ts exists with three cases, runs on the android project, and fails today with the bar-press assertions — the failure text is recorded in the commit body.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Draw one dot per slider, not two, and say the bar takes a finger</name>
  <files>components/ui/slider.tsx, components/ui/slider-touch-contract.test.ts</files>
  <behavior>
    - Given a slider whose value prop is a single number, exactly one thumb is rendered.
    - Given a slider with no value and no default value, exactly one thumb is rendered.
    - Given a slider whose value prop is an array, one thumb per entry is rendered (unchanged).
    - The bar element and the dot element each declare that a touch on them belongs to the slider, not to the page's scrolling.
  </behavior>
  <action>
Two edits in components/ui/slider.tsx.

FIRST, the fix. The `_values` array at the top of the component decides how many thumbs the render
loop emits. It keeps an array-valued `value` or an array-valued `defaultValue` as-is, and
otherwise falls back to a two-entry array built from the min and max props. That fallback is the
bug: every slider in this app hands it a single number, so every slider draws two dots on top of
each other and Base UI — which only tracks one value — looks up the wrong one whenever a press
lands anywhere but on a dot. Change the non-array fallback so it produces a ONE-entry array,
derived from whichever single value is present (the value prop, else the default value, else min).
Leave both array branches exactly as they are, so a genuine two-ended range slider would still get
two thumbs; there is none in this app today.

Write the comment for a shaper: each slider gets one dot. It used to get two, one hidden exactly
underneath the other, and that is why a finger anywhere on the bar did nothing — the slider looked
up the dot it was not tracking and gave up. Include the measured counts (22 dots for 11 sliders on
the TEMPLATE screen before, 11 after) so a future reader can re-check the claim rather than trust
it. Note the two side benefits plainly: the keyboard now stops once per slider instead of twice,
and a screen reader announces each slider once instead of twice, because each duplicate dot also
carried its own hidden range input.

SECOND, the belt and braces. Add shadcn's `touch-none` utility to the Track's class string and to
the Thumb's class string, beside the classes already there. Comment it honestly: the Control above
already says this, and a browser is supposed to honour a parent's version of it when the finger
lands on a child — Chromium demonstrably does, which is why a drag with 60px of vertical wander
never scrolled the list. This property is not inherited, though, so saying it on the bar and the
dot as well costs nothing where the parent is already honoured and closes the gap where it is not.
It cannot change anything for a mouse: this property only describes touch.

THEN create components/ui/slider-touch-contract.test.ts, following the source-contract idiom this
repo already uses (see components/rails/view-full-sized-dialog.css.test.ts): read the real file
off disk with `readFileSync` and assert on its text. Pin three things, each with a comment saying
what a shaper loses if it breaks:
  1. The fallback that decides the thumb count builds an array of exactly one entry — assert the
     rendered thumb count expression cannot resolve to two for a scalar slider. Express this as a
     positive assertion about the single-value fallback that is present, not as a search for
     something absent.
  2. The Track's class string carries the no-scroll touch utility.
  3. The Thumb's class string carries it too, and still carries the existing `coarse:after:-inset-4`
     ring so the 44px finger target is not lost by accident.

Now re-run the Task 1 spec. It must go green. Expected values from the planning-time measurement
of this exact change: on the upright Pixel 7, a press at 75% along the Width bar takes 19" to
22 7/8" and a press at 20% takes it to 17 5/8"; on Pixel 7 landscape, 23" and 17 1/2"; RAILS' Deck
Profile moves from 1 5/16" to 1" and to 1 1/4". The assertions only require that the value changed,
so treat these as a sanity check on the mechanism rather than as literals to encode.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) &amp;&amp; npx vitest run components/ui/slider-touch-contract.test.ts &amp;&amp; PW_PORT=3124 npx playwright test e2e/slider-touch.spec.ts --project=android --reporter=list</automated>
  </verify>
  <done>Each slider renders one thumb; the new contract test passes; e2e/slider-touch.spec.ts is green on the android project for all three cases.</done>
</task>

<task type="auto">
  <name>Task 3: Prove nothing else moved — mouse, keyboard, finger size, and the board's own numbers</name>
  <files>e2e/slider-touch.spec.ts</files>
  <action>
No new behaviour here. This task proves the change is confined to "the bar now takes a finger" and
nothing else, and records the numbers.

Run, in this order, and record each result in the summary:
  1. `npx tsc --noEmit` (run `npx next typegen` once first if a fresh worktree is missing route
     types).
  2. `npx vitest run` — every geometry suite must stay green. No board number may change.
  3. `npm run lint`.
  4. `PW_PORT=3124 npx playwright test e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts
     --project=desktop` — the five macOS baseline screenshots are compared against the existing
     images. Two identical dots drawn one on top of the other and one dot drawn once must be the
     same pixels, because the dot is opaque; if any baseline differs, STOP and report the diff
     rather than regenerating it. Never pass `--update-snapshots`.
  5. `PW_PORT=3124 npx playwright test e2e/touch-sizing.spec.ts` — every visible thumb's finger
     target must still measure at least 44x44 on both phone projects, and the desktop resting
     measurements (28x28 thumb target) must be unchanged. Halving the thumb count must not have
     halved the target.
  6. `PW_PORT=3124 npx playwright test e2e/keyboard-focus.spec.ts --project=desktop` — Tab must
     still land on a slider thumb and paint the accent ring. Its ceiling is derived from the page's
     own count of focusable elements, so a page with half as many hidden range inputs is fine; if
     it is not, report rather than widening the ceiling.
  7. `PW_PORT=3124 npx playwright test --project=android --project=iphone` — the full phone pass,
     including the sibling-owned e2e/touch-drag.spec.ts run UNCHANGED as a read-only regression
     check that a drag on the drawing itself still moves the board.

If step 7 collides with the sibling task's in-flight edits to e2e/touch-drag.spec.ts, re-run after
rebasing rather than editing that file.

Finally, add one short paragraph to the top-of-file comment in e2e/slider-touch.spec.ts recording,
for the next reader, that the iPhone itself cannot be driven from this repo and that the founder's
own device check is the closing evidence.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) &amp;&amp; npx tsc --noEmit &amp;&amp; npx vitest run &amp;&amp; npm run lint &amp;&amp; PW_PORT=3124 npx playwright test e2e/desktop-baseline.spec.ts e2e/desktop-regression.spec.ts --project=desktop &amp;&amp; PW_PORT=3124 npx playwright test e2e/touch-sizing.spec.ts e2e/keyboard-focus.spec.ts &amp;&amp; PW_PORT=3124 npx playwright test --project=android</automated>
    <human-check>
On the founder's own iPhone, on the deployed site or a phone pointed at the dev server:
  1. Held UPRIGHT on the Template screen, open "Fine adjust". Put a finger down on the middle of
     the Width bar — the number should jump to where the finger landed. Keep the finger down and
     slide it left and right — the number should follow the finger, and the controls list should
     not scroll while it does.
  2. Do the same on a rail slider on the Rails screen.
  3. Turn the phone SIDEWAYS on the Template screen, where those same rows sit in the sidebar, and
     repeat. Same result expected.
  4. Then check the opposite: swipe up and down the controls list in the gaps between sliders — it
     should still scroll normally, and only a finger that lands ON a bar or a dot should set a
     value.
If (1)-(3) still do nothing under a finger on the iPhone specifically, the one remaining candidate
is already identified and is a one-line follow-up: Base UI hides a real `<input type="range">`
inside each dot, sitting exactly over it, 10px square, hidden by a clip-path but still accepting
pointer input. Chromium correctly refuses to hit it; iOS may not. The follow-up would be a single
rule making that hidden input ignore pointer input, which leaves keyboard focus and the focus ring
untouched.
    </human-check>
  </verify>
  <done>Type check, unit tests and lint pass; the five desktop baselines match without being regenerated; touch sizing and keyboard focus stay green; the phone suite passes; the founder's device check is recorded as a deferred human check in the summary.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| finger/mouse → shared slider component | Untrusted pointer coordinates cross into a control that writes board dimensions |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-kyz-01 | Tampering | components/ui/slider.tsx thumb-count fallback | medium | mitigate | The bar becoming live means a press now writes a value where it previously wrote nothing. Base UI clamps the computed value to the slider's own min/max and rounds it to the declared step before it ever reaches the app, and every call site already converts through lib/geometry/units.ts. Task 3's full vitest run pins that no geometry output changes. |
| T-kyz-02 | Denial of Service | touch-none on the bar and the dot | low | accept | A vertical swipe that starts exactly on a 6px bar or a 44px dot ring will no longer scroll the controls list. That is the intended behaviour of a slider, it is already how Chromium behaves via the parent Control, and the founder's device check step 4 explicitly confirms the list still scrolls in the gaps between sliders. |
| T-kyz-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package is added, removed or upgraded by this task. `npm install --no-audit --no-fund` only restores the existing lockfile in a fresh worktree. |
</threat_model>

<verification>
- Every slider on every design screen renders exactly one element carrying `data-slot="slider-thumb"`.
- A real (CDP) touch press anywhere along a slider's bar changes the value the shaper reads, on
  Pixel 7 upright behind the Fine adjust fold, on Pixel 7 landscape in the sidebar, and on a
  non-drag-point row (RAILS Deck Profile).
- A real touch drag starting on the dot still changes the value even with vertical wander, and the
  controls scroller's scrollTop is unchanged during it.
- The five desktop baseline screenshots match the existing images with no regeneration.
- e2e/touch-sizing.spec.ts, e2e/keyboard-focus.spec.ts and the sibling-owned e2e/touch-drag.spec.ts
  all pass unchanged.
- `npx tsc --noEmit`, `npx vitest run` and `npm run lint` all pass.
</verification>

<success_criteria>
A shaper can set any slider on any design screen by putting a finger anywhere on its bar and
sliding, on a phone held either way; the same click now works with a mouse; and nothing about the
board's numbers, the desktop's pixels, the keyboard ring or the 44px finger targets has changed.
</success_criteria>

<output>
Create `.planning/quick/260909-kyz-sliders-work-under-a-finger-again-the-dr/260909-kyz-SUMMARY.md` when done.

Suggested commit subject: `fix(sliders): a finger anywhere on a slider's bar now sets the value`
</output>
