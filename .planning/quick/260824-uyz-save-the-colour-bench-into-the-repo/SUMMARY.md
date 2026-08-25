---
id: 260824-uyz
slug: save-the-colour-bench-into-the-repo
date: 2026-08-24
type: quick
status: complete
---
# Save the colour bench into the repo

The bench had been living in the session scratchpad — published as an artifact (which
persists) but with **no source in the repo** (which does not). Refining it in a later session
would have meant recovering the HTML from the rendered artifact.

Now at `.planning/sketches/themes/colour-bench.html`, beside the existing sketch assets, with
a README recording:

- the published artifact URL, and that updating it needs that URL passed explicitly from any
  later conversation, or a second artifact gets created instead
- how to preview it locally (it is a body fragment, not a full document — the artifact runtime
  supplies the `<head>`/`<body>` wrapper)
- **the drift coupling**: the bench seeds from a hand-kept `PUBLISHED` copy of the ramps in
  `globals.css`. Nothing enforces the match, and nothing can — it is a single standalone file
  with no build step, which is exactly what lets it run as an artifact. Same shape as the
  pre-hydration script's duplication, but *not* coverable by a test, because the bench is not
  part of the app's build. Re-sync belongs in the same task as any ramp change.

Verified the committed copy is byte-identical to what is published, and that all four seeded
grounds still match `globals.css`.

## Also recorded

`default.css` in the same folder is **stale** — its header claims to mirror the app's
`--outline-*` palette but it holds the pre-pivot warm scheme (`#f4f0e6`). Left in place
because sketches 001–004 reference it; the README now says plainly not to treat it as current.
