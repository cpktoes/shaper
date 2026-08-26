---
phase: 260825-wrq-rotate-button-size-border
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/outline/outline-editor.tsx
autonomous: true
requirements: [QUICK-260825-WRQ]

estimate:
  tokens: 14000
  raw_tokens: 14000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "The Template viewer's rotate button has a visible outline in all four themes (Daylight, Chalk, Slate, Phosphor)."
    - "The rotate glyph is drawn larger than before — 24px instead of 20px."
    - "Clicking the button still toggles the board between vertical and horizontal; nothing about orientation behaviour changes."
    - "The board drawing never shows through the button — the button's interior is opaque."
  artifacts:
    - components/outline/outline-editor.tsx
  key_links:
    - "Button border token is `surf-line` (the 3:1 non-text boundary token), not `surf-line-faint` — the rule TabbedPanel documents at components/viewer/tabbed-panel.tsx lines 17-21."
    - "Button fill is `surf-ground`, whose value is identical to `surf-panel` (the surface behind it) in every theme — so it masks the drawing without introducing a visible plate."
    - "The accent-fill warning in the button's inline comment survives the edit: nothing drawn on the accent fill may keep the muted-ink colour."
---

<objective>
Make the Template viewer's rotate button bigger and give it a visible border, per the founder's request ("the rotate icon can be larger and needs a boarder around it").

Purpose: sketch 006 shipped this button as a ghost control with a 20px glyph, and flagged exactly this as its one open caveat — the glyph is tight at small sizes and "if this gets built, consider a 20–22px icon in a slightly larger button". The button also currently has no boundary at all, so on a white panel it reads as a floating mark rather than a control you can press.

Output: one styling edit to the button and its icon in `components/outline/outline-editor.tsx`, plus the two comments the change makes inaccurate, brought back in line.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@components/outline/outline-editor.tsx
@components/viewer/tabbed-panel.tsx
@.planning/sketches/006-orientation-switch/README.md
</context>

<research_findings>
Facts already established — do not re-derive them, and do not open a browser to check them.

**Current state** (`components/outline/outline-editor.tsx`):
- Icon at line ~177: `<RotateBoardIcon className="size-5" />` — 20px.
- Button className at line ~175: `absolute top-3 right-3 z-10 flex cursor-pointer items-center rounded-md p-1 text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink`
- No border, no background. Rendered box measures 28x28.

**Which border token.** `components/viewer/tabbed-panel.tsx` lines 17-21 state the rule this codebase follows: `--surf-line-faint` is 1.22:1 against Daylight's canvas — "present in the DOM and invisible on screen" — while `--surf-line` is the token that carries the 3:1 non-text target. A control boundary that must survive every theme takes `surf-line`. The settings menu's *popup* uses `surf-line-faint`, but that is a large shadowed surface, not a small control outline — do not copy it here.

**Which surface the button sits on, and why the fill is not cosmetic.** `TabbedPanel` renders its children inside a `bg-surf-panel` card, so the surface behind the button is `--surf-panel`. Read from `app/globals.css`: in all four themes `--surf-ground` and `--surf-panel` are the *same* value (Daylight/Chalk `#ffffff`, Slate `#12141a`, Phosphor `#050805`). So `bg-surf-ground` adds no visible plate — but it does make the button's interior opaque, and the button is absolutely positioned over the drawing area, so an opaque interior is what stops board lines running underneath the glyph. That is the reason to fill, and it is the sketch's own choice.

**Hover.** Sketch 006's button treatment moves the background to `--surf-well` on hover. In Daylight and Chalk that is `#dfdcd3` (a visible warm plate on white); in Slate `#1b1f26`; in Phosphor `--surf-well` equals `--surf-ground`, so the background hover is a no-op there and the existing ink change carries the affordance on its own. Adding it is safe in all four.

**Sizing arithmetic.** `size-5` = 20px, `size-6` = 24px; `p-1` = 4px. With a 1px border the rendered box is `icon + 2*padding + 2`, so `size-6` + `p-1` + border = 34x34 (up from 28x28). The glyph carries about 3px of its own inset inside the 24-unit viewBox at that size, so the visual gap from ink to border is roughly 7px — the same visual gap as the sketch's 30px button around its 19px icon, just at a larger absolute size. That satisfies both "can be larger" and the sketch's 20–22px floor.

**The colour rule the codebase has been bitten by three times**, already written above the button's className: anything drawn ON the accent fill takes that fill's paired `on-` colour. The fill introduced here is `surf-ground`, not the accent, so the rule does not bite — but the warning must stay in the file for the next person.
</research_findings>

<tasks>

<task type="auto">
  <name>Task 1: Enlarge the rotate glyph to 24px and give the button a surf-line border on an opaque ground fill</name>
  <files>components/outline/outline-editor.tsx</files>
  <action>
Three edits in this one file. Do not touch `outline-viewer.tsx` or `callout-primitives.tsx`, do not redraw the glyph's paths, and do not change any orientation behaviour — `setOrientation`, the `aria-label` swap and the `title` all stay exactly as they are.

1. **Icon size.** At the `RotateBoardIcon` usage inside the button (around line 177), change `className="size-5"` to `className="size-6"`.

2. **Button treatment.** Replace the button's className (around line 175) with, in full: `absolute top-3 right-3 z-10 flex cursor-pointer items-center rounded-md border border-surf-line bg-surf-ground p-1 text-surf-ink-muted transition-colors outline-none hover:bg-surf-well hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink`

   Everything already there is preserved — position, `z-10`, flex, cursor, `rounded-md`, `p-1`, the muted-ink resting colour, `transition-colors`, the reset `outline-none`, and the focus-visible ring. What is added is `border border-surf-line`, `bg-surf-ground` and `hover:bg-surf-well`. Keep `p-1`: with a 24px icon and the 1px border the box lands at 34x34, which is the sketch's icon-to-button proportion at a larger absolute size.

3. **Comments.** Two comments in this file become wrong the moment the edit lands, and both must be corrected rather than deleted.

   a. The `RotateBoardIcon` docstring (around lines 61-74) ends by explaining that the glyph gets tight below about 16px, "which is why the button uses `size-5` (20px) rather than the settings gear's `size-4`". Update that closing sentence so it names the 24px size the button now uses, and record that the founder asked for a larger icon and that sketch 006's README already carried this as its one open caveat (it recommends a 20-22px icon in a slightly larger button if the sketch ever got built). Leave the rest of the docstring — the two-copies-at-one-scale explanation, the 0.62 scale, the 2.42 stroke width — untouched and accurate.

   b. The inline comment above the button's className (around lines 167-174) currently describes the control as "Ghost/unfilled" and explains that this is what sidesteps the accent-fill rule. It is no longer ghost. Rewrite it to describe the treatment that now exists, and it must still carry all four of these points:
      - The border token is `surf-line`, not `surf-line-faint`, because `line` is the token carrying the 3:1 non-text target that a control boundary needs in every theme — cite `components/viewer/tabbed-panel.tsx` as where that rule is written down.
      - The fill is `surf-ground`, which is the same value as the `surf-panel` surface behind it in all four themes, so it adds no visible plate; it is there to be opaque, because the button is absolutely positioned over the drawing and board lines must not run under the glyph.
      - The accent-fill warning, preserved: a fill has now been introduced, and it is deliberately not the accent — anything drawn on the accent fill has to take that fill's paired `on-` colour, a rule this codebase has been bitten by three times (`.planning/quick/260825-rmb-*/SUMMARY.md`).
      - The button is icon-only, so the `aria-label` is its accessible name, and per D-05 the label is the only thing that changes between states.

Note on footprint, one line in the comment or none at all — do not build anything for it: the button grows from 28px to 34px in the panel's top-right corner. It is `z-10` over the drawing, and the horizontal orientation draws the board across the full panel width, so the button can sit over the far nose or tail region of a wide board. The opaque fill means the glyph stays readable there; whether the coverage itself is acceptable is a looking-at-it question and is carried by the human check below, not by this task.
  </action>
  <verify>
    <automated>cd /Users/kontoes/Code/shaper && npx tsc --noEmit && npm run lint && npm test && npm run build && grep -c 'RotateBoardIcon className="size-6"' components/outline/outline-editor.tsx && grep -c 'border border-surf-line bg-surf-ground' components/outline/outline-editor.tsx</automated>
  </verify>
  <done>
`npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` all pass. `components/outline/outline-editor.tsx` renders the rotate glyph at `size-6` and the button carries `border border-surf-line` with a `bg-surf-ground` fill and a `hover:bg-surf-well` state. Both comments read true against the code they sit above. No other file is modified.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none introduced) | Tailwind class changes on an existing client-side button; no new input crosses any boundary, no new dependency, no data flow change. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-WRQ-01 | Denial of Service | rotate button overlay in `outline-editor.tsx` | low | accept | The button grows 28px to 34px at `z-10` over the drawing area, so it covers slightly more of the board at wide/horizontal sizes. Purely visual occlusion of the user's own drawing, no data or availability impact; judged by eye in the human check below. |
</threat_model>

<verification>
Automated, run by the executor:
- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm test` — passes (no geometry touched; this is a regression guard only)
- `npm run build` — succeeds

<human-check>
FOR THE ORCHESTRATOR, NOT THE EXECUTOR. The executor must not drive a browser.

These are Tailwind classes, so the only real proof is looking at it. On the Template screen, in each of the four themes — Daylight, Chalk, Slate, Phosphor — confirm:
1. The rotate button in the viewer's top-right corner has a clearly visible border. The whole point of choosing `surf-line` is that it stays visible in every theme, so a theme where the outline disappears is a failure, not a taste note.
2. The glyph is legibly larger than before, and the two board copies plus the arrow still read as one board being turned.
3. The button's interior does not read as a discoloured patch against the panel behind it.
4. Hovering darkens the ink and (outside Phosphor) lightens the background; the button still looks pressable.
5. Clicking still rotates the board, and rotating back still works.
6. With the board horizontal, the button does not obscure anything the drawing needs to show at that corner.
</human-check>
</verification>

<success_criteria>
- Rotate glyph renders at 24px; button box renders at 34x34.
- Button has a `surf-line` border and an opaque `surf-ground` interior, visible in all four themes.
- Orientation toggle behaviour, `aria-label` swap and `title` are byte-identical to before.
- `components/outline/outline-editor.tsx` is the only file changed.
- Both affected comments are accurate against the new code, and the accent-fill warning survives.
</success_criteria>

<output>
Create `.planning/quick/260825-wrq-rotate-button-size-border/SUMMARY.md` when done.
</output>
