---
phase: quick-260909-oho
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/design/fine-adjust-group.tsx
  - components/outline/outline-controls.tsx
  - components/rocker/rocker-controls.tsx
  - app/globals.css
  - e2e/phone-layout.spec.ts
  - e2e/touch-sizing.spec.ts
  - e2e/touch-drag.spec.ts
  - e2e/slider-touch.spec.ts
  - e2e/prod/slider-dots.spec.ts
autonomous: true
requirements: [QT-260909-oho]

estimate:
  tokens: 60000
  raw_tokens: 40000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "On a phone, TEMPLATE shows every one of its sliders straight away — Width and Offset under Widepoint Controls, Tail Rail and Nose Rail under them, Nose Angle and Fullness under Nose Controls, Tail Angle and Fullness under Tail Controls — each one in the same section, in the same reading order, as a shaper sees on a desktop screen. Nothing is tucked away behind a header any more."
    - "On a phone, ROCKER does the same: Nose Angle, Nose Smoothness, Nose Flatness, Tail Flatness, Tail Smoothness and Tail Angle all sit in the Rocker section between Nose Rocker and Tail Rocker, exactly where the desktop sidebar puts them."
    - "There is no 'Fine adjust' row anywhere in the app any more, on any screen at any width, and no tap is needed to reach any slider."
    - "The desktop is untouched — every rule that has just been deleted was gated behind `max-shell:` (below 820px) or `hidden max-shell:flex`, so no desktop pixel can move. The five desktop baseline screenshots are re-run against the existing images and must match; they are never regenerated."
    - "No board number changes. Nothing under lib/geometry/ is read or written differently, and no drawing, label or measurement is recalculated."
    - "Every slider still takes a finger anywhere on its bar (260909-kyz) and every slider still shows its dot the moment the page loads (260909-nvw) — neither of those two very recent fixes is weakened by this one."
  artifacts:
    - components/outline/outline-controls.tsx
    - components/rocker/rocker-controls.tsx
    - e2e/phone-layout.spec.ts
    - e2e/prod/slider-dots.spec.ts
  key_links:
    - "THIS TASK DELETES A FILE: components/design/fine-adjust-group.tsx goes away entirely. It has exactly two importers (outline-controls.tsx line 38, rocker-controls.tsx line 53), both edited here, and no test imports it. The orchestrator merges this worktree by hand, so a deletion is fine — just make sure the deletion is staged (`git rm`, or `git add -A`, never a plain `git add <changed files>` that would leave the removal out of the commit)."
    - "D-03 (`.planning/phases/09-the-design-screens-on-a-phone/09-CONTEXT.md` line 85) is WITHDRAWN by the founder on 2026-09-09: \"Let's just remove the 'fine adjustments' section and put the sliders where they are supposed to be.\" The CONTEXT.md decision record stays exactly as it is — it is history, not a live instruction. Do NOT edit CONTEXT.md."
    - "The fold never moved a row in the DOM. Every folded row is already sitting in its own section in source order; the fold only pushed it to the end with `max-shell:order-5x` and hid it with `max-shell:group-data-[fine-adjust=closed]:hidden`. So deleting those two classes IS the whole layout change — the natural DOM order already is the desktop order the founder is asking for. No row needs moving."
    - "The bare `group` class on each controls column exists ONLY for the fold's `group-data-[fine-adjust=closed]:` selector and goes with it. Checked at planning time: the only other `group-*` variants anywhere in these two trees are `components/ui/checkbox.tsx`'s NAMED groups (`group-has-disabled/field`, `group-has-[:focus-visible]/field-label`), which are keyed to `group/field` and `group/field-label` markers and never match a bare `group`. Nothing else reads it."
    - "rocker-controls.tsx's two `max-shell:contents` overrides (lines 135 and 140) exist only so CSS `order` could reach rows nested two levels down inside the Rocker section. With the fold gone they have no job, and removing them puts the Rocker section's rows back on that section's own `gap-3.5` spacing on a phone — the same spacing the desktop shows. That is the intended, visible effect: the phone sidebar now matches the desktop sidebar, which is exactly the founder's request."
    - "AFTER this change no slider anywhere in the app is `display: none` at page load. Verified at planning time by grepping every file that renders a Slider or SliderRow (fin-controls, volume-controls, rail-controls, outline-controls, rocker-controls): the fold was the app's only CSS-hidden slider. Every collapsible section elsewhere uses a conditional render (`{sectionOpen.x && ...}`), so a closed section renders no slider at all and mounts a fresh one when it opens — which was never the bug 260909-nvw guards. That is why e2e/prod/slider-dots.spec.ts must be reduced rather than re-pointed."
    - "components/ui/slider.tsx is OFF LIMITS. Its zero-width remount guard stays exactly as it is — it still protects any future screen that loads a slider hidden, and weakening it would silently re-open the bug fixed an hour ago in 260909-nvw. Its own header comment mentions the Fine adjust fold as the case that found the bug; that is a historical note about how it was discovered and is deliberately left alone here."
    - "e2e/touch-drag.spec.ts is shared with the SIBLING quick task 260909-oge (the readout box staying outside the outline), which will add cases to it after this one lands. Keep the edits here surgical: remove the Fine adjust taps and the sentences that explain them, change nothing else in that file."
    - "TEMPLATE has exactly 11 sliders (Board Length, Nose Angle, Fullness, Width, Offset, Tail Rail, Nose Rail, Tail Block, Depth, Tail Angle, Fullness), so the prod spec's existing `toBeGreaterThanOrEqual(11)` still holds on all three profiles once every row renders."
    - "The seven `getByRole(\"button\", { name: \"Fine adjust\" }).click()` calls in e2e/touch-drag.spec.ts sit at lines 88, 151, 223, 299, 341, 390 and 444. Three of them (88, 151, 444) are preceded by a sentence explaining the fold; the other four are bare. Grep for zero remaining rather than trusting the count."
---

<objective>
Take the "Fine adjust" fold off the phone. Every slider on TEMPLATE and ROCKER goes back to sitting
in its own section, in the same order a shaper sees on a desktop screen, with nothing hidden behind
a header.

Purpose: the founder's words, on 2026-09-09: "Let's just remove the 'fine adjustments' section and
put the sliders where they are supposed to be." When the phone screens were designed, the sliders
that only repeat what a draggable point on the drawing already sets were folded away to keep the
small screen tidy (decision D-03). In use it turned out to be one more thing to tap before you can
set a number, and a shaper looking for Width on their phone could not find it. So the fold goes,
and the phone sidebar reads exactly like the desktop one.

Output: the shared fold header component deleted; both control sidebars back to plain sections; the
browser tests that used to tap the fold open rewritten to prove the sliders are simply there; and
the five desktop baseline screenshots re-run untouched, because every rule being deleted only ever
applied below the 820px phone breakpoint.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@components/design/fine-adjust-group.tsx
@components/outline/outline-controls.tsx
@components/rocker/rocker-controls.tsx
@e2e/phone-layout.spec.ts
@e2e/touch-sizing.spec.ts
@e2e/touch-drag.spec.ts
@e2e/slider-touch.spec.ts
@e2e/prod/slider-dots.spec.ts
@playwright.config.ts
@playwright.prod.config.ts
</context>

<execution_constraints>
Work in a git worktree, never on the main checkout.

- `npm install --no-audit --no-fund` once, before any Playwright run. Chromium and WebKit are
  already installed on this machine — never run `npx playwright install`.
- Every Playwright invocation carries `PW_PORT=3126`, e.g.
  `PW_PORT=3126 npx playwright test e2e/phone-layout.spec.ts --project=iphone --project=android`.
  Port 3000 is the founder's own dev server and must not be touched. If a dev server is needed
  outside Playwright, `curl` port 3100 first and reuse it if it answers, otherwise start one on a
  port at or above 3130 and stop it when finished. Never touch `.next/dev/lock`.
- Type check with `npx tsc --noEmit`. If a fresh worktree is missing generated route types, run
  `npx next typegen` once first.
- Unit tests with `npx vitest run` — never bare `vitest`.
- `npm run lint`.
- `npm run build` and `npm run test:e2e:prod` are the ORCHESTRATOR's job on main after the merge,
  not this task's — Turbopack will not resolve `next` from a worktree.
- NEVER pass `--update-snapshots` to Playwright. The five desktop baseline images under
  `e2e/desktop-baseline.spec.ts-snapshots/` are the contract; they get compared, not rewritten.
- Do NOT edit anything under `components/ui/`, anything under `lib/geometry/`, the viewers
  (`components/outline/outline-viewer.tsx`, `components/rocker/rocker-viewer.tsx`), or any e2e spec
  not named in this plan.
- Do NOT edit `.planning/phases/09-the-design-screens-on-a-phone/09-CONTEXT.md`. The D-03 record
  stays as written history.
- Explain every change in plain English for a shaper, in comments, in commit subjects and in the
  summary. Say what it does to the board or the screen, not which component re-renders.
</execution_constraints>

<tasks>

<task type="tracer">
  <name>Task 1: Take the fold out — every slider back in its own section, proved in a real phone browser</name>
  <files>components/design/fine-adjust-group.tsx (deleted), components/outline/outline-controls.tsx, components/rocker/rocker-controls.tsx, app/globals.css, e2e/phone-layout.spec.ts</files>
  <precondition>Chromium and WebKit are already installed for Playwright on this machine; the suite starts its own dev server on PW_PORT=3126.</precondition>
  <action>
This is the whole change, end to end and in one commit: the shared header component, both
sidebars, the one stale stylesheet comment, and a real browser check on both phone profiles.

DELETE `components/design/fine-adjust-group.tsx` outright. Stage the deletion (`git rm`, or
`git add -A`) so it actually lands in the commit — this task really does remove a file, and the
orchestrator merges this worktree by hand, so that is expected.

In `components/outline/outline-controls.tsx`:
  - Drop the `FineAdjustDisclosure` import (line 38).
  - Delete the whole four-constant block above `TAIL_SHAPES` (lines 42-56) and its explaining
    comment. Each of the four rows that referenced one of those constants takes the plain
    `className="flex gap-4"` its unfolded siblings already carry — the Nose Controls pair, the
    Widepoint pair, the rail-lengths pair and the Tail Angle/Fullness pair. Nothing else about
    those rows changes: they stay flex pairs, in the sections they are already written in, in
    source order.
  - Delete the `fineAdjustOpen` state and its comment (lines 114-116).
  - On the top-level column (line 141), drop both the bare `group` class and the
    `data-fine-adjust` attribute, and delete the two-line comment above it. It becomes plainly
    `<div className="flex flex-col gap-5">`. The bare `group` marker was there only for the fold's
    own selector — checked at planning time, nothing else in this tree reads it.
  - Delete the trailing `<FineAdjustDisclosure ... />` block and its comment (lines 457-465).

In `components/rocker/rocker-controls.tsx`:
  - Drop the `FineAdjustDisclosure` import (line 53), the `fineAdjustOpen` state and its comment
    (lines 120-122), the `group`/`data-fine-adjust` pair and comment on the top-level column
    (lines 131-134), and the trailing disclosure block and its comment (lines 321-329).
  - The three folded rows (lines 156, 186, 216) each keep `className="flex items-end gap-4"` and
    lose the two `max-shell:` rules.
  - Remove `max-shell:contents` from BOTH wrapper divs (lines 135 and 140). They existed only so
    CSS `order` could reach rows nested two levels down. Taking them off puts the Rocker section's
    rows back on that section's own slightly tighter spacing on a phone — the same spacing the
    desktop shows, which is the point of this task.
  - Rewrite the two paragraphs of the file header that describe D-03 and the `display: contents`
    override (roughly lines 32-49). Replace them with one short plain-English paragraph in the same
    voice: every slider in this sidebar is on screen from the moment the page opens, on a phone as
    on a desktop, and the phone-only fold that used to hide the six drag-mirror sliders behind a
    "Fine adjust" header was removed at the founder's request on 2026-09-09 (decision D-03 in the
    Phase 9 context is withdrawn; the record there stays as history). Keep every OTHER paragraph of
    that header exactly as it is — the pairing rationale, the SliderRow note and the 260829-rda
    note are all still true.

In `app/globals.css`, the `.focus-ring-accent` comment (around line 749) lists the hand-rolled
controls that use the class and ends "...Reset Advanced Settings, the Fine adjust row." Drop that
last clause, and change "thirteen call sites" to "twelve call sites" — counted at planning time
after this deletion: nine in fin-controls.tsx, one in outline-controls.tsx, and two in
rail-controls.tsx (its section heading writes the class in both branches of one ternary, which is
one site, plus the "Reset Advanced Settings" button). This is a comment-only edit; no rule changes,
so no pixel moves.

In `e2e/phone-layout.spec.ts`, replace the whole `test.describe("phone Fine adjust group", ...)`
block (lines 285-317) with a describe named for what is now true — something like
"phone controls — every slider sits in its own section". Same `beforeEach` shape as the block it
replaces (skip on the `desktop` project, dismiss the sign-in banner). One test that visits both
screens:
  - `/design/outline`: the "Width — …" label is visible with nothing tapped; there is no button
    named "Fine adjust" on the page at all (`toHaveCount(0)`, so a hidden one would fail too); and
    the Width row sits ABOVE the "View Construction Lines" settings row, measured from live
    bounding boxes — that is what proves it is back in the Widepoint Controls section rather than
    pushed to the end of the list.
  - `/design/rocker`: the "Nose Angle — …" label is visible with nothing tapped, and again no
    "Fine adjust" button exists.
Write the comments for a shaper: on a phone the sliders are simply there, in the same sections and
the same order as on a computer, so a shaper never has to hunt for Width.

Also fix the two stale references left in that file: the header comment (line 8) lists "Fine
adjust" among the later plans that extend this spec — drop that word from the list; and the
desktop describe's last test (line 400) is titled "no Fine adjust control appears and the Width
slider is visible without tapping anything", which is now true on every profile rather than a
desktop-only distinction. Keep the test (it is the desktop half of the same promise) and reword its
title to say the desktop sidebar shows every slider with nothing to tap.

Run `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, and the phone-layout spec on all three
projects. Expect the other browser specs to be red at this point — they still tap a button that no
longer exists — and Task 2 fixes them. Do not run the full suite until then.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) &amp;&amp; npx tsc --noEmit &amp;&amp; npm run lint &amp;&amp; npx vitest run &amp;&amp; test ! -e components/design/fine-adjust-group.tsx &amp;&amp; test "$(grep -rl 'fine-adjust\|FineAdjust\|fineAdjust\|FINE_ADJUST' --include='*.tsx' --include='*.ts' components app | wc -l | tr -d ' ')" = "1" &amp;&amp; PW_PORT=3126 npx playwright test e2e/phone-layout.spec.ts --project=iphone --project=android --project=desktop --reporter=list</automated>
  </verify>
  <done>components/design/fine-adjust-group.tsx no longer exists and its deletion is staged; neither controls file mentions the fold in code or comment; the only remaining "Fine adjust" mention in components/ or app/ TypeScript is the historical note in components/ui/slider.tsx; e2e/phone-layout.spec.ts passes on iphone, android and desktop with the new "every slider sits in its own section" case; tsc, lint and vitest are green.</done>
</task>

<task type="auto">
  <name>Task 2: Stop the browser tests tapping a row that is not there any more</name>
  <files>e2e/touch-drag.spec.ts, e2e/touch-sizing.spec.ts, e2e/slider-touch.spec.ts</files>
  <action>
Three specs still open the fold before they can read a value. The sliders they were opening are
simply visible now, so every tap goes, and the sentences explaining the fold go with it.

`e2e/touch-drag.spec.ts` — SURGICAL EDITS ONLY. The sibling quick task 260909-oge will add cases to
this same file once this one lands, so touch nothing else in it. Remove all seven
`page.getByRole("button", { name: "Fine adjust" }).click()` lines (at 88, 151, 223, 299, 341, 390
and 444). Three of them carry an explaining comment above:
  - line 86-88: the D-02 sentence about the construction overlay already being on for a finger is
    still true and stays; drop only the clause about Width/Offset being folded behind the
    disclosure and the tap that follows it.
  - line 149-151: replace the two-line fold comment with one line saying these five labels are all
    on screen in the sidebar, so the value that changes is one a real shaper can read.
  - line 442-444: same shape as the first — keep the D-02 sentence about the rocker's four drag
    targets already being on for a coarse pointer, drop the Nose Angle fold clause and the tap.
The other four taps are bare lines; just delete them. Then grep the file for "Fine adjust" and
expect zero hits.

`e2e/touch-sizing.spec.ts` — delete the whole test "TEMPLATE: the Fine adjust disclosure row is at
least 44px tall (already at rest, no override needed)" (lines 147-155). There is no such row to
measure any more. Leave every other case in that file untouched; note in the commit body that the
per-screen slider-thumb, measure-field, button and checkbox loops all skip non-visible elements, so
the rows that used to be folded away are now measured too — and they already meet 44px, since they
are the same `SliderRow`s the sideways-phone sidebar has always shown.

`e2e/slider-touch.spec.ts` — two titles and one tap:
  - Case A's describe is titled "Case A: upright phone, Width behind the Fine adjust fold" — reword
    to "Case A: upright phone, Width in its own section". Delete the
    `await page.getByRole("button", { name: "Fine adjust" }).click();` at line 121; the
    `await expect(widthLabel).toBeVisible()` immediately below it now does real work, proving Width
    is on screen at load.
  - Case B's test is titled "a bar press moves the value with no Fine adjust tap needed, and the
    wandering drag still works" — reword to drop the fold reference, e.g. "a bar press moves the
    value and the wandering drag still works". Nothing else in Case B or Case C changes.
  - The file header's closing sentence about the founder's iPhone stays as it is.

Run the three specs. touch-drag and slider-touch are android-only (real touch comes from a Chrome
DevTools Protocol session); touch-sizing runs on both phone profiles.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) &amp;&amp; test "$(grep -c 'Fine adjust' e2e/touch-drag.spec.ts e2e/touch-sizing.spec.ts e2e/slider-touch.spec.ts | grep -v ':0$' | wc -l | tr -d ' ')" = "0" &amp;&amp; npx tsc --noEmit &amp;&amp; PW_PORT=3126 npx playwright test e2e/touch-drag.spec.ts e2e/slider-touch.spec.ts --project=android --reporter=list &amp;&amp; PW_PORT=3126 npx playwright test e2e/touch-sizing.spec.ts --project=iphone --project=android --reporter=list</automated>
  </verify>
  <done>No spec taps a Fine adjust row; the touch-drag, slider-touch and touch-sizing suites are green on their own projects; e2e/touch-drag.spec.ts's diff contains nothing but the removed taps and the trimmed sentences.</done>
</task>

<task type="auto">
  <name>Task 3: Rewrite the production dot check, then run everything including the five desktop pictures</name>
  <files>e2e/prod/slider-dots.spec.ts</files>
  <action>
`e2e/prod/slider-dots.spec.ts` was written an hour ago (quick task 260909-nvw) to guard a real
production bug: a slider that is hidden when the page loads measures nothing, never gets its dot
positioned, and on the live site stays dotless until its value changes. Its phone case reached that
state by opening the Fine adjust fold. With the fold gone there is no hidden-at-load slider left to
open — verified at planning time across every file in the app that renders a slider: the fold was
the only one, because every other collapsible section renders no slider at all while it is closed
and mounts a fresh one when it opens.

So reduce the spec rather than re-point it at a state that no longer exists. Keep the file, keep
`dismissPhoneBanners`, keep the `dotPositions` helper exactly as it is.

Replace the two tests with ONE test that runs on all three profiles (no `test.skip`): load
`/design/outline` with `waitUntil: "networkidle"`, read the dot positions, and assert that there
are at least 11 of them (TEMPLATE has exactly 11 sliders), that none of them is null — a null is
the `--position: NaN%` state the live site showed — that every position reads between 0 and 100,
and that the number of dots actually on screen equals the number of dots in the page. Name it for
what it proves: every slider dot is positioned the moment the page loads, on a phone and on a
desktop alike.

Rewrite the file header in the same plain-English voice. It should say: this runs against a real
production build (`next start`) rather than the dev server, because React's StrictMode on the dev
server runs effects twice and papers over exactly this class of bug — no dev-server test can ever
fail for it. The fold that first exposed it is gone as of this task, so there is no longer a slider
anywhere in the app that loads hidden; this spec is now the standing production proof that every
dot is drawn where it belongs from the moment a screen opens. Say plainly that the remount guard in
`components/ui/slider.tsx` stays untouched and is still needed — it protects any future screen that
loads a slider hidden, and this spec is what would notice if it regressed.

Do not open or change `components/ui/slider.tsx` or
`components/ui/slider-dot-contract.test.ts` — the unit contract still describes the guard correctly.

Then the full pass, in the worktree:
  - `npx tsc --noEmit`, `npm run lint`, `npx vitest run`.
  - `PW_PORT=3126 npx playwright test` — the whole dev suite, all three profiles, including
    `e2e/desktop-baseline.spec.ts`. Every rule deleted in Task 1 was gated behind `max-shell:`
    (below 820px) or `hidden max-shell:flex`, so a desktop screen never saw one of them and the
    five baseline images must match with no change at all. NEVER pass `--update-snapshots`; if a
    baseline diff appears, stop and report it rather than regenerating the picture.
  - `e2e/prod/slider-dots.spec.ts` cannot be run from a worktree (it needs `npm run build`, which
    Turbopack will not resolve outside the main checkout). Type-check it, and hand it to the
    orchestrator to run with `npm run test:e2e:prod` on main after the merge.

Record in the summary, in one line: decision D-03 from the Phase 9 context ("Sliders that duplicate
a draggable point fold into one closed Fine adjust group") is withdrawn by the founder on
2026-09-09. The record in `09-CONTEXT.md` stays as written history and was not edited.
  </action>
  <verify>
    <automated>cd $(git rev-parse --show-toplevel) &amp;&amp; npx tsc --noEmit &amp;&amp; npm run lint &amp;&amp; npx vitest run &amp;&amp; PW_PORT=3126 npx playwright test --reporter=list</automated>
    <human-check>The orchestrator runs `npm run test:e2e:prod` on main after the merge; the reduced e2e/prod/slider-dots.spec.ts must pass on all three profiles, proving every dot is positioned at load in a real production build.</human-check>
  </verify>
  <done>e2e/prod/slider-dots.spec.ts is one profile-agnostic at-load assertion with a header that explains why the fold-open half is gone; the entire dev Playwright suite is green on iphone, android and desktop; the five desktop baseline screenshots matched without being regenerated; tsc, lint and vitest are green.</done>
</task>

</tasks>

<verification>
- `npx tsc --noEmit` clean (run `npx next typegen` once first if a fresh worktree is missing route
  types).
- `npm run lint` clean.
- `npx vitest run` — every geometry suite still green. No board number changes in this task.
- `PW_PORT=3126 npx playwright test` — the whole dev suite on iphone, android and desktop,
  including the five desktop baseline screenshots, compared against the existing images and never
  regenerated.
- `components/design/fine-adjust-group.tsx` is gone and its deletion is staged in the commit.
- Grep proof: no `fine-adjust`, `FineAdjust`, `fineAdjust` or `FINE_ADJUST` anywhere under
  `components/` or `app/` except the one historical sentence in `components/ui/slider.tsx`, which is
  deliberately left alone; no "Fine adjust" anywhere under `e2e/`.
- HANDED TO THE ORCHESTRATOR, on main after the merge: `npm run build`, then
  `npm run test:e2e:prod` for the rewritten `e2e/prod/slider-dots.spec.ts`.
</verification>

<success_criteria>
- A shaper on a phone opens TEMPLATE and sees Width, Offset, Tail Rail, Nose Rail, both Angles and
  both Fullness sliders straight away, each under the section heading it belongs to, in the same
  order as on a computer.
- The same is true of ROCKER: Nose Angle, Nose Smoothness, Nose Flatness, Tail Flatness, Tail
  Smoothness and Tail Angle all sit in the Rocker section between Nose Rocker and Tail Rocker.
- There is no "Fine adjust" row left anywhere in the app, and no tap stands between a shaper and
  any slider.
- The desktop is byte-identical: the five baseline screenshots match with no update.
- Every slider still takes a finger anywhere on its bar, and every slider still shows its dot at
  load.
- The summary records in one line that decision D-03 is withdrawn by the founder on 2026-09-09,
  and that the CONTEXT.md record was left untouched as history.
</success_criteria>

<commit_subjects>
Plain English, for a shaper:

- Task 1: `fix(controls): put every slider back in its own section on a phone — no more Fine adjust fold`
- Task 2: `test(phone): stop tapping a Fine adjust row that no longer exists`
- Task 3: `test(sliders): the production dot check no longer needs a folded row`
</commit_subjects>

<output>
Create `.planning/quick/260909-oho-the-phone-s-fine-adjust-fold-is-gone-eve/260909-oho-SUMMARY.md`
when done. Write it in plain English for a shaper: what changed on the screen, what was deleted,
that D-03 is withdrawn at the founder's request on 2026-09-09, that the CONTEXT.md record stays as
history, which test suites were run and their results, and the one thing still owed — the
orchestrator's `npm run test:e2e:prod` on main after the merge.
</output>