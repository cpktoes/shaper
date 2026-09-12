# Phase 9: The Design Screens on a Phone - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 9-the-design-screens-on-a-phone
**Areas discussed:** Where the drawing sits while you work, Getting from screen to screen, Which way the board faces on a phone, Dragging with a thumb

---

## Pending todos

| Option | Description | Selected |
|--------|-------------|----------|
| Mobile/phone-width layout polish | The Phase 1 deferral (cards overlapping the sidebar below ~640px) tagged resolves_phase: 9 | ✓ |
| Copy-spec-to-clipboard | A new copy-the-numbers feature across four screens; Phases 5–8 judged it its own capability | |
| The other five | Finished-board photos, fins tail curve, presets for rails/fins, bottom contours, order-form branding — keyword matches only | |

**User's choice:** Fold the mobile/phone-width layout polish todo only.

---

## Where the drawing sits while you work

| Option | Description | Selected |
|--------|-------------|----------|
| Drawing pinned on top, controls scroll under it | The board stays in view while a slider below it is thumbed; drawing takes a fixed share of the height | ✓ |
| One long page: drawing first, then controls | Simplest, biggest drawing, but the board scrolls off while a slider is moved | |
| Controls first, drawing below | Sliders first, board below the fold; same blind-slider problem | |
| A Drawing / Controls switch | Two full-screen views; action and feedback never visible together | |

**User's choice:** Option 1, with an addition: "default to control points on and construction lines where possible and the slider controls only for everything else. no need to duplicate a slider for what a visual can do already."

| Option | Description | Selected |
|--------|-------------|----------|
| Fold duplicated sliders under a closed "Fine adjust" group | Exact numbers stay reachable (PHON-01) without cluttering the screen | ✓ |
| Drop them on the phone entirely | Cleanest screen, but the precise path is gone on the phone; would be a PHON-01 exception | |
| Keep every slider, as on desktop | Longest scroll, every draggable value shown twice | |

| Option | Description | Selected |
|--------|-------------|----------|
| About two-thirds drawing, one-third controls | The drawing is the main control; the sliders are the minority | ✓ |
| About half and half | More sliders visible, smaller board | |
| A handle the shaper drags to resize the split | Most flexible; a new interaction to build and test | |

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the table, scroll sideways inside its own box | Columns a shaper knows stay put; the box scrolls, the page doesn't | ✓ |
| Re-stack: one station per card | No sideways scroll, but a second layout of every table in both systems | |
| Ask the shaper to turn the phone sideways | Cheapest; the shaper rotates for every table | |

**Notes:** Corrected from the code during the area: the rocker's draggable points are its four curve handles (angle, smoothness, flatness); nose and tail rocker lift are deliberately not draggable and stay in the open. The foil has no drag points at all.

---

## Getting from screen to screen

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom tab bar | Six screens along the bottom under the thumb, one tap away; bottom-anchored, takes the safe-area padding | ✓ |
| Scrolling strip under the wordmark | Closest to desktop; lives at the top, far from the thumb, steals a row | |
| A menu button | Smallest footprint; every screen change is two taps | |
| Previous / Next only | Two arrows; TEMPLATE to FINS is four taps | |

| Option | Description | Selected |
|--------|-------------|----------|
| Label only, in the app's small-caps heading style | Six labels fit 375px at about 60px each; nothing to invent | ✓ |
| Icon above a label | Phone-app convention, but six new pictograms to design | |
| Icon only | Most room per tab; a new shaper has to guess which icon is RAILS | |

| Option | Description | Selected |
|--------|-------------|----------|
| Wordmark, Save, gear and account in one compact row | Everything that isn't a screen link stays, tighter | |
| Wordmark and Save only; gear and account behind one menu | The thinnest bar; Units, Theme and the account a tap further away | ✓ |

**User's choice:** Bottom tab bar, labels only, top bar of wordmark and Save with gear and account behind one menu.

---

## Which way the board faces on a phone

| Option | Description | Selected |
|--------|-------------|----------|
| Outline: nose up, as on desktop | Tall board fills the tall pinned area; rotate button stays | |
| Outline: nose left, full width | Under 100px wide with callouts on a 375px screen | |

**User's choice (free text):** "vertical when phone vertical, horizontal when phone horizontal".

| Option | Description | Selected |
|--------|-------------|----------|
| Rocker: keep it flat and let the drawing area shrink to what it needs | Reads the way a shaper looks at rocker | |
| Rocker: turn it nose-up on the phone | Uses the tall pinned area; rotate exists on this screen | |
| Rocker: keep it flat and keep the two-thirds area | Consistent split, empty space above and below | |

**User's choice (free text):** "vertical when phone is vertical, horizontal when phone is horizontal" — the same rule as the outline.

| Option | Description | Selected |
|--------|-------------|----------|
| Rails: one at a time, with a Nose / Centre / Tail switch | Full width per rail; the Phase 8 dialog's idiom | ✓ |
| Rails: stack all three, scrolling inside the drawing area | A second scroll inside the pinned area | |
| Rails: keep them side by side and let the solver shrink them | About 120px each; not readable | |

| Option | Description | Selected |
|--------|-------------|----------|
| 1:1 rail: scroll sideways, with a hint to turn the phone | True size kept; the 2-inch bar fits; landscape shows the whole rail | |
| 1:1 rail: shrink to fit the width | Fits without scrolling but isn't true size | ✓ |
| 1:1 rail: desktop only, hide the button on phones | Listed as a considered no | |

**User's choice:** Shrink to fit — "no need to see full size on the phone since it'll almost always be too small, but printing full size is still required."

| Option | Description | Selected |
|--------|-------------|----------|
| Landscape: back to sidebar-beside-drawing, like desktop, board lying flat | 844px already fits the desktop arrangement; touch sizing follows the finger | |
| Landscape: keep the stacked phone layout, just turn the board flat | About 200px for the board and 100px for controls | |

**User's choice (free text):** "vertical board when phone vertical, horizontal board when phone horizontal" — the board rule restated; the layout around it left to Claude (recorded under Claude's Discretion with the sidebar-beside-drawing recommendation).

| Option | Description | Selected |
|--------|-------------|----------|
| Rotate button stays, as a manual override | Turning the phone sets the default; the button still flips it | |
| Rotate button goes away on phones | The phone's orientation is the only control | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| 1:1 note: one line, shown smaller than true size, Print for the full-sized rail; no check bar on screen | Honest about the screen; points at the print | ✓ |
| 1:1 note: keep the check bar and caveat as on desktop | A true-size bar beside a rail that isn't | |

---

## Dragging with a thumb

| Option | Description | Selected |
|--------|-------------|----------|
| Foil: read PHON-04 as the rocker screen's existing points; foil stays slider-only | No new geometry; desktop unchanged | ✓ |
| Foil: add foil drag, on desktop and phone | New inverse-geometry module under Rule 1 plus a desktop change | |

| Option | Description | Selected |
|--------|-------------|----------|
| Overlap: the nearest point to the touch | One hit test; same rule for mouse and touch | ✓ |
| Overlap: shrink the zones on that board until they don't overlap | Targets fall below finger size on short boards | |
| Overlap: keep them big; whichever is drawn on top wins | Depends on drawing order | |

| Option | Description | Selected |
|--------|-------------|----------|
| Readout: the existing callouts, outside the outline, updating live | Drag is for shaping by eye; exact numbers in Fine adjust | |
| Readout: a temporary readout next to the finger while dragging | New on-drawing UI on touch only | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Grab: straight away, same as desktop | One pointer path; the pinned drawing can't be mistaken for a scroll | ✓ |
| Grab: after a small movement, to avoid accidental nudges | Touch and mouse then behave differently | |

| Option | Description | Selected |
|--------|-------------|----------|
| Readout shows the same words and number as the slider that point drives | Same name and number as Fine adjust, so the two never disagree | ✓ |
| Readout shows just the number(s) | Two bare numbers for a handle that sets two things | |

---

## Wrap-up

| Option | Description | Selected |
|--------|-------------|----------|
| I'm ready for context | Write the context file from these decisions | ✓ |
| Explore more gray areas | Phone tests gating pushes and a desktop mouse test; touch sizing by finger vs width; the sign-in banner above the pinned drawing | |

## Claude's Discretion

- The layout around the board on a sideways phone (recommendation: sidebar-beside-drawing where the width fits the desktop shell's minimum).
- Width breakpoint for the stacked layout versus pointer-driven touch sizing.
- Exact heights of the pinned area per screen, the Fine adjust group's wording and position, the table scroll affordance, the VOLUME screen's column, the rails INSTRUCTIONS tab's scrolling.
- Which construction lines stay on by default without cluttering the small drawing.
- The shape of the one menu behind the gear/account button.
- The drag readout's chip styling and offset.
- The sign-in banner's compact treatment on a phone.
- How desktop-pixel-identical is proven for the shell extraction.
- Playwright device models, CI gating, and a desktop mouse-drag regression test.

## Deferred Ideas

- Phase 8 print follow-up reported mid-discussion: the View Full Sized rail print has no check bar (background colour dropped on paper) and does not name the rail (title is print-hidden). Quick task, not Phase 9.
- Foil drag points — a new inverse-geometry capability for a later phase.
- Landscape tab placement and layout — recommendation only; revisit after Phase 10's real-device pass.
- Pinch-zoom, magnifier, calibrated actual-size view, printing from a phone — already on the requirements' future list.
