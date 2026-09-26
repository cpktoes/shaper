---
phase: 11
slug: rocker-from-real-blanks
status: approved
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, iconLibrary lucide, no third-party registries)
created: 2026-09-25
reviewed_at: 2026-09-25
---

# Phase 11 — UI Design Contract

> Visual and interaction contract for the rebuilt ROCKER screen: the centre-thickness control, the
> blank list, the placement slider, the live numbers, the tip and 12" fine-tune, the flag-and-offer
> when a picked blank stops fitting, the hand-set fallback, the drawing with the blank behind the
> board and the foam shaded, the DATASHEET with the blank's numbers beside the board's, and one new
> row in the gear menu that opens the five shaper defaults. Everything the founder settled in
> `11-CONTEXT.md` (D-01–D-16) and `11-SPEC.md` (R1–R16) is taken as given; where they were silent
> this contract makes the call and marks it `(researcher's choice — founder may overrule)`. Every
> claim about existing code below was read from the file and is cited `path:line`. Product strings
> use the product's American spelling (`Center`, `catalog`, `centered`); prose here is British.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, `"registries": {}` |
| Component library | Base UI (`@base-ui/react` ^1.7.0) via shadcn's Base UI preset — not Radix |
| Icon library | lucide-react (^1.32.0) — this phase uses `TriangleAlertIcon`, `SlidersHorizontalIcon`, `SearchIcon`, `CheckIcon`, all verified exported |
| Font | Inter (`--font-body`/`--font-display`, both aliased to `var(--font-inter)`) |

**No new shadcn component is installed this phase.** The blank search is a plain filter over a list
the client already holds, so it is the installed `Input` (`components/ui/input.tsx`), not a Command
palette (cmdk would be a new runtime dependency, which SPEC's Constraints forbid without
discussion, and a Command palette's type-to-jump behaviour is built for pick-and-close, not for a
list the shaper reads greyed reasons from). Every surface is built from what is already under
`components/ui/` — `Button`, `Input`, `Dialog`, `Slider` — plus the app's own `SliderRow`,
`MeasureField`, `TabbedPanel`, `ViewerToolbarButton`, the callout primitives, and Base UI's `Menu`
used directly as `components/settings-menu.tsx` already does.

---

## Spacing Scale

Declared values (multiples of 4 only) for this phase's new surfaces:

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | `gap-1` between a blank row's name line and its meta line; `gap-1` between the flag's icon and headline |
| sm | 8px | `px-2 py-2` inside every blank row and the picked-blank card; `p-2` inside the flag block; `gap-2` between the picked card's action links; `gap-2` between the search box and the list |
| md | 16px | `gap-4` between a label and its typed field in the defaults dialog; `gap-x-4` between the readouts block's three columns; `mt-4` above the "Won't fit this board" group label |
| lg | 24px | `gap-6` between the defaults dialog's two groups |
| xl | 32px | Not used by this phase's surfaces |
| 2xl | 48px | Not used by this phase's surfaces |
| 3xl | 64px | Not used by this phase's surfaces |

**Existing, not introduced here — reuse exactly, never "correct" to the table above:**
`gap-5` (20px) between the sidebar's sections (`components/rocker/rocker-editor.tsx:169`,
`components/rocker/rocker-controls.tsx:114`); `gap-3.5` (14px) between slider rows and `pt-3`
(12px) under a section heading (`rocker-controls.tsx:120`); `mb-2` under a `SliderRow` label and
`mt-0.5` (2px) above its hint line (`components/design/slider-row.tsx:75,90`); `p-10` desktop
sidebar / `max-shell:p-4` phone column (`components/design/design-screen-shell.tsx:116`);
`max-shell:p-2` phone canvas (`design-screen-shell.tsx:148`); `p-3` (12px) on both TabbedPanel
cards and the datasheet (`components/viewer/tabbed-panel.tsx`, `rocker-datasheet.tsx:82`);
`py-1.5` (6px) datasheet rows (`rocker-datasheet.tsx:110`); `p-1.5` (6px) inside the menu popup and
`px-2 py-1.5` on its rows (`components/settings-menu.tsx:144,168`); `mx-2 my-1.5` on the menu's
divider (`components/design/phone-menu.tsx:58`).

---

## Typography

**Declared for this phase's new surfaces — two sizes, two weights (400 regular, 600 semibold):**

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| Row name | 14px (`text-sm`) | 600 (`font-semibold`) | 1.25 (`leading-tight`) | A blank's name in the list and in the picked card (`6'0" M-Regular`) |
| Body | 14px (`text-sm`) | 400 | 1.5 | Settings dialog row labels; the "Center Thickness" label beside its field |
| Meta | 12px (`text-xs`) | 400 | 1.33 (Tailwind's default `text-xs` 16px leading) | Row meta line, every greyed-row reason, the flag's body and offer, intro lines, dialog hints, readout station labels, loading/empty/error copy, the catalog footnote |
| Meta emphasis | 12px (`text-xs`) | 600 (`font-semibold`) | 1.33 | Readout values; the flag's headline |

**Existing roles this phase's surfaces sit inside — documented, not declared, unchanged:**

| Role | Size / Weight | Source |
|------|---------------|--------|
| Screen title "Rocker & Foil" | 18px / 800, `uppercase tracking-architectural` | `rocker-editor.tsx:171` |
| Section heading (collapsible) | 12px / 800, `uppercase tracking-architectural` | `rocker-controls.tsx:88` |
| Slider label | 14px / 400, `text-surf-ink-muted` | `slider-row.tsx:74` |
| Slider end hints | 12px / 400 | `slider-row.tsx:90` |
| Slider warning note | 10px / 400, `text-surf-warning-ink` | `slider-row.tsx:95` |
| Text-link action ("↺ Reset …") | 11px / 700, `text-surf-accent-ink` | `components/rails/rail-controls.tsx:341-346` |
| Tabs VIEWER / DATASHEET | 12px / 700, `uppercase tracking-architectural` | `tabbed-panel.tsx:95` |
| Datasheet station headers and this phase's group labels | 10px / 800, `uppercase tracking-architectural` | `rocker-datasheet.tsx:100` |
| Datasheet cells and row labels | 14px / 400 | `rocker-datasheet.tsx:111,117` |
| Menu group label | 10px / 700, `uppercase tracking-architectural` | `settings-menu.tsx:61` |
| Menu row label / detail | 14px / 400 · 11px / 400 | `settings-menu.tsx:172-173` |
| shadcn `Button` text | 14px / 500 | `components/ui/button.tsx:7` |
| shadcn `DialogTitle` | 16px / 500, `leading-none` | `components/ui/dialog.tsx` (`DialogTitle`) |
| Typed field text | 14px, `coarse:text-base` 16px | `components/design/measure-field.tsx:109-110` |
| Drawing callouts (SVG, screen-pinned px) | name 11 / value 14, weight 700 (`CALLOUT_PX`); station cards 10 / 13 (`STATION_NAME_SIZE` / `STATION_VALUE_SIZE`); rail titles 12 | `components/viewer/callout-primitives.tsx:59`, `components/rocker/rocker-view-frame.ts:256-257,275` |

The old sidebar intro at 10px (`rocker-controls.tsx:121-125`) retires with the Bezier; every new
intro line uses the declared 12px Meta role instead.

---

## Color

No new hue. Two new **drawing weights** join the existing `--outline-*` drawing layer in
`app/globals.css` (beside `--outline-station-line`, `app/globals.css:749`), each a `color-mix` of
an existing contract token — the same form the palette already uses for its board wash and station
lines:

```css
--outline-blank-line: color-mix(in srgb, var(--surf-ink-muted) 60%, transparent); /* the blank's side silhouette — solid, 1px */
--outline-foam-shade: color-mix(in srgb, var(--surf-ink-muted) 24%, transparent); /* the foam to come off */
```

No Tailwind bridge entry is needed — the viewer reads `var(--outline-*)` straight from SVG
attributes, exactly as it reads `--outline-station-line` today (`rocker-viewer.tsx:1112`).

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-sidebar` (controls column) and `--surf-panel` (the viewer and datasheet card) — both `#ffffff` in Daylight | Everything new sits on one of these two |
| Secondary (30%) | `--surf-well` (picked blank row, row hover, menu highlight); `--surf-canvas` (the frame around the panel, unchanged); `--surf-board-fill` (board wash, unchanged); `--outline-foam-shade` (the foam) | Grouping and the drawing's two filled areas |
| Accent (10%) | `--surf-accent` (fill) / `--surf-accent-ink` (text, stroke, ring) | The five uses listed below and nothing else |
| Warning (flag, not destructive) | `--surf-warning-ink` | The flag on a picked blank, each greyed row's reason, a negative foam figure. **This phase has no destructive action.** |

**Accent reserved for (nothing else on these surfaces takes it):**
1. Every slider's range fill and thumb — `.slider-accent` (`app/globals.css:851-865`), unchanged.
2. The picked blank row's 2px left bar (`border-l-2 border-surf-accent-ink`) and its `CheckIcon` (`text-surf-accent-ink`, the same check the menu's radio rows use, `settings-menu.tsx:180`).
3. The sidebar text-link actions — `Change Blank` / `Keep This Blank`, `Show all {n} blanks` / `Show Fewer`, `Clear Search`, `↺ Reset Fine-Tune`, `Restore Defaults` — in the existing Reset idiom (`text-surf-accent-ink`, `rail-controls.tsx:344`).
4. Focus rings: `.focus-ring-accent` on every hand-rolled button (`app/globals.css:903`), and the shared `Button`/`Input` rings.
5. The toolbar's measuring-points toggle when pressed — `ViewerToolbarButton`'s existing `pressed` treatment, unchanged.

**Not accent:** `Remove This Blank` is `text-surf-ink-muted` (it is reversible, not a call to
action); greyed rows are `text-surf-ink-muted`, never faded with opacity; the flag is warning, never
accent; the blank silhouette and foam shade are ink-muted mixes, never accent (the accent-ink
`--outline-construction` retires from this screen along with the drag handles).

**Where warning goes, exactly:** the flag block's 1px border (`border-surf-warning-ink`), its
`TriangleAlertIcon` and its headline text (`text-surf-warning-ink`); each greyed row's reason line
(`text-surf-warning-ink`); a Foam Off value below zero in the readouts block and the datasheet
(`text-surf-warning-ink`). The flag block is outlined, **never filled** with `--surf-warning` — that
fill is `#ff5722` in Daylight and would need `--surf-on-warning` text, which is louder than a
fit note deserves. The flag body and offer line stay `text-surf-ink`.

**Legibility, computed (WCAG ratio, no AA test exists in the repo — these were calculated from the
ramp hexes, `app/globals.css:197-304`):**

| Pair | Daylight | Chalk | Slate | Phosphor |
|------|----------|-------|-------|----------|
| `ink-muted` on panel (greyed row text) | 6.28 | 6.28 | 7.69 | 6.32 |
| `ink-muted` on well (text on the picked row) | 4.58 | 4.58 | 6.91 | 6.32 |
| `warning-ink` on panel/sidebar (reasons, flag) | 6.31 | 6.31 | 8.63 | 16.75 |
| `warning-ink` on well (a picked greyed row's reason) | 4.60 | 4.60 | 7.75 | 16.75 |
| `accent-ink` on well (picked check) | 4.94 | 7.71 | 4.61 | 7.00 |
| `--outline-blank-line` on panel | 2.63 | 2.63 | 3.54 | 2.88 |
| `--outline-foam-shade` on panel | 1.42 | 1.42 | 1.56 | 1.36 |

Daylight is the softest theme and passes every text pair at AA (4.5:1). The blank line at 2.63:1 is
deliberately faint beside the board's own 2px `--outline-ink` stroke, and still clearly above the
1.72:1 of the dashed station lines, so the blank reads as an object, not as a reference line. The
foam shade at 1.42:1 is a visible wash against the empty panel in every theme. In Phosphor the shade
and the board wash land near-equal in brightness (monochrome by design), and that is acceptable:
the two areas are always separated by the board's 2px ink outline, so the foam never merges with
the board. A 24% mix was chosen over 18% because 18% fell to 1.29:1 in Daylight and 1.22:1 in
Phosphor.

---

## Copywriting Contract

Every number below renders through `lib/geometry/measure-display.ts`. **Marks** (`formatMark`,
1/16" ↔ whole mm): rocker heights, thicknesses, foam off, placement, the fine-tune, every
shortfall, and the five settings. **Length** (`formatLength`, feet and inches ↔ cm to one decimal,
`measure-display.ts:113`): the board's own length **and a blank's length** — one formatter for both,
so the list row, the offer line and the empty states read a blank the way the board line reads the
board, and the two compare directly. **Dims** (`formatDim`, fractional inches ↔ cm to one decimal):
the distance along the board in a reason. The
12" station name is always `stationLabel(system)` — `12"` / `30.5 cm` (`measure-display.ts:156`).
Imperial and Metric examples are given side by side wherever a number appears. The examples use the
SPEC's reference case (Marko 6'0" M-Regular: 72.04" long, 2.92" at the center; nose 4.12, nose 12"
1.32, tail 12" 0.56, tail 1.74).

### Headline elements (template rows)

| Element | Copy |
|---------|------|
| Primary CTA | **Switch to This Blank** — the offer's button beside a flag. Picking from the list is a tap on the row itself; each row's accessible name is **Use {vendor} {name}** (e.g. `Use Marko Foam 6'0" M-Regular`). |
| Empty state heading | **No blank is long enough** (board longer than every blank less the spare length) / **No blank is thick enough** (center plus spare thickness above every blank) / **No blank passes both rules** (both at once) |
| Empty state body | See E1–E3 below — each names the board's number, the catalog's best, and the two ways out, with a **Change Fit Rules** button |
| Error state | **The blank catalog didn't load.** / "Your board is fine — the blank you picked travels with it. Reload the page to see the list again." |
| Destructive confirmation | **None this phase.** `Remove This Blank`, `↺ Reset Fine-Tune` and `Restore Defaults` all run without a dialog — see "Why nothing here asks first" below |

### Sidebar

| Element | Imperial | Metric |
|---------|----------|--------|
| Screen title (unchanged) | **Rocker & Foil** | same |
| Subtitle (replaces `rocker-editor.tsx:175`) | Pick a real blank, slide your board along it, and read the rocker and foil off the foam. | same |
| Board line under the subtitle | Length and width from TEMPLATE: 5'10" × 19 1/2" | Length and width from TEMPLATE: 177.8 × 49.5 cm |
| Section heading 1 | **CENTER THICKNESS** | same |
| Center label + field | Center Thickness `[2 1/2"]` | Center Thickness `[64 mm]` |
| Center detail line | The board's one center thickness — Rails and Volume read it too. | same |
| Section heading 2 | **BLANK** | same |
| List intro (live from settings) | Shortest first. Each is at least 2" longer and 3/8" thicker at the center than your board. Greyed blanks don't fit somewhere — the line under each says where. | …at least 51 mm longer and 10 mm thicker at the center… |
| Search placeholder / accessible name | Search blanks — e.g. Marko, 6'2, EPS / **Search blanks** | same |
| Group labels in the list | **FITS THIS BOARD** · **WON'T FIT THIS BOARD** | same |
| Row, line 1 | 6'0" M-Regular ··· (volume, when the catalog has one) 34.0 L | same (litres read the same) |
| Row, line 2 | Marko Foam · 6'1/16" · 2 15/16" center | Marko Foam · 183.0 cm · 74 mm center |
| Greyed row, line 3 (reason) | 1/8" too thin 12" from the nose | 3 mm too thin 30.5 cm from the nose |
| Greyed row, width reason | 1/2" too wide at the widepoint | 13 mm too wide at the widepoint |
| Shortfall under one step | under 1/16" too thin at the nose tip | under 1 mm too thin at the nose tip |
| List cap button / reverse | Show all {n} blanks / Show Fewer | same |
| Search with no match | No blanks match "{query}". **Clear Search** | same |
| Loading (list region only) | Loading blanks… | same |
| Picked card actions | **Change Blank** (while the list is open: **Keep This Blank**) · **Remove This Blank** | same |
| Remove hint (under the picked card, 12px muted) | Removing it keeps the rocker and foil at the five stations and re-draws the curve through them, for you to set by hand. | same |
| Section heading 3 | **BOARD ON BLANK** | same |
| Placement label | Placement — 1/2" toward nose · Placement — centered · Placement — 1/4" toward tail | Placement — 13 mm toward nose · Placement — centered |
| Placement end hints | Toward the nose · Toward the tail | same |
| Placement, no blank (disabled) | Placement — pick a blank first | same |
| Placement, no room (only if Extra Length is set under 1") | Placement — centered, with warning note: This blank is too short to slide your board along it. | same |
| Readouts block headers | **STATION** · **ROCKER** · **FOAM OFF** | same |
| Readouts rows, rocker column (nose to tail; Foam Off sits beside each) | Nose Tip 4 1/8" · Nose @ 12" 1 5/16" · Center 0" · Tail @ 12" 9/16" · Tail Tip 1 3/4" | Nose Tip 105 mm · Nose @ 30.5 cm 34 mm · Center 0 mm · Tail @ 30.5 cm 14 mm · Tail Tip 44 mm |
| Section heading 4 (fallback only) | **ROCKER** | same |
| Fallback rocker intro | Hand-set until you pick a blank — measured up from a flat surface with the board bottom-down. | same |
| Fallback rocker rows | Nose Tip — 4 1/8" · Nose @ 12" — 1 5/16" · Tail @ 12" — 9/16" · Tail Tip — 1 3/4" | Nose Tip — 105 mm · Nose @ 30.5 cm — 34 mm · … |
| Section heading 5 | **THICKNESS** | same |
| Thickness intro, blank picked | Your blank's own foil, scaled down to your center. Set the tips; fine-tune the 12" stations if you need to. | …fine-tune the 30.5 cm stations… |
| Thickness intro, no blank | Hand-set until you pick a blank. | same |
| Tip rows | Nose Tip — 5/16" · Tail Tip — 1/4" | Nose Tip — 8 mm · Tail Tip — 6 mm |
| 12" rows, blank picked | Nose @ 12" — 1 3/8" with hints From blank 1 5/16" · Tweak +1/16" | Nose @ 30.5 cm — 35 mm with hints From blank 34 mm · Tweak +1 mm |
| 12" row, no tweak | …hints From blank 1 5/16" · No tweak | …From blank 34 mm · No tweak |
| Reset link | ↺ Reset Fine-Tune | same |

### The flag and the offer (beside the picked card)

| State | Headline (12px/600 warning-ink) | Body (12px/400 ink) | Action |
|-------|------|------|--------|
| F1 — fails at every placement (envelope or width) | This blank doesn't fit your board | 1/8" too thin 12" from the nose. / 3 mm too thin 30.5 cm from the nose. | Offer line + **Switch to This Blank** |
| F2 — fits elsewhere, not here | Doesn't fit at this placement | 1/4" too thin at the tail tip. | **Move to Where It Fits** |
| F3 — now too short (length floor) | This blank doesn't fit your board | It's 1 1/2" too short — you've asked for at least 2" of spare length. / It's 38 mm too short — you've asked for at least 51 mm of spare length. | Offer line + **Switch to This Blank** |
| F4 — now too thin at the center (centre floor) | This blank doesn't fit your board | It's 1/8" too thin at the center — you've asked for at least 3/8" of spare thickness. / It's 3 mm too thin at the center — you've asked for at least 10 mm of spare thickness. | Offer line + **Switch to This Blank** |
| Offer line | — | Closest blank that fits: Marko Foam 6'0" M-Thick, 6'1/16" / …, 183.0 cm | (the button above) |
| F5 — nothing fits anywhere (**makes SPEC's ⚠ "no fitting blank at all" assumption concrete: the flag with no offer**) | This blank doesn't fit your board | {F1/F3/F4 body}. No blank in the three catalogs fits this board right now. | **Change Fit Rules** (opens the defaults dialog) |

### Reason vocabulary (one pure formatter in `lib/geometry/` composes these, tested in both systems)

- Grammar: `{amount} too thin {where}` for thickness, `{amount} too wide {where}` for width — the
  founder's own two examples from D-06, verbatim. `{amount}` is `formatMark` of the shortfall; a
  shortfall that rounds to zero reads `under 1/16"` / `under 1 mm`, never `0"`.
- `{where}`, first match wins: `at the widepoint` (width failures within 1" of the widepoint);
  `at the nose tip` / `at the tail tip` (within 1" of an end); `12" from the nose` /
  `12" from the tail` (within 1" of a 12" station, via `stationLabel`); `at the center` (within 1"
  of centre); otherwise `{formatDim(distance)} from the nose` or `… from the tail`, whichever end is
  nearer (`18 1/2" from the tail` / `47.0 cm from the tail`). The 1" snap is
  `(researcher's choice — founder may overrule)`.
- One reason per blank: the worst shortfall at the placement where the worst shortfall is smallest
  (D-07). A blank failing in several places still shows one line.
- Search and reasons never alter the catalog's own text; the name is shown as stored
  (`5'8" SB`, not the CSV's doubled-quote escape).

### Empty and error states of the list

| State | Heading (14px/600) | Body (12px/400) | Action |
|-------|------|------|--------|
| E1 — board longer than every blank (SPEC backstop) | No blank is long enough | Your board is 12'6" and the longest blank in the three catalogs is 12'7 1/2", so none leaves the 2" of spare length you've asked for. Shorten the board on the TEMPLATE screen, or ask for less spare length. / …board is 381.0 cm … longest … 384.8 cm … the 51 mm of spare length… | **Change Fit Rules** |
| E2 — center too thick for every blank | No blank is thick enough | Your center is 4 3/4" and the thickest blank is 4 7/8" at the center, so none leaves the 3/8" of spare thickness you've asked for. Try a thinner center, or ask for less spare thickness. | **Change Fit Rules** |
| E3 — both at once | No blank passes both rules | Nothing in the three catalogs is both 2" longer and 3/8" thicker at the center than your board. | **Change Fit Rules** |
| E4 — list failed to load | The blank catalog didn't load. | Your board is fine — the blank you picked travels with it. Reload the page to see the list again. | none (reload is the browser's) |
| E5 — loading | — | Loading blanks… | none |

The board line in E1 uses `formatLength` for the board and each blank's length; the example numbers
above are illustrative — the planner renders the live values.

### Viewer and datasheet

| Element | Copy |
|---------|------|
| Tabs (unchanged) | **VIEWER** · **DATASHEET** |
| Toolbar toggle (replaces "Show/Hide construction lines", `rocker-editor.tsx:222`) | aria-label and title **Show measuring points** / **Hide measuring points** |
| Rotate and wide view (unchanged) | "Rotate the board" · "Hide the sidebar for a wider view" / "Show the sidebar" (title "Wide view") |
| Drawing's accessible name, blank picked | Side profile of the board inside the {vendor} {name} blank, with the foam to come off shaded |
| Drawing's accessible name, no blank (unchanged) | Side profile of the board, showing the rocker line and deck thickness |
| Rail titles (unchanged) | Thickness · Rocker (`rocker-view-frame.ts:293`) |
| Datasheet intro, blank picked | Your blank's numbers beside your board's, at the board's five stations — take it to the supplier. |
| Datasheet intro, no blank (unchanged, `rocker-datasheet.tsx:84`) | Your board's own blank datasheet — hold it beside a real foam blank when you order. |
| Station headers (unchanged) | NOSE TIP · NOSE @ 12" · CENTER · TAIL @ 12" · TAIL TIP (metric `NOSE @ 30.5 CM`) |
| Group labels | **BLANK — MARKO FOAM 6'0" M-REGULAR** · **YOUR BOARD** |
| Row labels | Rocker · Thickness · Width, and **Foam Off** under the two groups (metric gains `(mm)`/`(cm)` via `columnUnitSuffix`, `measure-display.ts:179`) |
| Catalog footnote | From the Marko Foam catalog, page 21. Station names are the catalog's own — T12 is 12 inches from the tail, N12 is 12 inches from the nose. |
| Catalog notes (only when the picked blank carries flags) | At {station}: {flag text, verbatim} — one line each |
| Typed-cell error (existing, verbatim) | Couldn't read '{typed}' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2. / Couldn't read '{typed}' as millimetres — try a whole number like 67, or centimetres like 6.7 cm. (`measure-display.ts:271,278`) |

### Gear menu and the defaults dialog

| Element | Imperial | Metric |
|---------|----------|--------|
| Menu group label | **BLANKS** | same |
| Menu row label / detail | **Fit & Tip Defaults** / Spare foam and tip thickness | same |
| Dialog title | **Fit & Tip Defaults** | same |
| Dialog description | How much spare foam a blank needs before it counts as a fit, and the tip thickness every new board starts with. | same |
| Group 1 label | **WHICH BLANKS FIT** | same |
| Extra Length | Extra Length `[2"]` — A blank must be at least this much longer than your board. | `[51 mm]` |
| Extra Center Thickness | Extra Center Thickness `[3/8"]` — …at least this much thicker at the center than your board. | `[10 mm]` |
| Width Margin | Width Margin `[1"]` — Your board must be at least this much narrower than the blank everywhere, half of it spare on each rail. | `[25 mm]` |
| Group 2 label | **NEW BOARDS START WITH** | same |
| Group 2 hint | Boards you've already started keep their own tips. | same |
| Nose Tip Thickness | `[5/16"]` | `[8 mm]` |
| Tail Tip Thickness | `[1/4"]` | `[6 mm]` |
| Footer | **Restore Defaults** (text link, left) · **Done** (Button, right — *Done*, not *Save*: nothing is pending, each field applied the moment it was committed, the Units rows' own pattern) | same |

The tip defaults `5/16"` and `1/4"` are today's `DEFAULT_FOIL_SPEC.noseTip`/`tailTip`
(`lib/geometry/foil.ts:57,61`), used as the not-chosen fallback — a planner's assumption, since
CONTEXT names the three fit defaults but not the tips.

### Why nothing here asks first

- **Remove This Blank** keeps the five stations exactly at the moment it runs (code review WR-01, 2026-09-26: between the stations the curve is re-drawn through those five points, so the drawn curve and the litres can move a hair) — the rocker and foil are
  sampled into the five hand-set stations exactly as they stand — and it is one undo step on the
  app's existing Cmd/Ctrl+Z and the phone's `PhoneUndoBar`. Re-picking the blank from the list
  brings it back.
- **↺ Reset Fine-Tune** clears two small offsets the shaper typed or dragged; undo brings them back.
- **Restore Defaults** changes settings only; no saved board moves (every board stores its own tips,
  D-09).

---

## Already done — read this before planning any work

Confirmed 2026-09-25 by reading the files. Where this corrects CONTEXT.md or the orchestrator's
brief, this section is the one to trust.

- **Today's thickness rows are `SliderRow` alone, with no typed field in the sidebar**
  (`rocker-controls.tsx:253-296`); typed thickness lives only on the DATASHEET, as bare
  `MeasureField`s (`rocker-datasheet.tsx:134-143`). The typed field beside a slider exists only on
  TEMPLATE/FINS/VOLUME's Board Length, as a hand-rolled block allow-listed in
  `components/design/slider-row.test.ts:39`. The new Center Thickness row copies that hand-rolled
  shape, so it needs its own allowlist entry (count 1, reason "typed field beside the slider").
- **The construction overlay holds more than "two tip drag handles."** It draws four construction
  lines, three knot dots and four drag targets with their transparent hit circles
  (`rocker-viewer.tsx:1230-1305`), plus a touch-only drag readout chip (`rocker-viewer.tsx:779,855`).
  All of it retires with the Bezier (D-14) — the lines, the dots, the targets, the hit circles, the
  chip and `lib/geometry/rocker-drag.ts`. The overlay's default of "on for a touch pointer"
  (`rocker-editor.tsx:133`, `constructionOverride ?? coarsePointer`) existed only so a thumb could
  find the handles; it becomes off on every pointer (below).
- **The gear menu holds Units and Theme only** (`components/settings-menu.tsx:51-129`). The print
  option is not in it — "Include Rail Band Instructions in Print" is a checkbox on the RAILS sidebar
  (`rail-controls.tsx:442`) and on the Summary (`components/summary/order-form.tsx:779`). What D-09
  copies from it is the storage pattern (account + browser + server handoff), not a menu row.
- **The phone gets the new menu row for free:** `PhoneMenu` renders the same
  `SettingsMenuContent` (`components/design/phone-menu.tsx:61`). Plan no phone-menu edit.
- **Touch sizing already carried by the shared components, plan no work for these:** the slider
  thumb's 44px ring (`coarse:after:-inset-4` on the Thumb, `components/ui/slider.tsx:120` — not in
  `.slider-accent`); `MeasureField`'s `coarse:h-11 coarse:text-base` (`measure-field.tsx:109-110`);
  `Input`'s `coarse:h-11 coarse:text-base` (`components/ui/input.tsx:19`); `Button`'s default
  `coarse:h-11` and icon `coarse:size-11` (`button.tsx:26,31`); `DialogContent`'s close-X
  `coarse:size-11` (`dialog.tsx:72`).
- **`SliderRow` already has every slot this phase needs** — `disabled` (the whole row at
  `opacity-40`, `slider-row.tsx:71`), `leftHint`/`rightHint` (`:89-94`) and `note` (`:95`). The
  fine-tune's "From blank … · Tweak …" pair rides the hint slots; **no new `SliderRow` prop.**
- **The datasheet already scrolls sideways on a phone** with a 24px trailing fade and a 540px floor
  (`rocker-datasheet.tsx:93-94`) — Phase 9's D-04, which chose sideways scroll over re-stacking.
  This phase keeps it and adds only a sticky label column.
- **Formatters that exist:** `formatMark`, `formatMarkBare`, `formatDim`, `formatDimBare`,
  `formatLength`, `formatSignedDim`, `stationLabel`, `columnUnitSuffix`
  (`measure-display.ts:63-182`). **One that does not:** `formatSignedMark`. The "Tweak +1/16"" hint
  needs it — add it to `measure-display.ts` mirroring `formatSignedDim` (`:98`): imperial
  `formatSignedInchesFraction` (`+1/16"`, `-1/8"`, `0"`), metric `+2 mm` / `-2 mm` / `0 mm`, sign
  taken from what was printed. The placement label deliberately avoids signs (it says "toward nose"
  / "toward tail").
- **`formatLength` prints a zero-inch length as `6'1/16"`** (`formatFeetInches`,
  `lib/geometry/units.ts:343-349`): 72.04" rounds to 72 1/16", which is 6 feet and a sixteenth. A
  typed board length rarely lands there; catalogue lengths are centimetre conversions and land there
  often (Marko's 6'0" blanks are 72.04"). This contract does not change the formatter — every blank
  length simply reads through it as the board's own does. If the founder would rather read
  `6'0 1/16"`, that is a one-line change in `formatFeetInches` plus its tests, app-wide, and their
  decision, not the planner's.
- **The existing Reset link has no touch sizing** (`rail-controls.tsx:341-346`, 11px text, about
  15px tall). Every text link this phase adds gets `coarse:min-h-11 coarse:flex coarse:items-center`
  — Phase 10's "grow the row, not the glyph" idiom — and the RAILS/FINS originals stay as they are.
- **The route is already dynamic** through the root layout, which awaits the units and print
  handoffs (`app/layout.tsx:76-77`). `app/design/rocker/page.tsx` renders `<RockerEditor />` with no
  data today (11 lines); it becomes the place that loads the pickable blanks.
- **Tests that already name this screen:** `e2e/viewer-toolbar.spec.ts:202` expects three ROCKER
  toolbar buttons — still three after this phase. `e2e/touch-sizing.spec.ts:75` loops only
  `/design/outline` and `/design/volume` — add `/design/rocker` to that loop. `e2e/touch-drag.spec.ts:570`
  onwards drags rocker handles — rewritten for the placement slider, not deleted.
  `e2e/desktop-baseline.spec.ts:62` holds the ROCKER baseline, which is re-recorded once on purpose,
  and `:74` holds the VOLUME baseline, which is re-recorded once too (planning research, 2026-09-26:
  the pchip swap moves the default board from 29.79 to 29.94 L and the VOLUME card prints two
  decimals, `components/volume/volume-calculation-card.tsx:136,181` — only those two figures may
  differ in the diff); TEMPLATE, RAILS and FINS must not move.

---

## Interaction & Layout Contract

### What triggers what

Nothing new. The three switches are inherited exactly as CLAUDE.md states them: **width** picks the
layout (`max-shell:` below 820px, `shell:` at or above, `app/globals.css:128,134`); **pointer**
picks a control's size (`coarse:`, `app/globals.css:77`); **height** picks whether a short screen
scrolls (inline `[@media(max-height:500px)]`). Every phone-only rule below is `max-shell:` on an
untouched desktop base; every touch size is `coarse:`; nothing new reads height.

### What draws the eye first

- **Focal point, both layouts: the drawing** — the board's 2px `--outline-ink` profile sitting inside
  the faint blank silhouette with the foam shaded between them. Everything else on the panel is
  quieter by construction: the blank at 1px and 2.63:1, the shade at 1.42:1, the rails in their
  existing 11/14px callout faces. On a phone it is also first in reading order (the pinned drawing
  above the scrolling controls).
- **In the sidebar:** the picked card is the loudest element (the only `--surf-well` fill with an
  accent bar on the column), and when a flag is present it sits directly beneath the card and is the
  one warning-coloured block on the screen. Section headings, then slider labels, then Meta text
  follow in the existing 12/14/12px hierarchy — no new size and no bold body text.
- **Every icon carries words.** The three toolbar buttons keep their `aria-label`/`title`; the
  search icon is decorative (`aria-hidden`) behind the `Input`'s own `aria-label`; the flag's
  `TriangleAlertIcon` is decorative beside its headline; the menu row's icon sits beside its label,
  as every `ThemeRow` icon does. No icon-only control is introduced.

### The sidebar, top to bottom

The brief's order is locked (centre → list → placement → readouts → tips and fine-tune). Every
section heading is the existing collapsible `SectionHeading` (`rocker-controls.tsx:75-94`), all open
on arrival; the open/closed map is view state, never saved.

| # | Blank picked | No blank (fallback) |
|---|--------------|---------------------|
| 0 | Title, subtitle, board line | same |
| 1 | CENTER THICKNESS — label + typed field + slider | same |
| 2 | BLANK — picked card, flag and offer if any, Change Blank / Remove This Blank; the list only while Change Blank is open | BLANK — intro, search, list (six rows, then Show all) |
| 3 | BOARD ON BLANK — placement slider, readouts block | BOARD ON BLANK — the slider disabled, no readouts block |
| 4 | — | ROCKER — four hand-set sliders |
| 5 | THICKNESS — Nose Tip, Nose @ 12" (fine-tune), Tail @ 12" (fine-tune), Tail Tip, ↺ Reset Fine-Tune | THICKNESS — Nose Tip, Nose @ 12", Tail @ 12", Tail Tip (absolute sliders, as today) |

Everything nose to tail reads in the same order on every surface: sliders top to bottom, readouts
top to bottom, datasheet left to right.

### 1. Center thickness (R1, D-12)

- The page's first control. It writes the one stored centre, `foil.center`; RAILS and VOLUME keep
  reading it through their existing links. No page-local copy.
- Shape: the Board Length hand-rolled block, compacted to one line. Line 1 is
  `flex items-center justify-between mb-2`: "Center Thickness" (14px/400 `text-surf-ink-muted`, the
  `SliderRow` label treatment) on the left, a standalone `MeasureField` (`family="mark"`, 96px box,
  unit-suffixed) on the right. Line 2 is the `Slider` with `.slider-accent`, bounds from
  `measureSlider(foil.center, FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system)`,
  field bounds through `typedFieldBounds`. Line 3 is the detail line (12px/400 muted).
- The value is not repeated in the label — the field shows it.
- Changing it re-runs the list's verdicts (D-07) and re-checks the picked blank (R6). It never
  clears the pick.

### 2. The blank list (R2, D-04–D-08)

**What is listed.** Only blanks passing both floors (length ≥ board + Extra Length; centre ≥ target
+ Extra Center Thickness, both live from the shaper's settings). Marko's four MK-SUP-STD blanks with
no usable thickness never appear (R9). One list across all three vendors, **ordered by length,
shortest first** — the least foam wasted comes first — with fitting blanks in a **FITS THIS BOARD**
group, then greyed blanks in a **WON'T FIT THIS BOARD** group, each in length order (ties by name).
No vendor grouping — the nearest-fit rule is vendor-blind (D-08), and grouping would scatter the
closest lengths across three headings `(researcher's choice — founder may overrule)`.

**List states:**

| State | What shows |
|-------|------------|
| A — browsing, no pick, empty search | Intro, search, then the first **six** rows of the combined order (group labels appear where their rows fall), then **Show all {n} blanks** (n = every listed row; the button only appears when rows are hidden, so n ≥ 7 and the plural always holds). Expanded: every row, then **Show Fewer**. The six is `(researcher's choice — founder may overrule)`. |
| B — searching | Every match in both groups, no cap. Case-insensitive substring over `"{vendor} {name}"`, with curly quotes (’ ‘ ” “) folded to straight ones first so an iPhone's smart punctuation still finds `6'2"`. No match → the no-match line and **Clear Search**. |
| C — a blank is picked | The picked card only (below). **Change Blank** opens state A with the picked row highlighted where it falls; the link then reads **Keep This Blank**, which closes the list again. Picking any row closes it. |
| Loading | "Loading blanks…" in the list region only; the title, centre control, placement and drawing paint without waiting. |
| Unavailable | E4 copy in the list region. A picked blank keeps working in full, because its stations travel with the board (D-01). |
| Empty | E1/E2/E3 copy and **Change Fit Rules**. |

**Search box.** The installed `Input`, `type="search"`, full width, `aria-label="Search blanks"`,
placeholder above, a 16px `SearchIcon` inside the left edge (`pl-8`, icon `text-surf-ink-muted`,
`pointer-events-none`). Height and text size come from `Input` itself (`h-8`, `coarse:h-11`,
`coarse:text-base`). It filters on every keystroke; it never recomputes verdicts.

**Rows.** The list is a `<ul aria-label="Blanks">` inside a `rounded-md border border-surf-line`
box; rows are separated by `border-b border-surf-line-faint` (none after the last). Each row is one
`<button type="button" aria-pressed={picked}>` with the `.focus-ring-accent` class,
`w-full px-2 py-2 text-left coarse:min-h-11`, `hover:bg-surf-well`:

- Line 1 (`flex items-baseline gap-2`): name (Row name role, `text-surf-ink`, `flex-1`), then the
  volume when the catalog has one (Meta, `text-surf-ink-muted`, `shrink-0`), then — picked row only —
  a 16px `CheckIcon` in `text-surf-accent-ink`. Marko blanks and 22 US Blanks EPS blanks have no
  volume; nothing takes its place.
- Line 2 (Meta, `text-surf-ink-muted`): `{vendor} · {formatLength(length)} · {formatMark(centre)} center`.
  The measured length may differ from the nominal size in the blank's name (Arctic's `5'8" SB` is
  69.31" — `5'9 5/16"`); both are the catalogue's own figures and both are shown. It wraps if it
  must; it is never truncated.
- Line 3, greyed rows only (Meta, `text-surf-warning-ink`): the reason.
- **Greyed row:** name and line 2 both `text-surf-ink-muted` (no opacity, so the reason stays at
  full contrast); accessible name gains ", doesn't fit: {reason}". **Greyed rows can still be
  picked** — the drawing then shows exactly where the board pokes out of the foam, and the flag
  (F1) says so. Picking lands the slider at that blank's "nearly fits" placement (D-07)
  `(researcher's choice — founder may overrule)`.
- **Picked row, wherever it appears:** `bg-surf-well` plus `border-l-2 border-surf-accent-ink`
  (the 2px bar replaces 2px of the left padding, `pl-1.5`, so the text does not shift), and the
  check.
- Tapping a fitting row picks the blank and lands the slider at the fitting placement closest to
  centre (D-07). The fine-tune offsets carry over (D-11).

**The picked card (state C).** The picked row drawn from the board's own copy of the blank (D-01) —
so it shows even if that blank no longer passes the floors or the catalog query failed — as a
non-interactive block with the same row anatomy, `rounded-md border border-surf-line bg-surf-well
border-l-2 border-l-surf-accent-ink px-2 py-2`. Under it, `flex flex-wrap gap-2`: **Change Blank**
(accent text link) and **Remove This Blank** (`text-surf-ink-muted` text link, same 11px/700), then
the Remove hint (Meta, muted). Both links carry `.focus-ring-accent` and
`coarse:min-h-11 coarse:flex coarse:items-center`.

### 3. The placement slider (R3, D-08)

- A plain `SliderRow` under **BOARD ON BLANK**: label `Placement — {value}`, `leftHint="Toward the
  nose"`, `rightHint="Toward the tail"`.
- Range: both ways from 0, each end at ((blank length − board length) / 2 − 1/2"), step 1/16" /
  1 mm through `measureSlider`. Stored as a signed `Mm`, **positive toward the nose** (D-08).
- **Direction on screen: the left end is toward the nose**, matching the drawing's default
  nose-left view and the nose-first order of every list and table on the screen. Feed the slider the
  negated placement and negate back in `toMm`; a unit test proves a drag to the left raises the
  stored (nose-positive) value `(researcher's choice — founder may overrule)`.
- Value text: `formatMark(|placement|)` + ` toward nose` / ` toward tail`; exactly `centered` when
  the snapped value prints as zero. The label is sized never to wrap at the 260px desktop floor
  (longest case `Placement — 45 1/4" toward nose`, 31 characters ≈ 226px), so the thumb never jumps
  a line under a finger mid-drag.
- **Disabled** (no blank): `SliderRow disabled` at the existing `opacity-40`, thumb at 0, label
  `Placement — pick a blank first`.
- **No room** (only reachable with Extra Length under 1"): disabled at 0, label
  `Placement — centered`, `note` "This blank is too short to slide your board along it."
- Every move re-samples the prepared fit, updates the drawing, the rails, the readouts and the
  picked blank's flag at the current placement; it never re-runs the list's verdicts and never
  touches the network (R14). It records undo history the way every other slider does.
- Touch: the thumb's 44px ring is already there (`slider.tsx:120`). This slider gets its own phone
  test: a real touch drag on the placement thumb changes the label and the Nose Tip readout, with
  zero network requests counted during the drag (R14's acceptance).

### 4. Live readouts (R4, D-15)

Both places, on purpose:

- **On the drawing**, the rails keep every number in the manifest grammar: rocker on the bottom
  rail, thickness on the deck rail, at the board's five stations.
- **In the sidebar**, a compact block directly under the placement slider, because Foam Off has no
  rail of its own (below) and a thumb on the slider needs the numbers beside it. A
  `grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1` block, `mt-3`:
  - header row: STATION · ROCKER · FOAM OFF (10px/800 uppercase `tracking-architectural`, the
    datasheet header role, value columns right-aligned);
  - five rows nose to tail, station names from the datasheet's list (`Nose @ ${stationLabel}`):
    label Meta `text-surf-ink-muted`; values Meta-emphasis `text-surf-ink`, right-aligned,
    `tabular-nums`, **unit-suffixed** (`formatMark`), because each sits alone in its own cell;
  - Center rocker reads `0"` / `0 mm` in `text-surf-ink-muted` (zero by levelling);
  - a Foam Off below zero (the board pokes out) reads in `text-surf-warning-ink` with its minus sign.
- No blank → no block (the hand-set sliders under ROCKER already show every rocker number in their
  labels).

### 5. Tips and the 12" fine-tune (R5, D-09–D-11)

Under **THICKNESS**, four `SliderRow`s, nose to tail, `gap-3.5` as today:

- **Nose Tip / Tail Tip** — absolute thickness over `FOIL_THICKNESS_RANGE_IN`, label
  `Nose Tip — 5/16"`. Stored on the board; a new board starts from the shaper's defaults. The same
  rows in both states.
- **Nose @ 12" / Tail @ 12", blank picked** — label shows the **final** thickness
  (`Nose @ 12" — 1 3/8"`); the slider moves the **offset**, a signed range of ±1/4" (±6 mm metric,
  through `metricSliderRange`) centred on 0 `(researcher's choice — founder may overrule)`;
  `leftHint` = `From blank {formatMark(derived)}`, `rightHint` = `Tweak {formatSignedMark(offset)}`
  or `No tweak` at zero. The two hints are the legible "derived plus your offset" the brief asks
  for, on one stable line at every width.
- **Nose @ 12" / Tail @ 12", no blank** — absolute thickness sliders exactly as today
  (`rocker-controls.tsx:262-287`), no hints.
- **↺ Reset Fine-Tune** — the existing Reset idiom, under the Tail Tip row, blank picked only. It
  clears both offsets. With both at zero it stays in place but is `aria-disabled="true"`,
  `opacity-40`, `pointer-events-none`, so the rows above never shift. No confirmation (see
  Copywriting).

### 6. The flag and the offer (R6, D-08)

- Sits directly under the picked card, above Change Blank / Remove This Blank, whenever the picked
  blank does not fit. It never clears, swaps or dims the pick; only the shaper's own tap does.
- Block: `rounded-md border border-surf-warning-ink p-2`, `role="status"` so a screen reader hears
  it arrive. Line 1 `flex items-start gap-1`: 16px `TriangleAlertIcon` + headline (Meta-emphasis,
  warning-ink). Then the body (Meta, ink). Then the offer line (Meta, ink) and the action as a
  shadcn `Button variant="outline"` at default size (32px, 44px under `coarse:`), full width on a
  phone (`max-shell:w-full`), left-aligned on desktop.
- **When it is checked:** against the current placement, on every change — slider moves included,
  because it is one blank at one placement (a single sample of the prepared fit, not a list
  verdict). F2 ("doesn't fit at this placement") and its **Move to Where It Fits** — which moves
  the slider to the fitting placement nearest to where it is now — follow from that
  `(researcher's choice — founder may overrule)`.
- **The offer:** the fitting blank of any vendor whose length is closest to the picked one (tie:
  less spare foam at centre, CONTEXT's discretion), never the picked blank itself.
  **Switch to This Blank** picks it and lands at its fitting placement closest to centre; the
  fine-tune offsets carry over.
- **Nothing fits (F5):** no offer line; the body adds the catalogs sentence; the action is
  **Change Fit Rules**. This is the planner's assumption from SPEC's ⚠ row, made concrete.

### 7. Going back to a hand-set rocker (D-02, D-08)

- **Remove This Blank** — in the picked card, muted text link, no confirmation.
  `(researcher's choice — founder may overrule)`
- What it does: the five fallback rocker stations are seeded by sampling the board's current
  rocker at the five stations, and the five thickness stations by sampling the current final foil
  (derived plus offsets). The five stations do not move at the moment of removal, the curve between them is re-drawn through those points (a hair may move — WR-01); the blank
  silhouette and foam shade disappear, the cards on the rails change kind (below), and the sidebar
  switches to its fallback column. The seeding by sampling follows D-02/D-14's migration rule,
  applied to a live removal — a planner's assumption CONTEXT does not settle outright.
- The offsets are dropped (in the fallback the 12" thicknesses are absolute). One undo step brings
  the blank, placement and offsets back.

### 8. The fallback state (D-02, D-14)

A brand-new board, every board saved before this phase, and any board after Remove This Blank:

- Sidebar per the table above: the centre control, the list in state A, BOARD ON BLANK with the
  slider disabled, **ROCKER** with four hand-set `SliderRow`s (Nose Tip, Nose @ 12", Tail @ 12",
  Tail Tip over the existing `ROCKER_LIFT_RANGE_IN`), and **THICKNESS** with four absolute sliders.
  Rocker entry lives in the sidebar **and** on the DATASHEET: on a phone the DATASHEET replaces the
  drawing in the pinned area, and every other screen sets its numbers from sliders with the drawing
  in view `(researcher's choice — founder may overrule)`.
- The Angle, Smoothness and Flatness sliders (`rocker-controls.tsx:127-233`), the read-only 12" pair
  (`:239-242`) and the old intro (`:121-125`) retire.
- The drawing is today's board on its baseline with nothing behind it — no empty-blank outline, no
  placeholder, no "pick a blank" text inside the drawing.
- No banner, toast or badge says "hand-set". The BLANK section's own intro and the ROCKER section's
  intro line carry that.

### 9. The drawing (D-15)

Side view only, the existing `RockerViewer` extended with an optional blank. The Summary order
form never passes one, so its compact rocker box is unchanged.

- **Paint order, bottom to top:** the dashed baseline (unchanged, `rocker-viewer.tsx:1107-1115`) →
  the **blank silhouette**, filled `var(--outline-foam-shade)`, stroked `var(--outline-blank-line)`
  at 1px, solid (no dash — dashes mean reference lines in this app's grammar, and the blank is a
  real object), `strokeLinejoin="round"` → the **board silhouette**, unchanged
  (`fill="var(--outline-board-fill)"`, `stroke="var(--outline-ink)"`, 2px,
  `rocker-viewer.tsx:1116-1123`) → the rails.
- Because `--surf-board-fill` is opaque in every theme, the board paints over the blank's fill, so
  the only shade left visible is the foam to come off. The board's bottom **is** the blank's bottom
  along the board's length, so the shade shows above the deck and beyond each tip, never under the
  bottom — expected, not a defect.
- The blank is drawn at the current placement in the board's own coordinates, its rocker levelled
  the same way (R11), sampled as densely as the drawing needs (R15 — density is a drawing
  parameter, never an interpolation change).
- **Frame:** with a blank, the fit covers the blank's length and its deck height rather than the
  board's, so the whole blank is always in view and the board draws slightly smaller inside it;
  rails, cards and titles stay on the board's five stations. `rocker-view-frame.ts` owns that
  arithmetic (Rule 1); the component derives none of it. The 66dvh phone ceiling and nose-up
  reading (Phase 9 D-18, `rocker-editor.tsx:284`) are unchanged.
- **Cards vs readings** (manifest decision 2 — a card for a number the shaper sets, a plain reading
  for one computed):

  | Rail | Blank picked | No blank |
  |------|--------------|----------|
  | Rocker (bottom) | All four ends and 12" stations are readings; Center keeps its muted em-dash reading | Nose Tip, Nose @ 12", Tail @ 12", Tail Tip are cards; Center keeps its em-dash |
  | Thickness (deck) | Center, Nose Tip, Tail Tip are cards; Nose @ 12" and Tail @ 12" are readings (derived, whatever the tweak) | All five are cards (as today) |

- **Width failures are not drawn** (D-15). A thickness failure needs no extra paint either — the
  board visibly pokes through the blank's line. No warning colour appears in the drawing
  `(researcher's choice — founder may overrule)`.

### 10. The toolbar's measuring-points toggle

- Same button, same `LocateFixedIcon`, same `ViewerToolbarButton` `pressed` treatment, in the same
  slot — three buttons, as `e2e/viewer-toolbar.spec.ts:202` expects. Only its label changes
  (**Show / Hide measuring points**), because it no longer draws lines.
- What it shows once the handles retire: the board's five stations as the existing plain knot dots
  (`r = KNOT_DOT_PX * handleUnit`, fill `var(--outline-ink)`) on the bottom and the deck; with a
  blank, also every station the catalog measured, as the same-size dots filled
  `var(--outline-blank-line)` on the blank's bottom and deck (each attribute's own stations, so
  Arctic's width-only `N3` draws nothing in side view). Nothing in the overlay is draggable.
- Default **off on every pointer** (`constructionOverride ?? false`). Wide view still forces it on
  and restores it on the way out, unchanged (`rocker-editor.tsx:143-152`). Rotate and wide view
  are untouched.

### 11. The DATASHEET (D-16)

Same `TabbedPanel` tab, same scroll box: `overflow-x-auto` with the 24px trailing fade and the
`min-w-[540px]` floor (`rocker-datasheet.tsx:93-94`), same five station columns, same header and
cell classes (`:100,111,117`). Two additions for every state: the label column becomes
`sticky left-0 z-10 bg-surf-panel`, so a row keeps its name while a phone scrolls sideways (no
effect on desktop, where nothing scrolls); and every value reads bare, with the unit in the row
label in Metric (`columnUnitSuffix`).

**Blank picked — three blocks, eight rows:**

| Block | Rows | Cells |
|-------|------|-------|
| Group label `BLANK — {VENDOR} {NAME}` | — | 10px/800 uppercase, `pt-2`, spanning the table, sticky-left |
| Blank | Rocker · Thickness · Width | All read-only (`text-surf-ink-muted`) — the blank's pchip values at the point under each of the board's five stations, levelled on the blank's own low point |
| Group label `YOUR BOARD` | — | same treatment |
| Your board | Rocker | Read-only — the board's re-levelled rocker (Center `0`) |
| | Thickness | Nose Tip, Center, Tail Tip **typed** (bare `MeasureField`, the same values the sidebar writes); Nose @ 12" and Tail @ 12" read-only final values (the tweak lives in the sidebar only) |
| | Width | Read-only, from TEMPLATE via `sampleOutline`, as today |
| Foam Off | one row, `border-t-2 border-surf-line-faint` above it | Read-only: blank thickness − board thickness at each station; below zero in `text-surf-warning-ink` |

Typed rows keep today's `text-surf-ink` label, read-only rows today's `text-surf-ink-muted`
(`rocker-datasheet.tsx:111,127`). Under the table (Meta, muted): the catalog footnote, then one
line per catalog note on the picked blank (station code and flag text verbatim, wrapping).

**No blank — today's three rows, one change in the rocker row:** Width read-only; Thickness typed at
all five stations (as today); **Rocker typed at Nose Tip, Nose @ 12", Tail @ 12", Tail Tip** (D-14,
reversing 260829-rda's read-only 12" cells), Center read-only `0`. No blank rows, no Foam Off, no
footnote.

**Phone arithmetic (why sideways scroll still):** the panel's width on a phone is the screen less
46px each side (`max-shell:p-2` 8 + panel border 1 + panel `p-3` 12 + card border 1 + card `p-3`
12 + datasheet `p-3` 12) — **268px at 360, 283px at 375, 298px at 390**. At the 540px floor the
label column is about 90px and each station column about 82px, so a phone shows the label plus two
stations at a time and scrolls for the other three. A per-station stack was considered and set
aside: Phase 9 D-04 chose sideways scroll over re-stacking, and the sticky label column removes the
one thing that got worse with eight rows (losing the row names mid-scroll).

### 12. The gear-menu row and the defaults dialog (D-09)

**Menu row.** In `SettingsMenuContent`, after the Theme group: the divider idiom
(`mx-2 my-1.5 border-t border-surf-line-faint`, `phone-menu.tsx:58`), then a `Menu.Group` with a
`Menu.GroupLabel` "Blanks" (the existing group-label class, `settings-menu.tsx:61`) and one
`Menu.Item` in `ThemeRow`'s anatomy (`settings-menu.tsx:168-173`): 16px `SlidersHorizontalIcon`
muted, label 14px ink, detail 11px muted, plus `coarse:min-h-11`. Selecting it closes the menu
(Base UI's default for `Menu.Item`) and opens the dialog. The phone gets it through `PhoneMenu`.

**Why a dialog and not fields in the menu** `(researcher's choice — founder may overrule)`: Base
UI's menu owns arrow keys, typeahead and focus inside its popup, so a typed number there would fight
the menu's own keyboard handling; and the menu closes on outside interaction, which the on-screen
keyboard's arrival can look like. A dialog is the app's existing place for typed input
(`rename-dialog.tsx`, `board-name-prompt.tsx`).

**Where the dialog lives:** rendered once, by the new defaults provider (the third instance of the
units / print-instructions provider pattern), not inside `SettingsMenuContent` — the menu popup
unmounts when it closes, and a dialog inside it would vanish with it. The provider exposes an
`open` call; the menu row and every **Change Fit Rules** button call it.

**Dialog layout.** shadcn `Dialog` + `DialogContent`, with
`max-h-[calc(100dvh-2rem)] overflow-y-auto` added so a phone keyboard never leaves Done out of
reach. `DialogHeader` (title + description), then two groups `gap-6`, each a group label (10px/700
uppercase muted, the menu's own) and its rows. A row is `flex items-start justify-between gap-4`:
left, the label (Body) with its hint beneath (Meta, muted); right, a standalone `MeasureField`
(`family="mark"`, 96px box). `DialogFooter`: **Restore Defaults** text link on the left, a default
`Button` **Done** (a `DialogClose`) on the right.

- **Commit:** each field commits on blur or Enter (MeasureField's own contract) and takes effect at
  once — the list re-runs its verdicts behind the dialog. There is no Cancel, the same as the Units
  rows, which also apply as they are picked.
- **Bounds** `(researcher's choice — founder may overrule)`: Extra Length 0"–12", Extra Center
  Thickness 0"–1", Width Margin 0"–3", each tip 1/8"–1 1/2", all through `measureSlider`'s metric
  range and `typedFieldBounds`; out-of-range values clamp silently (`commitTypedMeasure`); unreadable
  text shows the existing error lines.
- **"Not chosen" (null):** the field shows the default value, the same as if it had been chosen. No
  "default" tag. A value is stored only once committed; **Restore Defaults** sets all five back to
  not chosen.
- **Saving:** signed in, on the account; signed out, in the browser — the Units pattern exactly,
  including its silent background retry. No save button, no success or failure toast.
- **Arithmetic:** the dialog is `100% − 2rem` wide on a phone — 328px at 360, 343px at 375, 358px at
  390 — and `p-4` leaves 296 / 311 / 326px inside. Less the 96px field and the 16px gap, the label
  column is **184 / 199 / 214px**; the longest label, "Extra Center Thickness", is about 160px at
  14px. Hints wrap within the label column. At `sm:` and up the dialog caps at 384px (`sm:max-w-sm`).

### 13. Presets and the development-only capture (D-03)

**Nothing changes on screen in production.** Presets open sitting in their provisional blank at
their placement, drawn by the surfaces above; there is no "provisional" badge anywhere. In
development only, the sidebar footer's existing button (`rocker-editor.tsx:270-283`) keeps its
labels **Copy preset values** / **Copied!** and its styling; only the text it copies changes (it
gains the blank line). Plan no new UI for this.

### 14. Older boards (D-01, D-14)

**No migration dialog, banner, toast or badge.** A board saved before this phase reopens in the
fallback state looking as it was saved; the snapshot migration is invisible.

### 15. Phone layout and touch sizes

The ROCKER screen stays on `DesignScreenShell` with `phonePinned="66dvh"`; the list and every new
control live in the scrolling controls column (`max-shell:p-4`). Content widths:

| Where | 360 | 375 | 390 | Desktop |
|-------|-----|-----|-----|---------|
| Controls column (screen − 32px) | 328 | 343 | 358 | 260–320 (340–400px sidebar less `p-10`) |

The desktop sidebar is the narrow case, so every row below was sized to **260px**:

| Line | Longest case (Inter, approx.) | Fits 260? |
|------|-------------------------------|-----------|
| Row line 1 | `7'5" Machine All` (16 characters, the longest listed name — the SUP-STD names are longer but excluded) 14px/600 ≈ 128 + volume `47.0 L` ≈ 44 + check 16 + gaps 16 + padding 16 = 220 | yes |
| Row line 2 | `US Blanks · 6'1/16" · 2 15/16" center` 12px ≈ 230 of 244 inside the padding | yes — and it wraps rather than truncates if a longer vendor name ever arrives |
| Row line 2, metric | `US Blanks · 183.0 cm · 74 mm center` ≈ 231 | yes |
| Reason | `3 mm too thin 30.5 cm from the nose` ≈ 231; `under 1/16" too thin 18 1/2" from the tail` ≈ 284 | first yes; the second wraps to two lines, allowed |
| Placement label | `Placement — 45 1/4" toward nose` 14px ≈ 226 | yes, never wraps |
| Readouts block | label `Nose @ 30.5 cm` ≈ 92 + two value columns ≈ 60 each (the "FOAM OFF" header sets the width) + 2 × 16 gap = 244 | yes |
| Offer button | `Switch to This Blank` ≈ 150 + 20 padding | yes |

Touch sizes, all with the existing `coarse:` idiom and nothing new:

| Control | Touch size | How |
|---------|------------|-----|
| Every slider thumb | 44 × 44 | already there (`slider.tsx:120`) |
| Center field, datasheet cells, dialog fields | 44px tall, 16px text | already there (`measure-field.tsx:109-110`) |
| Search box | 44px tall, 16px text | already there (`input.tsx:19`) |
| Blank rows | ≥ 50px by content; `coarse:min-h-11` as a floor | new class on the row button |
| Text links (Change Blank, Remove This Blank, Show all, Show Fewer, Clear Search, Reset Fine-Tune, Restore Defaults) | 44px tall | `coarse:min-h-11 coarse:flex coarse:items-center` |
| Offer / Move / Change Fit Rules / Done buttons | 44px tall | already there (`button.tsx:26`) |
| Menu row | ≥ 44px | `coarse:min-h-11` |
| Dialog close-X | 44 × 44 | already there (`dialog.tsx:72`) |

The phone's floating undo pair (`components/design/phone-undo-bar.tsx`) floats over the column's
bottom-right corner on every screen; nothing new is placed specially for it.

**Tests this contract implies** (the planner writes them): `/design/rocker` joins the
`e2e/touch-sizing.spec.ts` loop; the placement slider's touch drag with zero network requests; the
rewritten rocker drag specs (`touch-drag.spec.ts`, `phone-trip.spec.ts`) move to the new controls;
the viewer's two new drawing weights are asserted present with a blank and absent without; the
reason formatter and `formatSignedMark` get unit tests in both systems; the ROCKER and VOLUME
desktop baselines are re-recorded once, deliberately (VOLUME for its two litres figures only).

### Desktop and other screens untouched

- **TEMPLATE, RAILS, FINS, VOLUME, SUMMARY and the setup screen draw exactly what they draw today.**
  Their desktop baselines under `e2e/desktop-baseline.spec.ts-snapshots/` must not move — with one
  exception settled at planning (2026-09-26): VOLUME's two litres figures move with the pchip swap
  (D-13) and that baseline is re-recorded once, every other pixel identical. RAILS and
  VOLUME keep reading the centre through their links; the order form's compact rocker box keeps
  drawing the built geometry, with no blank, no shade and no new colour.
- **The one change visible outside ROCKER is the gear menu's new BLANKS group,** which appears in
  the popup on every screen (desktop gear and phone menu alike). A closed menu is pixel-identical.
- On ROCKER itself, every phone rule is `max-shell:`-gated and every touch size `coarse:`-gated;
  the rotate and wide-view buttons keep their classes (`rocker-editor.tsx:215,241`) and behaviour.

---

## UI Considerations

> Populated by the ui-phase UI-consideration probe (Step 9.5) and lifted by plan-phase's
> `## UI Considerations` lift rule via the identical rule as SPEC `## Edge Coverage`. Shape-rooted UI *state*
> coverage (empty / loading / error / populated / partial / overflow / zero-one-many / long-text).
> Empty-state and error-state COPY live in `## Copywriting Contract` above — this section covers
> state coverage and REFERENCES those rows rather than restating the copy (de-dup).

**71 considerations across 14 surfaces — 71 resolved, 0 open** (68 answered explicitly by this contract, 3 held out as a visual check because the state is unreachable by construction).

Produced by `gsd-core/bin/lib/ui-consideration-probe.cjs` from the fourteen surfaces listed during
research, with element kinds authored deliberately rather than inferred from prose (the kinds are
recorded under each heading). This session ran without the founder at the keyboard, so, following
the workflow's `--auto` convention, the orchestrator confirmed the kinds and resolved every row as
either **✅ covered** (this contract or its context answers the question outright — lifted as a truth)
or **🧪 backstop** (the state cannot occur; a held-out visual check stands in for a spec — lifted as
`{ statement, verification: backstop }`). **Nothing was dismissed** and nothing is left ⚠ unresolved;
every row is a real answer the founder can revisit and overrule. Empty- and error-state COPY is not
restated here — the rows point at the Copywriting Contract's E1–E5 and F1–F5 entries.

### Center thickness control

_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | The field is never empty: it always shows the board's stored centre (foil.center — the preset's value or DEFAULT_FOIL_SPEC's 2 1/2" / 64 mm on a new board). Clearing the text and blurring restores the stored value, MeasureField's existing commit contract. | ✅ covered |
| **Loading / in-flight** | No loading state: the centre is design-store state painted with the page; nothing is fetched, so the field and slider carry their value on first paint. | ✅ covered |
| **Error / failure** | Unreadable text shows the existing MeasureField error line under the field (Couldn't read '{typed}' as inches… / as millimetres…); an out-of-range value clamps silently through commitTypedMeasure; the slider cannot produce an error. | ✅ covered |
| **Partial / incomplete** | A single field has no partial state: either a new value committed or the previous one stands. Held out as a visual check that a half-typed value abandoned mid-edit leaves the stored centre untouched. | 🧪 backstop |
| **Long text** | The value sits in a fixed 96px right-aligned box and is bounded by FOIL_THICKNESS_RANGE_IN (at most 5" / 127 mm), so it can never overflow; the 'Center Thickness' label fits the 260px desktop floor with the field beside it. | ✅ covered |

### Blank search box

_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | An empty box means no filter: the list shows state A (six shortest rows, then Show all {n} blanks) and the placeholder reads 'Search blanks — e.g. Marko, 6'2, EPS'. | ✅ covered |
| **Loading / in-flight** | No loading state: the filter runs client-side over the list the page already holds, on every keystroke, and never touches the network (R14). | ✅ covered |
| **Error / failure** | The only failure is no match: 'No blanks match "{query}".' with the Clear Search link. The search itself cannot error, and it never recomputes verdicts. | ✅ covered |
| **Partial / incomplete** | A partial word is a valid query: case-insensitive substring over '{vendor} {name}', so 'Mar' already narrows to Marko Foam, and curly quotes are folded to straight ones first so an iPhone's 6’2 finds 6'2". | ✅ covered |
| **Long text** | A long query scrolls inside the Input as any text field does; the no-match line quotes it in Meta text and wraps rather than truncating. | ✅ covered |

### Blank list

_Kinds: list-collection, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Three empty states, each with its own heading and a Change Fit Rules button — E1 'No blank is long enough', E2 'No blank is thick enough', E3 'No blank passes both rules' — whose bodies name the board's number, the catalog's best and the two ways out (Copywriting Contract, Empty and error states of the list). | ✅ covered |
| **Loading / in-flight** | 'Loading blanks…' in the list region only (E5); the title, centre control, placement slider and drawing paint without waiting. | ✅ covered |
| **Error / failure** | E4: 'The blank catalog didn't load.' with 'Your board is fine — the blank you picked travels with it. Reload the page to see the list again.' A picked blank keeps working in full from the board's own copy of its stations (D-01). | ✅ covered |
| **Populated / happy path** | Six shortest rows first with FITS THIS BOARD / WON'T FIT THIS BOARD labels where they fall, then Show all {n} blanks; a fitting row in ink, a greyed row in ink-muted with its warning-ink reason on line 3; the picked row carries the well fill, the 2px accent bar and the check. | ✅ covered |
| **Partial / incomplete** | Rows with no catalog volume (every Marko blank, 22 US Blanks EPS blanks) leave the volume slot empty and nothing takes its place; blanks with no usable thickness (the four MK-SUP-STD) are never listed (R9); the picked card renders from the board's copy even when the catalog read failed. | ✅ covered |
| **Overflow / truncation** | The list lives in the scrolling controls column on desktop and phone alike, capped at six rows until Show all; a search shows every match uncapped (at most about 160 rows, no virtualiser). Line 2 and reasons wrap and are never truncated. | ✅ covered |
| **Zero / one / many** | Zero rows → E1/E2/E3. Show all {n} blanks appears only when rows are hidden, so n ≥ 7 and the plural always holds. One fitting blank is a single row under FITS THIS BOARD with the greyed group beneath; a group label appears only when its group has rows. | ✅ covered |
| **Long text** | The longest listed name (7'5" Machine All) fits line 1 at the 260px desktop floor with volume and check beside it; line 2 wraps if it must; the longest reason ('under 1/16" too thin 18 1/2" from the tail') wraps to two lines. Nothing is truncated. | ✅ covered |

### Picked blank card

_Kinds: static-content, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: the card draws from the board's own copy of the blank (D-01), present in the design store the moment the board loads; it never waits for the catalog. | ✅ covered |
| **Error / failure** | The card cannot fail to render because its data travels with the board; when the picked blank stops fitting, the flag (E05) appears beneath the card — the card itself never changes, clears or dims (D-08). | ✅ covered |
| **Overflow / truncation** | The card takes the column's width with the row anatomy; its two text links sit in a flex-wrap gap-2 row and drop to a second line on a narrow column; the Remove hint wraps beneath them. | ✅ covered |
| **Long text** | Name and meta lines follow the list row's wrapping rules (never truncated); the links are fixed words (Change Blank / Keep This Blank, Remove This Blank). | ✅ covered |

### Fit flag and offer

_Kinds: static-content, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: the flag is computed on the client from the prepared fit on every change, slider moves included, with no network request (R14). | ✅ covered |
| **Error / failure** | The flag is the fit's error surface: states F1–F5 each carry a headline, the reason with station and amount, and exactly one action (Switch to This Blank, Move to Where It Fits, or Change Fit Rules when nothing in the three catalogs fits — F5, SPEC's open edge made concrete). | ✅ covered |
| **Overflow / truncation** | A role=status block at column width; the action button is full width on a phone (max-shell:w-full) and left-aligned at its natural width on desktop; body and offer lines wrap. | ✅ covered |
| **Long text** | A long blank name in the offer line wraps inside the block; the reason grammar is bounded to one reason per blank, at most two lines at the 260px floor. | ✅ covered |

### Placement slider

_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: a SliderRow over client state. Until a blank is picked it renders disabled (opacity-40) with the label 'Placement — pick a blank first'. | ✅ covered |
| **Error / failure** | The slider cannot fail. The one exceptional state — no room to slide (only reachable with Extra Length set under 1") — renders disabled at 0, label 'Placement — centered', with the note 'This blank is too short to slide your board along it.' | ✅ covered |
| **Long text** | The label's longest case ('Placement — 45 1/4" toward nose', about 226px at 14px) never wraps at the 260px desktop floor, so the thumb never jumps a line under a finger mid-drag. | ✅ covered |

### Live readouts block

_Kinds: static-content, list-collection_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | No blank picked → no readouts block at all; the hand-set ROCKER sliders already show every rocker number in their labels, so nothing is duplicated. | ✅ covered |
| **Loading / in-flight** | No loading state: every value is sampled from the prepared fit on the client and updates on every slider move without a network request (R14). | ✅ covered |
| **Error / failure** | Nothing can fail; the only exceptional reading is a Foam Off below zero (the board pokes out of the foam), drawn in text-surf-warning-ink with its minus sign. | ✅ covered |
| **Populated / happy path** | Always five rows nose to tail (Nose Tip, Nose @ 12", Center, Tail @ 12", Tail Tip) under STATION · ROCKER · FOAM OFF headers; values are unit-suffixed marks, tabular-nums, right-aligned; the Center rocker reads 0" / 0 mm in muted ink because it is zero by levelling. | ✅ covered |
| **Partial / incomplete** | Every cell always has a value: the length floor and the 1/2" buffer keep the board inside the blank at every allowed placement, so all five stations sample a real point of the blank; no cell is ever blank. | ✅ covered |
| **Overflow / truncation** | Three fixed columns sized by the FOAM OFF header measure about 244px at the 260px floor — no sideways overflow; the block scrolls with the controls column like everything else in the sidebar. | ✅ covered |
| **Zero / one / many** | Fixed at five rows; zero and one are unreachable, so no singular/plural copy exists. Held out as a visual check on both unit systems that exactly five rows render for a picked blank. | 🧪 backstop |
| **Long text** | Station names are the datasheet's own via stationLabel (the longest, 'Nose @ 30.5 cm', about 92px); values are marks of bounded length; nothing wraps or truncates. | ✅ covered |

### Thickness section (tips and 12" fine-tune)

_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Never empty: the tips default from the shaper's settings (5/16" / 1/4" when not chosen) and are stored on the board; the 12" rows always show the final thickness, and the right hint reads 'No tweak' when the offset is zero. | ✅ covered |
| **Loading / in-flight** | No loading state: sliders over board state; the derived 12" values come from the prepared fit on the client. | ✅ covered |
| **Error / failure** | Sliders cannot error. A tip set thicker than the blank's own tip surfaces as a fit failure in the flag at that tip (D-10), never as a slider error or a clipped curve. | ✅ covered |
| **Partial / incomplete** | A tweak on one 12" station and none on the other is a normal state: each row shows its own From blank / Tweak (or No tweak) pair; ↺ Reset Fine-Tune clears both and is dimmed and inert (aria-disabled, opacity-40, pointer-events-none) when both are already zero, so the rows never shift. | ✅ covered |
| **Long text** | The hint pair ('From blank 1 5/16"' · 'Tweak +1/16"') rides SliderRow's existing 12px two-ended hint line and fits at 260px; each label carries one value. | ✅ covered |

### Hand-set rocker section

_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Never empty: a new board starts on its preset's or the default rocker; an older board's five stations are seeded from its saved curve by the snapshot migration; after Remove This Blank they are seeded from the current curve — the drawing does not move at that moment. | ✅ covered |
| **Loading / in-flight** | No loading state: four SliderRows over board state, shown only in the fallback. | ✅ covered |
| **Error / failure** | The sliders are bounded by ROCKER_LIFT_RANGE_IN and cannot error; the DATASHEET's typed rocker cells show the existing MeasureField error line on unreadable text. | ✅ covered |
| **Partial / incomplete** | The four stations are independent controls and the centre is always 0 by levelling (not a control); a kink at a 12" station on sparse hand values is the risk the founder accepted in D-14, not a UI state to design for. | ✅ covered |
| **Long text** | Labels such as 'Nose @ 30.5 cm — 105 mm' fit the 260px floor in both unit systems; the intro line wraps as Meta text. | ✅ covered |

### Side-profile drawing with the blank

_Kinds: media_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | No blank → today's board on its dashed baseline with nothing behind it: no empty-blank outline, no placeholder and no 'pick a blank' text inside the drawing. | ✅ covered |
| **Loading / in-flight** | No loading state: the SVG is computed synchronously from the store on every render; there is no image or font to wait for. | ✅ covered |
| **Error / failure** | Nothing can fail to draw. A thickness failure is visible as the board poking through the blank's 1px line; width failures are not drawn (D-15); no warning colour appears in the drawing. | ✅ covered |
| **Populated / happy path** | Paint order baseline → blank silhouette (fill var(--outline-foam-shade), stroke var(--outline-blank-line) 1px solid) → board (board-fill, 2px outline-ink) → rails with cards and readings at the board's five stations; the frame fits the whole blank so it is always in view; the 66dvh phone ceiling and nose-up reading are unchanged. | ✅ covered |

### Measuring-points toggle

_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: a pressed/unpressed ViewerToolbarButton over view state, off by default on every pointer (constructionOverride ?? false); wide view still forces it on and restores it on the way out. | ✅ covered |
| **Error / failure** | Nothing can fail: the dots are derived from the same stations the drawing already uses; with no blank the toggle shows the board's five stations alone. | ✅ covered |
| **Long text** | The words live in aria-label and title only ('Show measuring points' / 'Hide measuring points'); the button is icon-sized, so label length cannot affect layout. | ✅ covered |

### DATASHEET

_Kinds: list-collection, form_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | No blank → today's three rows: Width read-only, Thickness typed at all five stations, Rocker typed at Nose Tip, Nose @ 12", Tail @ 12" and Tail Tip with Center read-only 0 (D-14). No blank rows, no Foam Off, no footnote. | ✅ covered |
| **Loading / in-flight** | No loading state: rendered from the board's copy of the blank and the store; nothing is fetched when the tab opens. | ✅ covered |
| **Error / failure** | Typed cells show the existing MeasureField error lines (inches / millimetres wording, measure-display.ts); nothing else on the sheet can fail. | ✅ covered |
| **Populated / happy path** | Three blocks, eight rows: BLANK — {VENDOR} {NAME} (Rocker, Thickness, Width read-only), YOUR BOARD (Rocker read-only; Thickness typed at Nose Tip, Center, Tail Tip and read-only at the 12" stations; Width read-only), then Foam Off under a border-t-2 rule; the catalog footnote and any catalog notes beneath. | ✅ covered |
| **Partial / incomplete** | Every cell shows a value: each attribute is sampled over its own stations and the evaluator clamps past its last measured station, so a blank measured at fewer stations still fills every column; a blank's catalog flags (e.g. 'not printed in catalog') appear verbatim as one note line each under the table; blanks without volume or deck length lose nothing here because neither is a row. | ✅ covered |
| **Overflow / truncation** | Sideways scroll inside the existing overflow-x-auto box with its 24px trailing fade and 540px floor, plus the new sticky label column; a phone (268/283/298px panels at 360/375/390) shows the label plus two stations at a time and scrolls for the rest; desktop never scrolls. | ✅ covered |
| **Zero / one / many** | Fixed five station columns and a fixed row set per state (three rows without a blank, eight with one); no variable-count layout exists. Held out as a visual check in both states on a phone and on desktop. | 🧪 backstop |
| **Long text** | The BLANK group label spans the table's width and wraps for a long name (US Blanks 11'2"A SUP EPS); the footnote and catalog notes wrap as Meta text; station headers are fixed words. | ✅ covered |

### Gear-menu Fit & Tip Defaults row

_Kinds: nav, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | No loading state: a static Menu.Item; the dialog it opens shows values the provider already resolved on the server for the first paint (D-09, the units pattern). | ✅ covered |
| **Error / failure** | The row cannot fail; a settings save failure is silent with background retry (the Units pattern) — no toast, and the value on screen is the value in force. | ✅ covered |
| **Overflow / truncation** | One row under the divider inside the min-w-64 popup, which Base UI's Positioner keeps on screen; in the phone menu it sits below the settings rows and above the account control. | ✅ covered |
| **Long text** | Fixed strings ('Fit & Tip Defaults' at 14px, 'Spare foam and tip thickness' at 11px) inside a 256px popup; nothing dynamic can lengthen them. | ✅ covered |

### Fit & Tip Defaults dialog

_Kinds: form_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Never empty: a 'not chosen' setting shows its default exactly as if chosen (2" / 3/8" / 1" / 5/16" / 1/4"; 51 / 10 / 25 / 8 / 6 mm) with no 'default' tag; Restore Defaults returns all five to not chosen. | ✅ covered |
| **Loading / in-flight** | No loading state: the values come from the defaults provider, resolved on the server for the first paint, so the dialog opens with the right numbers in either unit system. | ✅ covered |
| **Error / failure** | Unreadable text shows the existing MeasureField error line; out-of-range values clamp silently to the declared bounds; a save failure is silent with background retry. | ✅ covered |
| **Partial / incomplete** | Each field commits on blur or Enter and applies at once, independently; an untouched field keeps its value; there is no Save and no Cancel, so no half-submitted state can exist. | ✅ covered |
| **Long text** | The label column is 184/199/214px at 360/375/390 (the longest label, 'Extra Center Thickness', is about 160px at 14px); hints wrap within it; the 96px field never shrinks; the dialog scrolls (max-h-[calc(100dvh-2rem)]) so Done stays reachable above a phone keyboard. | ✅ covered |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `Button`, `Input`, `Dialog`, `Slider` (all already installed under `components/ui/`, no new `shadcn add`) | not required |
| Third-party | none declared | not applicable |

`components.json`'s `"registries": {}` stays empty. No new runtime dependency: no Command/cmdk
palette, no list virtualiser (at most about 160 rows, capped to six until expanded). Base UI's
`Menu` is used directly, as `settings-menu.tsx` already does, not through a new wrapper.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-09-25 (gsd-ui-checker, 6/6 PASS, no recommendations)
