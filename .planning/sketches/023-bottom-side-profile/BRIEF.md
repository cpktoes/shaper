# Brief — sketch 023: a side profile on the BOTTOM page

## The founder's ask (2026-11-12, his words)

"…there should be two overlaid side profiles: 1) what the profile looks like along the stringer, and 2) what the profile
looks like at the rail (assuming a rectanglular blank cross section - before rails have been shaped). This could mean
that for a Vee bottom, the rail will be higher than a stringer, and in a concave the stringer higher than the rail.
In fact, this is so important that I think I'd like to add this side profile view to the bottom page so you can see how
contours affect the overall flow of the rocker along the stringer."

His two cards the same hour: **sketch the placement first** (this sketch); the side profile is stretched with
**Height ×1 / ×2 / ×4 / ×8, opening at ×4** — the same buttons as BOTTOM's cross-section.

What is already built (branch `close-bottom-17`, not live): `lib/geometry/side-profile.ts` — `sideProfileAt`,
`sideProfileStations`, `sideProfileLines(resolved, board, profile)` — the bottom at the stringer (`foamOff(s, 0)`), the
bottom at the rail on the planed blank (`sectionsFoamOff(s, railAt(s))`: vees, bellies and concaves, never channels),
one deck line, the thickness at the stringer and the side profile's maximum. The Board file preview on the 3D page
already draws the two lines (pictures: `.planning/quick/261112-lmr-*/pictures/`) — stringer line in ink, rail line
dashed (`--surf-ink-muted`, 1.5 wide, dash 3 2), a key under it, Height buttons beside the caption
`SIDE VIEW · HEIGHT ×4`. Match that look.

## The sketch

`.planning/sketches/023-bottom-side-profile/index.html`, plain HTML/CSS/JS, no build step. **Fork sketch 021**
(`.planning/sketches/021-bottom-guide/index.html` — it already draws the BOTTOM page: the sidebar of cuts, VIEWER with
the board from below and the cross-section, DATA, GUIDE, the themes, phone and computer, with its own copy of the
bottom maths), strip what this question doesn't need (keep GUIDE and DATA tabs present but they can be thin), and add the
side profile. It must react live: changing a cut, its depth or its stations in the sidebar redraws the side profile, the
same as it redraws the top view and the section. The side view's dash-dot station marker sits at the section's station,
and tapping/dragging along the side view moves the section's station, exactly as the top view does today.

**The side profile's numbers:** worked by the sketch's own maths (planed rocker + planed thickness + the sketch's
foam-off at the stringer and at the rail, channels never on the rail line), and **cross-checked against the app's own
`sideProfileLines`** on two boards — the 6'2" Shortboard with a Deep Single Concave in CENTER and with a Rolled Vee in
TAIL (starting numbers): write the app's numbers to JSON with a `npx tsx` scratch script (in the session scratchpad,
`/private/tmp/claude-501/-Users-kontoes-Code-shaper/86389bad-1284-4de0-86f8-1a82686fc51e/scratchpad/sketch023/`, never
loose under `.planning`), compare every 1" from tail to nose, and report the worst gap (aim under 0.5 mm). If the sketch's
board or rocker cannot match the app's within that, embed the app's numbers for those two boards and say so.

**Three variants, tabs at the top as in 021** (each on the computer shell and an upright phone):
- **A — a third drawing in VIEWER**: the board from below on top, the SIDE VIEW in the middle, the cross-section under
  it; the side view and top view share one length scale, so the station line runs straight down through both.
- **B — its own SIDE VIEW tab** beside VIEWER · DATA · GUIDE (the tab strip's room rules in CLAUDE.md: the board name
  drops when the strip has under 50 dots after its last tab), the side profile drawn large, with the same station marker
  and a small cross-section inset or none (your call — say which).
- **C — the side view swaps with the board from below**: a FROM BELOW / FROM THE SIDE toggle in VIEWER's corner (the app's
  viewer-toolbar grammar), the cross-section stays beneath either one.

In every variant: the deck (one line), the bottom at the stringer (ink), the bottom at the rail before the rails are
shaped (dashed, as in the preview), the planed bottom NOT drawn as a third line unless you find it essential (say why),
Height ×1/×2/×4/×8 opening at ×4 beside the caption, a key under the drawing in the preview's words ("at the stringer",
"at the rail, before the rails are shaped"), and one facts line: `2 1/8" at the stringer · 2 1/4" side profile max` (the
preview's words), Metric too through the sketch's own unit switch if 021 has one. Follow the app's drafting grammar
(read `.claude/skills/sketch-findings-shaper/SKILL.md` and its references) and 021's themes, light and dark.

Phone (`max-shell`, below 820 dots): the drawing is pinned above the controls on BOTTOM; respect that — say how much
height each variant leaves the controls on a 390×844 iPhone, measured.

## Deliverables

1. `index.html` and `README.md` (frontmatter `sketch: 023`, `name: bottom-side-profile`, `question:`, `winner: null`,
   `builds_on: 021`, `tags:`) in the sketch's own house style (see 021's README).
2. `pictures/` — for each variant: computer 1280×800 light, upright phone 390×844, on the Deep Single board; plus variant A
   on the Rolled Vee and one dark picture. Taken with headless Playwright from the sketch file; look at every picture
   yourself (Read the PNG) and fix what's wrong before you finish.
3. The sketch's source helpers archived as `sketch-source.tar.gz` in the sketch folder if any scripts were used (no loose
   .ts/.cjs under `.planning`).
4. A row added to `.planning/sketches/MANIFEST.md`'s table (`023 | bottom-side-profile | <question> | — | <tags>`).
5. Do NOT commit; the orchestrator commits and publishes. Do not touch app code under `lib/`, `components/`, `app/`.

Work only inside `/Users/kontoes/Code/shaper/.claude/worktrees/close-bottom-17`; never `cd` elsewhere (absolute paths).
Do not open AkuShaper or Shape3D; do not touch `~/Downloads`.

Report: what each variant does, the measured cross-check gap, the phone heights left for the controls, and anything
you decided that the founder should see.
