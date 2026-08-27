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
import { deriveEffectiveVolume, deriveRailValues, deriveTemplateValues } from "@/lib/geometry/design";
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
  type FinSystem,
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
import type { DesignSnapshotFields } from "@/lib/models/design-snapshot";

interface DesignState {
  outline: OutlineSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  /** The first free-text field in the design — the Summary screen's Board Name box. Still
   * in-memory only until a Save writes it out: an unsaved board is gone on reload exactly as
   * before, but once `modelId` is set this value round-trips through `designSnapshotFields` on
   * every save and comes back from `applyModel` on every reopen. */
  boardName: string;
  /** Which fin box system the board is glassed for (FCS II, Futures, …). An ordering/glassing
   * choice, not a placement input — no calculated number depends on it — so it sits here as a
   * plain stored value rather than inside `fins`. Read only by the summary's order form. */
  finSystem: FinSystem;
  /** The row in Postgres a Save writes over (D-09) — null means this board has never been
   * saved. Set by `setModelId` after a successful `saveModel`, and by `applyModel` when a rack
   * card is opened. This is session bookkeeping, not board design, so it is deliberately absent
   * from `designSnapshotFields` — a save never stores a reference to its own row. */
  modelId: string | null;
  /** Set true the first time any design-mutating action runs — `applyPreset`, `updateOutline`,
   * `updateRailSection`, `toggleTailHardEdge`, `updateFins`, `updateVolume`,
   * `setFinsImportTemplate`, `setBoardName` or `setFinSystem` — never derived by comparing state against its
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
  finSystem: "fcs2",
  modelId: null,
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
  finSystem: FinSystem;
  modelId: string | null;
  /** True once a board has been applied or edited this session — gates the setup screen's
   * replace-board confirm dialog (D-07). See `DesignState.boardStarted`'s doc comment for why
   * this is a flag set on write, not a derived default-comparison. */
  hasBoardInProgress: boolean;
  /** The subset of state a snapshot holds (D-11) — outline, rails, fins, volume,
   * finsImportTemplate, boardName, finSystem — assembled once here so a caller building a save
   * never has to remember the field list by hand or risk silently dropping one. */
  designSnapshotFields: DesignSnapshotFields;

  updateOutline: (patch: Partial<OutlineSpec>) => void;
  /** Applies a board-type preset (components/setup/setup-screen.tsx) by replacing outline, rails
   * and fins wholesale — a preset is a complete spec, not a patch, so none of the three merges
   * against whatever was there before. Every other field (volume, finsImportTemplate, boardName)
   * resets to `DEFAULT_DESIGN_STATE`, so this always produces a genuinely fresh board rather than
   * carrying over the board the user just discarded. */
  applyPreset: (preset: BoardPreset) => void;
  /** Opens a saved board (D-06/D-07's rack card click). Mirrors `applyPreset`'s wholesale-replace
   * shape exactly: spreads `DEFAULT_DESIGN_STATE`, then sets every field the snapshot carries
   * plus `modelId` and `boardStarted: true`. Wholesale replace, never a patch merge — D-11 says
   * reopening restores the design exactly, and a merge would let the board being replaced leak
   * into the board being opened. */
  applyModel: (id: string, snapshot: DesignSnapshotFields) => void;
  updateRailSection: (key: RailSectionKey, patch: Partial<RailSectionSpec>) => void;
  toggleTailHardEdge: () => void;
  updateFins: (patch: Partial<FinPlacementSpec>) => void;
  updateVolume: (patch: Partial<VolumeSpec>) => void;
  setFinsImportTemplate: (next: boolean) => void;
  setBoardName: (next: string) => void;
  setFinSystem: (next: FinSystem) => void;
  setModelId: (next: string | null) => void;
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
      rails: preset.rails,
      fins: preset.fins,
      boardStarted: true,
    }));

  const applyModel = (id: string, snapshot: DesignSnapshotFields) =>
    setState(() => ({
      ...DEFAULT_DESIGN_STATE,
      outline: snapshot.outline,
      rails: snapshot.rails,
      fins: snapshot.fins,
      volume: snapshot.volume,
      finsImportTemplate: snapshot.finsImportTemplate,
      boardName: snapshot.boardName,
      finSystem: snapshot.finSystem,
      modelId: id,
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

  const setFinSystem = (next: FinSystem) =>
    setState((prev) => ({ ...prev, finSystem: next, boardStarted: true }));

  // Not a design-mutating action — pointing the store at a different (or no) saved row doesn't
  // change the board itself, so this deliberately does NOT set boardStarted.
  const setModelId = (next: string | null) => setState((prev) => ({ ...prev, modelId: next }));

  const outlineGeometry = useMemo(() => buildOutline(state.outline), [state.outline]);
  const railBands = useMemo(() => computeRailBands(state.rails), [state.rails]);

  const templateValues: VolumeTemplateValues = useMemo(
    () => deriveTemplateValues(state.outline, outlineGeometry),
    // Deliberately narrower than "state.outline" (eslint-disable below): deriveTemplateValues
    // only reads outline.length and outline.widePointWidth, and this dependency array is
    // unchanged from before the lib/geometry/design.ts extraction — widening it to the whole
    // outline object would recompute this memo on every unrelated outline edit (nose angle,
    // tail shape, ...), which the extraction must not change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [outlineGeometry, state.outline.length, state.outline.widePointWidth],
  );

  const railValues: VolumeRailValues = useMemo(() => deriveRailValues(railBands), [railBands]);

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
  const effectiveVolume: VolumeSpec = useMemo(
    () => deriveEffectiveVolume(state.volume, templateValues, railValues),
    [state.volume, templateValues, railValues],
  );

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

  const designSnapshotFields: DesignSnapshotFields = useMemo(
    () => ({
      outline: state.outline,
      rails: state.rails,
      fins: state.fins,
      volume: state.volume,
      finsImportTemplate: state.finsImportTemplate,
      boardName: state.boardName,
      finSystem: state.finSystem,
    }),
    [state.outline, state.rails, state.fins, state.volume, state.finsImportTemplate, state.boardName, state.finSystem],
  );

  const value: DesignContextValue = {
    outline: state.outline,
    rails: state.rails,
    fins: state.fins,
    volume: state.volume,
    finsImportTemplate: state.finsImportTemplate,
    boardName: state.boardName,
    finSystem: state.finSystem,
    modelId: state.modelId,
    hasBoardInProgress: state.boardStarted,
    designSnapshotFields,
    updateOutline,
    applyPreset,
    applyModel,
    updateRailSection,
    toggleTailHardEdge,
    updateFins,
    updateVolume,
    setFinsImportTemplate,
    setBoardName,
    setFinSystem,
    setModelId,
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
