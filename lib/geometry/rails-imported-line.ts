/**
 * The line under RAILS' "Import Rocker & Foil Values" tick box (quick 261017-vdh, the founder's
 * canvas, BRIEF 2b): `Thickness details are imported: 1 5/16" nose @ 12" · 2 1/2" center ·
 * 1 9/16" tail @ 12"`, and in Metric `33 mm nose @ 30.5 cm · 64 mm center · 40 mm tail @ 30.5 cm`.
 *
 * All three figures are marks (a foil station thickness reads in whole millimetres in Metric), the
 * station is the house station label (`12"` / `30.5 cm`), and each figure carries its own unit —
 * exactly as the canvas prints the Metric line. Every number goes through `measure-display.ts`
 * (CLAUDE.md Rule 2). The precedent is `boardLine` in `blank-reasons.ts`, which prints the
 * ROCKER screen's "TEMPLATE details are imported" line.
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import { formatMark, stationLabel } from "./measure-display";
import type { Mm, UnitsSystem } from "./units";

/**
 * @param nose12 the foil's nose thickness at the 12" station
 * @param center the board's centre thickness
 * @param tail12 the foil's tail thickness at the 12" station
 */
export function railsImportedLine(nose12: Mm, center: Mm, tail12: Mm, system: UnitsSystem): string {
  const station = stationLabel(system);
  return (
    `Thickness details are imported: ${formatMark(nose12, system)} nose @ ${station}` +
    ` · ${formatMark(center, system)} center` +
    ` · ${formatMark(tail12, system)} tail @ ${station}`
  );
}
