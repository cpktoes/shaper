# Phase 18: A GUIDE on Every Page — Specification

**Created:** 2026-11-09, from sketch 022 (three rounds, 2026-11-08 to 2026-11-09) and the founder's rulings on it. The sketch's
README records the rounds and the rulings in his words; this brief gathers them into requirements so the screen contract and the
plans work from one page.
**Requirements:** 13 from the founder's words and the decided sketch, plus 6 carried constraints.
**Source:** `.planning/sketches/022-page-guides/README.md` (and its `index.html`, the five GUIDEs as they will be built; its
`sketch-source.tar.gz` holds the readers that built every pushed drawing from the app's own maths), the `### A GUIDE on every page`
section of `.planning/sketches/MANIFEST.md`, the todo `.planning/todos/pending/2026-11-08-a-guide-tab-on-every-page.md`, the words
page `18-GUIDE-WORDS.md` in this folder, and sketch 021 / Phase 17's GUIDE (`components/bottom/bottom-guide.tsx` on branch
`claude/beautiful-fermi-ad3fb7`), whose dress every card wears.

## Goal

Every design page teaches itself. TEMPLATE, ROCKER, RAILS, VOLUME and FINS each gain a **GUIDE** as the last tab of their own tab
strip: one card per control or per named choice, grouped under the sidebar's own headings and named as the page labels the control,
with the board's own value beside the name, a cartoon of the board the shaper has open drawn the page's own way with that one setting
pushed by a stated amount in muted dashes, two short sentences (what it is and looks like; what it does to the board or the ride) and
a *How to shape* note. On FINS the cards run setup by setup and carry the MODEL INFO tab's notes, and that tab goes. Nothing on a
card can be pressed and nothing on it changes the board: the GUIDE reads, it never writes.

The founder's words: *"The Guide looks awesome. Love everything about it. I think every page needs a guide like this. Super useful on
what each parameter does to/for the board. Would also be nice to add a 'how to shape' note too"* (2026-11-08, on sketch 021);
*"Round two: do the other four pages the same way"*; *"Template Depth only used for Diamond and Swallow tails, say so. FINS guide =
reorganize the guide into Fin Setups along with their model info, and combine the model info tab into this new guide page, we don't
need both"* (2026-11-09); *"Let's build this and go live"* (2026-11-09).

## Requirements

The founder's words are quoted where there are words; the sentence after each is the requirement as this phase reads it. The sketch
round each rests on is in brackets.

1. **R1 — GUIDE is the last tab on each of the five pages, in the page's own strip.** TEMPLATE: VIEWER · ADD WINGS (or WINGS · n) ·
   GUIDE. ROCKER: VIEWER · PLANING · DATASHEET · GUIDE on a computer; VIEWER · TOP · PLANING · DATA · GUIDE on a phone — five tabs fit
   a 390-dot iPhone on one line, with the board's name in the strip cut short as it must. RAILS: VIEWER · DATA · INSTRUCTIONS · GUIDE.
   VOLUME: ESTIMATE · GUIDE (the page's one-tab strip gains a second). FINS: VIEWER · DATA · GUIDE — **MODEL INFO is removed**, its text
   carried onto the cards (R9). No other tab, viewer, sidebar or data panel changes. [rounds one and two; round three for FINS]
2. **R2 — One card per control or named choice, under the sidebar's headings, in the sidebar's order.** 84 cards as the sketch lists
   them and `18-GUIDE-WORDS.md` names them: ROCKER 14 (Inputs · Blank · Rocker · Foil), TEMPLATE 22 (Board Length · Nose Controls ·
   Widepoint Controls · Tail Controls · Wings — the WINGS tab's own sidebar), RAILS 17 (Inputs · Nose Rail · Center Rail · Tail Rail as
   one group whose cards stand for all three rails · Advanced), VOLUME 8 (Inputs · What the ESTIMATE card reads), FINS 23 (Inputs ·
   Convention · Single Fin · Twin · Thruster · 2+1 · Quad · Advanced). A choice (a tail shape, a tip style, a fin setup, a model) is
   one card per option, as 021's five vees. Each card is named as the page labels the control; a few names follow the board the way
   the page's label does (FINS' *Fin Base Length* / *Fin Box Length*). [rounds one to three]
3. **R3 — The board's own value beside the name.** Each card's tag is the open board's own value for that control, through the page's
   own formatters (`2 1/4"`, `centered`, `60/40`, `Balanced`, `12" · Automatic`), *On this board* for a choice's active option, and a
   short word where the control does not apply to this board (*Diamond & swallow only* on Depth for any other tail; `—` on Tail Block
   for a pin or round; *Needs 8'0"* on McKee Longboard under eight feet). The tag follows the board as it changes. [round one; round three]
4. **R4 — The cartoon is the page's own drawing of the open board with the one setting pushed.** The whole board first in a strip,
   a dash-dot window on the part the control shapes, then that part closer: the side view in its blank on ROCKER (foam shade,
   baseline, thinning marks), the outline from above on TEMPLATE, the board from above with its three stations and the cross-section
   at one of them with the bands in the page's own colours and the finished rail in ink on RAILS, the plan from above and the center
   cross-section on VOLUME (the page has no drawing of its own), the tail's last 24" from above with the fins as lines from trailing to
   leading edge on FINS. The one setting is pushed by a stated amount and drawn in muted dashes beside the board as it is, the number
   dimensioned the way the VIEWER reads it, and a line under the drawing says what the dashes show (*dashed · +1" nose rocker*). A card
   drawn as a setup or a model with nothing pushed says *drawn as · Thruster — McKee Gun*. Every dimension line sits outside the board
   the drafting way. [rounds one to three; the push amounts in `18-GUIDE-WORDS.md`]
5. **R5 — The pushes are real.** Every dashed profile, outline, section, estimate and fin set is the app's own maths with that one
   field changed — `designSideProfile` for ROCKER; `buildOutline` with `TAIL_PRESETS` and `nextWing` for TEMPLATE;
   `computeRailSectionOutput` and `finishedRail` for RAILS; `computeVolume` for the quick estimate; `computeFinPlacement` with
   `resetAdvanced` for FINS — never drawn freehand, and recomputed from the live board so switching boards or moving a slider redraws
   every card. Any new helper that composes these lives in `lib/geometry/` with unit tests (Rule 1). [rounds one and two]
6. **R6 — Two sentences and a How to shape note on every card; Model info on FINS.** What it is and looks like (ink), what it does
   (muted, the same paragraph), then under a dashed rule a *How to shape* note in the shop's words. On FINS fourteen cards also carry a
   *Model info* note — the MODEL INFO tab's text on where that model's guidance comes from, verbatim — and a *Trailing-edge convention*
   card carries that tab's first paragraph as its two sentences, the rounding grain said in the shaper's system (1/16" or the
   millimetre). **All the words live in `18-GUIDE-WORDS.md`**, the founder's page to mark up; the code's words module is tested against
   it line for line, as Phase 17 tests `bottom-guide-words.ts` against `17-GUIDE-WORDS.md`. The sentences and shop notes are first
   drafts for his pen; the FINS notes and the Convention card are his own words already. [rounds one to three; Phase 17's pattern]
7. **R7 — Informational only.** A card is words and a picture, never a control: nothing on it can be pressed and nothing on it changes
   the board. [021's rule, carried]
8. **R8 — The GUIDE on a phone and a computer.** Three cards across on a computer where the folder is wide enough, two below that, one
   on a phone — Phase 17's grid rule (never narrower than 236 dots). The cards scroll inside the folder; the page itself never scrolls.
   On a phone the GUIDE lives inside the pinned drawing area like any other tab, and a phone held sideways gets the desktop shell by
   width, as the app does. Where a card's board stands nose up on a phone (TEMPLATE's VIEWER does), the cartoon may too. [round one]
9. **R9 — FINS by setup, with its model info; MODEL INFO gone.** *"Reorganize the guide into Fin Setups along with their model info,
   and combine the model info tab into this new guide page, we don't need both."* Inputs, then Convention, then one group per Fin Setup
   in the sidebar's order — the setup's own card first, then its models or templates (Twin's three templates; Thruster's four front
   models, which the quad's front pair uses too; Quad's four rear models and Add 5th/Center fin) — then Advanced (the forward fins'
   Fin Base Length, Aft/Forward position, Off-Rail and Toe-In). The MODEL INFO tab and `components/fins/fin-model-info.tsx` are removed
   with their tests; no sentence of that tab is lost. There is no cant card: the page has no cant. [round three]
10. **R10 — Depth is a diamond's or a swallow's alone.** *"Template Depth only used for Diamond and Swallow tails, say so."* The card
    says so in words, is tagged *Diamond & swallow only* on any other tail, notes it on the drawing, and draws the board as a swallow in
    dashes with the depth dimensioned so the setting is still seen; on a diamond or swallow the board's own depth is pushed. [round three]
11. **R11 — Rule 2 everywhere a figure shows.** Every tag, dimension label, caption and figure-carrying sentence reads in the shaper's
    system through `lib/geometry/units.ts` and the page's own formatters: dims in 1/16" or centimetres to one decimal, marks in 1/16" or
    whole millimetres, litres the same in both, the Convention card's grain *1/16"* or *millimetre*, the Depth ghost's depth as a mark.
    [round one; the app's rule]
12. **R12 — Nothing else moves.** No change to any page's existing tabs, viewers, sidebars, DATA, printed pages, saved boards, presets
    or litres; no database change; the words module and the card components are the only new surface. The desktop baseline screenshots
    that gain a GUIDE tab button are re-recorded on purpose and nothing else in them changes. [the app's rules]
13. **R13 — Checked, pictured and one go-live gate.** Unit tests for every new `lib/geometry/` helper; browser tests for the GUIDE on
    each page on a computer and both phones (the tab present and last, MODEL INFO gone, 84 cards in their groups with a cartoon, the two
    sentences, the How to shape note and FINS' fourteen Model info notes, the tags on the Shortboard and the Fish, one card across on a
    phone with the page never scrolling as a whole, Imperial and Metric); the words test against `18-GUIDE-WORDS.md`; the existing suite
    green. Pictures of every page's GUIDE on a computer and a phone in the phase folder. Go-live on one gate: `npm test`, `npm run lint`,
    `npm run build` from the main checkout and the full `npm run test:e2e` read to its EXIT line, then push to `main` and a confirmed
    Vercel deploy, with the founder's own look on his phone after. [the founder: *"Let's build this and go live"*]

## Carried constraints

- **C1 — Rule 1:** geometry in `lib/geometry/`, pure and tested; no formula inlined in a component.
- **C2 — Rule 2:** the shaper's system is display-only; storage stays metric.
- **C3 — The three screen switches** (width = layout, pointer = control size, height = short screen) are never conflated; the GUIDE's
  grid asks its own width, the tab strip follows the page's existing rules.
- **C4 — The viewers' drafting grammar** (one ink, the stringer's `16 4 4 4`, stations `5 4`, the widepoint `2 3`, the cutting line's
  dash-dot, muted dashes for a push) and the app's four palettes; no new hue.
- **C5 — Phase 17's dress.** The card's look — border, name row, tag caps, the 13/1.45 paragraph, the dashed rule, the How to shape
  caps — is `components/bottom/bottom-guide.tsx`'s (on branch `claude/beautiful-fermi-ad3fb7`) so the six GUIDEs read as one. Phase 18
  builds the shared card as its own component (`components/guide/`), and BOTTOM adopts it when both are on `main` (a follow-up todo
  for Phase 17, not this phase's work). Phase 18 avoids rewriting files Phase 17 rewrites where it can, and the merge after is expected.
- **C6 — No `cd`** into any worktree or subfolder from a session; absolute paths and `git -C`. The founder's checkout and port 3005 are
  his: executors work in their own worktrees.

## Not in this phase

Tappable cards that put a setting on the board; the BOTTOM page's own GUIDE (Phase 17, sketch 021); a GUIDE on SUMMARY, 3D or the
home page; editing the words in the app; printing a GUIDE; a GUIDE for App Default Settings; any change to what a page calculates.

## Acceptance

Every requirement above is checked by a test or a picture named in the plans; the founder opens each page on his computer and his
phone, finds GUIDE last in the strip, reads his board's own values beside the names, sees the pushed drawings move when he changes
the board, finds FINS' MODEL INFO text on the cards and the tab gone, and reads on TEMPLATE's Depth that it belongs to a diamond or a
swallow. He marks up `18-GUIDE-WORDS.md` at his leisure; a change there is one commit that the words test enforces.
