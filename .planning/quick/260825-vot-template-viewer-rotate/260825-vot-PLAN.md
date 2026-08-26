---
phase: quick-260825-vot
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - components/outline/outline-viewer.tsx
  - components/viewer/callout-primitives.tsx
  - components/outline/outline-editor.tsx
autonomous: true
requirements: [QUICK-260825-vot]

estimate:
  tokens: 48000
  raw_tokens: 48000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "On the Template screen a rotate button sits in the upper-right corner INSIDE the viewer panel's content card, over the drawing area — not in a header row, not inline with the VIEWER tab (D-06)."
    - "Clicking it turns the board 90° so the nose points LEFT, inside the panel it already occupies. Nothing else on the page moves — same nav, same sidebar, same panel, same panel size (D-06)."
    - "Clicking it again returns the board to vertical, nose up. The icon is the same glyph in both states; only the aria-label changes (D-05)."
    - "In horizontal mode, dragging a construction control point still tracks the pointer and still drives the same solver result it drives in vertical (the drag matrix comes off the rotated group, not the SVG root)."
    - "In BOTH orientations every callout — the input chips and the output rail — reads upright and left-to-right, with chip boxes still wider-than-tall, and every leader still attached to the board feature it measures."
    - "A page reload comes back vertical. Orientation is React view state only — no browser storage, no URL parameter, no settings-menu entry, no pre-hydration read (D-03)."
    - "The Rails, Fins and Summary screens get no rotate button (D-01)."
    - "The Summary sheet and the order-form template window still render vertical, by construction: they never pass the new prop and the prop defaults to vertical (D-04)."
    - "Every existing consumer of OutlineViewer — the setup preset-card thumbnails, the order form's two template windows, and the Template screen in its default state — draws exactly what it drew before: same viewBox string, same coordinates, same attribute values."
  artifacts:
    - "components/outline/outline-viewer.tsx — an `orientation` prop defaulting to \"vertical\", a content group carrying the rotation, an orientation-aware viewBox and fit-scale, and a drag matrix read off that group"
    - "components/viewer/callout-primitives.tsx — a viewer-orientation context, and counter-rotation inside CalloutChip and OutputRail"
    - "components/outline/outline-editor.tsx — the orientation view state, the absolutely-positioned rotate button, and the RotateBoardIcon glyph"
  key_links:
    - "The rotation lives on ONE content <g> inside the SVG; every existing projector (pxX, lenToY) and all ~40 call sites keep drawing the canonical vertical layout untouched"
    - "toBoardPoint() calls getScreenCTM() on the content group, not on the SVG root — the root's matrix stops at the viewport and would miss the group's own rotation"
    - "useSvgFitScale receives the SWAPPED viewBox dimensions in horizontal, or every pinned callout is sized against the wrong axis"
    - "CalloutChip's leader stays OUTSIDE the counter-rotation (it must turn with the board); only the chip box and its two text lines counter-rotate, about the chip's own anchor"
    - "orientation is a prop with a vertical default, never a global or a context reaching past OutlineViewer — that is what makes 'print and Summary are always vertical' true by construction rather than by a guard"
---

<objective>
Build the horizontal board orientation for the Template viewer: a rotate button inside the
viewer panel that turns the board 90° (nose left) within the panel it already occupies,
leaving the page layout completely untouched.

Purpose: the app's viewer panel is already landscape. Measured on the running app at
1440 × 900 the framed viewer is 990 × 737 and the vertical board inside it draws 168 × 637 —
it fills the height completely and uses **17% of the width**. Rotating the board in place
captures roughly half of a full page rebuild's gain (+51% board length on screen) for none of
its cost: no moved controls, no full-bleed breakout, no second print path. See
`.planning/sketches/006-orientation-switch/README.md`.

Output: a rotate button on the Template screen and a Template-only `orientation` prop on
`OutlineViewer`, with every other consumer of that viewer — preset thumbnails, order form,
Summary, print — byte-for-byte unchanged.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/sketches/006-orientation-switch/README.md
@components/outline/outline-viewer.tsx
@components/viewer/callout-primitives.tsx
@components/outline/outline-editor.tsx
</context>

<founder_decisions>
Settled by the founder while reviewing sketch 006, plus one correction given after it. These
are **not open questions**. Do not plan or build alternatives, and do not "improve" on them.

| ID | Decision |
|----|----------|
| D-01 | **Template viewer only.** Rails, Fins and Summary do not get the button, even though they render board drawings too. |
| D-02 | **Vertical is the default view.** Nothing changes about how the app opens. |
| D-03 | **No persistence.** Orientation is React view state that resets on reload. No browser storage, no pre-hydration read, no settings-menu entry, no URL parameter. Deliberately *less* machinery than the theme preference. |
| D-04 | **Print and Summary are ALWAYS vertical.** The Summary sheet and the full-size template export both render `OutlineViewer`; neither may ever observe the rotated state. |
| D-05 | **The icon never changes between states.** One glyph, showing both orientations at once. Only the `aria-label` swaps. |
| D-06 | **The button sits INSIDE the viewer panel**, in its content area, upper-right corner — absolutely positioned over the drawing area. NOT in a header row beside the panel title (the mockup had it there and the founder explicitly corrected this), and NOT inline with the tab strip. |
</founder_decisions>

<scope_boundary>
**Three files. No others.**

- `components/outline/outline-viewer.tsx`
- `components/viewer/callout-primitives.tsx`
- `components/outline/outline-editor.tsx`

Do **NOT** touch:

- `components/viewer/tabbed-panel.tsx` — shared by four screens (D-06 is satisfied without it)
- `components/fins/fin-viewer.tsx`, `components/setup/preset-card.tsx`,
  `components/summary/order-form.tsx` — they consume the primitives and the viewer and must
  keep rendering exactly what they render today
- anything under `lib/` — this is diagram layout, not board geometry (CLAUDE.md), and no
  geometry math changes
- `scripts/extract-prototype-*-golden.mjs` and the goldens they generate — those extract and
  execute the prototype's own functions and are never hand-edited

**Do not refactor the projectors.** `pxX` / `lenToY` and their ~40 paired call sites stay
exactly as they are. They draw the canonical vertical layout; the rotation happens once, on a
group wrapped around them. Introducing a `project(halfWidth, station) => [x, y]` would drag in
the fin viewer, the Summary cards and the preset thumbnails for a Template-only feature.

**No packages are installed by this plan.** If you find yourself reaching for one, stop and
report instead.
</scope_boundary>

<already_researched>
Verified against the real files. Do not re-derive.

**How the drawing is built.** `OutlineViewer` computes
`outlineViewMetrics(geometry, hideCallouts)` → `{ lengthIn, centerlineX, scale, frame, tailPy,
tipPy }`, then defines two local projectors (~lines 212-213):

- `lenToY(stationIn) = tailPy - stationIn * scale` — station → y
- `pxX(halfWidthIn) = centerlineX + halfWidthIn * scale` — half-width → x

Around 40 call sites pair them as `x={pxX(...)} y={lenToY(...)}`. The callout viewBox comes
from `frame` (`OUTLINE_VIEW_WIDTH` 514 + 2×overflow, by `OUTLINE_VIEW_HEIGHT` 638, at
`minX = -104 - overflow`, `minY = -16`).

**The rotation maths.** `rotate(-90)` maps `(x, y) → (y, -x)`. Small y (the nose, at
`tipPy = 24`) becomes small x, so the nose lands on the **left** — which is what D-06 asks
for. The canonical frame's y-extent becomes the rotated frame's x-extent, and its x-extent
becomes the rotated frame's y-extent, negated:

```
horizontal viewBox = (baseMinY, -(baseMinX + baseW), baseH, baseW)
```

**Which gutter becomes which rail.** Canonical x ∈ [-104-o, 410+o] maps to screen y ∈
[-410-o, 104+o]. The input-chip gutter (x ≈ 58) lands at screen y ≈ -58, near the **bottom**;
the output rail (x ≈ 282) lands at screen y ≈ -282, near the **top**. So the left gutter
becomes the bottom rail and the right gutter becomes the top rail.

**Why the counter-rotation is two edits, not forty.** Every callout in this viewer goes
through exactly two components — `CalloutChip` and `OutputRail`, both in
`components/viewer/callout-primitives.tsx`. Rotating the group alone would lay their text on
its side and turn each chip's `rect` into a tall thin box.

**Why counter-rotating about the anchor works.** A child with `transform="rotate(90 ax ay)"`
inside a parent with `transform="rotate(-90)"` composes to `R(-90)·T(a)·R(90)·T(-a)`, whose
linear part is the identity. So the child's content draws **screen-upright and unscaled**,
while the anchor point `a` still lands wherever the rotated drawing puts it. Displacement from
the anchor in the child's coordinates equals displacement on screen: `+x` is screen-right
(along the board, nose→tail) and `+y` is screen-down (away from the board, toward the chip
rail).

**Drag.** `toBoardPoint` (~line 302) currently calls `getScreenCTM()` on the **SVG root**,
which does not include a child group's transform. Called on the **rotated group** it does — so
the point comes back already in canonical drawing coordinates and the existing `pxX`/`lenToY`
inversion below it is correct in both orientations, unchanged.

**No tests cover this rendering.** All ~670 Vitest tests live under `lib/` (pure geometry) and
`lib/theme.ts`. There is no component test and no DOM snapshot of `OutlineViewer`. Regression
safety therefore comes from *construction* (the default path is untouched) plus the grep gates
and the browser checks below — not from the test suite.

**No CSS reaches into the SVG.** `app/globals.css` contains no `svg` descendant selectors, so
adding a container `<g>` cannot change any styling.

**Consumers of `OutlineViewer`** (the complete list): `components/setup/preset-card.tsx`,
`components/summary/order-form.tsx` (twice), `components/outline/outline-editor.tsx`.

**Next.js:** this plan introduces no Next API surface at all — three existing components, one
of which (`callout-primitives.tsx`) already carries `"use client"` and the other two of which
are reached through `outline-editor.tsx`'s `"use client"`. No guide in
`node_modules/next/dist/docs/` applies. If you find yourself reaching for a Next API, stop and
read the relevant guide first (AGENTS.md).
</already_researched>

<tasks>

<task type="tracer" tdd="false">
  <name>Task 1: Turn the board — the orientation prop, the rotation group, and the button that drives it</name>
  <files>components/outline/outline-viewer.tsx, components/viewer/callout-primitives.tsx, components/outline/outline-editor.tsx</files>
  <read_first>
    - `components/outline/outline-viewer.tsx` in full (567 lines). Note especially: the
      `OutlineViewerProps` doc-comment style (every prop carries a paragraph saying what it is
      for and what its default preserves — match it), the `viewBox` / `vbW` / `vbH` block near
      the end, `toBoardPoint`, and the `CalloutSizeProvider` wrapper around the `<svg>`.
    - `components/viewer/callout-primitives.tsx` lines 1-140 — the existing
      `CalloutSizeContext` / `CalloutSizeProvider` / `useCalloutSizes` trio, which the new
      orientation context should mirror exactly in shape and in comment style. Also note
      `CALLOUT_PX` and `MIN_PINNED_FIT_SCALE`, both already exported.
    - `components/outline/outline-editor.tsx` in full — the `TabbedPanel` content area and the
      two nested `relative` wrappers around `OutlineViewer`.
    - `components/settings-menu.tsx` lines 30-37 — the app's icon-button precedent. Its
      trigger classes are the ones to follow.
    - `.planning/sketches/006-orientation-switch/index.html` lines 228-262 — the `#rotateBtn`
      markup. The icon SVG is lifted from here.
  </read_first>
  <action>
    Three edits, in this order. After them the board turns end-to-end and drags correctly; the
    callouts will still be lying on their side, which Task 2 fixes. That gap is deliberate and
    is functionality, not architecture — nothing in Task 2 changes anything built here.

    **1. `components/viewer/callout-primitives.tsx` — add a viewer-orientation context.**

    Beside the existing `CalloutSizeContext` block, and written in the same house style
    (a doc-comment saying why it is a context and not a prop):

    ```tsx
    export type ViewerOrientation = "vertical" | "horizontal";

    const ViewerOrientationContext = createContext<ViewerOrientation>("vertical");
    export const ViewerOrientationProvider = ViewerOrientationContext.Provider;
    export function useViewerOrientation(): ViewerOrientation {
      return useContext(ViewerOrientationContext);
    }
    ```

    The default is the canonical orientation for the same reason `CalloutSizeContext` defaults
    to `UNPINNED_CALLOUT_SIZES`: a consumer that says nothing gets exactly what it got before.
    The fin viewer and every other primitive caller never provide it. Nothing else in this
    file changes in this task.

    **2. `components/outline/outline-viewer.tsx` — the prop, the frame, the group, the drag.**

    (a) Import `ViewerOrientationProvider`, `type ViewerOrientation`, `CALLOUT_PX` and
    `MIN_PINNED_FIT_SCALE` from `@/components/viewer/callout-primitives` (add to the existing
    import block; the last two are already exported).

    (b) Add a module constant beside the other layout constants, with a comment explaining
    what it buys and why it is derived rather than picked:

    ```ts
    const HORIZONTAL_END_PAD = CALLOUT_PX.chipW / MIN_PINNED_FIT_SCALE / 2;
    ```

    Reason to record in the comment: in vertical, the chips that sit at the extreme stations —
    LENGTH at the nose tip, TAIL BLOCK at the tail pod — live in the side gutter and the
    frame's own width already covers them. Rotated, those chips are centred on their station
    across the long axis, so they overhang both ends of the frame and would be clipped. The
    size is the widest a pinned chip can ever grow to (`CALLOUT_PX.chipW / MIN_PINNED_FIT_SCALE`,
    ≈ 158 units) halved, because a chip is centred on its station in horizontal — so it is
    derived from the callout system's own bounds, not tuned by eye.

    (c) Add the prop to `OutlineViewerProps`, with a doc-comment in the file's house style
    covering: it is Template-screen view state (D-01/D-02); `"horizontal"` turns the whole
    drawing 90° so the board lies nose-left in the panel it already occupies; and the default
    is `"vertical"`, which is what makes the Summary sheet, the order form's template windows,
    the print path and the preset thumbnails vertical **by construction** rather than by a
    guard anyone can forget (D-04). Destructure it with `orientation = "vertical"` in the
    component signature.

    ```ts
    orientation?: ViewerOrientation;
    ```

    (d) At the top of the component body add `const horizontal = orientation === "horizontal";`
    and a second ref for the content group:

    ```ts
    const contentRef = useRef<SVGGElement>(null);
    ```

    (e) Replace the `viewBox` / `vbW` / `vbH` block. **Keep the existing vertical expression
    character-for-character** — rename it only — so the default path's viewBox string cannot
    drift:

    ```ts
    const verticalViewBox = hideCallouts
      ? fixedFrame
        ? `${fixedMinX.toFixed(2)} 0 ${fixedWidth.toFixed(2)} ${VIEW_H}`
        : `0 0 ${VIEW_W} ${VIEW_H}`
      : `${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`;

    const baseMinX = hideCallouts ? (fixedFrame ? fixedMinX : 0) : frame.minX;
    const baseMinY = hideCallouts ? 0 : frame.minY;
    const baseW = hideCallouts ? (fixedFrame ? fixedWidth : VIEW_W) : frame.width;
    const baseH = hideCallouts ? VIEW_H : frame.height;

    const horizW = baseH + 2 * HORIZONTAL_END_PAD;
    const horizH = baseW;
    const horizontalViewBox =
      `${(baseMinY - HORIZONTAL_END_PAD).toFixed(2)} ${(-(baseMinX + baseW)).toFixed(2)}` +
      ` ${horizW.toFixed(2)} ${horizH.toFixed(2)}`;

    const viewBox = horizontal ? horizontalViewBox : verticalViewBox;
    const vbW = horizontal ? horizW : baseW;
    const vbH = horizontal ? horizH : baseH;
    ```

    Comment the horizontal frame with the mapping it comes from — the rotation sends
    `(x, y) → (y, -x)`, so the canonical y-extent becomes the rotated x-extent and the
    canonical x-extent becomes the rotated y-extent, negated. In vertical, `vbW`/`vbH` are the
    same numbers they were, so `useSvgFitScale` returns the same scale and every pinned callout
    is sized identically. **`useSvgFitScale(svgRef, vbW, vbH)` must receive these swapped
    values** — passing the canonical pair in horizontal would size every pinned callout against
    the wrong axis. Leave that call otherwise untouched.

    (f) Wrap every existing child of the `<svg>` — the outline path, the station lines, the
    construction overlay, the drag targets and hit circles, the fin marks, and the whole
    `!hideCallouts` block — in one group, and change nothing inside it:

    ```tsx
    <g ref={contentRef} transform={horizontal ? "rotate(-90)" : undefined}>
      … everything that is inside <svg> today, verbatim …
    </g>
    ```

    React omits an `undefined` attribute, so in vertical this is a plain container with no
    transform. SVG treats such a group as a pass-through, and `app/globals.css` has no `svg`
    descendant selectors, so it cannot change what any existing consumer draws. Do not move,
    reorder or reformat any child while wrapping them.

    (g) In `toBoardPoint`, take the matrix from the content group, falling back to the root:

    ```ts
    const el = contentRef.current ?? svgRef.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return null;
    ```

    Leave the two lines below it (the `DOMPoint` transform and the `pxX`/`lenToY` inversion)
    **exactly as they are** — that is the point of the whole approach. Record in the comment
    that a root matrix stops at the viewport and would miss the group's own rotation, so a drag
    in horizontal would solve against the wrong axis; on the group the transform is included,
    so the point arrives in the canonical space the inversion was written for and works in both
    orientations unchanged.

    (h) Wrap the `<svg>` in the orientation provider, inside the existing size provider:

    ```tsx
    <CalloutSizeProvider value={calloutSizes}>
      <ViewerOrientationProvider value={orientation}>
        <svg …>…</svg>
      </ViewerOrientationProvider>
    </CalloutSizeProvider>
    ```

    A provider is not a DOM node, and in vertical it publishes the same value the context
    already defaults to, so nothing downstream changes.

    **3. `components/outline/outline-editor.tsx` — the state, the button, the glyph.**

    (a) `import { useId, useState } from "react";` and
    `import type { ViewerOrientation } from "@/components/viewer/callout-primitives";`.

    (b) Beside `showConstruction`, add
    `const [orientation, setOrientation] = useState<ViewerOrientation>("vertical");` with a
    short comment: view state, like `showConstruction` — not design data, and deliberately not
    a stored preference (D-03), so a reload comes back vertical.

    (c) Pass `orientation={orientation}` to `<OutlineViewer …>`. Change no other prop.

    (d) Add `relative` to the existing panel-content div — the one whose classes are
    `flex min-h-0 flex-1 items-stretch justify-center gap-6 p-3` — so it becomes the
    positioning context, and put the button inside it as its first child. That div IS the
    viewer panel's content area, which is what D-06 asks for; `TabbedPanel` is not touched.

    ```tsx
    <button
      type="button"
      onClick={() => setOrientation((o) => (o === "vertical" ? "horizontal" : "vertical"))}
      aria-label={
        orientation === "vertical"
          ? "Rotate the board to horizontal"
          : "Rotate the board to vertical"
      }
      title="Rotate the board"
      className="absolute top-3 right-3 z-10 flex cursor-pointer items-center rounded-md p-1 text-surf-ink-muted transition-colors outline-none hover:text-surf-ink focus-visible:ring-2 focus-visible:ring-surf-accent-ink"
    >
      <RotateBoardIcon className="size-5" />
    </button>
    ```

    Those classes are `SettingsMenu`'s icon-button treatment (`components/settings-menu.tsx`),
    which is the app's existing precedent for an icon-only control. The icon is drawn in
    `currentColor` on an unfilled button, so it carries the muted-ink token and darkens to
    `surf-ink` on hover. Note in a comment **why there is no fill**: anything drawn on the
    accent fill has to take that fill's paired `on-` colour, a rule this codebase has been
    bitten by three times (see `.planning/quick/260825-rmb-*/SUMMARY.md`); a ghost button
    sidesteps it entirely, and if a fill is ever added here it must take `text-surf-on-accent`.
    The button is icon-only, so `aria-label` is its accessible name — and per D-05 the label is
    the only thing that changes between states.

    (e) Add a local `RotateBoardIcon` component in the same file, above `OutlineEditor`. The
    geometry is lifted verbatim from the sketch's `#rotateBtn`:

    ```tsx
    function RotateBoardIcon({ className }: { className?: string }) {
      const glyphId = `shaper-board-glyph-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
      return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className}>
          <defs>
            <path
              id={glyphId}
              d="M12 3.3C11.0 6.2 9.88 9.5 9.85 12.6 9.82 15.6 10.4 18.2 11.1 20.3a0.95 0.95 0 0 0 1.8 0C13.6 18.2 14.18 15.6 14.15 12.6 14.12 9.5 13.0 6.2 12 3.3Z"
            />
          </defs>
          <g stroke="currentColor" strokeLinejoin="round" fill="none" strokeWidth={2.42}>
            <use href={`#${glyphId}`} transform="translate(17.2,12.5) scale(0.62) translate(-12,-12.3)" />
            <use href={`#${glyphId}`} transform="translate(8.5,17) rotate(-90) scale(0.62) translate(-12,-12.3)" />
          </g>
          <path d="M14.5 6.5A8 8 0 0 0 4.5 11.8" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
          <path d="M4.29 13.89 3.06 11.66 5.94 11.94Z" fill="currentColor" />
        </svg>
      );
    }
    ```

    Comment what the drawing is doing, from the sketch's README: both states shown at once the
    way the phone "rotate screen" glyph does it — an upright board, the same board on its side
    nose-left, and one arrow between them. One planshape reused twice through `<use>` at the
    **same** 0.62 scale, so it reads as one board being turned rather than two boards of
    different sizes, and `strokeWidth` is 2.42 so the drawn weight lands at 1.5 after that
    shared scale. The gap between the two copies is what keeps it readable small.

    Also comment the id: SVG ids are document-global, so a literal one would collide if this
    ever rendered twice on a page; `useId` gives a per-instance one, stripped of React's own
    punctuation so it stays a valid URL fragment. Do not hardcode the id.

    The button is 28px (`p-1` + a 20px glyph) — the sketch's proof sheet found the glyph gets
    tight below about 16px, so `size-5` rather than the `size-4` the settings gear uses.
  </action>
  <verify>
    <automated>

```bash
set -u
V=components/outline/outline-viewer.tsx
E=components/outline/outline-editor.tsx
P=components/viewer/callout-primitives.tsx
fail() { echo "FAIL: $1"; exit 1; }

# --- the prop, and its default -------------------------------------------------
grep -q 'orientation?: ViewerOrientation' "$V" || fail "orientation prop not declared"
grep -q 'orientation = "vertical"' "$V"        || fail "orientation does not default to the canonical view"

# --- the vertical frame is the ORIGINAL expression, character for character ----
grep -qF '`${fixedMinX.toFixed(2)} 0 ${fixedWidth.toFixed(2)} ${VIEW_H}`' "$V" || fail "order-form fixedFrame viewBox changed"
grep -qF '`0 0 ${VIEW_W} ${VIEW_H}`' "$V"                                     || fail "preset-thumbnail viewBox changed"
grep -qF '`${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`' "$V"  || fail "callout viewBox changed"
grep -qF 'const viewBox = horizontal ? horizontalViewBox : verticalViewBox;' "$V" || fail "viewBox is not orientation-switched"

# --- one rotation, and it is conditional --------------------------------------
grep -qF 'transform={horizontal ? "rotate(-90)" : undefined}' "$V" || fail "content group rotation missing or unconditional"
grep -qF 'transform="rotate(-90)"' "$V" && fail "an unconditional rotation would turn every consumer"

# --- the fit scale follows the frame ------------------------------------------
grep -qF 'const vbW = horizontal ? horizW : baseW;' "$V" || fail "fit-scale width not swapped in horizontal"
grep -qF 'const vbH = horizontal ? horizH : baseH;' "$V" || fail "fit-scale height not swapped in horizontal"
grep -qF 'useSvgFitScale(svgRef, vbW, vbH)' "$V"         || fail "useSvgFitScale call changed"

# --- the drag matrix comes off the rotated group ------------------------------
grep -qF 'contentRef.current ?? svgRef.current' "$V" || fail "drag still reads the root matrix"
grep -qF 'inchesToMm((tailPy - local.y) / scale)' "$V" || fail "the drag inversion was rewritten; it must stay untouched"

# --- the projectors are untouched ---------------------------------------------
grep -qF 'const lenToY = (stationIn: number) => tailPy - stationIn * scale;' "$V" || fail "lenToY was changed"
grep -qF 'const pxX = (halfWidthIn: number) => centerlineX + halfWidthIn * scale;' "$V" || fail "pxX was changed"

# --- the orientation context ---------------------------------------------------
grep -q 'ViewerOrientationContext = createContext<ViewerOrientation>("vertical")' "$P" || fail "orientation context missing or wrongly defaulted"
grep -q 'ViewerOrientationProvider' "$V" || fail "viewer does not publish its orientation"

# --- the button, and where it lives -------------------------------------------
grep -q 'Rotate the board to horizontal' "$E" || fail "outbound aria-label missing"
grep -q 'Rotate the board to vertical' "$E"   || fail "return aria-label missing"
grep -q 'absolute top-3 right-3' "$E"         || fail "button is not positioned in the panel corner"
grep -q 'useId()' "$E"                        || fail "glyph id is not per-instance"
grep -q 'orientation={orientation}' "$E"      || fail "viewer is not driven by the screen's state"

# --- no persistence, in any of the three files (comment lines stripped first) --
for f in "$V" "$E" "$P"; do
  if grep -vE '^[[:space:]]*(//|\*|/\*)' "$f" | grep -qE 'localStorage|sessionStorage|document\.cookie|searchParams'; then
    fail "persistence introduced in $f"
  fi
done

# --- blast radius --------------------------------------------------------------
if git diff --name-only | grep -q 'components/viewer/tabbed-panel.tsx'; then fail "the shared TabbedPanel was modified"; fi
if git diff --name-only | grep -vE '^(components/outline/outline-viewer\.tsx|components/outline/outline-editor\.tsx|components/viewer/callout-primitives\.tsx|\.planning/)' | grep -q .; then
  git diff --name-only; fail "files outside the three-file scope were modified"
fi

npx tsc --noEmit || fail "tsc"
npm run lint     || fail "lint"
npm test         || fail "vitest"
echo PASS
```
    </automated>
    <human-check>
      **For the ORCHESTRATOR, in a browser. The executor must not drive a browser.**

      This is the tracer's payoff — the one thing that cannot be proven any other way. At this
      point the callouts are still lying on their side; that is expected and Task 2 fixes it.
      Ignore their orientation and look only at the board and the drag.

      `npm run dev`, open `http://localhost:3000/design/outline`.

      1. A rotate icon sits in the upper-right corner **inside** the viewer panel's content
         card, over the drawing — not in a row above it, not beside the VIEWER tab.
      2. Click it. The board turns so the **nose points left**, and it turns *inside the panel
         it already occupied* — the nav, the sidebar, the panel's own size and position, and
         everything else on the page are exactly where they were.
      3. **The high-risk check:** turn on the construction overlay in the sidebar, then drag a
         control point while horizontal. The point must follow the pointer and the sliders must
         move with it, the same way they do vertically. If it moves along the wrong axis or
         jumps, the drag matrix is coming off the wrong element.
      4. Click the button again — the board returns to vertical, nose up, and the icon is the
         same glyph it was (only the tooltip/label changed).
      5. Reload the page. It comes back **vertical**.
      6. The button is legible and hoverable in a light theme (Daylight or Chalk) and a dark
         theme (Slate or Phosphor).
    </human-check>
  </verify>
  <done>
    `OutlineViewer` takes an `orientation` prop defaulting to `"vertical"`; in `"horizontal"` a
    single content group carries `rotate(-90)` and the viewBox and fit-scale dimensions swap to
    match, while every projector, call site and vertical viewBox expression is untouched; the
    drag matrix is read from that group so dragging works in both orientations; the Template
    screen has a rotate button in the panel's upper-right corner driving React state that
    resets on reload; `tsc`, `lint` and all ~670 tests pass; nothing outside the three files
    is modified.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Keep every callout upright when the drawing turns</name>
  <files>components/viewer/callout-primitives.tsx, components/outline/outline-viewer.tsx</files>
  <read_first>
    - `components/viewer/callout-primitives.tsx` — `CalloutChip` and `OutputRail` in full, plus
      the `CalloutSizes` fields they read (`chipW`, `chipH`, `stackNameDy`, `stackValueDy`,
      `name`, `value`) and `CALLOUT_VALUE_GAP`.
    - `components/outline/outline-viewer.tsx` — the `lengthChipY` / `widepointChipY` /
      `wpOffsetChipY` / `tailBlockChipY` block, the `calloutSizes` line near the end of the
      component body, and the four `<CalloutChip>` / three `<OutputRail>` call sites.
    - The "Why counter-rotating about the anchor works" paragraph in `<already_researched>`
      above — the sign conventions below all follow from it.
  </read_first>
  <action>
    **1. `components/viewer/callout-primitives.tsx` — an upright wrapper, used twice.**

    Add a small internal component (not exported — the two primitives in this file are the only
    callers, which is the whole reason this is two edits and not forty):

    ```tsx
    function UprightAt({ x, y, children }: { x: number; y: number; children: ReactNode }) {
      if (useViewerOrientation() !== "horizontal") return <>{children}</>;
      return <g transform={`rotate(90 ${x} ${y})`}>{children}</g>;
    }
    ```

    (Hoist the hook call to a `const` above the early return if the lint rules object to a
    conditional-looking hook; the call itself is unconditional either way.) Import
    `type ReactNode` from React.

    Comment what it does and why the numbers work out: it exactly undoes the viewer's rotation
    about the callout's own anchor, so the content draws screen-upright and unscaled while its
    anchor still lands wherever the rotated drawing puts it. In vertical it renders a fragment
    — no element, no transform — so every existing viewer's output is unchanged.

    **2. `CalloutChip` — hang the chip off the rail the gutter has become.**

    The leader stays where it is, **outside** the wrapper: it is drawn in canonical coordinates
    and must turn with the board, which is what keeps it attached to the feature it points at.
    Rotated, the horizontal leader reads as a vertical one running up from the chip to the
    board edge, which is correct.

    Only the `rect` and the two `text` elements go inside `UprightAt`, and their placement
    relative to the anchor changes:

    ```tsx
    const horizontal = useViewerOrientation() === "horizontal";
    const rectX = horizontal ? x - sizes.chipW / 2 : x - sizes.chipW;
    const rectY = horizontal ? y : y - sizes.chipH / 2;
    const centerX = horizontal ? x : x - sizes.chipW / 2;
    const centerY = horizontal ? y + sizes.chipH / 2 : y;
    ```

    with the two text baselines becoming `centerY + sizes.stackNameDy` and
    `centerY + sizes.stackValueDy`. In vertical `centerY` is `y`, so both are the values they
    are today.

    Record the reasoning in a comment: vertical puts the chip's **right edge** on the anchor,
    centred on the station; rotated, the left gutter has become the **bottom rail**, so the
    chip hangs straight **down** from the anchor and is centred on the station across. Down is
    correct because `+y` in the upright frame is screen-down, which is away from the board.

    **3. `OutputRail` — stack the readout above the rail.**

    The extension line and the `DimensionTick` stay outside the wrapper and unchanged. A 45°
    drafting tick is still a 45° drafting tick when the drawing turns — note that as
    deliberate, so it does not look like an oversight.

    Both `text` elements go inside `UprightAt` anchored at `(valueX, y)`, and in horizontal
    they become centred and stack **upward** from the anchor:

    ```tsx
    <text x={valueX} y={horizontal ? y - sizes.name * 1.15 : y - 2}
          textAnchor={horizontal ? "middle" : undefined} …>{value}</text>
    <text x={valueX} y={horizontal ? y : y + sizes.name}
          textAnchor={horizontal ? "middle" : undefined} …>{station}</text>
    ```

    `undefined` means React omits the attribute, so the vertical output is unchanged — do not
    write `"start"`, which would add one. Comment why: in vertical the two lines straddle the
    extension line, value above and station name below; rotated, the line runs vertically and
    cannot be straddled, so both lines sit above its far end (the line already stops
    `CALLOUT_VALUE_GAP` short of the anchor, which supplies the gap) in the same reading order,
    value over name, centred on the station.

    Leave every other attribute on both texts exactly as it is.

    **4. `components/outline/outline-viewer.tsx` — regroup the WP Offset chip.**

    WP Offset carries no leader and is grouped with Widepoint (sketch 004). In vertical it sits
    directly beneath it in the same gutter column. Rotated, that column is the bottom rail
    running along the station axis, so stepping "along" it would land the chip on top of the
    Widepoint chip — chips are `chipW` wide across that axis and the current step is a chip
    *height*. Move it one row further **out** from the board instead, at the same station,
    which is the honest reading of "directly beneath":

    ```ts
    const wpOffsetChipX = horizontal
      ? frame.chipRightX - calloutSizes.chipH - CHIP_STACK_GAP
      : frame.chipRightX;
    const wpOffsetChipY = horizontal
      ? widepointChipY
      : widepointChipY + OUTLINE_CHIP_HEIGHT + CHIP_STACK_GAP;
    ```

    and pass `x={wpOffsetChipX}` at that call site in place of `frame.chipRightX`.

    These two declarations read `calloutSizes`, which is computed near the end of the component
    body — **move both declarations to just below the `calloutSizes` line**. They are used only
    in the returned JSX, so the move is safe; do not move `calloutSizes` itself, which depends
    on `fitScale`.

    In vertical, `wpOffsetChipX` is `frame.chipRightX` and `wpOffsetChipY` is the expression it
    is today, so nothing about the default rendering changes.

    Do not adjust `OUTLINE_CHIP_RIGHT_X`, `OUTLINE_OUTPUT_VALUE_X` or `OUTLINE_GUTTER_GAP` —
    those are the canonical rails and are shared with the fin viewer. If the rotated top/bottom
    rails turn out to carry slack worth reclaiming, that is a separate quick task, not this one.
  </action>
  <verify>
    <automated>

```bash
set -u
V=components/outline/outline-viewer.tsx
P=components/viewer/callout-primitives.tsx
fail() { echo "FAIL: $1"; exit 1; }

# --- the counter-rotation exists and is anchored ------------------------------
grep -qF 'rotate(90 ${x} ${y})' "$P" || fail "callouts do not counter-rotate about their anchor"
grep -q  'function UprightAt' "$P"   || fail "upright wrapper missing"

# --- the leader and the extension line stay OUTSIDE it ------------------------
grep -qF '<line x1={x} y1={y} x2={leaderToX} y2={y}' "$P"  || fail "chip leader was altered; it must turn with the board"
grep -qF '<line x1={edgeX} y1={y} x2={reachX} y2={y}' "$P" || fail "output extension line was altered"

# --- vertical placement is byte-identical -------------------------------------
grep -qF 'horizontal ? x - sizes.chipW / 2 : x - sizes.chipW' "$P" || fail "chip rect x not orientation-aware"
grep -qF 'horizontal ? y : y - sizes.chipH / 2' "$P"               || fail "chip rect y not orientation-aware"
grep -qF 'horizontal ? y - sizes.name * 1.15 : y - 2' "$P"         || fail "output value baseline not orientation-aware"
grep -qF 'horizontal ? y : y + sizes.name' "$P"                    || fail "output station baseline not orientation-aware"
grep -qF 'horizontal ? "middle" : undefined' "$P"                  || fail "output text anchor must be omitted in vertical"
grep -qF 'textAnchor="start"' "$P" && fail "an explicit start anchor changes the vertical output"

# --- the WP Offset regroup ------------------------------------------------------
grep -qF 'frame.chipRightX - calloutSizes.chipH - CHIP_STACK_GAP' "$V" || fail "WP Offset does not move to a second rail row when rotated"
grep -qF 'x={wpOffsetChipX}' "$V"                                      || fail "WP Offset chip is not using its own x"

# --- the shared rails are untouched --------------------------------------------
grep -qF 'export const OUTLINE_CHIP_RIGHT_X = 58;' "$P"    || fail "a canonical rail constant changed"
grep -qF 'export const OUTLINE_OUTPUT_VALUE_X = 282;' "$P" || fail "a canonical rail constant changed"
grep -qF 'export const OUTLINE_GUTTER_GAP = 36.5;' "$P"    || fail "a canonical rail constant changed"

# --- blast radius ----------------------------------------------------------------
if git diff --name-only | grep -vE '^(components/outline/outline-viewer\.tsx|components/outline/outline-editor\.tsx|components/viewer/callout-primitives\.tsx|\.planning/)' | grep -q .; then
  git diff --name-only; fail "files outside the three-file scope were modified"
fi

npx tsc --noEmit || fail "tsc"
npm run lint     || fail "lint"
npm test         || fail "vitest"
npm run build    || fail "build"
echo PASS
```
    </automated>
    <human-check>
      **For the ORCHESTRATOR, in a browser. The executor must not drive a browser.**

      `npm run dev`, then work through these. The production build goes to `.next` and the dev
      server to `.next/dev`, so a running dev server does not conflict with `npm run build`.

      **A — the Template screen, `http://localhost:3000/design/outline`**

      1. Vertical (the default): the drawing looks **exactly** as it did before this change —
         chips in the left gutter, the output rail on the right, all text upright, leaders
         attached.
      2. Rotate. Every callout is **upright and left-to-right**, and every chip box is still
         wider than it is tall — no text on its side, no tall thin boxes.
      3. The input chips (LENGTH, WIDEPOINT, WP OFFSET, and TAIL BLOCK on a squash/diamond/
         swallow tail) now form a rail **below** the board; each leader runs up from its chip to
         the feature it names. WP OFFSET sits directly below WIDEPOINT, not overlapping it.
      4. The three outputs (Nose @ 12", Centre, Tail @ 12") form a rail **above** the board,
         each centred over its own station, none overlapping a neighbour.
      5. Nothing is clipped at either end — check the LENGTH chip at the nose and the TAIL
         BLOCK chip at the tail specifically, and check them again on the widest and the
         shortest board the sliders allow.
      6. Drag a control point again, horizontally, and confirm it still tracks.
      7. Both orientations in a light theme and a dark theme.

      **B — the consumers that must NOT have changed**

      8. The setup screen's preset cards: thumbnails identical to before.
      9. The Summary / order form: the template windows render **vertical**, and
         `Cmd-P` print preview is vertical. Rotate the Template screen first, then navigate to
         Summary — it must still be vertical, because the prop was never passed (D-04).
      10. The Rails and Fins screens have **no** rotate button (D-01).

      **Observation, not a defect (do not fix in this task).** Rotated, the top and bottom rails
      carry roughly 200 units of slack across the short axis, which costs some drawing scale.
      Sketch 005 hit the same thing and shrank its gutters. If it looks worth reclaiming, raise
      it as its own quick task.
    </human-check>
  </verify>
  <done>
    `CalloutChip` and `OutputRail` counter-rotate their box and text about their own anchors so
    every callout reads upright in horizontal, while their leaders and extension lines still
    turn with the board and stay attached; the WP Offset chip regroups onto a second rail row
    instead of colliding with Widepoint; the vertical output of both primitives is byte-
    identical (no added attributes, no added elements); `tsc`, `lint`, all ~670 tests and
    `npm run build` pass.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| user → client React state | A click toggles a two-value union held in `useState`. No text input, no free-form value, nothing parsed. |
| app data → SVG DOM | Board geometry (already in memory, already trusted) becomes numeric JSX attributes. No new boundary is crossed by this change. |

No network call, no server component, no persistence, no third-party input, and no
package-manager install is introduced by this plan. The package legitimacy gate therefore does
not apply.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-VOT-01 | Tampering | `outline-viewer.tsx` SVG output | low | mitigate | The file's existing rule is preserved verbatim: all SVG geometry is rendered through JSX attributes holding numbers from `lib/geometry` — never string-built markup, never `dangerouslySetInnerHTML`, no `document.write`/`window.open`. The rotation is a static `transform` string chosen from a two-value union, never interpolated from data. |
| T-VOT-02 | Tampering | `RotateBoardIcon` `<defs>` id | low | mitigate | SVG ids are document-global, so a literal id could be captured by another element's `<use href>` on the same page. The id comes from `useId()`, sanitised to `[A-Za-z0-9-]` so it is a valid URL fragment. Gated by a grep in Task 1. |
| T-VOT-03 | Information disclosure | print / Summary path | low | mitigate | Rotation is a prop with a vertical default that only the Template screen sets, so the Summary sheet and the full-size template export cannot observe it (D-04). Enforced by construction, plus browser checks A/9 and the `orientation = "vertical"` grep. |
| T-VOT-04 | Denial of service | `useSvgFitScale` ↔ frame sizing | medium | mitigate | Sizing the horizontal end pad from `calloutSizes` would make the viewBox depend on the fit scale which depends on the viewBox — a resize loop. `HORIZONTAL_END_PAD` is therefore a module constant derived from `CALLOUT_PX.chipW / MIN_PINNED_FIT_SCALE`, with no render-time feedback. |
| T-VOT-SC | Tampering | npm/pip/cargo installs | n/a | accept | No packages are installed by this plan; the scope boundary forbids it and the blast-radius grep would catch a lockfile change. |
</threat_model>

<verification>
Run from the repo root after both tasks:

```bash
npx tsc --noEmit
npm run lint
npm test        # ~670 tests, all under lib/
npm run build
```

Plus the two `<human-check>` blocks above, run by the orchestrator in a browser. The drag check
(Task 1, item 3) and the "Summary is still vertical" check (Task 2, item 9) are the two that
cannot be replaced by anything automated — do not skip them.
</verification>

<success_criteria>
- A rotate button sits inside the Template viewer panel's content area, upper-right, absolutely
  positioned over the drawing (D-06); `components/viewer/tabbed-panel.tsx` is unmodified.
- Clicking it turns the board 90° nose-left inside the panel it already occupies, with the page
  layout unmoved; clicking again returns it to vertical (D-02, D-05).
- Dragging a construction control point works identically in both orientations.
- Every callout reads upright with correctly-shaped chips in both orientations, and every
  leader stays attached to the feature it measures.
- A reload comes back vertical; no browser storage, URL parameter or settings entry exists
  (D-03).
- Rails, Fins and Summary have no button (D-01); Summary and the print path render vertical
  because they never pass the prop (D-04).
- Preset-card thumbnails and the order form's template windows are visually unchanged.
- `tsc`, `lint`, all tests and `npm run build` pass; exactly three source files are modified.
</success_criteria>

<output>
Create `.planning/quick/260825-vot-template-viewer-rotate/260825-vot-SUMMARY.md` when done.

Note for the executor: this repo has been bitten before by a SUMMARY written into a worktree
instead of the main tree — write it to the path above, in the working tree you are executing
in, and confirm it is there before reporting complete.
</output>
