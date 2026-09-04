# Requirements: Shaper

**Defined:** 2026-08-18 (v1.0) · v1.1 added 2026-09-04
**Core Value:** The rail-band and fin-placement calculators produce numbers a shaper trusts enough to cut foam to — everything else supports that.

## v1.0 Requirements (complete)

The initial release — every requirement below shipped and was validated across Phases 1–4.

### Accounts

- [x] **ACCT-01**: User can sign up with email and password
- [x] **ACCT-02**: User can log in and stay logged in across sessions
- [x] **ACCT-03**: User can reset password via email link

### Board Setup

- [x] **SETUP-01**: User can start a new design by entering overall board dimensions (length, width, thickness)

### Outline

- [x] **OUTL-01**: User can shape an outline curve constrained to the board's overall length/width

### Rocker

- [x] **ROCK-01**: User can define a rocker curve (nose and tail rocker profile) for the board

### Rail Contour

- [x] **RAIL-01**: App calculates rail band dimensions (thickness/apex/tuck) at each station along the board, derived from the outline and rocker

### Foil

- [x] **FOIL-01**: User can define a foil (thickness distribution along the length of the board)

### Fins

- [x] **FIN-01**: User can select a fin configuration (single, thruster, quad, twin/2+1) for the design
- [x] **FIN-02**: App calculates fin placement (position, angle, toe) using compiled formulas per fin configuration
- [x] **FIN-03**: User can view calculated fin placement overlaid on the board outline

### Volume

- [x] **VOL-01**: App calculates board volume (litres) live from the shaped geometry (outline + rocker + foil)

### Models

- [x] **MODL-01**: User can save a design as a named model tied to their account
- [x] **MODL-02**: User can reopen and edit a previously saved model
- [x] **MODL-03**: User can view a list of their saved models

### Visualization

- [x] **VIZ-01**: User can view a 2D visualization of the outline, rocker, rail contour, and fin placement as they shape the design

### Templates & Export

- [x] **TMPL-01**: User can export a full-size (1:1 scale) printable template of the outline, tiled across multiple standard pages for taping together

### Units

- [x] **UNIT-01**: UI displays dimensions in inches and volume in litres, regardless of internal (metric) storage

## v1.1 Requirements — Imperial vs Metric

The current milestone. A shaper can switch the whole app between Imperial and Metric, and every
number they read on screen or on paper follows. Decided at kickoff (2026-09-04): the chooser reads
Imperial / Metric (a measuring system, not a pair of units); Metric is all-metric, length included
— cm for length and widths, whole millimetres for rail band, rocker and foil values; volume stays
litres either way; the preference lives on the account with a per-browser fallback when signed out.
UNIT-01 (inches only) is superseded by this milestone.

### Units Preference

- [ ] **UNIT-02**: User can choose Imperial or Metric from the settings menu, beside the theme chooser; Imperial is the default for everyone until they change it
- [ ] **UNIT-03**: A signed-in user's choice is saved on their account and applies on any device they sign in from
- [ ] **UNIT-04**: A signed-out user's choice is remembered on that browser; on sign-in the account's saved choice applies if it has one, otherwise the browser's choice becomes the account's
- [ ] **UNIT-05**: Switching systems changes only how numbers are shown and typed — saved designs do not change, and switching back reproduces the original values exactly

### Design Screens

- [ ] **SCRN-01**: In Metric, every slider and value on the outline, rails, fins, volume and rocker screens reads in cm for length and widths and whole mm for rail band, rocker and foil values, with sliders stepping on whole millimetres
- [ ] **SCRN-02**: In Metric, typed entry accepts decimal centimetres and whole millimetres and re-prints in the chosen system; unreadable input reverts, as it does today
- [ ] **SCRN-03**: Viewer callouts and data tables (rail band marks, fin placement numbers, rocker datasheet, volume card) read in the chosen system
- [ ] **SCRN-04**: Preset cards on the setup screen show their dimensions in the chosen system
- [ ] **SCRN-05**: Volume reads in litres in both systems

### Printed Outputs

- [ ] **PRNT-01**: The Summary order form prints every measurement in the chosen system
- [ ] **PRNT-02**: The Overview Sheet PDF prints in the chosen system
- [ ] **PRNT-03**: The Full Sized Template and Paper Saver print their marks, labels and name/dims block in the chosen system
- [ ] **PRNT-04**: In Metric, the printed scale-check square is captioned in millimetres so a metric ruler can verify print scale (whether it stays 2in or becomes 50 mm is settled in the phase discussion)

### Rack

- [ ] **RACK-01**: Rack cards on the setup screen show each board's dimensions in the chosen system

## Future Requirements

Deferred to a later release. Tracked but not in the current roadmap. Per the founder's build guide, free-tier usage should be validated with real shapers before billing and public sharing are built (guide milestones M4–M6).

### Accounts

- **ACCT2-01**: Account tracks free vs paid tier so features can be gated accordingly (billing/subscriptions)

### Sharing

- **SHAR2-01**: User can publish a saved model publicly for other users to view
- **SHAR2-02**: Other users can view publicly published models

### Visualization

- **VIZ2-01**: 3D visualization of the board design

### Fins

- **FIN2-01**: Brand-specific fin box templates (FCS2, Futures, single-fin box) with exact cutout geometry

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| CNC file export | Product is explicitly for hand shapers working foam by hand, not CNC-cut boards |
| Mixed measuring systems (e.g. feet-and-inches length with metric widths) | Decided at the v1.1 kickoff: Metric is all-metric, one rule, the way Shape3d and BoardCAD switch |
| Rewriting dimensions a shaper typed into a board's name | Names are free text and stay exactly as typed |
| Per-board units | The preference belongs to the shaper, not the design |
| Volume in anything other than litres | Litres are how shapers talk about volume in both systems |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCT-01 | Phase 2 | Complete |
| ACCT-02 | Phase 2 | Complete |
| ACCT-03 | Phase 2 | Complete |
| SETUP-01 | Phase 1 | Complete |
| OUTL-01 | Phase 1 | Complete |
| ROCK-01 | Phase 4 | Complete |
| RAIL-01 | Phase 1 | Complete |
| FOIL-01 | Phase 4 | Complete |
| FIN-01 | Phase 1 | Complete |
| FIN-02 | Phase 1 | Complete |
| FIN-03 | Phase 1 | Complete |
| VOL-01 | Phase 3 | Complete |
| MODL-01 | Phase 2 | Complete |
| MODL-02 | Phase 2 | Complete |
| MODL-03 | Phase 2 | Complete |
| VIZ-01 | Phase 1 | Complete |
| TMPL-01 | Phase 3 | Complete |
| UNIT-01 | Phase 1 | Complete |
| UNIT-02 | Phase 5 | Pending |
| UNIT-03 | Phase 5 | Pending |
| UNIT-04 | Phase 5 | Pending |
| UNIT-05 | Phase 5 | Pending |
| SCRN-01 | Phase 6 | Pending |
| SCRN-02 | Phase 6 | Pending |
| SCRN-03 | Phase 6 | Pending |
| SCRN-04 | Phase 5 | Pending |
| SCRN-05 | Phase 6 | Pending |
| PRNT-01 | Phase 7 | Pending |
| PRNT-02 | Phase 7 | Pending |
| PRNT-03 | Phase 7 | Pending |
| PRNT-04 | Phase 7 | Pending |
| RACK-01 | Phase 5 | Pending |

**Coverage:**

- v1.0 requirements: 18 total, mapped to phases: 18, unmapped: 0 ✓
- v1.1 requirements: 14 total, mapped to phases: 14, unmapped: 0 ✓ (Phase 5: 6, Phase 6: 4, Phase 7: 4)

---
*Requirements defined: 2026-08-18*
*Last updated: 2026-09-04 after mapping milestone v1.1 requirements to Phases 5-7 in ROADMAP.md*
