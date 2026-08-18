# Requirements: Shaper

**Defined:** 2026-08-18
**Core Value:** The rail-band and fin-placement calculators produce numbers a shaper trusts enough to cut foam to — everything else supports that.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Accounts

- [ ] **ACCT-01**: User can sign up with email and password
- [ ] **ACCT-02**: User can log in and stay logged in across sessions
- [ ] **ACCT-03**: User can reset password via email link

### Board Setup

- [ ] **SETUP-01**: User can start a new design by entering overall board dimensions (length, width, thickness)

### Outline

- [ ] **OUTL-01**: User can shape an outline curve constrained to the board's overall length/width

### Rocker

- [ ] **ROCK-01**: User can define a rocker curve (nose and tail rocker profile) for the board

### Rail Contour

- [ ] **RAIL-01**: App calculates rail band dimensions (thickness/apex/tuck) at each station along the board, derived from the outline and rocker

### Foil

- [ ] **FOIL-01**: User can define a foil (thickness distribution along the length of the board)

### Fins

- [ ] **FIN-01**: User can select a fin configuration (single, thruster, quad, twin/2+1) for the design
- [ ] **FIN-02**: App calculates fin placement (position, angle, toe) using compiled formulas per fin configuration
- [ ] **FIN-03**: User can view calculated fin placement overlaid on the board outline

### Volume

- [ ] **VOL-01**: App calculates board volume (litres) live from the shaped geometry (outline + rocker + foil)

### Models

- [ ] **MODL-01**: User can save a design as a named model tied to their account
- [ ] **MODL-02**: User can reopen and edit a previously saved model
- [ ] **MODL-03**: User can view a list of their saved models

### Visualization

- [ ] **VIZ-01**: User can view a 2D visualization of the outline, rocker, rail contour, and fin placement as they shape the design

### Templates & Export

- [ ] **TMPL-01**: User can export a full-size (1:1 scale) printable template of the outline, tiled across multiple standard pages for taping together

### Units

- [ ] **UNIT-01**: UI displays dimensions in inches and volume in litres, regardless of internal (metric) storage

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap. Per the founder's build guide, free-tier usage should be validated with real shapers before billing and public sharing are built (guide milestones M4–M6).

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

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ACCT-01 | Phase 2 | Pending |
| ACCT-02 | Phase 2 | Pending |
| ACCT-03 | Phase 2 | Pending |
| SETUP-01 | Phase 1 | Pending |
| OUTL-01 | Phase 1 | Pending |
| ROCK-01 | Phase 4 | Pending |
| RAIL-01 | Phase 1 | Pending |
| FOIL-01 | Phase 4 | Pending |
| FIN-01 | Phase 1 | Pending |
| FIN-02 | Phase 1 | Pending |
| FIN-03 | Phase 1 | Pending |
| VOL-01 | Phase 3 | Pending |
| MODL-01 | Phase 2 | Pending |
| MODL-02 | Phase 2 | Pending |
| MODL-03 | Phase 2 | Pending |
| VIZ-01 | Phase 1 | Pending |
| TMPL-01 | Phase 3 | Pending |
| UNIT-01 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-18*
*Last updated: 2026-08-18 after roadmap creation*
