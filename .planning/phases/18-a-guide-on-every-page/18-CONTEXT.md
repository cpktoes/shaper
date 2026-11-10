# Phase 18: A GUIDE on Every Page - Context

**Gathered:** 2026-11-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Every design page teaches itself: TEMPLATE, ROCKER, RAILS, VOLUME and FINS each gain a **GUIDE** as the last tab of their own
strip — one card per control or named choice under the sidebar's headings, the board's own value beside the name, a cartoon of the
open board drawn the page's own way with that one setting pushed in muted dashes through the app's own maths, two sentences and a
*How to shape* note; on FINS the cards run setup by setup and carry the MODEL INFO tab's notes, and that tab goes. The GUIDE reads
and never writes.

The founder's words: *"every page needs a guide like this. Super useful on what each parameter does to/for the board. Would also be
nice to add a 'how to shape' note too"* (2026-11-08); *"Template Depth only used for Diamond and Swallow tails, say so. FINS guide =
reorganize the guide into Fin Setups along with their model info, and combine the model info tab into this new guide page, we don't
need both"* (2026-11-09); *"Let's build this and go live"* (2026-11-09).

**Not in this phase:** tappable cards; BOTTOM's GUIDE (Phase 17); SUMMARY, 3D or home-page guides; editing words in the app; printing
a guide; any change to a page's calculations, viewers, sidebars, data, saved boards, presets or litres.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**13 requirements and 6 carried constraints are locked** in `18-SPEC.md`, written from the decided sketch and the founder's rulings;
his *"Let's build this and go live"* is the lock. Downstream agents MUST read `18-SPEC.md` before planning or implementing.

**In scope:** GUIDE last in each page's strip, MODEL INFO removed (R1); 84 cards under the sidebar's headings (R2); the board's own
value beside the name (R3); the page's own drawing with the one setting pushed (R4) through the app's own maths (R5); two sentences,
How to shape, Model info on FINS, the words page as the source of truth with a test (R6); informational only (R7); phone and computer
layout (R8); FINS by setup (R9); Depth as a diamond's or a swallow's (R10); Rule 2 (R11); nothing else moves (R12); checks, pictures
and one go-live gate (R13).

</spec_lock>

<decisions>
## Implementation Decisions

Every decision below is the founder's or the decided sketch's; where the sketch chose and he said "build this", the sketch's choice
stands and is marked *(sketch)*. The README's "What to Look For" items he has not spoken on are his to overrule during the build.

### Where the GUIDE lives
- **D-01:** **GUIDE is the LAST tab in each page's own strip** — after VIEWER · ADD WINGS on TEMPLATE, VIEWER · PLANING · DATASHEET on
  ROCKER (VIEWER · TOP · PLANING · DATA on a phone, five fitting a 390-dot iPhone with the board's name cut short), VIEWER · DATA ·
  INSTRUCTIONS on RAILS, ESTIMATE on VOLUME, VIEWER · DATA on FINS. *(sketch, all three rounds; 021's placement carried)*
- **D-02:** **FINS loses its MODEL INFO tab.** Its text moves onto the GUIDE's cards verbatim (D-13); `fin-model-info.tsx` and the
  tab's tests go. The founder: *"we don't need both."*
- **D-03:** **Every other tab, viewer, sidebar and data panel is untouched**, and the GUIDE is a picture of the page's own numbers.
  VOLUME quotes the 51 cross-sections' litres as the page does (29.61 L on the Shortboard), never the quick estimator's own figure.

### What a card is
- **D-04:** **One card per control or named choice, under the sidebar's headings, in the sidebar's order**, named as the page labels
  the control (`Center Thickness`, `Nose Tip · Tail Tip`, `Pin tips to · Deck`, `Scaled from center by`, `Add 5th/Center fin`). A
  choice is one card per option, as 021's vees. Pairs the page shows together (Nose Tip · Tail Tip, the two 12" fine-tunes) are one
  card with two windows; the two Thinning Starts are two cards; on RAILS one card stands for all three rails' control (drawn at the
  center, the tail where only the tail has it — Hard Edge, Scaled from center by); on FINS the Advanced cards show the forward fins'.
  *(sketch; his to overrule)*
- **D-05:** **The board's own value sits beside the name**, through the page's own formatters, *On this board* for a choice's active
  option, and a short word where the control does not apply: `Diamond & swallow only` (Depth), `—` (Tail Block on a pin or round),
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
  cross-section from RAILS (the page has no drawing); FINS the tail's last 24" from above, the fins as lines from trailing to leading
  edge with the VIEWER's dots. The tail shapes are each drawn on the open board; the wing cards draw the board with the wing the WINGS
  button would add first; every fin setup and model is drawn on the open board's tail. *(sketch)*
- **D-08:** **Dimension lines sit outside the board** the drafting way: on FINS off-tail just below the rail at the fin's own station,
  toe-in at the upper fin's leading edge against a dashed reference through its trailing edge and labelled nose-ward, the base above
  the upper fin, off-rail on the tail side of its line; on TEMPLATE a tip's label inset so it never clips the window and a length under
  the board. *(sketch, round three — learned by collision)*
- **D-09:** **Two sentences and a How to shape note**: what it is and looks like (ink), what it does (muted, same paragraph), the note
  under a dashed rule. **All words live in `18-GUIDE-WORDS.md`** and the code's words module is tested against it line for line
  (Phase 17's `bottom-guide-words.test.ts` pattern). First drafts for his pen, except FINS' notes (D-13).
- **D-10:** **Informational only** — nothing on a card can be pressed, nothing changes the board. *(021/Phase 17's rule)*

### Round three's rulings
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

### How it is drawn and laid out
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

### Coordination and shipping
- **D-19:** **Phase 17 lands separately.** Its branch (`claude/beautiful-fermi-ad3fb7`, 13 of 16 plans) rewrites `fin-placement-editor`,
  `fin-viewer`, `rail-band-editor`, `rail-controls`, `site-nav`, `design-store` and others. Phase 18 adds a tab and a panel to each
  editor with the smallest possible touch and keeps its own code in `components/guide/` and `lib/geometry/guide-*.ts`; the merge
  conflicts after are expected and resolved by whichever lands second. A follow-up todo asks Phase 17's BOTTOM GUIDE to adopt the
  shared card.
- **D-20:** **One go-live gate** (R13): `npm test`, `npm run lint`, `npm run build` from the main checkout, the full `npm run test:e2e`
  read to its EXIT line, re-recorded desktop baselines reviewed, then push to `main`, the Vercel deploy confirmed by a server-rendered
  marker, and the founder's own look on his phone. Executors work in their own worktrees; the founder's checkout and port 3005 are his.

### Rulings on the research's open questions (2026-11-09; the founder sees each at the look and may overrule)
- **D-21:** **The tab words stay whole, the page never scrolls sideways, and the board's name gives way.** Research measured it
  (18-RESEARCH.md, Finding 5): five ROCKER tabs need 374 dots with the name's bare rim and four RAILS tabs need 366, so a 360- or
  375-dot phone cannot hold both, and at 390 the name would be a stub (`U…`). The rule: on any strip, at any width, the name is drawn
  only when it has room for a readable piece of itself (about 48 dots of box); below that it is not drawn at all, never a stub, and
  the page's width is never exceeded. TEMPLATE, VOLUME and FINS keep the name whole at every phone width as today. No tab word is
  shortened: the founder named them, and PLANING or VIEWER said short is his call alone. How it is done (a container query on the
  strip's trailing wrapper, or `overflow-x: clip` with a width test) is the planner's choice; `e2e/board-name-band.spec.ts` (p1, p1b,
  d1, `TAPPABLE` with VOLUME) and `components/viewer/tabbed-panel.test.ts:123` are rewritten to this rule, and a browser test proves
  no sideways scroll and no stub at 360, 375, 390, 412, 430 and 820. **This changes his rule of 2026-10-08 ("Untitled whole at 360")
  on ROCKER and RAILS only; it is put to him with pictures at the look, with shorter phone words as the other lever.**
- **D-22:** **A Metric shaper reads no inch or foot figure on any card** — name, tag, caption, dimension label, the two sentences,
  the Model info note and How to shape. This is the founder's own Phase 17 ruling of 2026-11-09 (`bottom-guide-words.ts`:
  *"15 cm in Metric" — never `15.2 cm`*; its test bans an inch figure in every Metric line), carried to all five pages. Two kinds of
  figure, as there:
  - **A number of the app** (a 12" station, a slider's limit, a model's fixed range or toe, the 8'0" minimum, the 9' anchor, the 1/16"
    grain) is said through `lib/geometry/units.ts` and the pages' own formatters: the station by its own label (`30.5 cm`), a fin
    figure as a mark in whole millimetres, a length as a dim.
  - **A rule of thumb said in prose** (*the last foot*, *every few inches*, *a couple of feet*, *to the inch*, *an inch of length*)
    is said each system's own round way, two pieces of copy and nothing converted (*the last 30 cm*, *every 10 cm or so*).
  The words page stays the source of truth and stays written the Imperial way; it gains a **Metric sayings** section listing every
  Imperial phrase beside its Metric phrase, card by card. The words module carries the same pairs; one pure function hands a card its
  lines for a system; the words test proves the pairs equal the page, that every app-number phrase equals what `units.ts` formats for
  that value, and that no Metric line matches an inch or foot figure (*under foot* and *back foot* are a surfer's feet, not a length).
  The Metric sayings are first drafts for the founder's pen like every other word.
- **D-23:** **ROCKER's captions go on the words page.** The ten the UI-SPEC wrote are added to `18-GUIDE-WORDS.md` beside their cards,
  so every caption on every page is tested from the one page.
- **D-24:** **The Convention card's Metric tag is `to 1 mm`**, its own one-line rule beside `finRoundingGrain` (whose word,
  `millimetre`, stays in the sentence).
- **D-25:** **A Metric push is a round figure of its own family.** One number drives the drawing, the dimension label and the
  caption. Dims in clean centimetres (6" → 15 cm, 4" → 10 cm, 3" → 7.5 cm, 2" → 5 cm, 1" → 2.5 cm, 18" → 45 cm, 24" → 60 cm); marks
  in the UI-SPEC's round millimetres (1/4" → 6, 3/8" → 10, 1/2" → 13, 3/4" → 19, 1" → 25, 1 1/2" → 38, 2" → 50, 4" → 100). Degrees,
  percentages and scales are the same in both systems.
- **D-26:** **A card never says "dashed" with nothing dashed.** Where the app's own limits leave a push no room (Placement with no
  slide room, a rocker change already at the 2" limit, a Thinning Start at the end of its range), the push is drawn the other way if
  that has room, and the caption says so (`dashed · −1" nose rocker`); if neither way has room the board is drawn as it is with no
  caption. Tail Block on a pin or round tail and Tail Angle on a diamond are tagged `—`, draw the board as it is and carry no caption.
  A rocker push on a board that already carries an ordered rocker adds to that end's amount, inside the app's own limits. McKee
  Longboard's availability is asked of `isQuadRearModelAvailable`, never a length compared by hand.
- **D-27:** **Card ids are page + group + name.** Names repeat (TEMPLATE has two *Fullness* and two *Depth*), so the words module,
  the tests and `data-guide-card` all key on the three together.
- **D-28:** **VOLUME's phone GUIDE uses the shell as it stands** (research measured the pinned branch in Chromium and WebKit: 66dvh,
  the page still, the sidebar scrolling inside itself), accepting that VOLUME's strip becomes pressable for the first time and its
  phone card sits about 9 dots lower; the specs that find ESTIMATE as plain text are rewritten. **Lazy drawing is decided by a timed
  run** of the real page under a 4× slowed processor: built only if first paint of a GUIDE tab passes about 150 ms; otherwise not built.

</decisions>

<where_to_look>
## Where to look

- **The sketch, built:** `.planning/sketches/022-page-guides/index.html` — open it; every page's GUIDE as it will be built, with the bar's
  Page · Board · Theme · Units · Phone frame switches. Its `README.md` records the rounds and his rulings.
- **The sketch's source** (`sketch-source.tar.gz`): `pages.js` and `template.html` hold every card's cartoon geometry — `cardFrame`
  (strip + window + detail), each page's `*Cartoon`, `*Cards`, groups and dims — in plain JS over sampled JSON; `board-data.ts` and
  `pages-data.ts` show how every push is built from the app's own functions (`designSideProfile`, `buildOutline` + `TAIL_PRESETS` +
  `nextWing`, `computeRailSectionOutput` + `finishedRail`, `computeVolume`, `computeFinPlacement` + `resetAdvanced`); `test-pages.cjs`
  and `test.cjs` are the headless checks to carry into Playwright; `shots3.cjs` takes card close-ups.
- **Phase 17's GUIDE** (on branch `claude/beautiful-fermi-ad3fb7`): `components/bottom/bottom-guide.tsx` (the card's dress and grid),
  `bottom-cartoon.tsx`, `bottom-guide-words.ts` + `.test.ts` (the words page pattern), `e2e/bottom-guide.spec.ts`; `17-UI-SPEC.md` §5.
- **The five editors and their strips:** `components/outline/outline-editor.tsx` (tabs at line ~125, the WINGS sidebar swap),
  `components/rocker/rocker-editor.tsx` (two tab lists, computer and phone, lines ~106–123; TOP phone-only), `components/rails/
  rail-band-editor.tsx` (+ `tabbed-panel.tsx`'s `growOnShortScreen`), `components/volume/volume-estimator.tsx` (one ESTIMATE tab),
  `components/fins/fin-placement-editor.tsx` (`FinTab`, `TAB_LABEL`, MODEL INFO) and `components/fins/fin-model-info.tsx` (the text to
  carry over, then delete); `components/viewer/tabbed-panel.tsx`; `components/viewer/use-viewer-media.ts` (`useBelowShellWidth`,
  `useShortScreen`).
- **The drawing sources the cartoons reuse:** `components/rocker/rocker-viewer.tsx`, `board-on-blank.tsx`, `rocker-view-frame.ts`;
  `components/outline/outline-viewer.tsx`, `wing-close-up.tsx`; `components/rails/rail-section-plot.tsx` (`RAIL_SEGMENT_COLORS`);
  `components/fins/fin-viewer.tsx`; `lib/geometry/{board-profile,blank,blank-fit,tip-taper,design,presets,custom-rocker,rocker,foil,
  planing,measure-display,units,outline,wings,rail-bands,finished-rail,volume,fins}.ts`.
- **The words:** `18-GUIDE-WORDS.md` in this folder (84 cards, the intros, the push amounts).
- **Lessons from the sketch** (memory `shaper-page-guides-sketch.md`): a fin mark's `lateral`/`leadLat` are already signed by the side;
  a detail window's label clips unless the tip sits well inside it; a pair of windows is too narrow for a caption, so the caption is one
  HTML line under the drawing; Playwright `textContent` includes hidden phone short-labels, compare `innerText`.

</where_to_look>

<canonical_refs>
## Canonical References

- `.planning/phases/18-a-guide-on-every-page/18-SPEC.md` — the locked brief
- `.planning/phases/18-a-guide-on-every-page/18-GUIDE-WORDS.md` — the words, the founder's to mark up
- `.planning/sketches/022-page-guides/README.md` and `index.html` — the decided sketch
- `CLAUDE.md` — Rule 1, Rule 2, the three screen switches, the layout
- `Skill("sketch-findings-shaper")` — the viewers' drafting grammar

</canonical_refs>
