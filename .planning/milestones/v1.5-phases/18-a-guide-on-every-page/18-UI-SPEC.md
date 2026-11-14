---
phase: 18
slug: a-guide-on-every-page
status: approved
reviewed_at: 2026-11-09
checker: gsd-ui-checker — APPROVED, 0 blocking, 3 non-blocking flags (typography roles, 12px/2px spacing steps, the 66dvh arithmetic)
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, cssVariables true, iconLibrary lucide, registries {})
created: 2026-11-09
---

# Phase 18 — UI Design Contract

> The visual and interaction contract for the **GUIDE tab on five pages** — TEMPLATE, ROCKER, RAILS, VOLUME and FINS — and for
> the one tab FINS loses (MODEL INFO). The page is **decided**: sketch 022 (`.planning/sketches/022-page-guides/index.html`,
> three rounds, "Let's build this and go live", 2026-11-09). This contract translates it into the app's tokens, sizes, words
> and states; it redesigns nothing. It takes as given:
>
> 1. **`18-CONTEXT.md`** (D-01 to D-20) and **`18-SPEC.md`** (R1–R13, C1–C6), locked. Where they leave a choice, this contract
>    takes **the sketch's own answer** and marks it `(sketch; the founder may overrule)`; where the sketch is silent or wrong it
>    makes the choice and marks it `(Claude's discretion — founder may overrule)`.
> 2. **`18-GUIDE-WORDS.md`**, the source of truth for every card's name, sentences, notes, tags and captions. **Nothing in it is
>    rewritten here**; the Copywriting contract points at it and specifies only the chrome that is not on that page.
> 3. **Phase 17's approved UI-SPEC §5 and `bottom-guide.tsx`** (branch `claude/beautiful-fermi-ad3fb7`, read from the copies in the
>    session scratch folder): the card's dress, copied class for class. Phase 18 builds it once as `components/guide/` so BOTTOM can
>    adopt it later (D-14, D-19).
> 4. **The sketch findings** (`.claude/skills/sketch-findings-shaper/`): one ink, one dash per role, no new hue, phone real estate is
>    expensive.
>
> Every claim about the app was read from the file on 2026-11-09 (worktree `elastic-joliot-3e9625`) and is cited `path:line` where it
> matters (a few `tabbed-panel.tsx` line numbers are carried from Phase 17's reading; the planner re-greps them). Sketch numbers were measured by opening `index.html` in headless Chromium (1440, 1280, 1024, 820 wide and iPhone 14);
> contrast was computed from the ramps in `app/globals.css:256-392`. Product strings use the product's spelling (Center, 1/16");
> prose here is British.
>
> **Plain English, for the founder:** each of the five pages gets a GUIDE button, last in its row of tabs (FINS's MODEL INFO button
> goes, its words move onto the cards). Opening it shows one card per control — "Center Thickness", "Nose Rocker", "Hard Edge" —
> with your board's own number beside the name, a small drawing of your board with that one setting pushed in grey dashes, two
> sentences and a *How to shape* note. Nothing on a card can be pressed. Four things differ from the sketch, each measured and
> each marked so you can overrule it: the drawing's small words are a legible size on every card width; the grey dashes are a touch
> darker so they read in all four themes; the dashes' caption is plain muted ink so it passes the contrast bar; and a few drawing
> collisions the sketch left (a whole-board frame running over a card's name, labels sitting on top of fins) are fixed in the build.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, cssVariables `true`, `"registries": {}` (the shadcn gate is answered by the file; nothing asked, nothing run) |
| Component library | Base UI (`@base-ui/react`) through shadcn's Base UI preset, not Radix |
| Icon library | lucide-react. **No new icon, and none on a card.** A card has no control to draw an icon for. |
| Font | Inter (`--font-display` / `--font-body`); tracking `--tracking-architectural` 0.15em |

**What the GUIDE builds from, all of it existing:**

- **`TabbedPanel`** (`components/viewer/tabbed-panel.tsx:58`): one more `PanelTab` per page, last in the array; `compactOnPhone="text"`
  while GUIDE is active (`:127`); `BoardNameTab` stays the `trailing` item (`:142`). VOLUME's strip, today a one-tab label with no
  `onSelect` (`components/volume/volume-estimator.tsx:50`), gains `onSelect` and a second tab.
- **The five editors' own tab state:** `TEMPLATE` `requestedTab` (`components/outline/outline-editor.tsx:106`), ROCKER
  `requestedTab` and its two tab lists `ROCKER_TABS` / `ROCKER_TABS_SMALL_SCREEN` (`components/rocker/rocker-editor.tsx:104`, `:119`,
  `:174`), RAILS `activePage` (`components/rails/rail-band-editor.tsx:288`, `:337-354`), FINS `FinTab` / `TAB_LABEL` / `TAB_ORDER`
  (`components/fins/fin-placement-editor.tsx:20-23`, `:67`). Each gets `"guide"` added as its last id; FINS's `"info"` id is removed.
- **Phase 17's card dress**, copied (§3), as a new shared `components/guide/` — `GuideTab` (intro + groups), `GuideCard`,
  `GuideCartoon` (strip + window + detail + caption frame), and a words module tested against `18-GUIDE-WORDS.md`.
- **The viewers' drawing tokens** (`app/globals.css:901-942`) and `RAIL_SEGMENT_COLORS` (`components/rails/rail-section-plot.tsx:91`);
  `DimensionLine` / `DimensionTick` (`components/viewer/callout-primitives.tsx:365`, `:398`); the pinned-text idiom
  `useSvgFitScale` / `pinnedCalloutSizes` (`:153`, `:102`).
- **The pages' own formatters** (Rule 2, done): `formatDim`, `formatMark`, `formatLength`, `formatLitres`, `stationLabel`,
  `finRoundingGrain`, `measureSlider` (`lib/geometry/units.ts`, `measure-display.ts`, `fins.ts`); `bandBoardName`
  (`components/design/board-name-copy.ts:20`) for the intro's board name.
- **The app's own maths for every push** (R5): `designSideProfile`, `buildOutline` + `TAIL_PRESETS` + `nextWing`,
  `computeRailSectionOutput` + `finishedRail`, `computeVolume`, `computeFinPlacement` + `resetAdvanced`.

**Not used, on purpose:** any tappable card, hover state, press state or cursor change (D-10); an accordion, a search box or a
filter (84 cards scroll); CSS 3D or scroll-driven animation (older Safari); `phonePinned="none"` while GUIDE is open — it would let
the page scroll as a whole (§6); a second `TabbedPanel` nested inside the first.

---

## Spacing Scale

> **Checker's note (2026-11-09, non-blocking):** `p-3` (12px) is an approved project step (`tabbed-panel.tsx`, Phase 17's checker), and the
> name row's `gap-y-0.5` (2px) is recorded beside it as an approved step for a wrapped tag's second line. `calc(66dvh − 40px)` is
> measured arithmetic, not a token. Recorded, not changed.

Declared values for this phase's new surfaces. All multiples of 4.

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | A card's drawing → its caption (`gap-1`); the *How to shape* / *Model info* caps label → its note (`mb-1`) |
| sm | 8px | The card's inner gap (name row → drawing → sentences → each note, `gap-2`); the grid's gap both ways (`gap-2`); each note's dashed rule → its label (`pt-2`); the name → its tag (`gap-2`); a card's padding on a phone (`p-2`, under **both** phone rules) |
| sm+ | 12px | A card's padding on a computer (`p-3`) — a step this project already uses everywhere (the folder card's `p-3`, `tabbed-panel.tsx:249`), the step Phase 17's approved contract recorded for the same card |
| md | 16px | The intro → the first group heading, and group → group (`mt-4`); a group heading → its list (`mb-2` is 8) |
| lg / xl / 2xl / 3xl | 24 / 32 / 48 / 64px | Not used by this phase |

**Inherited, reused exactly, never "corrected" to the table:** the tab strip's 22-dot phone height and 44-dot touch box on a coarse
pointer, the folder's 2-dot rim and the 9-dot clearance (`tabbed-panel.tsx:159`, `:198`, `:218`, `:250-252`, `:302`); the drawing
column's paddings (`components/design/design-screen-shell.tsx:201-224`).

**Exceptions (measured, not tokens):**

- The GUIDE's phone height is **`calc(66dvh − 40px)`** per card box (§6): 31 dots of rims and strip plus the 9-dot clearance a
  tappable strip carries — the same arithmetic as Phase 17's, from `tabbed-panel.tsx:159`, `:218`, `:250-252`.
- A cartoon's own room (the 300-wide drawing's 8-dot side margins, the 6-dot gap between strip and detail, the window's 3-dot
  overhang, 2-dot arrows) is **drawing geometry in the cartoon's own units, not layout spacing** (§4).

**Touch.** A card holds nothing to press, so the 44-dot rule has nothing to add inside the GUIDE. It applies to the one thing that
is touched: the GUIDE tab, which takes the strip's existing 44-dot touch box on a coarse pointer for free. The scrolling list is
focusable for the keyboard (§9) and scrolls by a finger drag like every folder.

---

## Typography

> **Checker's note (2026-11-09, non-blocking):** the declared table is four sizes and two weights; the 10px/700–800 caps used by the
> word tags, the group headings, the captions and the drawing text are the project's existing label role (Phase 17's contract was
> approved with the same structure), and 13 (body) and 14 (name) sit close together on purpose. Recorded, not changed.

**Declared for this phase's new surfaces: four sizes, two weights.** (Identical to Phase 17's card.)

| Role | Size | Weight | Line height | Usage in this phase |
|------|------|--------|-------------|-------|
| Card name | 14px (`text-sm`) | 600 | 1.25 (`leading-tight`) | `Center Thickness`, `Hard Edge`, `Add 5th/Center fin`; `text-surf-ink` |
| Card text | 13px (`text-[13px]`) | 400; the first sentence 600 | 1.45 (`leading-[1.45]`) | The two sentences, one paragraph: what it is (600, ink) then what it does (400, muted) |
| Meta | 12px (`text-xs`) | 400 | 1.5 (`leading-normal`) | The intro; every *Model info* and *How to shape* note; a group heading's qualifier (`— every rail has these`) |
| Value tag | 11px | 600, `tabular-nums` | — | A control's own value beside its name: `2 1/4"`, `60/40`, `12" · Automatic`, `29.61 L`; `text-surf-accent-ink`, not upper-cased, no tracking |

**Inherited roles this surface uses (documented, not declared, unchanged from Phase 17 and the app):**

| Role | Size / weight | Source |
|------|---------------|--------|
| Word tag (`On this board`, `Diamond & swallow only`, `—`, `Needs 8'0"`) and the *How to shape* label | 10px / 800, uppercase, `tracking-architectural`, accent-ink | Phase 17's tag, `text-[10px] font-display text-surf-accent-ink uppercase tracking-architectural font-extrabold` |
| The *Model info* label | the same 10/800 caps, in **`text-surf-ink-muted`** — the sketch's own (`.card p.info .cap`) | quiet beside *How to shape* |
| Group heading | 10px / 800, uppercase, tracked, ink | `mt-4 mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold` |
| The caption under a drawing (`dashed · …`, `drawn as · …`) | **10px / 700**, uppercase, 0.12em tracking, muted; every figure inside it in a `normal-case tracking-normal` span | the app's drawing names, `STATION_NAME_SIZE = 10` (`components/rocker/rocker-view-frame.ts:298`) |
| Tabs `GUIDE` etc. | 12px / 700, uppercase, tracked | `tabbed-panel.tsx:153` |
| Drawing text (inside the cartoon): a value or dimension | 10px, 600, `tabular-nums`, ink | §4 |
| Drawing text: a window's name (`WHOLE BOARD`, `TAIL, 24" FROM ABOVE`) | 10px, 700, uppercase, 0.12em, muted | §4 |

**Why 10, not the sketch's 9 and 8.** The sketch drew the caption at 9px, the cap labels at 9 and the SVG's names and values at 8 and
10 in a 300-unit-wide drawing. In the app a 300-wide drawing is **210–290 dots wide on a computer** (a card is 236–316 wide, §6),
so the sketch's 8 and 10 paint at **5.6–7.8 dots** — I measured the sketch at 0.74 to 0.91 scale on a computer and 1.13–1.26 on a
phone. The app draws nothing smaller than 10 (Phase 17 recorded the same floor and raised its drawing text to 10/11 for that reason,
`17-UI-SPEC.md` Typography). So: **the HTML caption and the tag caps are 10, and the drawing's text is pinned in screen dots**
(size ÷ the SVG's own fit, the rail plot's `CALLOUT_PX.name / shownFit` idiom, `rail-section-plot.tsx:689`) at 10 for both values
and names, floor `MIN_PINNED_FIT_SCALE` (0.66, `callout-primitives.tsx:311`; the narrowest card's fit is 0.70, so the floor never bites). A phone and a computer then read the same 10-dot words.
`(Claude's discretion — founder may overrule)`. The cost is crowding in the narrowest cards (236 dots); §12 lists the collisions
the build must fix and the test that proves it.

**Units are never upper-cased** (the rule Phase 17 recorded): every formatted figure in a caption, a tag or a drawing label sits in a
`normal-case tracking-normal` span (a `<tspan>` in SVG), so Metric reads `dashed · +13 mm nose rocker`, never `+13 MM`.

**Measured widths** (headless Chromium, the app's own built Inter latin subset from `.next/static/media`, 2026-11-09; a card's inner
width is 210 dots at the 236 minimum, 237 at 1280, 290 at 1440, 244 at 1024, 378 at 820, 340 on an iPhone 14):

| String | Role | Width |
|--------|------|-------|
| `On this board` | word tag, 10/800 caps tracked | 156.3 |
| `Needs 243.8 cm` | word tag | 165.4 |
| **`Diamond & swallow only`** | word tag | **277.1** — wider than every computer card, so **a word tag may wrap to two lines** (`DIAMOND & SWALLOW / ONLY`); it never overflows |
| `30.5 cm · Automatic` / `12" · Automatic` | value tag, 11/600 | 151.1 / 113.8 |
| `US Blanks 6'3"RP` · `1042.8 sq in` · `7/16" · 15/16"` | value tag | 133.8 · 91.4 · 98.0 |
| `Nose Thinning Starts` + its value tag | name + tag together | about 150 + 151 = **301 > 210** — **the row wraps and the tag drops under the name, still right-aligned** |
| `Length-Weighted Effective Thickness` · `Lock to front fin · Offset from the fin` · `Board Thickness · Thickness @12"` · `Tail Rail Blends From · Ends At` | name, 14/600 | **282.7 · 271.7 · 261.1 · 227.4** — each wraps to two lines at the narrowest cards (the first two at every computer width but 1440) |
| `dashed · 7/8" off the rail` | caption, 10/700 caps .12em | 272.2 — two lines on a computer |
| `dashed · 6'8" → 31.8 L quick estimate` | caption | 389.6 — two lines |
| `drawn as · Thruster — Basic (Half Rate)` | caption | 433.7 — two lines |
| **`drawn as · Quad — McKee SB/Gun + Center (Five-fin)`** | the longest caption | **556.6 — three lines at 210–237, two on a phone** |

So **a caption wraps** on a computer, and that is accepted rather than shortened (the words page is the founder's, D-09): the caption is a
right-aligned block `text-balance` (where the browser has it), at most three lines, and the long-text test (§13) covers the
tallest card. `(Claude's discretion — founder may overrule)`.

---

## Color

**No new hue, no new colour-contract token.** **One** new **drawing token** is added beside the callout tokens in the `:root` drawing
block (`app/globals.css:932-942`), assigned once off a contract token so it follows every theme (the way `--outline-ghost` does):

| New drawing token | Value | Meaning |
|-------------------|-------|---------|
| `--outline-push-line` | `color-mix(in srgb, var(--surf-ink-muted) 75%, transparent)` | The one setting pushed, drawn in muted dashes `3 2` beside the board as it is — the mark the card teaches |

**Why a new token, and why 75%.** The sketch's own dash colour is 70% muted (`--ghost`, `template.html:21`). The app's existing
`--outline-ghost` is 55% (`app/globals.css:932`), faint by design for TEMPLATE's last-edit reference — **below the 3:1 bar for a
graphic** (2.39 / 2.39 / 3.16 / 2.58 on the panel; 2.25 / 2.20 / 2.94 / 2.49 on the board fill). The push is the card's whole
point, so it gets its own colour. Computed 2026-11-09 with WCAG relative luminance, Daylight / Chalk / Slate / Phosphor:

| Strength of muted | on the panel | on the board fill | |
|---|---|---|---|
| 55% (`--outline-ghost`) | 2.39 · 2.39 · 3.16 · 2.58 | 2.25 · 2.20 · 2.94 · 2.49 | fails 3:1 in Daylight and Chalk |
| 70% (the sketch) | 3.21 · 3.21 · 4.36 · 3.55 | **2.93 · 2.86** · 3.87 · 3.20 | misses 3:1 on the fill in Daylight and Chalk |
| **75% (this contract)** | 3.56 · 3.56 · 4.83 · 3.93 | 3.22 · 3.13 · 4.23 · 3.48 | **clears 3:1 in all four, on both** |
| 80% | 3.96 · 3.96 · 5.33 · 4.35 | 3.55 · 3.44 · 4.61 · 3.77 | (heavier than the grammar wants) |

`(sketch; raised from 70 to 75% so every pairing clears 3:1; the founder may overrule)`.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-sidebar` (the panel) and `--surf-canvas` (the drawing column) | #ffffff / #ffffff / #12141a / #050805 and #dfdcd3 / #dfdcd3 / #1a1d25 / #142414 |
| Secondary (30%) | `--surf-tab-active` / `--surf-panel` (the folder and the cards), `--outline-board-fill` (the board in every drawing), `--surf-ink-muted` (the sentences, notes, caption), `--surf-line` / `--surf-line-faint` (card edges, rules) | Everything that is not the accent |
| Accent (10%) | `--surf-accent-ink` as words and marks | Only the list below |
| Warning / destructive | none | **This phase has no warning and no destructive action.** The GUIDE never takes `--surf-warning-ink`; `Diamond & swallow only` and `Needs 8'0"` are information, not warnings |

**Accent reserved for** (and nothing else in the GUIDE):

1. **A card's word tag** — `On this board`, `Diamond & swallow only`, `—`, `Needs 8'0"`, `None yet` (10/800 caps, accent-ink).
2. **A card's value tag** — the control's own value (11/600 accent-ink), as the sketch draws it (`.card h4 .now`).
3. **The *How to shape* label** (10/800 caps, accent-ink). (*Model info*'s label is muted, not accent.)
4. **The fins** in every FINS drawing, accent-ink, 1.5 dots, round caps — FINS' own fin colour (`components/fins/fin-viewer.tsx:694`).
5. **The GUIDE tab's selected state** and keyboard focus rings (`.focus-ring-accent`, `app/globals.css`) — `TabbedPanel`'s existing rules.

RAILS' cartoons use the page's own band colours (`RAIL_SEGMENT_COLORS`) and the finished rail in ink — existing hues, not new.

**The cartoons' colours, exactly** (hex only for the contrast check):

| Part | Token | Treatment |
|------|-------|-----------|
| Board (every page) | fill `--outline-board-fill`, edge `--outline-ink` 1 | The one board, never filled darker |
| Blank's foam (ROCKER) | `--outline-foam-shade` fill, edge `--outline-blank-line` 1, solid | A real object, so solid; dashes mean reference |
| Baseline, stations, derived marks | `--outline-station-line`, 1, `5 4` (baseline `4 3`) | Faint by rule |
| Stringer | `--outline-station-line`, 1, `12 3 3 3` | The viewers' `16 4 4 4` rhythm (long, three short) shortened to the card's scale, the way Phase 17's cartoon draws it (`bottom-cartoon.tsx` `DASH`) |
| Widepoint | `--outline-widepoint-line`, 1, `2 3` | |
| The window and a cutting line | `--outline-ink`, 1, `7 2.5 1.5 2.5` | The drawing convention's dash-dot |
| **The push** | `--outline-push-line`, 1.2, `3 2` | Beside the board as it is, never over it unless the thing pushed is the board's own edge |
| Dimension lines, ticks, values | `--outline-dim-ink` (`app/globals.css:941`), 1 | Ink |
| Extension / leader lines | `--outline-station-line`, 1 | |
| Fins | `--color-surf-accent-ink`, 1.5, with the VIEWER's own dots (`--outline-ink`) | |
| RAILS bands / finished rail | `RAIL_SEGMENT_COLORS` / `--outline-ink` | As `rail-section-plot.tsx` |
| Window and detail frames | `--outline-station-line`, 1, rx 3 | |
| Drawing names | `--outline-callout-label` (`app/globals.css:942`) | muted |

**Legibility** (computed 2026-11-09; Daylight / Chalk / Slate / Phosphor):

| Pairing | Ratio | Bar |
|---------|-------|-----|
| Value tag and word tag (accent-ink) on the panel | 6.77 · 10.57 · 5.14 · 7.00 | 4.5 text ✓ |
| Sentences, notes, *Model info* label, caption (muted) on the panel | 6.28 · 6.28 · 7.69 · 6.32 | 4.5 ✓ |
| Ink (name, first sentence, dimension values) on the panel / on the board fill | 14.46 · 14.46 · 16.71 · 9.71 / 12.30 · 11.76 · 13.81 · 7.84 | 4.5 ✓ |
| Muted drawing names on the board fill | 5.35 · 5.11 · 6.36 · 5.11 | 4.5 ✓ |
| The push line on the panel / on the board fill | 3.56 · 3.56 · 4.83 · 3.93 / 3.22 · 3.13 · 4.23 · 3.48 | 3 graphic ✓ |
| Fins (accent-ink) on the board fill | 5.76 · 8.60 · 4.25 · 5.65 | 3 graphic ✓ (Phase 17's measure) |

**The caption is muted *ink*, not the dash's colour.** The sketch coloured `dashed · …` in the ghost (70% muted) and `drawn as · …`
in muted. Ten-dot words in the push colour would measure 3.56 on Daylight — under the 4.5 text bar — so **both captions are
`text-surf-ink-muted`** (6.28+). The word *dashed* and the drawing's own dashes already tie the two together
`(Claude's discretion — founder may overrule)`.

**`--surf-line` and `--surf-line-faint` are the same colour in Daylight, Chalk and Phosphor** (`app/globals.css:267-268`,
`:311-312`, `:380-381`), so a card's *On this board* edge differs from the others in Slate only. The tag carries it; the edge is a bonus
(Phase 17 recorded the same).

---

## Copywriting Contract

**Every card's name, tag, two sentences, *Model info* note, *How to shape* note and caption is in `18-GUIDE-WORDS.md`** — the
founder's page to mark up — and the words module is tested against it line for line (R6). **Do not rewrite or restate those words
anywhere else.** This section specifies only the chrome that page does not carry, and the rules that make its Imperial figures read
right in Metric.

### Headline elements (template rows)

| Element | Copy |
|---------|------|
| Primary CTA | **None.** A GUIDE reads and never writes (D-10). The page's own filled button stays Step nav's Next. |
| Empty state heading / body | **None.** A GUIDE never empties: every card always draws, on every board, from the board in the store. A board that has no wing, no blank override or no tail block still gets all of its cards (§7). |
| Error state | **None.** There is no network, submit or input path; the maths is pure and total on a valid board. A card whose control does not apply says so in its tag (below), never in an error. |
| Destructive confirmation | **None.** Nothing on a card can be pressed. |

### Where the GUIDE is named

| Place | Copy |
|-------|------|
| The tab, on all five pages (`PanelTab.label`) | `GUIDE` — last in every strip, no short label (it is one short word; the five-tab list fits a phone, §1) |
| Tab accessible name | `GUIDE` (the visible word); the panel is `role="tabpanel"` as every tab's is |
| The scroller's accessible name | `Guide to {page}` — `Guide to Template`, `Guide to Rocker`, `Guide to Rails`, `Guide to Volume`, `Guide to Fins` (the page's `screenWord`, `lib/screen-steps.ts:40-44`) `(Claude's discretion — founder may overrule)` |
| FINS's removed tab | `MODEL INFO` is gone. The strip reads `VIEWER · DATA · GUIDE`. No redirect, no stub tab. |
| Each strip, as it must read | TEMPLATE `VIEWER · ADD WINGS · GUIDE` (`WINGS · n` once wings exist); ROCKER computer `VIEWER · PLANING · DATASHEET · GUIDE`, phone and short/narrow window `VIEWER · TOP · PLANING · DATA · GUIDE`; RAILS `VIEWER · DATA · INSTRUCTIONS · GUIDE`; VOLUME `ESTIMATE · GUIDE`; FINS `VIEWER · DATA · GUIDE` |

### The GUIDE's own chrome

| Element | Copy |
|---------|------|
| Intro (12/400 muted, `max-w-prose`) | **From `18-GUIDE-WORDS.md`**, one per page, with `{board name}` filled from `bandBoardName(modelId, boardName)`. A board never saved or named reads **`your board`** — never `your Untitled` (the rule Phase 17's contract set). ROCKER's intro also fills the board's blank name. |
| Group headings | The sidebar's own, from `18-GUIDE-WORDS.md` (`Nose Controls`, `Widepoint Controls`, `Tail Controls`, `Wings`; `Inputs`, `Blank`, `Rocker`, `Foil`; `Inputs`, `Nose Rail · Center Rail · Tail Rail`, `Advanced`; `Inputs`, `What the ESTIMATE card reads`; `Inputs`, `Convention`, `Single Fin`, `Twin`, `Thruster`, `2+1`, `Quad`, `Advanced`). Drawn in caps by the heading class (§3). |
| A heading's qualifier (the words after the dash on the words page: `— the WINGS tab's own sidebar`, `— read off the blank — hand-set until you pick one`, `— one box on the stringer`, `— the forward fins'; the rear pair and the center fin have the same`) | In a `normal-case tracking-normal font-normal text-xs text-surf-ink-muted` span after the heading's caps, `ml-2`, the way Phase 17's cut name sits on its ruled headings |
| Tag, a choice's active option | **`On this board`** (caps by the tag class) |
| Tag, a toggle that is on | **`On this board`**; unticked: no tag (Symmetrical, Use Single Tuck, Sharp Bottom Tuck, Import Rocker & Foil Values, Import Designed Board, Pin tips to · Deck / · Bottom, the five tail shapes, the setup and model cards) |
| Tag, not applicable | `Diamond & swallow only` (TEMPLATE Depth on any tail but a diamond or a swallow, D-11); `—` (Tail Block on a pin or round tail, D-05); `Needs 8'0"` (FINS McKee Longboard on a board under eight feet; Metric `Needs 243.8 cm` — 8'0" is 2438.4 mm, one-decimal centimetres per Rule 2) |
| Tag, a value | The control's own value, read **exactly as the page's own control reads it** (Rule 2 table below) |
| Tag, wings, none yet | `None yet` (TEMPLATE `+ Add a wing`); with wings the Position / Depth / Vertical run / Corner radius / Lock cards read wing 1's own values and `+ Add a wing` reads `1 wing` or `2 wings` `(sketch for the first, Claude's discretion for the rest — founder may overrule)`; Lock to front fin reads `Locked` or `Free` |
| Caption, a pushed card | `dashed · {what the dashes show}` (words page: `dashed · +1" nose rocker`) |
| Caption, a setup or a model with nothing pushed | `drawn as · {Setup} — {Model}` (words page: `drawn as · Thruster — McKee Gun`; the quad's front pair uses the thruster models: `drawn as · Quad — McKee SB/Gun`; the fifth box: `drawn as · Quad — McKee SB/Gun + Center (Five-fin)`) |
| Caption, none | A card where nothing is pushed and nothing is a setup or a model carries **no caption line** at all: the five tail shapes, Blank, Pin tips to · Deck / · Bottom, Import Designed Board, Import Rocker & Foil Values, the Trailing-edge convention. (`Pin tips to` and `Blank` draw a profile with its own labels, nothing dashed.) |
| Caption, McKee Longboard on a short board | `drawn as · Quad — McKee SB/Gun` — the fallback the app would use (D-13); the tag `Needs 8'0"` says why. Nothing else added. |
| *How to shape* label | `How to shape` (caps by the tag class) |
| *Model info* label | `Model info` (caps, muted) |
| Convention card tag | `to 1/16"` Imperial, `to 1 mm` Metric — through `finRoundingGrain` (`lib/geometry/fins.ts`), D-13 |
| Convention card's sentences | The words page's two sentences with the **grain said in the shaper's system**: the page's `1/16"` reads `1 mm` in Metric (words page note: "Rule 2 says how a Metric shaper reads the few that carry a unit") |

### Figures: Rule 2, card by card (D-17, R11)

**The rule that makes it right by construction: a tag, a dimension and a caption read a figure the way the page's own control or
VIEWER reads that figure — same formatter, same grain.** A mark is a mark on a card because it is a mark on the page. Dims in
1/16" or centimetres to one decimal, marks in 1/16" or whole millimetres, litres the same in both.

| Where | Figure | Formatter family |
|-------|--------|------------------|
| TEMPLATE | Board Length (`6'2"` / `188.0 cm`), Width, Offset, Tail Block, wing Position, a pushed length or width | dim — `formatLength` / `formatDim` (`outline-controls.tsx:159`, `:266`, `:375`) |
| TEMPLATE | Depth on a diamond or swallow (the board's own, the pushed swallow's), wing Depth, Vertical run, Corner radius | mark — `formatMark` (`outline-controls.tsx:400-402`); "the Depth ghost's depth as a mark" (R11) |
| TEMPLATE | Nose Angle, Tail Angle, the two Fullnesses, Tail Rail, Nose Rail | `°` / `%`, no unit conversion |
| ROCKER | Center Thickness, Nose Tip · Tail Tip, Nose and Tail Rocker, Deck Skin, a Fine tune, a rocker bend | mark / dim as the sidebar and DATASHEET read each; **a Thinning Start is a dim** (`12" · Automatic` Imperial, `30.5 cm · Automatic` Metric — CLAUDE.md Rule 2) |
| ROCKER | Blank, Placement, Customize Rocker | the blank's own name (the maker's inch order code stays in inches in Metric, `formatRockerNote`, CLAUDE.md Rule 2), `centered` / a mark, the note |
| RAILS | Board Thickness · Thickness @12", Apex Thickness, Deck Marks, Domed Deck Band, Bottom Tucks | mark — the RAILS page's own marks (`rail-controls.tsx`) |
| RAILS | Family, Ratio, `Scaled from center by` | the page's own words and numbers (`med/knifey`, `60/40`, `1.00`) |
| VOLUME | Board Length / Width / Center Thickness; the Estimated Volume | `formatLength` / `formatDim`; **`formatLitres` — `quotedVolumeLitres` from the 51 cross-sections** (D-03), never the quick estimate |
| VOLUME | Template Area | as the ESTIMATE card reads it (`1042.8 sq in`; Metric in its own unit) |
| VOLUME captions | `dashed · 6'8" → 31.8 L quick estimate` | the pushed dim, then the **quick estimate's** litres, which the words say it is. The tag and the caption are different quantities with different names; the contract keeps them that way. |
| FINS | Fin Base Length, Aft/Forward position, Off-Rail, Toe-In, and every dimension on the tail drawing | mark — whole mm in Metric, 1/16" Imperial (every fin number is a mark, CLAUDE.md Rule 2) |
| FINS | `Needs 8'0"` | `formatLength` of the model's own minimum |

**A push is a round figure in the shaper's own system.** The sketch pushes in millimetres (12.7 for the half inch, 9.525 for 3/8", 6.35
for 1/4", 25.4 for the inch). In Imperial those are 1/2", 3/8", 1/4", 1". In Metric a caption of `+12.7 mm` would break the
whole-millimetre rule, and `+13 mm` over a drawing of 12.7 would disagree with itself. **So a pure `guidePush(system)` returns the
amount for the system: the sketch's inches in Imperial, the nearest round millimetre in Metric (13, 10, 6, 25; 5 for the 3/16"…),
and both the drawing and the caption use that one number** (D-17; unit-tested, Rule 1)
`(Claude's discretion — founder may overrule)`.

**ROCKER's two captions the sketch left out.** The sketch drew `Center Thickness` and `Nose Tip · Tail Tip` with their pushed profile
and **no caption**; eight other ROCKER cards had one (SVG text above the drawing). Every pushed card gets a caption, and **every
caption is the HTML line under the drawing on all five pages** (D-06), not text in the SVG's corner:
`dashed · +1/2" at the center`, `dashed · +3/8" at each tip`
`(Claude's discretion — founder may overrule)`. The other ROCKER captions are the sketch's, formatted as marks:
`dashed · slid 9/16" to the nose` (Placement), `dashed · 1/2" skin`, `dashed · +1/2"N18"` (Customize Rocker — the maker's inch note
stays in inches, CLAUDE.md), `dashed · +1" nose rocker`, `dashed · +1" tail rocker`, `dashed · starts 24" in` (the two Thinning
Starts), `dashed · +1/4" at both` and `dashed · -1/4" at the tail 12"` (the 12" fine-tunes; the station says `12"` / `30.5 cm`).

### Screen readers

| Element | Copy |
|---------|------|
| The scroller | `role="region"`, `aria-label` `Guide to {page}`, `tabIndex={0}` so the keyboard can scroll it (§9) |
| Groups | an `<h3>` each (the group heading), a `<ul role="list">` of `<li>` cards (`role` kept: Safari drops a styled-away list's meaning) |
| A card | `<h4>` the name; the tag is plain text beside it; the words are text |
| A cartoon and its caption | `aria-hidden="true"` and `focusable="false"` on the figure — the card's own words say what the drawing shows |

---

## Interaction & Layout Contract

### What triggers what

Three switches, each answering its own question, **never conflated** (CLAUDE.md Layout). The GUIDE gives none a new job.

| Switch | Question | This surface |
|--------|----------|--------------|
| **Width** (`max-shell:` below 820, `shell:` at 820 and over) | Which layout | Stacked (the GUIDE inside the pinned drawing area, one card across) or the shell (the folder beside the sidebar, two or three across); the tab strip's short words |
| **Pointer** (`coarse:`) | How big a control draws | Only the GUIDE tab's own 44-dot touch box, inherited. A card has no control |
| **Height** (inline `[@media(max-height:500px)]`) | Short-screen rules | A card's phone padding (`p-2`); the GUIDE folder grows with its content and the drawing column becomes the scroller (§6) |

How many cards sit side by side is a question the **list asks of its own width** (a CSS grid track), never of the device — the same
precedent as Phase 17's GUIDE and the readout card ("reads nothing about the device … only whether its own figures fit",
`imported-readout-card.tsx:36-39`). The cartoon's text size is a question the SVG asks of its **own fit**, not of a breakpoint.

### What draws the eye first

1. **The cartoon** — the board with the one setting pushed in grey dashes (the push colour is the only mid-tone mark in it).
2. **The name, with the board's own number beside it** — the accent value tag, the card's second most contrasting mark.
3. The first sentence (ink, 600) and the *On this board* edge.
4. Quietest: the muted sentence, the dashed rule, the notes, the caption.

### 1. The tab strip on each page (R1)

| Page | Tabs after this phase | Where | Phone | Short words | Notes |
|------|----------------------|-------|-------|-------------|-------|
| TEMPLATE | VIEWER · ADD WINGS (or `WINGS · n`) · **GUIDE** | `outline-editor.tsx:106`, `:376` | `phonePinned="66dvh"` (`:431`) | none | three tabs; the board's name keeps its room (sketch: 78 dots at 360) |
| ROCKER | VIEWER · PLANING · DATASHEET · **GUIDE**; phone / narrow / short: VIEWER · TOP · PLANING · DATA · **GUIDE** | `ROCKER_TABS`, `ROCKER_TABS_SMALL_SCREEN` (`rocker-editor.tsx:104`, `:119`) | `66dvh` (`:466`) | TOP, DATA (existing); GUIDE has none | **five tabs fit** a 360-dot phone's 356-dot band, but the board's name gets almost nothing. The sketch's own strip measured: tabs 330, name **12 dots at 360, 19 at 375, 26 at 390, 48 at 412**. The app's own padding is wider than the sketch's: `ROCKER_TABS_SMALL_SCREEN`'s comment records four short words needing **284** dots of a 356 band, and GUIDE adds 46 of text, 18 of padding and a gap, about **352** — so the name gets **about 4 dots at 360, 19 at 375, 34 at 390, 56 at 412** (an estimate; §Open items 6 measures it). Cut "as it must" (R1); at 360 it is a bare `…`. |
| RAILS | VIEWER · DATA · INSTRUCTIONS · **GUIDE** | `rail-band-editor.tsx:337` | pin follows the tab (§6) | none | four tabs need 328 dots; the name gets 12–56 |
| VOLUME | ESTIMATE · **GUIDE** | `volume-estimator.tsx:49` | pin follows the tab (§6) | none | the strip becomes interactive (`onSelect`); until now ESTIMATE rendered as a label, not a button (`tabbed-panel.tsx` omits the button without `onSelect`) |
| FINS | VIEWER · DATA · **GUIDE** (MODEL INFO removed) | `fin-placement-editor.tsx:20-23` | pin follows the tab (§6) | none | `FinTab` loses `"info"`, gains `"guide"` |

- The **selected GUIDE** is `TabbedPanel`'s existing active-tab state; the tab is never remembered between pages or visits (view state,
  never saved), and **leaving GUIDE and coming back lands at the top** like DATA and ESTIMATE.
- A window that crosses 820 dots while ROCKER's GUIDE is open keeps it: GUIDE is in both of ROCKER's tab lists, so the derived active
  tab does not fall back to VIEWER (`use-viewer-media.ts`'s derived-active rule applies only to TOP VIEW).

### 2. The GUIDE tab's anatomy (all pages)

```
[ VIEWER ][ DATA ][ GUIDE ]                    Shortboard     <- the strip; GUIDE last; BoardNameTab trailing
┌──────────────────────────────────────────────────────────┐
│ What each control on this page is, what it does …       │  <- intro, 12/400 muted (words page)
│                                                          │
│ INPUTS                                                   │  <- group heading, 10/800 ink caps (+ muted qualifier)
│ ┌──────────┐ ┌──────────┐ ┌──────────┐                  │  <- ul: grid, gap-2
│ │Name  2 1/4"│ │Name  60/40│ │Name    ON … │            │  <- name row: 14/600 ink + tag
│ │ [strip]  │ │          │ │          │                  │
│ │ [window] │ │          │ │          │                  │  <- the cartoon (§4)
│ │ caption  │ │          │ │          │                  │  <- caption: 10/700 caps muted
│ │ Two sent.│ │          │ │          │                  │  <- 13/1.45: ink first sentence, muted second
│ │ - - - - -│ │          │ │          │
│ │ MODEL INFO (FINS)                                       │  <- own dashed rule, muted caps label
│ │ - - - - -│
│ │ HOW TO SHAPE …                                          │  <- own dashed rule, accent caps label
└──────────────────────────────────────────────────────────┘
```

- The scroller is the **content card's own `overflow-y-auto` box** (`data-guide`, `min-h-0 flex-1 overflow-y-auto pt-2`) — inside
  the folder on a computer, inside the pinned box on a phone. **The page never scrolls as a whole** (R8, D-15).
- Each group is `<section data-guide-group="{key}">` holding a heading and `<ul role="list">`; the heading is
  `mt-4 mb-2 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold`; the list is
  `grid list-none gap-2 [grid-template-columns:repeat(auto-fill,minmax(max(236px,calc((100%-16px)/3)),1fr))]` — **never more than three
  across, never a card narrower than 236 dots** (Phase 17's rule, copied; sketch ruled 236).
- **How many across** — Phase 17 measured the folder (window less the 400-cap panel, the column's 24, the folder's 26, the card's 26,
  `17-UI-SPEC.md` §5), and the same shell is used here: **three across from about 1200 dots of window** (cards 263 at 1280, 316 at
  1440), **two from about 956** (270 at 1024), **one below** (404 at 820; 364 on an upright iPhone 14). The sketch showed four across
  at 1440 because it has no cap; the app's rule caps at three. The build re-measures with a browser test (§13).
- Page-order rule: **the sidebar's order, group by group** (D-04); FINS runs Inputs · Convention · Single Fin · Twin · Thruster · 2+1 ·
  Quad · Advanced (D-12).

### 3. The card (`GuideCard`, shared; R2–R7)

An `<li data-guide-card="{key}" data-guide-on="true|false">`:

```
flex min-w-0 cursor-default flex-col gap-2 rounded-lg border p-3 max-shell:p-2 [@media(max-height:500px)]:p-2
border-surf-line   (On this board)      border-surf-line-faint   (otherwise)
```

- **Not a button, no hover, no focus stop, default cursor** (D-10). The card is memoised and redraws only when its own tag, caption or
  board inputs change (§8).
- **Name row** — `flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5`: the name `h4 min-w-0 text-sm leading-tight
  font-semibold text-surf-ink`; the tag `ml-auto text-right` (so a tag that drops under a long name stays on the right) — a **word
  tag** in the 10/800 accent caps class, free to wrap to two lines (`Diamond & swallow only` is 277 dots), or a **value tag** in
  `text-[11px] font-semibold tabular-nums whitespace-nowrap text-surf-accent-ink`. A card with no tag draws the name alone. Phase 17's
  row was `items-baseline justify-between gap-2` with a `flex-none` tag; it never met a tag this wide.
- **The figure** — one block holding the cartoon (§4) and its caption, `flex flex-col gap-1`, `aria-hidden`; the caption right-aligned
  (the sketch's `.ghostcap`), 10/700 caps tracking .12em, `text-surf-ink-muted`, every figure inside in a `normal-case tracking-normal`
  span. A card with no caption draws the SVG alone.
- **Text** — one `<p data-guide-text>` 13/400 muted `leading-[1.45]`, the first sentence in `font-semibold text-surf-ink`.
- **Model info** (FINS only, fourteen cards) — a `<p data-guide-info>`: `border-t border-dashed border-surf-line-faint pt-2 text-xs
  leading-normal text-surf-ink-muted`, the label `Model info` 10/800 caps **muted** on its own line (`mb-1 block`), then the note —
  **the MODEL INFO tab's words, verbatim** (D-13). It sits **above** *How to shape* (sketch DOM order: text, Model info, How to
  shape), each under its own dashed rule.
- **How to shape** — `<p data-guide-how>` the same classes, the label in accent caps.
- A card's order is therefore: name row · figure · text · [Model info] · How to shape.
- What draws the eye first in a card: the cartoon's push; then the name and value.

### 4. The cartoon (`GuideCartoon`: strip · window · detail; R4, D-06 to D-08, D-18)

One SVG per card, `viewBox="0 0 300 {H}"`, `class="block h-auto w-full overflow-visible"`, `fill="none"`, every path / line / rect
`vector-effect: non-scaling-stroke` at 1 dot, `aria-hidden`. Built the way the sketch's `cardFrame` builds it (`pages.js:22-40`):

1. **The strip** (top): the whole board, nose left, fitted to the 284-wide band (8-unit side margins); its stringer; stations
   (`5 4`) where the page has them; and **one dash-dot window** (`7 2.5 1.5 2.5`, ink) on the part the control shapes.
2. **The detail** (below, 6 units of gap): that part closer, in a rounded frame (rx 3) fitted to the window — the page's own kind
   of drawing (below) — with the **pushed setting in `--outline-push-line` `3 2` beside the board as it is**, the number
   **dimensioned the way the VIEWER reads it**, and the window's name in its top-left corner (10/700 caps muted).
3. **The caption** is **not in the SVG** — it is the card's HTML line (§3), because a pair of windows is too narrow for a caption
   (memory: `shaper-page-guides-sketch.md`).

**Frame sizes by page** (strip + 6 gap + detail = viewBox height; the sketch's, measured):

| Page | Strip | Detail | Height H | Drawing in the detail |
|------|-------|--------|----------|----------------------|
| ROCKER | 50 | 84 (one window, or two side by side for a pair: `Nose Tip · Tail Tip`, `Nose @ 12" · Tail @ 12"`) | 140 | the side view in its **blank**: foam shade, baseline `4 3`, thinning marks, the board over it |
| TEMPLATE | 70 | 100 (whole board, tail half, nose half) or 140 (nose, tail, wide point) | 176 or 216 | the outline from above, nose left, stations; the five tails each drawn on the open board; the wing cards draw the board **with the wing the WINGS button would add first** |
| RAILS | 60 | 120 (a section) or 110 (the tail seen from above, for Hard Edge and Tail Rail Blends From · Ends At) | 186 or 176 | the three stations on the strip, the cross-section at one of them, **bands in `RAIL_SEGMENT_COLORS`, the finished rail in ink** — drawn at the center, at the tail where only the tail has the control |
| VOLUME | 60 | 110 (the center cross-section) or 100 (the plan) | 176 or 166 | the plan from above and the center cross-section **as RAILS draws it** (VOLUME has no drawing of its own) |
| FINS | 60 | 170 | 236 | the tail's last 24" from above, the fins as **lines from trailing edge to leading edge** with the VIEWER's dots (`fin-viewer.tsx:687-704`) |

- **Grammar (C4, D-18):** one ink; stringer `12 3 3 3`, stations `5 4`, widepoint `2 3`, the window and a cutting line `7 2.5 1.5 2.5`,
  the push in muted dashes `3 2`, baseline `4 3`; no text inside a board (sketch finding); no new hue.
- **Dimension lines sit outside the board, the drafting way** (D-08): the line, an end mark each end, the value in a break or beside
  it. Use the app's own `DimensionLine` and its 45° `DimensionTick` rather than the sketch's flat bars, so the cards measure the way
  every viewer does — Phase 17 made the same choice for its gauges (`17-UI-SPEC.md` "Already done")
  `(Claude's discretion — founder may overrule)`. Value text 10/600 tabular ink, pinned in screen dots (§ Typography).
- **Where a dimension goes, per D-08:** FINS — off-tail below the rail at the fin's own station; toe-in at the upper fin's leading
  edge against a dashed reference through its trailing edge, labelled nose-ward; the base above the upper fin, off-rail on the tail
  side of its line. TEMPLATE — a tip's label inset so it never clips its window; a length under the board.
- **The push is live geometry** (D-16, R5): the card's variant of the open board with one field changed through the app's own maths,
  **memoised per card on the board's identity** (`WeakMap` keyed by the store's board object, Phase 17's `bottom-cartoon.tsx:32-47`
  pattern), so switching boards or moving a slider while GUIDE is open redraws only what changed. Nothing is precomputed into fixtures.
- **A cartoon is nose left, always** (D-07: "nose left in the card"). TEMPLATE's VIEWER stands the board nose up on a computer and on
  an upright phone; D-15 let the strip "turn with it" — **it does not**: nose left is what the sketch's pictures show on every page and
  every width, and a card in two orientations would make the same card unreadable as the same card `(sketch; the founder may overrule)`.
- **Text inside the SVG is pinned** at 10 screen dots (values 600, names 700 caps) by dividing by the SVG's own fit (§ Typography).

**Tail shapes and TEMPLATE Depth (D-11, R10).** Each of the five tail cards draws **the open board with that tail** (`TAIL_PRESETS`),
no push. **Depth** is a diamond's or a swallow's alone: on a diamond or swallow the card's tag is the board's own depth (a mark) and
the push deepens it by the sketch's amount; on **any other tail** the tag reads `Diamond & swallow only`, the window writes
**`no depth on a squash tail`** (use the board's own tail name: `…on a pin tail`, `…on a round tail`) in 10/700 caps muted **inside the
window, never over the board** (D-11), and the board is drawn **as a swallow in `--outline-push-line` dashes with the depth
dimensioned** (`tail_swallow`), so the setting is still seen; the caption reads `dashed · as a swallow, 3" deep`.

**The Convention card** is the board's own fins from above with off-tail, off-rail, toe-in and the base dimensioned on the *board's own*
numbers — the three measurements its words name. It is a setup-less card: no caption.

### 5. The per-page card inventory (84 cards, D-04, R2)

| Page | Cards | Groups, in order | Pushed (dashes) | Drawn as (no push) | No caption | Model info |
|------|-------|------------------|-----------------|--------------------|-----------|-----------|
| TEMPLATE | 22 | Board Length (1) · Nose Controls (2) · Widepoint Controls (4) · Tail Controls (9) · Wings (6) | 17 | — | the five tails | — |
| ROCKER | 14 | Inputs (2) · Blank (4) · Rocker (2) · Foil (6) | 11 (Center Thickness, Tips, Placement, Deck Skin, Customize Rocker, Nose/Tail Rocker, two Thinning Starts, the two fine-tunes) | — | Blank, Pin tips to ×2 | — |
| RAILS | 17 | Inputs (2) · Nose Rail · Center Rail · Tail Rail (5, **one card standing for all three rails**) · Advanced (10) | 16 (Import Rocker & Foil is the one with none) | — | Import Rocker & Foil | — |
| VOLUME | 8 | Inputs (5) · What the ESTIMATE card reads (3) | 3 (Board Length, Width, Center Thickness: the quick estimate at each) | — | five | — |
| FINS | 23 | Inputs (1) · Convention (1) · Single Fin (1) · Twin (4) · Thruster (5) · 2+1 (1) · Quad (6) · Advanced (4) | 4 (Fin Base Length, Aft/Forward, Off-Rail, Toe-In) | 17 | Import Designed Board, Convention | **14** |

(The words page's per-card counts are the source; this table is a check — a browser test counts them, §13. A pair the page shows
together — Nose Tip · Tail Tip, Nose @ 12" · Tail @ 12", Nose Rail · Center Rail · Tail Rail's one card, Board Thickness · Thickness
@12", Tail Rail Blends From · Ends At — is **one card with two windows**; the two Thinning Starts are two cards.)

### 6. Layout under the three switches (R8)

| Screen | Layout | The GUIDE |
|--------|--------|-----------|
| **1440 × 900**, mouse | Shell; panel 400 | three across (cards 316, drawing scale 0.97) |
| **1280 × 800** | Shell | three across (cards 263; scale 0.79) |
| **1024 × 768** | Shell | two across (270; scale 0.81) |
| **820 × 800** | Shell; panel 340 | one across (404; scale 1.26) |
| **iPad 1180 × 820**, finger | Shell | two across; tab strip with its 44-dot boxes |
| **iPhone 14 upright, 390 × 664** | Stacked; the GUIDE in the pinned area | one across (364; scale 1.13); the tab strip 22 dots drawn / 44 touch; the page does not scroll |
| **iPhone held sideways, 844 × 390** | Shell by width, compact bar by height | the folder's short-screen rule (below) |

- **Phone pin (R8, D-15).** While GUIDE is open, **every page pins its drawing area at `66dvh`**: the GUIDE gets the room, the
  controls beneath hold the rest, the page never scrolls. The pinned box's inner card takes
  **`max-shell:h-[calc(66dvh-40px)] max-shell:flex-none`** (Phase 17's arithmetic, `17-UI-SPEC.md` §6) so the column comes out at exactly
  66dvh; a browser test measures it. TEMPLATE and ROCKER already pin 66; **RAILS (50dvh), FINS (55dvh) and VOLUME (`none`) change their
  pin only while GUIDE is the active tab**, the idiom RAILS already uses for INSTRUCTIONS
  (`phonePinned={activePage === "instructions" ? "none" : "50dvh"}`, `rail-band-editor.tsx:288`) `(sketch pinned all five; the founder may overrule)`.
- **VOLUME is the one that needs care.** Its shell is `simpleSidebar` with `phonePinned="none"`: today the *whole shell* is the phone's
  scroller (`data-design-page-scroll`, `design-screen-shell.tsx:237`). A pinned VOLUME GUIDE needs the shell's "simpleSidebar
  without none" branch, which the shell calls "kept, not deleted, for a future caller" and **no caller exercises today**
  (`:86-90`). It has no `flex-1 overflow-y-auto` on the aside. The planner measures it first; the fix is the aside taking
  `max-shell:flex-1 overflow-y-auto` in that branch only. **If it cannot be made to hold on a phone without touching ESTIMATE's
  behaviour, the fallback is: VOLUME's GUIDE sits in the page's one scroller exactly as ESTIMATE does today, and the requirement
  "page never scrolls" is stated as "the pinned drawing area never scrolls away" for VOLUME alone — flagged, not silently dropped.**
- **Short screen** (`[@media(max-height:500px)]`): a phone held sideways is the desktop shell, short. While GUIDE is open each page passes
  **`growOnShortScreen`** (RAILS passes it always; the other four pass it conditionally, `activeTab === "guide"`) so the folder grows
  with its cards and **the drawing column becomes the one scroller**, as Phase 17 did for its GUIDE and as
  `design-screen-shell.tsx:201-203` already scrolls the column; card padding drops to `p-2`. A real desktop window is never under 500
  tall, so this can never reach a mouse. (Sketch silent; Phase 17's rule `(Claude's discretion — founder may overrule)`.)
- **Print.** The GUIDE root carries `print:hidden` (printing a guide is out of scope, 18-CONTEXT); the design screens are not printed pages, so this
  is belt and braces.
- **Scroll position:** within a page visit it holds while the tab stays open; leaving the tab resets it (§1).

### 7. The five pages' shared states

- **Which tag a card shows** is computed from the live board by pure helpers (§11), never from the card's own state: `On this board`
  follows the active tail, the active fin setup and model, the ticked toggles; the value follows every slider. A slider moved with the
  GUIDE open (it can be: the sidebar is beside the folder) changes the tag and redraws the affected cartoons at once.
- **Metric** reads every tag, caption, dimension and the Convention's grain in the shaper's system (§ Copywriting, Rule 2). A browser
  test reads the Shortboard in both systems.
- **Themes:** four, all through the `--surf-*` and `--outline-*` tokens; nothing in the GUIDE is hard-coded to a colour.
- **A board with a wing, with two wings, with none:** TEMPLATE's Wings cards always draw (the first wing the button would place when
  none exists; the board's own wing 1 when one does).
- **A board with no blank override** (ROCKER's *hand-set* state is not a possible state — every board has a blank, sketch "small
  print"); *Customize Rocker* says `Natural rocker` or the note.
- **Zero / one / many cards:** always the same count per page (§5); the count never changes with the board.

### 8. Performance and memoisation (D-16)

84 live cartoons cost something: Phase 17 measured 19 cartoons at about a fifth of a second to work out and cached them by board
(`bottom-cartoon.tsx:25-47`). The contract:

- A page's cartoons are worked out **only when its GUIDE is the open tab** (tab content already unmounts, `fin-placement-editor.tsx:159`),
  never on the page's other tabs.
- Memoise each card's pushed variant on the board object, with a key that includes the system and the card's own inputs; a slider
  that does not feed a card does not redraw it (`GuideCard` is `memo`'d, as Phase 17's is).
- **Draw lazily** (`(Claude's discretion — founder may overrule)`): the cartoon's box has the viewBox's own aspect ratio
  (`aspect-[300/{H}]`) so a card's height is known before it draws; a card draws its picture when it is within one folder-height of the
  scroller's view, and keeps it. **The planner measures first**: if all of a page's cards draw inside one frame budget (about 100 ms)
  on a mid phone, this is not needed and is not built. FINS's 23 `computeFinPlacement` calls are the likeliest to need it.
- All helpers are pure, in `lib/geometry/` (Rule 1); the card components only paint.

### 9. Accessibility

- The tab strip's own roles (`role="tablist"`, `role="tab"`, `aria-selected`) are unchanged; GUIDE is one more tab, reachable by the same
  keys; FINS has three tabs, no MODEL INFO.
- The scroller is a `role="region"` with an `aria-label` and **`tabIndex={0}`** so a keyboard user can scroll 84 cards of text with the arrow
  keys (a scrollable region with nothing focusable inside fails the usual rule). Focus ring: `.focus-ring-accent`. The planner checks
  `e2e/keyboard-focus.spec.ts` for tab-stop counts `(Claude's discretion — founder may overrule)`.
- Headings: `h3` per group, `h4` per card; `ul role="list"`; the figure (cartoon + caption) `aria-hidden`; the tag is text.
- Contrast is §Color's table. No colour is the only carrier: a tag is words; the push is dashed (a pattern) and named in the caption.
- No motion; nothing animates, so `prefers-reduced-motion` has nothing to do.
- The 44-dot touch rule applies only to the GUIDE tab (inherited).

### 10. The states a card can be in (small table, for the checker)

| State | What the card shows |
|-------|--------------------|
| The control's active option / ticked toggle | tag `On this board`, edge `border-surf-line` |
| A control with a value | the value tag; edge faint |
| A control that does not apply | the word tag (`Diamond & swallow only`, `—`, `Needs 8'0"`); the drawing still draws (Depth: as a swallow; Tail Block: the board as is; McKee Longboard: the SB/Gun fallback) |
| A choice's other options | name only, no tag |
| Nothing to push or draw as | no caption |
| Hovered / focused / pressed / disabled | **none** — a card has no such state (D-10) |

### 11. The pure functions this contract implies (Rule 1; the planner writes the tests)

In `lib/geometry/guide-*.ts` (no React, browser or database imports), every export tested; expected numbers from the app's own maths or
`18-GUIDE-WORDS.md`, never hand-transcribed:

1. `guidePush(system)` — the amounts per system (§ Figures). 
2. One variant builder per page that returns the open board with exactly one field changed through the real functions: rocker
   (`designSideProfile`), outline (`buildOutline` + `TAIL_PRESETS` + `nextWing`), rail (`computeRailSectionOutput` + `finishedRail`),
   volume (`computeVolume`), fins (`computeFinPlacement` + `resetAdvanced`). A test per card family proves *one field changed, the rest
   identical*.
3. `guideTag(card, board, system)` → `{ kind: "on" | "value" | "na" | "none", text }`, with the not-applicable rules (Depth, Tail Block,
   McKee Longboard) and the Convention's grain through `finRoundingGrain`.
4. `guideCaption(card, system)` → the caption text and kind (`dashed` / `drawnAs` / `none`).
5. `guideWindowFit(window, box)` — the zoom (`min(w / span, (hDet − 14) / across)`), the window's inset so a whole-board window never
   leaves its strip.
6. The words module (`components/guide/guide-words.ts`, 84 cards) and **its test reading `18-GUIDE-WORDS.md` line for line** (Phase 17's
   `bottom-guide-words.test.ts` pattern, the model for the ids, the section keys and the count of 84).

### 12. Found in the sketch — fixed in the build (each seen in `pictures/` or measured)

| Found | Where | The fix |
|-------|-------|---------|
| The whole-board window (`win: whole`) is drawn **beyond the strip's top** and its dash-dot crosses the card's **name** and the detail's own label (the `Board Length` card: `pictures/phone-outline-guide.png`, and a 1280 close-up taken for this contract) | TEMPLATE and VOLUME's Board Length cards | A window's rectangle is clamped inside the strip with a 3-unit inset (`guideWindowFit`); for a whole-board window the rectangle is the strip's own inset box. Never over the name row. |
| Dimension labels sit **on top of fin dots and the window's name** (`4 1/2" base` over `TAIL, 24" FROM ABOVE`; `3/16" off rail` over a dot; `Hard Edge` label under the rail line) | FINS Convention and Advanced cards; RAILS Hard Edge | The window's name keeps its own corner gutter; labels route to the D-08 positions; a label that would collide moves, never shrinks below 10. A browser test (§13) reads every FINS card's labels for overlap at the narrowest column. |
| Captions were SVG text above the drawing on ROCKER, a `.ghostcap` HTML line on the other four | all | one HTML line under the drawing on all five (D-06) |
| `Center Thickness` and `Nose Tip · Tail Tip` push their profile with no caption | ROCKER | caption written the same way (§ Figures) |
| Sketch type was 8 (labels), 9 (tags, caption) and 10 (values) in the 300-unit drawing, 5.6–7.8 dots on a computer | all | pinned 10 / 10, HTML 10 (§ Typography) |
| Sketch card gap was 6, padding `10 12 12`, h4 700 | all | Phase 17's dress: gap 8, padding 12 / 8, h4 600 |
| Sketch's grid was `repeat(auto-fill, minmax(236px, 1fr))`, four across at 1440 | all | Phase 17's three-column cap |

### 13. What the browser tests and the pictures must prove (R13)

A `guide.spec.ts` per Phase 17's `bottom-guide.spec.ts` (read from the scratch copy), on a computer (1280 × 800), a phone upright
(iPhone 14; Android), and sideways:

- The **GUIDE tab is last** on all five pages; **FINS has no MODEL INFO** and no `fin-model-info` anywhere; ROCKER's phone strip has
  five tabs on one line at 360, 375, 390, 412 with the board's name cut short, not wrapped.
- **84 cards in their groups**, each with a cartoon, the two sentences, a *How to shape* note; **FINS' fourteen *Model info* notes**;
  the words equal `18-GUIDE-WORDS.md` (that is the unit test's job; the browser reads the live DOM once).
- **The tags on the Shortboard and the Fish** (`6'2"`, `50°`, `On this board` on Squash, `Diamond & swallow only` on Depth, `29.61 L`,
  `On this board` on Thruster / Basic (Half Rate), the Fish on Twin / Modern/Upright, `Needs 8'0"` on McKee Longboard); the same cards in
  Metric (`188.0 cm`, whole-mm marks, `30.5 cm · Automatic`, `to 1 mm`, `Needs 243.8 cm`).
- **Three, two, one across** at 1280, 1024, 390; the card never narrower than 236; **no card wider than its list**; **no text clipped**
  at 1280, 1024, 390 (the long-text backstop).
- **The page never scrolls as a whole on a phone** (the document's `scrollHeight` equals the window's, GUIDE open, on all five pages;
  the pinned column at no more than 66dvh and the card at no less than 66dvh − 41). **VOLUME's pin is tested first** (§6).
- **A pushed card changes the drawing**: with the Shortboard open, a pushed path exists in the cartoon (`--outline-push-line` stroke);
  moving a sidebar slider with GUIDE open (a computer) changes the tag and redraws that card.
- **Nothing on a card can be pressed**: no `button`, `a`, `input` or `[tabindex]` inside `[data-guide-card]`; clicking a card does nothing.
- **No overlap** of any cartoon's text with another's or with the window's name (a bounding-box test over every card at 1024 and 390).
- Pictures into the phase folder: every page's GUIDE on a computer and on a phone, Shortboard Imperial, plus the Fish's TEMPLATE Depth, FINS'
  Twin group, a Metric FINS card and a Slate card (the sketch's `shots3.cjs` takes close-ups; reuse it).
- The existing suite stays green: `e2e/volume-fins-panels.spec.ts:287` ("FINS' MODEL INFO") and `e2e/phone-chrome.spec.ts:807, 853, 897,
  935, 1179` name the MODEL INFO tab and **go or are rewritten** with it; the desktop baselines that gain a GUIDE tab button
  (`desktop-baseline.spec.ts-snapshots`) are re-recorded on purpose and reviewed — **nothing else in them moves** (R12).

---

## Ruled by the founder, carried by the sketch, open for the build

| Item | Source | Status |
|------|--------|--------|
| GUIDE last in the strip, on a phone too; FINS loses MODEL INFO | D-01, D-02, founder 2026-11-09 | ruled |
| One card per control or named choice, the sidebar's order, values beside the names, the cartoon with one setting pushed in dashes | D-04–D-06, founder 2026-11-08 | ruled |
| TEMPLATE Depth says it is a diamond's or a swallow's alone | D-11, founder 2026-11-09 | ruled |
| FINS by setup with the Model info notes verbatim | D-12, D-13, founder 2026-11-09 | ruled |
| Phase 17's dress, one shared card | D-14, C5 | ruled |
| Informational only | D-10 | ruled |
| **Nose-left cartoons, never turned** | D-07 / D-15 left it open | **(sketch; the founder may overrule)** |
| **Push amounts are the sketch's; Metric pushes are round millimetres** | D-06 / D-17 | **(Claude's discretion — founder may overrule)** |
| **The push line is 75% muted, not 70 (and not `--outline-ghost`'s 55)** | contrast, above | **(sketch; founder may overrule)** |
| **Captions are muted ink, 10px; drawing text pinned at 10** | contrast and size, above | **(Claude's discretion — founder may overrule)** |
| **Dimension ticks are the app's 45° tick** | consistency with every viewer | **(Claude's discretion — founder may overrule)** |
| **GUIDE pins at 66dvh on every page; the folder grows on a short screen** | R8, D-15, Phase 17 | **(sketch; Claude's discretion for the short screen — founder may overrule)** |
| **The scroller is a focusable region** | keyboard access | **(Claude's discretion — founder may overrule)** |
| **Two ROCKER captions written the same way as the other ten** | the sketch omitted them | **(Claude's discretion — founder may overrule)** |

## Open items for the planner

1. **VOLUME's phone pin** (§6): measure the shell's unexercised simple-plus-pinned branch before building; fallback stated.
2. **The overlap sweep** (§12): each page's Convention, Advanced, Hard Edge and tail cards at the 236-dot column; fix by moving a label,
   never by shrinking below 10.
3. **Lazy drawing** (§8): measure all 84 cards' work on a mid phone first.
4. **The MODEL INFO sweep:** `components/fins/fin-model-info.tsx` and its tests, `FinTab`'s `"info"` id (`fin-placement-editor.tsx:20-23`,
   `:159`), the mentions in `components/viewer/tabbed-panel.tsx` (the comment) and `lib/geometry/fins.ts` (the comment), `e2e/volume-fins-panels.spec.ts:287`,
   `e2e/phone-chrome.spec.ts` (five places). Re-sweep for `MODEL INFO`, `fin-model-info` and `"info"` at plan time.
5. **The `Needs` threshold** in Metric: confirm `243.8 cm` against the model's own minimum constant (`lib/geometry/fins.ts`).
6. **The tab list on ROCKER at 360**: the sketch's measure (tabs 330 of 356, name 12) used the sketch's own paddings; the app's strip
   (`px-[18px]` drawn, `max-shell:px-2` on a phone, `tabbed-panel.tsx:153`, `:165`) is measured at plan time at 360, 375, 390 and 412
   before the tab is added — if the five tabs do not fit a 356 band at all, the contract's fallback is GUIDE's tab taking the same
   44-dot box but the board's name dropping first (it already shrinks first, `min-w-0`), never a second tab row.

---

## UI Considerations

Probe run 2026-11-09 over eight surfaces (E1 the tab strip, E2 the GUIDE panel, E3 the card list, E4 a card, E5 the name row and its
tag, E6 the figure and its caption, E7 the text and notes, E8 the intro): 53 applicable considerations, **53 resolved** (41 explicit,
12 backstop — each backstop is a browser test named in §13), 0 unresolved. The GUIDE is a synchronous, data-free surface: nothing
loads, nothing is submitted, no state depends on a network or a database, so every *loading* and *error* row resolves to "none, by
construction" and the real coverage is in *overflow* and *long-text*.

| Surface | State | Resolution | Verification |
|---------|-------|------------|--------------|
| E1 tab strip | loading | Nothing loads: the strip renders with the page; GUIDE is one more tab button in `TabbedPanel`. | explicit |
| E1 | error | No load or submit path; none. | explicit |
| E1 | overflow | On ROCKER's phone strip five tabs share one 356-dot band at 360 wide; the board's name is the only thing that gives way (ellipsis, `min-w-0`), never a second row of tabs. | { statement: "five tabs on one line at 360, 375, 390 and 412 with the name cut short", verification: backstop } |
| E1 | long-text | The tab words are fixed (GUIDE, DATA, TOP …); the board's name is the only variable text and already truncates in `BoardNameTab`. | explicit |
| E2 panel | empty | Never empty: each page has a fixed card count (§5). | explicit |
| E2 | loading | None: the cards are worked out synchronously from the board in the store when the tab opens (§8). | explicit |
| E2 | error | None: pure maths on a board that always exists; a variant that cannot be built is a type error at build time, not a runtime state. | explicit |
| E2 | populated | §2's anatomy: intro, group headings, grid lists of cards, three / two / one across. | explicit |
| E2 | partial | A board on which a control does not apply still shows that card, tagged `Diamond & swallow only` / `—` / `Needs 8'0"`, the board drawn as is or as a swallow (§10). | explicit |
| E2 | overflow | The panel's own box is the one scroller (`overflow-y-auto`) inside the folder or the pinned area; the page never scrolls as a whole. | { statement: "document scrollHeight equals the window's with GUIDE open on all five pages on a phone; the pinned column ≤ 66dvh", verification: backstop } |
| E2 | zero-one-many | Fixed counts; no singular or plural copy anywhere. | explicit |
| E2 | long-text | The intro wraps at `max-w-prose`; every card's text wraps inside its card. | explicit |
| E3 list | empty | Never: 14 to 23 cards per page, the count never changing with the board. | explicit |
| E3 | loading | None (as E2). | explicit |
| E3 | error | None (as E2). | explicit |
| E3 | populated | Three across from about 1200 dots of window, two from about 956, one below; cards never narrower than 236. | { statement: "3 / 2 / 1 columns at 1280 / 1024 / 390; no card narrower than 236 or wider than its list", verification: backstop } |
| E3 | partial | Not a state the list has: it is always complete; only tags and drawings follow the board. | explicit |
| E3 | overflow | The grid wraps rows; the list never scrolls sideways; the panel scrolls vertically (E2). | { statement: "no horizontal overflow of the list or any card at 1280, 1024, 390", verification: backstop } |
| E3 | zero-one-many | Fixed per page (§5). | explicit |
| E4 card | empty | Never: every card has a name, a figure, the two sentences and a How to shape note; the Model info note is present on fourteen FINS cards and absent elsewhere by design, with no rule or label left behind. | explicit |
| E4 | loading | None. | explicit |
| E4 | error | None. | explicit |
| E4 | populated | §3's order: name row · figure · text · [Model info] · How to shape. | explicit |
| E4 | partial | A card with no tag draws the name alone; a card with no caption draws the SVG alone (§3). | explicit |
| E4 | overflow | Card content never runs wider than the card (`min-w-0`, wrapping text, the SVG at `w-full`). | { statement: "no card's scrollWidth exceeds its clientWidth; no text clipped at 1280, 1024, 390", verification: backstop } |
| E4 | zero-one-many | One card; not applicable. | explicit |
| E4 | long-text | The name row is `flex-wrap`: a long name keeps its line and the tag drops under it, right-aligned; paragraphs wrap. | { statement: "`Nose Thinning Starts` with its value tag wraps to two lines at the 236-dot column with the tag right-aligned", verification: backstop } |
| E5 tag | empty | A card with no tag shows the name alone (a choice's other options). | explicit |
| E5 | loading / error | None. | explicit |
| E5 | populated | A value tag (11/600 tabular accent) or a word tag (10/800 accent caps). | explicit |
| E5 | partial | The not-applicable words (§10) are a tag like any other; the drawing still draws. | explicit |
| E5 | overflow | A word tag wider than the card's free width wraps to two lines under the name, `text-right`. | { statement: "`Diamond & swallow only` (277 dots) wraps without clipping at the 236-dot column", verification: backstop } |
| E5 | zero-one-many | One tag per card. | explicit |
| E5 | long-text | The longest tags are the word tags above and `Needs 243.8 cm`; the same wrap rule covers them. | explicit |
| E6 figure | empty | Every card has a cartoon; a card with nothing pushed or drawn-as has no caption (§5 lists which). | explicit |
| E6 | loading | None: drawn synchronously; if lazy drawing is built (§8, measured first) the box keeps its `aspect-[300/H]` so nothing shifts. | explicit |
| E6 | error | The variants are the app's own total functions; none fails for a board the app can hold. A test per card family proves one field changed and the rest identical (§11). | explicit |
| E6 | populated | §4: strip, window, detail, dimensions, caption. | explicit |
| E6 | partial | A board with no wing draws the first wing the button would place; McKee Longboard on a short board draws the SB/Gun fallback and says so; Depth on a squash draws the board as a swallow. | explicit |
| E6 | overflow | The window is clamped inside the strip (3-unit inset); a dimension label routes to its D-08 position and moves rather than clips; the SVG is `overflow-visible` only for stroke ends. | { statement: "no drawing text overlaps another or the window's name, and no label leaves its card, over every card at 1024 and 390", verification: backstop } |
| E6 | zero-one-many | One figure per card. | explicit |
| E6 | long-text | Captions wrap to two or three lines at the narrowest column (`drawn as · Quad — McKee SB/Gun + Center (Five-fin)`); drawing text is pinned at 10 dots and never shrinks. | { statement: "the longest caption wraps without clipping at the 236-dot column", verification: backstop } |
| E7 text | empty | Never: the words test proves every card's three parts against `18-GUIDE-WORDS.md`; Model info is absent by design on every card but FINS' fourteen. | explicit |
| E7 | loading / error | None. | explicit |
| E7 | populated | §3: 13/1.45 two-sentence paragraph, the notes 12/normal under dashed rules. | explicit |
| E7 | partial | Only the designed absence of Model info; no rule or label is drawn for an absent note. | explicit |
| E7 | overflow | Paragraphs wrap inside the card; nothing is clipped. | { statement: "the longest note (Basic - Off-Rail's Model info, about 330 characters) is fully visible at the 236-dot column", verification: backstop } |
| E7 | zero-one-many | Not applicable. | explicit |
| E7 | long-text | Wrapping prose; a Metric substitution changes only the figure the words page marks, never the length class. | explicit |
| E8 intro | overflow | `max-w-prose`, wraps. | explicit |
| E8 | long-text | The board's name is the only variable; a long name wraps within the paragraph (no truncation in prose; "your board" when there is no name). | explicit |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none new this phase (the GUIDE adds no shadcn block; `TabbedPanel` is the app's own) | not required |

`components.json` declares `"registries": {}`. There is no third-party registry and no new package (the maths and the drawing are the
app's own), so the vetting gate has nothing to run on.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS (flag: the 10px label role is inherited — recorded above)
- [x] Dimension 5 Spacing: PASS (flag: 12px and 2px recorded as approved steps above)
- [x] Dimension 6 Registry Safety: PASS

**Approval:** APPROVED 2026-11-09 by gsd-ui-checker (0 blocking issues); the founder's standing word is "Let's build this and go live", every "founder may overrule" item stays his.
