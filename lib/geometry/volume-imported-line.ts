/**
 * VOLUME's INPUTS line (quick 261017-vdh, BRIEF 3c): while "Import Designed Board" is ticked, one line
 * says which board the litres are measured from and that the rail shapes come from RAILS, in place of
 * the four hand controls it hides.
 *
 * Length, width and centre thickness are all dims (a distance quoted as a size), so Metric reads them
 * in centimetres to one decimal. A unit is carried once per line of running text: the length and width
 * go bare and the centre thickness, last, carries `cm` for all three — the same precedent as
 * `boardLine` and `pickerBoardLine` in blank-reasons.ts. Every figure goes through the display
 * boundary in `measure-display.ts` (CLAUDE.md Rule 2).
 *
 * Pure — no React, browser or database import (CLAUDE.md Rule 1).
 */
import { formatDim, formatDimBare, formatLength } from "./measure-display";
import type { Mm, UnitsSystem } from "./units";

/**
 * `Board details are imported: 6'0" × 19" × 2 1/2", and the rail shapes from RAILS.`
 * Metric: `Board details are imported: 182.9 × 48.3 × 6.4 cm, and the rail shapes from RAILS.`
 */
export function volumeImportedLine(length: Mm, width: Mm, centre: Mm, system: UnitsSystem): string {
  const lengthText = system === "metric" ? formatDimBare(length, system) : formatLength(length, system);
  const widthText = system === "metric" ? formatDimBare(width, system) : formatDim(width, system);
  return `Board details are imported: ${lengthText} × ${widthText} × ${formatDim(centre, system)}, and the rail shapes from RAILS.`;
}
