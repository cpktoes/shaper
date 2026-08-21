---
created: 2026-08-21
source: user report, post phase 01 ship
resolves_phase:
---

# Rails: disable Bottom Tuck 3 slider when Sym is checked

**User report (2026-08-21):** "on rails, bottom tuck 3 advanced slider should be disabled when
Sym is checked as it's creating a behaviour that you can't come back from."

## What actually happens

`lib/geometry/rail-bands.ts:232`:

```ts
const bottomTuck3 = input.hardEdge
  ? ...
  : (input.bottomTuck3OverrideIn ?? (input.symmetrical ? deckMark3 : railTuck1));
```

`bottomTuck3Override` takes precedence over the symmetrical-derived value. So the moment the user
drags the Bottom Tuck 3 slider, the override becomes non-null and **permanently shadows the
`symmetrical` derivation** — from then on, toggling Sym on/off no longer changes Bottom Tuck 3.
The section looks symmetrical-capable but silently isn't.

## The escape hatch exists, but is coarse

`components/rails/rail-controls.tsx:176` defines `resetAdvanced`, wired to a button at line 339.
It does clear `bottomTuck3Override` — but it also clears `cornerCutOffsetOverride`, `removeCornerCut`
and `singleTuck` for that section. So recovering Bottom Tuck 3 means discarding every other advanced
setting on that rail section. That is why it reads as "can't come back from".

## Fix

Disable the Bottom Tuck 3 slider while `spec.symmetrical` is true. There is an established
precedent for exactly this in the same file: the Corner Cut Offset slider (~line 281) already uses
`disabled={spec.removeCornerCut}` plus an `opacity-40` wrapper when another control governs it.
Match that pattern.

**Important — disabling alone is NOT sufficient.** If an override was set *before* Sym was checked,
the stale override still shadows `deckMark3` while the slider sits disabled — the same bug, now
invisible. The fix must also ensure the override does not apply while symmetrical is on. Either:

- clear `bottomTuck3Override` to `null` when `symmetrical` is toggled on (simple, but silently
  discards a value the user set — and it will not come back when Sym is unchecked), or
- make the geometry ignore `bottomTuck3OverrideIn` while `symmetrical` is true, preserving the
  stored override for when Sym is switched back off (preserves user intent; changes
  `rail-bands.ts` and so needs unit-test coverage).

The second is likely the better behaviour, but it touches the calculator, so it needs a test
pinning both branches. Decide deliberately rather than defaulting to whichever is fewer lines.

Relevant code: `lib/geometry/rail-bands.ts:228-232`, `components/rails/rail-controls.tsx`
(Sym checkbox, Bottom Tuck 3 slider, `resetAdvanced`).
