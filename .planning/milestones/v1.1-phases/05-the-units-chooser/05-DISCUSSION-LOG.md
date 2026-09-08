# Phase 5: The Units Chooser - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 5-The Units Chooser
**Areas discussed:** Metric number rules, Chooser in the gear menu, Sign-in and sign-out handoff, Preset cards gain dimensions

---

## Todo cross-reference (before the gray areas)

Eleven pending todos matched Phase 5 by keyword. Presented three as candidates; the other eight
were keyword-only matches already reviewed and declined in Phases 3 and 4.

| Option | Description | Selected |
|--------|-------------|----------|
| Units toggle todo (Recommended) | The phase's own origin (Phase 1 UAT); tagged `resolves_phase: 5` by the roadmap commit | ✓ |
| SliderRow extraction | Sliders are Phase 6 work; folding pulls slider refactoring into the chooser phase | ✓ |
| Viewer toolbar button | Toolbar styling on Template and Rocker; no units connection | ✓ |

**User's choice:** all three folded.
**Notes:** the two extraction todos are recorded as groundwork sequenced after the chooser and
cards, each keeping its own constraints (conversion visible at the call site; update
`rocker-editor.tsx`'s header comment).

---

## Metric number rules

### Q1 — How precise should centimetre values read?

| Option | Description | Selected |
|--------|-------------|----------|
| One decimal everywhere (Recommended) | 188.0 × 51.4 × 6.7 cm; a tenth of a cm is one mm, matches Phase 6's whole-mm slider steps | ✓ |
| Whole cm for length, one decimal for the rest | 188 × 51.4 × 6.7 cm, the roadmap criterion's literal example; two rules | |
| Strip a trailing .0 | 188 × 51.4 × 6.7 cm, but a 50.0 cm width would read 50 | |

**User's choice:** One decimal everywhere.

### Q2 — How does the headline thickness read on a dims line?

| Option | Description | Selected |
|--------|-------------|----------|
| cm on the dims line (Recommended) | 188.0 × 51.4 × 6.7 cm; five-station foil values still whole mm on the datasheet in Phase 6 | ✓ |
| mm everywhere thickness appears | 188.0 × 51.4 cm × 67 mm; one rule, mixed-unit line | |

**User's choice:** cm on the dims line.

### Q3 — Where does the unit sit on a metric dims line?

| Option | Description | Selected |
|--------|-------------|----------|
| Once at the end, × between (Recommended) | 188.0 × 51.4 × 6.7 cm · 34.0 L; imperial line unchanged | ✓ |
| On every number, · between | 188.0 cm · 51.4 cm · 6.7 cm · 34.0 L; mirrors imperial structure | |

**User's choice:** Once at the end, × between.

### Q4 — When a shaper types a bare number into a Metric field, what is it?

| Option | Description | Selected |
|--------|-------------|----------|
| The field's own unit, suffix overrides (Recommended) | cm field reads 51.4 as cm, mm field reads 67 as mm; "514 mm" / "6.7 cm" override | ✓ |
| Always cm unless suffixed | Bare numbers are cm; whole-mm datasheet figures need the suffix every time | |
| Decimals are cm, whole numbers are mm | No suffix ever, but a typed 51 silently becomes 51 mm | |

**User's choice:** The field's own unit, suffix overrides.
**Continue check:** Next area.

---

## Chooser in the gear menu

### Q1 — Where does the Units group sit relative to Theme?

| Option | Description | Selected |
|--------|-------------|----------|
| Above Theme (Recommended) | Two rows open the menu; Theme follows beneath | ✓ |
| Below Theme | Theme stays where shapers learned it; Units appended | |

**User's choice:** Above Theme.

### Q2 — What do the two rows say?

| Option | Description | Selected |
|--------|-------------|----------|
| Label + a live example (Recommended) | Imperial — 6'2" · 20 1/4" · 2 5/8"; Metric — 188.0 × 51.4 × 6.7 cm | ✓ |
| Label + a description | Imperial — feet, inches and fractions; Metric — centimetres and millimetres | |
| Label only | Just Imperial and Metric | |

**User's choice:** Label + a live example.

### Q3 — Icon and close behaviour?

| Option | Description | Selected |
|--------|-------------|----------|
| Ruler icon, menu stays open (Recommended) | Same shape as a theme row; cards re-label behind the open menu | ✓ |
| Ruler icon, menu closes on pick | One-shot decision; differs from theme rows | |
| No icon, menu stays open | Text-only rows | |

**User's choice:** Ruler icon, menu stays open.

### Q4 — A reassurance line under the group?

| Option | Description | Selected |
|--------|-------------|----------|
| No line (Recommended) | As terse as Theme; nothing moving is the proof | ✓ |
| One quiet line under the group | Muted sentence: saved boards are untouched | |

**User's choice:** No line.
**Continue check:** Next area.

---

## Sign-in and sign-out handoff

### Q1 — Account says Metric, browser was Imperial; account wins. What does the browser remember afterwards?

| Option | Description | Selected |
|--------|-------------|----------|
| Browser adopts the account's choice (Recommended) | One stored value that mirrors the screen; sign-out changes nothing | ✓ |
| Browser keeps its own choice underneath | Imperial comes back on sign-out; two values to reconcile | |

**User's choice:** Browser adopts the account's choice.

### Q2 — Untouched browser signs in to an account with no saved choice. What gets written?

| Option | Description | Selected |
|--------|-------------|----------|
| Nothing; only an explicit pick is promoted (Recommended) | Browser stores nothing until a pick; account stays empty | ✓ |
| Write Imperial to the account | Account always has a value after first sign-in; default indistinguishable from choice | |

**User's choice:** Nothing; only an explicit pick is promoted.

### Q3 — Signed in, the shaper picks Metric. When does the screen switch, and what if the save fails?

| Option | Description | Selected |
|--------|-------------|----------|
| Switch now, save quietly, retry on failure (Recommended) | Re-label on click; background write with autosave-style retries | ✓ |
| Switch only once the account confirms | Menu waits for the save; visible pause | |

**User's choice:** Switch now, save quietly, retry on failure.

### Q4 — A Metric shaper reloads. Is a moment of inches acceptable?

| Option | Description | Selected |
|--------|-------------|----------|
| Never a blink (Recommended) | Server must know the system at render: cookie mirror beside localStorage, account value read for signed-in shapers | ✓ |
| A brief blink is fine | localStorage only, mirroring the theme exactly | |

**User's choice:** Never a blink.
**Continue check:** Next area.

---

## Preset cards gain dimensions

### Q1 — What does a preset card's new dimensions line show?

| Option | Description | Selected |
|--------|-------------|----------|
| Same four numbers as a rack card (Recommended) | Length · width · thickness · litres via summarizeDesign() | ✓ |
| Length × width only | The two numbers the success criterion mentions | |
| Length × width × thickness, no litres | The three dims a shaper quotes | |

**User's choice:** Same four numbers as a rack card.

### Q2 — Where does the line sit relative to the prose descriptor?

| Option | Description | Selected |
|--------|-------------|----------|
| Under the name, descriptor beneath (Recommended) | Thumbnail, name, dims, descriptor, Start Shaping | ✓ |
| Replace the descriptor | Thumbnail, name, dims, Start Shaping | |
| Descriptor first, dims beneath | Thumbnail, name, descriptor, dims, Start Shaping | |

**User's choice:** Under the name, descriptor beneath.

### Q3 — Should the setup screen hint that the numbers can be switched?

| Option | Description | Selected |
|--------|-------------|----------|
| No hint (Recommended) | The gear is where settings live | ✓ |
| One quiet line, until first pick | Muted line near the cards until the chooser is touched | |

**User's choice:** No hint.
**Wrap-up check:** "I'm ready for context."

---

## Claude's Discretion

- Shape of the per-user preference storage (Drizzle + Neon locked; no users table exists; nullable)
- Provider/hook shape and naming, storage key and cookie name, cross-tab sync
- Which board the menu's live example quotes
- Rounding mode for cm/mm formatting and the exact UNIT-05 round-trip tests
- Sequencing of the two folded extraction todos after the chooser and cards
- CLAUDE.md Rule 2 rewording, the Units group label, all plain-English copy
- Whether Playwright is needed (Phase 3 stance: only if acceptance genuinely needs it)

## Deferred Ideas

None new. Eight keyword-matched todos reviewed and left in the backlog (listed in CONTEXT.md).
`components/setup/continue-board-card.tsx` noted as dead code (not imported anywhere).
