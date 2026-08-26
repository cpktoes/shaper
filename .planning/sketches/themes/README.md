# Theme sketches

## `colour-bench.html` — the Shaper Colour Bench

A standalone tool for tuning the theme tokens: a colour picker per token, live Shaper UI
specimens driven by those tokens, a WCAG contrast audit that recomputes on every keystroke,
and an export that emits paste-ready CSS for `app/globals.css`.

**Published at:** https://claude.ai/code/artifact/4e019580-9da7-4a41-a0c2-efeca4a0350a

That URL is stable and private to the owner. This file is the source; the artifact is the
rendered copy. Both need updating together — see below.

### What it covers

- **Regions** — Window, Sidebar, Canvas, Active tab
- **Surfaces** — Panel, Well
- **Ink / Lines / Accent / Warning** — the full contract, including the `on-` pairings
- **Four themes** — Daylight and Chalk (light), Slate and Phosphor (dark), switchable from
  the chips in the masthead
- **29-row contrast audit** — every foreground against every region, with the 4.5:1 text and
  3:1 non-text bars, plus two rows deliberately marked EXEMPT/ADVISORY rather than FAIL
  (`accent on ground`, which is a fill; and `ink on accent`, which the app does not do)

### Updating it

1. Edit this file.
2. Republish to the **same URL** — from a conversation that did not originally publish it,
   the URL must be passed explicitly, or a second artifact is created instead of updating
   this one. Publishing also requires reading the live artifact first (WebFetch the URL) if
   the session has not already seen its current version.
3. Keep the favicon **🎨** across redeploys — a changed tab icon reads as a different page.
4. Commit the edited file here so the two stay in step.

To preview locally without publishing: the file is a body fragment, not a full document
(the artifact runtime supplies `<!doctype>`, `<head>` and `<body>`). Wrap it before opening
it directly, or drop the wrapped copy into `public/` and load it from the dev server.

### Known coupling — the values drift

The bench seeds itself from a `PUBLISHED` array near the top of its `<script>`. Those values
are a **hand-kept copy** of the ramps in `app/globals.css`. Nothing enforces the match: the
bench is a single standalone file with no build step and no import, which is what lets it run
as an artifact at all.

So **after changing a ramp in `globals.css`, update `PUBLISHED` here too**, or the bench's
"Reset" will restore stale colours and its audit will describe a palette the app no longer has.
The token list (`GROUPS`, `EXPORT_KEYS`, `PAIRS`) needs the same treatment when the contract
itself gains or loses a token.

This is the same "two implementations drift" shape as the pre-hydration theme script — but
unlike that one it cannot be covered by a test, because the bench is not part of the app's
build. Re-syncing is manual and worth doing in the same task as any ramp change.

### Related

- `app/globals.css` — the real thing: ramps, contract, Tailwind bridge, theme blocks
- `lib/theme.ts` — the `THEMES` registry the settings menu reads. Renaming or adding a theme
  needs an entry there *and* a `:root.theme-<id>` block in globals.css; the id is the class
  name, so the two must agree.

---

## `default.css` — stale

Predates the design pivot. Its header says it mirrors the app's `--outline-*` palette, but it
holds the warm modernist scheme (`#f4f0e6` ground and friends) that was replaced. Left in
place because the 001–004 sketches reference it; do not treat it as current. The live palette
is `app/globals.css`, and the bench above is how to explore it.
