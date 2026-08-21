"use client";

/**
 * The shared board-design store. Every design screen (outline/template, rails, fins, volume)
 * reads and writes one board-design object through this context instead of owning its own local
 * state, so a value changed on one screen (an outline edit, a rail thickness) is immediately
 * visible on every other screen that derives from it.
 *
 * Built on React context + `useState`/`useMemo` only — no reducer library, no effects that write
 * state, no persistence. The design resets on reload; the prototype's `seed`/`seedVersion`/
 * `applySeed`/`onSync` message-passing machinery existed only because its screens were separate
 * documents, and has no analogue here.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_BOARD_SPEC, type OutlineSpec, type Point2D } from "@/lib/geometry/board";
import { buildOutline, type OutlineGeometry } from "@/lib/geometry/outline";
import type { BoardPreset } from "@/lib/geometry/presets";
import {
  DEFAULT_RAIL_BAND_SPEC,
  computeRailBands,
  type RailBandsOutput,
  type RailBandSpec,
  type RailSectionKey,
  type RailSectionSpec,
} from "@/lib/geometry/rail-bands";
import {
  DEFAULT_FIN_PLACEMENT_SPEC,
  computeFinPlacement,
  type FinPlacementResult,
  type FinPlacementSpec,
} from "@/lib/geometry/fins";
import {
  DEFAULT_VOLUME_SPEC,
  computeVolume,
  type VolumeRailValues,
  type VolumeResult,
  type VolumeSpec,
  type VolumeTemplateValues,
} from "@/lib/geometry/volume";
import { inchesToMm, mm } from "@/lib/geometry/units";

interface DesignState {
  outline: OutlineSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  /** The first free-text field in the design — the Summary screen's Board Name box. In-memory
   * only, like every other value here: it's gone on reload, exactly as the rest of the design is.
   * Phase 2's named-model saving is where any of this becomes durable. */
  boardName: string;
  /** Set true the first time any design-mutating action runs — `applyPreset`, `updateOutline`,
   * `updateRailSection`, `toggleTailHardEdge`, `updateFins`, `updateVolume`,
   * `setFinsImportTemplate` or `setBoardName` — never derived by comparing state against its
   * default — a user who drags a slider back to its default value has still started a board.
   * Backs `hasBoardInProgress` on the setup screen's replace-board confirmation (D-07). */
  boardStarted: boolean;
}

const DEFAULT_DESIGN_STATE: DesignState = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rails: DEFAULT_RAIL_BAND_SPEC,
  fins: DEFAULT_FIN_PLACEMENT_SPEC,
  volume: DEFAULT_VOLUME_SPEC,
  finsImportTemplate: true,
  boardName: "",
  boardStarted: false,
};

interface FinTailOutline {
  points: Point2D[];
  connector: Point2D | null;
}

interface DesignContextValue {
  // Raw stored specs — the single place each screen's sidebar writes to.
  outline: OutlineSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  boardName: string;
  /** True once a board has been applied or edited this session — gates the setup screen's
   * replace-board confirm dialog (D-07). See `DesignState.boardStarted`'s doc comment for why
   * this is a flag set on write, not a derived default-comparison. */
  hasBoardInProgress: boolean;

  updateOutline: (patch: Partial<OutlineSpec>) => void;
  /** Applies a board-type preset (components/setup/setup-screen.tsx) by replacing the outline
   * wholesale — a preset is a complete spec, not a patch, so this does not merge against
   * whatever outline was there before. Every other field (rails, fins, volume,
   * finsImportTemplate, boardName) resets to `DEFAULT_DESIGN_STATE`, so this always produces a
   * genuinely fresh board rather than carrying over the board the user just discarded. */
  applyPreset: (preset: BoardPreset) => void;
  updateRailSection: (key: RailSectionKey, patch: Partial<RailSectionSpec>) => void;
  toggleTailHardEdge: () => void;
  updateFins: (patch: Partial<FinPlacementSpec>) => void;
  updateVolume: (patch: Partial<VolumeSpec>) => void;
  setFinsImportTemplate: (next: boolean) => void;
  setBoardName: (next: string) => void;
  /** Toggling off also forces `importRailThickness` off and copies the currently effective
   * length/width into the stored manual fields; toggling on needs no copy (the derived override
   * takes over). Ported from Volume.dc.html's `onToggleImportTemplateDimensions`. */
  toggleImportTemplateDimensions: () => void;
  /** No-op while template import is off; toggling off copies the currently effective centre
   * thickness into the stored manual field. Ported from Volume.dc.html's
   * `onToggleImportRailThickness`. */
  toggleImportRailThickness: () => void;

  // Derived values.
  outlineGeometry: OutlineGeometry;
  railBands: RailBandsOutput;
  templateValues: VolumeTemplateValues;
  railValues: VolumeRailValues;
  /** `fins` unless `finsImportTemplate`, in which case boardLength/tailWidth12/tailShape come
   * from the outline. */
  effectiveFins: FinPlacementSpec;
  finPlacement: FinPlacementResult;
  /** The designed outline's tail, in `tailOutlineHalfPoints`' own shape, for the fin viewer to
   * draw behind the fin marks. `null` when not importing. */
  finTailOutline: FinTailOutline | null;
  /** `volume` with length/width/centerThickness overridden per the import toggles — the derived-
   * value equivalent of the prototype's `syncFromTemplate`. */
  effectiveVolume: VolumeSpec;
  volumeResult: VolumeResult;
}

const DesignContext = createContext<DesignContextValue | null>(null);

export function DesignProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesignState>(DEFAULT_DESIGN_STATE);

  const updateOutline = (patch: Partial<OutlineSpec>) =>
    setState((prev) => ({ ...prev, outline: { ...prev.outline, ...patch }, boardStarted: true }));

  // A preset is a complete spec, not a patch (see BoardPreset's own doc comment) — every field
  // not supplied by the preset resets to DEFAULT_DESIGN_STATE's value rather than carrying over
  // from whatever board was there before, so "Discard & Start New" produces a genuinely fresh
  // board (WR-01).
  const applyPreset = (preset: BoardPreset) =>
    setState(() => ({
      ...DEFAULT_DESIGN_STATE,
      outline: preset.outline,
      boardStarted: true,
    }));

  const updateRailSection = (key: RailSectionKey, patch: Partial<RailSectionSpec>) =>
    setState((prev) => ({
      ...prev,
      rails: { ...prev.rails, [key]: { ...prev.rails[key], ...patch } },
      boardStarted: true,
    }));

  const toggleTailHardEdge = () =>
    setState((prev) => ({
      ...prev,
      rails: { ...prev.rails, tailHardEdge: !prev.rails.tailHardEdge },
      boardStarted: true,
    }));

  const updateFins = (patch: Partial<FinPlacementSpec>) =>
    setState((prev) => ({ ...prev, fins: { ...prev.fins, ...patch }, boardStarted: true }));

  const updateVolume = (patch: Partial<VolumeSpec>) =>
    setState((prev) => ({ ...prev, volume: { ...prev.volume, ...patch }, boardStarted: true }));

  const setFinsImportTemplate = (next: boolean) =>
    setState((prev) => ({ ...prev, finsImportTemplate: next, boardStarted: true }));

  const setBoardName = (next: string) => setState((prev) => ({ ...prev, boardName: next, boardStarted: true }));

  const outlineGeometry = useMemo(() => buildOutline(state.outline), [state.outline]);
  const railBands = useMemo(() => computeRailBands(state.rails), [state.rails]);

  const templateValues: VolumeTemplateValues = useMemo(
    () => ({
      area: outlineGeometry.area,
      length: state.outline.length,
      widePointWidth: state.outline.widePointWidth,
      noseWidthAt12: outlineGeometry.noseWidthAt12in,
      tailWidthAt12: outlineGeometry.tailWidthAt12in,
    }),
    [outlineGeometry, state.outline.length, state.outline.widePointWidth],
  );

  const railValues: VolumeRailValues = useMemo(
    () => ({
      noseThickness: railBands.nose.boardThickness,
      centerThickness: railBands.center.boardThickness,
      tailThickness: railBands.tail.boardThickness,
      noseProfile: railBands.nose.profile,
      centerProfile: railBands.center.profile,
      tailProfile: railBands.tail.profile,
    }),
    [railBands],
  );

  // OutlineSpec's TailShape and FinPlacementSpec's FinTailShape are kept structurally aligned on
  // purpose (the same five kind names), so this mapping is a direct assignment rather than a
  // translation table.
  const effectiveFins: FinPlacementSpec = useMemo(() => {
    if (!state.finsImportTemplate) return state.fins;
    return {
      ...state.fins,
      boardLength: state.outline.length,
      tailWidth12: outlineGeometry.tailWidthAt12in,
      tailShape: state.outline.tail.kind,
    };
  }, [
    state.fins,
    state.finsImportTemplate,
    state.outline.length,
    state.outline.tail.kind,
    outlineGeometry.tailWidthAt12in,
  ]);

  const finPlacement = useMemo(() => computeFinPlacement(effectiveFins), [effectiveFins]);

  const finTailOutline: FinTailOutline | null = useMemo(() => {
    if (!state.finsImportTemplate) return null;
    const cutoff = inchesToMm(24);
    const points: Point2D[] = outlineGeometry.points
      .filter((p) => p.station <= cutoff)
      .map((p) => ({ x: p.halfWidth, y: p.station }));
    const tailKind = state.outline.tail.kind;
    // The prototype's own connector rule (Template.dc.html line 276): diamond closes at the
    // origin, swallow closes at the crotch depth, everything else has no connector.
    const connector: Point2D | null =
      tailKind === "diamond"
        ? { x: mm(0), y: mm(0) }
        : tailKind === "swallow"
          ? { x: mm(0), y: outlineGeometry.centreCloseStation }
          : null;
    return { points, connector };
  }, [state.finsImportTemplate, outlineGeometry, state.outline.tail.kind]);

  // Derived-value equivalent of the prototype's syncFromTemplate (Volume.dc.html lines 235-242):
  // produces the same observable values without an effect that writes back into state.
  const effectiveVolume: VolumeSpec = useMemo(() => {
    if (!state.volume.importTemplateDimensions) return state.volume;
    const centerThickness = state.volume.importRailThickness
      ? railValues.centerThickness
      : state.volume.centerThickness;
    return {
      ...state.volume,
      length: templateValues.length,
      width: templateValues.widePointWidth,
      centerThickness,
    };
  }, [state.volume, templateValues, railValues]);

  const volumeResult = useMemo(
    () => computeVolume(effectiveVolume, templateValues, railValues),
    [effectiveVolume, templateValues, railValues],
  );

  // The prototype's own handoff semantics (Volume.dc.html lines 412-437) — the one place derived
  // values must be written back into stored state.
  const toggleImportTemplateDimensions = () => {
    setState((prev) => {
      const next = !prev.volume.importTemplateDimensions;
      if (next) {
        return {
          ...prev,
          volume: { ...prev.volume, importTemplateDimensions: true },
          boardStarted: true,
        };
      }
      return {
        ...prev,
        volume: {
          ...prev.volume,
          importTemplateDimensions: false,
          importRailThickness: false,
          length: effectiveVolume.length,
          width: effectiveVolume.width,
        },
        boardStarted: true,
      };
    });
  };

  const toggleImportRailThickness = () => {
    if (!state.volume.importTemplateDimensions) return;
    setState((prev) => {
      const next = !prev.volume.importRailThickness;
      if (next) {
        return {
          ...prev,
          volume: { ...prev.volume, importRailThickness: true },
          boardStarted: true,
        };
      }
      return {
        ...prev,
        volume: {
          ...prev.volume,
          importRailThickness: false,
          centerThickness: effectiveVolume.centerThickness,
        },
        boardStarted: true,
      };
    });
  };

  const value: DesignContextValue = {
    outline: state.outline,
    rails: state.rails,
    fins: state.fins,
    volume: state.volume,
    finsImportTemplate: state.finsImportTemplate,
    boardName: state.boardName,
    hasBoardInProgress: state.boardStarted,
    updateOutline,
    applyPreset,
    updateRailSection,
    toggleTailHardEdge,
    updateFins,
    updateVolume,
    setFinsImportTemplate,
    setBoardName,
    toggleImportTemplateDimensions,
    toggleImportRailThickness,
    outlineGeometry,
    railBands,
    templateValues,
    railValues,
    effectiveFins,
    finPlacement,
    finTailOutline,
    effectiveVolume,
    volumeResult,
  };

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign(): DesignContextValue {
  const ctx = useContext(DesignContext);
  if (!ctx) {
    throw new Error("useDesign must be used within a DesignProvider");
  }
  return ctx;
}
