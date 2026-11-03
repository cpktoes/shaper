# Rails v1 — the RAILS screen as the live site computed it until Rails v2

An archival copy, made 2026-11-03 at the founder's request ("an archival copy in case I want to revert at a
later date") before Rails v2 (quick task 261102-gec, branch `rails-v2`) goes live.

## Where the old rails live

- **Git tag `rails-v1` and branch `archive/rails-v1`** — both point at commit `36d701d8`, the last commit on
  `main` before Rails v2, which is exactly what the live site ran. `git checkout rails-v1` gives the whole old
  site; `git diff rails-v1 main -- lib/geometry/rail-bands.ts components/rails` shows everything Rails v2 changed.
- **`rail-bands.ts` in this folder** — a byte-for-byte copy of `lib/geometry/rail-bands.ts` as of `36d701d8`,
  under a provenance header, so the old rules can be read beside the new file without git. It is never
  compiled, linted or tested (`// @ts-nocheck`; `reference/**` is ignored by lint; the test runner only looks
  under `lib/` and `components/`). Never edit it.
- **`rail-bands.test.ts` in this folder** — the same for its tests: the old rules' expectations, worth reading
  for what each one guaranteed.
- **The old rules' own sources are still in the repo on every branch:** the prototype
  `reference/project/Rails.dc.html` (the source of truth the v1 formulas were ported from), the golden record
  `lib/geometry/__fixtures__/prototype-rails-golden.json` and the script that generated it,
  `scripts/extract-prototype-rails-golden.mjs`.

## How a revert would go

The honest revert is the whole RAILS screen at once, not the rules file alone: Rails v2 changed the stored shape
of a rail section (`scaleFromCenter`, the nudges, `sharpBottomTuck`), the controls, the finished rail, the
volume basis and the records of the presets' litres together. So: `git revert` the merge of `rails-v2` into
`main`, or branch from the `rails-v1` tag and carry forward whatever landed after it. A board saved under Rails
v2 still opens on v1's reader (the three legacy keys were kept for exactly that), with the v2-only settings
ignored.
