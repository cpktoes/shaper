/**
 * TEMPLATE's GUIDE input for a board, worked out with the same library calls the design store makes
 * (`components/design/design-store.tsx`'s derived memos): the outline with every locked wing placed
 * (`resolveWingStations`), the outline geometry, the fins placed on the sharp-cornered outline
 * (`outlineForFins` → `deriveEffectiveFins` → `computeFinPlacement`), and the trailing edges a wing can lock
 * to (`wingFinEdges`). Nothing here is a typed number: every value comes out of the app's maths.
 */
import { presetDesignFields } from "../../blanks/preset-blanks";
import type { OutlineSpec } from "../board";
import { deriveEffectiveFins } from "../design";
import { computeFinPlacement, importedFinTailFromOutline, type FinPlacementSpec } from "../fins";
import type { TemplateGuideInput } from "../guide-outline";
import { buildOutline } from "../outline";
import { BOARD_PRESETS, type BoardPreset } from "../presets";
import type { UnitsSystem } from "../units";
import { resolveWingStations, wingFinEdges } from "../wing-lock";
import { nextWing, outlineForFins } from "../wings";

/** The fields TEMPLATE's GUIDE reads from a board: its outline, its fins, and FINS' Import Designed Board
 * (ticked on every fresh board, as the store opens one). */
export interface TemplateGuideFields {
  outline: OutlineSpec;
  fins: FinPlacementSpec;
  finsImportTemplate?: boolean;
}

/** The store's TEMPLATE inputs for a board's fields, memo for memo. */
export function templateGuideInputFromFields(fields: TemplateGuideFields): TemplateGuideInput {
  const importing = fields.finsImportTemplate ?? true;
  const outline = resolveWingStations(fields.outline, fields.fins, importing).outline;
  const outlineGeometry = buildOutline(outline);
  const finOutline = outlineForFins(outline);
  const finGeometry = finOutline === outline ? outlineGeometry : buildOutline(finOutline);
  const effectiveFins = deriveEffectiveFins(fields.fins, importing, finOutline, finGeometry);
  const finPlacement = computeFinPlacement(effectiveFins, importing ? importedFinTailFromOutline(finGeometry) : null);
  return { outline, outlineGeometry, wingFinEdges: wingFinEdges(finPlacement.marks), finMarks: finPlacement.marks };
}

/** A preset as its card opens it, with an optional change to its outline (another tail, wings). */
export function guideTemplateInput(presetId: BoardPreset["id"], outline: Partial<OutlineSpec> = {}): TemplateGuideInput {
  const preset = BOARD_PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error(`no preset ${presetId}`);
  const fields = presetDesignFields(preset);
  return templateGuideInputFromFields({ outline: { ...fields.outline, ...outline }, fins: fields.fins });
}

/** A preset with the wings "+ Add a wing" would add, one press at a time, as the WINGS sidebar adds them. */
export function guideTemplateInputWithWings(presetId: BoardPreset["id"], count: 1 | 2, system: UnitsSystem): TemplateGuideInput {
  let input = guideTemplateInput(presetId);
  for (let i = 0; i < count; i++) {
    const wings = input.outline.wings ?? [];
    const wing = nextWing(wings, input.wingFinEdges, input.outlineGeometry, system);
    const preset = presetDesignFields(BOARD_PRESETS.find((p) => p.id === presetId)!);
    input = templateGuideInputFromFields({ outline: { ...input.outline, wings: [...wings, wing] }, fins: preset.fins });
  }
  return input;
}
