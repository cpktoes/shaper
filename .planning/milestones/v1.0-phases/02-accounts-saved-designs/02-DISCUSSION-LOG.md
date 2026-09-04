# Phase 2: Accounts & Saved Designs - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-27
**Phase:** 2-accounts-saved-designs
**Areas discussed:** Sign-in gate, Where Save lives, Editing a saved board, What a saved board holds

---

## Sign-in gate

| Option | Description | Selected |
|--------|-------------|----------|
| Shape freely, sign in at Save | Tool open; sign-up only asked at the moment of saving | |
| Whole tool behind a login | Must sign in before shaping anything | |
| Shape freely, but prompt early | Tool open with a visible sign-in nudge from the start | ✓ |

**User's choice:** Shape freely, but prompt early

| Option | Description | Selected |
|--------|-------------|----------|
| Sign-in button in top nav | Quiet button, avatar when signed in | |
| Nav button plus one-time banner | Nav button + dismissable strip on design screens | ✓ |
| Badge on Save action | Save reads "Sign in to save" | |

**User's choice:** Nav button plus a one-time banner

| Option | Description | Selected |
|--------|-------------|----------|
| Carries through, saved on first Save | Sign-up in dialog; board untouched; stored on explicit Save | ✓ |
| Carries through and auto-saves | Board auto-saved as "Untitled board" on sign-up | |

**User's choice:** Carries through, saved on first Save (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Email/password + Google | Clerk social login alongside required email/password | ✓ |
| Email/password only | One way in; providers can be enabled later | |

**User's choice:** Email/password + Google (recommended)

---

## Where Save lives

| Option | Description | Selected |
|--------|-------------|----------|
| Save in the nav, every screen | One Save in the top bar; name prompt if unnamed | ✓ |
| Save only on Summary | Deliberate final step next to the board name | |
| Both | Nav button plus prominent Summary save | |

**User's choice:** Save in the nav, every screen (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Board rack above presets | Signed-in home leads with saved boards; presets below | ✓ |
| Separate "My Boards" page | Home stays presets; boards on their own page | |
| Rack replaces presets | Home shows only rack + New board button | |

**User's choice:** Board rack above presets (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep it, top of the rack | In-progress board is first rack card, marked not saved | ✓ |
| Keep it separate, above the rack | Continue card stays its own thing | |
| Drop it for signed-in users | Card only for signed-out visitors | |

**User's choice:** Keep it, top of the rack (recommended)

---

## Editing a saved board

| Option | Description | Selected |
|--------|-------------|----------|
| Autosave after first save | Debounced background saves + "Saved" tick after first explicit save | ✓ |
| Explicit Save always | Nothing written until Save; dot for unsaved changes | |

**User's choice:** Autosave after first save (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Save over + a Duplicate action | Edits go into the opened board; Duplicate branches | ✓ |
| Always ask | Every save asks update-or-new | |

**User's choice:** Save over + a Duplicate action (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Confirm before replacing | Same dialog pattern as Phase 1 preset replacement | ✓ |
| Open silently | Rack click just loads; in-progress board gone | |

**User's choice:** Confirm before replacing (recommended)

---

## What a saved board holds

| Option | Description | Selected |
|--------|-------------|----------|
| Thumbnail + name + dims + date | Outline thumbnail, name, L×W×T + litres, last touched | ✓ |
| Thumbnail + name only | Minimal cards | |

**User's choice:** Thumbnail + name + dims + date (recommended)

| Option | Description | Selected |
|--------|-------------|----------|
| Rename, duplicate, delete + confirm | Card menu; delete behind are-you-sure; no trash | ✓ |
| Duplicate + delete only | Rename via Summary name box | |

**User's choice:** Rename, duplicate, delete + confirm (recommended)

## Claude's Discretion

- Dialog styling, banner/confirm wording (plain English)
- Autosave debounce timing and failure handling
- Database schema, snapshot serialization, migrations (metric rule applies)
- Rack sort order and card menu affordance
- Clerk + Neon + Vercel configuration mechanics

## Deferred Ideas

- Copy-spec-to-clipboard across design screens (existing todo — UI polish, not this phase)
- Rails viewer "View Full Sized" modal + plan view (existing todo — UI polish)
