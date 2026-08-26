---
phase: quick-260826-icz
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/setup/setup-screen.tsx
  - components/setup/preset-card.tsx
  - components/setup/continue-board-card.tsx
  - app/globals.css
autonomous: false
requirements: [QUICK-260826-icz]

estimate:
  tokens: 34000
  raw_tokens: 17000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The home page's main background is the app chrome colour (the same colour as the nav and the body behind everything), not the sand drawing surface."
    - "Each board card on the home page is the sand surface, so the cards read as lifted off the page."
    - "The board thumbnail well inside each preset card is the panel surface, matching the inner content card on the four design screens."
    - "The home page's surface stack (page / card / inner well) is the same stack the /design screens already use (body / main / TabbedPanel)."
    - "Nothing on the /design screens changes colour."
  artifacts:
    - components/setup/setup-screen.tsx
    - components/setup/preset-card.tsx
    - components/setup/continue-board-card.tsx
    - app/globals.css
  key_links:
    - "PresetCard and ContinueBoardCard sit side by side in the same grid and MUST keep identical visual weight — the outer-card change lands on both, identically."
    - "--outline-page-bg is NOT retargeted; its only remaining consumer is the SVG fill in components/viewer/callout-primitives.tsx, which draws on the /design screens."
    - "components/ui/card.tsx keeps bg-card — only the two setup call sites move off it."
---

<objective>
Repaint the three stacked surfaces on the home page (`/`) so they layer the way every
other screen in the app already layers: the page behind everything becomes the app-chrome
colour, each board card becomes the sand drawing surface, and the board thumbnail well
inside each card becomes the panel surface.

Purpose: today the home page is upside down relative to the design screens — the page is
sand and the cards are white. The founder wants the page to be the chrome colour, the
card to be sand, and the thumbnail well inside it to be panel, "better matching the
layout of all themes". On the design screens that stack already exists: `body` is
`bg-surf-ground`, the `<main>` drawing area is `bg-surf-canvas`, and `TabbedPanel`'s
inner content card is `bg-surf-panel`. This makes the home page agree.

Output: three class-name changes across three components, one rewritten comment in
globals.css, and a measured four-theme report.

**Vocabulary (locked, do not relitigate):** "Window" is the Colour Bench's display label
for the `ground` role (`.planning/sketches/themes/colour-bench.html:475` —
`["ground","Window","App chrome — the nav and the body behind everything"]`). There is no
`--surf-window` token and none is to be created. The request maps onto the existing
contract as: page background → `--surf-ground`, outer card → `--surf-canvas`, inner
thumbnail well → `--surf-panel`.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md
@.claude/CLAUDE.md
@components/setup/setup-screen.tsx
@components/setup/preset-card.tsx
@components/setup/continue-board-card.tsx
</context>

<constraints>
This is a one-change task in a one-change-at-a-time cadence. Change these three surfaces
and nothing else.

- Do NOT restyle the cards (padding, gap, radius, ring, border, type scale, hover state).
- Do NOT adjust spacing or typography anywhere on the page.
- Do NOT touch the /design screens, the nav, the settings menu, or the order form.
- Do NOT change any value in globals.css LAYER 1 (the `--ramp-*` values) or LAYER 2/3.
  This task changes ZERO token values — it changes which existing token three elements
  point at, at the call site.
- Do NOT extract the duplicated card className into a shared constant. Both card files
  carry the same long class string today; leaving that duplication alone keeps this diff
  to one idea. (If it bothers you, capture it as a todo — do not fix it here.)
- Do NOT re-add a palette or contrast test file. `lib/design/palette.test.ts` and
  `lib/design/contrast.ts` were deleted by explicit founder decision (quick 260824-i05).
  Task 2's contrast maths runs in the scratchpad and is reported, never committed.
- Do NOT reintroduce literal colour names (`surf-base`, `surf-black`, `surf-muted`,
  `surf-accent-cyan`) — they are fully removed and must stay removed.
</constraints>

<tasks>

<task type="tracer">
  <name>Task 1: Move the three home-page surfaces onto ground / canvas / panel</name>
  <files>components/setup/setup-screen.tsx, components/setup/preset-card.tsx, components/setup/continue-board-card.tsx, app/globals.css</files>

  <read_first>
    - `components/setup/setup-screen.tsx` — the scrolling root div is line 58.
    - `components/setup/preset-card.tsx` — the card `<button>` className is line 34, the
      thumbnail well div is line 38.
    - `components/setup/continue-board-card.tsx` — the card `<button>` className is line 27.
    - `app/globals.css` around line 562 — the `--outline-page-bg` declaration and the
      commented block above it.
  </read_first>

  <action>
    Four edits. All three surface edits ship together in one commit: applying only one of
    them leaves the page mid-inversion (e.g. a white page holding white cards, with no
    card edge at all), which is a worse state than either end.

    1. `components/setup/setup-screen.tsx`, the scrolling root div: swap the surface
       utility from the sand token to `bg-surf-ground`. Keep the class explicit rather
       than deleting it and inheriting from `body` — this div is the scrolling element,
       so it must own its own paint or overscroll will reveal whatever is behind it. The
       rest of that className (`min-h-0 flex-1 overflow-y-auto`) is untouched.

    2. `components/setup/preset-card.tsx`, the card `<button>`: swap `bg-card` for
       `bg-surf-canvas`. Change ONLY that one token in the string — the border, ring,
       padding, radius, hover and focus-visible classes all stay exactly as they are.

    3. `components/setup/continue-board-card.tsx`, the card `<button>`: make the identical
       swap, `bg-card` → `bg-surf-canvas`. These two cards sit side by side in the same
       grid and the ContinueBoardCard docstring commits them to the same visual weight, so
       the two class strings must stay character-for-character identical afterwards.

    4. `components/setup/preset-card.tsx`, the thumbnail well div: swap
       `bg-outline-page-bg` for `bg-surf-panel`.

       **Do not "fix" this in globals.css instead.** Retargeting the `--outline-page-bg`
       token would also repaint `components/viewer/callout-primitives.tsx:402`
       (`fill="var(--outline-page-bg)"`), which draws on every /design screen. The change
       belongs on the class at this call site and nowhere else.

    5. `app/globals.css`: the utility from edit 4 was that token's only consumer in TSX,
       so its consumer set has genuinely changed and the file's inline commentary has to
       follow (project rule — the commentary is part of the deliverable). Add a short
       comment block directly above the `--outline-page-bg` declaration recording that its
       sole remaining consumer is the SVG fill in `components/viewer/callout-primitives.tsx`,
       that it therefore now means "the surface the board drawing sits on, on the design
       screens" and no longer has anything to do with the home page, and that repointing it
       will repaint every design-screen viewer. Change the comment only — the declaration's
       value (`var(--surf-canvas)`) stays exactly as it is, and so does the
       `--color-outline-page-bg` bridge at line 438.

    When you write that comment, describe the token by its CSS custom-property name. Do
    not write any retired Tailwind utility class name into a code comment in `app/globals.css`
    or in `components/setup/`; the gates below check that those utilities are gone from
    source, and a comment mentioning one would defeat the check.
  </action>

  <verify>
    <automated>
# 1. The three surfaces now point at the intended tokens (positive gates).
test "$(grep -c 'bg-surf-ground' components/setup/setup-screen.tsx)" = "1" \
  && test "$(grep -c 'bg-surf-canvas' components/setup/preset-card.tsx)" = "1" \
  && test "$(grep -c 'bg-surf-canvas' components/setup/continue-board-card.tsx)" = "1" \
  && test "$(grep -c 'bg-surf-panel' components/setup/preset-card.tsx)" = "1" \
  && echo "PASS surfaces"

# 2. The retired utilities are gone from the setup components (comment lines filtered out).
test "$(grep -v '^[[:space:]]*\(//\|\*\|/\*\)' components/setup/setup-screen.tsx components/setup/preset-card.tsx components/setup/continue-board-card.tsx | grep -c 'bg-card')" = "0" \
  && echo "PASS bg-card cleared from setup"

# 3. That utility now has zero consumers anywhere in TSX (globals.css excluded by the filter,
#    so the new comment cannot false-positive this).
test "$(grep -rn 'bg-outline-page-bg' --include='*.tsx' . --exclude-dir=node_modules | wc -l | tr -d ' ')" = "0" \
  && echo "PASS thumbnail utility cleared"

# 4. Nothing outside the home page moved. The shadcn card keeps its neutral, the token
#    keeps its value, and the viewer still reads it.
grep -q 'bg-card' components/ui/card.tsx \
  && grep -q -- '--outline-page-bg: var(--surf-canvas);' app/globals.css \
  && grep -q -- '--color-outline-page-bg: var(--outline-page-bg);' app/globals.css \
  && grep -q 'var(--outline-page-bg)' components/viewer/callout-primitives.tsx \
  && echo "PASS design screens untouched"

# 5. The two cards remain byte-identical in their class string.
diff <(grep -o '"flex w-full flex-col gap-2 [^"]*"' components/setup/preset-card.tsx) \
     <(grep -o '"flex w-full flex-col gap-2 [^"]*"' components/setup/continue-board-card.tsx) \
  && echo "PASS card parity"

# 6. Zero token values changed in globals.css — only comment lines and nothing else.
git diff -U0 app/globals.css | grep '^[+-]' | grep -v '^[+-][+-]' | grep -v '^[+-][[:space:]]*\(/\*\|\*\|//\)' | grep -c '.' | grep -qx '0' \
  && echo "PASS globals.css is comment-only"

npm test && npm run lint
    </automated>
  </verify>

  <done>
    The home page paints page = ground, card = canvas, thumbnail well = panel; both cards
    changed identically; `--outline-page-bg` keeps its value and its design-screen consumer
    and gains a comment naming that consumer; `npm test` and `npm run lint` are green.
  </done>
</task>

<task type="auto">
  <name>Task 2: Measure the new surface stack and every foreground on it, in all four themes</name>
  <files>(no repo files — scratchpad script plus the SUMMARY)</files>

  <action>
    Every foreground on the two cards is now sitting on a *different* surface than before,
    so re-measure rather than assume. The bars: 4.5:1 for text, 3:1 for graphical strokes
    and boundaries. There is no palette test in this repo any more, so compute the ratios
    yourself with a throwaway script in the scratchpad directory. Do not add the script to
    the repo and do not create a test file.

    Read the four `--ramp-<theme>-*` blocks out of `app/globals.css` LAYER 1 rather than
    retyping hex values, so the report cannot drift from the source. Themes: Daylight
    (default light), Chalk (light), Slate (default dark), Phosphor (dark).

    Measure, per theme:

    a. **The surface stack itself** — ground vs canvas (page against card), canvas vs panel
       (card against thumbnail well), and ground vs panel (page against thumbnail well).
       This is the founder-facing question: are the three surfaces actually three distinct
       tones, or do two of them collapse?

    b. **Text on the new outer card surface (canvas)** — the title (`text-foreground`, i.e.
       `--surf-ink`), the descriptor (`text-surf-ink-muted`) and the call-to-action
       (`text-surf-accent-ink`). Report each against the 4.5:1 bar, and flag any that are
       within 0.5 of it as tight.

    c. **The card's edge** — the resting `ring-foreground/10` (that is `--surf-ink` at 10%
       alpha; a Tailwind ring is a spread box-shadow drawn *outside* the border box, so it
       composites over the page background, not over the card fill) and the
       `hover:ring-surf-accent-ink`. Report each against the 3:1 boundary bar, and against
       both the page and the card fill. Where the resting ring is under bar, state plainly
       whether the same measurement was already under bar before this change — a
       pre-existing weakness is a finding to report, not a regression to fix here.

    d. **Inside the thumbnail** — the board's interior wash (`--surf-board-fill`) against the
       well's new panel background, and the board outline stroke (`--surf-ink`) against it.
       The wash is decorative interior, not a boundary, so it has no bar — but if it lands
       at 1.00:1 the planshape loses its fill entirely and reads as a bare stroke, which
       globals.css explicitly records as a step too far. Report the before and after for
       each theme.

    Reference measurements taken during planning, for you to confirm or correct — if your
    numbers disagree, trust yours and say so in the SUMMARY:
    - surface stack: ground/canvas 1.37 (Daylight, Chalk), 1.09 (Slate), 1.24 (Phosphor);
      canvas/panel the same three figures; **ground/panel 1.00 in all four themes**.
    - text on canvas: ink 10.54 / 10.54 / 15.29 / 7.84; ink-muted 4.58 / 4.58 / 7.04 / 5.11;
      accent-ink 4.94 / 7.71 / 4.70 / 5.65 (Daylight / Chalk / Slate / Phosphor).
    - board wash on the well: was 1.17 / 1.12 / 1.11 / **1.00**, becomes 1.17 / 1.23 / 1.21 / 1.24.

    Write the findings into the SUMMARY as a table, in plain English a shaper can read —
    say "the page and the thumbnail well are the same colour in every theme", not
    "ground/panel ratio is 1.00". State explicitly, per theme, whether the founder's
    requested three-tier layering actually reads as three tiers.

    If a theme collapses two of the three surfaces to the same value, **report it and stop
    there**. Do not invent new ramp values to separate them — the ramps are the founder's
    exported palette and changing one is a separate founder decision, not part of this task.
  </action>

  <verify>
    <automated>
# The audit must produce numbers, and must not have leaked into the repo.
test -z "$(git status --porcelain lib/design 2>/dev/null)" \
  && test "$(git status --porcelain | grep -c 'contrast\|palette')" = "0" \
  && echo "PASS no test/script files added"
npm test
    </automated>
    <human-check>
      The SUMMARY contains a four-theme table covering the surface stack, the three card
      foregrounds, both ring states, and the board wash — each with a ratio and a
      pass/fail/pre-existing verdict against its bar.
    </human-check>
  </verify>

  <done>
    A four-theme measured table exists in the SUMMARY; every foreground and boundary on the
    two cards has been re-checked on its new background; any theme where the three surfaces
    do not read as three distinct tones is named explicitly, with no ramp values changed.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Look at the new home page in all four themes</name>
  <what-built>
    The home page's three stacked surfaces were repainted to match how every other screen
    in the app layers: the page behind everything is now the app-chrome colour, each board
    card is the sand drawing surface sitting on top of it, and the little board picture
    inside each card sits in a panel-coloured well. No sizes, spacing or type changed —
    only which of the theme's existing colours each of those three areas uses.
  </what-built>

  <how-to-verify>
    1. `npm run dev`, open http://localhost:3000.
    2. Check the resting state: the page behind the cards should be the same colour as the
       nav bar across the top. Each board card should be a distinct, slightly lifted panel
       against it. The board picture inside each card should sit in its own well.
    3. Start a board (click any preset), then come back to `/` so the "Continue Current
       Board" card appears. It must read at exactly the same visual weight as the four
       preset cards beside it — same fill, same edge, same lift. If it looks lighter,
       heavier or differently framed, that is a bug.
    4. Hover and tab-focus a card. The accent outline must still read clearly against the
       new page colour.
    5. Repeat steps 2-4 in all four themes via the settings gear in the nav: Daylight,
       Chalk, Slate, Phosphor. **Look hardest at the softest theme, not the loudest** — an
       edge that reads in a punchy theme can disappear in a gentle one. Specifically check
       Slate, where the page and the card are the closest together of any theme.
    6. Confirm nothing moved on the design screens: open /design/outline and /design/rails
       and check the drawing area and its panels look exactly as they did before.
    7. Expected, and worth confirming with your own eyes rather than taking on trust: in
       all four themes the page and the thumbnail well end up the same colour, so the
       stack reads as two alternating tones (page → card → back to page's colour) rather
       than three separate steps. That is what the design screens already do. If you want
       three genuinely distinct tones, that needs a palette change, which is a separate task.
  </how-to-verify>

  <resume-signal>Type "approved", or describe what looks wrong and in which theme.</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| *(none introduced)* | This task changes three CSS class names and one code comment. No input crosses a boundary, no data is read or written, no network call is added, no dependency is installed. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-icz-01 | Tampering | `app/globals.css` `--outline-page-bg` | low | mitigate | A token repoint here would silently repaint every /design-screen viewer via `callout-primitives.tsx:402`. Task 1 verify gate 4 asserts the declaration keeps `var(--surf-canvas)` and gate 6 asserts the globals.css diff is comment-only. |
| T-icz-02 | Tampering | `components/ui/card.tsx` | low | mitigate | An over-broad `bg-card` sweep would restyle every shadcn card in the app. Task 1 verify gate 2 scopes the removal to `components/setup/` and gate 4 asserts `components/ui/card.tsx` still carries it. |
| T-icz-SC | Tampering | package installs | n/a | accept | No npm/pip/cargo install occurs in this task, so the package-legitimacy gate does not apply. |
</threat_model>

<verification>
- `npm test` green (the geometry suites plus the globals.css/theme-registry assertions).
- `npm run lint` green.
- All six Task 1 gates print PASS.
- `git diff --stat` touches exactly four files: the three setup components and
  `app/globals.css`, with the globals.css hunk containing comment lines only.
- The four-theme measured table is in the SUMMARY.
- The blocking human-verify checkpoint is approved in all four themes.
</verification>

<success_criteria>
- The home page paints page = `--surf-ground`, card = `--surf-canvas`, thumbnail well =
  `--surf-panel`, in all four themes, by pointing three call sites at existing tokens.
- `PresetCard` and `ContinueBoardCard` remain visually identical to each other.
- Zero token *values* changed; zero /design-screen pixels changed.
- Every foreground and boundary on the two cards re-measured on its new background across
  all four themes, with anything under bar reported (and, where pre-existing, labelled as
  such rather than fixed here).
- Any theme where ground / canvas / panel do not read as three distinct tones is named in
  the SUMMARY, with no ramp values invented to paper over it.
</success_criteria>

<output>
Create `.planning/quick/260826-icz-home-page-surfaces-page-background-to-wi/260826-icz-SUMMARY.md` when done.

Write it for a shaper, not a developer: say what changed on the screen (which areas got
which colour, and why the page now matches the design screens), not which component
re-rendered. Same for the commit message.
</output>
