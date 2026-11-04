---
phase: 16
slug: 3d-board-and-cnc-export
status: approved
reviewed_at: 2026-11-03
shadcn_initialized: true
preset: base-nova (components.json — baseColor neutral, cssVariables true, iconLibrary lucide, registries {})
created: 2026-11-03
---

# Phase 16 — UI Design Contract

> The visual and interaction contract for the **3D** screen, the seventh design screen, and for the nav, tile
> and Back/Next changes that turn six screens into seven. It takes three things as given and never re-asks them:
>
> 1. **`16-CONTEXT.md`** (D-01 to D-20, locked; D-20, the founder's ruling of 2026-11-03, adds one small RAILS
>    control, "Hard Edge Ends At", contracted in §17). Where CONTEXT left a choice to Claude, this contract makes it
>    and marks it `(Claude's discretion — founder may overrule)`.
> 2. **The sketch findings** (`.claude/skills/sketch-findings-shaper/`): the drawing grammar
>    (`references/drawing-and-callouts.md`), the phone's tiles and Back + Next (`references/phone-chrome.md`),
>    and the rack's turn and reduced motion (`references/board-rack.md`).
> 3. **The approved contracts before this one**: `15-UI-SPEC.md` (the Board Rack) and `14-UI-SPEC.md`. This one
>    follows their structure and their declared-vs-documented split for type and spacing, and refers to them
>    rather than restating what they settled.
>
> Every claim about existing code was read from the file on 2026-11-03 (branch `board-3d` at `b1c8148c`) and is
> cited `path:line`. Every width was measured in the app's own Inter in headless Chromium, against pages the
> founder's running dev server already serves (read-only page loads; nothing started, nothing written). Product
> strings use the product's own spelling; prose here is British.
>
> **The renderer is not this contract's call.** CONTEXT leaves the drawing library to research. This contract
> fixes what the drawing must *look* and *behave* like, and where it sits; any renderer that meets it is fine.
>
> **This phase adds no shadcn component, no icon and no spacing token.** It adds **two colour-contract tokens**,
> `--surf-foam` and `--surf-on-foam`, each assigned from a ramp value that already exists (§ Color), so there is
> no new hue. It adds one local surface with no precedent in the app: the **3D canvas** itself.
>
> **Plain English, for the founder:** a seventh screen, 3D, after SUMMARY. The board sits in a window in the
> drawing's place, white foam under shaping-bay lights, with a dark stringer down the middle. Drag it to turn it
> any way, scroll or pinch to zoom, right-drag or two fingers to slide it. The side panel has three tick boxes
> (Fins, Blank, Contour Stripes), five view buttons (Deck, Bottom, Side, Nose, Tail), Reset View, and Export for
> CNC…, which downloads one zip with a DXF, an STL and the text files Shape3D reads. On a phone it's the same
> screen stacked: the board on top, the panel underneath. And on RAILS, one new slider in the tail's Advanced menu
> while Hard Edge is on — **Hard Edge Ends At**, 14" to 24", 18" unless you move it — sets where the tail's hard
> edge fades into the tucked rail.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — `components.json`) |
| Preset | `base-nova`, baseColor `neutral`, cssVariables `true`, `"registries": {}` (read from `components.json` 2026-11-03; the shadcn gate is answered by the file, nothing asked) |
| Component library | Base UI (`@base-ui/react`) through shadcn's Base UI preset, not Radix |
| Icon library | lucide-react. **No new icon.** The toolbar reuses `PanelLeftCloseIcon` / `PanelLeftOpenIcon` (`components/outline/outline-editor.tsx:273`) and the zoom row's `ScanIcon`, `ZoomInIcon`, `ZoomOutIcon` (`components/viewer/zoom-viewport.tsx:549-606`). Step nav keeps `ArrowLeftIcon` / `ArrowRightIcon`. |
| Font | Inter (`--font-display` / `--font-body`, `app/globals.css:685-686`); tracking `--tracking-architectural` 0.15em (`app/globals.css:691`) |

**What the screen builds from, all of it existing:**

- **`DesignScreenShell`** (`components/design/design-screen-shell.tsx`), unchanged: controls aside, drawing column,
  Back/Next and footer inside the controls scroller (`:285-286`), `phonePinned="66dvh"` (`:59`).
- **`TabbedPanel`** (`components/viewer/tabbed-panel.tsx`) with one read-only tab, `compactOnPhone="drawing"` and
  `BoardNameTab` as `trailing` — the same three props ROCKER passes (`components/rocker/rocker-editor.tsx:316-318`).
- **`ViewerToolbar` / `ViewerToolbarButton`** (`components/viewer/toolbar-button.tsx:59`, `:105`, `:147`) for the
  corner row, and the zoom row's exact markup and words (`components/viewer/zoom-viewport.tsx:549-606`).
- **Sidebar idioms:** the panel title block (`components/fins/fin-controls.tsx:284-287`), the ruled section heading
  (`components/fins/fin-controls.tsx:96`, the same string as `components/rails/rail-controls.tsx:87`), the
  `Checkbox` label row (`components/rails/rail-controls.tsx:316`), `buttonVariants({ variant: "outline" })`
  (`components/ui/button.tsx`), and the accent-filled primary button string Print Order Form wears
  (`components/summary/order-form.tsx:972-979`).
- **The download idiom** (`components/setup/board-file-download.ts:17-29`): a Blob, a hidden link, clicked inside
  the tap with nothing awaited first.
- **`useReducedMotion`, `useCoarsePointer`, `useBelowShellWidth`, `useShortScreen`**
  (`components/design/use-viewer-media.ts:80-119`) wherever the canvas's JavaScript needs a switch CSS cannot give it.
- **The rack's turned board** (`lib/geometry/rack-art.ts:132` `buildRackBoardArt`, `:245` `turnedBoardPoints`,
  `:272` `stringerPoints`) for the phone tile's picture and the loading picture (§9, §10).
- **`zoom-math.ts`**: `DEFAULT_MAX_ZOOM` 10 (`components/viewer/zoom-math.ts:40`), the step and the level's
  wording (`:108` `formatZoomLevel`).

**Not used, on purpose:** CSS 3D (old Safari), a Rotate button (D-04), a browser full-screen API (iPhone Safari
grants it to video only — "full screen" here is the app's own Wide view, §4), cast shadows (§3), any library
picked by this document.

---

## Spacing Scale

Declared values for this phase's new surfaces. All multiples of 4.

| Token | Value | Usage in this phase |
|-------|-------|-------|
| xs | 4px | Between the two lines of a canvas message (§8); between a switch row and its hint |
| sm | 8px | Heading → first row in each panel section; between the three switch rows; the view-button grid's gap (both ways); Export button → note; note → status line |
| md | 16px | The canvas message's side padding (it never touches the canvas edge) |
| lg / xl / 2xl / 3xl | 24 / 32 / 48 / 64px | Not used by this phase |

**Inherited, reused exactly, never "corrected" to the table:**

- `gap-5` (20px) between the panel's blocks — every sidebar's outer column (`components/fins/fin-controls.tsx:282`,
  `components/rocker/rocker-editor.tsx:276`). The 3D panel's title block, SHOW, VIEW and EXPORT sit 20 apart.
- The aside's `p-10` (40px) on a computer and `max-shell:p-4` (16px) on an upright phone
  (`components/design/design-screen-shell.tsx:154`), and its 400-dot cap on a 340-dot basis (`:85`).
- The drawing column's `p-3` on a computer and 2-dot rims on a phone and a short screen (`:203`, `:224`).
- The tab strip's 22-dot phone height and 2-dot card rim (`components/viewer/tabbed-panel.tsx:159`, `:253`, `:296`).
- The toolbar row's `gap-1.5` (6px) and its 34-dot buttons (`components/viewer/toolbar-button.tsx:48-59`), the zoom
  row's `top-10` (40px) below the icon row (`components/viewer/zoom-viewport.tsx:574`).
- The ☰ sheet's `gap-2` between tiles and 12-dot side padding (`components/design/screen-tiles.tsx:235`,
  `components/design/phone-menu.tsx:97`).

- RAILS' Advanced column's `flex flex-col gap-3 pl-3 pt-3` (`components/rails/rail-controls.tsx:338`): the new Hard edge
  ends at row (§17) sits 12 below the row above it like every Advanced row, and adds no spacing of its own.

**Exceptions (measured sums, not spacing):** the phone canvas's height subtracts **31 dots** of rims and tab strip
from 66dvh (§2); the nav cluster's gap steps to 12 / 16 / 20 by width (§11). Neither is a new token.

**Touch.** Every button and tick row in the panel takes the app's existing pointer rule: `buttonVariants`' `coarse:h-11`
and the label rows' `coarse:min-h-11` (44 dots). No control on this screen is under 44 on a coarse pointer.

---

## Typography

**Declared for this phase's new surfaces: two sizes, one weight. Both are size–weight pairs the app already uses; nothing
is new.**

| Role | Size | Weight | Line height | Usage in this phase |
|------|------|--------|-------------|-------|
| Canvas message | 14px (`text-sm`) | 400 | 1.43 (20px) | The first line of the no-WebGL, can't-build and didn't-load messages, in `--surf-ink`, centred on the canvas (§8) |
| Meta | 12px (`text-xs`) | 400 | 1.33 (16px) | Every second line of a canvas message, the loading line, the Blank and Contour-stripes hints, the Export note, the Export status line — all `--surf-ink-muted` except a failed export (warning ink) and the done line's file name (ink) |

**Inherited roles this screen uses (documented, not declared, unchanged):**

| Role | Size / weight | Source |
|------|---------------|--------|
| Panel title `3D BOARD` | 18px / 800, uppercase, `tracking-architectural`, `leading-tight` | `components/fins/fin-controls.tsx:284` |
| Panel subtitle | 14px / 400, muted, `mt-0.5` | `components/fins/fin-controls.tsx:285` |
| Section heading `SHOW`, `VIEW`, `EXPORT` | 12px / 800, uppercase, `tracking-architectural`, ruled `border-b` `pb-2` `mt-1.5` | `components/fins/fin-controls.tsx:96` |
| Tick-box label `Fins`, `Blank`, `Contour Stripes` | 14px / 400, muted | `components/rails/rail-controls.tsx:316` |
| Button words (views, Reset View, Export for CNC…, Back/Next) | 14px / 500 (`buttonVariants`' `text-sm font-medium`) | `components/ui/button.tsx` |
| Tab `3D` | 12px / 700, uppercase, `tracking-architectural` | `components/viewer/tabbed-panel.tsx:153` |
| Nav link `3D` | 12px / 700, uppercase, `tracking-architectural` | `components/site-nav.tsx:97` |
| Tile name `3D` / tile line | 11px / 800 tracked / 11px / 400 muted, `line-clamp-2` | `components/design/screen-tiles.tsx:264-265` |
| Zoom level `2.5x` | 14px / 600, `tabular-nums` | `components/viewer/zoom-viewport.tsx:595` |
| Board name in the tab band | 12px / 600, muted | `components/design/board-name-tab.tsx` (its P-1) |
| RAILS' `Hard Edge Ends At — 18"` label line (§17) | 14px / 400, muted, `mb-2` | `components/design/slider-row.tsx:134-141` |

**Measured widths (Inter, 2026-11-03):** `3D` nav link 20.0 dots; tile `3D` 18.5; `TEMPLATE` tile name 72.8 (the
widest tile name); `Bottom` 47.9 and `Reset View` 72.5 at 14/500; `Export for CNC…` 113.9; `Contour Stripes` 102.1
at 14/400; the Export note 421.6 at 12/400 (two lines in every panel width); `SHOW` 45.7, `VIEW` 39.9, `EXPORT` 60.4
at 12/800 tracked; `3D BOARD` 114.2 at 18/800 tracked.

---

## Color

**No new hue.** Two contract tokens are added because the 3D scene needs a white foam on every theme, and the app's
"lightest" colour is the ground in the light themes but the ink in the dark ones. Each is pointed at a ramp value
that already exists; no ramp gains a value.

| New token | Daylight / Chalk | Slate | Phosphor | Meaning |
|-----------|------------------|-------|----------|---------|
| `--surf-foam` | `--ramp-<id>-ground` (#ffffff) | `--ramp-slate-ink` (#f2f4f7) | `--ramp-slate-ink` (#f2f4f7) | The foam's colour before the lights: raw shaped foam (D-11) — white in every theme (the founder, 2026-11-03) |
| `--surf-on-foam` | `--ramp-<id>-ink` (#1f2a3b) | `--ramp-slate-ground` (#12141a) | `--ramp-phosphor-ground` (#050805) | Anything drawn **on** the foam: the stringer (D-07), the dark contour stripe |

They follow the file's own pairing rule (a fill `--surf-<x>` and its legible `--surf-on-<x>`, `app/globals.css:38-42`).
They are written in all six places a contract token lives — the default light `:root` (`app/globals.css:409`), the
default-dark `@media` block (`:438`, Slate's values), and the four theme blocks (`:469`, `:498`, `:527`, `:556`). They
are not bridged into `@theme`: no Tailwind class uses them; the canvas reads them with `getComputedStyle` and reads
them again when the theme changes (the `<html>` class or the OS scheme), redrawing at once with the view kept.
Phosphor's foam is white like every theme's: the founder ruled (2026-11-03) that the board stays foam-coloured, over the
researcher's reading that the "monochrome green terminal" theme (`lib/theme.ts:36`) should keep its board green. The
stringer and the dark contour stripe stay the theme's near-black (`--ramp-phosphor-ground`), so the only thing on the
Phosphor screen that is not green is the foam itself.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--surf-canvas` (the 3D window's ground) and `--surf-sidebar` (the panel) | The canvas clears to `--surf-canvas`, the drawing column's own colour (`components/design/design-screen-shell.tsx:203`): #dfdcd3 / #dfdcd3 / #1a1d25 / #142414 |
| Secondary (30%) | `--surf-foam` lit (the board), `--surf-ink-muted` (fins, ghost, hints), `--surf-line-faint` (rules), `--surf-tab-active` / `--surf-panel` (the card around the window) | Everything that is not the accent |
| Accent (10%) | `--surf-accent` fill / `--surf-accent-ink` ring | Only the uses below |
| Warning (informational) | `--surf-warning-ink` | The failed-export line only. **This phase has no destructive action.** |

**Accent reserved for** (and nothing else on the screen):

1. **Export for CNC…** — the screen's one accent-filled button, the Print Order Form string
   (`border-surf-on-accent bg-surf-accent text-surf-on-accent hover:bg-surf-accent/85`, `components/summary/order-form.tsx:976`).
2. **SUMMARY's new Next → 3D** (Step nav's existing fill, `components/design/step-nav.tsx:62`). The 3D screen itself
   has no Next, so Export is the only filled button on it.
3. **Focus rings**: `.focus-ring-accent` on the canvas (`app/globals.css:1062-1066`); the shadcn buttons' and
   toolbar buttons' own rings, unchanged.
4. **The toolbar's hover fill and Wide view's pressed fill** (`components/viewer/toolbar-button.tsx:76`, `:84`), unchanged.
5. **The nav link's active underline** on 3D (`border-surf-accent`, `components/site-nav.tsx:99`) and **the 3D tile's tick
   and ring** when on 3D (`components/design/screen-tiles.tsx:257`, `:261`), both existing rules.

**Not accent — nothing in the 3D scene.** Foam, stringer, fins, ghost and stripes are all non-accent tokens; no accent
hue ever lands on the board.

**The scene's colours, exactly** (the hex is only here for the contrast check):

| Part | Token | Treatment |
|------|-------|-----------|
| Ground | `--surf-canvas` | Flat clear colour. No floor, no horizon, no vignette. |
| Foam | `--surf-foam` | Lit by the room (§3), matte |
| Stringer | `--surf-on-foam` | Painted on the surface, §3 |
| Fins | `--surf-ink-muted` | Lit by the room, a little glossier than the foam |
| Blank ghost | `--surf-ink-muted` at **18% opacity**, lit; its widest outline in `--outline-blank-line` (`app/globals.css:851`) at 1 dot | §3 |
| Contour Stripes | `--surf-foam` and `--surf-on-foam` bands, unlit | §3 |
| Loading picture | `--outline-board-fill` fill, `--outline-ink` 1.4 edge, `--outline-blank-line` stringer (the 3D tile's grammar) | §9 |

**Legibility** (computed 2026-11-03 from the ramps in `app/globals.css:256-380`; Daylight / Chalk / Slate / Phosphor):

| Pairing | Ratio | Bar |
|---------|-------|-----|
| Ink on the canvas (canvas message, line 1) | 10.54 / 10.54 / 15.29 / 7.84 | 4.5 text ✓ |
| Muted ink on the canvas (line 2, the loading line) | 4.58 / 4.58 / 7.04 / 5.11 | 4.5 text ✓ |
| Muted ink on the sidebar (hints, note, status) | 6.28 / 6.28 / 7.69 / 6.32 | 4.5 text ✓ |
| Ink on the sidebar (the file name in the done line) | 14.46 / 14.46 / 16.71 / 9.71 | 4.5 ✓ |
| Warning ink on the sidebar (failed export) | 6.31 / 6.31 / 8.63 / 16.75 (`15-UI-SPEC.md` § Color) | 4.5 ✓ |
| On-accent on accent (Export's words) | 7.21 / 5.40 / 7.73 / 6.32 | 4.5 ✓ |
| Stringer on foam (`--surf-on-foam` on `--surf-foam`, unlit) | 14.46 / 14.46 / 16.71 / 9.71 | 3 graphic ✓ |
| Foam against the ground (unlit) | 1.37 / 1.37 / 15.29 / 14.75 | see below |
| Fins against the ground / against the foam | 4.58 / 4.58 / 7.04 / 5.11 · 6.28 / 6.28 / 2.17 / 1.54 | see below |

- **In Daylight and Chalk the white foam sits only 1.37:1 off the warm-grey ground before the lights.** What draws the
  board there is the lighting: the raking rail lights leave the deck and the far rail a tone or two darker than the
  ground and the near rail brighter, so the edge reads by shade, the way a white blank reads on a light shop floor.
  The lit rest view must show a continuous edge all round in both light themes; that is a picture check (🧪 in the
  probe), and if an edge vanishes the planner lowers the overhead light's strength before touching a colour.
- **Pre-committed fallback (the checker's recommendation, 2026-11-03):** if that picture check finds the outline lost
  anywhere in Daylight or Chalk, the board takes a 1-dot silhouette edge in `--outline-ink` in the two light themes
  only — tried before any light is lowered — so the planner holds a fallback that does not depend on tuning.
- **Fins are told from foam by shape, not colour.** In Slate and Phosphor the fin's tone is close to the foam's; a fin
  stands off the bottom, so its silhouette reads against the ground (7.04 / 5.11), and its own shading differs.
- **Contrast of a WebGL picture is not a WCAG text pairing.** The ratios above are the tokens'; the rendered tones
  are tuned from pictures in each theme (CONTEXT: "light positions, colours and stripe density — from pictures").

---

## Copywriting Contract

**Numbers (CLAUDE.md Rule 2).** The 3D screen shows no measurement at all. The only numerals on it are the zoom level
(through `formatZoomLevel`, `components/viewer/zoom-math.ts:108`) and the slice count in the done line (a count, not a
measure). The exported files are millimetres in both systems — storage never changes (Rule 2) — and the done line says
so in words. No component on this screen formats a length.

### Headline elements (template rows)

| Element | Copy |
|---------|------|
| Primary CTA | **Export for CNC…** (D-15). One tap downloads the zip; no dialog (the ellipsis follows the app's own "Save board as file…", which also downloads at once). |
| Empty state heading | **None.** There is always a board in the design store; the 3D screen never has "no board". |
| Empty state body | None. |
| Error state | Canvas: **`This board can't be drawn in 3D.`** / **`Check its outline on TEMPLATE and its rocker on ROCKER.`** Export: **`Couldn't make the files — try again.`** (the app's own "Couldn't … — try again." form). Browser: **`This browser can't draw the board in 3D.`** / **`Export for CNC… still works — the files don't need the drawing.`** |
| Destructive confirmation | **None.** Nothing on this screen changes or deletes anything; every control is view-only or a download. |

### Where the screen is named (D-02: "3D" everywhere)

| Place | Copy |
|-------|------|
| Desktop nav link (`NAV_LINKS`, `components/site-nav.tsx:30-37`) | `3D`, href `/design/3d`, the seventh entry after `SUMMARY` |
| Phone tile name | `3D` |
| Phone tile line | `Spin and export` |
| Phone tile accessible name | `3D — Spin and export` (the `{label} — {line}` rule, `components/design/screen-tiles.tsx:242-245`) |
| Page `<title>` | `3D Board — Shaper Assistant` (the founder, 2026-11-03: a descriptive title like the other screens') |
| Page description (`metadata.description`) | `See your surfboard as a solid shape under shaping-room lights, and export it for a CNC shaping program.` |
| Tab band | One read-only tab, `3D`, with the board's name at the right end (`BoardNameTab`) |
| Back on 3D | `← Summary`, accessible name `Previous screen: Summary` |
| Next on SUMMARY (new) | `3D →`, accessible name `Next screen: 3D` |

**`3D` must read `3D` on the Next button, not `3d`.** `screenWord` lower-cases everything after the first character
(`lib/screen-steps.ts:38-40`), so today it would turn `3D` into `3d`. The planner changes the rule so a label that
does not start with a letter is shown as written, and adds `3D` to its test (`lib/screen-steps.test.ts:60-70`).

### The side panel, top to bottom

| Element | Copy | Notes |
|---------|------|-------|
| Panel title | `3D Board` (drawn `3D BOARD`) | The other screens' titles describe the screen (`Rocker & Foil`, `Fin Setup & Placement`); D-02 names the nav, tile, page title and tab, not this line `(Claude's discretion — founder may overrule)` |
| Subtitle | `Spin it under shaping-room lights, then export it for a CNC.` | |
| Section | `Show` (drawn `SHOW`) | |
| Tick box | `Fins` | On by default (D-06: a switch *hides* them) |
| Tick box | `Blank` | Off by default (D-08) |
| Its hint, only with no blank | `No blank on this board — pick one on ROCKER to see it here.` | The row is dimmed and can't be ticked (§6) |
| Tick box | `Contour Stripes` | Off by default (D-12) |
| Its hint, always | `Bands of light that kink at a bump or a flat spot.` | |
| Section | `View` (drawn `VIEW`) | |
| View buttons, group name `Views` | `Deck` · `Bottom` · `Side` · `Nose` · `Tail` | Each button's accessible name is its word |
| Reset | `Reset View` | |
| Section | `Export` (drawn `EXPORT`) | |
| Primary button | `Export for CNC…` | |
| Its note (D-15, verbatim) | `Shape3D and AkuShaper read this as a guide and fit their own curves to it.` | |
| Status line, done | `Downloaded {file}. The outline, the profile and {n} slices, in millimetres.` | `{file}` in ink, e.g. `Fish 5'10-3d.zip`; `{n}` from the writer, never typed |
| Status line, working (only if the build is not done within the tap, §7) | `Making the files…` | |
| Status line, failed | `Couldn't make the files — try again.` | Warning ink |
| Status line, board can't be built | `There's nothing to export until the board can be drawn.` | Export dimmed |

**Case.** Title Case, like the controls around them — the founder's ruling of 2026-11-03 (the checker's one
copywriting flag): `Contour Stripes`, `Reset View`, `Export for CNC…` (a small word stays small, as in `Print Order
Form`'s neighbours) and, on RAILS, `Hard Edge Ends At`. Uppercase stays where the app's CSS draws it (headings, the nav,
the tab, the tile name). Accessible names keep the app's spoken patterns (`Tail Rail hard edge ends at`).

### On the canvas

| When | Line 1 (14/400 ink) | Line 2 (12/400 muted) |
|------|---------------------|-----------------------|
| No WebGL (or the drawing can't start) | `This browser can't draw the board in 3D.` | `Export for CNC… still works — the files don't need the drawing.` |
| A board the surface can't be built for | `This board can't be drawn in 3D.` | `Check its outline on TEMPLATE and its rocker on ROCKER.` |
| The drawing's code didn't load (offline) | `The 3D view didn't load.` | `Check your connection, then reload the page.` |
| Still loading after 1 s | — | `Getting the 3D view ready…` (under the loading picture) |

Never `WebGL`, `mesh`, `render`, `snapshot` or `GPU` in a shaper's face.

### The corner toolbar (inherited words, unchanged)

| Control | Accessible name / title |
|---------|--------------------------|
| Wide view (computer and sideways phone only) | `Hide the sidebar for a wider view` / title `Wide view`; pressed: `Show the sidebar` (`components/outline/outline-editor.tsx:257-273`) |
| Zoom row group | `Zoom` |
| Back to 1x | `Back to 1x — the whole drawing` |
| Zoom in / Zoom out | `Zoom in` / `Zoom out` |
| Level | `1x` … `10x` (`formatZoomLevel`) |

### Screen readers (not drawn)

| Element | Copy |
|---------|------|
| The canvas's name | `{board name} in 3D` — the band's name, so `Untitled in 3D` for a board never saved (`components/design/board-name-copy.ts:15`) |
| Its role description | `3D view` |
| Its description (hidden text) | `Drag to turn the board, scroll or pinch to zoom, and right-drag or use two fingers to slide it. With the keyboard: the arrow keys turn it, Shift with an arrow key slides it, plus and minus zoom, 0 goes back to 1x and Home resets the view.` |
| After a view button | `Deck view.` · `Bottom view.` · `Side view.` · `Nose view.` · `Tail view.` |
| After Reset View (button or Home) | `Back to the first view.` |
| After Back to 1x (button, double-click, 0) | `Back to 1x.` |
| While loading | the canvas region is `aria-busy="true"`; nothing is spoken |

Turning, zooming and sliding by hand are not announced (they would chatter); the switches announce themselves as
checkboxes; the Export status line is its own live region (§7).

### RAILS: the tail's Advanced menu (D-20, §17)

| Element | Copy |
|---------|------|
| Label line (the value read out in it) | `Hard Edge Ends At — 18"` · Metric `Hard Edge Ends At — 45.7 cm` |
| The slider's accessible name (`sliderLabel`) | `Tail Rail hard edge ends at` |
| What a screen reader says for its value (`sliderValueText`) | `18" from the tail` · Metric `45.7 cm from the tail` |

Nothing else: no hint line, no note, no tooltip, and nothing on VOLUME or anywhere else says the litres moved (D-18).
`Hard Edge Ends At` is D-20's control in the menu's Title Case beside `Apex Thickness` and `Sharp Bottom Tuck`
(`lib/geometry/rail-bands.ts:146-153`) — the founder's ruling of 2026-11-03; its accessible name keeps the menu's
spoken pattern, `Tail Rail hard edge ends at` (`components/rails/rail-controls.tsx:215`). The distance is a **dim** (a place along the board, like a Thinning
Start), so it reads through `formatDim` — Imperial `18"`, `23 1/2"`; Metric centimetres to one decimal — via one named
formatter beside `formatThinningStart` (`lib/geometry/blank-reasons.ts:278-280`), never through `formatMark` and never
`457 mm`.

### The export's file names (D-14, CONTEXT's starting point, fixed here)

| File | Name |
|------|------|
| The download | `{stem}-3d.zip` |
| Inside it | `{stem}.dxf` · `{stem}.stl` · `{stem}-outline.txt` · `{stem}-profile.txt` · `{stem}-slice-01.txt` … `{stem}-slice-{NN}.txt` |

- **`{stem}`** is the board's name made safe exactly as Save board as file… makes it (`lib/models/board-file.ts:96-107`):
  refused characters become spaces, runs of spaces become one, leading dots and surrounding spaces and dots are
  trimmed, cut to 80 whole letters by `Array.from`, and nothing left is `Untitled Board` (`:59`). So `Fish 5'10"`
  gives `Fish 5'10-3d.zip`. The planner lifts that cleaning into one shared stem function both files use, so the two
  downloads can never name the same board differently.
- **`{NN}`** is two digits, counted from the tail (`01` is the slice nearest the tail), three digits only if a board
  ever has more than 99 slices. Which stations the slices sit at is research's call (CONTEXT).
- The name comes from the design store's `boardName` — what SUMMARY's Board Name box holds — the same source the board
  file uses.

---

## Already done — read this before planning

Confirmed 2026-11-03 by reading the files and measuring. Where this corrects the brief or CONTEXT, this section is the one
to trust.

- **There are four themes, not three.** Daylight, Chalk, Slate and Phosphor (`lib/theme.ts:32-36`). Chalk is Daylight with
  a blue accent; every scene colour here is the same in Chalk as in Daylight.
- **`screenWord("3D")` returns `"3d"`** (`lib/screen-steps.ts:38-40`). Fix it with the nav change (§ Copywriting).
- **Adding `3D` to the desktop row overflows it at 820 wide** by 7 dots, and at 1024 makes the signed-out `Sign in`
  button wrap onto two lines (the row grows 81 → 89 tall). Measured with the real row on the dev server. The fix is
  the cluster's gap, §11. **Today, before this phase,** `Sign in` already wraps onto two lines from 820 to about 900
  wide (it squeezes to 29.9 dots, the row is 89 tall); the fix leaves that no worse and makes 900 one line.
- **The seven tiles fit without moving anything else on the sheet** (D-03 holds): every tile stays 100.3 tall, the
  upright grid stays 208.5 tall, the sideways row 100.3. Tiles narrow to 78.0 / 81.8 / 85.5 / 91.0 dots at 360 / 375 /
  390 / 412 wide (from 106.7–124.0), and to 110.3 / 113.0 at 844 / 863 sideways (from 130.0 / 133.2).
- **`TEMPLATE` is the tightest tile name**: 72.8 dots in a 78.0 tile at 360 wide, so it runs 2.4 dots into each side of
  the tile's 4-dot padding and stops 2.6 dots inside the border. Nothing clips, and `e2e/phone-layout.spec.ts:126-150`'s
  "whole" check still passes (the span's own box is 72.8 wide). If the founder finds it cramped, the tile names drop to
  0.1em tracking in the four-across grid only (`TEMPLATE` 68.4) `(Claude's discretion — founder may overrule)`.
- **The sideways tile spec's floor breaks:** `e2e/phone-screen-tiles.spec.ts:152` asserts every tile is over 120 dots
  wide sideways; seven tiles are 110.3 and 113.0. The floor becomes 104 (the harness has no safe-area insets; a real
  iPhone held sideways, with its ~47-dot insets, gives about 100).
- **RAILS' view switches are toolbar buttons** (Finished Rail and Ghost Bands, `components/rails/rail-band-editor.tsx:359-378`),
  while D-04 puts the 3D screen's switches in the panel. D-04 is locked; this is noted, not changed.
- **The zoom row is wired to an SVG `viewBox`** (`ViewerZoomProvider` / `useViewerZoom`). A 3D canvas has no viewBox, so the
  3D zoom needs its own state behind the same row; the row's markup, classes, words and pointer rules must be identical
  to `ViewerZoomControl` (`components/viewer/zoom-viewport.tsx:549-606`). Whether that is an adaptor or a shared
  presentational piece is the planner's call.
- **A 3D canvas has no height of its own.** Every other phone drawing is an SVG with proportions, so the shell's
  `max-shell:max-h-[66dvh]` cap (`components/design/design-screen-shell.tsx:59`) is enough. Here the canvas box must be
  given its height, §2.
- **`data-print-hide` hides nothing on this route.** Only two stylesheets turn it into `display: none`
  (`components/design/step-nav.tsx:13-15`); §12 uses Tailwind's `print:hidden` instead.
- **The shell's three switches are already in the right places**: width (`max-shell:` / `shell:`, the 820 line),
  pointer (`coarse:`, `app/globals.css:82`), height (inline `[@media(max-height:500px)]`). The 3D screen adds none.
- **The board lock already treats this whole screen as view-side**: zoom, show/hide ticks, Print and Export "carry
  `data-lock-exempt` and are never disabled" (`components/design/board-lock-scope.tsx:24-26`). Every control on 3D is in
  that list; `board-lock-scope.test.ts`'s inventory will find them.
- **False positives in the "six" sweep.** `e2e/fit-defaults.spec.ts:25` (six number rows), `e2e/rocker-panel.spec.ts:73`
  (six sliders) and `e2e/legal-pages.spec.ts:63` (six table rows) count other things and do not change.

---

## Interaction & Layout Contract

### What triggers what

Three switches, each answering its own question, **never conflated** (CLAUDE.md Layout). This phase gives none of them a
new job.

| Switch | Question | This screen |
|--------|----------|-------------|
| **Width** (`max-shell:` below 820, `shell:` at 820 and over) | Which layout | Stacked (canvas over panel) or the shell (panel beside canvas); the zoom row in the corner (no icon row) or under it; four-across or seven-across tiles; the nav cluster's gap |
| **Pointer** (`coarse:`) | How big a control draws, and whether a touch-redundant one draws | 44-dot buttons and tick rows; the zoom row's +/− hidden and the row hidden at 1x on touch (inherited, `components/viewer/zoom-viewport.tsx:573`, `:589`); the grab cursor (a mouse only) |
| **Height** (inline `[@media(max-height:500px)]`) | Short-screen rules | The compact top bar (inherited); the canvas fills the drawing column exactly, so the column never needs its short-screen scroll |

### What draws the eye first

1. **The board**, lit, filling about 85% of the window — the one large, shaded, three-dimensional thing in the app.
2. **Export for CNC…**, the only accent-filled control on the screen.
3. **The view buttons**, a tidy block of outlined buttons.
4. Quietest: the hints, the note and the status line, 12px muted.

### 1. The panel (question B)

Order is D-04's, top to bottom, each block `gap-5` apart:

```
3D BOARD                                     ← 18/800 title
Spin it under shaping-room lights, then      ← 14/400 muted subtitle
export it for a CNC.

SHOW ─────────────────────────────────────   ← ruled heading
[✓] Fins
[ ] Blank                                    ← dimmed with no blank
    No blank on this board — pick one on ROCKER to see it here.
[ ] Contour Stripes
    Bands of light that kink at a bump or a flat spot.

VIEW ─────────────────────────────────────
[  Deck  ] [ Bottom ] [  Side  ]             ← grid-cols-6: three cells of 2
[     Nose      ] [     Tail      ]          ← two cells of 3
[            Reset View            ]         ← one cell of 6

EXPORT ───────────────────────────────────
[█████████ Export for CNC… █████████]        ← accent fill, full width
Shape3D and AkuShaper read this as a guide
and fit their own curves to it.
Downloaded Fish 5'10-3d.zip. The outline, …  ← status line (role=status)

[ ← Summary                         ]        ← Step nav, Back alone fills its row (components/design/step-nav.tsx:48)
© … Terms · Privacy                          ← site footer (the shell's)
```

- **Section blocks** are `flex flex-col gap-2`: the ruled heading, then its rows 8 apart.
- **Tick rows** are the RAILS label row exactly: `flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm
  text-surf-ink-muted font-normal` wrapping a `Checkbox` (`components/rails/rail-controls.tsx:316-322`), each `data-lock-exempt`. A hint
  sits under its row, `mt-1` (4), indented `pl-[22px]` to the label's text (16 box + 6 gap), 12/400 muted.
- **The no-blank row** is `disabled` on the `Checkbox` and `opacity-40` on the label, the app's dimmed-row treatment
  (`components/fins/fin-controls.tsx:201`), with the hint at full strength so the reason reads. The hint is not shown
  when a blank is picked. A board is "with a blank" exactly when the side profile carries one (`sideProfile.blank`, the
  one ROCKER's tile draws, `lib/geometry/screen-tiles.ts:134-137`) `(Claude's discretion — founder may overrule: D-08's
  "only offered" could also mean the row is not drawn at all; dimmed-with-a-reason was chosen so a shaper learns the
  switch exists)`.
- **View buttons**: `role="group"` named `Views`, `grid grid-cols-6 gap-2`; Deck, Bottom, Side `col-span-2`; Nose, Tail
  `col-span-3`; Reset View `col-span-6`. Every button `buttonVariants({ variant: "outline" })`, `w-full`,
  `data-lock-exempt`. They are one-shot actions, never pressed toggles: once the shaper drags, the board is no longer "in"
  a view, so no button carries `aria-pressed`. Measured at the narrowest panel (260 inner, an 820 window): a third-cell is
  81.3 dots and `Bottom` needs 69.9; a half-cell is 126; `Reset View` needs 94.5 and gets 260. `Reset View` would not fit
  a third-cell at 260 or 272, which is why it has its own row.
- **Export**: `Button` (default size) with the Print Order Form classes, `w-full`, `data-lock-exempt`. Note `mt-2`,
  status line `mt-2`, both 12/400 muted. The status line is **always in the DOM**, empty when idle, `role="status"`
  (`aria-live="polite"`), so a screen reader hears the result; the done line keeps its text until the next export or
  until the shaper leaves the screen.
- **Panel widths** this layout is checked at: 260 (820 window), 272 (a sideways iPhone, 352 aside), 320 (any window
  1280 and over), and 328 / 343 / 358 / 380 on upright phones of 360 / 375 / 390 / 412.

### 2. Layout under the three switches (question A)

| Screen | Layout | Canvas (approx., dots) | Board at rest, nose to tail |
|--------|--------|------------------------|-----------------------------|
| **1440 × 900 / 1280 × 800**, mouse | Shell; aside 400 (inner 320) | 804 × 615 at 1280 × 800 | ≈ 683 (85% of the width) |
| **820 × 800**, mouse | Shell; aside 340 (inner 260) | 404 × 615 | ≈ 343 |
| **iPad 1180 × 820**, finger | Shell, 44-dot controls | 704 × 635 | ≈ 598 |
| **iPhone 14 upright, 390 × 664** | Stacked; drawing column 66dvh = 438 | 380 × 407 | ≈ 323; panel visible beneath: 178 (as TEMPLATE and ROCKER) |
| **Small Android, 360 × 640** | Stacked | 350 × 391 | ≈ 297 |
| **Pixel 7 upright, 412 × 839** | Stacked | 402 × 523 | ≈ 342 |
| **iPhone held sideways, 844 × 390** (Safari leaves the page ≈ 340) | Shell by width, compact bar by height; aside 352 | 482 × 311 (Safari ≈ 437 × 261 with the notch's inset) | ≈ 410 (≈ 371) |
| **Pixel 7 held sideways, 863 × 360** | Same | 492 × 281 | ≈ 418 |

- **Computer and sideways phone** (`shell:`): the canvas fills the TabbedPanel's inner card (`flex min-h-0 flex-1`), inside
  a `relative` box that is the toolbar's positioning context — ROCKER's structure (`components/rocker/rocker-editor.tsx:326`). The canvas has
  `rounded-md` corners and clips to them. On a short screen it fills the column exactly, so the column's own
  `[@media(max-height:500px)]:overflow-y-auto` (`components/design/design-screen-shell.tsx:203`) never has anything to scroll.
- **Upright phone** (`max-shell:`): the canvas box is **`max-shell:h-[calc(66dvh-31px)]`**, so the drawing column comes out at
  exactly its 66dvh cap. The 31 dots are the column's 2 + 2 rim, the 22-dot tab strip less its 1-dot overlap, and the folder
  card's 1 + 2 border and rim top and bottom (`components/viewer/tabbed-panel.tsx:159`, `:250-253`, `:296`). A browser test measures the column
  at no more than 66dvh and the canvas at no less than 66dvh − 32, so a change to any rim fails loudly.
- **Wide view** (computer only): pressing it hides the sidebar exactly as on TEMPLATE and ROCKER (`TabbedPanel bare`, the
  aside's `hidden`); the canvas takes the width and the board re-frames to keep its zoom level.
- **Resizing** keeps the board's turn, zoom level and slide; 1x is re-worked for the new canvas.

**Touch and the page (question A's last part).** The canvas carries `touch-action: none`: one finger always turns the board,
two always zoom and slide, and the browser never scrolls or pinch-zooms the page from inside it. That costs nothing: upright,
the page itself does not scroll (the controls scroll in their own column below the pinned drawing); sideways, the canvas fills
its column exactly. A finger that wants to scroll the panel scrolls the panel.

### 3. The board, the room and the lights (questions D, E, F)

**The room.** The camera never moves. It looks at the board from **50° above the floor**, with a narrow field of view (30°
top to bottom) so proportions read nearly true while the board still reads as solid. Every light hangs in the room. **The board
turns; nothing else does** (D-10). This is the one structural rule a renderer must honour: dragging rotates the board's own
model, never the camera, or the highlights would ride along with the board instead of moving across it. (A board that moves
under fixed directional lights also keeps its shading when it is slid or zoomed.)

**The first view (rest).** The board lies flat, deck up, **nose to the left**, stringer running left to right across the middle —
which, from the camera's 50°, is the side view with the deck turned 50° toward you: you see most of the deck and the near rail.
Framed so the board's box in this view fills **85%** of the canvas in whichever direction is tighter ("1x"). It opens like this
every time; nothing about the view or the switches is remembered between visits (D-17), as the board's orientation on TEMPLATE
is not (`references/board-orientation.md`).

**The preset views** (D-13), each a turn of the board under the same camera, each re-framed at 1x and centred:

| View | What faces you | Nose |
|------|----------------|------|
| `Deck` | The deck, square on; the stringer straight across the middle | Left |
| `Bottom` | The bottom, square on (turned over along its length) | Left |
| `Side` | The near rail, deck up — exactly ROCKER's side view, the rocker reading | Left |
| `Nose` | The nose tip, end on, deck up | Toward you |
| `Tail` | The tail, end on, deck up | Toward you |
| `Reset View` | The first view above, at 1x, centred | Left |

The board takes the shortest turn to a view. The Side view at rest must match ROCKER's side profile and the Deck view the
TEMPLATE outline lying nose-left (`lib/geometry/screen-tiles.ts:101-110`) — a relation test, not a typed number.

**The lights** (D-10, in words for the planner, tuned from pictures as CONTEXT says):

| Light | Where it is in the room | Strength (relative) | Colour |
|-------|-------------------------|---------------------|--------|
| Near rail light | Low along the board's near rail (the camera's side), about **8° above the deck's plane**, shining across the deck toward the far rail | **1.0** (the key) | Neutral white, like a shaping bay's tubes (about 5000 K) |
| Far rail light | Low along the far rail, the same 8°, shining back across the deck | **0.7** | Same |
| Overhead | Straight down from above, broad and soft | **0.45** | A little warmer (about 4000 K) |
| Fill | All round, no direction | **0.2** | Neutral |

- Both rail lights are directional (long tubes, not bulbs), so every station along the board is lit the same way and a bump
  anywhere shows the same. Raking that low is what makes a high spot catch light and a low spot fall into shade.
- **No cast shadows** in this phase: the contour reading comes from the low angle on the surface itself, and a free-turning
  board with no floor has nowhere for a shadow to fall `(Claude's discretion — founder may overrule)`.
- Exposure keeps the brightest lit foam just short of pure white; nothing glows.

**The foam** (D-11): `--surf-foam`, matte (a raw-foam roughness, no clear coat, no shine), one smooth surface — the
station-to-station loft must not read as facets, and the finished rail's planer-cut sharpness (a sharp bottom tuck) must
stay sharp (CONTEXT: mesh fineness is research's).

**The tail's shape** (D-05): a swallow is two pieces at every station inside its notch, each running from the notch's
**square wall** to the rail with air between them — so in the Bottom, Tail and turned views the notch has two straight,
square-cut inner walls, never a V that thins from the stringer out (that is a diamond, whose V is foam). A diamond's V
reads as foam. How the pieces are built is the surface builder's concern, not this contract's.

**The tail's hard edge** (D-20): on a hard-edged tail the edge runs full from the tail to the 12" station and then blends
into the tucked rail, gone by the shaper's Hard Edge Ends At distance (§17) — a smooth fade along the rail in the Bottom
and Side views, never a step.

**The stringer** (D-07): a line painted on the surface down the centre of the deck and the bottom, over the nose tip and the
tail end, in `--surf-on-foam`, at a real stringer's width (**3 mm**) but never thinner than 1 screen dot. On a swallow it
stops at the crotch of the notch and runs down the crotch's face, the rack's own rule (`lib/geometry/rack-art.ts:270-279`).

**Fins** (D-06), when Fins is ticked:

- Each fin of the picked system stands on the bottom along its FINS line: the base from the trailing edge's mark
  (`offTail`, `lateral`) to the leading edge's (`leadingOffTail`, `leadingLateral`) — so toe-in is already in it
  (`lib/geometry/fins.ts:177-188`).
- **Upright, square to the bottom where it stands.** FINS carries no cant (its `FinMark` has no cant field), so the 3D screen
  draws none.
- **One plain outline for every fin, sized by its base length** `(Claude's discretion — founder may overrule)`: depth (base to
  tip, square to the bottom) **1.0 × base**; the tip raked back to sit **0.25 × base behind the trailing edge**; the leading
  edge a full convex sweep from the base's front to the tip; the trailing edge a gentle concave curve from the tip down to the
  base's back, meeting the base at about 85°; tip rounded at **0.08 × base**; **0.06 × base thick** at the root (about 7 mm on
  the default 4.5" base, `lib/geometry/fins.ts:138-142`), thinning to a third of that at the tip, edges rounded. Never any
  maker's foil.
- Colour `--surf-ink-muted`, lit by the room, a little glossier than the foam (a glassed fin beside raw foam).
- At rest the fins are under the board and out of sight; they show in Bottom, Side, Nose, Tail and as the board is turned.

**The blank ghost** (D-08), when Blank is ticked: the blank's own surface from the bottom, thickness and width curves ROCKER
draws, placed where the board sits in it; a see-through shell in `--surf-ink-muted` at **18% opacity**, lit by the room so it
reads as glass rather than a flat tint; it never hides the board (drawn after it, writing no depth); its widest outline all round
drawn as a 1-dot line in `--outline-blank-line`, so where the veil is faint you still see how far the foam reaches. Framing is
the board's, not the blank's: a blank longer than the board may run past the canvas edge at 1x.

**Contour Stripes** (D-12), when ticked: the foam's lit shading is replaced by **unlit alternating bands** of `--surf-foam` and
`--surf-on-foam`, half and half, with a soft 1-dot edge. The bands are the reflections of a row of long, straight light tubes
fixed overhead in the room, running along the board's length at rest — so they are fixed in the room like the lights, slide
over the board as it turns, and bend where its shape bends. Density: **one dark-and-light pair for every 12° of surface slope**
(about 15 pairs across a half turn); a flat area shows one broad band, a rail a tight run of bands, a bump a kink. Fins and the
ghost are drawn as usual over striped foam; the stringer stays on top. Density is a start point to tune from pictures.

**The bottom is flat and nothing says so** (D-09).

### 4. The corner toolbar (question C)

- **`ViewerToolbar`** at the canvas's top-right, holding one button: **Wide view** (`PanelLeftCloseIcon` / `PanelLeftOpenIcon`,
  pressed while wide), `max-shell:hidden`, exactly TEMPLATE's (`components/outline/outline-editor.tsx:257-273`). There is **no Rotate button**
  (D-04), and nothing else in the icon row.
- **The zoom row** under it, the inherited `ViewerZoomControl` look: on a mouse `−` `level` `+` `Back to 1x` always shown, the
  out and reset buttons dimmed at 1x and in dimmed at 10x; on a touch screen only the level and Back to 1x, and only once zoomed
  in (`components/viewer/zoom-viewport.tsx:573`, `:589`). That is how this contract reads D-13's "on a touch screen the drawing's zoom buttons stay
  beside the pinch": the touch rule every other viewer already has `(Claude's discretion — founder may overrule: if he meant
  + and − drawn on touch too, the two buttons lose their `coarse:hidden` on this screen only)`.
- **Position by width**: at 820 and over the zoom row sits at `top-10` under the icon row; below 820 there is no icon row (Wide
  view is hidden), so the row takes `placement="corner"` (`top-0`), as FINS does without callouts (`components/fins/fin-viewer.tsx:805`). An
  upright phone at 1x therefore has nothing at all over the board.
- **Back to 1x** undoes zoom and slide and keeps the turn. Zoom runs **1x to 10x** (`components/viewer/zoom-math.ts:40`) in the 2D viewers' own
  steps.

### 5. Moving the board (question G)

| Input | Does |
|-------|------|
| **Drag** (mouse left button, or one finger) | Turns the board in every direction, like a ball under the hand: a sideways drag turns it about the screen's up-down axis, an up-down drag about its left-right axis, any mix of the two. Dragging the length of the canvas's shorter side turns it half a turn (180°). |
| **Right-drag**, middle-drag, or **Shift + drag** (a one-button trackpad) | Slides the board across the window, following the pointer exactly. The board's centre can't leave the canvas. |
| **Two fingers** | Pinch zooms about the fingers' midpoint; moving both slides. A twist does nothing. |
| **Wheel**, trackpad scroll | Zooms toward the pointer, one step per notch (the 2D viewers' wheel rule); never scrolls the page or the panel. |
| **Trackpad pinch** (ctrl + wheel, Safari's gesture events) | Zooms smoothly toward the pointer. |
| **Double-click / double-tap** | Back to 1x (zoom and slide undone, turn kept) — the 2D viewers' own double-click. |
| **A view button / Reset View** | Turns the board to that view and re-frames at 1x (§3). |
| **Right-click menu** | Suppressed on the canvas only (right-drag is slide). |

**Glide** (D-13): let go of a moving drag and the board keeps turning, slowing to rest over about **600 ms**. A view button,
Reset View, or a new press stops a glide at once. **Reduced motion** (`prefers-reduced-motion: reduce`, read through
`useReducedMotion`, `components/design/use-viewer-media.ts:99`): the board stops dead on release, and view changes jump with no glide — the Board
Rack's rule (`15-UI-SPEC.md` §12). **No auto-turn**, ever (D-13).

**View change timing**: **400 ms** ease-out, `cubic-bezier(0.22, 0.8, 0.3, 1)` — the rack's settle curve (`15-UI-SPEC.md` §12);
instant under reduced motion.

**Keyboard** (the canvas holds focus):

| Key | Does |
|-----|------|
| **← / →** | Turn 15° about the up-down axis |
| **↑ / ↓** | Turn 15° about the left-right axis |
| **Shift + arrow** | Slide one-twentieth of the canvas |
| **+** or **=** / **−** | Zoom in / out one step |
| **0** | Back to 1x |
| **Home** | Reset View |
| **Tab** | Leaves the canvas (it is one Tab stop; it never traps focus) |

Key presses move at once, no glide. Each key's default is cancelled only while the canvas has focus, so arrows never scroll the
page from there.

**Pointer feedback** (a mouse only): `cursor: grab` over the board's canvas at rest, `grabbing` while turning, `move` while
sliding.

**Rendering**: drawn only when something changes (no loop while the board is still); at the device's pixel ratio, capped at 2;
smoothed edges on.

### 6. The switches (question B)

| Switch | Default | Off / on | Locked board | No blank |
|--------|---------|----------|--------------|----------|
| `Fins` | on | hides / shows the fins | works | — |
| `Blank` | off | shows / hides the ghost | works | dimmed, hint shown |
| `Contour Stripes` | off | foam shading / stripes | works | — |

All three are view state, never saved, never undoable, never part of the board (D-17), and they never change the export (D-16:
the files hold the bare board whatever the switches say). Changing a switch keeps the view exactly as it is.

### 7. Export for CNC… (questions H, I)

- **One tap, one download**, signed in or out (D-15), locked or not. The zip is built from the design store's board in the
  browser and downloaded through the board-file idiom — a Blob, a hidden link, clicked **inside the tap with nothing awaited
  first**, because Safari refuses a download that starts after the tap (`components/setup/board-file-download.ts:4-16`). So in the normal case
  there is no visible "working" state: the status line goes straight to the done line.
- **If research must make the build asynchronous** (a large zip writer), the button is disabled with `Making the files…` on the
  status line until it finishes, and the planner proves the download still starts on a real iPhone; the contract's preference
  is a synchronous build.
- **Done**: `Downloaded {file}. The outline, the profile and {n} slices, in millimetres.`
- **Failed** (any thrown error): `Couldn't make the files — try again.` in warning ink, logged with `console.error`. Pressing
  Export again is the retry.
- **A board that can't be built**: the button is `disabled` (shadcn's `disabled:opacity-50`), the status line reads `There's
  nothing to export until the board can be drawn.`
- **No WebGL**: Export works as normal — the writers never touch the drawing. The writers must therefore not live in the
  renderer's code chunk.
- **The note** (D-15) is always shown, verbatim.

### 8. The canvas messages

A message sits centred on the canvas, `max-w-[280px]`, `px-4`, text-centred, two lines `gap-1` apart (14/400 ink, then 12/400
muted), on the canvas's own `--surf-canvas` ground. While a message shows: no board, the zoom row hidden, the Wide view button
kept (it still widens the window), and the view buttons and tick boxes `disabled` (there is nothing to look at) — except in the
no-WebGL case, where Export stays live. Which message (§ Copywriting, "On the canvas"):

- **No WebGL**: the browser offers no 3D drawing context, or it can't be created, or it is lost and doesn't come back. A
  context lost for a moment (a phone backgrounding the tab) is restored silently with the view kept; only one that does not
  return shows the message.
- **Can't be built**: the pure surface builder throws (it names the first value that isn't a finite number, the rack's WR-05
  rule, `lib/geometry/rack-art.ts:127-132`), or the board is outside the app's length range. Logged with `console.error`.
- **Didn't load**: the drawing's code chunk fails to arrive.

### 9. Loading, and what's the same everywhere (question K)

1. **Before the page's script runs** (the server's paint): the canvas box at its full size, painted `--surf-canvas`, nothing
   in it. The server cannot draw the board — it lives in the browser.
2. **Once the page is live**: the **loading picture** — the board's turned silhouette from the rack's maths at **50°**
   (`turnedBoardPoints`, `lib/geometry/rack-art.ts:245`; its stringer from `stringerPoints`, `:272`), lying nose-left, centred at the rest
   view's 1x size, in the 3D tile's grammar (§10). It matches the rest view's outline, because the rest view *is* the side
   view turned 50°. The canvas region is `aria-busy="true"`.
3. **After 1 s still loading**: `Getting the 3D view ready…` appears under the picture.
4. **The lit board** replaces the picture in one frame, no fade; `aria-busy` clears.

The panel works throughout: a switch ticked while loading applies when the board appears.

**The same in every case**: signed in or out; a board in progress or a saved one; a preset or a board opened from a file.
**A locked board** draws and exports exactly the same — every control here is view-side (`components/design/board-lock-scope.tsx:24-26`), each
carries `data-lock-exempt`, and nothing is greyed. **Undo / Redo** (the floating pair) still works here; undoing an edit made on
another screen rebuilds the board in place, keeping the view.

### 10. Nav, tiles and Back/Next (questions J, L)

**`NAV_LINKS`** gains `{ href: "/design/3d", label: "3D" }` after SUMMARY (`components/site-nav.tsx:30-37`); the desktop row, the
☰ tiles and Back/Next all read it.

**The desktop row (§11's arithmetic)**: the right-hand cluster's gap changes from `gap-4 lg:gap-5` (`components/site-nav.tsx:89`) to
**`gap-3 lg:gap-4 xl:gap-5`** — 12 dots below 1024, 16 from 1024 to 1279, 20 (as today) from 1280.

**The ☰ sheet** (`components/design/screen-tiles.tsx:235`): `grid grid-cols-3 gap-2 shell:grid-cols-6` becomes **`grid grid-cols-4 gap-2
shell:grid-cols-7`** — four across and two down upright (TEMPLATE ROCKER RAILS VOLUME / FINS SUMMARY 3D), one row of seven at the
shell width (a phone held sideways). Nothing else on the sheet changes.

**The 3D tile's picture** `(Claude's discretion — founder may overrule)`: the board turned three-quarters, in the tiles' own
grammar — **the rack's turned board at 50°** (`turnedBoardPoints`), lying nose-left like TEMPLATE's tile (`x = −station`,
`lib/geometry/screen-tiles.ts:105-107`), with the deck's stringer from `stringerPoints` on it. Fill `var(--outline-board-fill)`,
edge `var(--outline-ink)` at 1.4, the stringer `var(--outline-blank-line)` at 1, all `vectorEffect="non-scaling-stroke"`, in the
46-dot picture box (`components/design/screen-tiles.tsx:69`), `preserveAspectRatio="xMidYMid meet"`, 4% padding (`padBox`). One new pure function
beside the others in `lib/geometry/screen-tiles.ts` (e.g. `threeDTileArt(art)`); `ScreenTileKind` gains `"threeD"`
(`lib/geometry/screen-tiles.ts:254`); `TILE_KIND` gains `"/design/3d": "threeD"` — it is typed on the screen list, so the build
fails until it does (`components/design/screen-tiles.tsx:58-67`); `screenTileLines` gains `threeD: "Spin and export"` (`:259-274`). The same
function draws the loading picture (§9).

**Back/Next**: no code change beyond `NAV_LINKS` and `screenWord` — `StepNav` reads the order (`components/design/step-nav.tsx:34`). SUMMARY gets
Back `← Fins` (outline, `flex-[0.8]`) and Next `3D →` (accent, `flex-1`) inside its `max-w-80` row (`components/summary/order-form.tsx:1042`); 3D
gets Back `← Summary` alone, filling its row (`components/design/step-nav.tsx:48`). The chain never wraps (3D has no Next, TEMPLATE no Back).

**The desktop reference pictures (L).** All five (`e2e/desktop-baseline.spec.ts:267-297`) are whole-window shots at 1280 × 800
that include the nav row, and the row gains `3D` there, so **all five move — in the nav row only**: at 1280 the gap stays 20,
so the six existing links simply shift 40 dots left (20 for the link, 20 for its gap). Re-record them from the main checkout
after a diff proves nothing below the row moved, under the rule written at `:215-221`. A sixth picture of the 3D screen is
research's call (CONTEXT); if it is added, the canvas is masked unless the research shows headless Chromium draws it the same
every run, so the picture pins the panel and the chrome, not a graphics driver.

### 11. The desktop row's arithmetic (drift check 6)

Measured on the real row (signed out, real `Sign in` button), with a seventh `3D` link (20.0 dots) added:

| Width | Today's gaps (16, 20 from 1024) | This contract's gaps (12 / 16 / 20) |
|-------|-------------------------------|-------------------------------------|
| 820 | **overflows by 7 dots**; logo at its 100.2 floor | fits; logo 112.8; row 89 tall with `Sign in` on two lines (as today without 3D) |
| 844 / 863 | fits only by squeezing the logo | fits; logo 136.8 / 155.8; `Sign in` two lines (as today) |
| 900 | `Sign in` two lines | fits, `Sign in` **one line**, row 81 |
| 1023 | fits | fits, row 81 |
| 1024 | **`Sign in` wraps, row 81 → 89** | fits, row 81, logo full size 175.4 |
| 1133 / 1279 | fits | fits, row 81 |
| 1280 / 1440 | fits (gap 20) | fits, gap 20 unchanged |

`e2e/site-nav-width.spec.ts` (820 / 844 / 863, `:134`, with its 24-dot headroom check at `:100-111`) and its Home-house describe
(1024 to 1280) are re-run; a signed-in avatar is narrower than `Sign in`, so signed in is never the tight case.

### 12. Print (question M)

**The 3D screen is not printable**, and has no print button: a shaper's paper is the templates and the order form, on SUMMARY.
The canvas carries Tailwind's `print:hidden`, so a browser's own Print never puts a blank or stale drawing on paper; everything
else prints however the browser prints any other design screen (TEMPLATE and ROCKER add no print rules either). Nothing about
paper changes in this phase.

### 13. Accessibility (question N)

- **The canvas** is a focusable box (`tabIndex={0}`) with `role="application"`, `aria-roledescription="3D view"`, named
  `{board name} in 3D` and described by the hidden instruction text (§ Copywriting) — `application` because arrow keys, plus and
  minus are its own. The `<canvas>` inside is `aria-hidden`. Focus shows `.focus-ring-accent` (3-dot accent ring,
  forced-colours-safe, `app/globals.css:1062-1066`).
- **One hidden live region** (`role="status"`, polite) in the canvas area speaks the view lines (`Deck view.` … `Back to the
  first view.`, `Back to 1x.`). The Export status line is the second, visible one. Both are always in the DOM.
- **Order**: on a computer the aside comes first in the page (the shell's DOM order, `components/design/design-screen-shell.tsx:256-292`): title,
  SHOW, VIEW, EXPORT, Back, footer, then the canvas and its toolbar. On a phone the canvas draws first but the order is the same.
- **Touch targets**: 44 on a coarse pointer for every control (§ Spacing); the toolbar buttons' 44-dot touch box is inherited
  (`components/viewer/zoom-viewport.tsx:534`).
- **Everything the drawing shows is also a word**: the board's name, which view, and the export's result. A screen-reader user
  can pick each view and export without ever turning the board by hand.

### 14. The pure functions this contract implies (Rule 1; the planner writes the tests)

| Function | Lives in | Decides |
|----------|----------|---------|
| `screenWord` (amended) | `lib/screen-steps.ts` | `3D` stays `3D` |
| `threeDTileArt` | `lib/geometry/screen-tiles.ts` | The 3D tile and loading picture: the rack's 50° turn lying nose-left, with its stringer |
| The view turns | `lib/geometry/` (a small views module) | Each preset view's turn of the board; Side equals ROCKER's side, Deck equals TEMPLATE lying nose-left, Nose/Tail end-on |
| 1x framing | same | The distance at which the board's box in a view fills 85% of a canvas's tighter direction |
| The fin outline | `lib/geometry/` (beside `fins.ts`) | §3's proportions from a base length |
| The safe file stem and the export's names | `lib/models/board-file.ts` | §Copywriting's names; `boardFileName` reads the same stem |
| The Hard Edge Ends At slider and formatter (D-20) | `lib/geometry/blank-reasons.ts` or beside the rail maths | 14"–24" in 1/2" through `measureSlider`; the value through `formatDim`; an absent field reads 18" |
| The hard edge's blend weight (D-20) | `lib/geometry/volume.ts` / the rail maths | 1 up to the 12" station, easing to 0 at the set distance — the one rule the litres, the 3D surface and the STL all read |

Expected values come from the app's own functions or generated fixtures, never typed (Rule 1).

### 15. Specs that count six (integration notes for the planner)

| Spec | What it pins | Change |
|------|--------------|--------|
| `e2e/helpers/screens.ts:14-21` | `SCREENS`, the shared six | Add `3D`; `expectSixTilesInMenu` (`:73`) becomes a seven-tile check |
| `e2e/phone-screen-tiles.spec.ts` | Six tiles (`:87`), 3 × 2 upright (`:184-190`), one row of six over 120 wide sideways (`:140-152`), six desktop links (`:448`) | Seven; 4 × 2; one row of seven, floor 104 |
| `e2e/phone-layout.spec.ts` | Six tiles (`:94`), names whole at 360 / 375 / 393 (`:126-150`) | Seven; the wholeness loop unchanged (it passes, measured) |
| `e2e/phone-screens.spec.ts`, `e2e/phone-home.spec.ts` (`:131` six desktop links), `e2e/legal-pages.spec.ts:76`, `e2e/error-pages.spec.ts:59`, `:86` | Six tiles via the helper | Follow the helper; seven links |
| `e2e/phone-trip.spec.ts` | Walks all six, ends on SUMMARY (`:74`) | Walk seven, end on 3D |
| `e2e/step-nav.spec.ts` | Hand-written six, SUMMARY has no Next (`:8`, `:80`) | 3D has no Next; SUMMARY's Next reads `3D` |
| `e2e/board-lock-screens.spec.ts:558` | All six greyed in turn | Add 3D: nothing greyed, Export downloads on a locked board |
| `e2e/touch-sizing.spec.ts:199`, `e2e/app-settings.spec.ts:56` | Six tiles | Seven |
| `e2e/site-nav-width.spec.ts` | The row fits 820–870 and 1024–1280 | Re-run with the new gaps (§11) |
| `e2e/desktop-baseline.spec.ts` | Five pictures | Re-record all five, nav row only (§10) |
| `e2e/fit-defaults.spec.ts`, `e2e/rocker-panel.spec.ts`, `e2e/legal-pages.spec.ts:63` | Other sixes | No change |
| `e2e/rails-advanced.spec.ts` (D-20) | The tail's Advanced rows | Add: the Hard Edge Ends At row shows only with Hard Edge on, sits above Reset, keeps its value through Hard Edge off and on, reads 18" on a board without the field, reads centimetres in Metric |
| Litres anywhere a hard-edged tail is pinned (VOLUME specs, preset cards, the golden fixtures) (D-20) | A litres figure | Regenerate from the scripts; never hand-type the new figure (Rule 1) |

Words that say "six" and become "seven": `components/site-nav.tsx:26-29`, `components/design/step-nav.tsx:4-8`,
`lib/screen-steps.ts:1-9`, `components/design/screen-tiles.tsx:3-22`, CLAUDE.md's Layout section, and
`.claude/skills/sketch-findings-shaper/references/phone-chrome.md` (decisions 1 and 3).

### 16. States

| State | What the shaper sees |
|-------|----------------------|
| **First paint** | The canvas box, ground colour only |
| **Loading** | The turned silhouette; after 1 s `Getting the 3D view ready…` |
| **Resting** | The board in the first view, lit, Fins on, Blank and stripes off |
| **Turning / sliding / zooming** | The board follows the hand exactly; highlights move across it; glide on release (none under reduced motion) |
| **A view picked** | A 400 ms turn to it, re-framed at 1x; spoken |
| **Fins off** | No fins; nothing else moves |
| **Blank on** | The glassy ghost round the board, its edge line |
| **No blank** | Blank row dimmed, hint `No blank on this board — pick one on ROCKER to see it here.` |
| **Contour Stripes on** | Bands in place of the shading, fixed in the room, sliding as the board turns |
| **Zoomed in** | Zoom row shows (touch) or wakes (mouse); Back to 1x and double-click return |
| **Wide view** (computer) | Sidebar hidden, the board re-framed wider at the same level |
| **Exported** | Done line with the file name and slice count |
| **Export failed** | `Couldn't make the files — try again.` in warning ink |
| **Can't be built** | The can't-build message; Export dimmed with its line; switches and views dimmed |
| **No WebGL** | The no-WebGL message; switches and views dimmed; Export live |
| **Didn't load** | The didn't-load message |
| **Locked board** | Exactly as unlocked |
| **Signed out** | Exactly as signed in |
| **Metric** | Nothing on screen differs; the files are millimetres either way |
| **Light themes** (Daylight, Chalk) | White foam on warm grey, read by its shading; dark navy stringer |
| **Slate** | Near-white foam on near-black, a strong silhouette; near-black stringer |
| **Phosphor** | White foam on dark green (the founder's call over a green board, 2026-11-03); near-black stringer |
| **Theme changed while open** | Recoloured at once, the view kept |
| **Window resized / phone turned** | Layout follows width; turn and level kept, re-framed |
| **A long board name** | The tab band truncates it as on every screen; the file stem cuts at 80 letters; the canvas's spoken name is the full band name |
| **Forced colours** | The focus ring stays visible (`.focus-ring-accent`'s transparent outline); the canvas is a picture the system doesn't recolour — a visual check, not a rule |

### 17. RAILS: Hard Edge Ends At (D-20)

**What it is.** One slider in the **tail's** Advanced menu on RAILS, setting how far from the tail the hard edge has faded
into the tucked rail. It exists only on the tail (the nose and centre have no Hard Edge), and only while the tail's Hard
Edge box is ticked.

**Where it sits — last of the tail's Advanced sliders, directly above `↺ Reset Advanced Settings`.** With Hard Edge on, the
tail's Advanced menu today reads: Scaled from center by, Apex Thickness, Deck Mark 1, Deck Mark 3, Domed Deck Band, then
Reset (`components/rails/rail-controls.tsx:338-422`) — the tuck rows (Use Single Tuck, Bottom Tuck 1 and 3, Sharp Bottom
Tuck) are hidden on a hard-edged tail (`showTucks`, `:223`). So "under the tail's tuck nudges" is not a place that exists
while this slider shows; the new row takes exactly the spot those bottom-of-the-rail rows hold on a tucked tail, after
Domed Deck Band and before Reset. That keeps D-20's "under the tail's existing Advanced rows", keeps the menu reading deck
to bottom (the hard edge is the bottom's edge), and keeps Reset last as it always is. "Right after Hard Edge" was rejected:
Hard Edge is a tick box in the rail's main rows under Ratio (`:324-329`), outside the Advanced menu, and D-20 puts the
slider in the menu.

**The row, in the existing idiom.** A `SliderRow` built like `nudgeRow` (`components/rails/rail-controls.tsx:200-219`):
`label` with the value read out after an em dash, `sliderLabel` and `sliderValueText` as § Copywriting gives them, the
slider's range and steps from the same `measureSlider` call the Thinning Starts slider makes
(`lib/geometry/blank-reasons.ts:303-315`): **14" to 24" in 1/2" steps**, Metric steps of 1 cm with the label to one
decimal, every Metric drag stored as a whole millimetre (`measure-display.ts`'s `toMm`). Locked board: greyed and disabled
like every Advanced row (`SliderRow` reads the lock itself). Coarse pointer: `SliderRow`'s own 44-dot thumb ring.
Measured: the longest label, Metric `Hard Edge Ends At — 45.7 cm`, is under 198 dots in Inter, inside the 248-dot Advanced
column at an 820 window (260 less the menu's `pl-3`), so it is one line at every width.

**States.**

| State | What the shaper sees |
|-------|----------------------|
| Hard Edge off | No row (hidden, not dimmed — the tuck rows show instead, as today) |
| Hard Edge ticked on | The row appears above Reset, reading the stored value |
| Hard Edge off then on again | The same value as before — turning Hard Edge off never clears it |
| A board saved before this phase (no field) | Reads `18"` (`45.7 cm`); nothing is written until the shaper drags |
| `↺ Reset Advanced Settings` | Returns it to 18" with the rest, in the same one undo step `(Claude's discretion — founder may overrule)` |
| Metric | `Hard Edge Ends At — 45.7 cm`; dragging steps whole centimetres |
| Advanced closed | Nothing visible, as for every Advanced row |
| A phone, upright | The same row in the same place, under the NOSE/CENTER/TAIL switch's tail (the existing phone rule, `components/rails/rail-controls.tsx:461-467`) |

**What moves elsewhere, with no new words.** The litres take the same rule (D-20, D-05), so on a hard-edged tail VOLUME's
figure, the litres on every card and tile, and the order form's litres can move a little; nothing on screen says so
(D-18). The RAILS plots and DATA tab show the tail station's own section as today. The preset figures that carry a hard
edge are regenerated by their script, and the saved-boards report before go-live (14 D-18) lists the move per board
(D-20). If the default board's tail is hard-edged, `volume-desktop.png`'s litres figures move too and are re-recorded
with the nav row (§10) after a diff shows only those figures and the row changed.

---

## Where this contract reads CONTEXT one way of two

None of these changes a locked decision; each is a reading the founder can reverse.

| Decision | Reading here | The other reading |
|----------|--------------|-------------------|
| D-04 "the zoom and full-screen buttons the other screens have" | Full screen = the app's Wide view; zoom = the inherited zoom row | A browser full-screen button (not possible for a canvas on iPhone Safari) |
| D-13 "on a touch screen the drawing's zoom buttons stay beside the pinch" | The inherited touch rule: level and Back to 1x once zoomed | `+` and `−` drawn on touch too, on this screen only |
| D-08 "only offered when a blank is picked" | The row is dimmed with its reason (ruled by the founder 2026-11-03: this reading) | The row is not drawn |
| D-02 "the page title" | ~~`3D — Shaper Assistant`~~ → `3D Board — Shaper Assistant` (ruled by the founder 2026-11-03: the descriptive title) | `3D — Shaper Assistant`, D-02 read literally |

---

## Open items for the planner

None blocks the plan.

1. **The light themes' edge.** Prove with a rest-view picture in Daylight and Chalk that the board's outline reads all round
   (§ Color); tune the overhead strength first.
2. **Glide and timings on a real iPhone and the founder's iPad** (Safari before 18.4): one-finger turn, two-finger pinch and
   slide, double-tap, and that the page never scrolls from the canvas.
3. **The download inside the tap** on a real iPhone, if the build turns out asynchronous (§7).
4. **The 360-wide tile row**: look once at `TEMPLATE` 2.6 dots inside its border.
5. **The 3D baseline picture**: decide with research whether software WebGL is stable enough to pin, or mask the canvas.
6. **CLAUDE.md and the skill's phone-chrome note** say six screens; both become seven with the code.

---

## UI Considerations

**Coverage:** 66 applicable considerations across 16 surfaces — 63 resolved explicitly, 3 resolved by backstop, 0 unresolved. Probed 2026-11-03 by the orchestrator's Step 9.5 run of `ui-consideration-probe.cjs` with authored element kinds; resolutions under the `--auto` convention (Claude resolved explicit or backstop, never dismissed), so the founder may revisit any row. The founder ruled on the discretion calls the same evening (Title Case, the first view, the Blank row dimmed, white foam in Phosphor, the page title) and the checker's two flags are applied.

### E01 — The 3D canvas
_Kinds: media, interactive-control_

| State | How it resolves | |
|---|---|---|
| Empty / no data | Never empty: before the script runs the canvas box is painted the ground colour; once live it holds the loading picture, then the board; a board the surface can't be built for shows the can't-build message (§8, §9). | ✅ covered |
| Loading / in-flight | The board's turned silhouette at 50°, nose left, at the rest view's 1x size, the region aria-busy; after 1 s 'Getting the 3D view ready…' under it; the lit board replaces it in one frame, no fade (§9). | ✅ covered |
| Error / failure | Three canvas messages, each two lines max-w-[280px] centred: no WebGL (Export stays live), can't be built (Export dimmed with its line), didn't load; a drawing context lost for a moment is restored silently with the view kept (§8). | ✅ covered |
| Populated / happy path | The board in the first view — the side view turned 50° toward the viewer, nose left, filling 85% of the window — lit by the room's lights, Fins on, Blank and stripes off (§3, §16 Resting). | ✅ covered |
| Long text | No text is drawn on the canvas except the three messages (fixed copy, two short lines); the canvas's spoken name is the band's full board name, never cut (§13). | ✅ covered |

### E02 — The corner toolbar and zoom row
_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| Loading / in-flight | Wide view is present from the first paint; the zoom row appears with the board and is hidden while a canvas message shows (§4, §8). | ✅ covered |
| Error / failure | While a canvas message shows the zoom row is hidden and Wide view stays, since it still widens the window (§8). | ✅ covered |
| Long text | Inherited words only — Wide view, Zoom, Back to 1x, Zoom in/out, 1x…10x — on fixed-size controls; nothing wraps (Copywriting: the corner toolbar). | ✅ covered |

### E03 — The Fins switch
_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| Empty / no data | Always offered: every board has a fin setup, so the box is never without fins to show; on by default (D-06, §6). | ✅ covered |
| Loading / in-flight | Live while the drawing loads; a tick made while loading applies when the board appears (§9). | ✅ covered |
| Error / failure | Dimmed (disabled) while a canvas message shows — can't be built, no WebGL, didn't load (§8). | ✅ covered |
| Partial / incomplete | A two-state tick box with no partial state; it never writes to the design (view-only, data-lock-exempt) (§6, §9). | ✅ covered |
| Long text | One word, 'Fins', on the panel's tick-box row; nothing to wrap (Copywriting: the side panel). | ✅ covered |

### E04 — The Blank switch and its hint
_Kinds: form, interactive-control, static-content_

| State | How it resolves | |
|---|---|---|
| Empty / no data | No blank on the board: the row is dimmed and can't be ticked, with the hint 'No blank on this board — pick one on ROCKER to see it here.' (D-08, §6). | ✅ covered |
| Loading / in-flight | Live while the drawing loads; a tick made while loading applies when the board appears (§9). | ✅ covered |
| Error / failure | Dimmed while a canvas message shows (§8). | ✅ covered |
| Partial / incomplete | Two-state; the only extra is the hint when no blank is picked (§6). | ✅ covered |
| Overflow / truncation | The hint is 12/400 muted and wraps within the panel's 260–340-dot width, measured in §1; nothing clips. | ✅ covered |
| Long text | Fixed copy: 'Blank' and its one-sentence hint, wrapping to two lines at 260 dots (§1). | ✅ covered |

### E05 — The Contour stripes switch and its hint
_Kinds: form, interactive-control, static-content_

| State | How it resolves | |
|---|---|---|
| Empty / no data | Always offered, off by default (D-12); the hint is always shown (Copywriting: the side panel). | ✅ covered |
| Loading / in-flight | Live while the drawing loads; a tick made while loading applies when the board appears (§9). | ✅ covered |
| Error / failure | Dimmed while a canvas message shows (§8). | ✅ covered |
| Partial / incomplete | Two-state; no partial state. | ✅ covered |
| Overflow / truncation | The hint 'Bands of light that kink at a bump or a flat spot.' wraps within the panel's width (§1). | ✅ covered |
| Long text | Fixed copy, one sentence; wraps, never clips (§1). | ✅ covered |

### E06 — The five view buttons
_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| Loading / in-flight | Live from the first paint; a view picked while loading is applied when the board appears (§9). | ✅ covered |
| Error / failure | Dimmed while a canvas message shows (§8). | ✅ covered |
| Long text | Five one-word labels (Deck, Bottom, Side, Nose, Tail) in a 3/2 grid sized at the 260-dot panel; no wrapping (§1). | ✅ covered |

### E07 — Reset view
_Kinds: interactive-control_

| State | How it resolves | |
|---|---|---|
| Loading / in-flight | Live from the first paint; applied when the board appears (§9). | ✅ covered |
| Error / failure | Dimmed while a canvas message shows (§8). | ✅ covered |
| Long text | 'Reset view' on its own full-width row, because it doesn't fit a third-width cell at 260 dots (§1). | ✅ covered |

### E08 — Export for CNC…, its note and status line
_Kinds: interactive-control, static-content_

| State | How it resolves | |
|---|---|---|
| Loading / in-flight | No visible working state in the normal case: the zip is built and downloaded inside the tap (Safari's rule); only if research makes the build asynchronous is the button disabled with 'Making the files…' (§7). | ✅ covered |
| Error / failure | 'Couldn't make the files — try again.' in warning ink, logged; pressing Export again is the retry. A board that can't be built: Export disabled, 'There's nothing to export until the board can be drawn.' No WebGL: Export stays live (§7). | ✅ covered |
| Overflow / truncation | The done line wraps within the panel; the file stem is cut at 80 letters by the board-file rule, so the longest line is bounded (§7, the export's file names). | ✅ covered |
| Long text | The note is fixed copy (D-15 verbatim) and wraps; the done line carries the file name in ink and the slice count from the writer (Copywriting: the side panel). | ✅ covered |

### E09 — The desktop nav row's 3D link
_Kinds: nav_

| State | How it resolves | |
|---|---|---|
| Loading / in-flight | A server-rendered link in NAV_LINKS; no loading state (§10). | ✅ covered |
| Error / failure | A plain link; a bad address falls to the app's own not-found screen, unchanged. | ✅ covered |
| Overflow / truncation | The row's gap steps gap-3 lg:gap-4 xl:gap-5 so seven links and the account control fit from 820 to 1440 with no wrap; 1280 and wider unchanged (§11). | ✅ covered |
| Long text | '3D' is the shortest label in the row; the labels are fixed uppercase words (§10). | ✅ covered |

### E10 — The phone sheet's seven tiles and the 3D tile
_Kinds: nav, media_

| State | How it resolves | |
|---|---|---|
| Empty / no data | The sheet always lists the seven screens and a board is always in the store, so the tiles are never empty (§10). | ✅ covered |
| Loading / in-flight | Tiles draw from the store synchronously when the sheet opens; no loading state (§10). | ✅ covered |
| Error / failure | A board whose tile picture can't be built takes the tiles' existing fallback for an undrawable board; the planner confirms the fallback with a test on a board outside the length range. | 🧪 backstop |
| Populated / happy path | Four by two upright (TEMPLATE ROCKER RAILS VOLUME / FINS SUMMARY 3D), one row of seven at the shell width; the 3D tile shows the turned board at 50° with the line 'Spin and export' (§10). | ✅ covered |
| Overflow / truncation | Seven in one row at 844 and 863 dots measure 110.3 and 113.0 wide; phone-screen-tiles' 120-dot floor becomes 104 (§15). | ✅ covered |
| Long text | The 3D tile's words are the shortest on the sheet; TEMPLATE at 360 wide sits 2.6 dots inside its border, tracking drops to 0.1em if the founder finds it cramped (open item 4). | ✅ covered |

### E11 — The Back and Next pair on SUMMARY and 3D
_Kinds: nav_

| State | How it resolves | |
|---|---|---|
| Loading / in-flight | Static links read from NAV_LINKS; no loading state (§10). | ✅ covered |
| Error / failure | Plain links; nothing can fail. | ✅ covered |
| Overflow / truncation | SUMMARY's row holds Back ← Fins (flex-[0.8]) and Next 3D → (flex-1) inside max-w-80; 3D's Back ← Summary alone fills its row (§10). | ✅ covered |
| Long text | Fixed one-word labels; screenWord is changed so '3D' shows as written rather than '3d' (Copywriting: where the screen is named). | ✅ covered |

### E12 — The can't-build message
_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| Overflow / truncation | Centred on the canvas, max-w-[280px], px-4, two lines gap-1; wraps, never clips (§8). | ✅ covered |
| Long text | Fixed copy: 'This board can't be drawn in 3D.' / 'Check its outline on TEMPLATE and its rocker on ROCKER.' (Copywriting: on the canvas). | ✅ covered |

### E13 — The no-WebGL and didn't-load messages
_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| Overflow / truncation | Same box as every canvas message: max-w-[280px], centred, two lines (§8). | ✅ covered |
| Long text | Fixed copy, two short lines each; never 'WebGL', 'mesh' or 'GPU' in a shaper's face (Copywriting: on the canvas). | ✅ covered |

### E14 — The loading picture
_Kinds: media, static-content_

| State | How it resolves | |
|---|---|---|
| Empty / no data | Before the page's script runs the canvas is the ground colour alone — the server cannot draw the board (§9 step 1). | ✅ covered |
| Loading / in-flight | The turned silhouette at 50°, nose left, centred at the rest view's 1x size, in the 3D tile's grammar; after 1 s 'Getting the 3D view ready…' under it (§9). | ✅ covered |
| Error / failure | If the drawing's code never arrives, the didn't-load message replaces the picture (§8). | ✅ covered |
| Populated / happy path | Replaced by the lit board in one frame, no fade; aria-busy clears (§9 step 4). | ✅ covered |
| Overflow / truncation | Sized to the rest view's framing (85% of the window's shorter side), so it never overflows the canvas (§3, §9). | ✅ covered |
| Long text | One short line under it, 12/400 muted (Copywriting: on the canvas). | ✅ covered |

### E15 — The panel title, subtitle and tab band
_Kinds: static-content_

| State | How it resolves | |
|---|---|---|
| Overflow / truncation | The subtitle wraps within the panel at 260–340 dots (§1); the tab band truncates a long board name by its own rule (§16). | ✅ covered |
| Long text | '3D Board' is fixed; the subtitle is one sentence; a long board name is truncated in the band as on every screen and spoken in full as the canvas's name (§16, §13). | ✅ covered |

### E16 — RAILS' Hard edge ends at slider
_Kinds: form, interactive-control_

| State | How it resolves | |
|---|---|---|
| Empty / no data | Hidden while the tail's Hard Edge is off; a saved board without the field reads 18"; Reset Advanced Settings returns it to 18" (D-20, §17). | ✅ covered |
| Loading / in-flight | A slider in RAILS' Advanced menu, rendered synchronously from the store; no loading state (§17). | ✅ covered |
| Error / failure | A stored value outside 14"–24" or not a number reads as 18" without rewriting the board, the Thinning Start's rule (14 D-24); the planner pins it with a snapshot test. | 🧪 backstop |
| Partial / incomplete | Two-state visibility (Hard Edge on or off); the value is kept through off and on and only the slider changes it (§17). | ✅ covered |
| Long text | The label 'Hard edge ends at — 45.7 cm' (Metric, the longest) must fit the slider row's label line at the 260-dot panel; the planner measures it with the row's own classes before building. | 🧪 backstop |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none new this phase (`Button`, `Checkbox` already installed and used) | not required |

`components.json` declares `"registries": {}`. There is no third-party registry, so the vetting gate has nothing to run on.
The phase's new npm packages (a renderer, perhaps a zip writer) are not shadcn registry blocks; vetting and bundle size are
research's (CONTEXT, Claude's Discretion).

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS with FLAG — capitalisation; ruled Title Case by the founder 2026-11-03, applied
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS with FLAG — the light themes' foam edge; the fallback is pre-committed in Color
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-11-03 (gsd-ui-checker 6/6; probe written back)
