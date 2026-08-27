---
phase: quick-260826-njn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/geometry/fins.ts
  - lib/geometry/fins.test.ts
  - components/fins/fin-controls.tsx
  - components/fins/fin-model-info.tsx
autonomous: true
requirements: [QUICK-260826-njn]

estimate:
  tokens: 42000
  raw_tokens: 42000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "A shaper working on a board shorter than eight foot can no longer put the McKee Longboard quad model on it. The option is still there in the Quad Model panel — greyed out, not hidden — with a line underneath saying it needs a board 8'0\" or longer. Hiding it would leave the shaper wondering where a model they have used before went."
    - "At exactly 8'0\" the McKee Longboard model is available. The rule is 'eight foot or longer', not 'over eight foot'."
    - "The shaper can set the model first and shorten the board afterwards — that is the case this fixes. When that happens the fin numbers on screen immediately become McKee SB/Gun numbers, because that is the model actually in force. They never keep showing longboard numbers for a board the longboard formulas were never fitted to."
    - "The stored choice is NOT overwritten. The shaper's pick of McKee Longboard stays in the board's design, so if they lengthen the board back to 8' or more the longboard model comes straight back, still selected, with its own numbers. Only what is CALCULATED and DISPLAYED falls back."
    - "The 5th/Center fin tickbox follows the model actually in force. The McKee Longboard model has no centre-fin option, so it suppresses that tickbox; on a short board where the model has fallen back to McKee SB/Gun the tickbox is available again — and if the shaper had ticked it, the fifth fin really is drawn and dimensioned."
    - "MEASURED and load-bearing: the eight-foot comparison happens in millimetres, at the boundary where the design's metric values enter the fin engine — NOT in the engine's inch core. mmToInches(inchesToMm(96)) is 95.99999999999999, so an inch-side test of 'is it 96 or more' rejects a board the shaper set to exactly 8'0\". Every board length in this app is built by inchesToMm(<inches>), so the millimetre comparison against inchesToMm(96) is exact at 8'0\"."
    - "The decision itself is one pure, unit-tested function in lib/geometry/fins.ts, per Rule 1. The fin controls call that function; they do not re-decide anything for themselves."
    - "The eight-foot cutoff is written once, as a millimetre constant derived through lib/geometry/units.ts. No new 25.4 anywhere."
    - "Nothing in the golden fixtures moves. Both McKee Longboard fixtures are a 9'0\" and a 9'6\" board, so they sit above the cutoff and are untouched. No fixture is regenerated for this — it is a new product rule, not a ported prototype formula."
    - "npm test, npm run lint and npm run build are all green."
  artifacts:
    - lib/geometry/fins.ts
    - lib/geometry/fins.test.ts
    - components/fins/fin-controls.tsx
    - components/fins/fin-model-info.tsx
    - .planning/quick/260826-njn-disable-quad-mckee-longboard-model-for-b/260826-njn-SUMMARY.md
  key_links:
    - "THE SINGLE SEAM. computeFinPlacement (lib/geometry/fins.ts:1096) is the only caller of the private inch core computeFinPlacementInches. Substituting the effective model in the spec it hands to that core makes every downstream consequence — the numbers, flags.isLongboardQuad, flags.quadCenterFinAvailable, modelHeader, the notes, the toe-table link — follow the model actually in force, from one line. Do NOT scatter the rule across the seventeen spec.quadRearModel reads inside the core."
    - "WHY THE CORE STAYS UNTOUCHED. The module header of lib/geometry/fins.ts declares the inch core a statement-for-statement port of the prototype's renderVals, with six numbered deliberate deviations 'and no others'. This is a new product rule with no prototype counterpart, so it belongs at the millimetre boundary and gets recorded as deviation 7 in that header."
    - "FLOATING POINT, the trap. 96 * 25.4 is 2438.3999999999996 and dividing that back by 25.4 gives 95.99999999999999. Comparing on the inch side would silently break requirement 2 (available at exactly 8'0\"). The unit test at exactly 8'0\" is what pins this."
    - "flags.quadCenterFinAvailable and flags.isLongboardQuad already come out of the inch core, so once the core sees the fallen-back model both flags are correct with no further change. components/fins/fin-controls.tsx:440 and :446 already read them and need no edit."
    - "The golden-parity suite in lib/geometry/fins.test.ts asserts every flag and the modelHeader for all 23 fixtures. Confirmed before planning: the only two mckeeLB fixtures are quadMcKeeLB at 108\" and quadMcKeeLBLong at 114\". Nothing in that suite may change."
---

<objective>
Stop a shaper putting the McKee Longboard quad fin model on a board that is shorter than eight
foot, and make sure a board that gets shortened afterwards stops showing longboard numbers.

Purpose: the app's own reference note says the McKee Longboard front and rear formulas are for
boards eight foot and up. On a shorter board those formulas are out of the range they were
fitted to, so the numbers they produce are numbers a shaper should not cut foam to — which is
exactly what this project promises they can do.

Output: one new, tested rule in the geometry layer that decides which quad rear models a board
of a given length may use; the fin engine resolving to McKee SB/Gun whenever the longboard model
is out of range; and the Quad Model panel showing the option greyed with a plain-English reason.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@lib/geometry/fins.ts
@lib/geometry/fins.test.ts
@components/fins/fin-controls.tsx
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Teach the fin engine that the McKee Longboard model needs an eight-foot board</name>
  <files>lib/geometry/fins.ts, lib/geometry/fins.test.ts</files>

  <read_first>
    - lib/geometry/fins.ts lines 1-35 — the module header listing the six numbered deviations from
      the prototype port. A seventh is added here.
    - lib/geometry/fins.ts lines 212-217 — QUAD_REAR_MODELS, the exported list of quad rear models
      and their labels. The new constant and functions go directly below it.
    - lib/geometry/fins.ts lines 1096-1106 — computeFinPlacement, where millimetres are converted
      to the inch spec handed to the private core. Line 1103 is the single line that changes.
    - lib/geometry/fins.ts lines 494-495 and 969-972 — where the core derives isLongboardQuad,
      quadCenterFinAvailable and the shaper-facing note for the longboard model.
    - lib/geometry/units.ts lines 14-32 — the Mm brand and the inchesToMm / mmToInches pair. This
      is the only file allowed to know about 25.4.
    - lib/geometry/fins.test.ts lines 1-25 and 243-260 — the imports, the expectCloseIn helper and
      the shape of a hand-written (non-golden) describe block.
  </read_first>

  <behavior>
    Write these as failing tests in lib/geometry/fins.test.ts FIRST, in one new
    `describe("McKee Longboard quad model needs an eight-foot board", ...)` block. Build every
    length with `inchesToMm(...)` — never a raw millimetre literal.

    The rule, on its own:
    - The eight-foot cutoff constant equals `inchesToMm(96)`.
    - The longboard model is unavailable at 7'6" (90in) and at one sixteenth under the cutoff
      (95.9375in).
    - The longboard model IS available at exactly 96in, and at 108in.
    - The other three quad rear models are available at every length tried — 60in, 90in, 96in,
      120in.
    - Resolving the effective model returns McKee SB/Gun for the longboard model at 90in, and
      returns the longboard model unchanged at 96in. The other three models resolve to themselves
      at every length.

    The fallback, through the public engine (build each spec from DEFAULT_FIN_PLACEMENT_SPEC with
    `finSetup: "quad"`):
    - A 7'6" board storing the longboard model produces the SAME resolved numbers as the same
      board storing McKee SB/Gun. Compare `resolved.frontOffTail`, `resolved.rearOffTail`,
      `resolved.rearHalfSpread`, `resolved.rearToe` and `resolved.quadRearOffRail` through
      `mmToInches` with `expectCloseIn`, and compare `modelHeader` and `marks.length` exactly.
    - The same 7'6" spec does NOT match the numbers the longboard formulas would have given — assert
      at least that `resolved.rearOffTail` differs measurably from a 96in longboard board's, so the
      test cannot pass by both models coincidentally agreeing.
    - An 8'0" board storing the longboard model keeps the longboard numbers: its
      `resolved.rearOffTail` differs from the same board on McKee SB/Gun, and its `modelHeader`
      names the longboard model.
    - `flags.isLongboardQuad` is false at 7'6" with the longboard model stored, and true at 8'0".
    - `flags.quadCenterFinAvailable` is true at 7'6" with the longboard model stored, and false at
      8'0".
    - With `quadCenterFinOn: true` and the longboard model stored at 7'6", the fifth fin really is
      produced: `marks.filter(m => m.role === "center").length` is 1, and it matches the same
      board on McKee SB/Gun. At 8'0" with the same flags there is no centre mark.

    The existing golden-parity suite must stay green untouched. Do not edit it, and do not
    regenerate any fixture.
  </behavior>

  <action>
    Add to lib/geometry/fins.ts, directly under QUAD_REAR_MODELS (line 217):

    1. An exported millimetre constant for the cutoff, named for what it is — the minimum board
       length the McKee Longboard quad model applies to — with its value produced by
       `inchesToMm(96)`. Give it a short doc comment saying, in the shaper's terms, that McKee's
       longboard front and rear formulas are fitted for boards of eight foot and up.

    2. An exported pure predicate taking a quad rear model and an `Mm` board length, returning
       whether that model may be used on that board. Only the longboard model is ever refused, and
       only when the board length is below the constant. Everything else is always allowed.

    3. An exported pure resolver taking the same two arguments and returning the quad rear model
       actually in force: the model handed in when the predicate allows it, and `"mckeeSB"`
       (McKee SB/Gun) otherwise. McKee SB/Gun is the fallback because it is the neighbouring McKee
       rear-pair model and is fitted across the shortboard and gun range this board now sits in.

    COMPARE IN MILLIMETRES, and say why in a comment on the predicate. Dividing an inch value back
    out of millimetres does not round-trip: a board the shaper set to exactly eight foot comes back
    a hair under 96 on the inch side, so an inch-side comparison would refuse the very board the
    rule is meant to allow. Both sides of this comparison are built the same way through
    lib/geometry/units.ts, so the millimetre comparison is exact at eight foot.

    Then wire the fallback at the ONE seam — computeFinPlacement, line 1103. Instead of copying
    `spec.quadRearModel` straight into the inch spec, copy the resolver's answer for
    `spec.quadRearModel` and `spec.boardLength`. Change nothing else in that function and nothing
    at all inside `computeFinPlacementInches`: the core then never sees an out-of-range model, so
    the placement numbers, `flags.isLongboardQuad`, `flags.quadCenterFinAvailable`, the model
    header, the notes and the toe-table link all follow the model actually in force for free.

    Do NOT write the fallback back into the stored spec, and do NOT touch DEFAULT_FIN_PLACEMENT_SPEC.
    The shaper's own pick is kept so that lengthening the board brings their longboard model back.

    Update the shaper-facing note for the longboard model (line 971): it currently describes the
    eight-foot range as a preference. It is now a requirement, so the note should say the model
    needs a board of eight foot or longer, and that on a shorter board the placement falls back to
    McKee SB/Gun. Keep the rest of that sentence — the spread and rear-toe detail — as it is.

    Finally, add a numbered deviation 7 to the module header (lines 1-35), in the same voice as the
    six above it: a new product rule with no counterpart in the prototype, enforced at the
    millimetre boundary so the inch core stays a statement-for-statement port, and comparing in
    millimetres because the inch round-trip loses eight foot by one part in ten thousand million.
  </action>

  <verify>
    <automated>npx vitest run lib/geometry/fins.test.ts
npm test
grep -v '^ *[/*]' lib/geometry/fins.ts | grep -c 'effectiveQuadRearModel'   # >= 3 (declaration, boundary call, export site)
grep -c '25.4' lib/geometry/fins.ts                                          # == 0
git diff --stat lib/geometry/fins.ts lib/geometry/fins.test.ts</automated>
  </verify>

  <done>
    A board under eight foot can never produce McKee Longboard fin numbers; a board at exactly
    8'0" still can. The new rule is three exported, unit-tested items in lib/geometry/fins.ts and
    one substituted line in computeFinPlacement. All 23 golden fixtures still pass, unmodified.
  </done>
</task>

<task type="auto">
  <name>Task 2: Grey the McKee Longboard option out on a short board and say why</name>
  <files>components/fins/fin-controls.tsx, components/fins/fin-model-info.tsx</files>

  <read_first>
    - components/fins/fin-controls.tsx lines 126-152 — PillButton, the shared model-option button.
    - components/fins/fin-controls.tsx lines 419-449 — the Quad Model block: the option grid, the
      5th/Center fin tickbox, and the existing "Longboard quad model has no center-fin option."
      hint line. That hint line is the pattern the new one follows.
    - components/rails/rail-controls.tsx lines 108-120 — this project's disabled-control treatment:
      the native disabled attribute on the control plus `opacity-40` on its wrapper.
    - components/fins/fin-model-info.tsx lines 103-106 — the reference-note entry for the
      McKee Longboard model.
    - components/fins/toe-aim-table-modal.tsx line 75 — how an inch mark is written in JSX text in
      this codebase.
  </read_first>

  <action>
    In components/fins/fin-controls.tsx:

    1. Import the predicate and the resolver added in Task 1 from `@/lib/geometry/fins`, alongside
       the existing QUAD_REAR_MODELS import.

    2. Give PillButton an optional `disabled` boolean prop, defaulting to false. When set, pass it
       through as the button's native disabled attribute, and swap the hard-coded `cursor-pointer`
       for `cursor-not-allowed` plus `opacity-40` — the same greying rail-controls.tsx and
       outline-controls.tsx already use for a control the shaper cannot touch. The active/inactive
       colour branch is unchanged. Native disabled also takes the button out of the tab order, which
       is what we want: nothing to focus, and the reason is in the adjacent hint line.

    3. Inside the Quad Model block, before the grid, resolve the model actually in force for this
       board by calling the Task 1 resolver with `spec.quadRearModel` and `spec.boardLength`. Drive
       each pill's `active` from THAT value rather than from `spec.quadRearModel`, so the highlight
       always sits on the model whose numbers are on screen. Drive each pill's new `disabled` prop
       from the Task 1 predicate for that option's own value and `spec.boardLength`.

       Leave the onClick handler exactly as it is. Its longboard branch is now unreachable while the
       board is short, because that pill is disabled.

    4. Directly under the grid, add a hint line shown only when the longboard option is unavailable
       for this board — reuse the predicate rather than testing the length again. Style it exactly
       like the neighbouring centre-fin hint: `className="text-sm text-surf-ink-muted font-normal"`.
       Wording, plain English and about the board: McKee Longboard needs a board 8'0" or longer.
       Write the foot and inch marks as the HTML entities this codebase uses in JSX text, so the
       lint rule about unescaped quotes stays happy. Keep the grid's existing bottom spacing between
       the block and the tickbox below — move the margin onto the hint if the hint would otherwise
       land inside it.

    5. Change NOTHING about the 5th/Center fin tickbox or the "no center-fin option" line. Both
       already read flags that Task 1 made follow the model actually in force, so on a short board
       the tickbox reappears and that line disappears by themselves.

    In components/fins/fin-model-info.tsx, line 104-105: the McKee Longboard reference entry
    describes eight foot and up as a suitability preference. It is now a requirement, so reword that
    clause to say the model is for boards of 8'0" and longer, and that on a shorter board the app
    uses McKee SB/Gun instead. One sentence, same voice as the entries around it.
  </action>

  <verify>
    <automated>npm run lint
npm run build
grep -c 'isQuadRearModelAvailable' components/fins/fin-controls.tsx   # >= 2 (pill gate + hint gate)
grep -c 'effectiveQuadRearModel' components/fins/fin-controls.tsx     # >= 1
grep -c 'disabled' components/fins/fin-controls.tsx                   # increases by >= 3
npm test</automated>
    <human-check>
      At localhost:3000/design/fins, choose the Quad fin setup and set the board length to 7'6".
      In the Quad Model panel, McKee Longboard should be visibly greyed and unclickable while the
      other three stay live, with a line underneath saying it needs a board 8'0" or longer. The
      5th/Center fin tickbox should be present. Now click McKee SB/Gun and note the Rear numbers,
      then take the board to 8'0" — McKee Longboard should come back to life, and clicking it
      should change those Rear numbers and take the 5th/Center tickbox away.

      Then the case this was really built for: with the board at 9'0" and McKee Longboard selected,
      wind the length back down to 7'6". The highlight should jump to McKee SB/Gun and the numbers
      on the diagram should change with it — no longboard numbers left on a short board. Wind back
      up to 9'0" and McKee Longboard should be selected again, with its own numbers, without you
      re-picking it.
    </human-check>
  </verify>

  <done>
    The McKee Longboard option is visible but greyed with a plain-English reason on any board under
    eight foot; the highlighted model is always the model the numbers came from; shortening a board
    that had the longboard model on it moves the whole panel and the diagram to McKee SB/Gun, and
    lengthening it restores the shaper's original pick.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| shaper -> fin controls -> design store | Board length and fin model come from the shaper's own controls in their own browser; there is no server, no persistence and no other party in this task. |
| design store -> lib/geometry/fins | Millimetre design values enter the pure geometry engine. The only boundary where a value could be out of the range a formula was fitted to — which is the defect this task closes. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-njn-01 | Tampering | lib/geometry/fins.ts computeFinPlacement | medium | mitigate | A fin model applied outside the board range its formulas were fitted to yields placement numbers a shaper would cut foam to. computeFinPlacement now resolves the quad rear model against the board length before any math runs, so the out-of-range combination cannot reach the formulas. Pinned by unit tests at 7'6", exactly 8'0" and 9'0". |
| T-njn-02 | Information Disclosure | components/fins/fin-controls.tsx | low | mitigate | Showing a model as selected while different numbers are on screen misleads the shaper about which formulas produced them. The panel's highlight is driven by the model actually in force, and the unavailable option carries a stated reason. |
| T-njn-03 | Denial of Service | — | low | accept | No network, no server, no untrusted input, no unbounded work. The change is two comparisons and a branch. |
| T-njn-SC | Tampering | npm/pip/cargo installs | high | accept | No packages are installed or upgraded by this task. No package-manager command appears in either task. |
</threat_model>

<verification>
- `npm test` — every geometry suite green, including all 23 fin golden fixtures unmodified.
- `npm run lint` — clean.
- `npm run build` — succeeds (run from the main checkout, not a worktree).
- `git diff --stat lib/geometry/__fixtures__/` — empty. No golden fixture was regenerated for this
  new product rule.
- Browser check per Task 2's human-check: greyed option with a reason at 7'6", available at 8'0",
  and a board shortened from 9'0" moving to McKee SB/Gun numbers on the spot.
</verification>

<success_criteria>
- McKee Longboard cannot be chosen for a quad on a board under 8'0", and can at exactly 8'0".
- The option is greyed and still visible, with a plain-English line saying it needs a board 8'0" or
  longer.
- A board shortened below 8'0" while on McKee Longboard shows McKee SB/Gun numbers and highlight,
  and its 5th/Center fin tickbox is available again; lengthening restores the shaper's pick.
- The decision lives in one pure, unit-tested function in lib/geometry/fins.ts; the controls call it
  rather than re-deciding.
- The eight-foot cutoff is a single millimetre constant built through lib/geometry/units.ts; no new
  25.4 anywhere.
- npm test, npm run lint and npm run build are green with no fixture regenerated.
</success_criteria>

<output>
Create `.planning/quick/260826-njn-disable-quad-mckee-longboard-model-for-b/260826-njn-SUMMARY.md`
when done. Write it for a shaper: what changed about the board and the screen, not which component
re-rendered. Record the floating-point finding (the inch round-trip loses eight foot) as the reason
the comparison sits in millimetres, so nobody later "simplifies" it back into the inch core.
</output>
