# Phase 15: The Board Rack - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-05
**Phase:** 15-the-board-rack
**Areas discussed:** Where boards land, Which rack each device gets, First look and words, Going live and backups

The brief (15-SPEC.md) was locked first: *"Lock it (Recommended)"*. The 13 keyword-matched todos were
reviewed and not folded (none is about the rack).

---

## Where boards land

| Option | Description | Selected |
|--------|-------------|----------|
| First (Recommended) | Right where the unsaved board was: saving doesn't move it; new boards are where you look | ✓ |
| Last | Your arranged rack stays exactly as it is; new boards join at the end | |

| Option | Description | Selected |
|--------|-------------|----------|
| Right after its original (Recommended) | The copy stands next to the board it came from | ✓ |
| First | Treated like any new board | |

| Option | Description | Selected |
|--------|-------------|----------|
| Only until you first arrange (Recommended) | Today's most-recent-first order until you move a board; then yours, and editing never moves a board | ✓ |
| Never | From the update on, a board moves only when you move it | |
| Always | The board you last worked on always comes first, which undoes your arrangement | |

**User's choice:** all three recommendations.

---

## Which rack each device gets

| Option | Description | Selected |
|--------|-------------|----------|
| Mouse vs finger (Recommended) | Mouse or trackpad gets the hover rack, a finger the swipe rack; an iPad swipes at any width | ✓ |
| Screen width | Wide hovers and narrow swipes, like the page layout; an iPad sideways would get a hover rack it can't hover on | |

| Option | Description | Selected |
|--------|-------------|----------|
| First tap turns, second opens (Recommended) | A finger can't hover, so the first tap shows the outline and caption | ✓ |
| Opens straight away | A tap opens the board, as a click does | |

| Option | Description | Selected |
|--------|-------------|----------|
| Use the screen, scroll for presets (Recommended) | The rack takes most of a short screen; Shape a New Board is a scroll below | ✓ |
| Keep presets on screen | Squeeze the rack; boards and words get very small | |

**User's choice:** all three recommendations.

---

## First look and words

| Option | Description | Selected |
|--------|-------------|----------|
| The one you're working on (Recommended) | The board open in the editor is turned (in the middle on a phone); with none, the first | ✓ |
| Always the first board | The rack always opens at its start | |

| Option | Description | Selected |
|--------|-------------|----------|
| Always show it (Recommended) | One short muted line beside the count | ✓ |
| Until the first move | Shows until you've moved a board once on that browser | |
| Count only | Just "15 boards" | |

| Option | Description | Selected |
|--------|-------------|----------|
| Same rack (Recommended) | One board stands turned with its caption; the rack looks the same whatever the count | ✓ |
| Today's cards below three | Two looks to build and test | |

**User's choice:** all three recommendations.

---

## Going live and backups

| Option | Description | Selected |
|--------|-------------|----------|
| Two: rack, then moving (Recommended) | The turning rack first with no database change, then moving boards; the showing can run on the rack alone | |
| One go-live | Database change first, then everything in one push on your go; all or nothing by Wednesday | ✓ |

| Option | Description | Selected |
|--------|-------------|----------|
| Touch moves with ⋯ only (Recommended) | If hold-and-drag isn't reliable on the iPad by Wednesday, phones and iPads move boards with ⋯ → Move left / Move right | ✓ |
| Today's cards on touch | Phones and iPads keep today's cards until it's fixed | |

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, on every device (Recommended) | The only way to move without dragging; needed for screen readers; a backup | |
| Computers only | Phones move boards by hold-and-drag alone | |
| *(Other)* | *"no move buttons"* | ✓ |

**User's choice:** one go-live (against the recommendation); the ⋯ fallback only if hold-and-drag isn't
reliable on the iPad; otherwise no move buttons on phones (free text *"no move buttons"*, read as: no Move
left / Move right in ⋯ on touch screens; computers keep them, as the locked brief says).
**Notes:** the screen-reader consequence on phones (browse and open, not move) was in the recommended
option's description and is recorded in CONTEXT D-12.

---

## Claude's Discretion

- Where the order is stored (an account-level list vs a position per board), left to research; the account
  list is the leading candidate because "not arranged yet" falls out of null.
- The exact timings and sizes, starting from the sketches' figures.
- How the turn maths is split into pure, tested functions.
- Reduced motion.
- Carried forward from Phase 14 without a question: the read-only report on the real saved boards before
  the push, one rehearsal walk after the go-live, nothing announced on screen.

## Deferred Ideas

- Moving boards with a screen reader on a phone.
- Making hold-and-drag reliable on older Safari, only if the fallback is taken.
