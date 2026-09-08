# API Coverage — Phase 5 (The Units Chooser)

No external API integration: this phase adds a display preference (Imperial or Metric) that lives
in `lib/geometry/units.ts`, one browser value, and one column on the shaper's own account — it
calls no third-party service, adds no SDK, and opens no new endpoint. Clerk and Neon are already
integrated and this phase adds no new capability against either.

> Detector run 2026-09-04 over the Phase 5 ROADMAP section + `05-CONTEXT.md`:
> `{"detected": false, "signals": []}`. This file is recorded anyway so the seal-time
> `api-coverage.verify-pre` gate has an explicit, reasoned declaration to read rather than
> re-deriving one from plan prose.
