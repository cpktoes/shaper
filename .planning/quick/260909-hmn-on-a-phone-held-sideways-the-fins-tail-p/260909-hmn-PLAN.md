---
phase: quick-260909-hmn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/fins/fin-viewer.tsx
  - e2e/phone-fins-landscape.spec.ts
  - CLAUDE.md
autonomous: true
requirements: [QT-260909-hmn]

estimate:
  tokens: 42000
  raw_tokens: 42000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "Turn the phone on its side on the FINS screen and the tail diagram gets noticeably bigger. MEASURED in the browser at planning time on a Pixel 7 held sideways: the drawing goes from 116 x 89 screen dots to 211 x 162 — about 80% taller, a bit over three times the area. On a smaller phone held sideways (iPhone 14, which lands in the stacked layout) it goes from a barely-there 22 x 17 to 117 x 90."
    - "The Base Length key — the little Front/Rear/Center list with the dashed swatches — is still there, still says the same thing, and still reads at the same text size. It just sits in a narrow column to the RIGHT of the tail diagram instead of underneath it, with its lines lined up beside the drawing rather than stacked below it."
    - "That swap happens because the SCREEN IS SHORT, not because it is wide and not because it is a phone. Anything shorter than 500 dots gets the side-by-side reading. MEASURED: a Pixel 7 on its side is 360 dots tall and an iPhone 14 on its side is 340, so both get it; a Pixel 7 upright is 839, an iPhone 14 upright is 664, an iPad Mini sideways is 768 and a normal computer window is 800, so none of them do."
    - "Hold the phone upright and nothing moves at all. MEASURED before and after on both phone profiles: the diagram box, the drawing inside it and the legend are identical to the dot (Android 344 x 291 diagram, iPhone 322 x 195), and the legend is still underneath."
    - "On a computer, a tablet, or any normal browser window nothing changes either. The five desktop reference pictures — including the FINS one — still match pixel for pixel, and at 1280 x 800 the legend still sits under the plot exactly where it does today."
    - "No board number changes anywhere. Nothing under lib/geometry/ is read or written differently, no measurement is recalculated, and no label, fin mark or dimension moves relative to the drawing — the drawing is only scaled into a bigger box by the same fitting rule it already uses."
  artifacts:
    - "components/fins/fin-viewer.tsx — three className strings gain short-screen-only classes; two of those elements gain a pixel-inert test hook"
    - "e2e/phone-fins-landscape.spec.ts — the new browser proof: one sideways-phone case and one full-height-screen case"
    - "CLAUDE.md — one added line in the Layout section naming viewport height as a third, independent axis"
  key_links:
    - "The short-screen rule is written INLINE in components/fins/fin-viewer.tsx as the Tailwind arbitrary variant `[@media(max-height:500px)]:`. It is deliberately NOT a named variant in app/globals.css and NOT `max-shell:`. Compiled against this repo's own Tailwind 4 install at planning time — it emits `@media (max-height:500px) { … }` correctly, after the unprefixed utilities in the same layer, so it wins on source order."
    - "The plot wrapper must take `min-w-0` under the same condition, or a `w-full flex-1` child cannot shrink to leave room for the legend column beside it."
    - "The wrapper must take `items-stretch` under the same condition. The svg inside the plot is `absolute inset-0`, so in a row with `items-center` the plot's own height collapses to zero and the drawing disappears entirely. This is the single most breakable link in the change."
    - "Every class added to those elements carries the `[@media(max-height:500px)]:` prefix. Nothing unprefixed is added, so no screen at any other height can be reached by this change — which is what makes the desktop baselines a real guard rather than a hopeful one."
    - "`data-fin-plot` and `data-fin-legend` are the test hooks, following this codebase's existing `data-drag-target` / `data-design-controls-scroll` idiom. Data attributes render nothing, so the desktop screenshots cannot see them."
---

<objective>
On the FINS screen, when the screen is too short for the legend to sit under the tail plot, move the
legend to a narrow column beside the plot and give the plot the height it frees up.

Purpose: the founder's own words — "In phone horizontal, the fins plot could be bigger if the legend
was on the side of rather than under the tail plot." A phone held sideways is a wide, short screen.
The tail drawing keeps its proportion inside its box, so on a short box it is limited by HEIGHT, and
the legend stacked beneath it is eating between a quarter and three quarters of that height. Handing
that height back is the whole change.

Output: a bigger tail diagram whenever the screen is short, byte-identical layout at every other
height, and a browser test that would fail if either of those stopped being true.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@CLAUDE.md

@components/fins/fin-viewer.tsx
@e2e/phone-screens.spec.ts
@e2e/phone-layout.spec.ts
@playwright.config.ts
</context>

<measured_facts>

Everything below was measured in a real browser at planning time against this checkout, on a dev
server started from this repo. Nothing here is estimated. Reuse these numbers; do not re-derive
them, and do not substitute a guess for one.

## What the app actually reports at each size, on `/design/fins`

`plot` is the drawing's own box (the div wrapping the svg). `viewer` is its parent, the wrapper that
holds the plot and the legend together. `drawn` is the tail diagram as actually painted, after
`preserveAspectRatio="xMidYMid meet"` fits it into the plot box.

| Device (real app, viewport meta honoured) | viewport | `(max-height:500px)` | shell layout | viewer box | plot box | drawn | plot ÷ viewer |
|---|---|---|---|---|---|---|---|
| `Pixel 7 landscape` (chromium) | **863 x 360** | **true** | desktop (863 ≥ 820) | 426 x 162 | 426 x **89** | 116 x 89, height-bound | **0.549** |
| `iPhone 14 landscape` (webkit) | **750 x 340** | **true** | phone stack (750 < 820) | 682 x 90 | 682 x **17** | 22 x 17, height-bound | **0.189** |
| `Pixel 7` upright (chromium) | 412 x 839 | false | phone stack | 344 x 364 | 344 x 291 | 344 x 264 | 0.799 |
| `iPhone 14` upright (webkit) | 390 x 664 | false | phone stack | 322 x 268 | 322 x 195 | 254 x 195 | 0.728 |
| `iPad Mini landscape` (webkit) | 1024 x 768 | false | desktop | 548 x 570 | 548 x 497 | 548 x 420 | 0.872 |
| desktop project | 1280 x 800 | false | desktop | 804 x 614 | 804 x 541 | 706 x 541 | 0.881 |

Read the first two rows together: a sideways phone lands on BOTH sides of the 820px width switch.
That is exactly why width and orientation are the wrong predicates and "the screen is short" is the
right one. 500px is comfortably clear of every measurement above — 140 dots of headroom above the
tallest sideways phone (360) and 164 below the shortest upright one (664).

## What the proposed change produces, simulated in the same browsers

The simulation injected precisely the CSS the class strings in Task 1 compile to — `flex-direction:
row`, `align-items: stretch`, `gap: 0.5rem` on the wrapper, `min-width: 0` on the plot,
`justify-content: center` on the legend, all inside `@media (max-height: 500px)`.

| Device | plot box after | drawn after | plot ÷ viewer after | legend after |
|---|---|---|---|---|
| `Pixel 7 landscape` | 250 x **162** | **211 x 162** (was 116 x 89) | **1.000** | at x=657, to the right of the plot's right edge (650) |
| `iPhone 14 landscape` | 506 x **90** | **117 x 90** (was 22 x 17) | **1.000** | at x=548, right of the plot's right edge (540) |
| `Pixel 7` upright | 344 x 291 — **unchanged to the dot** | 344 x 264 — unchanged | 0.799 | still beneath |
| `iPhone 14` upright | 322 x 195 — **unchanged to the dot** | 254 x 195 — unchanged | 0.728 | still beneath |

The drawing stays height-bound after the change on both sideways phones (it needs 211 of the 250
available dots of width on the Pixel), so the legend column is not stealing width the drawing wanted.

## The threshold for the test's own assertion

`plot ÷ viewer` is the honest single number, and one threshold separates every case: **0.95**.
After the change a short screen reads 1.000; before it read 0.549 (Pixel sideways). Every
full-height case reads at most 0.881. So `>= 0.95` on a sideways phone and `< 0.95` on a full-height
screen both hold, and the sideways assertion genuinely fails today.

## Tailwind 4 compiles the inline variant

`[@media(max-height:500px)]:flex-row`, `:items-stretch`, `:gap-2`, `:min-w-0` and `:justify-center`
were all compiled through this repo's own `@tailwindcss/postcss` at planning time. They emit a single
`@media (max-height:500px) { … }` block placed after the unprefixed `.flex-col` / `.items-center` /
`.gap-4` rules in the same utilities layer, so the short-screen rule wins on source order with no
`!important` and no specificity trick.

</measured_facts>

<assumption_delta_decision surface="where the short-screen condition is written">
**Inline in `components/fins/fin-viewer.tsx` as a Tailwind arbitrary variant — NOT promoted to a
named variant in `app/globals.css`.**

Phase 9's own decision record (`09-09-PLAN.md`) settled this shape of question already: a condition
with one consumer is written at its call site, and only promoted to a named variant beside `coarse`
when a second file needs it. This task searched for a second consumer and did not find one — the fin
tail plot is the only drawing in the app whose legend is stacked beneath it, and `FinViewer` is
imported in exactly one place (`components/fins/fin-placement-editor.tsx`). So it stays inline.

Concretely: do NOT add `@custom-variant short (@media (max-height: 500px))` to `app/globals.css`,
and do not touch that file at all. If a second screen ever wants the same rule, promoting it then is
a five-line change with a real reason behind it.
</assumption_delta_decision>

<tasks>

<task type="tracer">
  <name>Task 1: On a short screen, put the fin key beside the tail plot instead of under it</name>
  <files>components/fins/fin-viewer.tsx, e2e/phone-fins-landscape.spec.ts</files>
  <precondition>`npm install --no-audit --no-fund` has been run once in this worktree, and the Playwright browsers are already installed on this machine — never run `npx playwright install`.</precondition>
  <read_first>
    - components/fins/fin-viewer.tsx lines 447-470 — the wrapper's own comment (why it carries `h-full` as well as `flex-1`) and the plot wrapper's comment (why the svg is `absolute inset-0` rather than `h-full w-full`). Both comments explain constraints this task must not break; leave both comments in place.
    - components/fins/fin-viewer.tsx lines 586-602 — the legend block, and the `!compact` gate around it.
    - e2e/phone-screens.spec.ts lines 12-52 — the `BANNER_DISMISSAL_KEY` constant, the `dismissSignInBanner` helper and the per-describe `beforeEach` skip idiom. Copy these idioms; do not import from that file and do not edit it.
    - e2e/phone-screens.spec.ts lines 136-176 — the existing portrait FINS assertions, including line 160's "diagram spans at least 90% of the viewport width". These must keep passing untouched; this task must not edit a character of them.
    - playwright.config.ts lines 57-64 — the three projects (`iphone`/webkit, `android`/chromium, `desktop`/chromium at 1280x800) and `workers: 1`.
  </read_first>
  <action>
    Three className strings in `components/fins/fin-viewer.tsx` change, and two of those elements gain
    a test hook. Nothing else in the file is touched — no geometry, no viewBox, no formula, no label.

    1. The viewer wrapper, currently `<div className="flex h-full min-h-0 w-full flex-1 flex-col
       items-center gap-4">`. Append, in this order, `[@media(max-height:500px)]:flex-row`,
       `[@media(max-height:500px)]:items-stretch`, `[@media(max-height:500px)]:gap-2`. This element
       needs no test hook of its own — the test reaches it from the plot with an `xpath=..`
       locator, the same idiom `e2e/phone-screens.spec.ts` already uses for the shell root.

    2. The plot wrapper, currently `<div className="relative flex min-h-0 w-full flex-1
       justify-center">`. Append `[@media(max-height:500px)]:min-w-0`, and add a bare `data-fin-plot`
       attribute to the same element.

    3. The legend, currently `<div className="flex flex-none flex-col gap-1 text-[11px]
       text-muted-foreground">`. Append `[@media(max-height:500px)]:justify-center`, and add a bare
       `data-fin-legend` attribute to the same element.

    Every added class carries the variant prefix. Do not add, remove or reorder any unprefixed class
    on any of the three elements, and do not touch `app/globals.css`.

    Above the wrapper's existing comment, add a short comment recording the three things a later
    editor would otherwise get wrong: that the condition is the screen's HEIGHT and nothing else (a
    phone on its side lands on both sides of the 820px width switch, so `max-shell:` would be wrong
    on one of them); that `items-stretch` is load-bearing rather than cosmetic, because the svg is
    `absolute inset-0` and in a row with centred items the plot's height collapses to zero and the
    drawing vanishes; and the measured payoff, that on a Pixel 7 on its side the drawing goes from
    116 x 89 to 211 x 162. Keep it plain — it is describing what a shaper sees.

    Then write the browser proof, a NEW file `e2e/phone-fins-landscape.spec.ts`. A new file, not an
    addition to `e2e/phone-layout.spec.ts`, because another quick task in flight is already editing
    that file. Import `devices` alongside `expect`, `test` and `type Page` from `@playwright/test`.
    Copy `BANNER_DISMISSAL_KEY` and the `dismissSignInBanner` helper from `e2e/phone-screens.spec.ts`
    verbatim. Two describes:

    - "FINS with the phone held sideways" — `test.use({ ...devices["Pixel 7 landscape"] })` at the
      top of the describe body, and a `beforeEach` that skips every project except `android` (that
      descriptor is a chromium one) and dismisses the banner. Open `/design/fins`. FIRST, prove the
      test is not vacuous: read `window.innerWidth`, `window.innerHeight` and
      `matchMedia("(max-height: 500px)").matches` in the page and assert 863, 360 and `true`. Then
      take bounding boxes for `main [data-fin-plot]`, `main [data-fin-legend]`, and the viewer
      wrapper reached as `plot.locator("xpath=..")`. Assert the legend's left edge is at or past the
      plot's right edge (`legend.x >= plot.x + plot.width - 1`) and that the plot fills the wrapper's
      height (`plot.height / viewer.height >= 0.95`).
    - "FINS on a full-height screen" — no `test.use`; a `beforeEach` that skips every project except
      `desktop`. Open `/design/fins`, assert `matchMedia("(max-height: 500px)").matches` is `false`,
      and assert the mirror image: the legend's top edge is at or past the plot's bottom edge
      (`legend.y >= plot.y + plot.height - 1`) and `plot.height / viewer.height < 0.95`.

    Head the file with a comment carrying the two measurements that make it meaningful: that the
    same sideways phone reads 0.549 before the change and 1.000 after, and that `iPhone 14 landscape`
    is deliberately not used here because Playwright emulates it at 750px, below the 820px shell
    breakpoint — it is a fine screen for the feature but a poor descriptor for THIS assertion, since
    the two phones exercise two different shells and one file should not silently depend on which.

    Before trusting the result, watch it fail: stash just the `fin-viewer.tsx` change, run the
    sideways case, and confirm it reports a ratio near 0.549 and a legend that is not to the right.
    Restore the change and confirm it goes green.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && npm install --no-audit --no-fund && npx tsc --noEmit && npx vitest run && npm run lint && grep -q 'data-fin-plot' components/fins/fin-viewer.tsx && grep -q 'data-fin-legend' components/fins/fin-viewer.tsx && git diff --name-only app/globals.css e2e/phone-screens.spec.ts | wc -l | grep -qx '0' && PW_PORT=3118 npx playwright test e2e/phone-fins-landscape.spec.ts</automated>
    <human-check>Open `/design/fins` in a browser and drag the window until it is under 500 dots tall: the Base Length key hops to the right of the tail drawing and the drawing grows to fill the height. Drag it taller again and the key drops back underneath.</human-check>
  </verify>
  <done>On `Pixel 7 landscape` the FINS legend sits to the right of the tail plot and the plot fills at least 95% of the viewer's height; on the desktop project the legend is still beneath it and the plot fills less than 95%. The new spec passes on both projects, was watched failing with the component change removed, and `app/globals.css` and `e2e/phone-screens.spec.ts` are untouched.</done>
  <reversibility rating="reversible">Three class strings and two data attributes in one component, plus one new test file — reverting is a single `git revert`, and no data, schema or saved board is involved.</reversibility>
</task>

<task type="auto">
  <name>Task 2: Write down the third switch, then prove nothing else on the app moved</name>
  <files>CLAUDE.md</files>
  <read_first>
    - CLAUDE.md, the `## Layout` section — specifically the paragraph beginning "Two phone-only switches live in `app/globals.css`". Read it as it stands at execution time rather than assuming today's wording: another quick task in flight may also be editing this section.
    - e2e/desktop-baseline.spec.ts lines 1-25 — the header explaining that these five shots are the definition of "desktop untouched", that they are macOS-rendered and local-only, and the `maxDiffPixels: 100` tolerance.
  </read_first>
  <action>
    Add one sentence (two at most) to the end of that Layout paragraph, in the paragraph's own voice,
    recording that there is now a third axis and that it is independent of the other two: how SHORT
    the screen is. Say what it decides — on FINS, whether the Base Length key sits beside the tail
    drawing or beneath it — that it is written inline in `components/fins/fin-viewer.tsx` as
    `[@media(max-height:500px)]` rather than as a named variant in `app/globals.css` because it has
    exactly one consumer today, and that it is deliberately not tied to width, because a phone held
    sideways lands on both sides of the 820px switch (863 dots wide on a Pixel 7, 750 on an iPhone 14)
    while being short on both. Close it the way the paragraph closes: width picks the layout, pointer
    picks the sizing, height picks whether the key sits beside or beneath — and none of the three is
    ever conflated with another.

    Do not restructure the section, do not renumber anything, and do not edit the `coarse` or
    `--breakpoint-shell` sentences.

    Then run the whole browser suite — all three projects, including the five desktop reference
    pictures. Never pass `--update-snapshots`: if `fins-desktop-desktop-darwin.png` disagrees, that
    is the change reaching the desktop and it must be fixed in the component, not re-baselined.
  </action>
  <verify>
    <automated>cd "$(git rev-parse --show-toplevel)" && npx tsc --noEmit && npx vitest run && npm run lint && PW_PORT=3118 npx playwright test && git status --porcelain e2e/desktop-baseline.spec.ts-snapshots | wc -l | grep -qx '0'</automated>
  </verify>
  <done>CLAUDE.md's Layout section names viewport height as a third, independent switch and records that it lives inline in the fin viewer. The full Playwright suite is green on all three projects, and no baseline screenshot file was rewritten.</done>
</task>

</tasks>

<executor_constraints>

- Work in a git worktree. Run `npm install --no-audit --no-fund` once there before any Playwright
  command.
- `PW_PORT=3118` on **every** Playwright invocation. Port 3000 is the founder's own dev server and
  3100 is the suite's default — never either.
- Playwright browsers are already installed on this machine. Never run `npx playwright install`.
- Never `--update-snapshots`, for any reason.
- `npx vitest run`, never bare `vitest`. `npx tsc --noEmit` and `npm run lint` before each commit.
- `npm run build` is the orchestrator's, on main — Turbopack will not resolve `next` from a worktree.
- Do not edit `components/ui/*` or anything under `lib/geometry/*`. This change reads no geometry and
  writes none.
- Do not edit `app/globals.css`, `e2e/phone-screens.spec.ts`, `e2e/phone-layout.spec.ts` or
  `e2e/desktop-baseline.spec.ts` — the first by the decision above, the rest because they are either
  another task's file or the guard this task is being measured against.
- Explain every commit in plain English, about the screen and the board — a shaper reads these.
  Suggested subjects: `fix(fins): on a sideways phone, put the fin key beside the tail plot so the
  drawing gets bigger` for Task 1, and `docs: note that a short screen now moves the fin key beside
  the plot` for Task 2.

</executor_constraints>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| none crossed | This change moves one element in one drawing's layout. No input is parsed, no request is made, no storage is read or written, and no value leaves the browser. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-260909-hmn-01 | Information Disclosure | components/fins/fin-viewer.tsx | low | mitigate | A layout change could crop or hide the Base Length key, which is a number a shaper cuts foam to. Mitigated by keeping the legend a `flex-none` column (it is sized by its own content, never squeezed) and by the new test asserting it has a real bounding box beside the plot; the measured after-state gives it 168 of 426 dots on the narrowest case, with the drawing still height-bound in the remainder. |
| T-260909-hmn-02 | Tampering | e2e/desktop-baseline.spec.ts-snapshots | medium | mitigate | The easy wrong fix for a failing baseline is to re-record it, which would silently let this change reach the desktop. Mitigated by the explicit never-`--update-snapshots` constraint above and by Task 2's `git status --porcelain` gate on the snapshot directory, which fails if any baseline file was rewritten. |
| T-260909-hmn-03 | Denial of Service | components/fins/fin-viewer.tsx | low | accept | If `items-stretch` were omitted, the drawing's height would collapse to zero on a short screen and the shaper would see nothing at all. Accepted rather than further mitigated because the new test's `plot.height / viewer.height >= 0.95` assertion cannot pass with a zero-height plot — the failure mode is caught by the proof this plan already requires. |
| T-260909-hmn-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package is installed by this task. `npm install --no-audit --no-fund` in the worktree only materialises the committed lockfile; nothing is added, removed or upgraded, so the package-legitimacy gate has nothing to audit. |
</threat_model>

<verification>

1. `npx tsc --noEmit`, `npx vitest run` and `npm run lint` all clean.
2. `PW_PORT=3118 npx playwright test` green across all three projects, including the five desktop
   reference pictures, with no snapshot file rewritten.
3. The new sideways case was watched FAILING with the `fin-viewer.tsx` change removed (it should
   report a plot-to-viewer ratio near 0.549 and a legend that is not to the right of the plot) and
   passing with it restored.
4. `git diff` on `components/fins/fin-viewer.tsx` shows only: three className strings extended with
   `[@media(max-height:500px)]:`-prefixed classes, two added data attributes, and one added comment.
   No unprefixed class added, removed or reordered.
5. `app/globals.css`, `e2e/phone-screens.spec.ts`, `e2e/phone-layout.spec.ts`,
   `e2e/desktop-baseline.spec.ts` and everything under `lib/geometry/` are untouched.

</verification>

<success_criteria>

- On a phone held sideways, the FINS tail drawing is measurably bigger: at least 95% of the viewer's
  height, up from 55% (Pixel 7 sideways) and 19% (iPhone 14 sideways).
- The Base Length key sits to the right of the drawing on a short screen and beneath it on every
  other screen, both asserted in the committed browser suite.
- Upright phones, tablets and desktop windows render identically to today, with the five desktop
  reference pictures matching pixel for pixel.
- CLAUDE.md records viewport height as a third switch, independent of width and pointer.

</success_criteria>

<output>
Create `.planning/quick/260909-hmn-on-a-phone-held-sideways-the-fins-tail-p/260909-hmn-SUMMARY.md` when done
</output>
