# Phase 1: Foundation — Port & Deploy the Design Tool - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-19
**Phase:** 1-Foundation — Port & Deploy the Design Tool
**Areas discussed:** New-design entry flow, Landing page & nav

---

## New-design entry flow

| Option | Description | Selected |
|--------|-------------|----------|
| Setup screen first | Dedicated 'New board' screen asking dims, then into the editor | ✓ (with additions) |
| Inline on outline | Keep dims as sliders in the outline editor only | |
| Dialog over editor | 'Start a board' modal over the editor | |

**User's choice:** Setup screen — plus three requested additions: (1) generic board-type presets with unique default dims, (2) a place to load saved boards with a working/done status indicator, (3) a community board database rateable and sortable by type/length/rating. (2) redirected to Phase 2, (3) to the v2 sharing milestone.

### Presets roster
| Option | Description | Selected |
|--------|-------------|----------|
| Core four | Shortboard, Fish, Mid-length, Longboard | ✓ |
| Core four + Groveler & Gun | Adds specialty ends of the spectrum | deferred to later |
| Core four + Custom blank | Adds explicit start-from-scratch card | |

**User's choice:** Core four for MVP; Groveler & Gun on the to-do-later list.

### Preset depth
| Option | Description | Selected |
|--------|-------------|----------|
| Dims only | Preset fills length/width/thickness | |
| Dims + outline character | Preset also sets nose angle, fullness, tail shape | ✓ |

### Preset data source
| Option | Description | Selected |
|--------|-------------|----------|
| User provides | User supplies typical dims/character per type | |
| Claude drafts, user reviews | Draft presets, user corrects | ✓ (via live editor) |
| Claude's discretion | Tune later from feedback | |

**Notes:** Review must happen in the live outline editor — the user needs to tweak nose/tail angle, fullness etc. and see what the default curves and tail shapes actually look like; tuned values captured back as preset definitions.

### Post-preset flow
| Option | Description | Selected |
|--------|-------------|----------|
| Tweak dims, then enter | Adjust dims on setup screen before 'Start shaping' | |
| Straight into editor | Preset card drops immediately into the outline editor | ✓ |

---

## Landing page & nav

### Root URL
| Option | Description | Selected |
|--------|-------------|----------|
| Root IS the setup screen | / lands on the board-picker/setup screen | ✓ |
| Marketing page + setup route | Landing pitch with Start button | |
| Keep redirect for now | / still jumps into the editor | |

### Nav integration
| Option | Description | Selected |
|--------|-------------|----------|
| SHAPER wordmark links home | Logo returns to setup screen; five tabs unchanged | ✓ |
| Add a BOARDS tab | Sixth nav item | |
| Both | Wordmark + tab | |

### In-progress design behavior
| Option | Description | Selected |
|--------|-------------|----------|
| Design survives in-session | Store keeps board while tab open; 'Continue current board' card; confirm on replace | ✓ |
| Fresh start each visit | Clean preset choice every time | |
| Also persist locally | localStorage stash pre-accounts | |

### Setup screen visuals
| Option | Description | Selected |
|--------|-------------|----------|
| Outline thumbnails on cards | Each card renders its preset's actual outline shape | ✓ |
| Simple text cards | Name + dims as text | |
| You decide | Claude's discretion | |

---

## Claude's Discretion

- Vercel deployment mechanics (area offered, not selected)
- Prototype-parity / done checklist (area offered, not selected)
- Setup screen layout details beyond captured decisions

## Deferred Ideas

- Groveler & Gun presets (later pass)
- Saved boards on setup screen + working/done status indicator (Phase 2)
- Community board database with ratings/sorting (v2 sharing milestone)
- localStorage persistence of in-progress board (Phase 2 does real persistence)
