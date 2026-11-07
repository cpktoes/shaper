# 16-17 — Brief for the researcher and the planner: toolbar icons for the switches, and real fin shapes (D-35)

Written by the orchestrator on 2026-11-04 at the founder's asks during the Wave 8–9 looks. 16-17 runs in its own
wave after 16-16 and before go-live 2 (16-13).

## The founder's words

- "Move the fins and blank checkboxes to icons in the viewer. We already have a good fin icon. Also, the fins look
  really dumb. Quad rears should be 25% shorter than the fronts. The shape should be more realistic; do some research
  to find basic surfboard fin shapes for each of the fin setups."
- On Contour Stripes: "An icon too" — the panel's SHOW section goes.

## Locked facts (verified in the session)

- F1. The 3D panel today (16-10, 16-11): HARD EDGE (two sliders, D-30) → SHOW (Fins, Blank, Contour Stripes tick
  boxes; the Blank row dimmed with its reason on a hand-set board; Contour Stripes' hint line) → VIEW (five views,
  Reset View) → EXPORT (16-12, running now). The three switches are screen state, not saved (D-17), `data-lock-exempt`.
- F2. The viewer's corner toolbar (16-09): Wide view and the zoom row (zoom out, level, zoom in, Back to 1x) top right
  over the drawing, in the viewers' grammar — `components/viewer/` toolbar buttons; `toolbar-button.test.ts` counts
  `<ViewerToolbarButton` per editor, so a new control lives in its own module (quick 261007-fnz lesson); 22-dot strip
  / 44-dot touch boxes on a coarse pointer; on a phone the corner icons pack tight (`viewer-toolbar.spec.ts`).
- F3. TEMPLATE's fin-placement toolbar button has the fin icon the founder means (`e2e/template-toolbar.spec.ts`,
  "desktop: fin placement starts off; the button shows and hides the fin marks") — reuse that icon for Fins; the Blank
  icon can follow ROCKER's top-view / blank glyphs; Contour Stripes needs a glyph (stripes).
- F4. The fins (16-10, `lib/geometry/fin-outline.ts`, `placedFins`): one plain generic outline per role — base along
  the bottom, a convex leading cubic to the tip, a gently concave trailing cubic, a filleted tip; single depth = the
  board's length in feet read as inches, base 0.70 × depth centred in the 10.5" box; twin 5.0" (upright tip 0.75"
  behind the trailing edge, keel tip above it), thruster 4.5", quad fronts 4.5" / rears 4.25", 2+1 centre by the
  single's rule; bases always FINS' values; upright, no cant, root 1 mm into the foam, 1/4" thick (3/8" single),
  rounded edges; never in the CNC files (D-16). The founder: "the fins look really dumb".
- F5. The scene (`components/3d/board-scene.ts`) draws the fins as a group under lighting B; the founder keeps them
  plain dark (16-10's look).

## What the researcher gathers (16-17-RESEARCH.md, with sources)

For each setup, a basic real-world fin shape as a parametrised outline (base along the board, depth, sweep/rake
angle or the tip's set-back from the leading edge's root, the leading edge's curve, the trailing edge's curve, the tip's
width and radius; thickness and foil are not needed) from published templates and maker pages (FCS, Futures, True
Ames, Captain Fin, Greenlight, Shapers Australia's fin guides, etc.):
1. Longboard single: a classic raked single / pivot fin and a D-fin — pick the one basic shape for a single and the
   2+1's centre; depth per D-22 (the board's length in feet as inches), base from FINS (0.70 × depth today — keep or
   take the template's ratio; say which).
2. Twin: a fish keel (long base, low, raked) and an upright twin (performance twin); both from FINS' base.
3. Thruster: a standard side fin (with its sweep) and the centre fin (symmetrical foil, same template or slightly
   smaller); the 4.5" depth as today unless the templates say otherwise for FINS' bases.
4. Quad: fronts as the thruster's sides; rears 25% shorter (the founder's rule: depth 0.75 × the fronts') with their
   own shorter base from FINS and a more upright, smaller outline.
5. 2+1: the centre as the single (shorter), the side bites (small, upright).
Give the outline as numbers the planner can test: base b, depth d, tip set-back s (tip x from the leading-edge root),
tip width w, and control points for two cubics (leading and trailing edges) in the (b, d) frame, per role, each with its
source. Note which shapes are symmetrical (centre fins) and which are foiled one side (not drawn).

## What the planner settles

1. The outlines in `fin-outline.ts`: one function per role from the researched numbers, parametrised by FINS' base
   and the role's depth, with tests pinning the shapes (area, tip position, sweep) and the quad rule (rears 0.75 × the
   fronts' depth); every preset's fins table in the SUMMARY; pictures of every setup before/after.
2. The toolbar: three toggle buttons (Fins, Blank, Contour Stripes) in the 3D viewer's corner toolbar beside Wide view
   and the zoom row — own module(s), pressed state (`aria-pressed`), spoken names from `THREE_D_COPY`, the Blank button
   dimmed with its reason as a tooltip/`aria-description` on a hand-set board (the hint text moves), the phone's packing
   rule, the lock-exempt rule; the panel's SHOW section removed (HARD EDGE → VIEW → EXPORT); the 3D desktop picture
   re-recorded on a proven diff (the panel changes); the specs (three-d-show, viewer-toolbar's 3D case if any,
   board-lock-screens' 3D greying) updated.
3. Pictures for the founder's look: the toolbar on a computer and a phone; the fins per setup from below-and-aside,
   Side and Bottom; the quad's rears against its fronts.

## Shape

Three tasks like the siblings (tracer; auto/tdd; the founder's blocking look), `autonomous: false`, wave = 16-16's
+ 1, `depends_on: ["16-16", "16-12"]`, PW_PORT=3217, no database change; 16-13 (go-live 2) moves one wave later and
depends on 16-17.
