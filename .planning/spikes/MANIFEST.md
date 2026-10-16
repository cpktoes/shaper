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

**Status:** spikes 001–002 VALIDATED. The decisions waiting on the founder are listed at the end of
`002-custom-rocker-bend/README.md`. Next is `/gsd-sketch` (VIEWER custom-over-natural, the name and figures on the
blank, the 015 B picker with a Rocker row).

## Spikes

| # | Idea | Name | Type | Validates | Verdict | Tags |
|---|------|------|------|-----------|---------|------|
| 001 | custom-rocker | maker-rocker-conventions | standard | Given the four catalogues and makers' sites, when every rocker section is read, then each maker's naming, measuring, changing and charges are known | ✓ VALIDATED | rocker, catalogue, us-blanks, arctic-foam, marko-foam, millennium-foam |
| 002 | custom-rocker | custom-rocker-bend | comparison | Given a real blank on the app's square-root curve, when a listed custom rocker is applied as a bend from its point, then tips move exactly, no dip appears, the board takes the new rocker | ✓ VALIDATED (even bend recommended; beam bend within 1.9 mm per inch of change) | rocker, geometry, square-root-curve, fit |
