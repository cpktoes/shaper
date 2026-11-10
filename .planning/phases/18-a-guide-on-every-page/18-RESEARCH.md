# Phase 18: A GUIDE on Every Page - Research

**Researched:** 2026-11-09
**Domain:** A read-only, per-page GUIDE tab (84 cards: words + a live-geometry cartoon) added to five existing Next.js / React 19 design editors; pure-TypeScript "push" helpers over the app's own geometry; Playwright + Vitest proof.
**Confidence:** HIGH on the codebase facts (every claim below was read in this worktree this session or measured in a browser against a dev server on port 3123, now stopped); MEDIUM on phone-performance extrapolation; the Metric-in-prose and phone-name decisions are flagged as open questions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Every decision below is the founder's or the decided sketch's; where the sketch chose and he said "build this", the sketch's choice
stands and is marked *(sketch)*. The README's "What to Look For" items he has not spoken on are his to overrule during the build.

#### Where the GUIDE lives
- **D-01:** **GUIDE is the LAST tab in each page's own strip** — after VIEWER · ADD WINGS on TEMPLATE, VIEWER · PLANING · DATASHEET on
  ROCKER (VIEWER · TOP · PLANING · DATA on a phone, five fitting a 390-dot iPhone with the board's name cut short), VIEWER · DATA ·
  INSTRUCTIONS on RAILS, ESTIMATE on VOLUME, VIEWER · DATA on FINS. *(sketch, all three rounds; 021's placement carried)*
- **D-02:** **FINS loses its MODEL INFO tab.** Its text moves onto the GUIDE's cards verbatim (D-13); `fin-model-info.tsx` and the
  tab's tests go. The founder: *"we don't need both."*
- **D-03:** **Every other tab, viewer, sidebar and data panel is untouched**, and the GUIDE is a picture of the page's own numbers.
  VOLUME quotes the 51 cross-sections' litres as the page does (29.61 L on the Shortboard), never the quick estimator's own figure.

#### What a card is
- **D-04:** **One card per control or named choice, under the sidebar's headings, in the sidebar's order**, named as the page labels
  the control (`Center Thickness`, `Nose Tip · Tail Tip`, `Pin tips to · Deck`, `Scaled from center by`, `Add 5th/Center fin`). A
  choice is one card per option, as 021's vees. Pairs the page shows together (Nose Tip · Tail Tip, the two 12" fine-tunes) are one
  card with two windows; the two Thinning Starts are two cards; on RAILS one card stands for all three rails' control (drawn at the
  center, the tail where only the tail has it — Hard Edge, Scaled from center by); on FINS the Advanced cards show the forward fins'.
  *(sketch; his to overrule)*
- **D-05:** **The board's own value sits beside the name**, through the page's own formatters, *On this board* for a choice's
  active option, and a short word where the control does not apply: `Diamond & swallow only` (Depth), `—` (Tail Block on a pin or round),
  `Needs 8'0"` (McKee Longboard under eight feet). *(sketch, round one; round three for Depth)*
- **D-06:** **The cartoon is the page's own drawing with the ONE setting pushed**: the whole board in a strip, a dash-dot window on
  the part the control shapes, that part closer, the setting pushed by a stated amount in muted dashes beside the board as it is, the
  number dimensioned as the VIEWER reads it, and an HTML line under the drawing saying what the dashes show (*dashed · +1" nose
  rocker*). A card drawn as a setup or a model with nothing pushed says *drawn as · Thruster — McKee Gun*. The push amounts are the
  sketch's (`18-GUIDE-WORDS.md`, last section): ROCKER centre +1/2", tips +3/8", a 1/2" deck skin, a start at 24", the 12" fine-tunes
  ±1/4", +1" of nose or tail rocker, a maker's bend +1/2" from 18"; TEMPLATE, RAILS, VOLUME and FINS as `pages-data.ts` PUSH. *(sketch)*
- **D-07:** **Each page's own kind of drawing:** ROCKER the side view in its blank (foam shade, baseline, thinning marks); TEMPLATE
  the outline from above, nose left in the card; RAILS the board from above with its three stations and the cross-section at one of
  them, the bands in `rail-section-plot.tsx`'s colours and the finished rail in ink; VOLUME the plan from above and the center
  cross-section from RAILS (the page has no drawing); FINS the tail's last 24" from above, the fins as lines from trailing to
  leading edge with the VIEWER's dots. The tail shapes are each drawn on the open board; the wing cards draw the board with the wing the WINGS
  button would add first; every fin setup and model is drawn on the open board's tail. *(sketch)*
- **D-08:** **Dimension lines sit outside the board** the drafting way: on FINS off-tail just below the rail at the fin's own station,
  toe-in at the upper fin's leading edge against a dashed reference through its trailing edge and labelled nose-ward, the base above
  the upper fin, off-rail on the tail side of its line; on TEMPLATE a tip's label inset so it never clips the window and a length under
  the board. *(sketch, round three — learned by collision)*
- **D-09:** **Two sentences and a How to shape note**: what it is and looks like (ink), what it does (muted, same paragraph), the note
  under a dashed rule. **All words live in `18-GUIDE-WORDS.md`** and the code's words module is tested against it line for line
  (Phase 17's `bottom-guide-words.test.ts` pattern). First drafts for his pen, except FINS' notes (D-13).
- **D-10:** **Informational only** — nothing on a card can be pressed, nothing changes the board. *(021/Phase 17's rule)*

#### Round three's rulings
- **D-11:** **Depth belongs to a diamond or a swallow alone.** The card says so; on any other tail it is tagged `Diamond & swallow
  only`, writes *no depth on a squash tail* inside the board on the drawing, and draws the board as a swallow in dashes with the depth
  dimensioned (the `tail_swallow` push); a diamond's or swallow's own depth is pushed. The founder: *"say so."*
- **D-12:** **FINS runs setup by setup**: Inputs · Convention · Single Fin · Twin · Thruster · 2+1 · Quad · Advanced, each setup's own
  card first and then its models or templates (Twin: Modern/Upright, Keel, Upright + Trailer; Thruster: Proportional, Basic (Half
  Rate), McKee Shortboard, McKee Gun — the quad's front pair uses them too; Quad: Basic - Spread, Basic - Off-Rail, McKee SB/Gun, McKee
  Longboard, Add 5th/Center fin). No cant card: the page has none.
- **D-13:** **MODEL INFO's words are on the cards verbatim**: fourteen *Model info* notes (the single, the twin's shared paragraph and
  each template's line, each front model's, the 2+1's, each rear model's — McKee Shortboard and McKee Gun share the same sentence), and
  a *Trailing-edge convention* card whose two sentences are that tab's first paragraph with the rounding grain said in the shaper's
  system (`finRoundingGrain`). The McKee Longboard card on a short board draws the McKee SB/Gun fallback the app would use and says so.

#### How it is drawn and laid out
- **D-14:** **Phase 17's dress, one shared card.** Border `surf-line-faint` (`surf-line` when *On this board*), the name row with the
  10/800 accent caps tag, the 13px/1.45 paragraph with the ink `<b>`, the dashed rule, the *How to shape* caps, Phase 17's grid rule
  (`repeat(auto-fill, minmax(max(236px, calc((100% - 16px) / 3)), 1fr))`: three across from about 1200 dots, two below, one on a phone).
  Built as `components/guide/` (a `GuideCard`, a `GuideTab` with the intro and groups, a `GuideCartoon` frame: strip + window + detail
  + caption) so BOTTOM can adopt it later; a *Model info* block is the one addition to 17's card.
- **D-15:** **The cards scroll inside the folder; the page never scrolls.** On a phone one card across inside the pinned drawing area;
  a phone held sideways gets the desktop shell by width. Where the page stands the board nose up (TEMPLATE on a fine pointer, every
  page on an upright phone in the sketch) the strip may turn with it; the detail stays readable either way. *(sketch; width alone picks
  the layout, as the app's rule says)*
- **D-16:** **Every push is live geometry**, computed from the design store's board with one field changed, memoised per card, so
  switching boards or moving a slider redraws the cards; nothing is precomputed into fixtures. The composing helpers (a variant of the
  board with one field pushed, the window's fit) live in `lib/geometry/` with tests; SVG drawing stays in components.
- **D-17:** **Rule 2 in every figure**: tags, dimension labels, captions and the Convention's grain through `units.ts` and the pages'
  formatters (dims cm to one decimal, marks whole mm, litres the same); a mark pushed in Metric reads a round millimetre figure, never
  a converted fraction.
- **D-18:** **The viewers' grammar and palettes only**: one ink, the stringer's `16 4 4 4`, stations `5 4`, widepoint `2 3`, the
  cutting line's dash-dot, muted dashes for a push, the apex and band colours RAILS already uses; no new hue; Inter.

#### Coordination and shipping
- **D-19:** **Phase 17 lands separately.** Its branch (`claude/beautiful-fermi-ad3fb7`, 13 of 16 plans) rewrites `fin-placement-editor`,
  `fin-viewer`, `rail-band-editor`, `rail-controls`, `site-nav`, `design-store` and others. Phase 18 adds a tab and a panel to each
  editor with the smallest possible touch and keeps its own code in `components/guide/` and `lib/geometry/guide-*.ts`; the merge
  conflicts after are expected and resolved by whichever lands second. A follow-up todo asks Phase 17's BOTTOM GUIDE to adopt the
  shared card.
- **D-20:** **One go-live gate** (R13): `npm test`, `npm run lint`, `npm run build` from the main checkout, the full `npm run test:e2e`
  read to its EXIT line, re-recorded desktop baselines reviewed, then push to `main`, the Vercel deploy confirmed by a server-rendered
  marker, and the founder's own look on his phone. Executors work in their own worktrees; the founder's checkout and port 3005 are his.

### Claude's Discretion
CONTEXT.md has no separate "Claude's Discretion" section. The UI-SPEC marks its own "(Claude's discretion — founder may overrule)" items (nose-left cartoons never turned, `guidePush(system)` round Metric pushes, `--outline-push-line` at 75 %, muted-ink captions and 10-dot drawing text pinned in screen dots, the app's 45-degree dimension tick, GUIDE pinned at 66dvh on every page with `growOnShortScreen`, a focusable scroller, the two written ROCKER captions) — research treats them as recommended defaults, not locks.

### Deferred Ideas (OUT OF SCOPE)
**Not in this phase:** tappable cards; BOTTOM's GUIDE (Phase 17); SUMMARY, 3D or home-page guides; editing words in the app; printing
a guide; any change to a page's calculations, viewers, sidebars, data, saved boards, presets or litres.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| R1 | GUIDE last tab on all five pages; MODEL INFO removed | Finding 1 (per-editor touch table); Finding 5 (the strip does NOT fit at 360/375 as written — measured); Finding 6 (MODEL INFO sweep) |
| R2 | 84 cards under the sidebar's headings | Finding 9 (the words page parses cleanly to 22 / 14 / 17 / 8 / 23 = 84; ids need page + group + name because names repeat) |
| R3 | Board's own value beside the name | Finding 2 (store fields per page), Finding 3 (formatters and the `isQuadRearModelAvailable` / `tailBlockPinned` / `tailAnglePinned` flags) |
| R4 | Page's own drawing, one setting pushed | Finding 4 (drawing code, tokens, `DimensionLine`), sketch source `cardFrame` |
| R5 | Pushes are real geometry | Finding 3 (exact signatures + the push → field → function table), Finding 8 (cost: 3-21 ms per page in Node) |
| R6 | Two sentences, How to shape, 14 Model info, words page tested | Finding 9 (parse recipe, 14 info notes verified verbatim against `fin-model-info.tsx`) |
| R7 | Informational only | Pitfall 12; Phase 17's "no button, no handler" source test, replicated |
| R8 | Phone and computer layout | Finding 1 (VOLUME pin measured), Finding 5 (strip), `design-screen-shell.tsx` branches |
| R9 | FINS by setup; MODEL INFO gone | Finding 6, Finding 9 |
| R10 | Depth a diamond's / swallow's alone | Finding 3 (`TAIL_PRESETS.swallow` 3" crotch depth = the words page's `as a swallow, 3" deep`) |
| R11 | Rule 2 in every figure | Open Question 2 (about 40 prose lines carry Imperial figures), Finding 3 (Metric push rounding), `units-isolation.test.ts` walk (Finding 7) |
| R12 | Nothing else moves | Finding 6/7 (the existing specs and the five baselines that must change on purpose), Finding 10 |
| R13 | Checked, pictured, one gate | Validation Architecture |
</phase_requirements>

## Summary

The phase is **low-risk on maths and high-risk on integration**. Every push the sketch drew is a call to a function that exists today with a stable signature, and Phase 17's branch only adds optional fields to the ones Phase 18 calls (Finding 10). Working all of a page's pushes costs 3-21 ms in Node per page (Finding 8), so the contract's lazy drawing is **not needed for the maths**; the DOM is the only cost worth watching (an 84-card, 6,300-node page measured 21 ms to build and 53 ms to lay out on a desktop Chromium, about 96 ms + 263 ms under a 4x CPU throttle, so roughly a quarter of that per page).

Three findings the planner must not walk past: **(1)** the five-tab ROCKER strip does not fit a 360- or 375-dot phone *with the board's name's own 14-dot rim*: measured, the name box cannot shrink below 14 dots, so ROCKER overflows the page sideways by 16 dots at 360 and about 1 at 375, and RAILS by 8 at 360; the existing `e2e/board-name-band.spec.ts` (p1, p1b, d1) pins the opposite, and VOLUME's strip becoming tappable moves its phone card down 9 dots and breaks the `phone-chrome.spec.ts` VOLUME block. **(2)** VOLUME's pinned GUIDE needs **no shell change**: the "simpleSidebar without none" branch was measured working. **(3)** About 40 prose lines in the founder's words page carry Imperial figures ("a quarter inch", `4 1/2" to 6"`, "12 inches") and the words page notes a Metric reading only for the Convention grain, while R11 says "figure-carrying sentence"; this needs the founder's word before the words module is written.

**Primary recommendation:** Build maths-first like Phase 17: (a) the words module + its page-reading test and the `guidePush`/tag/caption/variant helpers in `lib/geometry/guide-*.ts` with unit tests; (b) the shared `components/guide/` card, tab and frame; (c) the five thin editor touches (each is a type union, a tab entry, a panel branch, a conditional `phonePinned` / `growOnShortScreen` / `compactOnPhone`); (d) the existing-spec rewrites, the new `e2e/guide.spec.ts`, and the five re-recorded baselines; (e) the go-live gate. Keep every formula in `lib/geometry/`, read every tag from the store's derived values, and key every per-card memo on a stable store object.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| One-field-changed variants of the open board (pushes) | Pure geometry module (`lib/geometry/guide-*.ts`) | — | Rule 1: formulas live in `lib/geometry/`, pure, tested; the sketch's readers (`board-data.ts`, `pages-data.ts`) already compose the app's own functions |
| Tag / caption text, Metric push amounts | Pure geometry module | — | Rule 2: only `units.ts` + `measure-display.ts` convert; keep them pure so the Shortboard tags test against the words page |
| Window / strip fit, dimension positions, path strings | Pure geometry module (`guide-draw.ts`) | — | Arithmetic is formula; Phase 17 put its `guideCartoon` path builder in `lib/geometry/bottom-draw.ts` for the same reason |
| Card / tab / cartoon painting | Client components (`components/guide/`) | — | Paints what the pure module returns; the only React state is the per-card memo and one width observer |
| Words | Data module (`components/guide/guide-words.ts`) | `18-GUIDE-WORDS.md` is the source | Tested line for line against the page (Phase 17 pattern) |
| Tab strip, pin, short-screen rules | Existing `TabbedPanel` + `DesignScreenShell` | each editor | One more `PanelTab` per editor; layout switches unchanged (width = layout, pointer = size, height = short screen) |
| Board values (outline, blank, rails, volume, fins) | Design store (`useDesign()`), read-only | — | The GUIDE never writes; every derived value (`sideProfile`, `railBands`, `quotedVolumeLitres`, `finPlacement`) is already memoised there |
| Saved boards, DB, auth | none | — | No database change; the GUIDE adds no persistence |

## Standard Stack

### Core (all existing; **no new package is installed**)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.3.6 | App Router host | [VERIFIED: package.json `"next": "16.3.6"`] |
| react / react-dom | 19.2.8 | components, `memo`, `useDeferredValue` | [VERIFIED: package.json] |
| tailwindcss v4 | existing | `max-shell:` / `coarse:` / inline `[@media(max-height:500px)]` switches | [VERIFIED: CLAUDE.md Stack] |
| vitest | existing | unit tests; `include: ["lib/**/*.test.ts", "components/**/*.test.ts"]` | [VERIFIED: vitest.config.ts:6] |
| @playwright/test | existing | browser tests; Chromium + WebKit launched fine this session | [VERIFIED: ran both] |
| tsx | existing (`node_modules/.bin/tsx`) | scratch timing scripts, never shipped | [VERIFIED: ran it] |

### Supporting (all in-repo, all read this session)
| Module | Use |
|--------|-----|
| `components/viewer/tabbed-panel.tsx` (`TabbedPanel`, `PanelTab`) | one more tab per page; `growOnShortScreen`, `compactOnPhone`, `trailing` |
| `components/viewer/callout-primitives.tsx` (`DimensionLine:398`, `DimensionTick:365`, `pinnedCalloutSizes:102`, `useSvgFitScale:153`, `MIN_PINNED_FIT_SCALE:311`) | dimension lines and pinned 10-dot text |
| `components/rails/rail-section-plot.tsx` (`RAIL_SEGMENT_COLORS`, `RAIL_APEX_CENTER_COLOR`) | RAILS band / apex colours |
| `lib/geometry/measure-display.ts` (`formatDim:63`, `formatMark:81`, `formatLength:210`, `formatSignedDim:177`, `formatSignedMark:195`, `formatArea:222`, `stationLabel:253`) | every figure a shaper reads |
| `components/design/board-name-copy.ts` (`bandBoardName`) | the intro's board name (see Pitfall 11) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 84 per-card `useSvgFitScale` ResizeObservers | one observer on the GUIDE scroller giving `innerWidth / 300` to every cartoon through context | Every cartoon shares the 300-wide viewBox, so fit is one number per column width; 1 observer instead of 84 |
| JS lazy drawing (UI-SPEC §8) | build all cards of the open page at once (default); add `content-visibility: auto` or an IntersectionObserver wrapper **only around `<GuideCartoon>`** if the browser timing in Finding 8 exceeds budget | Maths is 3-21 ms/page, so lazy drawing buys DOM time only |

**Installation:** none.
**Version verification:** not applicable (no package added). `npm view` was not run because nothing is installed.

## Package Legitimacy Audit

This phase installs **no external packages**. `Packages removed due to [SLOP] verdict:` none. `Packages flagged as suspicious [SUS]:` none. Registry Safety (UI-SPEC): shadcn official, no new block.

## Architecture Patterns

### System Architecture Diagram

```
 design store (useDesign) ──── outline / blank / foil / rocker / effectiveRails / effectiveVolume / effectiveFins
        │                          + derived: outlineGeometry, sideProfile, railBands, finPlacement, wingFinEdges, quotedVolumeLitres
        ▼
 GuideTab (per page, mounted only while GUIDE is the active tab)
   ├─ reads units system (useUnits) ── guidePush(system) ──► amounts (Imperial inches / Metric round mm|cm)
   ├─ for each card id in guide-words (84, in page order):
   │      guideTag(id, board, system)        ──► { kind: on|value|na|none, text }      [pure, lib/geometry]
   │      guideCaption(id, board, system)    ──► { kind: dashed|drawnAs|none, text }   [pure]
   │      variantFor(id, board, system)      ──► the board with ONE field changed, via the app's own maths
   │                                              (designSideProfile | buildOutline+TAIL_PRESETS+nextWing |
   │                                               computeRailSectionOutput+finishedRail | computeVolume |
   │                                               computeFinPlacement+resetAdvanced)   [pure, memoised: WeakMap on a store object]
   │      guideCartoonShapes(id, base, variant, fit) ──► path strings / lines / label boxes in a 300×H viewBox [pure]
   ▼
 GuideCard (memo) = name row + tag · figure (SVG, aria-hidden) + HTML caption · 2 sentences · [Model info] · How to shape
        ▲                    ▲
   one ResizeObserver     words: components/guide/guide-words.ts  ◄── tested line-for-line against 18-GUIDE-WORDS.md
   on the scroller (fit)
 Strip + pin: TabbedPanel gains {id:"guide", label:"GUIDE"}; shell gets phonePinned="66dvh" and growOnShortScreen only while GUIDE is active
```

### Recommended Project Structure
```
components/guide/
├── guide-words.ts          # 84 cards: { id, page, group, name, is, does, info?, how } — from the page
├── guide-words.test.ts     # reads 18-GUIDE-WORDS.md (found by name under .planning/, Phase 17's findPage)
├── guide-tab.tsx           # intro + groups + <ul role="list"> grid; scroller role="region" tabIndex=0
├── guide-card.tsx          # memo'd card (shared dress)
├── guide-cartoon.tsx       # paints guide-draw's shapes; no formulas, no Math.sin/cos/...
└── guide-copy.ts           # tab word, "On this board", "How to shape", "Model info", intro templates, guideBoardName rule
lib/geometry/
├── guide-push.ts           # guidePush(system)
├── guide-rocker.ts | guide-outline.ts | guide-rails.ts | guide-volume.ts | guide-fins.ts   # variant builders (+ .test.ts each)
├── guide-tag.ts | guide-caption.ts                                                           # (+ .test.ts)
└── guide-draw.ts           # window fit, strip fit, dimension placement, path strings (+ .test.ts)
```
Pure files import `lib/geometry/units` (for `inchesToMm`) and `measure-display`, never React or the browser.

### Pattern 1: A per-page memo keyed on a stable store object (Phase 17's WeakMap)
**What:** `const drawn = new WeakMap<object, Map<string, Variant>>()`; key = the page's input object whose identity changes only when one of its fields does; inner key = `${system}|${cardId}`.
**When:** every page. Inputs that already change identity exactly when needed: TEMPLATE `outlineGeometry` (+ `wingFinEdges`); ROCKER an object built by `useMemo` over `{ outline, rocker, foil, blank }` (the store memoises `foil`, replaces `state.blank` on every blank edit); RAILS `effectiveRails` + `sideProfile.effectiveFoil`; VOLUME `effectiveVolume`; FINS `effectiveFins` + `finImportedTail`.
**Example:** [CITED: Phase 17 `bottom-cartoon.tsx`, scratch copy]
```typescript
const drawn = new WeakMap<BottomBoard, Map<string, GuideCartoon>>();
function cartoonFor(cut, board, geometry, rule) {
  let ofBoard = drawn.get(board);
  if (!ofBoard) { ofBoard = new Map(); drawn.set(board, ofBoard); }
  const key = `${rule}|${cut.section}|${"name" in cut ? cut.name : "channels"}`;
  let cartoon = ofBoard.get(key);
  if (!cartoon) { cartoon = guideCartoon(cut, board, geometry, rule); ofBoard.set(key, cartoon); }
  return cartoon;
}
```

### Pattern 2: A push is the board with exactly one field replaced, through the real function
**What / examples (the sketch's own readers, exact calls the app will make)** [VERIFIED: sketch `board-data.ts`, `pages-data.ts` in `research-src/`; signatures re-read in `lib/`]:

| Page | Push → the one field changed | Real function |
|------|-----------------------------|---------------|
| ROCKER | `foil.center + 12.7`; `foil.noseTip`/`tailTip + 9.525`; `blank.placement = placementRange(copy.lengthMm, outline.length).max` (`null` variant when `max ≤ 0.5 mm`); `blank.deckSkin = 12.7`; `blank.tipStyle` `"pinDeck"`/`"bottom"`; `blank.noseThinningStart`/`tailThinningStart = max(24", automaticStart + 8")`; `blank.nose12Offset`/`tail12Offset ± 6.35` (+ `fineTuneSurface`); `blank.rocker = { changes: [{ end, amount: 25.4 }] }`; the maker's bend `{ end:"nose", amount: 12.7, fromTip: 457.2 }` | `designSideProfile(fields, LIVE_DESIGN_RULES)` (design.ts:307) |
| TEMPLATE | `length +152.4`, `noseAngle +20`, `noseFullness +30`, `widePointWidth +25.4`, `widePointOffset +76.2`, `tailRailLength`/`noseRailLength +30`, the five tails through `TAIL_PRESETS[kind]` (`tail`, `tailAngle`, `tailFullness`), `tail.endWidth +50.8`, `crotchDepth`/`depth +25.4`, `tailAngle +25`, `tailFullness +30`, wings through `nextWing([], edges, geometry, system)` then `{ ...wing0, depth / run / station / radius / finOffset }` | `buildOutline(spec)` (outline.ts:243) |
| RAILS | one `RailSectionSpec` field (`boardThickness +6.35`, `deckPercent 85`, `family`, `ratioTopPercent`, `symmetrical`, `singleTuck`, `sharpBottomTuck`, `scaleFromCenter 0.7`, `nudges.*`) or the tail's `hardEdge` flag | `computeRailSectionOutput(key, spec, hardEdge)` (rail-bands.ts:910) then `finishedRail(output, mm(min(x0, output.bounds.xAxisMin)))` (finished-rail.ts:526), `x0` = the min `xAxisMin` of the **base** board's three sections |
| VOLUME | `length +152.4`, `width +25.4`, `centerThickness +6.35`, each of the seven `boardTypeIndex` | `computeVolume({ length, width, centerThickness, boardTypeIndex, importTemplateDimensions:false, importRailThickness:false }, null, null)` (volume.ts:396) — the tag itself is the **store's** `quotedVolumeLitres`, never recomputed |
| FINS | each `FIN_SETUPS` value, each `THRUSTER_FRONT_MODELS`, `QUAD_REAR_MODELS`, `TWIN_TEMPLATES`, the fifth box, and `advanced.*` (`baseLenForward/Center/Rear + 25.4` with their `…Overridden: true`, `forwardPositionOffset`/`centerPositionOffset`/`rearPositionOffset + 25.4`, `forwardOffRailNudge`/`rearOffRailNudge − 12.7`, `forwardToeOverride`/`rearToeOverride = 12.7`) each set with `advanced: resetAdvanced(setup, twinTemplate)` | `computeFinPlacement(spec, importedTail)` (fins.ts:1579) |

### Anti-Patterns to Avoid
- **Re-deriving a litres figure for a tag.** Read `quotedVolumeLitres` from the store (Phase 17's branch changes how that figure is worked; a recomputation would drift).
- **`L < 96 * 25.4` for the McKee Longboard "Needs".** Use `isQuadRearModelAvailable("mckeeLB", boardLength)` (fins.ts:335): it compares millimetres on purpose (`MIN_MCKEE_LONGBOARD_QUAD_LENGTH` is `2438.3999999999996`).
- **A tail test by kind.** Read the geometry's own flags: `tailBlockPinned` (outline.ts:254, `tail.kind === "pin" || tail.kind === "round"`) and `tailAnglePinned` (outline.ts:255, `tail.kind === "diamond"`).
- **A `phonePinned="none"` GUIDE** (lets the page scroll as a whole).
- **A nested `TabbedPanel`** for anything.
- **Any `Math.sin/cos/tan/atan2/sqrt/pow/hypot`, `innerWidth`, `matchMedia`, `window.`, `document.` in a guide component** — Phase 17's source test forbids them; copy the test.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A figure a shaper reads | `toFixed`, `* 25.4`, a fraction formatter | `formatDim` / `formatMark` / `formatLength` / `formatSignedDim` / `formatSignedMark` / `formatArea` / `stationLabel` | Rule 2; `lib/units-isolation.test.ts` walks screen folders and bans raw factors |
| The `12"` in a card name or label | a literal `12"` | `stationLabel(system)` (`12"` / `30.5 cm`) | two card names carry it (`Nose @ 12" · Tail @ 12"`, `Board Thickness · Thickness @12"`) |
| The fin rounding grain | a literal | `finRoundingGrain(system)` (fins.ts:1372) | `return system === "metric" ? "millimetre" : '1/16"'` |
| A dimension line | the sketch's flat bars | `DimensionLine` / `DimensionTick` (they read zoom/size contexts that default to 1 / unpinned) | same drafting look as every viewer |
| The first wing | a guessed wing | `nextWing([], wingFinEdges, outlineGeometry, system)` (wings.ts:663) | it places at the front fin's trailing edge (or 11"), and its radius depends on the **system** (`wingRadiusTop(w, system)`:641 — a 1/16" grid in Imperial, 1 mm in Metric) |
| A thinning start | a bare 24" | clamp through `thinningStartRange(length)` (tip-taper.ts:92: 6" to half the length on the half-inch grid) | the sketch's `max(24", automaticStart + 8")` is unclamped |
| The McKee Longboard fallback | a second code path | `computeFinPlacement` already applies `effectiveQuadRearModel` (fins.ts:346) | the SB/Gun fallback happens inside the real function |
| Words text | inline strings in components | `guide-words.ts` | the founder edits one page; one test enforces it |
| A scroller keyboard rule | a custom handler | `role="region"`, `aria-label`, `tabIndex={0}` | UI-SPEC §9 |

**Key insight:** every number on a card is either read from the store or produced by a function the app already ships; the only new arithmetic is layout (window fit, label placement), and that belongs in `lib/geometry/guide-draw.ts`.

## Research Findings (the ten planning questions)

### Finding 1 — The five editors' strips and the smallest touch for each

[VERIFIED: files read this session; line numbers are this worktree's]

| Page | Tab id union / list | Panel branch | Other props to change | Notes |
|------|--------------------|--------------|-----------------------|-------|
| TEMPLATE `components/outline/outline-editor.tsx` | `type TemplateTab = "viewer" \| "wings";` (:26) → add `"guide"`; `templateTabs` array (:123-126) → append `{ id: "guide" as const, label: "GUIDE" }` | the `activeTab === "wings" ? <WingsPanel/> : viewerContent` ternary (:388) → a `guide` branch | `compactOnPhone="drawing"` (:383) → `activeTab === "guide" ? "text" : "drawing"`; add `growOnShortScreen={activeTab === "guide"}`; `phonePinned="66dvh"` (:431) already right | the sidebar swap is `activeTab === "wings" ? <WingControls/> : <OutlineControls/>` (:344): GUIDE keeps `OutlineControls`; the dev footer test `activeTab === "viewer"` (:418) is left alone |
| ROCKER `components/rocker/rocker-editor.tsx` | `RockerTab` in `rocker-live-controls.ts:34` `"viewer" \| "planing" \| "datasheet" \| "topView"` → add `"guide"`; **both** lists `ROCKER_TABS` (:104) and `ROCKER_TABS_SMALL_SCREEN` (:119) get `{ id: "guide", label: "GUIDE" }` (no `shortLabel`) | the ternary chain `viewer ? … : topView ? … : planing ? … : <RockerDatasheet/>` (:320-:455) → insert `guide` **before** the final `else` | `compactOnPhone` (:316) → `"text"` for `guide` too; `growOnShortScreen` while guide; `phonePinned="66dvh"` (:466) already right | `activeTab` is derived (:216): GUIDE is in both lists, so crossing 820 dots keeps it. `liveControls("guide")` falls into its **all-live** default branch (rocker-live-controls.ts:66-104: only `datasheet` and `topView` differ), so every sidebar control stays live — add `"guide"` to the array in `rocker-live-controls.test.ts:76` |
| RAILS `components/rails/rail-band-editor.tsx` | `type RailPage = "viewer" \| "data" \| "instructions";` (:20) → add `"guide"`; the inline `tabs=[…]` (:338-342) | a new `{activePage === "guide" && …}` block beside `:576-:586` | `phonePinned={activePage === "instructions" ? "none" : "50dvh"}` (:288) → `"66dvh"` while guide; `growOnShortScreen` is already passed always (:350); `compactOnPhone` (:354) already `"text"` for non-viewer | the controls wrapper (:290) and `phoneSection` (:318) are untouched; the plot-fit `useLayoutEffect` depends on `activePage` (:251) harmlessly |
| VOLUME `components/volume/volume-estimator.tsx` | the one-element `tabs` (:50) gains a second; add `useState<"estimate" \| "guide">`, `active={…}`, `onSelect` | `VolumeCalculationCard` vs the guide | `phonePinned` (:68, today `"none"`) → `activeTab === "guide" ? "66dvh" : "none"`; `growOnShortScreen` while guide; keep `panelClassName="overflow-y-auto"` | **`interactive = typeof onSelect === "function" && tabs.length > 1` (tabbed-panel.tsx:144)**: ESTIMATE stops being a `<span>` and becomes a `<button role="tab">` (see Pitfall 7) |
| FINS `components/fins/fin-placement-editor.tsx` | `type FinTab = "viewer" \| "data" \| "info";` (:20) → `"viewer" \| "data" \| "guide"`; `TAB_LABEL` (:22) and `TAB_ORDER` (:23) | `{activeTab === "info" && <FinModelInfo />}` (:159) → the guide branch; delete the `FinModelInfo` import (:13) | `phonePinned="55dvh"` (:190) → `"66dvh"` while guide; `growOnShortScreen` while guide; `compactOnPhone` (:124) already `"text"` for non-viewer | |

`TabbedPanel` API [VERIFIED: tabbed-panel.tsx:58-143]: `tabs`, `active`, `onSelect`, `children`, `panelClassName`, `bare`, `growOnShortScreen`, `compactOnPhone: "drawing" | "text"`, `trailing`. The tab button class is `"rounded-t-lg border px-[18px] py-1.5 text-xs font-display font-bold tracking-architectural uppercase"` (:153) with `max-shell:px-2` under `compactOnPhone` (:165). `growOnShortScreen` adds `[@media(max-height:500px)]:min-h-fit` to both card layers (:251, :283). The shell's `PhonePinned` is `"66dvh" | "55dvh" | "50dvh" | "none"` (design-screen-shell.tsx:33), so every pin the plan needs already has its literal class (`PHONE_PINNED_MAX_HEIGHT_CLASS`, :58-62).

**Wide View and the GUIDE.** TEMPLATE and ROCKER render `bare={wideView}` and wide view can only be turned on from a VIEWER (or WINGS) toolbar, so GUIDE and a bare panel never coincide; nothing to guard.

**VOLUME's pinned phone GUIDE — measured, no shell change needed.** The shell's "simpleSidebar without none" branch (design-screen-shell.tsx:87-91, commented "no current caller exercises this combination") was exercised in a real page by swapping the root / aside / main classes to exactly what `phonePinned="66dvh"` + `simpleSidebar` would emit and adding a 6,000-dot stand-in inside the card [MEASURED: Chromium + WebKit, dev server 3123, 2026-11-09]:

| Viewport | Today (ESTIMATE, nonePinned) | Pinned 66dvh (simple, not none) |
|----------|------------------------------|----------------------------------|
| 390 × 664 | root scrolls (scrollH 921 in a 616 box); main 413 | **main 438 (= 66dvh), root scrollH 616 = its height (no page scroll), document scrollH 664 = window; aside 178 tall, scrollH 507, `overflow-y: auto`** (Chromium and WebKit identical) |
| 360 × 640 | root scrollH 958 | main 422 (66dvh), root 592/592, aside 170 scrolls |
| 844 × 390 (sideways, desktop shell) | aside scrolls | unchanged |

The aside already carries `flex-1`, `min-h-0`, `overflow-y-auto` in that branch (:90-91), so the UI-SPEC's proposed "`max-shell:flex-1 overflow-y-auto` on the aside" **already exists**. The fallback in UI-SPEC §6 is not needed. Cost to know: the aside keeps its `p-10` on a phone, so at 390 × 664 the controls get 178 dots (about 97 after padding) under a pinned 438-dot GUIDE; that is the same padding ESTIMATE has today and is not a regression. `data-design-page-scroll` / the root's `max-shell:overflow-y-auto` toggle with `phonePinned`, but the aside stays one element, so no remount. A pinned card does **not** need `max-shell:h-[calc(66dvh-40px)]` to hold 66dvh when its content is taller (the main's `max-h-[66dvh]` caps it; measured 438 = 66 % of 664); the explicit calc is only belt and braces for tabs whose content is short, and the UI-SPEC's own test ("card at least 66dvh − 41") should be kept because it proves the strip arithmetic.

### Finding 2 — The design store and what each card needs

[VERIFIED: design-store.tsx:304-575 (interface), :1085-1270 (derived memos), :1886 `useDesign`]

| Page | Read from `useDesign()` | Stable memo key |
|------|-------------------------|-----------------|
| TEMPLATE | `outline` (`OutlineSpec`, `wings?`), `outlineGeometry`, `baseOutlineGeometry`, `wingFinEdges` (`{front, rear}`), `finPlacement.marks` (the Lock card draws the fins) | `outlineGeometry` object |
| ROCKER | `outline.length`, `rocker`, `foil` (memoised at :662), `blank: BoardBlank \| null`, `sideProfile`, `preparedBlank` | a `useMemo`'d `{ outline, rocker, foil, blank }` |
| RAILS | `effectiveRails`, `railBands`, `sideProfile.effectiveFoil`, `outlineGeometry` (station half-widths), `railsImportFoilThickness`, `rails.tailHardEdge*` | `effectiveRails` |
| VOLUME | `effectiveVolume`, `volumeResult`, `templateValues`, `railValues`, `quotedVolumeLitres`, `crossSectionVolume` | `effectiveVolume` |
| FINS | `effectiveFins`, `finImportedTail`, `finPlacement`, `finTailOutline`, `outlineGeometry`, `finsImportTemplate` | `effectiveFins` + `finImportedTail` |

`designSideProfile(fields, rules)` (design.ts:307) re-runs `prepareBoardBlank(blank, rules.prepare)` on every call; measured 0.0-0.2 ms, so using it directly (as the sketch did) is fine and keeps ROCKER's push on the "one recipe". `DesignSummaryFields` is `{ outline, rails, foil, railsImportFoilThickness, volume, rocker?, blank? }` (design.ts:206-217); `designSideProfile` takes `Pick<…, "outline" | "rocker" | "foil" | "blank">`.

The fixtures for unit tests: `phase16Boards()` (`lib/geometry/__fixtures__/phase16-boards.ts:40`, labels `${preset.id}|asis|hard` / `soft`) uses `recordedPresetDesignFields`. For **Shortboard, Fish and Midlength the recorded blank equals the live preset's blank**; the **Longboard does not** (`9'3"Y` recorded, `9'4"B` live) [MEASURED: `presetDesignFields` vs `recordedPresetDesignFields`]. So unit and browser tests on "the Shortboard and the Fish" (R13) agree with the words page; do not write a Longboard tag test against the page.

### Finding 3 — Geometry signatures, constants and the fields a card pushes

[VERIFIED: each read this session; quotes verbatim]
- `board.ts:152` `export const TAIL_PRESETS: Record<TailShape["kind"], TailPreset>` with keys `pin`, `round`, `diamond`, `squash`, `swallow`; `swallow: { tail: { kind: "swallow", endWidth: inchesToMm(8), crotchDepth: inchesToMm(3) }, tailAngle: degrees(30), tailFullness: 0 }` — the 3" crotch is the words page's `as a swallow, 3" deep`.
- `wings.ts:663` `nextWing(wings: readonly Wing[], edges: WingFinEdges, g: WingPlacementGeometry, system: UnitsSystem): Wing`; `wings.ts:641` `wingRadiusTop(w: Pick<Wing,"run"|"depth">, system: UnitsSystem): Mm`; `Wing = { station, depth, run, radius, lock, finOffset }` (:78-85); `WingLock = "front-trailing" | "rear-trailing" | null` (:67).
- `fins.ts:323` `export const MIN_MCKEE_LONGBOARD_QUAD_LENGTH: Mm = inchesToMm(96);` — formatted `243.8 cm` in Metric and `8'0"` in Imperial [MEASURED: `formatLength(…, "metric")` → `243.8 cm`; the constant is `2438.3999999999996`]. `fins.ts:335` `isQuadRearModelAvailable(model, boardLength)`; `:346` `effectiveQuadRearModel`.
- `fins.ts:1493` `resetAdvanced(setup: FinSetup, twinTemplate: TwinTemplate): FinAdvancedSpec`; `:1579` `computeFinPlacement(spec: FinPlacementSpec, importedTail: ImportedFinTail | null = null): FinPlacementResult`; `FIN_SETUPS` values `"single" | "twin" | "thruster" | "2plus1" | "quad"` (:438-444); `TWIN_TEMPLATES` values `"upright" | "keel" | "trailer"` (:432-436); `THRUSTER_FRONT_MODELS` values `"proportional" | "basic" | "mckeeSB" | "mckeeGun"` (:307); `QUAD_REAR_MODELS` values `"basic" | "basicOffRail" | "mckeeSB" | "mckeeLB"` with labels `Basic - Spread`, `Basic - Off-Rail`, `McKee SB/Gun`, `McKee Longboard` (:314-319).
- `FinMark` (fins.ts:177-): `{ role, side: -1|0|1, offTail, lateral, leadingOffTail, leadingLateral, baseLength, toe, lateralKind, lateralValue }` — **`lateral` and `leadingLateral` are already signed by the side** (the doc comment: "`lateral` is signed from the stringer (negative = left of centre)"); never multiply by `side`.
- `rail-bands.ts:910` `computeRailSectionOutput(key: RailSectionKey, sectionSpec: RailSectionSpec, hardEdge: boolean): RailSectionOutput`; `RailSectionSpec` (:191-) fields `boardThickness, deckPercent, family, ratioTopPercent, symmetrical, cornerCutOffsetOverride, removeCornerCut, singleTuck, sharpBottomTuck, bottomTuck3Override, scaleFromCenter, nudges`; `finished-rail.ts:526` `finishedRail(output: RailSectionOutput, x0: Mm): FinishedRail`.
- `volume.ts:396` `computeVolume(spec: VolumeSpec, template: VolumeTemplateValues | null, rail: VolumeRailValues | null): VolumeResult`; `VolumeSpec = { length, width, centerThickness, boardTypeIndex, importTemplateDimensions, importRailThickness }` (:109-116); `SIMPSON_PANEL_COUNT = 50` (:463) → the 51 cross-sections.
- `outline.ts:243` `buildOutline(spec: OutlineSpec): OutlineGeometry` (fields used by the sketch: `points`, `centreCloseStation`, `halfTailBlockWidth`, `tailBlockPinned`, `widePointStation`, `halfWidePointWidth`, `noseWidthAt12in`, `tailWidthAt12in`, `effectiveDiamondDepth`, `tailAngle`, `tailAnglePinned`, `wings`).
- `blank-fit.ts:197` `placementRange(blankLength, boardLength): { min, max }` — on the live presets the slide is Shortboard ±9/16", Fish ±1 1/8", Midlength ±1 3/8", Longboard ±1" [MEASURED].

**Formatter families** (measure-display.ts): dims `formatDim`/`formatLength`/`formatSignedDim` (cm one decimal; `formatLength(2438.4, "metric")` = `243.8 cm`); marks `formatMark`/`formatSignedMark` (whole mm: `formatMark(12.7, "metric")` = `13 mm`, `9.525` → `10 mm`, `6.35` → `6 mm`, `25.4` → `25 mm`) [MEASURED]. The Metric tag rules the UI-SPEC lists (Depth, Tail Block, McKee Longboard) are correct; **two more the sketch applied and the UI-SPEC omits**: Tail Angle on a diamond tag `—` with no push (`tailAnglePinned`), and Placement when the blank has no slide (the sketch's `placeNose` is `null` when `range.max ≤ 0.5 mm`) — see Open Question 6.

**Metric push amounts (R11, D-17).** `guidePush(system)` must return the amount **per family**, and the drawing and the caption must both use that one number: marks (rocker heights, rail marks, fin marks, wing depth/run/radius/offset, Depth) in whole millimetres — 1/2" → 13, 3/8" → 10, 1/4" → 6, 1" → 25, 3/4" → 19 or 20 (planner's choice, recorded), −1/2" off-rail → −13; dims (length, width, offset, block, wing position, Blends From/Ends At, VOLUME inputs) in a clean cm figure (6" → 15 cm, 1" → 2.5 cm, 3" → 7.5 cm, 2" → 5 cm, 4" → 10 cm), because a dim prints to 0.1 cm and `152.4 mm` would read `15.2 cm`. The words page lists millimetres (`18-GUIDE-WORDS.md` last section) — Imperial inches in the sketch.

### Finding 4 — The drawing code the cartoons reuse

[VERIFIED: files read this session]
- **Tokens**: `--outline-board-fill`, `--outline-station-line` (36 % muted), `--outline-blank-line` (60 %), `--outline-foam-shade` (24 %), `--outline-ink`, `--outline-ghost` (**55 %**, `app/globals.css:932`), `--outline-stringer-dash: 16 4 4 4`, `--outline-widepoint-dash: 2 3`, `--outline-station-dash: 5 4`, `--outline-dim-ink` (:941), `--outline-callout-label` (:942). All live in the **one** `:root` drawing block (opens :776) and derive from `--surf-*` tokens, so **a new `--outline-push-line: color-mix(in srgb, var(--surf-ink-muted) 75%, transparent)` goes once beside `--outline-ghost` (:932) and follows all four themes** with no per-theme copy (UI-SPEC §Color). Phase 17 adds nine lines to `globals.css`; insert on its own line to keep the merge trivial.
- **`DimensionLine`** (`callout-primitives.tsx:398`) draws the line plus two `DimensionTick`s (:365, 45-degree, `CALLOUT_TICK_SIZE = 4`) and an optional label whose style is hard-coded `fontSize: sizes.dim`, `fontWeight: 700`, `fill: "var(--outline-ink)"`. The UI-SPEC wants 10 px / 600 tabular `--outline-dim-ink`: draw the label with the guide's own `<text>` (or extend `DimensionLine` with an optional weight), and wrap each cartoon in `CalloutSizeProvider value={pinnedCalloutSizes(fit)}` (:102; `MIN_PINNED_FIT_SCALE = 0.66` at :311; `CALLOUT_PX = { value: 14, name: 11, dim: 14, … }` at :71 so the guide passes its own 10).
- **Pinned text idiom**: `useSvgFitScale(ref, vbW, vbH)` (:153) measures with a ResizeObserver; for 84 cartoons use **one** observer on the scroller (Alternatives table).
- **RAILS colours**: `RAIL_SEGMENT_COLORS` (`rail-section-plot.tsx:91`: `domedBand "#6b8e4e"`, `band1 "var(--color-surf-accent-ink)"`, `band2 "#b5563a"`, `hardEdge`/`*Conn` `"var(--color-surf-ink)"`, `tuck1 "#7d5ba6"`, `tuck2 "#3a6ea5"`) and `RAIL_APEX_CENTER_COLOR = "#a8425f"` (:105).
- **FINS marks**: the live viewer draws a mark as `stroke="var(--color-surf-accent-ink)"` `strokeWidth={2.5 * zoomUnit}` with a role dash (`"none"` / `"2 3"` stringer / `"8 4"` rail) (`fin-viewer.tsx:~687-704`); the sketch and UI-SPEC use 1.5, solid, round caps and the VIEWER's dots (`--outline-ink`). Phase 17 rewrites `fin-viewer.tsx` (+116/-5): **copy the constants, do not import from the viewer.**
- **ROCKER**: `rocker-view-frame.ts` exports `STATION_NAME_SIZE = 10` (:298), `THINNING_MARK_DASH = "4 3"` (:412), `BLANK_LINE_PX = 1` (:851); the sketch's `cardFrame` (`pages.js:22-40`) and ROCKER's `template.html` are the source of the strip + window + detail geometry; none of the viewer components are reused, only their tokens.

### Finding 5 — ROCKER's phone strip, measured

[MEASURED: Chromium and WebKit (identical numbers), dev server 3123, a fifth `<button>` "GUIDE" cloned from DATA into the live strip, 2026-11-09]

Tab widths on an upright phone (8-dot side padding, 6-dot gap, 12 px bold caps tracked 0.15 em): VIEWER 76.0, TOP 48.1, PLANING 84.8, DATA 57.2, **GUIDE 64.1**. The four existing tabs measure 284.1 (the file's own comment says 284); with GUIDE the row is **354.2**.

| Phone width | Strip band | ROCKER, five tabs: name box / name text / page overflow | RAILS (VIEWER · DATA · INSTRUCTIONS · GUIDE, 346.4): name box / text / overflow | TEMPLATE (257.3), VOLUME, FINS (~210) |
|---|---|---|---|---|
| 360 | 356 | **14 / 0 / 16 dots sideways** | **14 / 0 / 8 dots sideways** | name whole (59.5 box, "Untitled" 45.5) |
| 375 | 371 | **14 / 0 / ~1** | 18.6 / 4.6 / 0 | whole |
| 390 | 386 | 25.8 / 11.8 / 0 | 33.6 / 19.6 / 0 | whole |
| 412 | 408 | 47.8 / 33.8 / 0 | 55.6 / 41.6 / 0 | whole |

The name button is `px-1.5` + 1-dot borders (`board-name-tab.tsx`, `max-shell:px-1.5`), so its box cannot go below 14 dots whatever `min-w-0` says. Needed for five ROCKER tabs: 354.2 + 6 + 14 = **374.2 dots**, so 360 and (by 3) 375 cannot hold it. On a computer at **820** the same happens: ROCKER and RAILS with GUIDE leave the name 26 dots (text 0) and run 4 dots past the strip; at 1024 and 1280 the name is whole (71.5 box).

**The planner's choices** (the founder's call; R1 only promises "five tabs fit a 390-dot iPhone"): (a) give the trailing wrapper `overflow-x-clip` (`tabbed-panel.tsx:227` today `<div className="ml-auto flex min-w-0">`; `clip` keeps `overflow-y` visible so the 44-dot touch box `::after` is not cut; Safari 16+, older Safari leaves today's behaviour) so the page never scrolls sideways and the name simply vanishes below about 380 dots on ROCKER and about 370 on RAILS; this edits the markup pinned by `tabbed-panel.test.ts:123` (`/<\/div><div class="ml-auto flex min-w-0"><button>Fish<\/button>/`); or (b) in addition, a `shortLabel` for PLANING (about 25 dots) — the founder named the tabs, so not recommended without his word.

### Finding 6 — The MODEL INFO sweep

[VERIFIED: case-insensitive grep of `components`, `lib`, `app`, `e2e`, `CLAUDE.md`, `.claude`]
- **Component:** `components/fins/fin-model-info.tsx` (delete); imported at `fin-placement-editor.tsx:13`; `type FinTab … "info"` (:20), `TAB_LABEL` (:22), `TAB_ORDER` (:23), render (:159).
- **Comments to reword:** `components/viewer/tabbed-panel.tsx:125` and `:287` (lists "MODEL INFO" among tabs); `lib/geometry/fins.ts:1389` (the `finRoundingNote` comment: "the display layer (the order form, and FINS' MODEL INFO tab) appends this" — `finRoundingNote` itself stays, `order-form.tsx` uses it, and `fins.test.ts` tests it).
- **Specs that go or change:** `e2e/volume-fins-panels.spec.ts:287-313` the describe "FINS' MODEL INFO — the side panel's own headings" (and its header comment :14, :126) — delete or replace by the GUIDE's; `e2e/phone-chrome.spec.ts:807, 853, 897, 935` (`infoTab`, each followed by `assertTabTouchBox(infoTab, bounds)` at :831, :877, :915, :953 — repoint to the GUIDE tab) and `:1179` (`tabs: ["VIEWER", "DATA", "MODEL INFO"]`).
- **Baselines:** `e2e/desktop-baseline.spec.ts-snapshots/` holds exactly six PNGs; the five for this phase are `outline-`, `rocker-`, `rails-`, `volume-`, `fins-desktop-desktop-darwin.png` (3D is untouched). The config tolerance is `maxDiffPixels: 100` (`playwright.config.ts`); a new tab word is far over it. The spec's header says re-record **from the main checkout after inspecting the diff**.
- **No other mention** of `MODEL INFO` / `fin-model-info` / the `"info"` id exists in `components`, `lib`, `app` or `CLAUDE.md`.
- **Verbatim check (D-13):** a script normalising the tab's JSX (strip tags, decode `&apos;`/`&quot;`, collapse whitespace) found **all 14** `- info:` lines of the words page present verbatim in `fin-model-info.tsx`; the only tab text not on an info line is the tab's own title/note ("Model Info", "Reference note on where each model's placement guidance comes from.") and the Convention paragraph, which the words page splits into the Convention card's two sentences with two tiny edits (an "and" added before "toe-in", a capital "Rears" after the split). Heading names in the tab (`Single Model`, `Twin Models`, `Thruster & Quad Front Models`, `Quad Rear Models`) are replaced by the groups; the tab's `Basic: Spread`/`Basic: Off-Rail` read `Basic - Spread`/`Basic - Off-Rail` on the cards (the model labels the app uses).

### Finding 7 — Tests: how the suite is organised

[VERIFIED: configs and specs read this session]
- **Vitest** (`vitest.config.ts:6`): `environment: "node"`, `include: ["lib/**/*.test.ts", "components/**/*.test.ts"]`, alias `@` → repo root. So `components/guide/guide-words.test.ts` **runs where it is** (CLAUDE.md's "`lib/**/*.test.ts`" line is stale). A words test finds its page the way Phase 17's does: search `.planning/` recursively for `18-GUIDE-WORDS.md` (a finished phase moves to the archive), `fileURLToPath(new URL("../../.planning/", import.meta.url))`.
- **Playwright** (`playwright.config.ts`): own dev server on `PW_PORT ?? 3100`, `reuseExistingServer: !process.env.CI`, three projects — `iphone` (`devices["iPhone 14"]`, WebKit), `android` (`devices["Pixel 7"]`), `desktop` (`Desktop Chrome`, 1280 × 800); `webServer.env` carries the deliberate non-secrets (`pk_live_…` Clerk key, `DATABASE_URL`, `SHAPER_BLANKS_SOURCE: "seed-csv"`, `SHAPER_RACK_STAND_IN: "1"`). Helpers: `e2e/helpers/screens.ts` (`goToScreen`, `openPhoneMenu`), `settings.ts` (`openSettingsMenu`), `open-board.ts` (`forgetOpenBoardOnEveryLoad`), `blank-picker.ts` (`openRocker`). Metric is set by `localStorage` (see `e2e/imported-readout.spec.ts:46-48` `setMetricUnits`). A fresh `/design/outline` opens the **stock** 72" squash, not a preset: open a preset from the home page card as Phase 17's `openBottom` does (`BOARD_PRESETS`, button filtered by `Start Shaping` or `\d\.\d L`).
- **Baselines** (`desktop-baseline.spec.ts`): desktop project only, banner and toolbar tip dismissed by init scripts; five of the six pictures change on purpose.
- **Phase 17's `bottom-guide.spec.ts`** is the model: `openGuide` retried with `toPass` until React owns the tab, `readCards` (clipped / outside / nameMeetsTag), `columnsAcross` by distinct left edges, `tagged`.
- **A Rule-2 ledger exists:** `lib/units-isolation.test.ts` walks `SCREEN_FOLDERS = ["outline","rocker","rails","fins","volume"]` (:429) and bans raw factors and the imperial formatters; Phase 17's branch appends a folder-walking describe for `components/bottom` plus its geometry files. **Add the same describe for `components/guide` and `lib/geometry/guide-*.ts`** (banned: `formatInchesFraction`, `formatFeetInches`, `formatSignedInchesFraction`, `formatCentimetres`, `formatWholeMm`, `mmToInches`, `inchesToMm` in components, `mmToCentimetres`, `25.4`, `2.54`). `lib/geometry/guide-push.ts` legitimately needs `inchesToMm` (a units import) to state the Imperial amounts; name that file as the one allowed to.
- **Existing specs that must change** (R12 "on purpose"):
  1. `e2e/board-name-band.spec.ts`: `TAPPABLE` (:247) lacks `VOLUME` and `stripHeightOn` (:401) reads 21 for it — VOLUME's strip becomes 31; **p1** (:409-443) runs ROCKER and RAILS at 360 and 375 through `expectBandSound` (name inside strip and window, no sideways scroll) — fails as measured; **p1b** (:445-453) asserts `Untitled` whole on ROCKER at 360 — cannot hold with five tabs; **d1** (:481-) at 820 for ROCKER and RAILS.
  2. `e2e/phone-chrome.spec.ts`: the VOLUME block (:636-760+) finds ESTIMATE as a `span` (:645) and pins label top 2 / gap 10 / main bottom 13 — rewrite for a tab (strip +9 dots of clearance); the `ALL_FIVE_SCREENS` list (:1173-1180) — `volume` `tabs: []` becomes `["ESTIMATE","GUIDE"]`, `fins` loses `MODEL INFO`, the others gain `GUIDE`; the FINS infoTab blocks above.
  3. `e2e/volume-fins-panels.spec.ts:287`; `e2e/desktop-baseline.spec.ts` PNGs; `components/viewer/tabbed-panel.test.ts:123` (if the trailing wrapper class changes); `components/rocker/rocker-live-controls.test.ts:76` (add `"guide"`).
  4. Re-run and read the phone and desktop specs touching VOLUME's phone position (`phone-screens.spec.ts` VOLUME describes) — ESTIMATE's own behaviour is unchanged (same `phonePinned="none"` while ESTIMATE), but its strip is 9 dots taller on a phone.
- **`keyboard-focus.spec.ts`** derives its Tab ceilings from the page's focusable count, so a focusable scroller does not break it.
- **Port discipline:** 3000 and 3005 are the founder's; the suite's own server is 3100 (`PW_PORT=` overrides); this research used 3123 and stopped it.

### Finding 8 — Cost of the live cartoons

[MEASURED: `tsx` timing script over the Shortboard preset, Node v24.19.0, Apple laptop; and a DOM micro-benchmark in the dev page]
Maths per page (5-pass average after a cold call; Fish is the slowest, ×1.5-2):

| Page | Calls | Warm | Cold first call |
|------|-------|------|-----------------|
| ROCKER | 14 × `designSideProfile` + sampling 121 board and 161 blank stations | 7-10 ms (3-6 ms if one prepared blank is reused) | 21 ms |
| TEMPLATE | 22 × `buildOutline` + 6 wings placed | 2-4 ms | 16 ms |
| RAILS | 17 × `computeRailSectionOutput` + `finishedRail` | 1.4-2.3 ms | 10 ms |
| VOLUME | 3 × `computeVolume` | < 0.1 ms | 0.5 ms |
| FINS | 23 × `computeFinPlacement` | 0.5-1.1 ms | 5.5 ms |

DOM (a stand-in: 84 cards × an SVG of 70 elements + two paragraphs, 6,301 nodes): build + insert 21 ms, layout 53 ms on a 1280 desktop Chromium; 96 ms + 263 ms under `Emulation.setCPUThrottlingRate 4`; WebKit at 390 wide took 41 ms + 357 ms unthrottled (one column makes the page 30,865 dots tall). One page is about a quarter of that (22 cards). **Conclusion:** no lazy drawing for the maths; the DOM is the cost, and it is bounded by the 22-23 cards of one page that are mounted only while GUIDE is open. Do not build UI-SPEC §8's lazy drawing unless the real component, timed under the 4× throttle, exceeds about 150 ms to first paint; the cheap lever if it does is a `content-visibility: auto` + `contain-intrinsic-size` on the card, or an IntersectionObserver wrapper around **only** the SVG (the card's `aspect-[300/H]` box keeps heights stable). While a slider drags with GUIDE open on a computer every card's base changes: 5-25 ms of maths plus React work per tick; wrap the page's input object in `useDeferredValue` if a measured tick drops frames.

### Finding 9 — The words page, the id scheme, and the words test

[VERIFIED: `18-GUIDE-WORDS.md` parsed with a script]
- Format: `## PAGE` → `### Group — qualifier` (`### Wings — the WINGS tab's own sidebar`) → `**Name** · tag on the Shortboard: \`…\` · caption: \`…\`  ` → `- is:` / `- does:` / (`- info:` FINS only) / `- how:`. **84 cards**: TEMPLATE 22 {Board Length 1, Nose Controls 2, Widepoint Controls 4, Tail Controls 9, Wings 6}; ROCKER 14 {Inputs 2, Blank 4, Rocker 2, Foil 6}; RAILS 17 {Inputs 2, `Nose Rail · Center Rail · Tail Rail` 5, Advanced 10}; VOLUME 8 {Inputs 5, `What the ESTIMATE card reads` 3}; FINS 23 {Inputs 1, Convention 1, Single Fin 1, Twin 4, Thruster 5, 2+1 1, Quad 6, Advanced 4}. Every card has is/does/how; exactly **14 `info`** lines, all on FINS. 62 cards carry a tag example and 57 a caption example.
- **Names repeat** inside a page (TEMPLATE `Fullness` twice, `Depth` twice) and across pages (`Board Length`, `Center Thickness`, `Import Designed Board`, `Twin`, `Quad`…): Phase 17's `key = name` will not do. Use `id = "${page}.${groupSlug}.${nameSlug}"` (or the card's index within its page) and compare module ↔ page **by order**, asserting name, group, page and each line.
- A pair of tests to write, beyond Phase 17's: (1) page structure (84; 22/14/17/8/23; 14 info; every card's labels); (2) module == page line for line, no markup in a line (`**`, `<`, `>`), lines trimmed; (3) **executable tags and captions** — compute `guideTag` / `guideCaption` for the Shortboard (via `phase16Boards()`, Imperial) and compare to the page's backticked examples (`6'2"`, `29.61 L`, `Diamond & swallow only`, `Needs 8'0"`, `to 1/16"`, `drawn as · Thruster — Basic (Half Rate)`, `dashed · 6'8" → 31.8 L quick estimate`…). **ROCKER's captions are not on the words page** (only the UI-SPEC writes them: `dashed · +1/2" at the center`, `dashed · +3/8" at each tip`, `dashed · slid 9/16" to the nose`, …); either add them to the page (the founder's page) or test them from the UI-SPEC copy.
- **Intro and board name:** each page's intro carries "your Shortboard's…"; the live board name is `bandBoardName(modelId, boardName)` and that returns `Untitled` for an unsaved board (board-name-copy.ts:20-24). Reuse Phase 17's rule (`guideBoardName`: `""` and `"Untitled"` → `board`, so "your board's outline"); the possessive belongs in the template.
- **FINS' verbatim source:** the 14 `info` strings come from `fin-model-info.tsx` (Finding 6) — move them into `guide-words.ts` *before* deleting the file, and have the test hold them to the page.

### Finding 10 — Phase 17 coordination

[VERIFIED: `git diff --name-status` / `--numstat main...claude/beautiful-fermi-ad3fb7`, merge-base `49b737c3`, tip `0d4dd2dc`]
Files **both** branches change, with the size of Phase 17's touch:

| File | Phase 17 | Phase 18's touch | Keep it small by |
|------|----------|------------------|------------------|
| `components/fins/fin-placement-editor.tsx` | +6 (a `showContours` state and two `FinViewer` props) | tab union/list, panel branch, pin, `growOnShortScreen`, remove the `FinModelInfo` import | one block; do not move `FinViewer` props |
| `components/rails/rail-band-editor.tsx` | +6/-1 (`railsOnBottom`, `railBandsOnBottom: bands`, two `RailControls` props) | union, tab, branch, `phonePinned` | same |
| `components/design/design-store.tsx` | +274 | none (read only) | — |
| `components/fins/fin-viewer.tsx` (+116/-5), `components/rails/rail-section-plot.tsx` (+68/-23) | rewritten parts | **read constants only**; copy `RAIL_SEGMENT_COLORS` import (exported, stays) | no imports from viewer internals |
| `app/globals.css` | +9 | one token line | its own line |
| `lib/geometry/design.ts` (+201), `fins.ts` (+34), `rail-bands.ts` (+19), `wings.ts` (+15), `volume.ts` (+281) | additive: `DesignSummaryFields` gains optional `bottom?`, `fins?`, `finsImportTemplate?`; `designCrossSectionInput` an optional fifth parameter; new exports only; `RailSectionOutput` an optional `bottom?` | **every signature Phase 18 calls is unchanged** | call only what Finding 3 lists |
| `e2e/phone-chrome.spec.ts` (+8/-6), `board-name-band.spec.ts` (+5/-5) | small | the rewrites in Finding 7 | rebase after 17 |
| `e2e/desktop-baseline.spec.ts` and **all six** PNGs | re-recorded (BOTTOM adds a nav item) | five re-recorded again | binary: whichever lands second **re-records**, never merges |
| `CLAUDE.md`, `.claude/skills/sketch-findings-shaper/*` | edited | possibly a GUIDE paragraph | |

Three consequences: (1) after Phase 17 lands, RAILS reads `railsOnBottom` / `railBandsOnBottom` (the rail the bottom leaves), not `effectiveRails`; the RAILS GUIDE's base should follow what the page draws, a one-line change in the Rails page's input, flag it in the merge note; (2) `quotedVolumeLitres` may change meaning with a bottom, so the VOLUME tag must keep reading the store's value; (3) `units-isolation.test.ts` gains Phase 17's `components/bottom` describe at the end of the file — both phases append there, expect an adjacent-hunk conflict.

## Common Pitfalls

### Pitfall 1: The strip overflows the phone (and the existing spec says it must not)
**What goes wrong:** five ROCKER tabs (and four RAILS tabs) plus the name's 14-dot minimum rim exceed a 356- or 371-dot band; the page scrolls sideways by up to 16 dots. **Why:** `board-name-tab.tsx` padding is not shrinkable. **Avoid:** Finding 5 (clip the trailing wrapper; update the pinned markup test). **Warning signs:** `document.documentElement.scrollWidth > innerWidth`; `board-name-band.spec.ts` p1/p1b/d1 failing.

### Pitfall 2: VOLUME's strip is interactive for the first time
`interactive` is `typeof onSelect === "function" && tabs.length > 1` (tabbed-panel.tsx:144). With two tabs ESTIMATE becomes a `<button>`, `touchClearance` turns on (the strip gains `pt-[9px]`, the inner card `pt-[9px]` and tab touch boxes), so VOLUME's phone card sits about 9 dots lower, `phone-chrome.spec.ts` finds `span` not `tab`, and `board-name-band.spec.ts` `TAPPABLE` must include VOLUME. **Avoid:** rewrite those specs; do not reach for `interactive` hacks.

### Pitfall 3: `phonePinned` flips remount nothing but change the scroller
TEMPLATE/ROCKER already pin 66; RAILS/FINS/VOLUME change pin **only while GUIDE is active** (the idiom RAILS already uses for INSTRUCTIONS). Switching tabs changes root/aside/main class strings, the elements persist (verified in Finding 1's measurement).

### Pitfall 4: Names repeat — the Phase 17 key will collide
See Finding 9. Two TEMPLATE cards are both `Fullness`, two both `Depth`.

### Pitfall 5: `lateral` / `leadingLateral` already carry the side
Multiplying by `side` mirrors a fin to the wrong rail (the sketch's own comment: "never multiply by the side again").

### Pitfall 6: A wing's radius depends on the system
`nextWing(…, system)` and `wingRadiusTop(…, system)` grid on 1/16" or 1 mm. A Metric GUIDE must pass the live system, and the `wingRadius` push in Metric is a different drawn number.

### Pitfall 7: `Needs 8'0"` by float compare
Use `isQuadRearModelAvailable`; the sketch's `L < 96 * IN` is the wrong side at exactly eight feet by the app's own warning (fins.ts:326-331).

### Pitfall 8: A custom-rocker board and the rocker pushes
The sketch replaces `blank.rocker` with a single change (`+1"` at one end). On a board that already carries an ordered rocker the push should *add to* that end's amount and stay under `ROCKER_CHANGE_MAX_MM` (2", custom-rocker.ts:51) and `MAX_CHANGES_PER_END` (2); decide and test it (Open Question 6). The Thinning Start pushes must be clamped with `thinningStartRange` / `pullThinningStart`.

### Pitfall 9: Playwright `textContent` includes hidden phone short-labels
ROCKER's `DATASHEET`/`DATA` and `TOP VIEW`/`TOP` spans both exist in the DOM (`tabbed-panel.tsx:48-56`); compare `innerText`, find tabs by role name (the button carries `aria-label={tab.label}`).

### Pitfall 10: Card text inside the scroller and `content-visibility`
If `content-visibility: auto` is used for DOM cost, off-screen cards report their intrinsic size, which breaks "no card clipped" bounding-box tests; scroll each card into view first or avoid the lever.

### Pitfall 11: "your Untitled"
`bandBoardName` returns `Untitled` for an unsaved board; the intro must map that to `board` (Phase 17's `guideBoardName`).

### Pitfall 12: Anything pressable
Phase 17's test asserts the card file has no `<button`, `role="button"`, `onClick`, `onPointer`, `tabIndex`; the scroller region is the one allowed `tabIndex={0}` (put it in `guide-tab.tsx`, assert none in `guide-card.tsx` / `guide-cartoon.tsx`; also no `[tabindex]` inside `[data-guide-card]`).

## Code Examples

### The words test's page reader (adapted from Phase 17)
```typescript
// Source: Phase 17 components/bottom/bottom-guide-words.test.ts (scratch copy) — adapted to Phase 18's headings
const PAGE_NAME = "18-GUIDE-WORDS.md";
const PLANNING = fileURLToPath(new URL("../../.planning/", import.meta.url));
// findPage(dir): recursive readdirSync, as Phase 17
function readPage() {
  let page = "", group = ""; const cards = [];
  for (const line of readFileSync(findPage(PLANNING)!, "utf8").split("\n")) {
    let m;
    if ((m = /^## (.+)$/.exec(line))) { page = m[1]; group = ""; continue; }
    if ((m = /^### (.+)$/.exec(line))) { group = m[1].split(" — ")[0]; continue; }
    if ((m = /^\*\*(.+?)\*\*(.*)$/.exec(line))) {
      const tag = /tag on the Shortboard: `(.*?)`/.exec(m[2]); const cap = /caption: `(.*?)`/.exec(m[2]);
      cards.push({ page, group, name: m[1], tag: tag?.[1] ?? null, caption: cap?.[1] ?? null, is: "", does: "", info: null, how: "" });
      continue;
    }
    if ((m = /^- (is|does|info|how): (.+)$/.exec(line)) && cards.length) (cards.at(-1) as any)[m[1]] = m[2];
  }
  return cards;
}
```
(The scratch parser used in this research counted 84 / 14 on the current page with exactly this regex set.)

### One card's variant, through the real function (TEMPLATE, Depth on a non-diamond non-swallow tail)
```typescript
// Source: sketch pages-data.ts + lib/geometry/board.ts:152 (TAIL_PRESETS) — Rule 1: lives in lib/geometry/guide-outline.ts
const swallow = TAIL_PRESETS.swallow;               // crotchDepth: inchesToMm(3)
const ghost = buildOutline({ ...o, tail: swallow.tail, tailAngle: swallow.tailAngle, tailFullness: swallow.tailFullness });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MODEL INFO as a fourth FINS tab with its own static text | the same words on 14 FINS GUIDE cards | this phase (D-02, D-13) | one place to read, one test holds it |
| ESTIMATE as a one-tab label | a two-tab strip | this phase | the strip is interactive (Pitfall 2) |
| `lib/**/*.test.ts` only | `components/**/*.test.ts` also included | already in `vitest.config.ts:6` | the words test lives with the words |

**Deprecated/outdated:** CLAUDE.md's "Vitest … `lib/**/*.test.ts`" line (the config also runs `components/**/*.test.ts`); the UI-SPEC's measured-estimate "name gets about 4 dots at 360" (measured: it gets none and overflows).

## Runtime State Inventory

Not a rename / refactor / migration phase (a feature add with one removal). Verified: Stored data none (no DB, no saved-board change — the GUIDE is read-only and `fin-model-info.tsx` holds only static text); Live service config none; OS-registered state none; Secrets/env vars none; Build artifacts: none (the stray `node_modules/node_modules` symlink noted under Environment Availability is a developer-machine item, not shipped).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | scripts, vitest, Playwright | yes | v24.19.0 | — |
| `node_modules/.bin/{tsx,vitest,playwright,next}` in the worktree | tests, timing | yes | — | — |
| Playwright Chromium + WebKit | e2e | yes (both launched) | — | `npx playwright install chromium webkit` |
| A dev server in this worktree | measuring and e2e | **only after a one-line fix**: the worktree's git-ignored `node_modules/node_modules` was a symlink to the main checkout's `node_modules`, and Turbopack failed with "Symlink [project]/node_modules/node_modules is invalid, it points out of the filesystem root" | Next 16.3.6 | the symlink was removed this session (nothing imports it); recipe in memory: hardlink-copy main's `node_modules` with `rsync -a --link-dest` if a clean one is wanted |
| Env for a signed-out dev server | e2e | yes — the deliberate non-secrets in `playwright.config.ts` (`pk_live_…`, fake `sk_live_…`, `DATABASE_URL`, `SHAPER_BLANKS_SOURCE=seed-csv`) | — | — |
| `npm run build` | the go-live gate | **from the MAIN checkout only** (CLAUDE.md: Turbopack won't resolve `next` in a worktree) | — | — |
| Free ports | measuring | 3123 used and stopped; never 3000 / 3005 (the founder's) / 3100 (the suite's) | — | `PW_PORT=` |

**Missing dependencies with no fallback:** none. **With fallback:** the worktree dev server (fixed above).

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (node) for maths and words; Playwright (`@playwright/test`) for browser; three projects `iphone`, `android`, `desktop` |
| Config file | `vitest.config.ts` (`include: ["lib/**/*.test.ts", "components/**/*.test.ts"]`); `playwright.config.ts` |
| Quick run command | `npx vitest run components/guide lib/geometry/guide-` (the touched files; seconds) |
| Full suite command | `npm test` then `npm run lint`, then (from the MAIN checkout) `npm run build`, then `npm run test:e2e` read to its EXIT line (`PW_PORT=<free>` per executor) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| R6, R2 | 84 cards, 22/14/17/8/23, 14 info, lines equal the page, no markup, Convention grain substitution | unit | `npx vitest run components/guide/guide-words.test.ts` | ❌ Wave 0 |
| R3, R10, R11 | `guideTag`: value / on / `Diamond & swallow only` / `—` (Tail Block, Tail Angle on a diamond) / `Needs 8'0"` & `Needs 243.8 cm` / `to 1/16"` & `to 1 mm`; equals the words page's Shortboard strings | unit | `npx vitest run lib/geometry/guide-tag.test.ts` | ❌ Wave 0 |
| R4, R6 | `guideCaption`: `dashed · …` / `drawn as · …` / none; every pushed card says what is dashed; Metric figures are round mm/cm | unit | `npx vitest run lib/geometry/guide-caption.test.ts` | ❌ Wave 0 |
| R5, R11 | `guidePush(system)`: Imperial inches, Metric round figures per family; one number drives drawing and caption | unit | `npx vitest run lib/geometry/guide-push.test.ts` | ❌ Wave 0 |
| R5 | each variant builder changes **exactly one field** and equals the app's own function on that field (Shortboard, Fish, a diamond/pin tail, a custom-rocker board, a short board for McKee Longboard, a board with a wing) | unit | `npx vitest run lib/geometry/guide-rocker.test.ts lib/geometry/guide-outline.test.ts lib/geometry/guide-rails.test.ts lib/geometry/guide-volume.test.ts lib/geometry/guide-fins.test.ts` | ❌ Wave 0 |
| R4 | window fit stays inside the strip (3-unit inset), label placement never leaves the card or overlaps | unit | `npx vitest run lib/geometry/guide-draw.test.ts` | ❌ Wave 0 |
| R11 | Rule-2 walking ledger over `components/guide` + `lib/geometry/guide-*.ts` | unit (source contract) | `npx vitest run lib/units-isolation.test.ts` | ✅ extend |
| R7 | nothing pressable; no `dangerouslySetInnerHTML`/`innerHTML`; no `Math.sin/cos/…`, `window`, `document`, `matchMedia` in guide files | unit (source contract) | `npx vitest run components/guide` | ❌ Wave 0 |
| R1, R12 | GUIDE last on all five; FINS has no MODEL INFO and no `fin-model-info`; strips on one line at 360/375/390/412; page does not scroll sideways | browser | `PW_PORT=3141 npx playwright test e2e/guide.spec.ts` | ❌ Wave 0 |
| R2, R6 | 84 cards in their groups each with an `<svg>`, two sentences, How to shape; FINS 14 Model info | browser | same | ❌ Wave 0 |
| R3, R11 | tags on the Shortboard and the Fish, Imperial and Metric (`6'2"`/`188.0 cm`, `50°`, `On this board` on Squash, `Diamond & swallow only`, `29.61 L`, `Needs 8'0"`/`243.8 cm`, `30.5 cm · Automatic`, `to 1 mm`) | browser | same | ❌ Wave 0 |
| R5 | a pushed card draws a `--outline-push-line` stroke; moving a sidebar slider with GUIDE open changes the tag and redraws | browser (desktop) | same | ❌ Wave 0 |
| R8 | 3 / 2 / 1 across at 1280 / 1024 / 390, no card under 236 or wider than its list, no clipped text, page never scrolls as a whole on a phone (`scrollHeight == innerHeight`, pinned column ≤ 66dvh, card ≥ 66dvh − 41), **VOLUME first** | browser | same | ❌ Wave 0 |
| R7 | no `button`, `a`, `input`, `[tabindex]` inside `[data-guide-card]`; a click does nothing | browser | same | ❌ Wave 0 |
| R4 | no overlap of cartoon text with another or the window's name at 1024 and 390 (bounding boxes) | browser | same | ❌ Wave 0 |
| R12 | the five baselines re-recorded on purpose, nothing else in them moves | visual | `PW_PORT=… npx playwright test e2e/desktop-baseline.spec.ts --project=desktop` (then `--update-snapshots` from the main checkout after reading each `diff.png`) | ✅ re-record |
| R13 | pictures in the phase folder: five pages × computer and phone (Shortboard, Imperial), plus the Fish's TEMPLATE Depth, FINS' Twin group, a Metric FINS card, a Slate card | visual | the sketch's `shots3.cjs` idea, against the live build | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched files>` and `npm run lint`.
- **Per wave merge:** `npm test` (full Vitest) plus the wave's own specs (`PW_PORT=<free> npx playwright test e2e/guide.spec.ts e2e/<changed specs>`; phone projects with `npm run test:e2e:phone` while iterating).
- **Phase gate:** `npm test`, `npm run lint`, `npm run build` from the MAIN checkout, the full `npm run test:e2e` read to its **EXIT line** in its own call (memory: load flakes pass alone; a changed baseline means diff.png → update → re-run), then push and a server-rendered deploy marker.

### Wave 0 Gaps
- [ ] `components/guide/guide-words.test.ts` — R2, R6, R9
- [ ] `lib/geometry/guide-{push,tag,caption,draw,rocker,outline,rails,volume,fins}.test.ts` — R3, R4, R5, R10, R11
- [ ] a Rule-2 + "nothing pressable" describe in `lib/units-isolation.test.ts` or `components/guide/` — R7, R11
- [ ] `e2e/guide.spec.ts` (and, if the file grows, `e2e/guide-metric.spec.ts`) — R1-R3, R5, R7, R8
- [ ] rewrite `e2e/board-name-band.spec.ts` (p1, p1b, d1, `TAPPABLE`), `e2e/phone-chrome.spec.ts` (VOLUME block, `ALL_FIVE_SCREENS`, FINS infoTab ×4), `e2e/volume-fins-panels.spec.ts:287`, `components/viewer/tabbed-panel.test.ts:123`, `components/rocker/rocker-live-controls.test.ts:76`
- [ ] re-record the five baselines from the main checkout and review each diff
Framework install: none needed.

## Security Domain

> `security_enforcement` is `true`, ASVS level 1, `security_block_on: high` (`.planning/config.json`). The GUIDE has no input, no network, no persistence.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | the design routes are open to signed-out shapers (`proxy.ts` runs no `.protect()` per `playwright.config.ts` header); nothing new to protect |
| V5 Input Validation / output encoding | yes (output) | the only variable string in the GUIDE is the board's name in the intro: render it as a React text child, never `dangerouslySetInnerHTML` / `innerHTML` (Phase 17's source test, replicated) |
| V6 Cryptography | no | — |
| V14 Configuration | marginal | no new env var, no new package |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS through a board name shown in the intro | Tampering / Information disclosure | React text node; source test bans raw-HTML APIs in `components/guide` |
| CPU exhaustion from 84 cartoons | Denial of service | bounded work (Finding 8), mounted only while GUIDE is open, memoised per board |
| Supply-chain | Tampering | no new package (Package Legitimacy Audit) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | In Metric, **dims** pushes read a clean cm figure (15, 2.5, 7.5, 5, 10 cm) and **marks** a clean whole millimetre (13, 10, 6, 25, 19 or 20) — UI-SPEC says only "nearest round millimetre" | Finding 3 | a caption like `+15.2 cm` or a 6-vs-5 mismatch between drawing and caption; founder may prefer other round numbers |
| A2 | The prose figures in the words (`a quarter inch`, `12 inches`, `4 1/2" to 6"`, `eight feet`) stay as the founder wrote them in both systems, except card **names** and **tags/captions/dimension labels/Convention grain** that go through `stationLabel` / `units.ts` | Open Question 2 | R11 reads "figure-carrying sentence"; a Metric shaper could see inches in a sentence |
| A3 | Phone cost scales like the 4x-throttled Chromium run (about 100 ms to build and 260 ms to lay out 84 nodes' worth; a quarter per page) | Finding 8 | the planner may build lazy drawing it did not need, or skip it when it was needed on a real phone; measure the real component |
| A4 | `overflow-x: clip` on the strip's trailing wrapper is acceptable (Safari 16+; older Safari keeps today's overflow) | Finding 5 | an iPad on Safari < 16 would still overflow by up to 16 dots on ROCKER at phone width (rare: a phone-width iPad is not a thing) |
| A5 | The founder accepts that the board's name disappears on ROCKER below about 380 dots and on RAILS below about 370 | Finding 5, Open Question 1 | `board-name-band.spec.ts` p1b ("Untitled whole at 360") was his rule of 2026-10-08 |
| A6 | Where the sketch had no push (Placement with no slide room; Tail Block on pin/round; Tail Angle on a diamond) the card draws the board as is with no caption | Finding 3 | a card says "dashed" with nothing dashed (the sketch's own test forbids it) |
| A7 | A re-recorded baseline from this worktree is the same as one from the main checkout (macOS-rendered, local only) | Finding 7 | the spec header says re-record from the main checkout |

## Open Questions

1. **Does the founder accept the board's name vanishing on a narrow phone's ROCKER and RAILS?** — Known: five ROCKER tabs need 374.2 dots including the name's rim; 360 and 375 can't, RAILS can't at 360; at 390 the name keeps 11.8 dots of text (`U…`), 412 keeps 33.8; `board-name-band.spec.ts` p1b pins "Untitled whole at 360". Unclear: his tolerance. Recommendation: clip the trailing wrapper (`overflow-x-clip`), keep all tab words, rewrite p1/p1b/d1 to the new rule, and ask him once (a short PLANING label is the other lever).
2. **Metric in the words' prose** — about 40 lines (`is`/`does`/`how`/`info`) carry Imperial figures; the words page says a Metric shaper reads "the few that carry a unit (noted where they occur)" but notes only the Convention grain; Phase 17 translated its one figure and tested "no inch figure in Metric". Recommendation: ship tags, captions, dimension labels, card names (`stationLabel`) and the Convention grain in the shaper's system; leave the prose exactly as written and say so to the founder in the plan, offering Phase 17's token method (`{12"}` slots resolved by a pure helper, tested) if he wants prose converted; the old MODEL INFO tab left its inch ranges in inches in both systems, which is the precedent for the `info` notes.
3. **ROCKER's captions are not on the words page** — add the ten ROCKER captions to the page (founder's page) or test them from the UI-SPEC copy; either way write them in one module.
4. **Convention tag in Metric** — the words page says `to 1/16"`; `finRoundingGrain` returns `millimetre`, so the Metric tag `to 1 mm` needs its own one-line rule (the sentence uses `millimetre`).
5. **After Phase 17, does the RAILS GUIDE draw the rail the bottom leaves?** — RAILS then reads `railsOnBottom`; recommend following the page (a merge-note item, not Phase 18's scope).
6. **Null-variant cards and custom rockers** — define in the plan: Placement with no slide, Tail Block on pin/round (`—`, no push), Tail Angle on a diamond (`—`, no push), the rocker pushes on a board that already carries an ordered rocker (add to that end's amount, clamp to 2").
7. **Lazy drawing** — decided by a timed run of the real component under the 4× CPU throttle (threshold about 150 ms to first paint), not by the contract.

## Sources

### Primary (HIGH confidence)
- In-repo files read this session (paths and lines cited above): `components/viewer/tabbed-panel.tsx`, `components/design/design-screen-shell.tsx`, the five editors, `components/rocker/rocker-live-controls.ts`, `components/fins/fin-model-info.tsx`, `components/design/{design-store.tsx,board-name-tab.tsx,board-name-copy.ts}`, `components/viewer/callout-primitives.tsx`, `components/rails/rail-section-plot.tsx`, `lib/geometry/{board,design,wings,fins,rail-bands,finished-rail,volume,outline,blank-fit,tip-taper,custom-rocker,board-profile,measure-display,units}.ts`, `lib/geometry/__fixtures__/phase16-boards.ts`, `lib/units-isolation.test.ts`, `vitest.config.ts`, `playwright.config.ts`, `e2e/{desktop-baseline,phone-chrome,board-name-band,volume-fins-panels,keyboard-focus}.spec.ts`, `e2e/helpers/*`, `app/globals.css:776-942`.
- The sketch source (`.planning/sketches/022-page-guides/sketch-source.tar.gz`, unpacked to the scratchpad as data, never run): `pages.js`, `board-data.ts`, `pages-data.ts`, `test-pages.cjs`.
- Phase 17's GUIDE as built on `claude/beautiful-fermi-ad3fb7` (scratch copies + `git show`): `bottom-guide.tsx`, `bottom-cartoon.tsx`, `bottom-guide-words.test.ts`, `bottom-guide.spec.ts`, `bottom-editor.tsx`, `bottom-copy.ts`.
- Browser measurements (Chromium and WebKit, dev server on 3123, stopped): tab strip, VOLUME pin, DOM cost; `tsx` timing scripts in `…/scratchpad/perf/`.

### Secondary (MEDIUM confidence)
- `18-UI-SPEC.md` (approved; its estimates superseded where measured above), `18-GUIDE-WORDS.md`, `18-SPEC.md`, `18-CONTEXT.md`, `.claude/skills/sketch-findings-shaper/SKILL.md`.

### Tertiary (LOW confidence)
- Phone timings extrapolated from a 4× CPU throttle (A3).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new package; every module read.
- Architecture: HIGH — the sketch's readers already prove the calls; signatures re-read.
- Pitfalls: HIGH for the strip, VOLUME, the specs and the name collisions (measured / read); MEDIUM for phone performance.

**Research date:** 2026-11-09
**Valid until:** 2026-11-23 (Phase 17 may land and change `railBands` / `quotedVolumeLitres` readers and the baselines before then)
