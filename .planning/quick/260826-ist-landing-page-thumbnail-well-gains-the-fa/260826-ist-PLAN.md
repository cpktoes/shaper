---
phase: quick-260826-ist
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/setup/preset-card.tsx
autonomous: false
requirements: [QUICK-260826-ist]

estimate:
  tokens: 30000
  raw_tokens: 30000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The board picture inside each landing-page card sits in a well with a visible hairline edge around it, the same edge the content card inside the tabs on every design screen has."
    - "That edge uses the same colour role, the same corner radius and the same surface as the design screens' inner content card — one treatment, not a lookalike."
    - "The cards, the grid and the card contents do not move: adding the edge changes no layout anywhere on the page."
    - "The board drawing sits just inside the new edge rather than running underneath it."
    - "Nothing on the four /design screens changes, and the Continue Current Board card is untouched."
  artifacts:
    - components/setup/preset-card.tsx
  key_links:
    - "components/viewer/tabbed-panel.tsx line 106 is the source of truth for the treatment; preset-card.tsx must carry the same three utilities (rounded-lg + the faint border + the panel surface), asserted by a cross-file grep."
    - "The board SVG is `absolute inset-0` inside this well, so its containing block is the well's PADDING box — a border changes where the drawing sits even though the well's own outer size is fixed by aspect-ratio + border-box. Task 2 measures this rather than assuming it."
    - "--surf-line-faint is the correct token here (recede, grouping hint, read against panel). --surf-line is the token for a STRUCTURAL panel edge and must not be substituted in."
---

<objective>
Give the board-thumbnail well inside each landing-page preset card the same faint hairline
edge the inner content card inside the tabs already has on every design screen.

Purpose: the founder's words — "the landing page needs the faint line added to the inner
card, to match the look of the tabs on all the pages." Since quick task 260826-icz the
thumbnail well is already the panel surface with the same corner radius as that inner
content card; it is simply missing the edge. Adding it makes the two identical rather
than merely similar.

Output: one class-name change plus a short comment in `components/setup/preset-card.tsx`,
a measured no-layout-shift report, and a four-theme look.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.claude/CLAUDE.md
@components/setup/preset-card.tsx
@components/viewer/tabbed-panel.tsx
</context>

<constraints>
One-change-at-a-time cadence. Add the edge and nothing else.

- Do NOT use `--surf-line`. There is a strong, correct rule in this codebase that a
  *structural panel boundary* must use `--surf-line`, because `--surf-line-faint` was
  1.22:1 on Daylight's canvas and vanished (quick 260825-pkq). **That rule is about the
  OUTER panel edge.** The inner content card is the documented exception — read
  `components/viewer/tabbed-panel.tsx` lines 98-104 in full: `line-faint` is right there
  "precisely because it should recede — it is a grouping hint, not a structural edge, and
  it reads against `panel` rather than against the canvas." The founder asked for the
  faint line, the tabs use the faint line, so this uses the faint line.
- Do NOT add padding to the well. `TabbedPanel`'s inner card also carries `p-3`; copying
  that too would shrink every thumbnail and is a second change. If you think the well
  wants an inset, capture it as a todo — do not do it here.
- Do NOT touch the outer card's border/ring, the page background, spacing, type, hover or
  focus states.
- Do NOT touch `components/setup/continue-board-card.tsx`. It is text-only and has no
  thumbnail, so it has no inner card to put a line on. That asymmetry is correct — do not
  invent an inner card for it to keep the two "matching".
- Do NOT touch any `/design` screen, `components/viewer/tabbed-panel.tsx`, or
  `app/globals.css`. This task changes ZERO token values and adds ZERO tokens —
  `--surf-line-faint` already exists and is already bridged.
- Do NOT refactor the duplicated card className shared by the two setup cards. It is
  untouched by this change.
- Do NOT re-add a palette or contrast test file. `lib/design/palette.test.ts` and
  `lib/design/contrast.ts` were deleted by explicit founder decision (quick 260824-i05).
  Task 2's maths runs in the scratchpad and is reported, never committed.
- Do NOT reintroduce literal colour names (`surf-base`, `surf-black`, `surf-muted`,
  `surf-accent-cyan`).
</constraints>

<tasks>

<task type="tracer">
  <name>Task 1: Put the faint edge on the thumbnail well</name>
  <files>components/setup/preset-card.tsx</files>

  <read_first>
    - `components/viewer/tabbed-panel.tsx` — the file docstring (lines 3-26) and BOTH inline
      comments (lines 95-96 and 98-104). Line 106 is the inner content card whose treatment
      is being matched; read the comment above it before you touch anything, because it is
      the argument for `line-faint` over `line` and you are about to be tempted to "upgrade"
      it.
    - `components/setup/preset-card.tsx` — the docstring (lines 3-11) for the file's comment
      voice and density, and line 38, the thumbnail well div.
  </read_first>

  <action>
    Two edits, one file.

    1. Line 38, the thumbnail well div. Add the border utility pair so the class string ends
       up carrying, in this order, the rounding, the border, the faint border colour, and
       the panel surface — the same four things in the same order as
       `components/viewer/tabbed-panel.tsx` line 106. The `relative`,
       `aspect-[340/620]`, `w-full` and `overflow-hidden` classes stay exactly as they are
       and stay in their current positions. Nothing else on the line changes; no padding is
       added.

    2. Directly above that div, add a short inline comment — three lines, matching the
       terse voice of the file's existing docstring, not longer. It must say:
       - that this well deliberately carries the same treatment as the inner content card in
         `components/viewer/tabbed-panel.tsx`, so the landing page and the design screens
         read as one product;
       - that the edge is therefore NOT redundant decoration and should not be deleted as
         such by a later editor;
       - why the faint token is the right one here and not the structural one: it is a
         grouping hint that should recede, and it reads against the panel surface rather
         than against the canvas.

       **Comment discipline:** name the CSS custom properties (`--surf-line-faint`,
       `--surf-line`) in that comment. Do NOT write any Tailwind border-utility class name
       into it — the gates below negative-grep the source for the structural border utility
       with no comment filtering, so a comment naming it would defeat its own check.
  </action>

  <verify>
    <automated>
# 1. The well carries the exact intended class string — the four matched utilities present,
#    in order, and nothing else added (this also proves no padding utility crept in).
test "$(grep -c 'className="relative aspect-\[340/620\] w-full overflow-hidden rounded-lg border border-surf-line-faint bg-surf-panel"' components/setup/preset-card.tsx)" = "1" \
  && echo "PASS well class string"

# 2. The structural-edge utility was NOT used. `border-surf-line-faint` cannot match: the
#    character after "line" is "-". Unfiltered on purpose — see the comment discipline above.
test "$(grep -Ec 'border-surf-line([^-]|$)' components/setup/preset-card.tsx)" = "0" \
  && echo "PASS faint token, not structural"

# 3. Cross-file parity: the landing page now carries the SAME substring the treatment being
#    matched carries. If either side is ever changed alone, this gate fails.
grep -q 'rounded-lg border border-surf-line-faint bg-surf-panel' components/viewer/tabbed-panel.tsx \
  && grep -q 'rounded-lg border border-surf-line-faint bg-surf-panel' components/setup/preset-card.tsx \
  && echo "PASS treatment parity with tabbed-panel"

# 4. The comment points a later editor at the source of truth.
grep -q 'tabbed-panel.tsx' components/setup/preset-card.tsx && echo "PASS comment cites source"

# 5. Scope: exactly one file touched in the whole repo.
test "$(git diff --name-only | tr -d ' ')" = "components/setup/preset-card.tsx" \
  && echo "PASS single file"

# 6. Scope: exactly one non-comment line changed in it (one removal, one addition).
test "$(git diff -U0 components/setup/preset-card.tsx | grep '^[+-]' | grep -v '^[+-][+-]' | grep -v '^[+-][[:space:]]*\(//\|\*\|/\*\)' | grep -c '.')" = "2" \
  && echo "PASS one-line change"

# 7. The sibling card and the design screens are untouched.
test -z "$(git diff --name-only -- components/setup/continue-board-card.tsx components/viewer app/globals.css app/design)" \
  && echo "PASS nothing else moved"

npm test && npm run lint
    </automated>
  </verify>

  <done>
    The thumbnail well carries `rounded-lg` + the faint border + the panel surface, the same
    substring `components/viewer/tabbed-panel.tsx` carries; the structural border token is
    absent; one non-comment line changed in one file; a three-line comment records why the
    edge is there and cites tabbed-panel.tsx; `npm test` and `npm run lint` are green.
  </done>
</task>

<task type="auto">
  <name>Task 2: Measure the rendered edge and prove the thumbnail did not move</name>
  <files>(no repo files — a browser measurement plus a scratchpad script, both reported in the SUMMARY)</files>

  <action>
    Two measurements. Neither may be replaced by reading the class name back — two past bugs
    in this repo were caught only by measuring the rendered value (see the bench-fidelity
    entries in STATE.md).

    **(a) The layout question, measured in the browser.** A 1px border has been added inside
    a box that has `aspect-[340/620]` and `overflow-hidden`, wrapping the `OutlineViewer`
    SVG. Tailwind's preflight sets `box-sizing: border-box`, and `aspect-ratio` applies to
    the box named by `box-sizing`, so the well's OUTER size should be unchanged. But the SVG
    inside it is `absolute inset-0` (see `components/outline/outline-viewer.tsx` line 520),
    and an absolutely-positioned box resolves `inset` against its containing block's PADDING
    box — so the drawing should now be inset by exactly the border width. Confirm both
    halves rather than assuming either.

    `npm run dev`, open http://localhost:3000, and run this in the browser console:

    ```
    const well = document.querySelector('[class*="aspect-[340/620]"]');
    const card = well.closest('button');
    const cs = getComputedStyle(well);
    const w = well.getBoundingClientRect();
    const s = well.querySelector('svg').getBoundingClientRect();
    console.log({
      boxSizing: cs.boxSizing,
      borderWidth: cs.borderTopWidth,
      borderColor: cs.borderTopColor,
      wellW: +w.width.toFixed(2), wellH: +w.height.toFixed(2),
      cardContentW: +(card.getBoundingClientRect().width - 32).toFixed(2),
      aspectCheck: +((w.width / w.height) * (620 / 340)).toFixed(4),
      svgOffsetL: +(s.left - w.left).toFixed(2),
      svgOffsetT: +(s.top - w.top).toFixed(2),
      svgW: +s.width.toFixed(2), svgH: +s.height.toFixed(2),
    });
    ```

    Expected, all of which must hold:
    - `boxSizing` is `border-box` and `borderWidth` is `1px`.
    - `borderColor` resolves to the ACTIVE THEME's faint-line value, not to a literal — check
      it against the `--ramp-<theme>-line-faint` value in `app/globals.css` LAYER 1 for
      whichever theme is selected. (Daylight and Chalk `#897c58`, Slate `#333842`, Phosphor
      `#3e783e`.)
    - `wellW` equals `cardContentW` — the well still exactly fills the card's content box, so
      the card, the grid and everything below the thumbnail are unmoved. **This is the
      no-layout-shift proof.**
    - `aspectCheck` is `1.0000` — the border box still holds the 340/620 ratio.
    - `svgOffsetL` and `svgOffsetT` are both `1`, and `svgW`/`svgH` are `wellW - 2` /
      `wellH - 2`.

    That last one is a real, intended effect, not a failure: the board drawing now sits just
    inside the new line instead of running underneath it, which is the whole point of drawing
    a line around a well. At a typical four-across thumbnail (~194px wide) that is about 1%
    smaller — under a pixel and a half of board. Report it plainly; do not "fix" it by moving
    the border to a wrapper element, which would diverge from the treatment being matched.

    If any expectation fails — especially if `wellW` no longer equals `cardContentW` — stop
    and report before going further. That would mean something really did shift.

    **(b) The visibility question, computed.** There is no palette test in this repo any
    more, so compute the ratios yourself with a throwaway script in the scratchpad directory.
    Do not add the script to the repo and do not create a test file. Read the four
    `--ramp-<theme>-*` blocks out of `app/globals.css` LAYER 1 rather than retyping hex
    values, so the report cannot drift from the source.

    Compute, for Daylight, Chalk, Slate and Phosphor: the faint-line value against the panel
    surface (that is the new edge against the well it encloses). The bar for a boundary is
    3:1, but note before you report a "failure": this is the exact pairing already shipping
    on all four design screens, so it is not a new pairing being introduced here and nothing
    about it can be worse on the landing page than it already is there. Anything under bar is
    a pre-existing, deliberate property of the treatment — report it as a finding, not as a
    regression to fix, and do not touch a ramp value.

    Reference measurements taken during planning, for you to confirm or correct — if your
    numbers disagree, trust yours and say so:

    | Theme | faint line on panel | reads as |
    |---|---|---|
    | Daylight | 4.13:1 | clear |
    | Chalk | 4.13:1 | clear |
    | Slate | 1.56:1 | a whisper — the softest of the four |
    | Phosphor | 3.80:1 | clear |

    Also worth confirming and reporting, because it explains why three of the four look firmer
    than the word "faint" suggests: in Daylight, Chalk and Phosphor the faint-line and
    structural-line ramp values are currently identical, so the edge is as strong as a
    structural one. Slate is the only theme where they differ (structural would be 3.70:1
    there against the same 1.56:1).

    Write both findings into the SUMMARY in plain English a shaper can read — "in the Slate
    theme the new line is barely a whisper, exactly as it already is on the design screens",
    not "line-faint/panel is 1.56".
  </action>

  <verify>
    <automated>
# The audit must not have leaked into the repo: still exactly one file changed.
test "$(git diff --name-only | tr -d ' ')" = "components/setup/preset-card.tsx" \
  && test -z "$(git status --porcelain lib/design 2>/dev/null)" \
  && test "$(git status --porcelain | grep -c 'contrast\|palette')" = "0" \
  && echo "PASS no script or test files added"
npm test
    </automated>
    <human-check>
      The SUMMARY carries (a) the browser measurement showing the well still exactly fills
      the card's content box and the drawing now sits 1px inside the new line, and (b) a
      four-theme table of how strongly that line reads, with Slate named as the faintest.
    </human-check>
  </verify>

  <done>
    Measured in the browser: border-box confirmed, 1px, the theme's own faint-line colour, the
    well's outer size unchanged against the card's content box, and the drawing inset exactly
    1px on each side. Measured in the scratchpad: the four-theme strength of the new edge,
    with any under-bar theme reported as a pre-existing property of the shared treatment and
    no ramp value changed.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Look at the new edge on the landing page in all four themes</name>

  <what-built>
    The little board picture inside each card on the home page now has a faint hairline drawn
    around it — the same one already drawn around the working area inside the tabs on the
    Template, Rails, Fins and Volume screens. It is the same colour, the same corner rounding
    and the same background as that one, so the home page and the design screens now frame
    their content identically. Nothing moved: the cards, the grid and the board pictures are
    the same size and in the same place as before.
  </what-built>

  <how-to-verify>
    1. `npm run dev`, open http://localhost:3000.
    2. Each board picture should now sit inside a lightly drawn box of its own, rather than
       floating on a bare patch of colour. The line should look quiet — a hint of where the
       picture sits, not a frame competing with the board.
    3. Open a design screen (e.g. /design/rails) and compare the two directly: the line
       around the working area inside the tabs and the line around the home page thumbnail
       should look like the same line. If one looks heavier, darker or more rounded than the
       other, that is a bug.
    4. Confirm nothing moved. Compare against the published site
       (https://shaper-coral.vercel.app) side by side if that helps: the cards should be the
       same size, four across, and the board picture the same size within them.
    5. Repeat in all four themes via the settings gear in the nav: Daylight, Chalk, Slate,
       Phosphor. **Look hardest at the softest theme, not the loudest.** In Slate the new
       line is very nearly invisible against the well — that is expected, and it is already
       true of the same line on the design screens, so the two still match. Confirm it looks
       intentional there rather than broken.
    6. Start a board (click any preset), come back to `/`, and check the "Continue Current
       Board" card. It has no board picture, so it correctly gets no new line — confirm it is
       otherwise completely unchanged.
    7. Hover and tab-focus a card: the accent outline on the card itself must be unchanged.
  </how-to-verify>

  <resume-signal>Type "approved", or describe what looks wrong and in which theme.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| *(none introduced)* | This task adds two CSS class names and a code comment. No input crosses a boundary, no data is read or written, no network call is added, no dependency is installed. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ist-01 | Tampering | `app/globals.css` ramp / contract layers | low | mitigate | A "fix" to the faint-line token value to make the new edge read more strongly would repaint 37 dividers, rules and grids across the whole app. Task 1 gate 7 asserts `app/globals.css` is untouched; Task 2 forbids changing a ramp value and requires under-bar themes to be reported instead. |
| T-ist-02 | Tampering | `components/viewer/tabbed-panel.tsx` | low | mitigate | Editing the treatment being matched (rather than matching it) would change all four design screens. Task 1 gate 7 asserts `components/viewer/` is untouched, and gate 3 asserts the parity substring is read FROM that file, not written to it. |
| T-ist-03 | Tampering | `components/setup/preset-card.tsx` outer card | low | mitigate | An over-broad border edit could land on the card `<button>` instead of the well. Task 1 gate 1 pins the exact well class string and gate 6 asserts exactly one non-comment line changed. |
| T-ist-SC | Tampering | package installs | n/a | accept | No npm/pip/cargo install occurs in this task, so the package-legitimacy gate does not apply. |
</threat_model>

<verification>
- `npm test` green (the geometry suites plus the globals.css/theme-registry assertions).
- `npm run lint` green.
- All seven Task 1 gates print PASS.
- `git diff --stat` touches exactly one file: `components/setup/preset-card.tsx`.
- The browser measurement is in the SUMMARY, showing the well's outer size unchanged and the
  drawing inset 1px.
- The four-theme table of edge strength is in the SUMMARY, with Slate named as faintest.
- The blocking human-verify checkpoint is approved in all four themes.
</verification>

<success_criteria>
- The landing page's board-thumbnail well carries the same edge treatment as the inner
  content card inside the tabs on every design screen — same token, same radius, same
  surface, asserted by a cross-file grep rather than by eye.
- `--surf-line-faint` was used, not `--surf-line`, and the reason is recorded in a comment
  that cites `components/viewer/tabbed-panel.tsx`.
- Zero token values changed, zero tokens added, zero files touched outside
  `components/setup/preset-card.tsx`.
- Measured proof that the cards, the grid and the thumbnail's outer box did not move, and
  that the board drawing now sits exactly 1px inside the new line.
- Every theme where the new edge is effectively invisible is named in the SUMMARY, framed as
  a pre-existing property of the shared treatment, with no ramp values invented to paper
  over it.
</success_criteria>

<output>
Create `.planning/quick/260826-ist-landing-page-thumbnail-well-gains-the-fa/260826-ist-SUMMARY.md` when done.

Write it for a shaper, not a developer: say what changed on the screen (the board pictures
on the home page now sit in their own lightly drawn box, matching the design screens) and
what did not (nothing moved, nothing resized). Same for the commit message.
</output>
