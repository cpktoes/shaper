# Phase 16, plan 16-17: Basic surfboard fin shapes per setup for the 3D board (D-35): Research

**Researched:** 2026-11-04
**Domain:** Fin outlines (planform only: base, depth, sweep, edge curves and tip) for every role FINS places, turned into
pure, testable outline maths for `lib/geometry/fin-outline.ts`
**Confidence:** MEDIUM overall. The maker figures come from the makers' own product data, and the outlines were traced
from the makers' photographs and checked against those figures. Retailer-only figures are marked as such, and the
choices that need the founder are listed at the end.

<user_constraints>
## User Constraints (from 16-CONTEXT.md and 16-17-BRIEF.md)

### Locked Decisions
- **D-35** (verbatim): "**The Fins, Blank and Contour Stripes switches become icons in the viewer's corner toolbar, and
  the fins get real shapes.** The founder, 2026-11-04, at the Wave 8–9 looks: "Move the fins and blank checkboxes to
  icons in the viewer. We already have a good fin icon. Also, the fins look really dumb. Quad rears should be 25%
  shorter than the fronts. The shape should be more realistic; do some research to find basic surfboard fin shapes for
  each of the fin setups." […] The fins: the quad's rears 25% shorter (shallower) than its fronts; every role's
  outline drawn from researched basic fin shapes — a longboard single (a raked pivot/D-fin family), a fish keel and an
  upright twin, a thruster's sides and centre, a quad's fronts and rears, a 2+1's centre and side bites — each
  parametrised by FINS' base and the role's depth, with sweep, leading-edge curve and tip shape taken from published
  templates; a researcher gathers the shapes with sources first (16-17-RESEARCH.md), the planner measures them in a
  scratch copy. Amends D-21/D-25 (the one plain generic outline; the quad rears at 4.25"); D-16 unchanged (never in the
  files)."
- **D-21** (the founder's words, verbatim): "Fin bases should be true and just scale the base, don't shrink the whole
  fin. All fins should be super basic and generic." The decision text adds: "Each fin's base is exactly FINS' base
  length for that fin, and a smaller fin is made by scaling its base only — depth and outline character stay; never
  the whole fin shrunk uniformly. No maker's foil or named template."
- **D-22** (verbatim): "For single fins, let's use a fin size that equal the length of the board in feet, in inches (i.e.
  a 9ft board = 9" fin, an 7'6" board = 7.5" fin)". Depth is base to tip, the way single fins are sold.
- **D-25** (figures still standing where D-35 does not amend them): single base 0.70 × depth, centred in the 10.5" box,
  and the 2+1's centre on the same rule; twin 5.0" deep; every base except a single's is FINS' own, a default keel's
  4.5" included (K5); thruster 4.5"; quad fronts 4.5"; upright, no cant, root sunk about 1 mm; 1/4" thick (3/8" for a
  single), rounded edges; never in the files (D-16). *The quad rears' 4.25" depth is amended by D-35 to 0.75 × the
  fronts' depth.*
- **Brief F4/F5:** today one plain outline per role (`placedFins`), plain dark fins under lighting B, kept.
- **Brief, "what the researcher gathers"**: for each role give base b, depth d, the tip's set-back s (tip x from the
  leading-edge root), the tip width w, and control points for the leading and trailing cubics in the (b, d) frame, each
  with its source. Say which fins are symmetrical and which are foiled one side.

### Claude's Discretion (this research)
- Which published fins to use as references for each role, how the outlines are represented, and the recommendations
  below. Every one is put to the planner or the founder in "What the planner must settle".

### Deferred Ideas (OUT OF SCOPE)
- Foils and thickness profiles (the 3D draws a 1/4" slab, 3/8" for a single, with rounded edges, D-25), cant, FINS'
  own figures or defaults (a FINS change is a different phase), fins in the CNC files (D-16), and the toolbar half of
  D-35. The toolbar is planned straight from the brief, so this document doesn't cover it.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| D-35 (fins) | Real, basic fin shapes per role, quad rears 25% shorter, each parametrised by FINS' base and the role's depth | §1–§9 (one outline per role with sources), §10 (the base rule), §11 (every preset drawn), §13 (tests) |
| D-22 | Single depth = board length in feet, as inches | §5 (kept; base 0.70 × depth confirmed by FCS's and Futures' own size tables) |
| D-21 / D-25 | Base true to FINS; "just scale the base" | §10 (Rule A: stretch along the base, which is the literal reading of the founder's words) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Rule 1:** all the fin maths stays in `lib/geometry/` and stays pure (no React, browser, three or database
  imports), and every exported function gets unit tests. The outline constants here are design inputs, the same kind of
  thing as today's `FIN_ROLE_SHAPES`, not prototype figures, so there is no golden fixture to regenerate. The tests
  should pin relations that hold for any figures (area = fill × B × D, tip at (s·B, D), sweep, no crossings), and pin
  the per-role fills this research measured, within a tolerance.
- **Rule 2:** every inch figure is converted once with `inchesToMm` (`lib/geometry/units.ts:30`). Don't use a bare 25.4.
- **Audience:** the founder's look and every summary describe the fins in plain English, as the shape a shaper sees.
- **GSD:** this file is the research artefact for 16-17. No code changes are made here.
- **AGENTS.md:** this research touches no Next.js API.

### In-repo values this research relies on (read this session, quoted verbatim)
- `lib/geometry/fin-outline.ts:47`: `export type FinOutlineRole = "single" | "twinUpright" | "twinKeel" | "thruster" | "quadRear";`
- `lib/geometry/fin-outline.ts:69-72`: `twinUpright: { depthIn: 5, tipBehindIn: 0.75, tipRadiusIn: 0.5, thicknessIn: 0.25 },`
  · `twinKeel: { depthIn: 5, tipBehindIn: 0, tipRadiusIn: 0.5, thicknessIn: 0.25 },` · `thruster: { depthIn: 4.5, tipBehindIn: 0.75, tipRadiusIn: 0.35, thicknessIn: 0.25 },`
  · `quadRear: { depthIn: 4.25, tipBehindIn: 0.75, tipRadiusIn: 0.35, thicknessIn: 0.25 },`
- `lib/geometry/fin-outline.ts:79`: `export const FIN_SINGLE_SHAPE = { baseOfDepth: 0.7, tipBehindOfDepth: 0.15, tipRadiusIn: 0.5, thicknessIn: 0.375 } as const;`
- `lib/geometry/fin-outline.ts:87`: `export const FIN_CUBIC_SAMPLES = 24;` · `:88`: `export const FIN_TIP_ARC_SAMPLES = 8;` · `:93`: `export const FIN_ROOT_SINK: Mm = mm(1);`
- `lib/geometry/fin-outline.ts:96-98`: `export interface FinOutlinePoint {` / `u: number;` / `v: number;`
- `lib/geometry/fins.ts:78`: `export type FinSetup = "single" | "twin" | "thruster" | "2plus1" | "quad";` · `:81`: `export type TwinTemplate = "upright" | "keel" | "trailer";` · `:83`: `export type FinRole = "front" | "rear" | "center";`
- `lib/geometry/fins.ts:894`: `const mainOffTailBase = spec.twinTemplate === "keel" ? 6.25 : spec.twinTemplate === "trailer" ? 10 : 7.5;`
- `lib/geometry/fins.ts:1473`: `return inchesToMm(setup === "single" || setup === "2plus1" ? 10.5 : 4.5);` (the centre's default base)
- `lib/geometry/fins.ts:1479`, `:1481` (`resetAdvanced`): `baseLenForward: inchesToMm(4.5),` · `baseLenRear: inchesToMm(4.5),`
- `lib/geometry/fins.ts:1260`: "Twin — Modern/Upright: off-tail 7–8" (default 7.5"), base ≈5–5.5"; …" · `:1268`: "The center
  trailer sits at 4" off-tail — a smaller anchor fin than a thruster center, not scaled by length."
- 2+1 side bites take `baseLenIn: adv.baseLenForward` (`fins.ts`, the `isTwoPlusOne` block, two `role: "front"` marks).

## Summary

The fins look "dumb" today for two reasons, and both can be measured. First, every role uses one invented outline,
with a tip 0.75" behind the trailing edge and a fillet circle, so every fin reads as the same blob. Second, the quad's
rears and the keel don't look like their real counterparts. Real fins are much more alike than they look. A thruster
side fin, an upright twin, a quad front, a quad rear and a side bite are all the same basic shape in their own frame:
the base about as long as the fin is deep, the highest point 1.1–1.26 base-lengths from the leading edge's root, a
rounded tip that hooks back to its rearmost point at 83–89% of the depth, and a trailing edge that drops almost
straight to the base. What sets them apart is depth, base and sweep. Three shapes really are different: the
longboard single (a long, narrow, raked tip), the fish keel (long and low, and the Futures-box kind is *cut away*
behind its root), and the D-fin (almost no sweep, a straight back edge).

I traced 15 maker photographs, all side-on studio shots on white, and checked the traces against the makers'
published base, depth, area and sweep. FCS's sweep figure is the angle from a line straight up from the middle of the
base to the fin's highest point. My traces reproduce FCS's published sweeps to within 0.4–0.6° on three fins and
their base-to-depth ratios to within 0.6–3.6%. Each outline then fits **three cubic Béziers** (leading edge, tip,
trailing edge, joined smoothly) to within 0.3–0.6% of the depth on average (worst point 1.0–2.3%). The Futures-box
keel needs a fourth cubic for its cutaway. One generic outline per role, fitted to all of that role's references at
once, sits within 1–2.5% of the depth of each reference on average (worst point 2–6%), which is the real spread
between makers.

Two findings change the plan. **(1)** FINS' default keel base of 4.5" is correct for a real box keel. On a
Futures-box keel such as the Hobie Fish, the fin touches the board only along its 4.6" root, about 0.90 of its depth,
and its body runs back about another 1.5 bases over a cut-away heel. The makers' listed "base" of 6.2–7.1" is that
longer body, not the root. So a cutaway keel drawn on FINS' 4.5" root at the 5.0" depth (0.90) is exactly the Hobie
Fish's proportion, and the K5 problem (a default keel that "looks like an upright fin") goes away without touching
FINS. **(2)** The founder's 25% shorter rears are at the small end of real quad sets: the rear-to-front depth ratio
across 9 sets runs 0.65–0.94, with a median of 0.85, and True Ames' retro sets sit at 0.77–0.80. Real rears keep a
base about equal to their depth. FINS' rear bases (4.0" on the Mid-length, 4.5" after Reset) are 18–33% longer than
that at a 3.375" depth, so the rears draw long and low unless they get the more upright outline proposed here.

**Primary recommendation:** replace the single generic outline and its fillet-circle solver with one all-Bézier
template per role in the (u/b, v/d) frame. Draw each one by stretching it to FINS' base B and the role's depth D
(every control point (x, y) becomes (x·B, y·D), Rule A, §10). Use: the side-fin template for thruster sides, thruster
centre, quad fronts and the quad's fifth fin; its twin variant for upright twins at 5.0"; the cutaway keel at 5.0";
the small upright template for quad rears at 0.75 × the fronts' depth, for 2+1 side bites at 3.5" and for the
trailer; and the raked longboard single at the board's length in feet, on a base of 0.70 × depth.

## How every number here was produced

1. **Maker figures.** Base, depth, area and sweep came from each maker's own product data where it publishes them:
   FCS's spec tables, read from `surffcs.com/products/<handle>.json`, and True Ames' product text, read from
   `trueames.com/products.json`. Where only retailers list a fin (evo, Cleanline, Surfboard Empire), the figure is
   marked as a retailer figure. Fill is area ÷ (base × depth); sweep is the maker's own figure.
2. **Tracing.** Each maker's product photo (side-on, white background) was converted to an uncompressed bitmap with
   macOS `sips`. A pure-Python tracer took the fin's silhouette (any pixel not near-white), picked the largest region,
   and read the leading and trailing edge on every row. The root row and the root's two ends (where the fin meets
   the board, above the tab or plate) were picked by hand from a row-by-row profile. The tracer normalised to the root
   b and the depth d, and sampled both edges every 0.02 d. It measured fill, sweep (FCS's definition: base midpoint to
   the highest point), the tip's set-back s, and the rearmost point (m, h).
3. **Calibration against published figures** (the tracing's error):

   | Fin (photo) | Published (maker) | Traced | Error |
   |---|---|---|---|
   | FCS II Performer L | b/d 0.959, sweep 33.7°, fill 0.745 | 0.965, 34.1°, 0.774 | +0.6%, +0.4°, +3.9% |
   | FCS II Mark Richards twin (side) | b/d 0.910, 32.1°, fill 0.749 | 0.917, 32.7°, 0.758 | +0.8%, +0.6°, +1.2% |
   | FCS II Modern Keel M/L | b/d 1.165, 32.8°, fill 0.711 | 1.207, 33.2°, 0.722 | +3.6%, +0.4°, +1.5% |
   | FCS II Connect 9" (longboard) | b/d 0.712, 33.7°, fill 0.687 | 0.672, 31.5°, 0.689 | −5.6%, −2.2°, +0.3% |
   | True Ames Tyler Warren quad, front (scaled from its 4.69" height) | base 4.54", area 15.96 in² | 4.43", 15.69 in² | −2.4%, −1.6% |
   | same photo, rear (same scale) | depth 3.62", area 10.70 in² | 3.57", 10.40 in² | −1.4%, −2.7% |
   | True Ames side bite 3.25 (scaled from its height) | base 3.38", area 8.38 in² | 3.32", 8.37 in² | −2%, −0.1% |
   | True Ames Hobie Fish keel (scaled from its 5.14" height) | area 25.02 in² | 24.85 in² | −0.7% |

   Base-to-depth ratios are good to about ±4% (one photo, the Connect, to 6%), sweeps to about ±0.6° (the Connect to
   2.2°), and areas to −3%/+4%. The Connect's photo is the one outlier: its base runs into a moulded plate, so the root
   ends are uncertain.
4. **Fitting.** A Nelder–Mead fit (pure Python) placed three cubics on each trace (§0 below). The error is the
   horizontal distance between fit and trace, in units of depth, at 0.03 d–0.90 d, and the nearest distance in the
   tip region. Generic per-role outlines were then fitted jointly to all of that role's traces, each judged at its own
   b/d, and rounded to two decimals.
5. **Presets.** §11's table applies the rounded outlines to FINS' figures (16-10-SUMMARY's table of every preset's
   fins). Fills, sweeps and areas there come from the same shoelace and angle formulas the tests should use.

The scripts and downloaded pages live only in this session's scratchpad. They are not committed (the BRIEF's
one-file rule), so the planner re-measures the constants below in their own scratch copy, as D-35 asks.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Per-role outline templates and the stretch to (B, D) | `lib/geometry/fin-outline.ts` (pure maths) | — | Rule 1: the fin geometry is maths, testable without the scene |
| Which role and depth each FINS mark gets (`finOutlineRole`, `finRoleDepth`) | `lib/geometry/fin-outline.ts` | `lib/geometry/fins.ts` (read-only: marks, bases) | FINS' placement is unchanged; only the outline per role changes |
| Extruding the outline to a 1/4" slab, rounded edges, placement | `components/3d/board-scene.ts` (`finSolid`) | — | Already consumes `outline.points` as a closed shape. A concave outline (the keel's cutaway) is fine for its `ExtrudeGeometry` |
| SUMMARY's fins table, pictures | the plan's tasks | — | Planner's list (brief) |

## Standard Stack

No new library. Everything is cubic Bézier evaluation and polygon area in TypeScript, which the module already does
(`cubicAt`). Three.js `ExtrudeGeometry` (already used) triangulates concave shapes.

## Package Legitimacy Audit

No external packages are installed by this plan. **Packages removed:** none. **Packages flagged:** none.

---

## 0. The outline model every role uses

**Frame:** x = u/b along the root from the leading-edge root (x = 0) to the trailing-edge root (x = 1); y = v/d up
from the base (y = 1 is the depth). `[VERIFIED: traced this session]`

```
leading  L: (0,0) → L1 → L2=(s−a, 1) → P=(s, 1)       P = the highest point; arrives level (horizontal tangent)
tip      C: P → C1=(s+c1, 1) → C2=(m, h+c2) → Q=(m, h)  Q = the rearmost point; arrives vertical
trailing T: Q → T1=(m, h−e1) → T2 → (1, 0)              leaves Q vertical; T2 sets the angle it meets the base at
(keel only) the trailing edge stops at the heel H with a vertical tangent, and a fourth cubic E: H → (1,0) draws the cutaway
```

- The depth is exact by construction: the outline reaches y = 1 only at P (checked, and every proposed outline is a
  simple polygon with v ≥ 0, §12).
- The joins are smooth (G1): level at P, vertical at Q. The tip is the C cubic, with no fillet circle and no root
  solver.
- **s** is the brief's tip set-back as a fraction of b. The tip sits (s − 1)·b behind the trailing root.
  **Sweep (FCS definition) = atan((s − 0.5)·b/d).** The tip width **w** is the chord at 0.90 d and 0.95 d.
- Béziers are affine-invariant. Stretch every control point by (B, D) and the drawn fin is exactly the stretched
  curve, so its area is exactly fill × B × D and its sweep is atan((s − 0.5)·B/D). That is what makes §10's Rule A
  exact and trivially testable.

**Why three cubics, not two:** a single trailing cubic from P to the root has to round the tip, turn through the
rearmost point and come down concave. On the FCS Performer it couldn't get closer than rms 2.7% d with a 6.8% worst
point, and it pulled the tip 0.17 b off its real place (its fitted sweep was 27°, against 34° traced). With the tip as
its own cubic, the same fin fits to rms 0.32% d with a 1.3% worst point. `[VERIFIED: fit this session]`

**Per-reference fit quality (three cubics, fitted to that one trace):** `[VERIFIED: fit this session]`

| Trace | rms / worst (× d) | Trace | rms / worst (× d) |
|---|---|---|---|
| FCS Performer L | 0.32% / 1.3% | True Ames Greenough 4-A 9" | 0.60% / 2.3% |
| True Ames thruster L | 0.29% / 1.7% | FCS Connect 9" | 0.45% / 1.3% |
| TW quad front | 0.37% / 1.1% | True Ames TW pivot 10.25 | 0.39% / 2.0% |
| TW quad rear | 0.41% / 1.7% | True Ames D-2 (D-fin) | 0.35% / 1.4% |
| FCS Performer quad rear | 0.42% / 1.6% | True Ames Hobie Classic 7 | 0.54% / 1.9% |
| FCS MR twin | 0.26% / 1.1% | True Ames side bite 3.25 | 0.30% / 1.1% |
| FCS Modern Keel | 0.27% / 1.0% | True Ames Hobie Fish keel | 4.3% / 16% (3 cubics), **0.5% / 1.3–1.7% (4 cubics)** |

---

## 1. Thruster sides and centre, quad fronts, the quad's fifth fin: the side-fin template

**Reference fins.**
- FCS II Performer (FCS's own table): XS 4.13 / 4.30 / 13.26 in², S 4.25 / 4.43 / 14.03, M 4.37 / 4.55 / 14.81,
  L 4.48 / 4.67 / 15.58, XL 4.59 / 4.78 / 16.36 (base / depth / area), sweep 33.7° at every size. b/d is 0.96 at
  every size, so FCS scales the whole template between sizes. Fill (M) 0.745.
  `[CITED: surffcs.com/products/fcs-ii-performer-performance-core-tri-fin-set]`
- Futures F6 Alpha: sides and centre 4.56" high, 4.35" base, 15.12 in², the centre with a symmetrical foil (b/d
  0.954, fill 0.762). `[CITED: retailer listings: surfboardempire.com.au/products/f6qd24005pk, cleanlinesurf.com futures-fins-f6-alpha-tri-quad-fin-set]`
- Futures F4 Alpha: 4.37 / 4.22 / 14.22 (fill 0.771). `[CITED: retailer: cleanlinesurf.com futures-f4-alpha-tri-quad-fin-set]`
- True Ames thruster (TA Tri), "These 3 fins are all the same size". `[CITED: trueames.com products.json, ta-tri-futures-compatible]`
- A centre smaller than the sides exists, e.g. the Gabriel Medina PC centre at 4.25 / 4.43 against 4.37 / 4.55
  (0.97×). `[CITED: retailer: cleanlinesurf.com fcs-ii-gabriel-medina-pc-aircore-tri-fin-set]` But the standard sets
  (Performer, F6, TA Tri) are three alike.

**Traced:** Performer L (b/d 0.965, s 1.202, sweep 34.1°, rearmost 1.475 b at 0.85 d), TA Thruster L (1.005, 1.170,
33.9°), TW quad front (0.944, 1.264, 35.8°). `[VERIFIED: traced this session]`

**Proposed generic, `side`** (joint fit to the three traces, rounded): `[VERIFIED: fit this session]`

| Cubic | Control points (x = u/b, y = v/d) |
|---|---|
| leading | (0, 0) (0.07, 0.19) (0.61, 1) (1.21, 1) |
| tip | (1.21, 1) (1.31, 1) (1.48, 0.93) (1.48, 0.88) |
| trailing | (1.48, 0.88) (1.48, 0.73) (0.89, 0.70) (1, 0) |

At its template b/d of 0.97: fill 0.760; sweep 34.6°; s = 1.21 (tip 0.204 d behind the trailing root); rearmost
(1.48 b, 0.88 d); tip width 0.62 d at 0.90 d and 0.44 d at 0.95 d; radius of curvature 0.20 d at the top, 0.02 d at
the rearmost point. Against each trace it is within rms 1.4–2.2% d (worst 4.5–5.5% d), which is the real spread between
FCS, True Ames and the TW template. The fill of 0.760 sits between Performer (0.745) and F6 (0.762).

**Depth:** keep 4.5" (D-25). At FINS' 4.5" base, B/D = 1.00, only 1.03× the template: the drawn sweep is 35.4° and
the area 15.4 in², against 14.81 for a Performer M and 15.58 for an L. **The centre fin** gets the same outline and
depth (symmetrical foil, not drawn). **Quad fronts and the quad's fifth fin** get the same; Futures' F6 5-fin centre
is the sides' size.

## 2. Upright twin: the twin template

**Reference fins.**
- FCS II Mark Richards Twin + Stabiliser (FCS's own table): side 5.06 / 5.56 / 21.06 in², sweep 32.1°, flat foil;
  centre (stabiliser) 3.31 / 3.34 / 8.23 in², 29.1°, 50/50. b/d 0.910, fill 0.749.
  `[CITED: surffcs.com/products/fcs-ii-mark-richards-twin-stabiliser-fins]`
- FCS II MR Freeride twin L/XL: 5.08 / 6.09 / 22.84, 28.4°. `[CITED: retailer listing via WebSearch]`
- FINS' own note: "Twin — Modern/Upright: off-tail 7–8" (default 7.5"), base ≈5–5.5" …"
  `[VERIFIED: lib/geometry/fins.ts:1258-1261]`

**Traced:** MR twin side, b/d 0.917, s 1.201, sweep 32.7°, rearmost 1.449 b at 0.87 d. The MR twin is, in its own
frame, almost the thruster template (both have s ≈ 1.20). `[VERIFIED: traced this session]`

**Proposed generic, `twin`** (joint fit to the MR twin plus the two thruster traces, so it is the family's shape
rather than a copy of the MR): `[VERIFIED: fit this session]`

| Cubic | Control points |
|---|---|
| leading | (0, 0) (0.13, 0.28) (0.62, 1) (1.20, 1) |
| tip | (1.20, 1) (1.32, 1) (1.45, 0.94) (1.45, 0.86) |
| trailing | (1.45, 0.86) (1.45, 0.71) (0.86, 0.66) (1, 0) |

Template b/d 0.96: fill 0.758 (MR 0.749), sweep 33.9°, s 1.20 (0.192 d behind), rearmost (1.45, 0.86), w90 0.60 d,
w95 0.44 d. Against the MR trace: rms 1.1% d, worst 2.3% d.

**Depth:** keep D-25's 5.0". The Fish's base of 5.5" gives B/D = 1.10 (1.15× the template): drawn sweep 37.6°, the tip
1.10" behind the trailing root, area 20.9 in² against the MR side's 21.06. The template's own ratio would put the
depth at 5.5/0.96 = 5.7", an XL twin. Both are plausible; staying at 5.0" keeps the founder's figure (a question
below).

## 3. Fish keel: the cutaway keel template

**Reference fins** (listed "base" / height / area):
- True Ames Hobie Fish (Futures): 7.07 / 5.14 / 25.02 in², "our most popular keel template and an industry standard
  for pairing with classic fish surfboards". `[CITED: trueames.com products.json (description); figures via WebSearch of trueames.com/products/hobie-fish-futures-compatible]`
- FCS II Modern Keel M/L: 6.41 / 5.50 / 25.05 in², 32.8°, flat. `[CITED: surffcs.com/products/fcs-ii-modern-keel-twin-fins]`
- FCS FK-2: 7.01 / 4.49 / 22.78, 39.2°. `[CITED: retailer: evo.com fcs-fk-2-pc-fish-keel-twin-fin-set]`
- Futures Machado Keel 6.57 / 5.17 / 25.39, Futures K2 6.34 / 4.63 / 22.25, Futures Christenson Keel 6.50 / 4.91 /
  23.42 ("the most upright keel in the Futures line"). `[CITED: retailer listings via WebSearch]`
- Listed keel b/d therefore runs 1.27–1.56, which matches the brief's "long base, low, raked".

**The finding: on a box keel the listed base is not the root.** The Hobie Fish photo shows the fin touching the board
only along its Futures tab, 4.63" (452 px against a 5.14" depth of 502 px). Behind that, the trailing edge drops almost
vertically at about 1.51 b from 0.3 d down to 0.1 d, then cuts forward to the root at about 10–16° above the base. So
the fin's body hangs about 2.3" behind its root over a gap of up to about 0.1 d. The listed 7.07" is that body length
low down. The True Ames McCallum keel (Futures) has the same cut-away, with a straight raked back edge in place of the
Hobie's vertical drop (root b/d 0.948, s 1.602). FCS's FCS II Modern Keel, on two tabs, is flush instead: its body
meets the board along almost its whole listed base (traced b/d 1.207). `[VERIFIED: traced this session]`

So **FINS' default keel base of 4.5" (`fins.ts:1479`) is a true box-keel root**, and D-25's 5.0" depth makes the
root/depth 0.90, exactly the Hobie trace's 0.900. A cutaway keel drawn on FINS' root reads as a long, low, raked
keel, and the K5 worry ("a default keel looks like an upright fin") goes without a FINS change.

**Traced (root frame):** Hobie Fish b/d 0.900, s 1.615, sweep 45.1° (midpoint of the root to the top), rearmost 1.861 b
at 0.89 d, fill 1.045 (more than 1, because the body is longer than the root). `[VERIFIED: traced this session]`

**Proposed generic, `keel`** (four cubics, fitted to the Hobie trace with the heel at (1.52, 0.20), rounded):
`[VERIFIED: fit this session]`

| Cubic | Control points |
|---|---|
| leading | (0, 0) (0.24, 0.27) (0.98, 1) (1.62, 1) |
| tip | (1.62, 1) (1.70, 1) (1.86, 0.97) (1.86, 0.89) |
| trailing (to the heel H) | (1.86, 0.89) (1.86, 0.69) (1.52, 0.54) (1.52, 0.20) |
| cutaway (heel to root) | (1.52, 0.20) (1.52, 0) (1.40, 0.10) (1, 0) |

Template b/d 0.90: fill 1.046, sweep 45.2°, s 1.62 (tip 0.56 d behind the root's end), rearmost 1.86 b. Against the
Hobie trace: rms 0.53% d, worst 1.8% d. Against the McCallum it is rms 6.5% d, worst 17%, because the McCallum's lower
back edge is a different design. A joint fit to both was worse for each (rms 3%), so pick one. The Hobie is True Ames'
own "industry standard" keel.

**Drawn at the Fish's keel (Reset):** B 4.5", D 5.0", B/D 0.90 (1.00× the template): sweep 45.2°, the tip 2.79"
behind the root's end, the rearmost point 3.87" behind it (so 6.25 − 3.87 = 2.4" from the tail, FINS' keel off-tail
being 6.25", `fins.ts:894`), area 23.5 in² against 22.3–25.4 for real keels.

**Alternative, `flushKeel`** (the FCS Modern Keel's kind, three cubics): leading (0,0) (0.15,0.30) (0.62,1) (1.04,1);
tip (1.04,1) (1.07,1) (1.24,0.99) (1.24,0.88); trailing (1.24,0.88) (1.24,0.70) (0.98,0.71) (1,0). Template b/d 1.21,
fill 0.722, sweep 33.2°. It fits only when the root is long (about 6"+ at a 5" depth). At FINS' 4.5" it would be
squashed to 0.74× and read upright, which is today's K5 look.

## 4. Quad rears: 25% shorter, and the small upright template

**Real rear-to-front ratios** (front base/depth/area → rear): `[CITED: maker figures as marked]`

| Set | Rear depth ÷ front | Rear base ÷ front | Rear area ÷ front | Rear b/d | Source |
|---|---|---|---|---|---|
| FCS II Performer M (rears 4.09 / 4.26 / 12.63, 32.4°) | 0.936 | 0.936 | 0.853 | 0.960 | surffcs.com (official) |
| Futures F6 Alpha + QD2 4.0 (3.87 / 4.05 / 11.67) | 0.888 | 0.890 | 0.772 | 0.956 | retailers |
| Futures F4 Alpha + QD2 3.75 (3.71 / 3.76 / 10.73) | 0.860 | 0.879 | 0.755 | 0.987 | retailers |
| True Ames Timmy Patterson (3.85 / 3.95 / 11.73) | 0.908 | 0.895 | 0.794 | 0.975 | trueames.com |
| True Ames Pavel (3.67 / 3.90 / 10.50) | 0.848 | 0.803 | 0.667 | 0.941 | trueames.com |
| True Ames Lovelace (3.42 / 3.63 / 9.06), rears "stubby and upright" | 0.803 | 0.781 | 0.625 | 0.942 | trueames.com |
| True Ames Tappy (3.77 / 3.72 / 10.62) | 0.778 | 0.816 | 0.651 | 1.013 | trueames.com |
| True Ames Tyler Warren (3.67 / 3.62 / 10.70), "the smaller rears … agility" | 0.772 | 0.808 | 0.670 | 1.014 | trueames.com |
| True Ames Valaric (3.12 / 3.24 / 7.34) | 0.648 | 0.622 | 0.424 | 0.963 | trueames.com |

The depth ratio runs 0.65–0.94, median 0.85. Modern shortboard sets sit at 0.86–0.94; True Ames' retro/fish quads
sit at 0.77–0.80. **The founder's 0.75 is a real (retro-quad) proportion.** At the fronts' 4.5" it gives **3.375"**.
Real rears keep b/d ≈ 0.94–1.01, so at 3.375" a real rear's base would be about 3.2–3.4". FINS' rears are 4.0" on the
Mid-length and 4.5" after Reset (`fins.ts:1481`), 18–33% longer than a real rear of that depth.

**Rear outline.** The traced rears are the side-fin family, a touch fuller and about 1° more upright: TW rear sweep 34.8°
against its front's 35.8°, fill 0.80 against 0.755; FCS publishes 32.4° against 33.7°. `[VERIFIED: traced; CITED: FCS]`
Because FINS' rear bases are long, I recommend the **small upright template** (§6) for the rears, not a scaled front.
FCS sells the same small fin as both a quad rear and a side bite: its Carver fin is printed "QUAD/SIDE CARVER", and
its Mid Byte is "suitable for … SUP's or as shortboard quad rears".
`[CITED: surffcs.com/products/fcs-ii-carver-pg-side-byte-fins (photo); retailer: cleanlinesurf.com fcs-ii-mid-byte-pg-side-bites-fin-set]`

**Drawn at the Mid-length (B 4.0", D 3.375"):** the small template gives a 35.9° sweep (fronts 35.4°), the tip 0.44"
behind the trailing root, and 10.5 in², against 10.62–10.70 for the Tappy and TW rears. The alternative, the
front-family rear (`rearSame`, below), gives 39.7° and a tip 0.80" behind: more raked than the fronts, which is the
"long and low" the founder doesn't want. After Reset (B 4.5"), the small template gives 39.1° and 11.8 in².

`rearSame` (alternative; joint fit to the TW and FCS rear traces): leading (0,0) (0.09,0.23) (0.54,1) (1.20,1); tip
(1.20,1) (1.36,1) (1.44,0.91) (1.44,0.86); trailing (1.44,0.86) (1.44,0.71) (0.86,0.66) (1,0). Template b/d 0.99, fill
0.774, sweep 34.7°; rms 2.2–2.6% d against the two traces.

## 5. Longboard single, and the 2+1's centre

**Reference fins** (base / depth / area): `[CITED as marked]`
- FCS II Connect (based on FCS's "Dolphin" longboard template), FCS's own table: 6" 4.27 / 6.00 / 17.65 in²; 7"
  4.99 / 7.01 / 24.05; 8" 5.64 / 7.96 / 30.71; **9" 6.43 / 9.03 / 39.91**; 10" 7.13 / 10.01 / 49.06; sweep 33.7°, 50/50.
  **b/d is 0.712 at every size**, and the fill is 0.687. `[CITED: surffcs.com/products/fcs-ii-connect-pg-longboard-fin]`
- Futures Performance 9": base 6.3", area 39.8 in² (b/d 0.70, fill 0.70); Futures Rudder 9" (pivot): 6.98 / 44.64
  (0.78, 0.71); Futures Tiller 9" (flex): 7.10 / 32.90 (0.79, 0.51). `[CITED: retailers: realwatersports.com, cleanlinesurf.com, evo.com]`
- True Ames Greenough 4-A, "still the most popular single fin design there is": 9.75" size 9.71 / 7.09 / 39.93 (b/d
  0.73, fill 0.58). `[CITED: trueames.com products.json (description); reseller spec table via WebSearch]`
- True Ames Justin Quintal Pivot 9.75: base 7.82, area 47.79 (b/d 0.80, fill 0.63). `[CITED: retailer: realwatersports.com]`
- **D-fin:** True Ames D-2, "a traditional, old school D-fin. … Has a 9.75" base, and it will fit in a standard 10" fin
  box because we have made an overhang in the rear of the fin". `[CITED: iconsofsurf.com/products/true-ames-d-2.json]`
  A forum rule of thumb puts old D-fins at 9–10" high on a 7–8.5" base. `[ASSUMED: seabreeze.com.au forum]`

**Traced:** Greenough 4-A 9" (root b/d 0.768, s 1.382, sweep 34.1°, fill 0.589, a narrow tip of w95 0.30 d); Connect
9" (0.672, 1.410, 31.5°, 0.689); TW pivot 10.25 (0.819, 1.148, 27.9°, 0.595; upright, broad base); D-2 (1.114 root
including the overhang, s 0.943, so the top sits *ahead of* the trailing root's end; sweep 26.3°, fill 0.792; a
straight back edge leaning slightly forward); Hobie Classic 7 (0.690, 1.592, 37.0°, 0.788; very full tip).
`[VERIFIED: traced this session]`

**D-22 depth and D-25's base, confirmed:** FCS's own size table keeps b/d = 0.712 from 6" to 10", and Futures'
Performance 9" is 0.70. So **keep the base at 0.70 × depth**, centred in the 10.5" box. `[CITED: FCS, retailers]`

**Recommend the classic raked single** (the Connect/4-A family, the most common all-round longboard single) as the
one basic shape. Proposed generic, `single` (joint fit to the 4-A and Connect traces): `[VERIFIED: fit this session]`

| Cubic | Control points |
|---|---|
| leading | (0, 0) (0.16, 0.18) (0.71, 1) (1.40, 1) |
| tip | (1.40, 1) (1.48, 1) (1.59, 0.99) (1.59, 0.94) |
| trailing | (1.59, 0.94) (1.59, 0.86) (0.70, 0.70) (1, 0) |

Template b/d 0.72: fill 0.636 (between the 4-A's 0.58 and the Connect's 0.69), sweep 32.9°, s 1.40 (the tip 0.288 d
behind the trailing root), rearmost (1.59, 0.94), w90 0.41 d, w95 0.35 d. Against the 4-A: rms 2.2% d, worst 6.0%;
against the Connect: rms 2.2%, worst 4.7%.

**Drawn:** 9'0" Longboard, D 9.0", B 6.3": sweep 32.2°, the tip 2.52" behind the trailing root, 36.1 in² (a real 9"
runs 39.8–39.9). 7'2" switched to single: D 7.17", B 5.02", 22.9 in².

**Why not the D-fin as the one shape:** a D-fin's base is about 1.1 × its depth (the D-2's root including its
overhang), which on a 9" fin is about 9.9", the whole box. That contradicts D-25's 0.70 × depth. At 0.70 the D-fin
template is squashed to 0.63× and reads as a stubby wedge (17.8° sweep, the tip ahead of the trailing edge). If the
founder wants D-fins, it is a second single role with base = 1.1 × depth (≈ the box). Its template (`dfin`, rms
0.35% d against the D-2): leading (0,0) (0.13,0.29) (0.46,1) (0.96,1); tip (0.96,1) (1.14,1) (1.13,0.91) (1.13,0.76);
trailing (1.13,0.76) (1.13,0.73) (1.16,0.46) (1,0); b/d 1.11, fill 0.788, sweep 27.0°. The pivot (`pivot`, rms 0.43%
against the TW pivot, b/d 0.82, sweep 28.4°) is a third option, and the least distinct from the raked single at a
glance.

**2+1 centre ("the single, shorter").** True Ames' own 2+1 chart: "Shortboard 5.5"–6.5" / side bites 2.6"–3.7"; Mid
Length (Egg Shape) 6.5"–8" / 2.6"–4"; Performance Longboard 6.5"–8" / 3.25"–4"", with the rule "as the size of your
center fin increases, the size of your side bites can decrease, and vice versa". `[CITED: trueames.com/pages/2-1-setup-fins]`
D-22's rule gives a 9" centre on a 9'0", above every row of that chart. A forum rule of thumb is "the single's size
less about an inch" with side bites. `[ASSUMED: seabreeze.com.au forum]` **Recommend: 2+1 centre depth = (length in
feet − 1)"**, giving 8.0" on a 9'0" (the chart's top) and 6.17" on the 7'2" Mid-length (just under the chart's 6.5").
Same outline, base 0.70 × its depth, centred in the box. This amends D-25's "the 2+1's centre takes the same rule", as
the brief anticipates.

## 6. 2+1 side bites (and the quad rears, and the trailer): the small upright template

**Reference fins.**
- True Ames side bite 3.25 (True Ames' own text): "HEIGHT: 3.25" / 84 mm BASE: 3.38" / 85.85 mm AREA: 8.38"²"
  (b/d 1.04, fill 0.763). `[CITED: trueames.com products.json, side-bite-3-25-futures-compatible-solid-fiberglass-1]`
- FCS II Carver side byte S (FCS's own table): 3.86 / 3.93 / 11.07 in², 33.2°, flat (b/d 0.98, fill 0.73).
  `[CITED: surffcs.com/products/fcs-ii-carver-pg-side-byte-fins]`
- FCS II Mid Byte ("derived from the historic GL template"): about 3.4 / 3.6 / 9.3 in², 38.6° (the retailer's
  base/depth columns are ambiguous). `[CITED: retailer: cleanlinesurf.com]`

**Traced:** TA side bite 3.25: b/d 1.020, s 1.115 (tip 0.117 d behind), sweep 32.1°, rearmost 1.404 b at 0.83 d,
fill 0.777. `[VERIFIED: traced this session]`

**Proposed generic, `small`:** `[VERIFIED: fit this session]`

| Cubic | Control points |
|---|---|
| leading | (0, 0) (0.16, 0.31) (0.62, 1) (1.11, 1) |
| tip | (1.11, 1) (1.33, 1) (1.41, 0.87) (1.41, 0.82) |
| trailing | (1.41, 0.82) (1.41, 0.70) (0.92, 0.58) (1, 0) |

Template b/d 1.02: fill 0.779, sweep 31.9°, s 1.11 (0.112 d behind), rearmost (1.41, 0.82), w90 0.61 d, w95 0.45 d.
Against the trace: rms 0.42% d, worst 2.1% d. This is the most upright of the side-fin family: the tip is almost over
the trailing root, and the rearmost point is lower.

**Side bite depth: 3.5"** (the middle of True Ames' 3.25–4" for performance longboards and 2.6–4" for mid-lengths).
FINS' 2+1 side-bite base is `baseLenForward`, 4.5" after Reset (`fins.ts:1479`). That is longer than any real side
bite (3.25–3.9"), so the side bites draw at B/D 1.29: sweep 38.1°, 12.3 in² against 8.4–11.1 for real ones. True to
FINS (D-25), noted for the founder.

**Upright + Trailer twin's centre trailer:** FINS calls it "a smaller anchor fin than a thruster center" (`fins.ts:1266-1268`).
The MR's stabiliser is 3.31 / 3.34 (FCS). **Recommend the small template at 0.75 × 4.5 = 3.375"**, the same as a quad
rear, which is 1% off the MR stabiliser's depth. It replaces 16-10's "thruster outline" call, which the founder was
asked about at 16-10's look.

## 7. Symmetrical or foiled one side (not drawn here, D-25's slab)

| Role | Foil in the references | Source |
|---|---|---|
| Single, 2+1 centre | symmetrical (50/50) | FCS Connect "50/50"; Futures Performance "symmetrical foil" |
| Thruster centre, the quad's fifth fin | symmetrical | Futures F6 "center fin is symmetrical"; FCS MR stabiliser 50/50 |
| Upright + Trailer centre | symmetrical (MR stabiliser 50/50) | surffcs.com |
| Thruster sides, quad fronts | flat inside, or FCS's "IFT" inside-foil | Futures F6 "side fins flat"; FCS Performer IFT |
| Quad rears | 80/20 (FCS Performer rears, TW rears) or symmetrical (Futures QD2) | surffcs.com; trueames.com; retailers |
| Twins (upright, keel) | flat inside (MR "Flat", Hobie Fish "flat inside foil", Modern Keel "Flat") | surffcs.com; trueames.com |
| 2+1 side bites | flat (FCS Carver "Flat") | surffcs.com |

The outline itself is the same shape for a left and a right fin. Only the foil, which isn't drawn, would be mirrored.

## 8. Tip shape: rounded, and where the depth is

- Every reference's highest point is a rounded nose, not a point. The curvature radius there is 0.12–0.6 d, and it
  tightens to 0.03–0.11 d at the rearmost hook. The tip width at 0.95 d is 0.30–0.35 d for singles and 0.42–0.51 d for
  the side-fin family. `[VERIFIED: fit this session]`
- The makers' "depth" is base to the highest point (FCS's table and the D-22 rule both mean this). In this model the
  outline touches the depth line at exactly one point, P, with a level tangent, so **depth = D exactly**. Today's
  outline gets the same result from its fillet circle tangent to the depth line.

## 9. One role table (what `finOutlineRole` and `finRoleDepth` would become)

| FINS setup and mark | Role (proposed) | Template | Depth |
|---|---|---|---|
| single centre | single | `single` | length in feet, as inches (D-22); base 0.70 × D, centred in the box |
| 2+1 centre | single (shorter) | `single` | (length in feet − 1)"; base 0.70 × D, centred in the box |
| 2+1 front marks (side bites) | sideBite (new) | `small` | 3.5" |
| twin, upright | twinUpright | `twin` | 5.0" |
| twin, keel | twinKeel | `keel` (cutaway) | 5.0" |
| twin, Upright + Trailer: mains / centre | twinUpright / quadRear | `twin` / `small` | 5.0" / 3.375" |
| thruster, all three | thruster | `side` | 4.5" |
| quad fronts, quad centre (fifth fin) | thruster | `side` | 4.5" |
| quad rears | quadRear | `small` | 0.75 × the fronts' depth = 3.375" |

The current role names, `"single" | "twinUpright" | "twinKeel" | "thruster" | "quadRear"`, are at
`lib/geometry/fin-outline.ts:47`; `"sideBite"` is a proposal `[ASSUMED]`. FINS' marks carry
`role: "front" | "rear" | "center"` (`lib/geometry/fins.ts:83`), with setups `"single" | "twin" | "thruster" |
"2plus1" | "quad"` (`fins.ts:78`) and twin templates `"upright" | "keel" | "trailer"` (`fins.ts:81`).
`[VERIFIED: read this session]`

## 10. The base rule: what the templates imply

- **Real templates scale whole.** FCS keeps b/d constant across every size: Performer 0.96 from XS to XL, its quad
  rears 0.96, the Connect 0.712 from 6" to 10". A bigger fin from a maker is the same fin shrunk or grown in both
  directions. `[CITED: surffcs.com]` The founder rejected exactly that for the app (D-21: "don't shrink the whole fin").
- **Rule A, stretch along the base (recommended):** draw the template with every control point (x, y) at (x·B, y·D).
  This is the literal reading of "just scale the base": the base direction is scaled to FINS' base, and the depth
  stays the role's. The drawn fin is always the template stretched sideways, never a new shape. It is a simple
  outline for any B > 0 (an affine map can't make edges cross), and its area (fill·B·D), tip (s·B, D) and sweep
  (atan((s−0.5)·B/D)) are exact formulas the tests can assert.
- **Rule B, today's rule (only the leading edge moves):** the tip and the trailing edge keep their offset from the
  trailing root, measured in the template's own base k₀·D, and the leading cubic re-spans from the root to the tip.
  Today's test `the founder's rule: changing the base moves only the leading edge`
  (`lib/geometry/fin-outline.test.ts:334`) pins it.
- **At FINS' figures the two rules barely differ.** Every preset's B/D is 0.90–1.33 against the templates' 0.72–1.02,
  and the drawn sweeps differ by 0.3–1.4°, the tip set-backs by 0.03–0.15" (§11). They part ways only when a shaper
  sets a base far from the template's. Rule A then gives the same fin, longer or shorter. Rule B gives a fin whose
  leading edge alone lies flatter or steeper, and if B ever drops below about 0.1 D its trailing edge would pass in
  front of the leading root.
- **Recommendation:** Rule A. The planner should put the wording change to the founder at the look ("a longer base
  stretches the fin along the board; its depth stays"), because it amends 16-10's reading of D-21. The 16-10 test above
  becomes "stretching the base scales every point's u by B'/B and leaves every v unchanged".

## 11. Every preset's fins, drawn with the proposed outlines

FINS' figures are from 16-10-SUMMARY's table. Sweep is FCS's definition, and "tip behind" is the highest point's
distance behind the trailing root. Rule A unless marked. `[VERIFIED: computed this session]`

| Board | Fin | Template | Base B | Depth D | B/D (× template) | Rule A: sweep / tip behind / rearmost behind / area | Rule B: sweep / tip behind / area |
|---|---|---|---|---|---|---|---|
| Longboard 9'0" single | centre | single | 6.30" | 9.00" | 0.70 (×0.97) | 32.2° / 2.52" / 3.72" / 36.1 in² | 32.5° / 2.59" / 36.0 in² |
| Mid-length 7'2" single | centre | single | 5.02" | 7.17" | 0.70 (×0.97) | 32.2° / 2.01" / 2.96" / 22.9 in² | 32.5° / 2.06" / 22.8 in² |
| Mid-length 2+1 | centre (feet − 1) | single | 4.32" | 6.17" | 0.70 (×0.97) | 32.2° / 1.73" / 2.55" / 16.9 in² | 32.5° / 1.78" / 16.9 in² |
| Mid-length 2+1 | side bites | small | 4.50" | 3.50" | 1.29 (×1.26) | 38.1° / 0.50" / 1.84" / 12.3 in² | 37.1° / 0.39" / 11.9 in² |
| Fish 5'8" upright twin | sides | twin | 5.50" | 5.00" | 1.10 (×1.15) | 37.6° / 1.10" / 2.47" / 20.9 in² | 36.6° / 0.96" / 20.6 in² |
| Fish keel twin (Reset) | sides | keel | 4.50" | 5.00" | 0.90 (×1.00) | 45.2° / 2.79" / 3.87" / 23.5 in² | 45.2° / 2.79" / 23.5 in² |
| Fish Upright + Trailer | mains | twin | 4.50" | 5.00" | 0.90 (×0.94) | 32.2° / 0.90" / 2.02" / 17.1 in² | 32.7° / 0.96" / 17.2 in² |
| Fish Upright + Trailer | centre trailer | small | 4.50" | 3.38" | 1.33 (×1.31) | 39.1° / 0.50" / 1.84" / 11.8 in² | 37.9° / 0.38" / 11.4 in² |
| Shortboard 6'2" thruster | sides + centre | side | 4.50" | 4.50" | 1.00 (×1.03) | 35.4° / 0.95" / 2.16" / 15.4 in² | 35.1° / 0.92" / 15.3 in² |
| Mid-length 7'2" quad | fronts + centre | side | 4.50" | 4.50" | 1.00 (×1.03) | 35.4° / 0.95" / 2.16" / 15.4 in² | 35.1° / 0.92" / 15.3 in² |
| Mid-length 7'2" quad | rears | small | 4.00" | 3.38" | 1.19 (×1.16) | 35.9° / 0.44" / 1.64" / 10.5 in² | 35.2° / 0.38" / 10.3 in² |
| (alternative) | rears | rearSame | 4.00" | 3.38" | 1.19 (×1.20) | 39.7° / 0.80" / 1.76" / 10.4 in² | 38.3° / 0.67" / 10.3 in² |
| any quad (Reset) | rears | small | 4.50" | 3.38" | 1.33 (×1.31) | 39.1° / 0.50" / 1.84" / 11.8 in² | 37.9° / 0.38" / 11.4 in² |
| Longboard 9'0" (alternative D-fin at 0.70) | centre | dfin | 6.30" | 9.00" | 0.70 (×0.63) | 17.8° / −0.25" / 0.83" / 44.7 in² | 17.0° / −0.40" / 48.3 in² |

Against real fins of the same size: thruster 15.4 in² (Performer M/L 14.81/15.58), twin 20.9 (MR 21.06), keel 23.5
(real keels 22.3–25.4), quad rear 10.5 (TW 10.70, Tappy 10.62), single 9" 36.1 (real 9" singles 39.8–39.9: the
generic is the slimmer-tipped 4-A side of the family). Side bites and the trailer come out larger than real ones
because FINS' bases for them are thruster-sized.

## 12. Common Pitfalls

### Pitfall 1: a keel's "base" from a spec sheet
**What goes wrong:** a keel drawn with a 6.4–7.1" root (the listed base) on a 4.5" FINS base, or FINS' 4.5" read as
"too short".
**Why:** box keels list their body length, while the root on the board is the 4.6" tab (§3).
**Avoid:** the keel template's x = 1 is the root, FINS' base, and its body runs on to 1.86 b.
**Warning sign:** a default keel that reads upright, today's K5 look.

### Pitfall 2: where sweep is measured from
FCS's figure is the angle between a line straight up from the base's **midpoint** and the line from that midpoint to
the highest point. A patent says the same ("the angle between a vertical line drawn from the mid-point of the base and
the line drawn from the mid-point of the base to the highest point on the fin"), and so does Surf Science. My traces
reproduce FCS's figures to 0.4–0.6° with this definition. One patent (US 9669905) measures from the base's front
instead. Don't compare a leading-root angle with FCS's numbers. `[CITED: US 8632373 via WebSearch; surfscience.com fin-specs-and-performance]`

### Pitfall 3: a tip that touches the depth line, against a rounded tip
The highest point must sit exactly on y = 1, with level tangents either side (L2 and C1 both at y = 1). If a fit puts
a control point above 1, the fin overshoots its depth. If the C cubic leaves the top steeply, the tip turns into a
point. The tip is round by construction here (top radius 0.2–0.6 d for the proposals). Keep C1 at least 0.08 b along
from P and C2 at least 0.05 d above Q, the floors used in the fits, or the rearmost hook draws as a corner.

### Pitfall 4: the cutaway's sliver and the rounded edges
The keel's cutaway meets the base at about 16° (E's last control (1.40, 0.10) → (1, 0)), and its lowest interior point
is 0.005 d above the base near the root. With `finSolid`'s rounded edges and the 1 mm root sink (`FIN_ROOT_SINK`,
`fin-outline.ts:93`), check that no edge rounding pokes through the bottom in that thin wedge. Look at the 3D picture
from below and aside.

### Pitfall 5: FINS' long bases for rears, side bites and the trailer
FINS' 4.0–4.5" rear and side-bite bases with 3.375–3.5" depths are 1.19–1.33 B/D, against real 0.94–1.04. With the
front-family outline they read as raked keels. That is why the small template is proposed. Don't "fix" it by changing
the depth: the 0.75 rule is the founder's.

### Pitfall 6: averaging control points is not averaging shapes
A naive mean of each reference's fitted control points was 4–5% d off its own references. A joint fit was needed to
get the generic outlines to the real spread. Re-measure with a joint fit if a reference is added.

### Pitfall 7: Rule 1 fixtures
These constants are design inputs, not prototype output, so there is no `scripts/extract-prototype-*` fixture. Don't
hand-type per-point expected outlines into tests. Assert the relations (§13) and the per-role fills and sweeps within
a tolerance.

### Pitfall 8: naming makers in the product
D-21 says no named template, and the module header today says "No fin here copies or claims any maker's template or
foil". The generic outlines are joint fits across makers (side, twin, single, rears), or rounded fits of one
reference (small, keel, the D-fin and pivot alternatives). Keep maker names out of the code comments and the UI, and
cite this research instead.

## 13. Code example (skeleton for the planner)

The names `FinOutlinePoint` (`{ u: number; v: number }`, `fin-outline.ts:96-98`), `FIN_CUBIC_SAMPLES`
(`fin-outline.ts:87`, `24`), `finOutline(role, base, depth)` (`fin-outline.ts:219`) and `inchesToMm`
(`units.ts:30`) exist today. `[VERIFIED: read this session]` Everything else is a proposal. `[ASSUMED]`

```typescript
// A fin template: cubics in the (u/b, v/d) frame, leading edge first, ending at the trailing root (1, 0).
type TPoint = readonly [number, number];
type TCubic = readonly [TPoint, TPoint, TPoint, TPoint];

// side-fin template (research §1); others in §2–§6
const SIDE: readonly TCubic[] = [
  [[0, 0], [0.07, 0.19], [0.61, 1], [1.21, 1]],
  [[1.21, 1], [1.31, 1], [1.48, 0.93], [1.48, 0.88]],
  [[1.48, 0.88], [1.48, 0.73], [0.89, 0.7], [1, 0]],
];

// Rule A: stretch every control point to the fin's base B and depth D (millimetres), then sample.
function templateOutline(t: readonly TCubic[], B: number, D: number): FinOutlinePoint[] {
  const pts: FinOutlinePoint[] = [];
  t.forEach((c, k) => {
    for (let i = k === 0 ? 0 : 1; i < FIN_CUBIC_SAMPLES; i++) {
      const s = i / (FIN_CUBIC_SAMPLES - 1), r = 1 - s;
      const w = [r * r * r, 3 * r * r * s, 3 * r * s * s, s * s * s];
      pts.push({ u: B * w.reduce((a, wi, j) => a + wi * c[j][0], 0), v: D * w.reduce((a, wi, j) => a + wi * c[j][1], 0) });
    }
  });
  pts[0] = { u: 0, v: 0 };
  pts[pts.length - 1] = { u: B, v: 0 };
  return pts;
}
```

**Tests to write, all relations** (the planner's list; fills and sweeps from this research, within tolerance):
1. For every role and every preset: the outline closes on its base (first (0, 0), last (B, 0)), it is simple, every
   v ≥ 0, max v = D at exactly the tip point (s·B, D), and the rearmost point is (m·B, h·D).
2. Area (shoelace) = fill × B × D within 0.5%, with fill: side 0.760, twin 0.758, small 0.779, single 0.636,
   keel 1.046 (and rearSame 0.774, dfin 0.788, flushKeel 0.722 if used).
3. Sweep = atan((s − 0.5)·B/D): the Shortboard's thruster 35.4°, the Fish keel 45.2°, the 9'0" single 32.2°, the
   Mid-length rears 35.9° (±0.2°).
4. The quad rule: rear depth = 0.75 × front depth exactly (3.375" for 4.5").
5. Rule A: two bases give the same v for every point and u scaled by B'/B. This replaces `fin-outline.test.ts:334`.
6. The single: depth from D-22, base 0.70 × D, centred in the box (unchanged). The 2+1 centre at (feet − 1)", if
   ruled.
7. The bad-input guard (T-16-22) stays: a non-finite or non-positive base or depth leaves the fin out.

## State of the Art

| Old approach (16-10) | Proposed | Impact |
|---|---|---|
| One invented outline per role, a fillet circle solved numerically, a tip at a fixed 0.75" behind | One traced, fitted template per role, all Bézier, no solver | Each setup reads as its real fin; simpler, exact maths |
| Base changes move only the leading edge | Stretch along the base (Rule A), for the founder to confirm | Same fin at any FINS base; exact area and sweep formulas |
| Keel = upright twin with the tip over the trailing edge | Cutaway box keel on FINS' root | A default 4.5" keel reads as a fish keel |
| Quad rears 4.25" (0.94 ×), thruster outline | 0.75 × 4.5 = 3.375", small upright template | The founder's rule; reads smaller and more upright |
| Trailer = thruster outline | Small template at 3.375" (the MR stabiliser's 3.34") | Reads as the "smaller anchor fin" FINS describes |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | The cutaway keel's gap behind the Futures tab is part of the design (the fin is relieved behind its box), not a photo artefact | §3 | Low: if the founder prefers it flush, use `flushKeel` (FINS' 4.5" then reads upright, as today) |
| A2 | The 2+1 centre at (feet − 1)" (a forum rule of thumb; True Ames' chart supports 6.5–8") | §5 | Low: a one-line rule; D-25's "same as single" is the fallback |
| A3 | Side bites at 3.5" | §6 | Low: within True Ames' 3.25–4" |
| A4 | `"sideBite"` as a new role name; the trailer mapped to `quadRear` | §9 | Naming only |
| A5 | D-fin figures from a forum (9–10" high, 7–8.5" base) | §5 | None: the D-fin is not recommended |
| A6 | Retailer-listed figures (Futures, the FCS FK-2 and Machado keel, 4-A 9.75) match the makers' own | §1–§6 | Low: FCS's and True Ames' own figures carry the main conclusions |

## What the planner must settle (the founder where marked)

1. **Rule A against Rule B** for "just scale the base" (§10). Recommend A. **Founder:** one sentence at the look,
   since it amends 16-10's reading of D-21.
2. **The all-Bézier outline** (three cubics, four for the keel) replacing `tipAndTrailing`'s fillet solver.
   `FIN_TIP_ARC_SAMPLES` goes. `tipFrom` becomes the index where the tip cubic starts, and `tipBehind`/`tipRadius`
   become derived (s, and the top radius), or drop out of `FinOutline`.
3. **Keel: cutaway (recommended) or flush.** **Founder**, with the before/after picture from below and aside. Check
   pitfall 4's sliver.
4. **Quad rears: the small upright template (recommended) or the front-family rear.** **Founder.** Whether FINS'
   own rear base default (4.5" after Reset) should be smaller is a FINS question, out of this phase.
5. **2+1:** the centre at (feet − 1)" (recommended) or D-25's feet. Side bites on the small template at 3.5".
   **Founder** for the centre, because it amends D-25.
6. **Single: the raked all-round single (recommended), or a D-fin role** (which needs base ≈ 1.1 × D, against D-25).
   **Founder** if he wants the D-fin.
7. **Upright twin depth:** 5.0" (D-25, recommended) or 5.5" (the MR's own ratio at FINS' 5.5" base).
8. **The Upright + Trailer's centre trailer:** the small template at 3.375" (recommended), answering 16-10's open
   question 3.
9. **SUMMARY's fins table and pictures** (brief): every setup before/after; the quad's rears beside its fronts; the
   keel from below and aside.

## Environment Availability

Step 2.6 skipped: this is pure maths in the existing TypeScript and three.js stack, with no new tools or services.

## Validation Architecture

### Test Framework
| Property | Value |
|---|---|
| Framework | Vitest (node environment), `lib/**/*.test.ts` |
| Config file | the repo's existing Vitest config |
| Quick run command | `npx vitest run lib/geometry/fin-outline.test.ts` |
| Full suite command | `npm test` (and `npm run test:e2e` for the 3D specs at the phase gate) |

### Requirements → Test Map
| Req | Behaviour | Type | Command | File exists? |
|---|---|---|---|---|
| D-35 outlines | §13 tests 1–3, 5 per role and preset | unit | `npx vitest run lib/geometry/fin-outline.test.ts` | ✅ (rewrite the outline and rule tests) |
| D-35 quad rule | rear depth = 0.75 × front | unit | same | ✅ (amend the "touch shallower" test at `:306`) |
| D-22/D-25 single | depth = feet, base 0.70 × D, centred | unit | same | ✅ (kept) |
| Look | the pictures per setup | manual (the founder's look) | Playwright picture script | — |

### Sampling Rate
- **Per task commit:** the quick run. **Per wave merge:** `npm test` plus the 3D specs. **Phase gate:** the full suite green.

### Wave 0 Gaps
None. The test file exists; its outline and rule tests are rewritten in place.

## Security Domain

Pure geometry with no inputs beyond FINS' stored figures. ASVS V5 (input validation): the existing T-16-22 guard
(non-finite or non-positive base or depth drops the fin) stays. The fixed cubic count and `FIN_CUBIC_SAMPLES` bound the
work. No V2, V3, V4 or V6 surface.

## Sources

### Primary (makers' own data; HIGH for the figures)
- FCS: `surffcs.com/products/fcs-ii-performer-performance-core-tri-fin-set.json`, `…/fcs-ii-performer-performance-core-quad-rear-set.json`, `…/fcs-ii-mark-richards-twin-stabiliser-fins.json`, `…/fcs-ii-modern-keel-twin-fins.json`, `…/fcs-ii-connect-pg-longboard-fin.json`, `…/fcs-ii-carver-pg-side-byte-fins.json` (spec tables and product photos traced)
- True Ames: `trueames.com/products.json` (quad front/rear figures for the Tyler Warren, Timmy Patterson, Pavel, Lovelace, Tappy and Valaric sets; side bite 3.25 figures; the product photos traced: Greenough 4-A, Hobie Fish, TA Thruster, TW Quad, side bite 3.25, TW Pivot, Hobie Classic, McCallum Keel); `trueames.com/pages/2-1-setup-fins` (the 2+1 chart)
- True Ames D-2: `iconsofsurf.com/products/true-ames-d-2.json` (True Ames' own description; photo traced)

### Secondary (MEDIUM)
- Sweep definition: patents US 8632373 and US 10807682 (via WebSearch); surfscience.com, "Fin Selection: fin specs and performance"
- Futures figures (F6/F4 Alpha, QD2 rears, Performance/Rudder/Tiller singles, Machado/K2/Christenson keels): retailer listings (surfboardempire.com.au, cleanlinesurf.com, evo.com, realwatersports.com, surf-skateboards.com)

### Tertiary (LOW)
- seabreeze.com.au longboarding forum (D-fin sizes; "the single less about an inch" for a 2+1); a Pemulis quad-fin guide page (pemulis-product-page.pages.dev; rears 3.5–4.25" against fronts 4.5–4.75")

## Metadata

**Confidence breakdown:**
- Reference figures: HIGH for FCS and True Ames (their own pages), MEDIUM for retailer-only Futures figures.
- Outlines: MEDIUM-HIGH. The traces are checked against published figures (§ "How every number…"), and the fits are
  measured; the generic shapes carry the real spread between makers (2–6% d).
- Recommendations (Rule A, cutaway keel, small rears, the 2+1 centre): MEDIUM. Each is reasoned from the data, but
  each is a founder's call.

**Research date:** 2026-11-04. **Valid until:** stable (fin templates change slowly); re-check only if FINS' defaults change.
