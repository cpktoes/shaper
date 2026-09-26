---
phase: 12
slug: foil-the-way-a-shaper-cuts-it
status: approved
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, cssVariables true, iconLibrary lucide, registries {})
created: 2026-09-26
reviewed_at: 2026-09-26
---

# Phase 12 — UI Design Contract

> The delta on top of Phase 11's approved contract
> (`.planning/milestones/v1.3-phases/11-rocker-from-real-blanks/11-UI-SPEC.md`, "the Phase 11
> contract" below). Phase 12 changes how the foil is derived from a blank. On screen that means:
> a per-board **Deck Skin** control and a quiet per-board **Tip Style** (Pin deck / Bottom) choice
> on the ROCKER sidebar; the live readouts reading foam **off the bottom**, with a **planer passes**
> figure at the center; the Fit & Tip Defaults dialog trading Extra Center Thickness for **Deck
> Skin**, **Planer Max Depth** and a **Tip Style** default; the DATASHEET's single Foam Off row
> splitting into **Deck** and **Bottom**; new wording for the center floor in the blank list; and a
> second shaded band under the board in the drawing. Everything the founder settled in
> `12-CONTEXT.md` (D-01 to D-12) and `12-SPEC.md` is taken as given. Where CONTEXT left a choice to
> Claude, this contract makes it and marks it `(Claude's discretion — founder may overrule)`. Every
> claim about existing code was read from the file on 2026-09-26 and is cited `path:line`. Product
> strings use the product's American spelling (`Center`, `catalog`); prose here is British.
> Anything this document does not mention is exactly as the Phase 11 contract left it.
>
> **Amended 2026-09-26 after the planning research** (the checker's 6/6 verdict predates these; each is a founder ruling or a factual fix, none a new visual system): the Metric reference case corrected to `7 mm` (1/8" is 3.175 mm); the Tip Style hint softened for a falling tip rocker (D-16); a new §5a "Fine-tune off: Deck / Bottom" toggle (D-13); §8's one-pass-at-placement and foil-runs-out reasons (D-15, D-18); §10's note that carried-over boards may open flagged (D-14); surface E13 added to UI Considerations.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, cssVariables `true`, `"registries": {}` |
| Component library | Base UI (`@base-ui/react`) through shadcn's Base UI preset, not Radix |
| Icon library | lucide-react. **This phase adds no icon.** |
| Font | Inter (`--font-display` / `--font-body`, both `var(--font-inter)`, `app/globals.css:589-590`) |

**No new shadcn component and no new app component this phase.** Every new control reuses one
that already exists:

- **`SliderRow`** (`components/design/slider-row.tsx:55-97`) for the sidebar's Deck Skin.
- **`MeasureField`** (`components/design/measure-field.tsx`) for the dialog's two new numbers,
  exactly as the dialog's other rows use it (`components/fit-defaults-dialog.tsx:141-149`).
- **`TwoOptionToggle`** (`components/viewer/two-option-toggle.tsx:21-41`) for Tip Style, in the
  sidebar and in the dialog. This is the app's existing two-choice pill (RAILS's Flat/Domed,
  `components/rails/rail-instructions.tsx:135-140`). It gets three small accessibility additions
  (§4) but no new styling.

---

## Spacing Scale

Declared values for this phase's new and changed surfaces. All are multiples of 4.

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | Not newly used. The readouts grid keeps its existing `gap-y-1` (`components/rocker/board-on-blank.tsx:121`). |
| sm | 8px | The passes line: `mt-2` above its rule, `pt-2` below it, `gap-2` between its label and value. Tip Style (sidebar): `mb-2` under its label, `mt-2` above its hint. |
| md | 16px | The dialog's Tip Style row: `gap-4` between the label column and the toggle (the dialog's existing row gap, `fit-defaults-dialog.tsx:135`) |
| lg | 24px | Not newly used. The dialog keeps `gap-6` between its groups (`fit-defaults-dialog.tsx:122`). |
| xl / 2xl / 3xl | 32 / 48 / 64px | Not used by this phase |

**One declared exception — 12px (`gap-x-3`, a multiple of 4):** the readouts grid's column gap
drops from `gap-x-4` (`board-on-blank.tsx:121`) to `gap-x-3`. The reason is that the third
column's header grows from `FOAM OFF` to `OFF BOTTOM`. Measured in the app's own Inter file at the
header role (10px / 800 / 0.15em tracking), the header goes from 63.9px to 81.0px. The widest
Metric row is `Nose @ 30.5 cm` (93.7px) + `ROCKER` (50.9px, header-bound) + `OFF BOTTOM` (81.0px).
With `gap-x-4` that totals 257.6px, which leaves 2.4px to spare at the 260px desktop floor. With
`gap-x-3` it totals 249.6px and leaves 10.4px.

**Existing spacing, reused exactly and never "corrected" to the table above:** `gap-3.5` (14px)
between slider rows. The new Deck Skin row sits `gap-3.5` below Placement, the same rhythm as the
THICKNESS section (`components/rocker/rocker-controls.tsx:304`). Also `mt-3` above the readouts
grid (`board-on-blank.tsx:121`); `mt-0.5` (2px) above a hint line (`slider-row.tsx:90`); the
datasheet's `py-1.5` rows and `pt-2 pb-1` group labels (`components/rocker/rocker-datasheet.tsx:98,111`);
TwoOptionToggle's `gap-1.5` between its two pills and `py-2.5 px-1` inside each
(`two-option-toggle.tsx:23,31`); and the menu divider `mx-2 my-1.5` (`components/settings-menu.tsx:143`).

---

## Typography

**Declared for this phase's new surfaces: two sizes, two weights (400 regular, 600 semibold).
Every one is a role the Phase 11 contract already uses. This phase introduces no new size or
weight.**

| Role | Size | Weight | Line height | Usage in this phase |
|------|------|--------|-------------|-------|
| Control label | 14px (`text-sm`) | 400 | 1.43 (Tailwind v4 `text-sm`, 20px) | "Deck Skin — 1/8"" (through `SliderRow`), the sidebar's "Tip Style" label (hand-set to the same `text-sm text-surf-ink-muted font-normal`, `slider-row.tsx:74`), and the dialog's new row labels "Deck Skin", "Planer Max Depth", "Tip Style" (`text-sm text-surf-ink`, `fit-defaults-dialog.tsx:137`) |
| Meta | 12px (`text-xs`) | 400 | 1.33 (Tailwind v4 `text-xs`, 16px) | The Deck Skin hint, the passes line's label and its "At 1/8" a pass" hint, the Tip Style hint, the dialog's new hints, the rewritten list intro, the F4 body and the E2/E3 bodies |
| Meta emphasis | 12px (`text-xs`) | 600 (`font-semibold`) | 1.33 | The passes value ("3 passes"), `tabular-nums`, which is the readouts grid's value treatment (`board-on-blank.tsx:64`) |

**Inherited roles these surfaces sit inside (documented, not declared, unchanged):**

| Role | Size / weight | Source |
|------|---------------|--------|
| Readouts header (`STATION`, `ROCKER`, now `OFF BOTTOM`) | 10px / 800, uppercase, `tracking-architectural` (0.15em) | `board-on-blank.tsx:63`, `app/globals.css:595` |
| Readouts value | 12px / 600, `tabular-nums`, right-aligned | `board-on-blank.tsx:64` |
| TwoOptionToggle pill label ("Pin deck", "Bottom") | 11px / 700 | `two-option-toggle.tsx:31` |
| Datasheet group label (`FOAM OFF`, like `YOUR BOARD`) | 10px / 800, uppercase, `tracking-architectural` | `rocker-datasheet.tsx:111` |
| Datasheet row label and cells | 14px / 400 | `rocker-datasheet.tsx:82,99` |
| Dialog group label | 10px / 700, uppercase, `tracking-architectural` | `fit-defaults-dialog.tsx:43` |
| Menu row label / detail | 14px / 400 · 11px / 400 | `settings-menu.tsx:154-155` |
| Section heading | 12px / 800, uppercase, `tracking-architectural` | `rocker-controls.tsx:98` |
| Typed field text | 14px, 16px under `coarse:` | `measure-field.tsx:109-110` |

---

## Color

**No new hue and no new token.** Every surface in this phase uses tokens already in
`app/globals.css`.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-sidebar` (the controls column) and `--surf-panel` (the dialog, the viewer and datasheet card) | Every new row sits on one of these |
| Secondary (30%) | `--surf-line-faint` (the passes line's top rule); `--outline-foam-shade` (both foam bands in the drawing); `--surf-board-fill` (the board wash, unchanged) | Grouping lines and the drawing's filled areas |
| Accent (10%) | `--surf-accent` (fill) with `--surf-on-accent` (text), and `--surf-accent-ink` (text, stroke, ring) | Only the uses listed below |
| Warning (a fit note, not destructive) | `--surf-warning-ink` | See "Where warning goes". **This phase has no destructive action.** |

**Accent reserved for (the Phase 11 list, items 1–5, plus one addition):**

1. Every slider's range fill and thumb, `.slider-accent`. This now includes Deck Skin.
2. The picked blank row's 2px bar and check (unchanged).
3. The sidebar and dialog text-link actions (unchanged set; Restore Defaults now also restores
   the three new settings).
4. Focus rings: `.focus-ring-accent` (`app/globals.css:910-914`). This phase adds it to
   TwoOptionToggle's pills (§4).
5. The toolbar's measuring-points toggle when pressed (unchanged).
6. **New: the selected Tip Style pill**, as `border-surf-on-accent bg-surf-accent text-surf-on-accent`
   (`two-option-toggle.tsx:32`), in the sidebar and in the dialog. The unselected pill is
   `border-surf-line bg-surf-sidebar text-surf-ink`. This is the same pair FINS and RAILS already
   draw, so no new colour pair is introduced.

**Not accent:** the passes value is `text-surf-ink`, never accent, because it is a reading, not a
control. Both foam bands are the muted `--outline-foam-shade`, never accent. The `OFF BOTTOM` column
is ink, and warning ink only when negative.

**Where warning goes, exactly** (same rules as the Phase 11 contract, applied to the split):

- An `OFF BOTTOM` readout below zero (`text-surf-warning-ink`, with its minus sign). This means the
  board would drop below the blank's bottom there.
- A datasheet **Bottom** cell below zero (same treatment as the retired Foam Off cell,
  `rocker-datasheet.tsx:249-254`).
- The F4 flag, whose body changes (Copywriting).
- The **Deck** row can never go negative, because the skin is always at least 1/16" (§6 bounds),
  so it never takes warning.
- The passes value never takes warning. When the center gap is zero or negative it reads
  `0 passes` in `text-surf-ink-muted`, and the `OFF BOTTOM` cell above it carries the warning.

**Legibility:** every new pair is one the Phase 11 contract already measured, so nothing new needs
checking:
- ink / ink-muted / warning-ink on panel and sidebar: the Phase 11 contract's table;
- `--surf-on-accent` on `--surf-accent`: FINS/RAILS's existing pill;
- `--outline-foam-shade` on panel: 1.42:1 in Daylight, a visible wash as before.

The bottom band is the same shade, with the same 2px `--outline-ink` board edge separating it from
the board, as the deck band the Phase 11 contract already measured.

---

## Copywriting Contract

**Formatters, one per quantity:**

- **Marks** (`formatMark`, `lib/geometry/measure-display.ts:81`): every number in this phase that
  a shaper cuts to — Deck Skin, Planer Max Depth, the tips, every foam-off depth, every shortfall,
  every setting quoted in a sentence. That is 1/16" in Imperial and whole mm in Metric.
- Inside the DATASHEET table the same quantities read through `formatMarkBare`
  (`measure-display.ts:86`). This is the bare twin of the same formatter: the same digits, with the
  unit in the row label in Metric (`columnUnitSuffix`, `:197`). It is the table rule the Phase 11
  contract already follows.
- **Passes** read through one new pure formatter pair in `measure-display.ts`: `planerPasses(depth,
  passDepth, system): number` and `formatPasses(n)`. `formatPasses` returns `1 pass` or
  `{n} passes`, including `0 passes`.
- **Pass-count rule** `(Claude's discretion — founder may overrule)`: the count is
  `ceil(printed depth ÷ printed pass depth)`. Both numbers are taken on the chosen system's grid
  (1/16" or 1 mm), with the usual 1e-9 nudge, so a shaper who divides the two numbers on the screen
  by hand always gets the count the screen shows.
  - Why printed rather than stored: counting the stored millimetres would let `3/8"` at `1/8"` a
    pass read "4 passes" whenever the true depth is 0.38", and a shaper's trust in the sheet breaks
    on exactly that.
  - The known consequence: the same board can show a count one different in Imperial and in
    Metric, because each is honest to its own printed numbers. No stored value is touched either
    way (CLAUDE.md Rule 2).

**The reference case for the examples** is the Phase 11 contract's own: Marko 6'0" M-Regular,
2 15/16" / 74 mm at the center, with a 2 1/2" / 64 mm Center Thickness, the default 1/8" / 3 mm
Deck Skin and the default 1/8" / 3 mm Planer Max Depth. The foam off the bottom at the center is
2.92 − 0.125 − 2.5 = 0.295", which prints `5/16"` and counts `3 passes` (5/16 ÷ 1/8 = 2.5, rounded
up). In Metric it is 74.17 − 3.18 − 63.5 = 7.49 mm, which prints `7 mm` and counts `3 passes`
(7 ÷ 3 = 2.33, rounded up). *(Corrected 2026-09-26 after the planning research; an earlier draft rounded 1/8" to 3.2 mm and printed 8 mm.)* The planner renders live values; these examples are illustrative.

### Headline elements (template rows)

| Element | Copy |
|---------|------|
| Primary CTA | None new. The phase's actions are value changes (a slider, a typed field, a two-option toggle). The primary CTA remains the Phase 11 contract's **Switch to This Blank**. |
| Empty state heading | Unchanged, **No blank is thick enough** (E2) / **No blank passes both rules** (E3). Only their bodies change (below). |
| Empty state body | E2 and E3 below: each names the board's number, the catalog's best, the deck skin and the bottom pass, and the way out, with **Change Fit Rules** |
| Error state | Unchanged. **The blank catalog didn't load.** / "Your board is fine — the blank you picked travels with it. Reload the page to see the list again." (Phase 11 E4). The only new failure is a typed value that can't be read. It shows `MeasureField`'s existing lines verbatim: "Couldn't read '{typed}' as inches — try a number, a fraction like 2 5/8, or feet and inches like 6'2." / "Couldn't read '{typed}' as millimetres — try a whole number like 67, or centimetres like 6.7 cm." (`measure-display.ts:289,296`) |
| Destructive confirmation | **None this phase.** See "Why nothing here asks first" |

### Sidebar: BOARD ON BLANK (blank picked)

| Element | Imperial | Metric |
|---------|----------|--------|
| Placement (unchanged) | Placement — centered | same |
| **Deck Skin** row label | Deck Skin — 1/8" | Deck Skin — 3 mm |
| Deck Skin hint (left hint), Tip Style = Pin deck | Off the deck at every station | same |
| Deck Skin hint (left hint), Tip Style = Bottom | Off the deck — more at the tips | same |
| Readouts headers (third changes) | **STATION** · **ROCKER** · **OFF BOTTOM** | same |
| Readouts rows (nose to tail; the rocker column is unchanged in form) | Nose Tip · Nose @ 12" · Center · Tail @ 12" · Tail Tip, each with its rocker and its foam off the bottom, e.g. Center `0"` · `5/16"` | Nose Tip · Nose @ 30.5 cm · Center · Tail @ 30.5 cm · Tail Tip, e.g. Center `0 mm` · `7 mm` |
| **Passes line**, label (Meta, muted) | Planer passes at the center | same |
| Passes line, value (Meta emphasis) | 3 passes (1 → `1 pass`; zero or less → `0 passes`, muted) | 3 passes |
| Passes hint (Meta, muted) | At 1/8" a pass — your Planer Max Depth. | At 3 mm a pass — your Planer Max Depth. |

### Sidebar: THICKNESS (blank picked)

| Element | Imperial | Metric |
|---------|----------|--------|
| Intro (replaces `rocker-controls.tsx:307`) | Deck and bottom follow your blank's; the tips are thinned in the last 12". Set the tips, and fine-tune the 12" stations if you need to. | …thinned in the last 30.5 cm. Set the tips, and fine-tune the 30.5 cm stations if you need to. |
| Tip rows, 12" fine-tune rows, their hints, ↺ Reset Fine-Tune | Unchanged copy (`rocker-controls.tsx:150-157,376`). "From blank {value}" now reads the new derivation (blank − skin − gap at the 12" station). | same |
| **Fine-tune off** label (D-13) | Fine-tune off | same |
| Fine-tune off options | **Deck** · **Bottom** | same |
| Fine-tune off hint, Deck selected | Tweaks add or take foam on the deck; the rocker stays the blank's. | same |
| Fine-tune off hint, Bottom selected | Tweaks move the bottom, so the rocker re-levels and its numbers can shift. | same |
| **Tip Style** label | Tip Style | same |
| Tip Style options | **Pin deck** · **Bottom** | same |
| Tip Style hint, Pin deck selected | The deck stays put and the extra comes off the bottom, so the tip rocker grows — or falls, if the tip needs more foam than the cut leaves. | same |
| Tip Style hint, Bottom selected | The bottom stays put and the extra comes off the deck, so the rocker stays the blank's own. | same |

`Tip Style` as the name `(Claude's discretion — founder may overrule)`: the founder's two options
name the surface that is **kept**. "Pin deck" keeps the deck and takes the extra off the bottom;
"Bottom" keeps the bottom and takes it off the deck (SPEC R4 and its acceptance criteria). A label
such as "Tip Thinning: Bottom" would read as "thin the bottom", which is the opposite of what the
option does. So the label stays neutral, and the one-sentence hint under the pills always says where
the foam comes off.

### The blank list, the flag and the empty states (new center floor, D-10)

The skin these sentences quote is the one the verdicts use. That is the board's own Deck Skin; a
board with no blank uses the live account default. Every sentence names the number actually used,
so the words and the verdicts can never disagree. All of these live in `lib/geometry/blank-reasons.ts`
(D-10's "Claude's discretion: the wording").

| Element | Imperial | Metric |
|---------|----------|--------|
| List intro (replaces `listIntro`, `blank-reasons.ts:207-216`) | Shortest first. Each is at least 2" longer than your board, with room at the center for a 1/8" deck skin and a 1/8" bottom pass. Greyed blanks don't fit somewhere — the line under each says where. | …at least 51 mm longer than your board, with room at the center for a 3 mm deck skin and a 3 mm bottom pass. … |
| F4 body, too thin at the center (replaces the `"center"` branch of `floorShortfallMessage`, `blank-reasons.ts:162`) | It's 1/16" too thin at the center — there isn't room for your 1/8" deck skin and a 1/8" bottom pass. | It's 2 mm too thin at the center — there isn't room for your 3 mm deck skin and a 3 mm bottom pass. |
| F4 shortfall under one step | It's under 1/16" too thin at the center — … | It's under 1 mm too thin at the center — … |
| E2 body (heading unchanged: **No blank is thick enough**) | Your center is 4 3/4" and the thickest blank is 4 7/8" at the center, so none leaves room for a 1/8" deck skin and a 1/8" bottom pass. Try a thinner center, or change your Deck Skin or Planer Max Depth. | Your center is 121 mm and the thickest blank is 124 mm at the center, so none leaves room for a 3 mm deck skin and a 3 mm bottom pass. … |
| E3 body (heading unchanged: **No blank passes both rules**) | Nothing in the three catalogs is both 2" longer than your board and thick enough at the center for a 1/8" deck skin and a 1/8" bottom pass. | …both 51 mm longer than your board and thick enough at the center for a 3 mm deck skin and a 3 mm bottom pass. |
| Greyed-row reasons, F1, F2, F3, E1, E4, E5, the offer line | Unchanged grammar and copy (`{amount} too thin {where}` / `{amount} too wide {where}`, `blank-reasons.ts:92-99`). "Too thin" now means the board's bottom would drop below the blank's bottom there, including at a thinned tip (D-09). | same |

### Viewer and DATASHEET

| Element | Copy |
|---------|------|
| Drawing's accessible name, blank picked (replaces `components/rocker/rocker-viewer.tsx:703`) | Side profile of the board inside the {vendor} {name} blank, with the foam to come off the deck and the bottom shaded |
| DATASHEET group label (new, after YOUR BOARD) | **FOAM OFF** |
| DATASHEET rows under it | **Deck** · **Bottom** (in Metric `Deck (mm)` · `Bottom (mm)` via `columnUnitSuffix("mark")`) |
| DATASHEET intro, footnote, catalog notes, station headers, the other rows | Unchanged (`rocker-datasheet.tsx:195-198,291-299`) |

### Gear menu and the Fit & Tip Defaults dialog

| Element | Imperial | Metric |
|---------|----------|--------|
| Menu row label (unchanged) | **Fit & Tip Defaults** | same |
| Menu row detail (replaces `settings-menu.tsx:155`) | Spare foam, planer, skin and tips | same |
| Dialog title (unchanged) | **Fit & Tip Defaults** | same |
| Dialog description (replaces `fit-defaults-dialog.tsx:116-119`) | Which blanks count as a fit, how deep your planer cuts, and what every new board starts with. | same |
| Group 1 label (unchanged) | **WHICH BLANKS FIT** | same |
| Extra Length (unchanged) | Extra Length `[2"]` — A blank must be at least this much longer than your board. | `[51 mm]` |
| **Planer Max Depth** (in Extra Center Thickness's old place) | Planer Max Depth `[1/8"]` — How deep your planer cuts in one pass. Passes are counted at this depth, and a blank must leave room for at least one off the bottom at the center. | `[3 mm]` |
| Width Margin (unchanged) | Width Margin `[1"]` — … | `[25 mm]` |
| Group 2 label (unchanged) | **NEW BOARDS START WITH** | same |
| Group 2 hint (replaces `fit-defaults-dialog.tsx:74`) | Boards you've already started keep their own. | same |
| **Deck Skin** (first row of group 2) | Deck Skin `[1/8"]` — Taken off the blank's deck, the same at every station. | `[3 mm]` |
| Nose Tip Thickness / Tail Tip Thickness (unchanged) | `[5/16"]` / `[1/4"]` | `[8 mm]` / `[6 mm]` |
| **Tip Style** (last row of group 2) | Tip Style `[Pin deck | Bottom]` — Pin deck takes the tips' extra off the bottom; Bottom takes it off the deck. | same |
| Footer (unchanged) | **Restore Defaults** · **Done** | same |
| Retired | the **Extra Center Thickness** row and its hint (`fit-defaults-dialog.tsx:55-58`) | same |

### Why nothing here asks first

- **Deck Skin, Tip Style**: board edits, each one undo step on the app's Cmd/Ctrl+Z and the
  phone's `PhoneUndoBar`, like every slider. Neither ever clears the picked blank.
- **Restore Defaults**: resets all seven settings (the five numbers plus the new Tip Style default)
  to "not chosen". It changes settings only, and no board that keeps its own values moves (D-01,
  D-04).
- **↺ Reset Fine-Tune** on an older board clears the two tweaks that kept its saved 12" numbers
  (D-07). Undo brings them back.

---

## Already done — read this before planning

Confirmed 2026-09-26 by reading the files. Where this corrects CONTEXT.md or the orchestrator's
brief, this section is the one to trust.

- **The drawing already paints both bands with no paint change.** The blank silhouette is filled
  `var(--outline-foam-shade)` and outlined `var(--outline-blank-line)`, and the board paints over it
  opaquely (`rocker-viewer.tsx:745-763`). Once the derivation puts the board's bottom above the
  blank's bottom, the band under the board appears by itself. **Plan no viewer paint work.** What
  does go stale is the doc comment's "never under the bottom, because along the board the blank's
  bottom IS the board's bottom" (`rocker-viewer.tsx:26-27`) and the accessible name at `:703`.
  Update both.
- **The readouts grid is `board-on-blank.tsx:121-140`**, with headers at `:122-124` and the foam
  column read from `view.foamOff` at `:127`. That field is the blank-minus-board total
  (`lib/geometry/board-profile.ts:60,168`), which this phase splits into deck and bottom. Keep the
  `data-readouts` / `data-readout-row` hooks and exactly five rows. Five e2e assertions depend on
  them: `e2e/desktop-regression.spec.ts:128,162`, `e2e/touch-drag.spec.ts:781,806`, and
  `e2e/rocker-blanks.spec.ts:166-187,292`.
- **The DATASHEET's Foam Off row is `rocker-datasheet.tsx:244-260`** (with the "prints as zero
  reads as zero" regex at `:249`). Two e2e specs find it by `/^Foam Off/`: `e2e/rocker-blanks.spec.ts:251`
  and `e2e/phone-rails.spec.ts:647`. Both move to the new `FOAM OFF` group label and its rows.
- **`TwoOptionToggle` has no `aria-pressed`, no `focus-ring-accent` and no `coarse:min-h-11`**
  (`two-option-toggle.tsx:27-36`). FINS's `PillButton`, which it was copied from, has the last two
  (`components/fins/fin-controls.tsx:118`). Its source-contract test pins three class substrings
  (`components/viewer/two-option-toggle.test.ts:11-13`). Adding classes before and after the
  contiguous base string keeps that test green (§4).
- **Every fit default today is a millimetre value.** `FitDefaultsKey` / `FitDefaultsPreference`
  are `Mm`-only (`lib/fit-defaults-preference.ts:29-49`), and the dialog renders every key as a
  `MeasureField` (`fit-defaults-dialog.tsx:129-153`). Tip Style is the first setting that is not a
  number, so it needs its own row kind in the dialog and its own allow-list parse (`'pinDeck' |
  'bottom'`, `null` = not chosen = Pin deck). The planner owns the storage shape; this contract
  owns only how it looks and reads.
- **Extra Center Thickness is named in** `fit-defaults-dialog.tsx:55-58,70`,
  `lib/geometry/blank-reasons.ts:162,176,181,196,202,213`, `components/rocker/use-blank-list.ts:110-114`,
  `components/rocker/blank-flag.tsx:133,154-155,176-180,199` and `lib/fit-defaults-preference.ts:31,39,58,72,83,172`.
  Every UI string that quotes it is replaced by the Copywriting rows above.
- **The fine-tune slider reaches ±1/4"** (`rocker-controls.tsx:62`), but a saved offset may be up to
  ±50 mm (`lib/models/design-snapshot.ts:161`). D-07's migration can therefore store a residual
  beyond the slider's reach. See §10 for what the screen does then. The planner should measure the
  largest residual over the saved boards before committing to the range (open item).
- **Formatters that exist:** `formatMark`, `formatMarkBare`, `formatSignedMark`, `stationLabel`,
  `columnUnitSuffix`, `measureSlider`, `typedFieldBounds` (`measure-display.ts:81-197,234-285`).
  **Ones that do not exist yet:** `planerPasses` and `formatPasses` (Copywriting). They are pure,
  go in `measure-display.ts`, and are unit-tested in both systems, including the printed-grid rule
  and the 1 / many / 0 plurals.
- **Touch sizing already carried by shared components, so plan no work for these:** the slider
  thumb's 44px ring (`coarse:after:-inset-4`, `components/ui/slider.tsx:120`); `MeasureField`'s
  `coarse:h-11 coarse:text-base` (`measure-field.tsx:109-110`); `Button`'s `coarse:h-11`
  (`components/ui/button.tsx:26`); the menu row's `coarse:min-h-11` (`settings-menu.tsx:151`).
- **Desktop baselines:** the ROCKER baseline shoots the default board, which has no blank
  (`e2e/desktop-baseline.spec.ts:72-80`, Phase 11 D-02), so the only pixel that moves there is the
  list intro's wording. Re-record it once, deliberately. The default board's foil is hand-set, so
  its litres and the VOLUME baseline do not move. TEMPLATE, RAILS, FINS and VOLUME baselines must
  stay identical.

---

## Interaction & Layout Contract

### What triggers what

Nothing new. The three switches are inherited exactly as CLAUDE.md states them:

- **Width** picks the layout: `max-shell:` below 820px, `shell:` at or above (`app/globals.css:128-138`).
  `shell:` is the min-width (desktop) side; `max-shell:` is the phone side.
- **Pointer** picks a control's size: `coarse:` (`app/globals.css:77`).
- **Height** picks whether a short screen scrolls: inline `[@media(max-height:500px)]`.

Every touch size below is `coarse:`. No new rule reads width or height.

### What draws the eye first

- **Screen focal point, both layouts: the drawing** (unchanged from the Phase 11 contract). The
  board's 2px `--outline-ink` profile sits between two faint shaded bands of foam, deck above and
  bottom below, inside the 1px blank line.
- **BOARD ON BLANK section:** the **passes value** ("3 passes"). It is the only line in the section
  set off by its own rule, and the only semibold figure with a word attached. It answers the
  founder's question, "how many planer passes", at a glance, with the per-station depths in the
  grid directly above it.
- **THICKNESS section:** unchanged, the four tip and 12" sliders. **Tip Style is deliberately
  quiet** ("those who want it will find it"). It comes last, below ↺ Reset Fine-Tune, and its
  accent fill is one small 11px pill.
- **Dialog:** the title, then the typed values in their boxes. The new rows take the existing row
  anatomy, and nothing in the dialog is louder than a field.
- **DATASHEET:** the YOUR BOARD block stays the focal block. The new FOAM OFF block reads after it,
  in muted read-only ink, and draws attention only when a Bottom cell turns warning.
- **Every icon carries words.** This phase adds no icon and no icon-only control.

### The sidebar, top to bottom (delta on the Phase 11 contract's table)

| # | Blank picked | No blank (fallback) |
|---|--------------|---------------------|
| 0–2 | Unchanged (title, CENTER THICKNESS, BLANK). The list intro's wording changes. | Unchanged; the list intro's wording changes |
| 3 | BOARD ON BLANK — Placement, **Deck Skin**, readouts (STATION · ROCKER · **OFF BOTTOM**), **passes line** and its hint | BOARD ON BLANK — the Placement slider disabled, nothing else (unchanged) |
| 4 | — | ROCKER — four hand-set sliders (unchanged) |
| 5 | THICKNESS — new intro, Nose Tip, Nose @ 12" (fine-tune), Tail @ 12" (fine-tune), Tail Tip, ↺ Reset Fine-Tune, **Tip Style** | THICKNESS — unchanged (absolute sliders, "Hand-set until you pick a blank.") |

### 1. Deck Skin (D-01, D-02, SPEC R1)

- **Where:** in BOARD ON BLANK, directly under Placement, `gap-3.5` below it. The placement slider
  sets where the board sits along the blank; the skin sets how far below the blank's deck it sits.
  Together they are "the board on the blank" `(Claude's discretion — founder may overrule)`.
- **Control:** a plain `SliderRow`.
  - Label: `Deck Skin — {formatMark(skin)}`.
  - `leftHint`: "Off the deck at every station" (Pin deck) or "Off the deck — more at the tips"
    (Bottom).
  - No `rightHint`, no `note`.
- **Range:** 1/16"–1/2" in 1/16" steps; Metric 2–12 mm in 1 mm steps (through `measureSlider`,
  whose `metricSliderRange` rounds each end inward). This is **one range constant shared with the
  dialog's Deck Skin field** (`FIT_DEFAULTS_RANGE_IN`, `lib/fit-defaults-preference.ts:70-76`), so
  the two can never disagree.
- **Why the range starts at 1/16":** the founder's floor is "one on deck and one on bottom as a
  minimum" (D-10), and a skin of zero would take nothing off the deck. The top of 1/2" is about four
  passes `(Claude's discretion — founder may overrule)`.
- **Value:** stored on the board. A new board follows the live account default until first edited
  or saved (D-01, the D-19 rule). Picking a blank counts as an edit. Switching to another blank keeps
  the board's skin, the same rule as the fine-tunes (Phase 11 D-11).
- **What a change does:** the board's deck lowers or rises by that amount at every station, the
  foam off the bottom shrinks or grows by the same amount, and the passes line updates. The list
  re-judges its verdicts (the skin is part of the center floor, D-10), the same way Center Thickness
  already makes it do. The picked blank's flag is re-checked. **It never clears the pick.** Each
  drag records undo history the way every slider does.
- **Longest label:** `Deck Skin — 12 mm` measures 130.8px at 14px, well inside 260px. The longer
  hint, "Off the deck — more at the tips", measures 177.2px at 12px, so it fits on one line.

### 2. The live readouts: OFF BOTTOM (D-03, D-06)

- The grid stays three columns, `grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1` (only the column
  gap changes; see Spacing). The third header changes from `FOAM OFF` to `OFF BOTTOM`.
- **ROCKER column:** unchanged in form. Its values are the board's own rocker, so under Pin deck the
  two tip rows include the lift (D-06). Center reads `0"` / `0 mm` in muted ink (unchanged).
- **OFF BOTTOM column:** the foam off the bottom at each of the five stations. That is the center
  gap everywhere, plus the tip thinning at the two tips under Pin deck. Values are `formatMark`,
  right-aligned, `tabular-nums`, `text-surf-ink`. A value that prints as zero reads as an unsigned
  zero (the existing `markOrZero`, `board-on-blank.tsx:55-60`). A value below zero reads in warning
  ink with its minus sign.
- **Why the sidebar shows the bottom and not the deck** `(Claude's discretion — founder may overrule)`:
  1. A fourth DECK column does not fit. Measured, `Nose @ 30.5 cm` + ROCKER + DECK + BOTTOM needs
     262–291px against the 260px desktop floor, so it would wrap the station names.
  2. The deck needs no column. The foam off the deck is the Deck Skin value itself, printed in the
     label directly above the grid, and it is the same at every station under Pin deck.
  3. Under Bottom, the tips' extra deck foam is said by the Deck Skin hint ("more at the tips") and
     shown per station on the DATASHEET's **Deck** row (§7).
  4. The bottom is the number that moves when the board slides and the one the passes are counted
     from, so it is the one worth a live column.
- Width at the 260px floor, measured: `Nose @ 30.5 cm` 93.7 + `ROCKER` 50.9 + `OFF BOTTOM` 81.0 +
  2 × 12 = **249.6px**.

### 3. The planer-passes figure (D-03, "Claude's discretion: where the foam-off-bottom figure sits")

- **Where:** directly under the readouts grid, inside BOARD ON BLANK, blank picked only. Its depth
  is the grid's Center / OFF BOTTOM cell directly above it. This line adds the passes and does not
  repeat the depth, so the one number is never printed twice in the sidebar.
- **Shape:**
  - Line: `data-bottom-passes`, `mt-2 flex items-baseline justify-between gap-2 border-t border-surf-line-faint pt-2`.
  - Left: "Planer passes at the center" (Meta, `text-surf-ink-muted`).
  - Right: `formatPasses(planerPasses(centerGap, planerMaxDepth, system))` (Meta emphasis,
    `text-surf-ink`, `tabular-nums`). `0 passes` reads in `text-surf-ink-muted`.
  - Under it, `mt-0.5`: "At {formatMark(planerMaxDepth)} a pass — your Planer Max Depth." (Meta,
    muted). This names the setting that sets the count, so a shaper knows where to change it (the
    gear menu).
- **Live:** it updates on every Placement drag, Deck Skin drag and Center Thickness change. It never
  touches the network (Phase 11 R14): the count comes from the side profile the store already holds.
- **Width, measured:** "Planer passes at the center" 154.6 + 8 + `12 passes` 60.1 = 222.7px. The
  hint `At 3 mm a pass — your Planer Max Depth.` is 239.2px. Both fit 260px on one line.
- **Not on the DATASHEET** `(Claude's discretion — founder may overrule)`. The count depends on the
  shaper's planer setting, not on the board. The DATASHEET is the board-and-blank sheet a shaper
  takes to the supplier. Showing the count once, in the sidebar, keeps it de-duplicated.

### 4. Tip Style (D-04, D-05, SPEC R4–R5)

- **Where:** last in THICKNESS, below ↺ Reset Fine-Tune, blank picked only, inside the section's
  existing `gap-3.5` column.
- **Shape:**
  - Label: "Tip Style" (`mb-2 text-sm text-surf-ink-muted font-normal`, the SliderRow label
    treatment).
  - Then a `TwoOptionToggle` with `options={["pinDeck", "bottom"]}` and `labels={["Pin deck", "Bottom"]}`,
    at the pills' natural width and left-aligned. It is not stretched: a small pair at the end of
    the section is the quiet placement the founder asked for.
  - Then the hint for the selected option (`mt-2`, Meta, muted).
- **TwoOptionToggle gains three accessibility additions and no visual change for a mouse:**
  - `aria-pressed={active}` on each button;
  - an optional `ariaLabel` prop that renders the wrapper as `role="group" aria-label={ariaLabel}`
    (here "Tip Style");
  - `focus-ring-accent` before and `coarse:min-h-11` after the existing class run. The new class
    string is `focus-ring-accent cursor-pointer rounded-md border px-1 py-2.5 text-[11px] font-bold
    coarse:min-h-11`, which keeps `two-option-toggle.test.ts`'s contiguous base string intact.
  - RAILS's Flat/Domed pills get the same additions. **That is the one change visible outside
    ROCKER:** on a touch pointer they grow to 44px, as FINS's pills already do. A mouse sees
    nothing new, since the focus ring shows only on keyboard focus (`app/globals.css:910`).
- **Value:** stored on the board. A new board takes the account default (Pin deck out of the box)
  and keeps its own once edited or saved (D-04, the D-19 rule). Switching blanks keeps it.
- **What a tap does:**
  - It re-derives the last 12" at each end, and nothing at or inside the 12" stations moves (SPEC
    R5, "Changing the pin choice … leaves every number at and inside the 12" stations unchanged").
  - Under Pin deck the tip rocker readouts rise and the OFF BOTTOM tips grow — or, when a tip setting
    is thicker than the parallel foil there (D-16), the bottom drops at that tip and its rocker falls;
    if it would drop below the blank's bottom the board reads as not fitting. Under Bottom the tip
    rocker returns to the blank's and the DATASHEET Deck tips grow, and a tip that needs more foam than
    the cut leaves reads as not fitting. The Deck Skin hint switches.
  - It re-checks the flag, and it is one undo step. Tapping the option that is already selected does
    nothing.

### 5. The THICKNESS section under the new model (D-05, D-07)

- The intro changes (Copywriting). The four rows, the fine-tune hints and ↺ Reset Fine-Tune keep
  their exact shape and copy (`rocker-controls.tsx:132-161,361-378`). "From blank {value}" now
  reports the 12" thickness derived the new way (blank thickness − skin − gap), and the label still
  shows the final value (derived + tweak).
- The tips stay absolute sliders over `FOIL_THICKNESS_RANGE_IN`. They are what the thinning eases
  to.

### 5a. Fine-tune off: Deck / Bottom (D-13 — added 2026-09-26 from the planning research)

- **What it is:** a per-board choice of which surface a 12" fine-tune moves, independent of Tip
  Style. Deck (default) adds or takes foam on the deck at that station, so the rocker never moves and
  a tweak larger than the skin is honestly flagged "too thin there". Bottom moves the bottom, so the
  bottom curve re-levels on its own low point and every rocker number can shift — the readouts and the
  DATASHEET show it as it happens (D-06), no extra copy.
- **Where:** in THICKNESS, directly under the two 12" fine-tune rows and above ↺ Reset Fine-Tune,
  blank picked only, so it sits with the rows it governs. Tip Style stays last (§4).
- **Shape:** the same anatomy as Tip Style — label "Fine-tune off" (Control label treatment), a
  `TwoOptionToggle` with `options={["deck", "bottom"]}` and `labels={["Deck", "Bottom"]}` at its
  natural width, `ariaLabel="Fine-tune off"`, then the selected option's one-line hint (Meta, muted).
  The pair is narrower than Tip Style's (`Deck` is shorter than `Pin deck`), so every width in §12 holds.
- **Value:** stored on the board with the blank (like the skin and the Tip Style); a new board starts
  on Deck; no account default this phase (founder's ruling — it can be added later). Switching blanks
  keeps it; Remove This Blank takes it away with the blank and one undo brings it back.
- **What a tap does:** re-derives both 12" stations' curves with the existing tweak amounts on the
  chosen surface; nothing else moves at or inside the stations except, under Bottom, the rocker
  numbers the re-levelling changes. One undo step; tapping the selected option does nothing.

### 6. The Fit & Tip Defaults dialog and the menu row (D-01, D-03, D-04, D-10)

- **Menu row:** same place, icon, label and classes (`settings-menu.tsx:143-157`). Only the detail
  line changes, to "Spare foam, planer, skin and tips". It measures 169.7px at 11px, inside the
  row's 202px text room in the `min-w-64` popup (256 − 12 popup padding − 16 row padding − 16 icon −
  10 gap). The phone gets it through `PhoneMenu` with no edit.
- **Rows, in order:**
  - WHICH BLANKS FIT: Extra Length, **Planer Max Depth**, Width Margin.
  - NEW BOARDS START WITH: **Deck Skin**, Nose Tip Thickness, Tail Tip Thickness, **Tip Style**.
- Planer Max Depth sits in Extra Center Thickness's old place because it is now half of the center
  floor (D-10). Deck Skin and Tip Style sit with the tips because, like the tips, they are what a
  new board starts with and what each board then keeps.
- **Number rows** (Planer Max Depth, Deck Skin): the existing row anatomy exactly
  (`fit-defaults-dialog.tsx:135-151`) — label (Control label) with its hint beneath (Meta, muted) on
  the left, and a standalone `MeasureField` (`family="mark"`, 96px box) on the right. They use the
  same `commitIfChanged` rule (`:94-97`), so tabbing past a field never turns "not chosen" into a
  chosen value.
- **Bounds** `(Claude's discretion — founder may overrule)`, through `measureSlider` +
  `typedFieldBounds` as every other row. Out-of-range values clamp silently.
  - Deck Skin: 1/16"–1/2" (Metric 2–12 mm), shared with the sidebar (§1).
  - Planer Max Depth: 1/16"–1/4" (Metric 2–6 mm). Zero is impossible because it divides the passes.
    1/4" is deeper than any hand planer a shaper is likely to own.
  - Defaults: both 1/8", which reads `3 mm` in Metric (D-02, D-03).
- **Tip Style row:** the same `flex items-start justify-between gap-4` row, with the label and its
  static hint on the left. On the right is the same `TwoOptionToggle` (with `ariaLabel="Tip Style"`)
  in place of a field.
  - A tap commits at once, like the Units rows.
  - Tapping the option already shown when nothing has been chosen stores nothing: it compares
    against the resolved value, the `commitIfChanged` idea.
  - Measured: the pair is 110.5px wide (45.9 + 38.6 of label, plus padding, borders and the 6px
    gap). That leaves a 169.5px label column on a 360-dot phone (296 − 110.5 − 16), and "Tip Style"
    is 58.3px. The hint wraps within the column.
- **Restore Defaults** returns all seven settings to "not chosen": each number reads its default
  again and Tip Style reads Pin deck.
- **Taller dialog:** seven rows instead of five. The existing `max-h-[calc(100dvh-2rem)]
  overflow-y-auto` (`fit-defaults-dialog.tsx:113`) already keeps Done reachable on a phone with the
  keyboard up. No layout change is needed.
- **Effect of a change:** takes effect at once (D-09's pattern). A change to the Deck Skin default
  moves an untouched board's skin, and so the list's verdicts behind the dialog (D-01). A change to
  Planer Max Depth moves the center floor and every passes count. A change to the Tip Style default
  moves only boards that have not yet been edited.

### 7. The DATASHEET: FOAM OFF block (D-06, "Claude's discretion: how Foam Off splits")

- **Blank picked — four blocks, ten rows:**
  1. `BLANK — {VENDOR} {NAME}`: Rocker, Thickness, Width (unchanged; the blank's own rocker stays
     in its column, D-06).
  2. `YOUR BOARD`: Rocker (the board's own, including the lift under Pin deck), Thickness, Width
     (unchanged in form).
  3. **`FOAM OFF`**: a new group label in the same `GroupLabel` treatment (`rocker-datasheet.tsx:109-115`).
  4. Under it, two read-only rows:
     - **Deck**: the skin, plus the tip thinning at the two tips under Bottom.
     - **Bottom** (the last row, with no bottom border, the way the fallback's last row drops its
       own): the gap, plus the lift at the two tips under Pin deck.
- Cells in both rows are `formatMarkBare`, `text-surf-ink-muted` (the read-only cell treatment,
  `:82`). A value that prints as zero reads as zero. A Bottom value below zero reads in
  `text-surf-warning-ink`, the retired Foam Off row's rule (`:249-254`), carried over unchanged.
- **The heavier `border-t-2` rule above the old Foam Off row retires.** The FOAM OFF group label now
  does that separating job, exactly as `YOUR BOARD` separates the blank's block from the board's.
- **Row labels:** "Deck" and "Bottom", with ` (mm)` in Metric. `Bottom (mm)` measures 85.9px, which
  fits the label column's ~90px at the 540px floor. On a phone the table keeps its sideways scroll,
  24px fade and sticky label column (`:205-206`, `:81`).
- **Example, Imperial, Pin deck** (illustrative; the planner renders live values):

  | | NOSE TIP | NOSE @ 12" | CENTER | TAIL @ 12" | TAIL TIP |
  |---|---|---|---|---|---|
  | Deck | 1/8" | 1/8" | 1/8" | 1/8" | 1/8" |
  | Bottom | 1 1/16" | 5/16" | 5/16" | 5/16" | 3/4" |

  Under Bottom, the Deck tips grow instead and the Bottom tips read the gap.
- **No blank:** unchanged, three typed rows, with no FOAM OFF block.

### 8. The blank list, the flag and the empty states (D-09, D-10, D-11)

- **What is listed:**
  - Only blanks passing both floors: length ≥ board + Extra Length (unchanged), and center ≥ target
    + skin + one Planer Max Depth (D-10).
  - Envelope failures stay greyed, with the one-line reason.
  - List order, the six-row cap, the search, the groups and every row's anatomy are unchanged (D-11).
- **Row meta line** `{vendor} · {length} · {center} center` is unchanged (`blank-reasons.ts:224-231`).
  The "new numbers on the rows" D-11 mentions are the greyed reasons re-derived under the new model.
  No new per-row figure is added `(Claude's discretion — founder may overrule)`: a per-row passes
  count would read against a skin the shaper may not have set yet.
- **The copy** is in the Copywriting table: the list intro, F4, E2 and E3. F1, F2, F3, F5, E1, E4,
  E5 and the offer are unchanged. **Change Fit Rules** still opens the dialog. That is where Planer
  Max Depth and the Deck Skin default live, so both ways out named by E2 are one tap away.
- **One pass at the placement (D-15):** the fit check also requires one Planer Max Depth of foam
  under the board's centre where it sits; a failure is Phase 11's F2 ("Doesn't fit at this placement",
  "{amount} too thin at the center"), no new sentence.
- **The foil runs out (D-18)** `(Claude's discretion — founder may overrule)`: a board that would be
  under 1/8" thick anywhere reads as not fitting, with its own reason line: "Less than 1/8" would be
  left {where} — this blank is too thick for a {center} center." (Metric: "Less than 3 mm …").
  Reachable only at centres of 1 1/2" or less.
- **What F4 means now:** it fires when a picked blank no longer leaves room for the skin plus one
  bottom pass at the center — for example after a thicker Center Thickness, a thicker Deck Skin or a
  deeper Planer Max Depth. The flag keeps the pick (Phase 11 D-08).

### 9. The drawing's two bands and the thinned tips (D-05, Phase 11 D-15)

- **Both bands use `--outline-foam-shade`** inside the blank's 1px `--outline-blank-line`. These are
  the existing tokens (`app/globals.css:755-756`) and the existing single paint step. No new token,
  no new path, no change to paint order (baseline → blank silhouette → board → rails).
  - The **deck band** is an even strip the thickness of the skin, parallel to the blank's deck.
    Under Bottom it widens over the last 12" toward each tip.
  - The **bottom band** is an even strip the thickness of the gap, parallel to the blank's bottom.
    Under Pin deck it widens over the last 12" toward each tip, as the bottom lifts.
  - Past each tip the blank's leftover foam stays shaded as before.
- **Why one shade for both** `(Claude's discretion — founder may overrule)`: both bands are the
  same thing, foam that comes off. They sit on opposite sides of the board's 2px ink outline, so
  they can never be confused with each other. The numbers that tell them apart live on the rails,
  the readouts and the DATASHEET. A second tone would be a new token for no new information.
- **The thinned tips** draw as the board's own outline easing, with no kink at the 12" station
  (D-05): the bottom curving up under Pin deck, the deck curving down under Bottom. Nothing marks
  the 12" station beyond the existing rails.
- **The dashed baseline** (the rocker's zero, `rocker-viewer.tsx:736-744`) still spans the board at
  its own low point. It now runs along the top edge of the bottom band at the center, under the
  translucent shade. That is expected, not a defect.
- Rails, cards vs readings, the measuring-points dots, the frame and the phone's 66dvh ceiling are
  all unchanged. The rocker rail's tip readings now include the lift under Pin deck, because they
  read the board's own rocker (D-06).

### 10. Older boards (D-07)

- **Carried-over boards may open flagged (D-14, the founder's ruling):** with the default skin, many
  Phase 11 boards no longer fit under the new floor and their tip rockers move under Pin deck. The
  existing flag and offer (F1/F2/F4) say so; nothing new is added.
- **No migration dialog, banner, toast or badge** (the Phase 11 contract §14 rule, kept). A board
  saved under Phase 11 opens with its five station numbers exactly as saved, its Deck Skin at the
  default, its Tip Style at the account default, and the curve between stations following the new
  model.
- **No extra hint for the carried-over tweaks** `(Claude's discretion — founder may overrule)`. The
  two 12" rows already say exactly what happened, in the words they always use: `Nose @ 12" — 1 3/8"`
  with `From blank 1 5/16"` · `Tweak +1/16"`. The saved number is the new derivation plus the tweak
  that keeps it. ↺ Reset Fine-Tune is live and undoable, and a tweak that rounds to zero reads
  `No tweak` as today.
- **A carried-over tweak beyond ±1/4"** (possible: the snapshot allows ±50 mm,
  `design-snapshot.ts:161`):
  - The label and the `Tweak` hint still read the true stored value, and the thumb sits at the end
    of its range. `measureSlider` never rewrites a value that nobody dragged (`measure-display.ts`,
    the `toMm` contract).
  - A drag replaces the tweak with an in-range one, and one undo step brings the saved one back.
  - **Open item for the planner:** measure the largest residual across the saved boards. If any
    exceed ±1/4", bring the range question to the founder before shipping.

### 11. No blank picked (D-12)

- **Hidden, not disabled:** the Deck Skin row, the OFF BOTTOM readouts (the whole grid is already
  absent, `board-on-blank.tsx:74-85`), the passes line, and Tip Style. The sidebar is exactly the
  Phase 11 fallback column. Nothing "pick a blank first" is added beyond the Placement slider's
  existing label.
- **Why hidden rather than disabled:** Placement is disabled because it is still the section's
  subject. The skin and the tip style have no meaning without a foil derived from a blank (D-12), and
  a column of greyed controls would suggest otherwise.
- **The list intro still quotes the skin and the pass**, because the center floor still uses them.
  That is the one place a shaper with no blank reads them. To try a different skin before choosing,
  a shaper can pick any row (greyed rows can be picked, per the Phase 11 contract §2), or change the
  default under **Change Fit Rules**.
- **Remove This Blank:** the Deck Skin and Tip Style rows disappear with the blank, and one undo
  brings back the blank, the placement, the fine-tunes, the skin and the style together.

### 12. Phone layout and touch sizes

The ROCKER screen stays on `DesignScreenShell`. Every new row lives in the scrolling controls column
(`max-shell:p-4`); the dialog is the existing one. Controls column widths: **328 / 343 / 358** at
360 / 375 / 390 phones, and **260–320** on the desktop sidebar. The desktop floor is the narrow case,
so every line below is sized to 260px (measured in the app's own Inter file):

| Line | Longest case | Width | Fits 260? |
|------|--------------|-------|-----------|
| Deck Skin label | `Deck Skin — 12 mm` (14px) | 130.8 | yes |
| Deck Skin hint | `Off the deck — more at the tips` (12px) | 177.2 | yes |
| Readouts grid | `Nose @ 30.5 cm` + ROCKER + OFF BOTTOM + 2 × 12 | 249.6 | yes |
| Passes line | `Planer passes at the center` + 8 + `12 passes` | 222.7 | yes |
| Passes hint | `At 3 mm a pass — your Planer Max Depth.` | 239.2 | yes |
| Tip Style pair | `Pin deck` + `Bottom` pills + gap | 110.5 | yes |
| Tip Style hint | the Pin deck sentence (12px) | 409.0 | wraps to two lines, allowed (running text) |
| List intro / F4 body | running text | 702 / 543 | wrap (as today); nothing truncates |

Touch sizes, all using the existing `coarse:` idiom:

| Control | Touch size | How |
|---------|------------|-----|
| Deck Skin thumb | 44 × 44 | already there (`slider.tsx:120`) |
| Tip Style pills (sidebar and dialog) | 44px tall | `coarse:min-h-11`, added to `TwoOptionToggle` (§4) |
| Dialog Deck Skin / Planer Max Depth fields | 44px tall, 16px text | already there (`measure-field.tsx:109-110`) |
| Menu row | ≥ 44px | already there (`settings-menu.tsx:151`) |

The DATASHEET gains one row and one group label. It already scrolls vertically inside its card
(`rocker-datasheet.tsx:194`) and sideways inside its box, so a phone needs no new rule. Nothing new
reads height.

**Tests this contract implies** (the planner writes them):

- **Unit tests:**
  - `planerPasses` / `formatPasses` in both systems: the printed-grid rule, `1 pass`, `0 passes`,
    and a depth that rounds.
  - The new `blank-reasons.ts` sentences in both systems.
- **Source-contract test:** `two-option-toggle.test.ts` also asserts `aria-pressed`,
  `focus-ring-accent` and `coarse:min-h-11`.
- **e2e — ROCKER sidebar:**
  - A picked blank shows the Deck Skin row, the `OFF BOTTOM` header, `[data-bottom-passes]` and Tip
    Style.
  - The fallback shows none of them.
  - A Deck Skin drag changes the Center OFF BOTTOM cell and the passes value with zero network
    requests.
  - A Tip Style tap changes a tip rocker readout and leaves the Nose @ 12" and Tail @ 12" readouts
    unchanged.
- **e2e — DATASHEET:** `FOAM OFF` / `Deck` / `Bottom` replace `/^Foam Off/` in
  `rocker-blanks.spec.ts:251` and `phone-rails.spec.ts:647`.
- **e2e — defaults:** `fit-defaults.spec.ts` covers the three new settings and the retired Extra
  Center Thickness row.
- **e2e — touch sizing:** `/design/rocker`, already in the `touch-sizing.spec.ts:79` loop, checks
  the Tip Style pills at 44px.
- **Baselines:** the ROCKER desktop baseline is re-recorded once, for the list intro's wording
  only.

---

## UI Considerations

**65 considerations across 13 surfaces — 65 resolved, 0 open** (63 answered explicitly by this contract, 2 held out as a visual check).

Produced by `gsd-core/bin/lib/ui-consideration-probe.cjs` from the twelve surfaces the researcher
listed (E01–E12), with element kinds authored deliberately rather than inferred from prose (the
kinds are recorded under each heading). The founder was not at the keyboard for this step, so,
following the workflow's `--auto` convention, the orchestrator confirmed the kinds and resolved
every row as either **✅ covered** (this contract or the Phase 11 contract it extends answers the
question outright — lifted as a truth) or **🧪 backstop** (the state is reachable only by a board
this contract cannot see — held out as a visual check, lifted as `{ statement, verification:
backstop }`). **Nothing was dismissed** and nothing is left ⚠ unresolved; every row is a real answer
the founder can revisit and overrule. Empty- and error-state COPY is not restated here — the rows
point at the Copywriting Contract's E2/E3 and F4 entries and at Phase 11's E1/E4/E5 and F1–F5.

### Deck Skin control

_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | The slider is never empty: the board's skin always holds a value — the account default (1/8" / 3 mm) until first edited, then the board's own (D-01) — and the row is hidden altogether when no blank is picked (§11), so an empty state cannot occur. | ✅ covered |
| **Loading / in-flight** | No loading state: the skin is design-store state painted with the page, and the account default arrives through the same first-paint handoff the tips already use (Phase 11 D-09 / D-19), so the row never shows a placeholder. | ✅ covered |
| **Error / failure** | The slider cannot error: its value is bounded to 1/16"–1/2" (2–12 mm) by the range constant it shares with the dialog and clamps silently (§1); an unreadable typed value can only occur in the dialog, where MeasureField's existing 'Couldn't read…' line shows (Copywriting, Error state row). | ✅ covered |
| **Partial / incomplete** | A single slider has no partial state: either a new value committed or the previous one stands, and each drag is one undo step (§1). | ✅ covered |
| **Long text** | 'Deck Skin — 12 mm' measures 130.8px at 14px and the longer hint 'Off the deck — more at the tips' 177.2px at 12px, both inside the 260px desktop floor (§1, §12); the value is bounded, so no longer string exists. | ✅ covered |

### Readouts OFF BOTTOM column

_Kinds: static-content, list-collection_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | The readouts grid is absent without a blank (`board-on-blank.tsx:74-85`, §11) and always holds exactly five rows with one, so an empty OFF BOTTOM column cannot occur. | ✅ covered |
| **Loading / in-flight** | No loading state: every value comes from the side profile the store already holds and updates on each drag with no network request (Phase 11 R14; §3). | ✅ covered |
| **Error / failure** | The only failure a cell can show is a negative value — the board's bottom below the blank's there — which reads in warning ink with its minus sign (§2, Color); the flag beside the picked card (F1/F4) explains it. | ✅ covered |
| **Populated / happy path** | Five rows nose to tail under STATION · ROCKER · OFF BOTTOM; the Center cell reads the gap (e.g. 5/16" / 8 mm) and the two tip cells include the Pin deck lift (§2). | ✅ covered |
| **Partial / incomplete** | Never partial: the profile is sampled at all five stations by construction, and a value that prints as zero reads as an unsigned zero through the existing `markOrZero` (§2). | ✅ covered |
| **Overflow / truncation** | Measured at the 260px floor: `Nose @ 30.5 cm` + ROCKER + OFF BOTTOM + two 12px gaps = 249.6px with `gap-x-3`, so nothing wraps or clips; the grid keeps `grid-cols-[1fr_auto_auto]` (Spacing, §2). | ✅ covered |
| **Zero / one / many** | Always exactly five rows — the five stations — never zero or one; five e2e assertions pin the `data-readout-row` count (Already done). | ✅ covered |
| **Long text** | The longest cell is a bounded 1/16" fraction or whole-mm value and the longest station label `Nose @ 30.5 cm` is 93.7px (§2, §12); nothing wraps. | ✅ covered |

### Planer passes line

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | 'Planer passes at the center' + `12 passes` measures 222.7px and the hint 'At 3 mm a pass — your Planer Max Depth.' 239.2px, both on one line inside 260px (§3, §12); the count stays at two digits within the bounded skin, centre and pass ranges. | ✅ covered |
| **Long text** | Fixed strings plus one formatted mark and one count: `1 pass`, `{n} passes` or `0 passes` (muted) are the only forms `formatPasses` produces; no user text enters the line (Copywriting). | ✅ covered |

### Tip Style toggle (sidebar)

_Kinds: interactive-control, form_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Never empty: one pill is always selected — the board's own style, seeded from the account default (Pin deck out of the box, D-04) — and the control is hidden without a blank (§11). | ✅ covered |
| **Loading / in-flight** | No loading state: the style is store state, and the account default arrives with the first paint like the tips (D-19 handoff, §4). | ✅ covered |
| **Error / failure** | A tap cannot fail: it is a local state change and one undo step; tapping the option already selected does nothing (§4). | ✅ covered |
| **Partial / incomplete** | Two options with exactly one active (`aria-pressed`), no in-between state (§4). | ✅ covered |
| **Long text** | Pill labels are fixed ('Pin deck', 'Bottom'; the pair is 110.5px); the hint is running text that wraps to two lines at 12px (409px measured), which §12 allows. | ✅ covered |

### THICKNESS copy and carried-over fine-tunes

_Kinds: static-content, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | None: the rewritten intro and the 12" rows' 'From blank' / 'Tweak' hints are computed from the store on first paint (§5). | ✅ covered |
| **Error / failure** | Held out as a visual check on a saved board whose carried-over tweak exceeds the slider's ±1/4" reach: the label and the Tweak hint show the true stored value with the thumb at the end of its track, and a drag replaces it with an in-range value that one undo step reverts (§10). The planner measures the largest residual across saved boards before settling the range (open item). | 🧪 backstop |
| **Overflow / truncation** | The intro is running text that wraps as Phase 11's did; the hint pair `From blank 1 5/16"` · `Tweak +1/16"` is the existing SliderRow hint pair the Phase 11 contract sized for the 260px floor (§5). | ✅ covered |
| **Long text** | The longest hint value is a 1/16" fraction within FOIL_THICKNESS_RANGE_IN or a signed tweak; nothing longer can be typed or stored on the slider's grid. | ✅ covered |

### Dialog Deck Skin and Planer Max Depth fields

_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | A field is never blank: 'not chosen' renders the default (1/8" / 3 mm) exactly as Extra Length's row does today, and Restore Defaults returns it to not chosen (§6). | ✅ covered |
| **Loading / in-flight** | No loading state: the dialog opens on the provider's current values through the existing cookie + account handoff (Phase 11 D-09). | ✅ covered |
| **Error / failure** | An unreadable typed value shows MeasureField's existing error line verbatim (Copywriting, Error state row); out-of-range values clamp silently to 1/16"–1/2" (Deck Skin) and 1/16"–1/4" (Planer Max Depth) (§6). | ✅ covered |
| **Partial / incomplete** | Tabbing past a field without changing it stores nothing (`commitIfChanged`, `fit-defaults-dialog.tsx:94-97`), so an untouched field never turns 'not chosen' into a chosen value; a half-typed value that is abandoned leaves the previous value standing, as every other row in this dialog does. | ✅ covered |
| **Long text** | The 96px MeasureField box holds the longest bounded value; 'Planer Max Depth' is the longest label and its hint wraps within a 169.5px label column on a 360-dot phone (§6, §12). | ✅ covered |

### Dialog Tip Style default row

_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Never empty: with nothing chosen the pair shows Pin deck (null = not chosen = Pin deck), and Restore Defaults returns it there (§6). | ✅ covered |
| **Loading / in-flight** | None: the row opens on the provider's current value together with the rest of the dialog (§6). | ✅ covered |
| **Error / failure** | A tap commits at once like the Units rows and cannot fail locally; the account write is the existing patch-shaped save action that re-validates on the server, and a failed save leaves the browser's copy in place (Phase 11 D-09 pattern). | ✅ covered |
| **Partial / incomplete** | Tapping the option already shown when nothing has been chosen stores nothing (it compares against the resolved value, the `commitIfChanged` idea); exactly one pill is active (§6). | ✅ covered |
| **Long text** | Fixed labels: the pair is 110.5px, leaving a 169.5px label column on a 360-dot phone, and 'Tip Style' is 58.3px; the hint wraps within the column (§6). | ✅ covered |

### Gear menu Blanks row

_Kinds: nav, static-content_

| State | How it resolves | |
|---|---|---|
| **Loading / in-flight** | The row is static menu content; nothing loads (§6). | ✅ covered |
| **Error / failure** | No error state: tapping it opens the dialog and the row holds no state of its own (§6). | ✅ covered |
| **Overflow / truncation** | The new detail line 'Spare foam, planer, skin and tips' measures 169.7px at 11px inside the row's 202px text room in the `min-w-64` popup; the phone gets it through PhoneMenu unchanged (§6). | ✅ covered |
| **Long text** | Fixed copy with no user text; the label 'Fit & Tip Defaults' is unchanged (Copywriting). | ✅ covered |

### DATASHEET FOAM OFF block

_Kinds: list-collection, static-content_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Absent without a blank — the sheet shows its three typed rows and no FOAM OFF block (§7) — and always two rows of five cells with one. | ✅ covered |
| **Loading / in-flight** | None: the sheet reads the same side profile as the viewer on first paint (§7). | ✅ covered |
| **Error / failure** | A Bottom cell below zero reads in warning ink, the retired Foam Off rule carried over (`rocker-datasheet.tsx:249-254`); the Deck row can never go negative because the skin is at least 1/16" (Color). | ✅ covered |
| **Populated / happy path** | The FOAM OFF group label, then read-only Deck and Bottom rows at the five stations in `formatMarkBare` and muted ink — the example table in §7 (Deck 1/8" across; Bottom 1 1/16" · 5/16" · 5/16" · 5/16" · 3/4" under Pin deck). | ✅ covered |
| **Partial / incomplete** | Never partial: both rows have all five cells by construction, and a value that prints as zero reads as zero (§7). | ✅ covered |
| **Overflow / truncation** | `Bottom (mm)` (85.9px) fits the ~90px label column at the 540px floor; on a phone the table keeps its sideways scroll, 24px fade and sticky label column (§7, §12). | ✅ covered |
| **Zero / one / many** | Always two rows of five cells with a blank and none without — never a singular/plural question (§7). | ✅ covered |
| **Long text** | Cells are bounded marks and the labels are one word plus an optional unit suffix (§7). | ✅ covered |

### Blank list center-floor copy

_Kinds: list-collection, static-content_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | When nothing fits, the E2 / E3 empty states show with their re-worded bodies naming the deck skin and the bottom pass under unchanged headings, with Change Fit Rules as the way out (Copywriting; the E1 / E4 / E5 rows are unchanged from Phase 11). | ✅ covered |
| **Loading / in-flight** | Unchanged from the Phase 11 contract §2: the list streams in after the page and the intro appears with it; the new wording changes nothing about how it loads. | ✅ covered |
| **Error / failure** | The catalogue-failed-to-load state is unchanged (Phase 11 E4); F4 now fires when a picked blank no longer leaves room for the skin plus one bottom pass, and the flag keeps the pick (§8). | ✅ covered |
| **Populated / happy path** | The intro reads 'Shortest first. Each is at least 2" longer than your board, with room at the center for a 1/8" deck skin and a 1/8" bottom pass…', quoting the numbers the verdicts actually use; rows, greyed reasons and the six-row cap are unchanged in anatomy (§8). | ✅ covered |
| **Partial / incomplete** | Greyed rows carry their one-line reason and the row meta line is unchanged; with no blank picked the intro quotes the live account default skin, because that is what the floor uses (§11). | ✅ covered |
| **Overflow / truncation** | The intro and the F4 body are running text (702px / 543px) that wraps as today; nothing truncates (§12). | ✅ covered |
| **Zero / one / many** | Zero fitting blanks → E2 / E3 (or E1 / E5 unchanged); one or many → the list with its six-row cap and Show all (Phase 11 contract §2, unchanged by D-11). | ✅ covered |
| **Long text** | Every sentence quotes formatted marks only; the longest is the E2 body, which wraps (Copywriting). | ✅ covered |

### Drawing's two foam bands and thinned tips

_Kinds: media_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Without a blank the drawing shows the board alone with no bands (Phase 11 D-15 fallback); with a blank both bands exist by construction — the skin is at least 1/16" and the gap is non-negative whenever the blank fits (§9). | ✅ covered |
| **Loading / in-flight** | None: the SVG is painted with the page from store state; no image is fetched (§9). | ✅ covered |
| **Error / failure** | Held out as a visual check: when the board does not fit, the board's outline crosses outside the blank's 1px line where its bottom would drop below the blank's; the drawing adds no warning colour — the negative OFF BOTTOM cell and the flag carry it (§2, §8). | 🧪 backstop |
| **Populated / happy path** | A deck band above and a bottom band below the board, both `--outline-foam-shade` inside the 1px `--outline-blank-line`, widening over the last 12" on the side Tip Style takes the extra from; the dashed baseline runs along the top of the bottom band at the centre, which is expected (§9). | ✅ covered |

### No-blank sidebar

_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| **Overflow / truncation** | The fallback column is exactly the Phase 11 column with nothing added (§11), whose widths the Phase 11 contract measured (its §8 and §15). | ✅ covered |
| **Long text** | The only changed text without a blank is the list intro, running text that wraps; no new string appears in the fallback (§11). | ✅ covered |

### Fine-tune off toggle (Deck / Bottom)

_Kinds: interactive-control, form_

| State | How it resolves | |
|---|---|---|
| **Empty / no data** | Never empty: one pill is always selected — Deck by default, saved with the board on the blank — and the control is hidden without a blank (§5a, §11). | ✅ covered |
| **Loading / in-flight** | No loading state: store state painted with the page; nothing is fetched (§5a). | ✅ covered |
| **Error / failure** | A tap cannot fail: a local state change and one undo step; under Bottom the rocker re-levels and the readouts show the shift, which is the chosen behaviour, not an error (§5a, D-13). | ✅ covered |
| **Partial / incomplete** | Two options with exactly one active (`aria-pressed`); no in-between state (§5a). | ✅ covered |
| **Long text** | Fixed labels 'Deck' and 'Bottom', a narrower pair than Tip Style's 110.5px; the one-line hint wraps at 12px within the 260px floor as §12 allows. | ✅ covered |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none new this phase (`Button`, `Dialog`, `Slider`, `Input` already installed) | not required |

`components.json` declares `"registries": {}`. There is no third-party registry, so the vetting
gate has nothing to run on and is trivially satisfied.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-09-26 (gsd-ui-checker VERIFIED; UI Considerations populated by the Step 9.5 probe)
