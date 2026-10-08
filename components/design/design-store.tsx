"use client";

/**
 * The shared board-design store. Every design screen (outline/template, rails, fins, volume)
 * reads and writes one board-design object through this context instead of owning its own local
 * state, so a value changed on one screen (an outline edit, a rail thickness) is immediately
 * visible on every other screen that derives from it.
 *
 * The store is also now the thing that knows which saved row the board belongs to (`modelId`)
 * and whether that row is behind what's on screen (`dirty`/`saveStatus`): once a board has a
 * `modelId`, it is durable in Postgres for its signed-in shaper and autosaves after every edit
 * (D-08). An anonymous or never-saved board still lives here only, and is gone on reload exactly
 * as it always was.
 *
 * Built on React context + `useState`/`useMemo` only — no reducer library, and every design-field
 * mutator sets state directly rather than through a synchronization effect that mirrors one piece
 * of state into another. `DesignProvider`'s autosave timer (below) is the one effect that does
 * write state, but it isn't that antipattern: it decides *when* to persist an already-computed
 * design, it never computes one. The prototype's `seed`/`seedVersion`/`applySeed`/`onSync`
 * message-passing machinery existed only because its screens were separate documents, and has no
 * analogue here.
 *
 * The side profile (Phase 11, Pattern 5). The store builds ONE description of the board seen from
 * the side — `sideProfile`, from `buildBoardProfile` in `lib/geometry/board-profile.ts` — and every
 * consumer reads it: RAILS through `effectiveRails` (its three thickness stations), VOLUME through
 * the cross-section integration (its dense thickness curve), and the ROCKER drawing, DATASHEET and
 * Summary order form directly. A board with no blank builds it from the five hand-set rocker
 * stations and the stored foil (D-14), so nothing RAILS shows moves for such a board; a board in a
 * blank builds it from the board's own copy of that blank's catalogue rows (D-01), prepared once
 * per copy. The copy lives on the board itself (`blank`), never looked up again, so a later
 * catalogue correction can never move a saved board.
 *
 * The board's cut travels on its blank too (Phase 12, D-01, D-04, D-13): how much comes off the
 * deck (`deckSkin`), where the tips are thinned (`tipStyle`, Pin deck or Bottom) and which surface
 * a 12" fine-tune moves (`fineTuneSurface`). The first pick bakes in the shaper's live Deck Skin and
 * Tip Style from Fit & Tip Defaults; switching to another blank keeps the board's own; Remove This
 * Blank takes them away with the blank, and one undo brings them all back together.
 *
 * Where each tip's thinning starts rides on the blank too (Phase 14, D-02, D-11, D-24): a start set
 * by hand is stored as `noseThinningStart` / `tailThinningStart`, and a tip on Automatic stores no
 * key at all, so a board sent back to Automatic equals one that never had a start. Switching blanks
 * keeps a hand-set start; a first pick starts both tips on Automatic; ↺ Reset Fine-Tune never
 * touches them. The ten blank moves are `pickBlank`, `setPlacement`, `setDeckSkin`, `setTipStyle`,
 * `setFineTuneSurface`, `setFineTune`, `resetFineTune`, `setThinningStart`,
 * `setThinningStartAutomatic` and `removeBlank`.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { saveModel } from "@/app/design/actions";
import {
  AUTOSAVE_DEBOUNCE_MS,
  decideAutosave,
  nextStatusAfter,
  type SaveStatus,
} from "@/lib/models/autosave";
import { DEFAULT_BOARD_SPEC, type OutlineSpec, type Point2D } from "@/lib/geometry/board";
import { buildOutline, sampleOutline, type OutlineGeometry } from "@/lib/geometry/outline";
import type { FiveStationRocker } from "@/lib/geometry/rocker";
import { presetDesignFields } from "@/lib/blanks/preset-blanks";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import type { FoilSpec } from "@/lib/geometry/foil";
import {
  DEFAULT_BLANK_CUT,
  type BlankRecord,
  type BoardBlank,
  type FineTuneSurface,
  type TipStyle,
} from "@/lib/geometry/blank";
import { prepareBlank, thinningStartsOf, type PreparedBlank } from "@/lib/geometry/blank-fit";
import type { TipEnd } from "@/lib/geometry/tip-taper";
import { buildBoardProfile, handSetFromProfile, type BoardSideProfile } from "@/lib/geometry/board-profile";
import type { BoardPreset } from "@/lib/geometry/presets";
import {
  deriveEffectiveRails,
  deriveEffectiveVolume,
  deriveQuotedVolumeLitres,
  deriveRailValues,
  deriveTemplateValues,
} from "@/lib/geometry/design";
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
  importedFinTailFromOutline,
  type FinPlacementResult,
  type FinPlacementSpec,
  type FinSystem,
  type ImportedFinTail,
} from "@/lib/geometry/fins";
import {
  DEFAULT_VOLUME_SPEC,
  computeCrossSectionVolume,
  computeVolume,
  type CrossSectionVolumeResult,
  type VolumeRailValues,
  type VolumeResult,
  type VolumeSpec,
  type VolumeTemplateValues,
} from "@/lib/geometry/volume";
import { type Litres, type Mm, mm } from "@/lib/geometry/units";
import type { DesignSnapshotFields } from "@/lib/models/design-snapshot";
import {
  canRedo,
  canUndo,
  emptyHistory,
  isTextEntryTarget,
  recordEdit,
  redo,
  undo,
  undoShortcut,
  type DesignHistory,
} from "@/lib/design-history";
import { pickOutlineGhost } from "@/lib/outline-ghost";

/** What one undo/redo step holds — `DesignSnapshotFields` (D-11's eleven-field saved-board shape)
 * minus `boardName`. The exclusion is deliberate and structural, not a special case bolted onto
 * one mutator: `boardName` is a text box, and a text box's own undo belongs to the browser
 * (`isTextEntryTarget` below is what actually enforces that at the keyboard), so it is simply
 * never a field this history's own `useMemo` looks at — a typed board name can never produce a
 * new snapshot identity, and so can never record a step, by construction rather than by a
 * separate guard that could drift out of sync with it. */
type DesignHistorySnapshot = Omit<DesignSnapshotFields, "boardName">;

interface DesignState {
  outline: OutlineSpec;
  /** The hand-set fallback rocker (D-14): four typed lifts, the centre always 0. What the board's
   * rocker IS while no blank is picked; kept, unread, while one is. */
  rocker: FiveStationRocker;
  foil: FoilSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  /** Whether the RAILS screen's three thickness sliders read from the foil (ROCKER screen) or
   * from their own stored `rails.*.boardThickness` (D-09/D-10). Default true — a board designed
   * in the app is the common case. Toggling this off/on never touches `rails.*.boardThickness`
   * itself: the sliders write there only while unlinked, so a shaper's hand-typed value survives
   * untouched across any number of link flips and returns intact when the link goes off again —
   * see `toggleRailsImportFoilThickness` below for the reasoning behind that choice. */
  railsImportFoilThickness: boolean;
  /** The first free-text field in the design — the Summary screen's Board Name box. Still
   * in-memory only until a Save writes it out: an unsaved board is gone on reload exactly as
   * before, but once `modelId` is set this value round-trips through `designSnapshotFields` on
   * every save and comes back from `applyModel` on every reopen. */
  boardName: string;
  /** Which fin box system the board is glassed for (FCS II, Futures, …). An ordering/glassing
   * choice, not a placement input — no calculated number depends on it — so it sits here as a
   * plain stored value rather than inside `fins`. Read only by the summary's order form. */
  finSystem: FinSystem;
  /** The board's foam blank (D-01): the blank's own catalogue rows, copied BY VALUE when it was
   * picked (so a later catalogue correction can never move this board), where the board sits on it
   * (`placement`, board centre relative to blank centre, positive toward the nose) and the two
   * signed 12" fine-tunes (D-11). `null` means the hand-set fallback — five typed rocker stations
   * and the stored foil (D-02). Changed only by the shaper's own pick, slide, fine-tune, reset or
   * removal (R6): no other edit ever clears it. */
  blank: BoardBlank | null;
  /** The row in Postgres a Save writes over (D-09) — null means this board has never been
   * saved. Set by `markSaved` after the shaper's own first, manual `saveModel` succeeds, by
   * `applyModel` when a rack card is opened, and cleared back to null by `setModelId(null)` when
   * the board currently open in the editor is deleted from the rack (`board-rack.tsx`) — so the
   * next Save creates a fresh row instead of writing over one that no longer exists. This is
   * session bookkeeping, not board design, so it is deliberately absent from `designSnapshotFields` — a
   * save never stores a reference to its own row. */
  modelId: string | null;
  /** Set true the first time any design-mutating action runs — `applyPreset`, `updateOutline`,
   * `updateRocker`, `updateFoil`, the ten blank moves (`pickBlank`, `setPlacement`, `setDeckSkin`,
   * `setTipStyle`, `setFineTuneSurface`, `setFineTune`, `resetFineTune`, `setThinningStart`,
   * `setThinningStartAutomatic`, `removeBlank`), `updateRailSection`, `toggleTailHardEdge`, `updateFins`,
   * `updateVolume`, `setFinsImportTemplate`, `toggleRailsImportFoilThickness`, `setBoardName`,
   * `setFinSystem`, the two VOLUME import toggles or `markSaved` — never derived by
   * comparing state against its default — a user who drags a slider back to its default value
   * has still started a board. Backs `hasBoardInProgress` on the setup screen's replace-board
   * confirmation (D-07). Also the D-19 switch: while false, the board's foil tips are the gear
   * menu's live tip defaults (see `startedFrom`); the edit that sets it true bakes them in. */
  boardStarted: boolean;
  /** True when the store's snapshot fields disagree with the row `modelId` points at — set by
   * exactly the same mutators that set `boardStarted` true, because a fresh edit is exactly the
   * moment both become true. The two flags answer different questions (has a board been
   * started, versus does the saved row now lag the screen), but pairing them on every mutator is
   * what stops a new one from silently opting out of autosave. `applyModel` is the one
   * exception: opening a saved board sets this false, because the store now matches the row
   * exactly (D-09). Cleared only once the server confirms a write, never when the request is
   * merely sent — see the autosave effect in `DesignProvider` (D-08). */
  dirty: boolean;
  /** The nav Save control's current state (D-08, `lib/models/autosave.ts`'s `SaveStatus`) — read
   * by `save-button.tsx` and written only by the autosave effect and `requestSave`. Lives here
   * rather than as local state in the button because the nav is mounted once in the root layout
   * and this has to survive navigation between design screens. */
  saveStatus: SaveStatus;
  /** Whether the open saved board is locked (quick 261008-lsy). Read from the board's row when it is
   * opened (`applyModel`), changed by the Board Rack's lock row and by the top bar's Unlock button.
   * Session bookkeeping like `modelId`: it is in neither `designSnapshotFields` nor the undo
   * history, so a save never stores it and Undo never rolls it back. */
  locked: boolean;
}

const DEFAULT_DESIGN_STATE: DesignState = {
  outline: DEFAULT_BOARD_SPEC.outline,
  rocker: DEFAULT_BOARD_SPEC.rocker,
  foil: DEFAULT_BOARD_SPEC.foil,
  rails: DEFAULT_RAIL_BAND_SPEC,
  fins: DEFAULT_FIN_PLACEMENT_SPEC,
  volume: DEFAULT_VOLUME_SPEC,
  finsImportTemplate: true,
  railsImportFoilThickness: true,
  boardName: "",
  finSystem: "fcs2",
  blank: null,
  modelId: null,
  boardStarted: false,
  dirty: false,
  saveStatus: "idle",
  locked: false,
};

/** The gear menu's two tip defaults (Fit & Tip Defaults, 11-08), as a new board's foil tips. */
interface LiveTips {
  noseTip: Mm;
  tailTip: Mm;
}

/** The gear menu's Deck Skin and Tip Style (Fit & Tip Defaults, Phase 12), as a first pick's cut. */
interface LiveCut {
  deckSkin: Mm;
  tipStyle: TipStyle;
}

/**
 * D-19: a brand-new board nobody has edited shows the LIVE tip defaults from the gear menu — change
 * Nose Tip Thickness there and an untouched board's nose tip follows at once. The first edit of
 * any kind is what makes the board the shaper's own: every design mutator's updater starts from
 * `startedFrom(prev, liveTips)`, which, on a board not yet started, bakes the current live tips
 * into its stored foil — so from that edit on the board keeps its own tips and never depends on a
 * live setting again (D-09). A board already started (edited, saved, opened from the rack or
 * started from a preset, whose tips are its own) comes back untouched. Pure: no hooks, no refs.
 */
function startedFrom(prev: DesignState, liveTips: LiveTips): DesignState {
  if (prev.boardStarted) return prev;
  return { ...prev, foil: { ...prev.foil, noseTip: liveTips.noseTip, tailTip: liveTips.tailTip } };
}

interface FinTailOutline {
  points: Point2D[];
  connector: Point2D | null;
}

interface DesignContextValue {
  // Raw stored specs — the single place each screen's sidebar writes to.
  outline: OutlineSpec;
  /** The hand-set fallback rocker (D-14) — see `DesignState.rocker`. Draw from `sideProfile`, not
   * from this: with a blank picked, the drawn rocker is the blank's. */
  rocker: FiveStationRocker;
  foil: FoilSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  /** See `DesignState.railsImportFoilThickness`'s doc comment. */
  railsImportFoilThickness: boolean;
  boardName: string;
  finSystem: FinSystem;
  /** The board's blank, by value, or null for the hand-set fallback — see `DesignState.blank`. */
  blank: BoardBlank | null;
  modelId: string | null;
  /** True once a board has been applied or edited this session — gates the setup screen's
   * replace-board confirm dialog (D-07). See `DesignState.boardStarted`'s doc comment for why
   * this is a flag set on write, not a derived default-comparison. */
  hasBoardInProgress: boolean;
  /** The subset of state a snapshot holds (D-11) — outline, rocker, foil, rails, fins, volume,
   * finsImportTemplate, railsImportFoilThickness, boardName, finSystem, blank — assembled once here so a
   * caller building a save never has to remember the field list by hand or risk silently dropping
   * one. */
  designSnapshotFields: DesignSnapshotFields;
  /** True when the store's snapshot fields disagree with what `modelId` points at in Postgres —
   * `save-button.tsx` reads this alongside `saveStatus` to decide what the nav shows. See
   * `DesignState.dirty`'s doc comment for exactly which mutators set it. */
  isDirty: boolean;
  /** The nav Save control's current state (D-08). See `DesignState.saveStatus`'s doc comment. */
  saveStatus: SaveStatus;
  /** Fires the same save the autosave effect would, immediately and with no debounce — what
   * `save-button.tsx` calls both for a signed-in shaper's manual Save on an already-saved board
   * and for the one-click retry after a failed save. A no-op while `modelId` is null (nothing to
   * save to yet) or while a save is already in flight (never two concurrent writes to one row). */
  requestSave: () => void;

  /** Whether there is a step to take back this session — `phone-undo-bar.tsx` and the keyboard
   * shortcut both gate on this so nothing new appears until there is something to undo. */
  canUndo: boolean;
  /** The mirror of `canUndo`, for redo. */
  canRedo: boolean;
  /** Steps the board back one entry (a no-op with nothing to undo). See its own doc comment in
   * `DesignProvider` for why it is safe: it never reaches `modelId`, `saveStatus` or `boardName`,
   * and it marks the board dirty so the change it just made gets autosaved like any other. */
  undoEdit: () => void;
  /** The mirror of `undoEdit`, for redo. */
  redoEdit: () => void;

  updateOutline: (patch: Partial<OutlineSpec>) => void;
  /** Sets one or more of the four hand-set rocker stations (D-14). Never touches the blank. */
  updateRocker: (patch: Partial<FiveStationRocker>) => void;
  updateFoil: (patch: Partial<FoilSpec>) => void;
  /** Puts the board in `record` at `placement` (D-01): the record is kept as the board's own copy.
   * Switching from one blank to another keeps the existing 12" fine-tunes (D-11) and the board's
   * own cut — its Deck Skin, Tip Style and fine-tune surface (Phase 12, D-01, D-04, D-13); a first
   * pick starts the fine-tunes at 0 and bakes in the live Deck Skin and Tip Style from Fit & Tip
   * Defaults (picking a blank counts as an edit, D-01), with fine-tunes on the Deck. A switch keeps
   * a Thinning Start set by hand; a first pick starts both tips on Automatic (Phase 14). One undo step. */
  pickBlank: (record: BlankRecord, placement: Mm) => void;
  /** Slides the board along its blank. Stored as given and clamped on read by the side profile,
   * never written back; a drag of the slider coalesces into one undo step like every slider. A no-op
   * with no blank picked. */
  setPlacement: (placement: Mm) => void;
  /** Sets how much foam comes off the blank's deck (Phase 12, D-01) — the board's own Deck Skin,
   * stored on its blank. The board's deck lowers or rises by the change at every station, the foam
   * off the bottom shrinks or grows by the same amount, and the list re-judges (the skin is part of
   * the centre floor, D-10); the pick is never cleared. A drag coalesces into one undo step like
   * every slider. A no-op with no blank picked. */
  setDeckSkin: (deckSkin: Mm) => void;
  /** Sets where the tips' extra comes off (Phase 12, D-04) — the board's own Tip Style, stored on
   * its blank: Pin deck takes it off the bottom (the tip rocker grows, or falls when a tip needs
   * more foam than the cut leaves, D-16), Bottom takes it off the deck. Each tip re-derives from its
   * tip to its Thinning Starts point (Phase 14, D-07); nothing inside that point moves. A discrete
   * choice: one undo step, re-checks the flag, never clears the pick. A no-op with no blank picked,
   * or when the board already has that style. */
  setTipStyle: (tipStyle: TipStyle) => void;
  /** Sets which surface a 12" fine-tune moves (Phase 12, D-13) — stored on the board's blank, Deck
   * for a new board. On the Deck a tweak adds or takes foam on the deck and the rocker stays the
   * blank's; on the Bottom it moves the bottom and the rocker re-levels on its own low point, so
   * its numbers can shift. The tweak amounts themselves never change. A discrete choice: one undo
   * step, re-checks the flag, never clears the pick. A no-op with no blank picked, or when the
   * board already uses that surface. */
  setFineTuneSurface: (surface: FineTuneSurface) => void;
  /** Sets one or both signed 12" fine-tunes (D-11), added to the thickness cut from the blank at
   * that station (the blank's thickness less the Deck Skin and the centre gap). Coalesces per field
   * like a slider. A no-op with no blank picked. */
  setFineTune: (patch: Partial<{ nose12Offset: Mm; tail12Offset: Mm }>) => void;
  /** Clears both 12" fine-tunes back to 0 (D-11). One undo step. A no-op with no blank picked.
   * Leaves both Thinning Starts alone (Phase 14, D-06). */
  resetFineTune: () => void;
  /** Sets where one tip's thinning starts, by hand, as a distance in from that tip (Phase 14, D-11) —
   * stored on the board's blank. A drag coalesces into one undo step per tip, so dragging the nose
   * then the tail is two steps. The side profile pulls a stored start inside its reach on read. A
   * no-op with no blank picked. */
  setThinningStart: (end: TipEnd, start: Mm) => void;
  /** Puts one tip back on Automatic (Phase 14, D-11, UI-SPEC §2): removes that tip's stored start,
   * so the board equals one that never had a start. One undo step per tap; a no-op with no blank
   * picked or when that tip is already on Automatic (no empty undo step). */
  setThinningStartAutomatic: (end: TipEnd) => void;
  /** "Remove This Blank" (D-02, UI-SPEC §7): goes back to the hand-set rocker, seeding its four
   * stations and the foil's two 12" thicknesses from the CURRENT side profile so the drawing does
   * not jump. One undo step brings the blank back. */
  removeBlank: () => void;
  /** Applies a board-type preset (components/setup/setup-screen.tsx) by replacing outline, foil,
   * rails, fins and the blank wholesale from `presetDesignFields` — a preset is a complete spec, not
   * a patch, and it opens sitting in its blank (D-03). Every other field (volume,
   * finsImportTemplate, boardName) resets to `DEFAULT_DESIGN_STATE`, so this always produces a
   * genuinely fresh board rather than carrying over the board the user just discarded. */
  applyPreset: (preset: BoardPreset) => void;
  /** Opens a saved board (D-06/D-07's rack card click). Mirrors `applyPreset`'s wholesale-replace
   * shape exactly: spreads `DEFAULT_DESIGN_STATE`, then sets every field the snapshot carries
   * plus `modelId` and `boardStarted: true`. Wholesale replace, never a patch merge — D-11 says
   * reopening restores the design exactly, and a merge would let the board being replaced leak
   * into the board being opened. */
  applyModel: (id: string, snapshot: DesignSnapshotFields, locked: boolean) => void;
  updateRailSection: (key: RailSectionKey, patch: Partial<RailSectionSpec>) => void;
  toggleTailHardEdge: () => void;
  updateFins: (patch: Partial<FinPlacementSpec>) => void;
  updateVolume: (patch: Partial<VolumeSpec>) => void;
  setFinsImportTemplate: (next: boolean) => void;
  /** Flips `railsImportFoilThickness` (D-09/D-10) — a plain flip, mirroring
   * `setFinsImportTemplate` exactly. Copies nothing: `rails.*.boardThickness` is written only by
   * the RAILS sliders themselves (`updateRailSection`), never by this toggle, so a shaper's
   * hand-typed thickness survives untouched across any number of link flips — switching the link
   * back on hands authority to the foil, switching it off again returns exactly the manual value
   * that was there before, never overwritten. This is the resolution CONTEXT.md's Destructive-
   * confirmation row left to discretion: no confirmation dialog needed because nothing is ever
   * discarded either way. */
  toggleRailsImportFoilThickness: () => void;
  setBoardName: (next: string) => void;
  setFinSystem: (next: FinSystem) => void;
  setModelId: (next: string | null) => void;
  /** Whether the open saved board is locked (quick 261008-lsy): while true the store refuses every
   * design change, nothing autosaves, and the top bar's Save is an Unlock button. */
  locked: boolean;
  /** Turns the open board's lock on or off in the store — bookkeeping only, after the server has
   * stored the new lock (the rack's lock row, the top bar's Unlock). Changes nothing in the design. */
  setOpenBoardLocked: (next: boolean) => void;
  /** The board open in the editor was renamed from the Board Rack: updates only the store's name
   * (no edit, no autosave, no undo step), so a locked board's name stays in step with the rack. */
  noteRenamed: (name: string) => void;
  /** Sends an edit still waiting for its autosave right now, if there is one — the rack calls it
   * just before locking the open board so the lock never strands the last edit. Signed out, or with
   * nothing waiting, it does nothing. */
  flushAutosave: () => void;
  /** Marks the store as freshly saved — called once, right after the shaper's own first manual
   * save succeeds (`save-button.tsx`'s name-prompt path, before `modelId` exists to autosave
   * against). Sets `modelId`, `boardName`, `dirty: false` and `saveStatus: "saved"` in one
   * update, so the nav shows "Saved" immediately rather than passing back through the plain
   * "Save" button or an untouched "idle" status. Every later save goes through `requestSave` or
   * the autosave effect instead, which manage `saveStatus` themselves. */
  markSaved: (id: string, name: string) => void;
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
  /** TEMPLATE's last-edit ghost (quick 260930-lia): the outline as it was one edit ago, by the O-1
   * rule in `lib/outline-ghost.ts` — walk this session's undo history from its most recent entry
   * for the first one whose outline actually differs from what is on screen. Session-only (the
   * undo history is never saved) and never `null` on a board that has at least one real outline
   * edit behind it; `null` on a board nobody has edited yet, or once Undo has walked all the way
   * back to the start. */
  outlineGhostGeometry: OutlineGeometry | null;
  /** The board's blank fitted once (`prepareBlank`) — every curve prepared a single time per blank
   * copy (R14), so sliding or fine-tuning never refits the catalogue's stations. Null with no blank. */
  preparedBlank: PreparedBlank | null;
  /** THE side profile (Pattern 5): the board's rocker, thickness and deck, its five station
   * numbers, and — with a blank — the blank's own silhouette, foam to come off and numbers under
   * each station. RAILS, VOLUME, the ROCKER drawing, the DATASHEET and the Summary all read this
   * one object; never re-spline its five stations for drawing or integration. */
  sideProfile: BoardSideProfile;
  /** `rails` with the three thickness stations replaced by the foil's matching stations when
   * `railsImportFoilThickness` is on (D-09) — see `deriveEffectiveRails`'s doc comment in
   * `lib/geometry/design.ts`. `railBands` below is computed from this, never from raw `rails`
   * directly, so the RAILS screen's numbers and its own thickness sliders always agree. */
  effectiveRails: RailBandSpec;
  railBands: RailBandsOutput;
  templateValues: VolumeTemplateValues;
  railValues: VolumeRailValues;
  /** `fins` unless `finsImportTemplate`, in which case boardLength/tailWidth12/tailShape come
   * from the outline. */
  effectiveFins: FinPlacementSpec;
  /** The designed outline's tail as the fin maths read it (quick 260928-p45) — the real rail FINS
   * measures each rail-referenced fin in from. `null` when `finsImportTemplate` is unticked, which
   * keeps the standalone calculator on the generic tail curve. */
  finImportedTail: ImportedFinTail | null;
  finPlacement: FinPlacementResult;
  /** The designed outline's tail, in `tailOutlineHalfPoints`' own shape, for the fin viewer to
   * draw behind the fin marks — built from `finImportedTail`'s own points, so the drawing and the
   * maths can never disagree. `null` when not importing. */
  finTailOutline: FinTailOutline | null;
  /** `volume` with length/width/centerThickness overridden per the import toggles — the derived-
   * value equivalent of the prototype's `syncFromTemplate`. */
  effectiveVolume: VolumeSpec;
  volumeResult: VolumeResult;
  /** The accurate cross-section litres figure (CONTEXT.md D-13) — real cross-sections taken along
   * the designed board's own length using `sideProfile`'s thickness and `effectiveRails`, integrated with
   * Simpson's rule. Computed unconditionally (not just when importing), so `quotedVolumeLitres`
   * can switch to it instantly the moment the import toggles come back on. */
  crossSectionVolume: CrossSectionVolumeResult;
  /** The one litres figure every screen quotes (D-13/`deriveQuotedVolumeLitres` in
   * `lib/geometry/design.ts`): `crossSectionVolume`'s figure while importing the drawn template,
   * `volumeResult`'s estimator figure while the Volume screen is a standalone quick estimator. */
  quotedVolumeLitres: Litres;
}

const DesignContext = createContext<DesignContextValue | null>(null);

/** How long the autosave effect waits before its next attempt is scheduled, given how many times
 * in a row the save just before it failed. Zero failures is exactly `AUTOSAVE_DEBOUNCE_MS`
 * (D-08's normal debounce, unchanged); each further consecutive failure doubles the wait, capped
 * at `AUTOSAVE_MAX_RETRY_DELAY_MS` — a persistently failing save (backend outage, an
 * expired/invalid session) settles into a slow, bounded background retry instead of hammering the
 * server every debounce tick forever. A local helper rather than an addition to
 * `lib/models/autosave.ts`: it only changes the timer's delay, not `decideAutosave`'s save/wait/
 * idle decision, so the pure module and its tests are untouched by this. */
const AUTOSAVE_MAX_RETRY_DELAY_MS = 30_000;
function autosaveDelayFor(consecutiveFailures: number): number {
  if (consecutiveFailures <= 0) return AUTOSAVE_DEBOUNCE_MS;
  return Math.min(AUTOSAVE_DEBOUNCE_MS * 2 ** consecutiveFailures, AUTOSAVE_MAX_RETRY_DELAY_MS);
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DesignState>(DEFAULT_DESIGN_STATE);
  // Clerk's own loading state reads as `isSignedIn === undefined`; treated as "not signed in"
  // here, same as `decideAutosave` treats any non-true value — there is nothing to autosave to
  // until Clerk has actually confirmed a session.
  const { isSignedIn } = useAuth();
  // Whether a saveModel call for this board is currently in flight — local to the provider
  // rather than a DesignState field, because no screen ever reads it directly; only the autosave
  // effect and performSave below need it, to satisfy decideAutosave's "never two concurrent
  // writes to one row" rule (D-08) and to re-check after a save settles whether another edit
  // arrived while it was in flight.
  const [saveInFlight, setSaveInFlight] = useState(false);
  const [, startSaveTransition] = useTransition();
  // Consecutive save failures for the board currently open — reset the moment a save actually
  // lands, and fed into the autosave timer's delay (see autosaveDelayFor below) so a persistent
  // failure (a backend outage, an expired session that keeps rejecting) backs off instead of
  // retrying every AUTOSAVE_DEBOUNCE_MS forever. The nav's "Not saved" state is still a one-click
  // instant retry (`requestSave`, which never goes through this timer) the whole time.
  const consecutiveFailuresRef = useRef(0);

  // This session's undo/redo stacks (see lib/design-history.ts's own doc comment for the rules
  // themselves — this provider only supplies the WHEN). Session-only and per-board: never written
  // to Postgres, and cleared by applyPreset/applyModel below whenever the board itself changes.
  const [history, setHistory] = useState<DesignHistory<DesignHistorySnapshot>>(emptyHistory);

  // D-19: the gear menu's tip defaults, live. While the board is unstarted its foil's two tips ARE
  // these (the derived `foil` below); the first edit bakes them in through `startedFrom`. The ref
  // is what every mutator's updater reads, kept current after each commit so a handler always bakes
  // the tips the screen is showing.
  const { defaults: fitDefaults } = useFitDefaults();
  const liveNoseTip = fitDefaults.noseTipThickness;
  const liveTailTip = fitDefaults.tailTipThickness;
  const liveTipsRef = useRef<LiveTips>({ noseTip: liveNoseTip, tailTip: liveTailTip });
  useEffect(() => {
    liveTipsRef.current = { noseTip: liveNoseTip, tailTip: liveTailTip };
  }, [liveNoseTip, liveTailTip]);

  // The open board's lock, read through a ref because the keyboard listener and a drag's pointer
  // handlers can run a closure bound before the lock changed. It is set synchronously wherever the
  // lock changes and backed by an effect that copies state.locked into it after each commit.
  const lockedRef = useRef(false);
  useEffect(() => {
    lockedRef.current = state.locked;
  }, [state.locked]);

  // Phase 12 (D-01, D-04): the gear menu's Deck Skin and Tip Style, live, kept current the same
  // way. A board's FIRST pick bakes these into its blank; from then on the board keeps its own cut.
  const liveDeckSkin = fitDefaults.deckSkin;
  const liveTipStyle = fitDefaults.tipStyle;
  const liveCutRef = useRef<LiveCut>({ deckSkin: liveDeckSkin, tipStyle: liveTipStyle });
  useEffect(() => {
    liveCutRef.current = { deckSkin: liveDeckSkin, tipStyle: liveTipStyle };
  }, [liveDeckSkin, liveTipStyle]);

  // The board's foil as every consumer sees it: the stored foil once the board is started, and —
  // for a new board nobody has touched — the stored foil with the live tip defaults (D-19). Read
  // this, never `state.foil`, anywhere a foil leaves the store (context value, side profile, undo
  // snapshot, save snapshot).
  const foil: FoilSpec = useMemo(
    () => (state.boardStarted ? state.foil : { ...state.foil, noseTip: liveNoseTip, tailTip: liveTailTip }),
    [state.boardStarted, state.foil, liveNoseTip, liveTailTip],
  );

  // Deliberately NOT listing state.boardName — see DesignHistorySnapshot's own doc comment above
  // for why that omission is structural rather than a special case.
  const historySnapshot: DesignHistorySnapshot = useMemo(
    () => ({
      outline: state.outline,
      rocker: state.rocker,
      foil,
      rails: state.rails,
      fins: state.fins,
      volume: state.volume,
      finsImportTemplate: state.finsImportTemplate,
      railsImportFoilThickness: state.railsImportFoilThickness,
      finSystem: state.finSystem,
      blank: state.blank,
    }),
    [
      state.outline,
      state.rocker,
      foil,
      state.rails,
      state.fins,
      state.volume,
      state.finsImportTemplate,
      state.railsImportFoilThickness,
      state.finSystem,
      state.blank,
    ],
  );

  // undefined: no edit is currently pending. null: a pending edit that must never fold with the
  // next one (a discrete toggle flip). A string: the coalescing key a real mutator just noted.
  // Set by each mutator's noteEdit call below, read and cleared by the recording effect that
  // follows historySnapshot's own identity.
  const pendingEditKeyRef = useRef<string | null | undefined>(undefined);

  // This effect's OWN copy of "what the snapshot looked like last time", independent of
  // designSnapshotFieldsRef above (which exists for an unrelated reason — the save path) — so
  // this effect never depends on where that other one happens to sit in the file.
  const historyPrevSnapshotRef = useRef(historySnapshot);

  // THE WHOLE SAFETY ARGUMENT FOR WHERE A HISTORY PUSH HAPPENS. A push cannot live inside a
  // setState updater: updaters must stay pure, and React's StrictMode deliberately runs them
  // TWICE (this repo's own npm run test:e2e:prod exists to catch exactly what StrictMode would
  // otherwise hide). So instead: each mutator below sets a plain ref in its own event handler —
  // outside any updater — naming what it touched, and this one effect, which reruns only when
  // historySnapshot's own identity changes, is the sole place that actually calls setHistory.
  //
  // On mount the two refs are identical (both start as the same historySnapshot), so StrictMode's
  // double invocation of this effect records nothing on either pass — there is no "before" that
  // differs from "after" yet. And applying an undo/redo sets no pending key (see undoEdit/redoEdit
  // below), which is exactly why undoing a step never records itself as a new one: this effect
  // sees a changed snapshot with nothing pending, and skips.
  //
  // The reference check (`before === historySnapshot`) alone is not enough: `historySnapshot`
  // recomputes to a NEW object whenever its own dependencies (state.outline, state.rails, ...)
  // change reference — which every mutator's `{ ...prev.X, ...patch }` spread does unconditionally,
  // even when `patch` carries the exact values already there. A typed measurement field commits on
  // every blur regardless of whether its text actually changed (`MeasureField`'s own `commit` calls
  // `onCommit` whenever the parse succeeds, not only when the parsed value differs) — so a shaper
  // who taps into a box and taps back out without changing a digit would otherwise spend a real
  // undo step reverting NOTHING VISIBLE, silently pushing the edit they actually care about one
  // press further away. The JSON comparison below is the deliberately blunt fix: cheap at this
  // scale (a handful of small objects, computed once per committed edit, never per keystroke), and
  // it is what "ONE accidental movement is ONE step back" actually requires at its zero-movement
  // edge — no visible change, no step, full stop.
  useEffect(() => {
    const before = historyPrevSnapshotRef.current;
    historyPrevSnapshotRef.current = historySnapshot;
    const pendingKey = pendingEditKeyRef.current;
    pendingEditKeyRef.current = undefined;
    if (pendingKey === undefined || before === historySnapshot) return;
    if (JSON.stringify(before) === JSON.stringify(historySnapshot)) return;
    setHistory((prev) => recordEdit(prev, before, pendingKey, Date.now()));
  }, [historySnapshot]);

  /** Called as the FIRST statement of every design mutator, before its own setState — records
   * what this edit should be filed under (or null for a discrete flip that must never coalesce
   * with anything, including another flip of the same toggle). The effect above reads and clears
   * this once the resulting state change actually commits. */
  function noteEdit(key: string | null) {
    pendingEditKeyRef.current = key;
  }

  /** The coalescing key suffix for a patch-shaped mutator: which fields it touched, not what they
   * changed to — so a wide-page drag on the same field keeps its own key stable no matter the
   * intermediate values, and two different fields never share one by accident. */
  function patchKey(patch: object): string {
    return Object.keys(patch).sort().join(",");
  }

  // The lock is the store's own guard (quick 261008-lsy): every edit below starts with
  // `if (lockedRef.current) return;`, before it records an undo step or touches state. The greyed
  // controls are what a shaper sees; this is what makes the lock true — a drag, a keyboard shortcut or
  // a stale closure that slips past a disabled control still cannot change a locked board. The one
  // exception is applyPreset, which starts a NEW board and leaves the locked one untouched in the rack.
  const updateOutline = (patch: Partial<OutlineSpec>) => {
    if (lockedRef.current) return;
    noteEdit(`outline:${patchKey(patch)}`);
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), outline: { ...prev.outline, ...patch }, boardStarted: true, dirty: true }));
  };

  const updateRocker = (patch: Partial<FiveStationRocker>) => {
    if (lockedRef.current) return;
    noteEdit(`rocker:${patchKey(patch)}`);
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), rocker: { ...prev.rocker, ...patch }, boardStarted: true, dirty: true }));
  };

  const updateFoil = (patch: Partial<FoilSpec>) => {
    if (lockedRef.current) return;
    noteEdit(`foil:${patchKey(patch)}`);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return { ...prev, foil: { ...prev.foil, ...patch }, boardStarted: true, dirty: true };
    });
  };

  // A preset is a complete spec, not a patch (see BoardPreset's own doc comment) — every field
  // not supplied by the preset resets to DEFAULT_DESIGN_STATE's value rather than carrying over
  // from whatever board was there before, so "Discard & Start New" produces a genuinely fresh
  // board (WR-01). Since Phase 11 (D-03) a preset opens sitting in its blank: the fields come from
  // ONE pure mapping, `presetDesignFields` (lib/blanks/preset-blanks.ts) — the blank's own copy of
  // its catalogue rows at the preset's placement with zero fine-tunes, the preset's centre and tips,
  // and the default hand-set rocker (unread while the blank is picked). The preset card's numbers
  // (`presetSummary`) read the same mapping, so the card and the board it opens always agree. The
  // preset's own tips are set here, so a preset board never follows the live tip defaults (D-19).
  const applyPreset = (preset: BoardPreset) => {
    // The history belongs to the board that is open, not to the session. Carrying it across a
    // board swap would let Cmd+Z drag a piece of the board just closed into the board just
    // opened — so both the pending-edit ref and the stacks themselves reset here, right beside
    // the state replacement they belong with.
    pendingEditKeyRef.current = undefined;
    setHistory(emptyHistory());
    // A new board is never locked (and its state comes from DEFAULT_DESIGN_STATE, locked: false).
    lockedRef.current = false;
    setState(() => ({ ...DEFAULT_DESIGN_STATE, ...presetDesignFields(preset), boardStarted: true, dirty: true }));
  };

  // The one place `dirty` deliberately does NOT follow `boardStarted`: opening a saved board
  // sets boardStarted true (a board is in progress) but leaves dirty at DEFAULT_DESIGN_STATE's
  // false, because the store now matches the row exactly (D-09) — there is nothing to autosave
  // until the shaper changes something.
  const applyModel = (id: string, snapshot: DesignSnapshotFields, locked: boolean) => {
    // A fresh row has no save-failure history of its own — carrying over a backoff earned by
    // whatever board was open before would slow its first autosave for no reason.
    consecutiveFailuresRef.current = 0;
    // Same reasoning as applyPreset above: the undo history belongs to the board on screen, and
    // opening a different saved board is exactly the moment it must not survive.
    pendingEditKeyRef.current = undefined;
    setHistory(emptyHistory());
    lockedRef.current = locked;
    setState(() => ({
      ...DEFAULT_DESIGN_STATE,
      outline: snapshot.outline,
      rocker: snapshot.rocker,
      foil: snapshot.foil,
      rails: snapshot.rails,
      fins: snapshot.fins,
      volume: snapshot.volume,
      finsImportTemplate: snapshot.finsImportTemplate,
      railsImportFoilThickness: snapshot.railsImportFoilThickness,
      boardName: snapshot.boardName,
      finSystem: snapshot.finSystem,
      blank: snapshot.blank,
      modelId: id,
      boardStarted: true,
      locked,
    }));
  };

  const updateRailSection = (key: RailSectionKey, patch: Partial<RailSectionSpec>) => {
    if (lockedRef.current) return;
    noteEdit(`rails:${key}:${patchKey(patch)}`);
    setState((prev) => ({
      ...startedFrom(prev, liveTipsRef.current),
      rails: { ...prev.rails, [key]: { ...prev.rails[key], ...patch } },
      boardStarted: true,
      dirty: true,
    }));
  };

  // A discrete switch, not a slider — noteEdit(null) so flipping it twice is always two steps,
  // never folded into one the way a drag would be.
  const toggleTailHardEdge = () => {
    if (lockedRef.current) return;
    noteEdit(null);
    setState((prev) => ({
      ...startedFrom(prev, liveTipsRef.current),
      rails: { ...prev.rails, tailHardEdge: !prev.rails.tailHardEdge },
      boardStarted: true,
      dirty: true,
    }));
  };

  const updateFins = (patch: Partial<FinPlacementSpec>) => {
    if (lockedRef.current) return;
    noteEdit(`fins:${patchKey(patch)}`);
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), fins: { ...prev.fins, ...patch }, boardStarted: true, dirty: true }));
  };

  const updateVolume = (patch: Partial<VolumeSpec>) => {
    if (lockedRef.current) return;
    noteEdit(`volume:${patchKey(patch)}`);
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), volume: { ...prev.volume, ...patch }, boardStarted: true, dirty: true }));
  };

  // A discrete switch — see toggleTailHardEdge's comment above for why noteEdit(null).
  const setFinsImportTemplate = (next: boolean) => {
    if (lockedRef.current) return;
    noteEdit(null);
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), finsImportTemplate: next, boardStarted: true, dirty: true }));
  };

  // A plain flip, mirroring setFinsImportTemplate exactly. Copies nothing into or out of
  // `rails.*.boardThickness` — those three values are written only by updateRailSection (the
  // RAILS sliders), so a shaper's hand-typed thickness survives untouched across any number of
  // link flips (D-09/D-10). See DesignContextValue.toggleRailsImportFoilThickness's doc comment.
  // A discrete switch — see toggleTailHardEdge's comment above for why noteEdit(null).
  const toggleRailsImportFoilThickness = () => {
    if (lockedRef.current) return;
    noteEdit(null);
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), railsImportFoilThickness: !prev.railsImportFoilThickness, boardStarted: true, dirty: true }));
  };

  // No noteEdit call: boardName is deliberately absent from historySnapshot (see
  // DesignHistorySnapshot's doc comment), so recording a pending key here would do nothing but
  // confuse the next real edit's coalescing — do not "fix" this by adding one.
  const setBoardName = (next: string) => {
    if (lockedRef.current) return;
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), boardName: next, boardStarted: true, dirty: true }));
  };

  // A discrete switch — see toggleTailHardEdge's comment above for why noteEdit(null).
  const setFinSystem = (next: FinSystem) => {
    if (lockedRef.current) return;
    noteEdit(null);
    setState((prev) => ({ ...startedFrom(prev, liveTipsRef.current), finSystem: next, boardStarted: true, dirty: true }));
  };

  // Not a design-mutating action — pointing the store at a different (or no) saved row doesn't
  // change the board itself, so this deliberately does NOT set boardStarted, and does NOT
  // noteEdit: it never changes historySnapshot's fields either.
  const setModelId = (next: string | null) => setState((prev) => ({ ...prev, modelId: next }));

  // The open board's lock turned on or off (quick 261008-lsy). Bookkeeping like setModelId: no
  // noteEdit, no startedFrom, no dirty — locking a board is not a design change. The ref is set
  // first so a keyboard shortcut or a drag handler bound a moment ago already sees the new lock.
  const setOpenBoardLocked = (next: boolean) => {
    lockedRef.current = next;
    setState((prev) => ({ ...prev, locked: next }));
  };

  // The board open in the editor was renamed from the Board Rack while it is locked (quick
  // 261008-lsy). Bookkeeping only — no dirty, no undo step — so the store never holds a stale name
  // that the first save after Unlock would write back over the rename.
  const noteRenamed = (name: string) => setState((prev) => ({ ...prev, boardName: name }));

  // The shaper's own first, deliberate save (D-08's "only does real work the first time") —
  // there was no modelId for the autosave effect to target until this moment, so it cannot have
  // run performSave/requestSave itself. Setting saveStatus "saved" here, not just modelId, is
  // what lets the nav show "Saved" on the very next render instead of falling back through the
  // plain "Save" button (modelId was null) or an unset "idle" status. No noteEdit call: bookkeeping
  // (modelId, boardName, saveStatus), not a design change. A save does start the board, though
  // (D-19): an untouched board saved with the live tip defaults keeps those tips from here on —
  // `startedFrom` bakes exactly the tips the saved snapshot carried, so the undo snapshot's values
  // do not change and no step is recorded.
  const markSaved = (id: string, name: string) =>
    setState((prev) => ({
      ...startedFrom(prev, liveTipsRef.current),
      modelId: id,
      boardName: name,
      boardStarted: true,
      dirty: false,
      saveStatus: "saved",
    }));

  const outlineGeometry = useMemo(() => buildOutline(state.outline), [state.outline]);

  // TEMPLATE's last-edit ghost (quick 260930-lia): the outline as it was one edit ago, picked
  // from this session's own undo history by the O-1 rule in lib/outline-ghost.ts. Read-only over
  // `history` — nothing here ever writes to it, so the ghost can never itself become an undo step
  // or leak into a save. `outlineGhost` depends on `[history.past, state.outline]` rather than the
  // whole `history` object so a redo (which only ever touches `future`) never recomputes it.
  const outlineGhost = useMemo(
    () => pickOutlineGhost(history.past, state.outline),
    [history.past, state.outline],
  );
  const outlineGhostGeometry = useMemo(
    () => (outlineGhost ? buildOutline(outlineGhost) : null),
    [outlineGhost],
  );

  // The blank is fitted ONCE per blank copy (R14): keyed on the copy's own identity, which only
  // changes when a different blank is picked (or a board is opened) — sliding the placement or
  // fine-tuning a 12" station reuses the same prepared curves.
  const blankCopy = state.blank?.copy ?? null;
  const preparedBlank = useMemo(() => (blankCopy ? prepareBlank(blankCopy) : null), [blankCopy]);

  // THE side profile (Pattern 5) — see the file header. Placement is clamped on read inside the
  // profile, never written back into state.
  const sideProfile = useMemo(
    () =>
      buildBoardProfile({
        length: state.outline.length,
        rocker: state.rocker,
        foil,
        blank:
          preparedBlank && state.blank
            ? {
                prepared: preparedBlank,
                placement: state.blank.placement,
                nose12Offset: state.blank.nose12Offset,
                tail12Offset: state.blank.tail12Offset,
                // The board's own cut (Phase 12), carried on its blank.
                deckSkin: state.blank.deckSkin,
                tipStyle: state.blank.tipStyle,
                fineTuneSurface: state.blank.fineTuneSurface,
                // Where each tip's thinning starts (Phase 14, Pitfall 5) — absent on Automatic.
                ...thinningStartsOf(state.blank),
              }
            : null,
      }),
    [state.outline.length, state.rocker, foil, preparedBlank, state.blank],
  );

  // Derived-value equivalent of D-09's link: never an effect that mirrors the foil into
  // state.rails (that would let the two thicknesses drift apart), just a memo the RAILS screen's
  // own render reads. See deriveEffectiveRails's doc comment in lib/geometry/design.ts. Reads the
  // side profile's foil: for a hand-set board that is the stored foil exactly (so RAILS never
  // moves for one), for a board in a blank it is the blank-derived thickness at the three stations.
  const effectiveRails = useMemo(
    () => deriveEffectiveRails(state.rails, sideProfile.effectiveFoil, state.railsImportFoilThickness),
    [state.rails, sideProfile.effectiveFoil, state.railsImportFoilThickness],
  );
  const railBands = useMemo(() => computeRailBands(effectiveRails), [effectiveRails]);

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

  // The real drawn tail the fin maths read (quick 260928-p45) — built only while Import Template
  // is ticked, exactly the same condition `effectiveFins` above already follows.
  const finImportedTail: ImportedFinTail | null = useMemo(
    () => (state.finsImportTemplate ? importedFinTailFromOutline(outlineGeometry) : null),
    [state.finsImportTemplate, outlineGeometry],
  );

  const finPlacement = useMemo(
    () => computeFinPlacement(effectiveFins, finImportedTail),
    [effectiveFins, finImportedTail],
  );

  // Built from `finImportedTail`'s own points, so the drawing and the maths can never disagree —
  // the adapter's own 24in cut (`importedFinTailFromOutline`) is the same one this used to apply
  // here directly.
  const finTailOutline: FinTailOutline | null = useMemo(() => {
    if (finImportedTail === null) return null;
    const tailKind = state.outline.tail.kind;
    // The prototype's own connector rule (Template.dc.html line 276): diamond closes at the
    // origin, swallow closes at the crotch depth, everything else has no connector.
    const connector: Point2D | null =
      tailKind === "diamond"
        ? { x: mm(0), y: mm(0) }
        : tailKind === "swallow"
          ? { x: mm(0), y: outlineGeometry.centreCloseStation }
          : null;
    return { points: finImportedTail.points, connector };
  }, [finImportedTail, outlineGeometry, state.outline.tail.kind]);

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

  // The accurate path (D-13): real cross-sections along the board's own length, using the same
  // half-width sampler pattern `lib/geometry/design.ts`'s `summarizeDesign` builds, so a rack
  // card's number and this screen's number can never drift apart. The thickness is the side
  // profile's own dense curve (Pattern 5) — with a blank, the foil cut from the blank (its thickness
  // less the Deck Skin and the centre gap) exactly as drawn, never re-splined through five stations.
  const crossSectionVolume = useMemo(
    () =>
      computeCrossSectionVolume({
        halfWidthAt: (station) => sampleOutline(outlineGeometry, station),
        foil: sideProfile.effectiveFoil,
        thicknessAt: sideProfile.thicknessAt,
        rails: effectiveRails,
        length: state.outline.length,
      }),
    [outlineGeometry, sideProfile, effectiveRails, state.outline.length],
  );

  // The blank moves (D-01, D-02, D-11). Each notes its edit first and marks the board started and
  // dirty, like every mutator above, so undo, autosave and the replace-board prompt all see them.

  // A discrete choice, not a slider — noteEdit(null), so each pick is its own undo step.
  const pickBlank = (record: BlankRecord, placement: Mm) => {
    if (lockedRef.current) return;
    noteEdit(null);
    setState((prev) => ({
      ...startedFrom(prev, liveTipsRef.current),
      blank: {
        copy: record,
        placement,
        // Switching blanks keeps the shaper's fine-tunes (D-11); a first pick starts at 0.
        nose12Offset: prev.blank?.nose12Offset ?? mm(0),
        tail12Offset: prev.blank?.tail12Offset ?? mm(0),
        // Switching blanks keeps the board's own cut; a first pick bakes in the live Deck Skin and
        // Tip Style (D-01, D-04 — picking counts as an edit), fine-tunes on the Deck (D-13).
        deckSkin: prev.blank?.deckSkin ?? liveCutRef.current.deckSkin,
        tipStyle: prev.blank?.tipStyle ?? liveCutRef.current.tipStyle,
        fineTuneSurface: prev.blank?.fineTuneSurface ?? DEFAULT_BLANK_CUT.fineTuneSurface,
        // Switching blanks keeps a Thinning Start set by hand; a first pick has none, so both tips
        // start on Automatic (Phase 14, UI-SPEC §11).
        ...thinningStartsOf(prev.blank),
      },
      boardStarted: true,
      dirty: true,
    }));
  };

  // A slider — one coalescing key, so a whole drag is one undo step.
  const setPlacement = (placement: Mm) => {
    if (lockedRef.current) return;
    if (!state.blank) return;
    noteEdit("blank:placement");
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return prev.blank ? { ...prev, blank: { ...prev.blank, placement }, boardStarted: true, dirty: true } : current;
    });
  };

  // A slider — one coalescing key, so a whole Deck Skin drag is one undo step (Phase 12, D-01).
  const setDeckSkin = (deckSkin: Mm) => {
    if (lockedRef.current) return;
    if (!state.blank) return;
    noteEdit("blank:deckSkin");
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return prev.blank ? { ...prev, blank: { ...prev.blank, deckSkin }, boardStarted: true, dirty: true } : current;
    });
  };

  // A discrete choice (Phase 12, D-04) — noteEdit(null), so each tap is its own undo step. Compared
  // against the board's resolved cut (the side profile's, always complete), so tapping the pill
  // that is already on writes nothing and leaves no empty undo step.
  const setTipStyle = (tipStyle: TipStyle) => {
    if (lockedRef.current) return;
    if (!state.blank || sideProfile.blank?.cut.tipStyle === tipStyle) return;
    noteEdit(null);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return prev.blank ? { ...prev, blank: { ...prev.blank, tipStyle }, boardStarted: true, dirty: true } : current;
    });
  };

  // A discrete choice (Phase 12, D-13) — the same shape as setTipStyle. It only ever writes the
  // surface; the geometry moves the chosen surface and nothing else.
  const setFineTuneSurface = (surface: FineTuneSurface) => {
    if (lockedRef.current) return;
    if (!state.blank || sideProfile.blank?.cut.fineTuneSurface === surface) return;
    noteEdit(null);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return prev.blank
        ? { ...prev, blank: { ...prev.blank, fineTuneSurface: surface }, boardStarted: true, dirty: true }
        : current;
    });
  };

  // Sliders — keyed per field, like every patch-shaped mutator.
  const setFineTune = (patch: Partial<{ nose12Offset: Mm; tail12Offset: Mm }>) => {
    if (lockedRef.current) return;
    if (!state.blank) return;
    noteEdit(`blank:offset:${patchKey(patch)}`);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return prev.blank ? { ...prev, blank: { ...prev.blank, ...patch }, boardStarted: true, dirty: true } : current;
    });
  };

  // A discrete button — noteEdit(null).
  const resetFineTune = () => {
    if (lockedRef.current) return;
    if (!state.blank) return;
    noteEdit(null);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return prev.blank
        ? { ...prev, blank: { ...prev.blank, nose12Offset: mm(0), tail12Offset: mm(0) }, boardStarted: true, dirty: true }
        : current;
    });
  };

  // A slider (Phase 14, D-11) — one coalescing key PER TIP, so a whole drag of one tip's start is
  // one undo step and dragging the nose then the tail is two.
  const setThinningStart = (end: TipEnd, start: Mm) => {
    if (lockedRef.current) return;
    if (!state.blank) return;
    noteEdit(`blank:thinningStart:${end}`);
    const key = end === "nose" ? "noseThinningStart" : "tailThinningStart";
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      return prev.blank ? { ...prev, blank: { ...prev.blank, [key]: start }, boardStarted: true, dirty: true } : current;
    });
  };

  // A discrete button (Phase 14, D-11, UI-SPEC §2) — noteEdit(null), so each tap is its own undo
  // step. The stored key is absent exactly when a tip is on Automatic (the parser drops a stored
  // start that is not a number, 14-09), which is the side profile's own `automatic` flag — so a tap
  // on a tip already on Automatic writes nothing and leaves no empty undo step. Going back REMOVES
  // the key from a fresh copy of the blank rather than storing an empty value, so the board equals
  // one that never had a start.
  const setThinningStartAutomatic = (end: TipEnd) => {
    if (lockedRef.current) return;
    const key = end === "nose" ? "noseThinningStart" : "tailThinningStart";
    if (!state.blank || state.blank[key] === undefined) return;
    noteEdit(null);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      if (!prev.blank) return current;
      const blank: BoardBlank = { ...prev.blank };
      delete blank[key];
      return { ...prev, blank, boardStarted: true, dirty: true };
    });
  };

  // "Remove This Blank" (UI-SPEC §7). Reads the side profile as it is on screen RIGHT NOW (this
  // render's `sideProfile`) and seeds the hand-set rocker's four stations (rebased on the centre
  // rocker, whose hand-set value is 0 by definition) and the foil's two final 12" thicknesses from
  // it through `handSetFromProfile`, so the five station numbers do not move when the blank goes
  // (except a tip that sat below the centre, which a hand-set board cannot hold: it lands on 0);
  // the curve between them is redrawn through them. The centre thickness and tips are already the
  // board's own stored values. All three fields change in one setState, so a single undo brings
  // the blank — and the old hand-set values — back together.
  const removeBlank = () => {
    if (lockedRef.current) return;
    if (!state.blank) return;
    noteEdit(null);
    const profileNow = sideProfile;
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      const handSet = handSetFromProfile(profileNow, prev.foil);
      return {
        ...prev,
        rocker: handSet.rocker,
        foil: handSet.foil,
        blank: null,
        boardStarted: true,
        dirty: true,
      };
    });
  };

  const quotedVolumeLitres = useMemo(
    () => deriveQuotedVolumeLitres(volumeResult, crossSectionVolume, volumeResult.importingTemplate),
    [volumeResult, crossSectionVolume],
  );

  // The prototype's own handoff semantics (Volume.dc.html lines 412-437) — the one place derived
  // values must be written back into stored state.
  // A discrete switch — see toggleTailHardEdge's comment (above, near the other RAILS/FINS
  // toggles) for why noteEdit(null).
  const toggleImportTemplateDimensions = () => {
    if (lockedRef.current) return;
    noteEdit(null);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      const next = !prev.volume.importTemplateDimensions;
      if (next) {
        return {
          ...prev,
          volume: { ...prev.volume, importTemplateDimensions: true },
          boardStarted: true,
          dirty: true,
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
        dirty: true,
      };
    });
  };

  // A discrete switch — see toggleTailHardEdge's comment above for why noteEdit(null). Called
  // AFTER the early-return guard below, so a no-op call (template import already off) records
  // nothing.
  const toggleImportRailThickness = () => {
    if (lockedRef.current) return;
    if (!state.volume.importTemplateDimensions) return;
    noteEdit(null);
    setState((current) => {
      const prev = startedFrom(current, liveTipsRef.current);
      const next = !prev.volume.importRailThickness;
      if (next) {
        return {
          ...prev,
          volume: { ...prev.volume, importRailThickness: true },
          boardStarted: true,
          dirty: true,
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
        dirty: true,
      };
    });
  };

  const designSnapshotFields: DesignSnapshotFields = useMemo(
    () => ({
      outline: state.outline,
      rocker: state.rocker,
      foil,
      rails: state.rails,
      fins: state.fins,
      volume: state.volume,
      finsImportTemplate: state.finsImportTemplate,
      railsImportFoilThickness: state.railsImportFoilThickness,
      boardName: state.boardName,
      finSystem: state.finSystem,
      blank: state.blank,
    }),
    [
      state.outline,
      state.rocker,
      foil,
      state.rails,
      state.fins,
      state.volume,
      state.finsImportTemplate,
      state.railsImportFoilThickness,
      state.boardName,
      state.finSystem,
      state.blank,
    ],
  );

  // Always holds the latest designSnapshotFields, kept current after every commit (a ref written
  // from an effect, never during render itself — React's rules of hooks forbid mutating a ref
  // while rendering). performSave's `.then` handler needs to compare "what did we actually send"
  // against "what does the board look like right now", and a value captured in a closure at the
  // moment the save started can't answer that; only a ref that keeps updating while the request
  // is in flight can. No deps array: this must re-sync after every render, and the ref write
  // itself never triggers one, so there is no re-render loop to worry about.
  const designSnapshotFieldsRef = useRef(designSnapshotFields);
  useEffect(() => {
    designSnapshotFieldsRef.current = designSnapshotFields;
  });

  // The one path that actually calls `saveModel` for a board that already has a home — shared by
  // the autosave timer below and by `requestSave` (the nav's manual Save and its failure retry),
  // so the two paths can never drift into reporting status differently. A no-op while there is
  // no row to write to or a write is already in flight, mirroring `decideAutosave`'s own gates.
  const performSave = () => {
    if (lockedRef.current) return;
    if (state.modelId === null || saveInFlight) return;
    const modelIdAtSaveTime = state.modelId;
    const nameAtSaveTime = state.boardName;
    const snapshotAtSaveTime = designSnapshotFields;
    setSaveInFlight(true);
    setState((prev) => ({ ...prev, saveStatus: "saving" }));
    startSaveTransition(() => {
      saveModel(modelIdAtSaveTime, nameAtSaveTime, snapshotAtSaveTime)
        .then((result) => {
          const settled: PromiseSettledResult<Awaited<ReturnType<typeof saveModel>>> = {
            status: "fulfilled",
            value: result,
          };
          // Cleared only if nothing has changed since the snapshot that was actually sent — if
          // an edit landed while this request was in flight, designSnapshotFieldsRef.current has
          // moved on and no longer matches snapshotAtSaveTime, so dirty stays true and the
          // autosave effect (re-evaluated below when saveInFlight flips back to false) schedules
          // a follow-up save for the edit that would otherwise have been silently dropped.
          consecutiveFailuresRef.current = 0;
          // The server refused because the board was locked from another device (quick 261008-lsy):
          // nothing was written. This editor locks too, and the unsaved edit stays on screen — it is
          // saved only if the shaper presses Unlock.
          if (result.locked) {
            lockedRef.current = true;
            setState((prev) => ({ ...prev, locked: true, saveStatus: "idle" }));
            return;
          }
          setState((prev) => ({
            ...prev,
            dirty: designSnapshotFieldsRef.current !== snapshotAtSaveTime,
            saveStatus: nextStatusAfter(settled),
          }));
        })
        .catch((error: unknown) => {
          // Includes the "failed to find Server Action" case a redeployment can cause on a page
          // loaded before it: treated like any other failure, never swallowed to a silent no-op.
          console.error("Shaper: save failed", error);
          consecutiveFailuresRef.current += 1;
          const settled: PromiseSettledResult<never> = { status: "rejected", reason: error };
          setState((prev) => ({ ...prev, saveStatus: nextStatusAfter(settled) }));
        })
        .finally(() => setSaveInFlight(false));
    });
  };

  // Sends an edit that is still waiting for its autosave right now (quick 261008-lsy) — used by the
  // Board Rack just before it locks the open board, so the lock never strands a shaper's last edit.
  // It asks the same pure decider the autosave effect does and does nothing unless the answer is
  // "save" (signed out, never saved, nothing changed, already locked, or a save in flight: nothing).
  const flushAutosave = () => {
    const decision = decideAutosave({
      signedIn: isSignedIn === true,
      modelId: state.modelId,
      dirty: state.dirty,
      inFlight: saveInFlight,
      locked: lockedRef.current,
    });
    if (decision === "save") performSave();
  };

  // The autosave effect (D-08): re-evaluates `decideAutosave` on every change to the snapshot
  // fields (via `designSnapshotFields`'s identity, which only changes when its contents do), on
  // sign-in state changing, and once a save settles (`saveInFlight` flipping back to false, in
  // case another edit arrived while it was writing). When the decision is "save", it starts a
  // timer whose delay backs off with `consecutiveFailuresRef` (see `autosaveDelayFor` below) —
  // a shaper hitting a persistent failure (outage, expired session) doesn't get hammered with a
  // retry every `AUTOSAVE_DEBOUNCE_MS` forever, and the nav's "Not saved" click is still an
  // instant manual retry the whole time (`requestSave` never goes through this timer). A cleanup
  // on every re-run clears the previous timer, so a shaper who keeps adjusting keeps pushing the
  // write out rather than queueing several.
  useEffect(() => {
    const decision = decideAutosave({
      signedIn: isSignedIn === true,
      modelId: state.modelId,
      dirty: state.dirty,
      inFlight: saveInFlight,
      locked: state.locked,
    });
    if (decision !== "save") return;

    const timer = setTimeout(performSave, autosaveDelayFor(consecutiveFailuresRef.current));
    return () => clearTimeout(timer);
    // performSave closes over state.modelId/state.boardName/designSnapshotFields/saveInFlight
    // freshly on every render, so it does not need to be listed itself — including it would
    // re-create the effect (and reset the debounce timer) on every render for no behavioural
    // difference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, state.modelId, state.dirty, state.locked, saveInFlight, designSnapshotFields]);

  /** Steps the board back one entry, or does nothing on an empty past. Spreading exactly the ten
   * `DesignHistorySnapshot` fields (the blank among them) into state — never the whole state object — is exactly why
   * `modelId`, `saveStatus` and `boardName` are left untouched by an undo. `dirty: true` is
   * deliberate, not an oversight: taking a change back IS a change, and the existing autosave
   * effect should write the undone board to the shaper's account exactly as it would any other
   * edit. `pendingEditKeyRef` is cleared first so this restoring setState is never mistaken by the
   * recording effect above for a new edit to file away. */
  const undoEdit = () => {
    if (lockedRef.current) return;
    const result = undo(history, historySnapshot);
    if (!result) return;
    pendingEditKeyRef.current = undefined;
    setHistory(result.history);
    setState((prev) => ({ ...prev, ...result.restored, boardStarted: true, dirty: true }));
  };

  /** The mirror of undoEdit — see its doc comment above for why each line is there. */
  const redoEdit = () => {
    if (lockedRef.current) return;
    const result = redo(history, historySnapshot);
    if (!result) return;
    pendingEditKeyRef.current = undefined;
    setHistory(result.history);
    setState((prev) => ({ ...prev, ...result.restored, boardStarted: true, dirty: true }));
  };

  // The keyboard shortcut (Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z). Reads the plain decision from
  // lib/design-history.ts rather than inlining any key-matching here, and defers entirely to the
  // browser's own text-box undo whenever the event's target is a text-entry field
  // (isTextEntryTarget) — deliberately NOT "whenever any input is focused", since Base UI renders
  // a slider's thumb as a real, focused `<input type="range">`, and blocking the shortcut there
  // would kill it exactly where a shaper most wants it right after a slider move.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const shortcut = undoShortcut(event);
      if (shortcut === null) return;
      const target = event.target as { tagName?: string | null; type?: string | null; isContentEditable?: boolean } | null;
      if (isTextEntryTarget(target)) return;
      event.preventDefault();
      if (shortcut === "undo") undoEdit();
      else redoEdit();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // undoEdit/redoEdit close over history and historySnapshot freshly on every render, so
    // listing them too would rebind this listener every render for no behavioural difference —
    // the same posture the autosave effect above takes with performSave.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, historySnapshot]);

  const value: DesignContextValue = {
    outline: state.outline,
    rocker: state.rocker,
    foil,
    rails: state.rails,
    fins: state.fins,
    volume: state.volume,
    finsImportTemplate: state.finsImportTemplate,
    railsImportFoilThickness: state.railsImportFoilThickness,
    boardName: state.boardName,
    finSystem: state.finSystem,
    blank: state.blank,
    modelId: state.modelId,
    locked: state.locked,
    setOpenBoardLocked,
    noteRenamed,
    flushAutosave,
    hasBoardInProgress: state.boardStarted,
    designSnapshotFields,
    isDirty: state.dirty,
    saveStatus: state.saveStatus,
    requestSave: performSave,
    canUndo: !state.locked && canUndo(history),
    canRedo: !state.locked && canRedo(history),
    undoEdit,
    redoEdit,
    updateOutline,
    updateRocker,
    updateFoil,
    pickBlank,
    setPlacement,
    setDeckSkin,
    setTipStyle,
    setFineTuneSurface,
    setFineTune,
    resetFineTune,
    setThinningStart,
    setThinningStartAutomatic,
    removeBlank,
    applyPreset,
    applyModel,
    updateRailSection,
    toggleTailHardEdge,
    updateFins,
    updateVolume,
    setFinsImportTemplate,
    toggleRailsImportFoilThickness,
    setBoardName,
    setFinSystem,
    setModelId,
    markSaved,
    toggleImportTemplateDimensions,
    toggleImportRailThickness,
    outlineGeometry,
    outlineGhostGeometry,
    preparedBlank,
    sideProfile,
    effectiveRails,
    railBands,
    templateValues,
    railValues,
    effectiveFins,
    finPlacement,
    finImportedTail,
    finTailOutline,
    effectiveVolume,
    volumeResult,
    crossSectionVolume,
    quotedVolumeLitres,
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
