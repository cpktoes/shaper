---
quick_id: 261115-evi
title: The printed plan drawings' axis numbers settle on one size
date: 2026-11-15
status: complete
commits: [7a83ae2c]
---

# The printed plan drawings' axis numbers settle on one size — summary

## What changed, in plain words

Print the same board twice and the pages come out the same twice. The small axis numbers on the plan drawings (page 1,
a fish's page 2 or 3, the Rail Band page) used to come out at 9 pt one print and 11 pt the next, on nothing but luck.
They now always print at the size the sheet was drawn for.

## What was wrong

Each drawing pins its words to screen dots from a box it measures, and re-measures whenever its ResizeObserver reports
a change. When a print starts, the form pins every sheet from the 880-dot screen width to the paper's 733 dots inside
`beforeprint`, and the browser takes its snapshot the moment that handler returns. The observer reports at the next
rendering opportunity. Observer first: the words were re-pinned, 9 pt. Snapshot first: the words still carried the
screen's pin on a narrower box, 11 pt (880 over 733 is 1.2, exactly 11 over 9). Nothing in the bottom-tables change
touched it, which is why boards with no bottom cut showed it too.

## How

- The fit speaks last and the drawings answer at once (`PRINT_FIT_EVENT`, `components/viewer/callout-primitives.tsx`):
  after sizing every sheet, `beforePrint` in `use-print-fit.ts` dispatches the event, and both fit hooks measure again
  inside `flushSync`, so the render is on the page before the handler returns. A `beforeprint` listener of the hooks'
  own would not have done: a child's effect runs before its parent's, so the drawings would hear it before the form had
  pinned anything.
- `order-form-print.test.ts` pins the handshake: the event is sent after the last sheet is sized, inside `beforePrint`,
  and both hooks listen, answer with `flushSync` and let go on unmount.

## Proof

- `e2e/summary-print-axis-size.spec.ts` (a computer; the phone print path pins nothing): once the screen layout has
  settled, `beforeprint` is dispatched in screen media — a real print switches media and fires it in the same breath,
  so the boxes change under the drawings right then — and every drawing's text on the sheets is read in the same
  synchronous step. It already equals the size it settles to two frames later. With the event removed the same check
  fails on 28 of 37 texts (9 px against 10.99 px): the race is real and this closes it.
- The same board printed to PDF five times gives five identical files once each file's clock and id are blanked.
- `tsc` clean, lint unchanged, the summary and viewer tests green (208).

## Notes for next time

- Emulating print media before the event hides this race: the sheets are then laid out at the paper's width long before
  `beforeprint`, and the observers have settled. Run the race in screen media.
- A page read straight after hydration may still be laying out: settle it (two equal reads 250 ms apart, the sheet at
  its design width) before measuring, or the check measures its own haste.
