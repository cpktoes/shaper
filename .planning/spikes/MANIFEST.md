# Spike Manifest

## Ideas

### custom-rocker
The founder (2026-10-16) wants a custom rocker on a blank: the blank's catalogue name with the custom rocker figures
appended, drawn on the ROCKER viewer. Blank suppliers often stock a custom rocker suited to their region's waves rather
than the maker's natural rocker. Research only so far: read all four makers' rocker rules (catalogues and websites), and
prove a custom rocker can be applied to the app's own blank curves. Nothing built, migrated or pushed; the design and
sketch go to a Fable session.

**Requirements:**
- Research only until the founder decides; build through GSD, with no code before a plan.
- Read with `git show` / `git -C` anything on the sketch 015 branch (`claude/elastic-joliot-3e9625`); never merge it here.
- Geometry stays pure and tested in `lib/geometry/` (Rule 1). A saved-data change follows CLAUDE.md's Database rule:
  additive migrations run on production before the deploy.
- Explain everything to the founder in shaper's terms.
- **The US Blanks notation is the app-wide way of writing a custom rocker, on every maker's blank** (the founder,
  2026-10-16: "descriptive even for other mfgs"): nose first, then tail, signed inches, a figure after N or T for where
  the bend starts, none for the centre.
- A custom rocker is a step after the blank's natural curve (like wings and the round nose), re-levelled on its true
  low point; it changes the board's rocker, never the fit.
- **The first build holds typed changes only** (the founder, 2026-10-16): a shaper copies a named rocker's figures off
  the maker's sheet. Pick-lists and named rockers come later.
- **The note stays in inches in Metric**; every drawn or tabled figure follows the shaper's units.
- **Steppers, never typing, with room for a two-point change on one end** (the founder: "some custom rockers have a
  2 point defined adjustment so we need to plan for that too").
- **A custom blank can be saved for later as a blank of the shaper's own, beside the maker's natural one, and is
  starred the moment it is saved** (the founder, 2026-10-16). The one database change in the first build: an additive
  `user_blanks` table, migrated on production before the deploy.
- **The control is a Customize Rocker / Edit Custom Rocker button right under the blank card, opening a large popup
  laid out like the ROCKER page** (sketch 016 D, the founder, 2026-10-16: rows left and scrolling, the drawing beside
  them; on a phone the drawing pinned on top), with Cancel · Use and save as a new blank, plus Use and edit current
  blank only when the board already uses a custom blank. Every custom rocker in use is a saved blank.
- **No rocker value goes negative:** each change stops at the floor that keeps the blank at or above its centre's
  height; nothing re-levels. **Two changes on one end stack** (the first in full, the second on top), and the second
  must start nearer the tip than the first; Bend starts is a slider in 1" steps beside the rocker slider. **Switching
  to a different blank clears the custom rocker.** Every blank is named
  the name then its rocker on its own line, `Natural` included; tables show Natural Rocker over Custom Rocker.
- **The drawing shows the deviation as US Blanks' catalogue (September 2026, p. 11) draws it:** the outline red
  over the first adjustment's span, blue over the second's, in colours that read on every theme — **inside the
  Customize Rocker popup only**, with the natural dashed line and the bend marks, a live aid while adjusting; the
  page's VIEWER draws a custom blank as any blank, the bent foam alone. **The
  popup's drawing has a Show my board switch, off by default** — the blank alone unless switched on, reading its
  five stations (centre = the zero reference, the 12" stations and the tips) as ordered.

**Status:** spikes 001–002 VALIDATED; the deep dive and build plan are in `CUSTOM-ROCKER-PLAN.md` (2026-10-16). The
decisions waiting on the founder are its §6. Next is `/gsd-sketch` 016 (the sidebar control, the VIEWER overlay, the
name on the blank and the DATASHEET), then a quick task with a BRIEF once quick 261015-ve9 is on `main`.

## Spikes

| # | Idea | Name | Type | Validates | Verdict | Tags |
|---|------|------|------|-----------|---------|------|
| 001 | custom-rocker | maker-rocker-conventions | standard | Given the four catalogues and makers' sites, when every rocker section is read, then each maker's naming, measuring, changing and charges are known | ✓ VALIDATED | rocker, catalogue, us-blanks, arctic-foam, marko-foam, millennium-foam |
| 002 | custom-rocker | custom-rocker-bend | comparison | Given a real blank on the app's square-root curve, when a listed custom rocker is applied as a bend from its point, then tips move exactly, no dip appears, the board takes the new rocker | ✓ VALIDATED (even bend recommended; beam bend within 1.9 mm per inch of change) | rocker, geometry, square-root-curve, fit |
