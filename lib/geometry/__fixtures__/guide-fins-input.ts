/**
 * FINS' GUIDE input for a preset, worked out with the same library calls the design store makes
 * (`components/design/design-store.tsx`'s fin memos): the board a preset card opens (`presetDesignFields`),
 * its wings resolved against the fins, the fins reading the winged outline with its corner radii at 0, the
 * real tail cut from it while Import Designed Board is ticked, and the tail FINS draws. Nothing here is a
 * typed number: every value comes out of the app's maths.
 */
import type { Point2D } from "../board";
import { presetDesignFields, type PresetDesignFields } from "../../blanks/preset-blanks";
import { deriveEffectiveFins } from "../design";
import { computeFinPlacement, importedFinTailFromOutline, type FinPlacementSpec } from "../fins";
import type { FinsGuideInput } from "../guide-fins";
import { buildOutline } from "../outline";
import { BOARD_PRESETS, type BoardPreset } from "../presets";
import { resolveWingStations } from "../wing-lock";
import { outlineForFins } from "../wings";
import { mm } from "../units";

/** The store's FINS inputs for a board's fields, Import Designed Board ticked or not. */
export function finsGuideInputFromFields(fields: Pick<PresetDesignFields, "outline" | "fins">, importing = true): FinsGuideInput {
  const resolved = resolveWingStations(fields.outline, fields.fins, importing).outline;
  const outlineGeometry = buildOutline(resolved);
  const finOutline = outlineForFins(resolved);
  const finGeometry = finOutline === resolved ? outlineGeometry : buildOutline(finOutline);
  const effectiveFins = deriveEffectiveFins(fields.fins, importing, finOutline, finGeometry);
  const finImportedTail = importing ? importedFinTailFromOutline(finGeometry) : null;
  const drawnTail = importing ? (finGeometry === outlineGeometry ? finImportedTail : importedFinTailFromOutline(outlineGeometry)) : null;
  const kind = fields.outline.tail.kind;
  const connector: Point2D | null =
    kind === "diamond" ? { x: mm(0), y: mm(0) } : kind === "swallow" ? { x: mm(0), y: outlineGeometry.centreCloseStation } : null;
  return {
    effectiveFins,
    finImportedTail,
    finPlacement: computeFinPlacement(effectiveFins, finImportedTail),
    finTailOutline: drawnTail ? { points: drawnTail.points, connector } : null,
    outlineGeometry,
    finsImportTemplate: importing,
  };
}

/** A preset as its card opens it, with an optional change to the stored fins (a setup picked, Import
 * Designed Board unticked and a length typed). */
export function guideFinsInput(
  presetId: BoardPreset["id"],
  options: { fins?: Partial<FinPlacementSpec>; importing?: boolean } = {},
): FinsGuideInput {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no preset ${presetId}`);
  const fields = presetDesignFields(preset);
  return finsGuideInputFromFields({ outline: fields.outline, fins: { ...fields.fins, ...options.fins } }, options.importing ?? true);
}
