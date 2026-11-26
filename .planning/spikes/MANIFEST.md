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
  popup's drawing has a Show my board switch, off by default** — the blank alone unless switched on, reading all its
  dimensions at its five stations (printed thickness; rocker as ordered with the centre as the zero reference); on,
  the surfboard's values.

**Status:** spikes 001–002 VALIDATED; the deep dive and build plan are in `CUSTOM-ROCKER-PLAN.md`; sketch 016 D
decided by the founder 2026-10-16 ("This now looks perfect. Let's build it."). Building as a quick task with a BRIEF.

### brd-bottom-fit
The founder (2026-11-24) asked what BOTTOM changes would let Open a board file (.brd) match a file's bottom closer.
After quick 261116-tqs, seven of his twelve sample files come in under 1 mm on the bottom; the rest stop where the
controls run out. Two measurements were asked for before anything is built: (1) a Belly Shape control (how full or soft
a belly rolls) for 92Log, Scoop-Noserider and testLB; (2) the Spiral Vee: BOTTOM already has one, yet SAtwin (a double
inside a vee tail) still misses 1.61 mm.

**Requirements:**
- Measure first; build only on the founder's word, through `/gsd-quick` (one change per quick task).
- Measured through the real import (`brdLookFromBytes`), widest and typical bottom miss, all twelve files, before and
  after, plus the open time.
- The founder's sample files in `~/Downloads` are never committed, copied into the repo or named in a test.
- The spikes run on Fable (the founder, 2026-11-24, asked for Fable 5.1; Fable 5.2 is the one available).
- Nothing in the app's own source changes during a spike; trial code lives in scratch and is archived as
  `spike-source.tar.gz`.
- **The founder shapes the bottom first, then the rail, blending them** (2026-11-25): "I generally shape the bottom contour in first (i.e. mark how close the nose concave comes to the rail, etc). Then, I shape the rail and blend them together." A nose concave's edge is a mark on BOTTOM (Off Rail); the foam between that mark and the rail is the rail-and-blend step. The app's page order (BOTTOM before RAILS) follows it.
- **A nose concave should win** (the founder, 2026-11-25, on a shallow Rail Roll coming back as a belly): "concave in the nose is super common and should win." Where a nose concave with a Rail Roll and a belly fit a file's nose about equally, the import names the concave.
- **The Longboard matters most** (the founder, 2026-11-26, on spike 007 / quick 261125-v2f bringing back 15 of 48 rolled Longboards): "Thats the most common to have a nose concave."

## Spikes

| # | Idea | Name | Type | Validates | Verdict | Tags |
|---|------|------|------|-----------|---------|------|
| 001 | custom-rocker | maker-rocker-conventions | standard | Given the four catalogues and makers' sites, when every rocker section is read, then each maker's naming, measuring, changing and charges are known | ✓ VALIDATED | rocker, catalogue, us-blanks, arctic-foam, marko-foam, millennium-foam |
| 002 | custom-rocker | custom-rocker-bend | comparison | Given a real blank on the app's square-root curve, when a listed custom rocker is applied as a bend from its point, then tips move exactly, no dip appears, the board takes the new rocker | ✓ VALIDATED (even bend recommended; beam bend within 1.9 mm per inch of change) | rocker, geometry, square-root-curve, fit |
| 003 | brd-bottom-fit | belly-shape-fit | comparison | Given 92Log, Scoop-Noserider and testLB, when a belly gains one shape number the fit may move, then the widest bottom miss drops under 1 mm and no file gets worse | ✗ INVALIDATED (92Log 1.58→1.56, Scoop 1.18→1.05, testLB unchanged; the widest miss is in the nose, not the belly) | brd-import, bottom, belly, fit |
| 004 | brd-bottom-fit | spiral-vee-fit | standard | Given SAtwin.brd (a double concave inside a vee tail), when the Spiral Vee is fitted with what it needs, then the widest bottom miss drops well below 1.61 mm and no file gets worse | ✓ VALIDATED (no model change: the import never scores Flat · Flat · Spiral Vee; adding it as one candidate takes SAtwin 1.61 → 0.39 mm, the other eleven identical) | brd-import, bottom, spiral-vee, double-concave, vee, fit |
| 005 | brd-bottom-fit | nose-fit | standard | Given 92Log, Scoop-Noserider and testLB, whose widest .brd bottom miss sits in the nose, when the import gets the one change the nose needs, then their widest bottom miss drops well below today and no file gets worse | ⚠ PARTIAL (the files turn the bottom up outside a nose concave, one cut cannot; an Edge Roll on a nose concave + a nose retry: 92Log 1.58→1.28, Scoop 1.18→1.01, testLB 2.08→1.45, nine identical, but up to 2.5 s more to open; the retry alone, nothing new on BOTTOM: 92Log 1.23, Scoop 1.04) | brd-import, bottom, nose, concave, fit |
| 006 | brd-bottom-fit | nose-rail-reach | comparison | Given the three nose files, when the rail is allowed to start further in at the nose instead of adding a Rail Roll to the bottom, then the finished board fits as close or closer with nothing new on BOTTOM | ✗ INVALIDATED (RAILS’ Bottom Tuck 3 freed to +3": the fit never takes it, all three identical; forced 1 1/4" in, every file worse; our rail climbs in facets from where it begins, the files stay at the concave’s level then turn up late and hard — the Rail Roll is the blend from the concave’s mark that RAILS lacks) | brd-import, rails, bottom, nose, bottom-tuck, rail-roll, fit |
| 007 | brd-bottom-fit | nose-roll-round-trip | comparison | Given the app's own boards written to .brd with a nose concave 1/16"–1/4" deep and a Rail Roll 1/16"–1/4", when the import prefers a nose concave with a roll over a belly in the nose, then they open as a nose concave with a roll close to what was written, and the founder's twelve files stay the same or closer | ⚠ PARTIAL (read the dish across the nose + drop a leftover centre cut + start from the fitted concave, a 0.05 mm tie for the concave: back with their roll 67 → 158 of 192, no stray cut 29 → 144; Shortboard, Mid-length, Fish all but one, Longboard 15/48 — read rails first; 0 of 48 real bellies turned into concaves; the twelve files unchanged; finished on Opus after the Fable limit) | brd-import, bottom, nose, concave, rail-roll, round-trip, fit |
| 008 | brd-bottom-fit | longboard-nose-roll | comparison | Given the app's Longboard written to .brd with a nose concave 1/16"–1/4" deep and a Rail Roll 1/16"–1/4", when the import reads or fits the nose so a roll outside the concave's edge is seen even on a board read rails first, then most come back with their concave and roll, no roll-0 board gains one, and the twelve files stay the same or closer | ✗ INVALIDATED (the Longboard's soft nose rail starts ~5" in, so the concave's edge and the whole roll sit under the rail and are shaped away: a 1/4" roll moves the file 0.12 mm on average, and RAILS draws the same nose with no roll; four trials reach 16–30 of 48 but the roll back is unrelated to the roll written (correlation 0.00–0.11), and the best two make testLB worse; T3b brings the concave's depth back truer (26 → 32 within 1/16", invented rolls 4 → 1) but fewer rolls and testLB 1.45 → 1.52; bringing the roll back needs a BOTTOM or RAILS change, the founder's call) | brd-import, bottom, rails, nose, concave, rail-roll, longboard, round-trip, fit |
| 009 | brd-bottom-fit | rail-from-concave-mark | comparison | Given a nose concave with a Rail Roll, when the nose rail starts at the concave's edge (the shaper's mark) so the roll is the blend from the mark to the rail, then the finished Longboard carries its roll, it opens from a .brd with the roll it was written with, and every board without a roll draws exactly as today | ✗ INVALIDATED (rule A, Bottom Tuck 3 pulled out to the mark with the tucks scaled together: only the 48 rolled Longboards change, the other 292 boards byte-identical, Longboard +0.38 to +1.41 L with a harder nose rail; back with a roll 15 → 43 of 48 but the roll comes back about 1/4" whatever was written (correlation 0.05), stray cuts 6 → 32, the bottom and rails miss wider, 92Log rails 1.64 → 1.93 mm, rolled Longboards up to 7.3 s more to open; the file says that there is a roll, not how much) | brd-import, bottom, rails, nose, concave, rail-roll, longboard, round-trip, fit |
