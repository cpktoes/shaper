---
phase: quick-260905-pne
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/units-isolation.test.ts
autonomous: true
requirements: [QT-260905-pne]

estimate:
  tokens: 30000
  raw_tokens: 30000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "A future edit that branched the Volume card's litres figure on the shaper's chosen units system turns `npm test` red instead of shipping. That is the entire job: the code is already correct today, and what is missing is the guard that keeps it correct."
    - "The litres figure is proven — not assumed — to be rendered as a plain two-decimal number followed by a literal L, at both of the card's variants (the Volume screen's full card and the Summary's compact one). No conversion, no re-rounding, no units-system argument anywhere on those lines."
    - "The Volume Estimator hands the litres figure straight through to the card as a prop, unconverted, and is pinned to keep doing so."
    - "Every assertion states something that is true of the code exactly as it stands right now. Nothing in the new test is aspirational, and no source file outside the test is touched to make it pass."
    - "The guard is proven to bite: putting the units system onto a litres line turns the suite red, and the card is then restored byte-for-byte."
    - "Phase 6's security register threat 06-07 / T-06-02 is named in the new test's own doc comment, so whoever trips this test can find out in one search why it exists."
  artifacts:
    - lib/units-isolation.test.ts
  key_links:
    - "The new assertions read the card's SOURCE and strip comments first, via the file's existing `readStripped` helper. Without stripping, the card's own doc comment — which names `quotedVolumeLitres` in prose at lines 6, 9 and 84 — would false-positive every negative assertion."
    - "The negative assertions are LINE-scoped, never file-scoped. The card legitimately passes `system` to `formatArea`, `formatCubicVolume` and `formatMark` for its area, cubic and thickness rows, so a file-wide 'this file never mentions the system' assertion would be false today and could only be made green by breaking the card. The claim is only ever about the lines the litres figure itself lives on."
    - "`lib/geometry/measure-display.ts` names `Litres` zero times today (verified at planning time), so the boundary assertion is a forward guard rather than a description of existing code. Its doc line must say so — a reader must not mistake a vacuous pass for evidence."
---

<objective>
Add the durable test that Phase 6's plan 06-07 promised and never wrote: a source-contract guard
in `lib/units-isolation.test.ts` pinning the Volume card's litres figure as a number that takes no
units-system argument at all.

Purpose: litres is the one number a shaper quotes to a customer, and CLAUDE.md Rule 2 says it reads
the same whether they are looking at Imperial or Metric. The card does exactly that today. But
plan 06-07 discharged its structural promise with two one-shot greps that ran once and vanished, so
today nothing in the suite would notice if someone later converted, re-rounded or system-branched
the litres figure. This closes the last open threat in the Phase 6 security register
(06-07 / T-06-02, Tampering, high) by turning that promise into a test that runs on every commit.

Output: one new `describe` block appended to `lib/units-isolation.test.ts`, holding five
assertions. No production file is edited, created or deleted.
</objective>

<design_decision>

## Why this is a source-contract test and not a rendering test

Vitest here runs in the `node` environment with no DOM (`vitest.config.ts` sets
`environment: "node"`; `components/design/measure-field.test.ts` carries the same note). The card
cannot be rendered and its output compared across the two systems. So the guarantee is asserted the
way `lib/theme.test.ts`, `lib/auth/open-access.test.ts`, `lib/db/ownership.test.ts` and this very
file already assert their guarantees: read the real source, strip comments, assert a structural
property. That idiom is already in the file as `readStripped`, and the closing
"the Summary's flash-free path is structural (D-12 backstop)" block is the shape to copy.

## Why the negative assertions are scoped to lines, not to the file

The obvious-looking assertion — "the litres figure takes no system argument, so the card's source
must not mention `system`" — is false. The card correctly hands `system` to `formatArea`,
`formatCubicVolume` and `formatMark` for its area line, its cubic supporting line and its three
cross-section and weighted-thickness rows. Those rows are supposed to change with the chosen
system; the litres figure is not. A file-wide negative would therefore be red today and could only
be turned green by breaking six correct rows. Every negative assertion here is evaluated per line,
on the lines that mention `quotedVolumeLitres` and nowhere else.

## Why the fifth assertion is a forward guard, and why it is still worth having

`lib/geometry/measure-display.ts` does not name `Litres` anywhere today (verified at planning
time: zero occurrences). So asserting "no signature in the display boundary takes both a `Litres`
value and a `UnitsSystem`" passes vacuously right now. It is kept anyway, because it guards the one
place a litres converter would plausibly be added — and it is deliberately written to permit a
future litres formatter that takes no system, which would be a legitimate thing to add. The doc
line says outright that it is a forward guard, so nobody reads its green as evidence about code
that exists.

## Why the mutation proof is part of the task, not a nicety

The thing being delivered is a guard, and an unproven guard is exactly what 06-07 already shipped.
So the task is not done until the executor has watched the new test go red against a deliberately
broken card and then restored the card. A test that cannot be shown to fail is a comment.

</design_decision>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@lib/units-isolation.test.ts
@components/volume/volume-calculation-card.tsx
@components/volume/volume-estimator.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pin the Volume card's litres figure to take no units-system argument</name>
  <files>lib/units-isolation.test.ts</files>
  <read_first>
    - `lib/units-isolation.test.ts` — the `stripComments` / `readStripped` helpers near the top
      (lines 23-37) and the closing `describe("the Summary's flash-free path is structural (D-12
      backstop)")` block at the end of the file. The new block goes after that one, in the same
      shape: a doc comment saying what it pins and why, then short `it()` blocks that each read one
      real source file through `readStripped` and assert one structural property, each `expect`
      carrying a message that tells a future reader what they broke.
    - `components/volume/volume-calculation-card.tsx` — lines 136 and 181, the two
      `{quotedVolumeLitres.toFixed(2)} L` sites (compact variant and full variant); lines 25 and 73,
      the prop declaration and the destructure; and lines 82, 90, 107-122 and 163-175, where
      `system` is correctly handed to `formatArea`, `formatCubicVolume` and `formatMark` for the
      rows that ARE supposed to change with the chosen system.
    - `components/volume/volume-estimator.tsx` — lines 21 and 45, where the litres figure is pulled
      off the design store and passed to the card as a prop without being touched.
    - Both volume files are already named in the ledger's own `DESIGN_SCREEN_DISPLAY_FILES` list,
      whose "every file named in either list exists on disk" test already pins their existence. Do
      not add `existsSync` guards for them.
    - No new imports are needed. `describe`, `it`, `expect`, `readFileSync`, `join` and the
      `REPO_ROOT` / `readStripped` helpers are all already in scope at the top of the file. Adding
      an unused import would fail lint.
  </read_first>
  <action>
Append one new `describe` block to the end of `lib/units-isolation.test.ts`, titled so the
requirement and the threat are both findable — the litres figure reading the same in both systems,
naming SCRN-05 and 06-07 / T-06-02.

Give the block a doc comment that opens with the sentence the security register asked for: "Phase 6
security register 06-07 / T-06-02 — the durable guard the plan promised." Then, in plain English a
shaper could follow, say what it protects: litres is the number a shaper quotes to a customer, it is
the one measurement that reads identically on Imperial and on Metric, and plan 06-07 asserted that
only with one-shot greps that ran once and left nothing behind. Say that these assertions are scoped
to the lines the litres figure lives on, because the card's area, cubic and thickness rows correctly
DO take the chosen system and a file-wide negative would be false. Note that there is no DOM in this
vitest config, which is why this is a source-contract test rather than a rendering one.

Then write five `it()` blocks. Each reads its file through the existing `readStripped` helper, so a
mention inside a doc comment can never satisfy or trip an assertion.

First — the litres figure is rendered as a plain number with a literal L. Read
`components/volume/volume-calculation-card.tsx`, match it against a regex for
`quotedVolumeLitres` then `.toFixed(2)` then a closing brace then whitespace then a word-boundaried
capital L, allowing incidental whitespace around the call and the brace so harmless reformatting
does not trip it. Expect at least one match, and say in the failure message that both the full card
and the Summary's compact card render it this way today (two matches at planning time), and that a
litres figure that no longer matches has been converted or re-rounded and must not be.

Second — no litres line is handed the units system or a display formatter. Split the same stripped
source on newlines, keep the lines containing `quotedVolumeLitres`, and assert that count is at
least two so the loop can never pass vacuously (four at planning time: the prop type, the
destructure, and the two render sites). Then for each of those lines assert it does not match a
word-boundaried `system`, and does not match a `format` followed by a capital letter — the shape of
every export of `lib/geometry/measure-display.ts`. Write both failure messages to name the offending
line and to say plainly that the litres figure must read the same in both systems, so it may not be
branched on the chosen system nor routed through a measure formatter.

Third — the litres figure is the only hand-rolled number on the card. Keep the lines of the same
stripped source containing a `.toFixed(` call, assert there is at least one, and assert every one of
them also contains `quotedVolumeLitres`. The failure message should send the reader to
`@/lib/geometry/measure-display` for any other number they want to print.

Fourth — the estimator passes the figure through untouched. Read
`components/volume/volume-estimator.tsx`, keep the lines containing `quotedVolumeLitres`, assert
there are at least two (the destructure and the prop, at planning time exactly those), and assert
none of them mentions a word-boundaried `system` or a `format` followed by a capital letter. Message:
the estimator hands the quoted litres figure straight to the card and must not convert it on the way.

Fifth — the display boundary offers no system-dependent litres formatter. Read
`lib/geometry/measure-display.ts`, keep any line mentioning both a word-boundaried `Litres` and a
word-boundaried `UnitsSystem`, and assert that list is empty. Put a one-line comment directly above
it stating honestly that this is a forward guard: the boundary names `Litres` zero times today, so
the assertion describes what may never be added rather than what exists, and that it deliberately
still permits a future litres formatter that takes no system, since such a thing would be fine.

Do not edit anything else in the file. Do not touch any file under `components/`, `app/` or
`lib/geometry/`. Delete nothing.

Then prove the guard bites. Using the Edit tool, append a space and `{system}` to ONE of the two
litres render lines in `components/volume/volume-calculation-card.tsx` — the exact regression the
threat describes. Run `npx vitest run lib/units-isolation.test.ts` and confirm it goes RED on the
second assertion, naming the offending line. Then restore the card with
`git checkout -- components/volume/volume-calculation-card.tsx` and confirm
`git diff --quiet components/volume/volume-calculation-card.tsx` exits 0. (If the Edit tool is
awkward here, `sed -i '' 's/{quotedVolumeLitres.toFixed(2)} L/{quotedVolumeLitres.toFixed(2)} L {system}/' components/volume/volume-calculation-card.tsx`
does the same job on both lines; the restore command is unchanged.) The card MUST be clean before
the commit.

Commit subject, in plain English for shapers:
`test(260905-pne): the volume card's litres figure is pinned to read the same in both systems`
  </action>
  <verify>
    <automated>npx vitest run lib/units-isolation.test.ts &amp;&amp; npm test &amp;&amp; npx tsc --noEmit &amp;&amp; git status --porcelain -- components app lib | grep -v 'lib/units-isolation.test.ts' | wc -l | tr -d ' '</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run lib/units-isolation.test.ts` reports **19 passed** in 1 file, 0 failed
      (14 passed at planning time, plus the 5 new `it()` blocks).
    - `npm test` reports **33 passed (33)** test files and **2012 passed | 2 skipped (2014)** tests
      (2007 passed | 2 skipped at planning time, plus 5).
    - `npx tsc --noEmit` exits 0 and prints nothing.
    - `npm run lint` exits 0.
    - `grep -c '06-07 / T-06-02' lib/units-isolation.test.ts` returns 1 or more — the threat is
      named in the new block's doc comment.
    - `grep -c 'SCRN-05' lib/units-isolation.test.ts` returns 1 or more.
    - Mutation proof, recorded in the SUMMARY: with a space and `{system}` appended to a litres
      render line, `npx vitest run lib/units-isolation.test.ts` FAILS, and the failure names the
      litres-line assertion. Quote the failure message in the SUMMARY.
    - After restore, `git diff --quiet components/volume/volume-calculation-card.tsx` exits 0.
    - The final `git status --porcelain -- components app lib` names exactly one file:
      `lib/units-isolation.test.ts`. The verify command's last number is therefore `0`.
    - `git show --stat HEAD` shows one changed source file and zero deletions.
  </acceptance_criteria>
  <done>The Volume card's litres figure — the number a shaper quotes to a customer — is pinned by a
  test that runs on every commit: it is rendered as a plain two-decimal number with a literal L, no
  line it lives on takes the chosen units system or a measure formatter, the estimator passes it
  through unconverted, and the display boundary offers no way to convert litres at all. The guard
  has been watched failing against a deliberately broken card and the card restored. Phase 6's last
  open threat, 06-07 / T-06-02, has the durable assertion it was promised.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| units preference → the quoted litres figure | The one number a shaper quotes to a customer. It must be identical in both systems; the preference must have no path into it. This plan adds no new boundary — it fences an existing one. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| 06-07 / T-06-02 | Tampering | `components/volume/volume-calculation-card.tsx`, `components/volume/volume-estimator.tsx` | high | mitigate | This plan IS the mitigation. Five source-contract assertions in `lib/units-isolation.test.ts` pin the litres figure to a plain two-decimal render with no system argument and no measure formatter on any of its lines, proven to fail against a deliberately broken card. Closes the last open threat in `.planning/phases/06-the-design-screens-in-metric/06-SECURITY.md`. |
| T-QT-01 | Tampering | the mutation proof's temporary edit to the card | medium | mitigate | The proof deliberately breaks a production file for one test run. The restore (`git checkout --`) and its confirmation (`git diff --quiet` exits 0) are acceptance criteria, and the final `git status` check requires exactly one changed file. A card left broken cannot reach the commit. |
| T-QT-02 | Tampering | the new assertions themselves | medium | mitigate | A vacuous assertion is worse than none, because it reads as evidence. Each negative loop asserts a minimum count of matched lines before looping, the mutation proof shows the guard red, and the one genuinely vacuous assertion (the display boundary names no litres today) carries a comment saying so. |
| T-QT-SC | Tampering | npm/pip/cargo installs | low | accept | No package is installed by this task. The only file touched is an existing test file; `package.json` and `package-lock.json` are untouched. |
</threat_model>

<verification>
- The new block sits at the end of `lib/units-isolation.test.ts`, after the D-12 backstop block, and
  uses the file's existing `readStripped` helper rather than a new one.
- No `existsSync` guards were added for the two volume files — the ledger already pins their
  existence.
- No new imports were added to the test file.
- Every negative assertion is evaluated per line, not over the whole file: the card's `formatArea`,
  `formatCubicVolume` and `formatMark` calls, which correctly take the chosen system, are untouched
  and unasserted-against.
- The forward-guard assertion carries its honesty comment.
- `git show --stat HEAD` shows `lib/units-isolation.test.ts` and nothing else under `lib/`,
  `components/` or `app/`.
</verification>

<success_criteria>
- `npx vitest run lib/units-isolation.test.ts` → 19 passed, 0 failed.
- `npm test` → 33 files, 2012 passed | 2 skipped.
- `npx tsc --noEmit` and `npm run lint` both exit 0.
- The mutation proof is recorded in the SUMMARY with the quoted failure message, and the card is
  provably restored.
- Exactly one source file changed in the commit; zero deletions.
- The SUMMARY states, in plain English, that Phase 6 security threat 06-07 / T-06-02 can now be
  marked closed, and names the file and describe block that closes it — so whoever updates
  `.planning/phases/06-the-design-screens-in-metric/06-SECURITY.md` has the evidence to hand.
</success_criteria>

<output>
Create `.planning/quick/260905-pne-pin-the-volume-card-s-litres-rendering-t/260905-pne-SUMMARY.md` when done.
</output>
