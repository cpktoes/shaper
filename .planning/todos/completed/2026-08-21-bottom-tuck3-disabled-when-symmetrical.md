---
created: 2026-08-21
source: user report, post phase 01 ship
resolves_phase:
closed: 2026-08-21
resolution: fixed
---

# Rails: Bottom Tuck 3 slider can silently invert the rail geometry

**User report (2026-08-21):** "on rails, bottom tuck 3 advanced slider should be disabled when
Sym is checked as it's creating a behaviour that you can't come back from." Followed by:
"limiting bottom tuck 3 to always be larger than bottom tuck 1 should avoid it."

Both are correct. The second is the better fix and subsumes the first — see below.

## Reproduced and measured (center rail, family MED, defaults, 2026-08-21)

Check **Sym** on the Center Rail, then open Advanced. The live DOM state is:

```
label:    "Bottom Tuck 3 — 4""      <- the true derived value
slider:   min=0  max=1.5  value=1.5 <- pinned at max, cannot express 4"
disabled: false                     <- fully draggable
```

The slider's maximum (1.5") is **below** the value it is supposed to control (4"), so its thumb
sits pinned at the right end misrepresenting the state. Touching it at all sets
`bottomTuck3Override` to <= 1.5", collapsing Bottom Tuck 3 from 4" to at most 1.5" — far below
Bottom Tuck 1 (2 1/2") — which inverts the ordering of the two marks along the bottom and produces
a broken cross-section.

It is then unrecoverable through that slider, because `lib/geometry/rail-bands.ts:230-232` gives the
override precedence over the symmetrical derivation:

```ts
const bottomTuck3 = input.hardEdge
  ? 0
  : (input.bottomTuck3OverrideIn ?? (input.symmetrical ? deckMark3 : railTuck1));
```

Once non-null, the override wins forever; toggling Sym no longer affects Bottom Tuck 3, and the
slider cannot reach 4" to restore it. The only escape is the section's Advanced **Reset**
(`components/rails/rail-controls.tsx:176`, button at line 339), which also clears
`cornerCutOffsetOverride`, `removeCornerCut` and `singleTuck` for that section — so recovering one
slider costs every other advanced setting on that rail. Hence "can't come back from".

## Why the proposed constraint is the right fix

`bottomTuck3 > bottomTuck1` holds in **every** legitimate derived state, so the rule never fights
correct output — it only blocks states that are already invalid:

| Mode | Bottom Tuck 1 | Bottom Tuck 3 | Relationship |
|---|---|---|---|
| Non-symmetrical | `railTuck1 / 2` (5/16") | `railTuck1` (5/8") | always exactly 2x |
| Symmetrical | `deckMark1` (2 1/2") | `deckMark3` (4") | always `+1.5 * scale` |

`deckMark1 = (0.25*family + 1.75) * scale` and `deckMark3 = (0.25*family + 3.25) * scale`, so their
difference is `1.5 * scale` by construction — always positive. The non-symmetrical pair is 2:1 by
construction. Measured values above confirm both.

**The constraint also subsumes the original "disable when Sym" request:** in symmetrical mode
Bottom Tuck 1 is 2 1/2" while the slider's entire range is 0–1.5", so no position in its range
satisfies `tuck3 > tuck1` — enforcing the constraint effectively disables the slider exactly when
Sym is checked. One rule, both outcomes.

## Implementation notes

- Enforce the floor where the override is applied, not only in the UI — a UI-only guard still lets
  a stale override (set before Sym was checked) shadow `deckMark3` while the control looks fine.
- Clamping to a `bottomTuck1` floor is per-section: `bottomTuck1` itself depends on `symmetrical`,
  `family`, `scale` and thickness, so the floor is dynamic, not a constant like `TUCK_BOUNDS`.
- Consider whether the slider's `max` should also track the derived value: a max of 1.5" cannot
  represent a 4" symmetrical Bottom Tuck 3 even when the value is legal. The pinned-thumb
  misrepresentation is a distinct defect from the inversion and survives the floor fix.
- The precedent for a disabled-when-governed slider is in the same file: Corner Cut Offset uses
  `disabled={spec.removeCornerCut}` plus an `opacity-40` wrapper (~line 281).
- Any change to `rail-bands.ts` needs unit-test coverage pinning both the symmetrical and
  non-symmetrical branches — this file is golden-fixture tested against the original prototype, so
  confirm no fixture drift.

Relevant code: `lib/geometry/rail-bands.ts:228-232`, `components/rails/rail-controls.tsx`
(Sym checkbox, Bottom Tuck 3 slider, `resetAdvanced`).


---

## RESOLVED 2026-08-21

Fixed across two quick tasks, both verified in a browser against the running app.

**260821-bt3** — floored the override in the geometry layer (`rail-bands.ts`), gave the slider
dynamic bounds. Verified: a stale override set before Sym was enabled no longer shadows the derived
value; the slider label and thumb agree.

**260821-bt3b** — made the separation strict and let the slider climb back:
- `MIN_BOTTOM_TUCK_SEPARATION_IN = 1/16` exported from `rail-bands.ts`, documented as a GSD product
  decision rather than a ported workbook formula. Override floor is now
  `max(override, bottomTuck1 + MIN_BOTTOM_TUCK_SEPARATION_IN)`.
- `bottomTuck3Derived` added to the section result so the UI never re-derives
  `symmetrical ? deckMark3 : railTuck1` in the component (geometry stays in `lib/`).
- Slider `min` = `bottomTuck1 + separation`, `max` = `max(1.5", bottomTuck3Derived)`.

**Measured behaviour after the fix (center rail, symmetrical, family MED):**

| State | Label | Slider range |
|---|---|---|
| Symmetrical, no override | 4" | 2.5625 – 4 |
| Dragged to bottom | 2 9/16" | 2.5625 – 4 |
| Climbed back up | 4" | 2.5625 – 4 |
| Stale 3/8" override, then Sym on | 2 9/16" | 2.5625 – 4 |

Bottom Tuck 3 is now always strictly greater than Bottom Tuck 1 (2 9/16" vs 2 1/2" at the floor),
and the derived 4" is always reachable — the "can't come back from" behaviour is gone.

598 tests pass; the 11 golden rail fixtures are byte-identical (the invariant test was tightened to
strict `>` and still passes against all of them).
