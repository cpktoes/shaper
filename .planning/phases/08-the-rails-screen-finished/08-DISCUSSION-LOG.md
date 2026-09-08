# Phase 8: The Rails Screen, Finished - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-07
**Phase:** 8-the-rails-screen-finished
**Areas discussed:** Plan & side reference view, The print toggle and its sheet, View Full Sized, The example rail and its callouts

---

## Todos folded

| Option | Description | Selected |
|--------|-------------|----------|
| Rails: port the INSTRUCTIONS page (Recommended) | Tagged resolves_phase: 8; carries the deferral notes, the PNG's location and the halveDeckMark1 warning | ✓ |
| Rails viewer: View Full Sized + plan view (Recommended) | Tagged resolves_phase: 8; the 1:1 modal ships independently of the tiled template; the store removed the plan-view blocker | ✓ |
| Copy-spec-to-clipboard across screens | Keyword match only; a new capability across four screens | |
| Mobile/phone-width layout polish | Keyword match only; Phase 9's job | |

**User's choice:** the two rails todos. Five further keyword matches (photo uploads, fins tail curve, presets for rails, bottom contours, order-form branding) logged as reviewed, not folded.

---

## Plan & side reference view

| Option | Description | Selected |
|--------|-------------|----------|
| The prototype's example board (Recommended) | Faithful port: PNG plan outline to public/, hand-traced deck-mark/rail-mark/tuck curves, side strip, legend toggles; no new geometry | ✓ |
| Your own board, station lines only | The real outline and side profile with the three stations marked; no offset curves, but no band curves either | |
| Your own board with the mark curves inset | The prototype's unrendered offset-curve builder on the real outline; new geometry under Rule 1, reopens the roadmap's settled constraint | |

**User's choice:** The prototype's example board.

| Option | Description | Selected |
|--------|-------------|----------|
| On the INSTRUCTIONS tab (Recommended) | Beneath the example rail, as in the prototype; what the print sheet reproduces | ✓ |
| On the VIEWER tab beside the three plots | Always in view; shares the height solver's space and shrinks the plots | |
| Its own fourth tab | VIEWER / DATA / INSTRUCTIONS / BOARD; one more tab to reach on a phone | |

**User's choice:** On the INSTRUCTIONS tab.

| Option | Description | Selected |
|--------|-------------|----------|
| All nine ticked (Recommended) | The prototype's default; the full picture first | ✓ |
| Marks on, bands off | Solid mark lines only to start | |
| You decide | Claude picks during planning | |

**User's choice:** All nine ticked.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it as written (Recommended) | The prototype's words with only the units rule applied (16-22" → 41–56 cm; @12" → @ 30.5 cm) | ✓ |
| Keep the steps, drop the italic note | The performance disclaimer goes | |
| Let Claude tighten the wording | Re-edited for length in the UI-SPEC pass | |

**User's choice:** Keep it as written.
**Notes:** Chose "Next area" at the continue check; no further questions.

---

## The print toggle and its sheet

| Option | Description | Selected |
|--------|-------------|----------|
| Unticked (Recommended) | An untouched shaper prints today's two-page form exactly; what PRNT-06 proves | ✓ |
| Ticked, as in the prototype | Every printout gains the page unless opted out | |

**User's choice:** Unticked.

| Option | Description | Selected |
|--------|-------------|----------|
| Saved with the board (Recommended) | A snapshot field like finSystem; version 4 with backfill, no database migration | |
| For this session only | On the store outside the snapshot; cleared on reload | |
| A shaper preference, like units | Follows the shaper: account when signed in, browser otherwise; preferences infrastructure inside a rails phase | ✓ |

**User's choice:** A shaper preference, like units — against the recommendation; it describes how the shaper prints, not what the board is.

| Option | Description | Selected |
|--------|-------------|----------|
| Full parity with units (Recommended) | Nullable column on the user_preferences row, localStorage + cookie mirror, Phase 5 handoff rules verbatim; one migration after deploy | ✓ |
| Per browser only | localStorage and cookie only; devices can disagree | |

**User's choice:** Full parity with units.

| Option | Description | Selected |
|--------|-------------|----------|
| A fixed reference sheet (Recommended) | Always the Flat example and every legend line; reproducible | ✓ |
| Whatever the tab shows right now | The prototype's print-what-you-see; screen-only state so prints differ | |
| Both Flat and Domed examples, every line | Two rails side by side; tight on one portrait page | |

**User's choice:** A fixed reference sheet.

| Option | Description | Selected |
|--------|-------------|----------|
| Its own third page, at the back (Recommended) | Order form, shaper's reference, then page 3 of 3; page 2 untouched; unticked marks still read "of 2" | ✓ |
| Its own page, between the form and the reference | Read the key before the numbers | |
| Squeezed onto page 2 | Shrinks the frozen panels; contradicts Phase 7 D-09 | |

**User's choice:** Its own third page, at the back.

| Option | Description | Selected |
|--------|-------------|----------|
| Rails sidebar plus a mirror by Print Order Form (Recommended) | One preference, two places; the third sheet appears on screen when ticked | ✓ |
| Rails sidebar only | Exactly what PRNT-05 names | |

**User's choice:** Rails sidebar plus a mirror by Print Order Form.
**Notes:** Chose "Next area" at the continue check.

---

## View Full Sized

| Option | Description | Selected |
|--------|-------------|----------|
| One toolbar button, section switch inside (Recommended) | A single "View Full Sized" toolbar button; Nose / Center / Tail tabs inside the dialog | ✓ |
| A button on each open rail plot | The prototype's per-plot buttons | |

**User's choice:** One toolbar button, section switch inside.

| Option | Description | Selected |
|--------|-------------|----------|
| No Print button (Recommended) | RAIL-04 is about the screen; a printed 1:1 rail noted as deferred | |
| Keep it | A paper 1:1 rail to hold against foam; a new print path to build and prove | ✓ |

**User's choice:** Keep it — against the recommendation.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, a 2-inch bar (Recommended) | From the template's scale-square constant, captioned 2 in / 50.8 mm; a passive check | ✓ |
| The caveat line only | One sentence, nothing to measure | |

**User's choice:** Yes, a 2-inch bar.

| Option | Description | Selected |
|--------|-------------|----------|
| The VIEWER plot at true scale (Recommended) | Grid, ticks, bands, dots as the VIEWER draws them, legend beneath | ✓ |
| The plot plus the mark names | Names beside each mark as on the INSTRUCTIONS rail | |
| A bare rail | Curve and dots only | |

**User's choice:** The VIEWER plot at true scale.

| Option | Description | Selected |
|--------|-------------|----------|
| Browser print of the dialog (Recommended) | The dialog's content under @media print: rail in CSS inches, check bar, fit-to-page note; jsPDF builders untouched | ✓ |
| A PDF through the export dialog | A new jsPDF artifact; reopens the frozen builders | |

**User's choice:** Browser print of the dialog.
**Notes:** Chose "Next area" at the continue check.

---

## The example rail and its callouts

| Option | Description | Selected |
|--------|-------------|----------|
| SVG text via the app's callout primitives (Recommended) | SVG text sized through callout-primitives.tsx (sketch decision 8); prototype anchors and de-overlap pass as layout math under components/; the app's band colours | ✓ |
| Faithful HTML labels with halos | The prototype's absolutely-positioned spans with white text-shadow | |

**User's choice:** SVG text via the app's callout primitives.

| Option | Description | Selected |
|--------|-------------|----------|
| The app's segmented toggle (Recommended) | The fins screen's two-option accent-filled toggle treatment, in the card header | ✓ |
| A 'Domed' tick-box | A single Checkbox like Sym / Hard Edge | |
| You decide | Left to the UI-SPEC | |

**User's choice:** The app's segmented toggle.

| Option | Description | Selected |
|--------|-------------|----------|
| Names only (Recommended) | 'Deck 1', 'Rail Mk1', 'Bottom Tuck 3'; the DATA tab carries the numbers | ✓ |
| Name and value | 'Deck 1 — 2 1/2"' / 'Deck 1 — 64 mm' through the display boundary | |

**User's choice:** Names only.
**Notes:** Chose "Finish this area", then "I'm ready for context" at the closing check.

---

## Claude's Discretion

- Caveat wording; the third sheet's heading and page-mark title; the summary's page-count note with three pages; the 1:1 dialog's title and its fit-to-page note.
- Which rail the 1:1 dialog opens on; whether TabbedPanel is reused inside it; scroll behaviour for a wide rail.
- Exact sidebar placement of the tick-box beneath the section controls.
- Provider shape for the new preference (generalise units-provider or add a sibling); column, storage key and cookie names.
- Fitting the figure to its box instead of the prototype's 0.7492 constant; the light PNG on dark themes.
- The golden entry's name and shape; how the new surfaces join the units-isolation ledger.
- Playwright stays uninstalled this phase; the 1:1 view and the sheet are human checks.
- Look and feel of the tab, dialog and sheet belong to the UI-SPEC.

## Deferred Ideas

- A live plan/side view of the shaper's own board with inset mark curves — new offset-curve geometry, its own phase.
- Restated from the roadmap's future list: the figure on the fins and foil screens; a calibrated actual-size view; printing from a phone; pinch-zoom.
