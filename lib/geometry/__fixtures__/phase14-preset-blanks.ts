/**
 * The board each preset opened as when the Phase 14 records were taken — the preset's own outline,
 * foil, rails and fins, sitting in the blank it opened in at go-live 2 (2026-10-02).
 *
 * `phase14-today-golden.json` and `phase14-preset-figures.json` record each preset's figures on the
 * blank it opened in then. A preset may change its blank later (the Longboard moved from the US
 * Blanks 9'3"Y to the 9'4"B on 2026-10-03, the founder's call), and that must never rewrite a
 * historical record — so the record tests read the frozen blanks in `phase14-preset-blanks.json`
 * (a copy of `lib/blanks/preset-blanks.generated.json` as it stood at go-live 2) instead of the
 * live pick. Everything else comes from the live preset, exactly as `presetDesignFields` builds it.
 */
import { presetDesignFields, type PresetDesignFields } from "@/lib/blanks/preset-blanks";
import type { BlankRecord } from "../blank";
import type { BoardPreset } from "../presets";
import { mm } from "../units";
import frozen from "./phase14-preset-blanks.json";

interface FrozenPick {
  vendor: string;
  name: string;
  placementMm: number;
}

const FROZEN = frozen as unknown as { picks: Record<string, FrozenPick>; blanks: BlankRecord[] };

/** `presetDesignFields(preset)` with the blank the Phase 14 records were taken on. */
export function recordedPresetDesignFields(preset: BoardPreset): PresetDesignFields {
  const fields = presetDesignFields(preset);
  const pick = FROZEN.picks[preset.id];
  if (!pick) throw new Error(`${preset.id} has no frozen Phase 14 pick in phase14-preset-blanks.json`);
  const copy = FROZEN.blanks.find((blank) => blank.vendor === pick.vendor && blank.name === pick.name);
  if (!copy) throw new Error(`${pick.vendor} ${pick.name} is not in phase14-preset-blanks.json`);
  return { ...fields, blank: { ...fields.blank, copy, placement: mm(pick.placementMm) } };
}
