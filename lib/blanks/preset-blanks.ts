/**
 * The four presets' foam blanks (Phase 11, D-03) — what a preset opens sitting in.
 *
 * A preset names a blank and a placement instead of a hand-drawn rocker. The setup screen that
 * applies a preset never loads the blank catalogue (RESEARCH Pitfall 4), and a board carries its
 * blank's rows by value (D-01), so the rows of exactly the picked blanks ship with the app in
 * `preset-blanks.generated.json`. That file is written ONLY by
 * `scripts/generate-preset-blanks.ts`, from the committed catalogue CSVs through the tested reader —
 * never by hand; `preset-blanks.test.ts` fails if a row there differs from its CSV, if it holds a
 * blank no preset picks, or if a provisional pick is no longer what the rule below produces.
 *
 * Pure: no React, browser API or database import, and never `seed-files.ts` (that reads the disk,
 * Node only) — the generator and the tests read the catalogue and hand it in.
 */
import generated from "./preset-blanks.generated.json";
import { DEFAULT_BLANK_CUT, type BlankRecord, type BoardBlank } from "@/lib/geometry/blank";
import { listBlanks, nearestFit, type BoardFitContext, type PreparedBlank } from "@/lib/geometry/blank-fit";
import { DEFAULT_FOIL_SPEC, type FoilSpec } from "@/lib/geometry/foil";
import { buildOutline, sampleOutline } from "@/lib/geometry/outline";
import type { BoardPreset } from "@/lib/geometry/presets";
import type { FinPlacementSpec } from "@/lib/geometry/fins";
import type { OutlineSpec } from "@/lib/geometry/board";
import type { RailBandSpec } from "@/lib/geometry/rail-bands";
import { DEFAULT_FALLBACK_ROCKER, type FiveStationRocker } from "@/lib/geometry/rocker";
import { mm, type Mm } from "@/lib/geometry/units";
import { DEFAULT_FIT_DEFAULTS, toFitSettings } from "@/lib/fit-defaults-preference";

/** One preset's blank: which blank, where the board sits on it, and whether the rule chose it. */
export interface PresetBlankPick {
  vendor: string;
  name: string;
  /** Board centre relative to the blank centre, positive toward the nose. */
  placementMm: Mm;
  /** True while the pick is the generator's rule (D-03); false once the founder captured one. */
  provisional: boolean;
}

/** The generated module's shape: a note, one pick per preset, and the picked blanks' rows. */
export interface PresetBlanksModule {
  note: string;
  picks: Record<BoardPreset["id"], PresetBlankPick>;
  blanks: BlankRecord[];
}

/** The generated module, typed (JSON imports type every number as a plain number). */
export const PRESET_BLANKS: PresetBlanksModule = generated as unknown as PresetBlanksModule;

/**
 * The board a preset describes, as the fit check reads it: its own length, outline, centre and
 * tips, no fine-tunes, and its own cut (Phase 12, D-17) — `DEFAULT_BLANK_CUT`'s 1/8" deck skin,
 * Pin deck tips and Deck fine-tunes, never the shaper's account defaults, the same way a preset
 * keeps its own tips. Otherwise a shaper whose Tip Style default is Bottom would open a new
 * Shortboard already flagged as not fitting its own blank. Litres follow the new foil (D-08); the
 * picks stay provisional and unchanged.
 */
export function presetFitContext(preset: BoardPreset): BoardFitContext {
  const geometry = buildOutline(preset.outline);
  return {
    board: {
      length: preset.outline.length,
      centerThickness: preset.foil.center,
      noseTip: preset.foil.noseTip,
      tailTip: preset.foil.tailTip,
      nose12Offset: mm(0),
      tail12Offset: mm(0),
      ...DEFAULT_BLANK_CUT,
    },
    halfWidthAt: (station: Mm) => sampleOutline(geometry, station),
    widePointStation: geometry.widePointStation,
  };
}

/**
 * The provisional pick the rule makes for a preset (D-03, the D-08 rule): of the blanks that fit
 * the preset's own board — its length, outline, centre and tips, with the default fit settings —
 * the one whose length is closest to the preset's own length, ties to less spare foam at the
 * centre, placed where `listBlanks` lands it (the fitting placement closest to centre). Takes the
 * prepared catalogue from the caller; throws, naming the preset, when nothing fits.
 */
export function provisionalPresetPick(preset: BoardPreset, preparedCatalogue: readonly PreparedBlank[]): PresetBlankPick {
  const ctx = presetFitContext(preset);
  const list = listBlanks(preparedCatalogue, ctx, toFitSettings(DEFAULT_FIT_DEFAULTS));
  const pick = nearestFit({ vendor: "", name: "", lengthMm: preset.outline.length }, list.fits, preset.foil.center);
  if (!pick) {
    throw new Error(`No blank in the catalogue fits the ${preset.name} preset — cannot make its provisional pick.`);
  }
  return {
    vendor: pick.prepared.record.vendor,
    name: pick.prepared.record.name,
    placementMm: pick.placement,
    provisional: true,
  };
}

/** The blank's rows in the generated module, found by vendor and name; throws when absent. */
function moduleRecord(vendor: string, name: string): BlankRecord {
  const record = PRESET_BLANKS.blanks.find((blank) => blank.vendor === vendor && blank.name === name);
  if (!record) {
    throw new Error(
      `${vendor} ${name} is not in lib/blanks/preset-blanks.generated.json — re-run scripts/generate-preset-blanks.ts.`,
    );
  }
  return record;
}

/**
 * The blank a preset opens in (D-01, D-03): a captured `preset.blank` wins over the generated
 * module's pick; the rows are the module's own record (one stable object per blank, so the store
 * prepares it once); both fine-tunes start at 0; and the board opens with its own cut,
 * `DEFAULT_BLANK_CUT` (1/8" skin, Pin deck, fine-tunes on the Deck — D-17), the cut its pick was
 * judged with in `presetFitContext`, so a preset never follows the shaper's account defaults.
 */
export function presetBlank(preset: BoardPreset): BoardBlank {
  const chosen = preset.blank
    ? { vendor: preset.blank.vendor, name: preset.blank.name, placement: preset.blank.placement }
    : (() => {
        const pick = PRESET_BLANKS.picks[preset.id];
        if (!pick) {
          throw new Error(
            `The ${preset.name} preset has no pick in lib/blanks/preset-blanks.generated.json — re-run scripts/generate-preset-blanks.ts.`,
          );
        }
        return { vendor: pick.vendor, name: pick.name, placement: pick.placementMm };
      })();
  return {
    copy: moduleRecord(chosen.vendor, chosen.name),
    placement: chosen.placement,
    nose12Offset: mm(0),
    tail12Offset: mm(0),
    ...DEFAULT_BLANK_CUT,
  };
}

/** The design fields a preset sets — everything else about a fresh board is the store's default. */
export interface PresetDesignFields {
  outline: OutlineSpec;
  rocker: FiveStationRocker;
  foil: FoilSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  blank: BoardBlank;
}

/**
 * The ONE mapping from a preset to the board it opens as (D-03, Pitfall 4): its outline, rails and
 * fins; its blank (`presetBlank`); its foil's centre and tips over `DEFAULT_FOIL_SPEC`'s 12"
 * thicknesses (the hand-set fallback's own, ignored while the blank is picked); and the default
 * hand-set rocker, likewise unread while the blank is picked. `applyPreset` and the preset card's
 * numbers (`presetSummary`) both read this, so a preset card and the board it opens agree.
 */
export function presetDesignFields(preset: BoardPreset): PresetDesignFields {
  return {
    outline: preset.outline,
    rocker: DEFAULT_FALLBACK_ROCKER,
    foil: {
      ...DEFAULT_FOIL_SPEC,
      noseTip: preset.foil.noseTip,
      center: preset.foil.center,
      tailTip: preset.foil.tailTip,
    },
    rails: preset.rails,
    fins: preset.fins,
    blank: presetBlank(preset),
  };
}
