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
import type { RockerSpec } from "@/lib/geometry/rocker";
import type { FoilSpec } from "@/lib/geometry/foil";
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
  type FinPlacementResult,
  type FinPlacementSpec,
  type FinSystem,
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
import { type Litres, inchesToMm, mm } from "@/lib/geometry/units";
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

/** What one undo/redo step holds — `DesignSnapshotFields` (D-11's ten-field saved-board shape)
 * minus `boardName`. The exclusion is deliberate and structural, not a special case bolted onto
 * one mutator: `boardName` is a text box, and a text box's own undo belongs to the browser
 * (`isTextEntryTarget` below is what actually enforces that at the keyboard), so it is simply
 * never a field this history's own `useMemo` looks at — a typed board name can never produce a
 * new snapshot identity, and so can never record a step, by construction rather than by a
 * separate guard that could drift out of sync with it. */
type DesignHistorySnapshot = Omit<DesignSnapshotFields, "boardName">;

interface DesignState {
  outline: OutlineSpec;
  rocker: RockerSpec;
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
  /** The row in Postgres a Save writes over (D-09) — null means this board has never been
   * saved. Set by `markSaved` after the shaper's own first, manual `saveModel` succeeds, by
   * `applyModel` when a rack card is opened, and cleared back to null by `setModelId(null)` when
   * the board currently open in the editor is deleted from the rack (`board-rack.tsx`) — so the
   * next Save creates a fresh row instead of writing over one that no longer exists. This is
   * session bookkeeping, not board design, so it is deliberately absent from `designSnapshotFields` — a
   * save never stores a reference to its own row. */
  modelId: string | null;
  /** Set true the first time any design-mutating action runs — `applyPreset`, `updateOutline`,
   * `updateRocker`, `updateFoil`, `updateRailSection`, `toggleTailHardEdge`, `updateFins`,
   * `updateVolume`, `setFinsImportTemplate`, `toggleRailsImportFoilThickness`, `setBoardName` or
   * `setFinSystem` — never derived by
   * comparing state against its default — a user who drags a slider back to its default value
   * has still started a board. Backs `hasBoardInProgress` on the setup screen's replace-board
   * confirmation (D-07). */
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
  modelId: null,
  boardStarted: false,
  dirty: false,
  saveStatus: "idle",
};

interface FinTailOutline {
  points: Point2D[];
  connector: Point2D | null;
}

interface DesignContextValue {
  // Raw stored specs — the single place each screen's sidebar writes to.
  outline: OutlineSpec;
  rocker: RockerSpec;
  foil: FoilSpec;
  rails: RailBandSpec;
  fins: FinPlacementSpec;
  volume: VolumeSpec;
  finsImportTemplate: boolean;
  /** See `DesignState.railsImportFoilThickness`'s doc comment. */
  railsImportFoilThickness: boolean;
  boardName: string;
  finSystem: FinSystem;
  modelId: string | null;
  /** True once a board has been applied or edited this session — gates the setup screen's
   * replace-board confirm dialog (D-07). See `DesignState.boardStarted`'s doc comment for why
   * this is a flag set on write, not a derived default-comparison. */
  hasBoardInProgress: boolean;
  /** The subset of state a snapshot holds (D-11) — outline, rocker, foil, rails, fins, volume,
   * finsImportTemplate, railsImportFoilThickness, boardName, finSystem — assembled once here so a
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
  updateRocker: (patch: Partial<RockerSpec>) => void;
  updateFoil: (patch: Partial<FoilSpec>) => void;
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
  finPlacement: FinPlacementResult;
  /** The designed outline's tail, in `tailOutlineHalfPoints`' own shape, for the fin viewer to
   * draw behind the fin marks. `null` when not importing. */
  finTailOutline: FinTailOutline | null;
  /** `volume` with length/width/centerThickness overridden per the import toggles — the derived-
   * value equivalent of the prototype's `syncFromTemplate`. */
  effectiveVolume: VolumeSpec;
  volumeResult: VolumeResult;
  /** The accurate cross-section litres figure (CONTEXT.md D-13) — real cross-sections taken along
   * the designed board's own length using `state.foil` and `effectiveRails`, integrated with
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

  // Deliberately NOT listing state.boardName — see DesignHistorySnapshot's own doc comment above
  // for why that omission is structural rather than a special case.
  const historySnapshot: DesignHistorySnapshot = useMemo(
    () => ({
      outline: state.outline,
      rocker: state.rocker,
      foil: state.foil,
      rails: state.rails,
      fins: state.fins,
      volume: state.volume,
      finsImportTemplate: state.finsImportTemplate,
      railsImportFoilThickness: state.railsImportFoilThickness,
      finSystem: state.finSystem,
    }),
    [
      state.outline,
      state.rocker,
      state.foil,
      state.rails,
      state.fins,
      state.volume,
      state.finsImportTemplate,
      state.railsImportFoilThickness,
      state.finSystem,
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
  useEffect(() => {
    const before = historyPrevSnapshotRef.current;
    historyPrevSnapshotRef.current = historySnapshot;
    const pendingKey = pendingEditKeyRef.current;
    pendingEditKeyRef.current = undefined;
    if (pendingKey === undefined || before === historySnapshot) return;
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

  const updateOutline = (patch: Partial<OutlineSpec>) => {
    noteEdit(`outline:${patchKey(patch)}`);
    setState((prev) => ({ ...prev, outline: { ...prev.outline, ...patch }, boardStarted: true, dirty: true }));
  };

  const updateRocker = (patch: Partial<RockerSpec>) => {
    noteEdit(`rocker:${patchKey(patch)}`);
    setState((prev) => ({ ...prev, rocker: { ...prev.rocker, ...patch }, boardStarted: true, dirty: true }));
  };

  const updateFoil = (patch: Partial<FoilSpec>) => {
    noteEdit(`foil:${patchKey(patch)}`);
    setState((prev) => ({ ...prev, foil: { ...prev.foil, ...patch }, boardStarted: true, dirty: true }));
  };

  // A preset is a complete spec, not a patch (see BoardPreset's own doc comment) — every field
  // not supplied by the preset resets to DEFAULT_DESIGN_STATE's value rather than carrying over
  // from whatever board was there before, so "Discard & Start New" produces a genuinely fresh
  // board (WR-01). rocker/foil joined outline/rails/fins here in 04-05 (D-12) — a preset without
  // them would leave every board type drawing the same generic side profile regardless of which
  // one was picked, which is exactly what D-12 exists to fix.
  const applyPreset = (preset: BoardPreset) => {
    // The history belongs to the board that is open, not to the session. Carrying it across a
    // board swap would let Cmd+Z drag a piece of the board just closed into the board just
    // opened — so both the pending-edit ref and the stacks themselves reset here, right beside
    // the state replacement they belong with.
    pendingEditKeyRef.current = undefined;
    setHistory(emptyHistory());
    setState(() => ({
      ...DEFAULT_DESIGN_STATE,
      outline: preset.outline,
      rocker: preset.rocker,
      foil: preset.foil,
      rails: preset.rails,
      fins: preset.fins,
      boardStarted: true,
      dirty: true,
    }));
  };

  // The one place `dirty` deliberately does NOT follow `boardStarted`: opening a saved board
  // sets boardStarted true (a board is in progress) but leaves dirty at DEFAULT_DESIGN_STATE's
  // false, because the store now matches the row exactly (D-09) — there is nothing to autosave
  // until the shaper changes something.
  const applyModel = (id: string, snapshot: DesignSnapshotFields) => {
    // A fresh row has no save-failure history of its own — carrying over a backoff earned by
    // whatever board was open before would slow its first autosave for no reason.
    consecutiveFailuresRef.current = 0;
    // Same reasoning as applyPreset above: the undo history belongs to the board on screen, and
    // opening a different saved board is exactly the moment it must not survive.
    pendingEditKeyRef.current = undefined;
    setHistory(emptyHistory());
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
      modelId: id,
      boardStarted: true,
    }));
  };

  const updateRailSection = (key: RailSectionKey, patch: Partial<RailSectionSpec>) => {
    noteEdit(`rails:${key}:${patchKey(patch)}`);
    setState((prev) => ({
      ...prev,
      rails: { ...prev.rails, [key]: { ...prev.rails[key], ...patch } },
      boardStarted: true,
      dirty: true,
    }));
  };

  // A discrete switch, not a slider — noteEdit(null) so flipping it twice is always two steps,
  // never folded into one the way a drag would be.
  const toggleTailHardEdge = () => {
    noteEdit(null);
    setState((prev) => ({
      ...prev,
      rails: { ...prev.rails, tailHardEdge: !prev.rails.tailHardEdge },
      boardStarted: true,
      dirty: true,
    }));
  };

  const updateFins = (patch: Partial<FinPlacementSpec>) => {
    noteEdit(`fins:${patchKey(patch)}`);
    setState((prev) => ({ ...prev, fins: { ...prev.fins, ...patch }, boardStarted: true, dirty: true }));
  };

  const updateVolume = (patch: Partial<VolumeSpec>) => {
    noteEdit(`volume:${patchKey(patch)}`);
    setState((prev) => ({ ...prev, volume: { ...prev.volume, ...patch }, boardStarted: true, dirty: true }));
  };

  // A discrete switch — see toggleTailHardEdge's comment above for why noteEdit(null).
  const setFinsImportTemplate = (next: boolean) => {
    noteEdit(null);
    setState((prev) => ({ ...prev, finsImportTemplate: next, boardStarted: true, dirty: true }));
  };

  // A plain flip, mirroring setFinsImportTemplate exactly. Copies nothing into or out of
  // `rails.*.boardThickness` — those three values are written only by updateRailSection (the
  // RAILS sliders), so a shaper's hand-typed thickness survives untouched across any number of
  // link flips (D-09/D-10). See DesignContextValue.toggleRailsImportFoilThickness's doc comment.
  // A discrete switch — see toggleTailHardEdge's comment above for why noteEdit(null).
  const toggleRailsImportFoilThickness = () => {
    noteEdit(null);
    setState((prev) => ({ ...prev, railsImportFoilThickness: !prev.railsImportFoilThickness, boardStarted: true, dirty: true }));
  };

  // No noteEdit call: boardName is deliberately absent from historySnapshot (see
  // DesignHistorySnapshot's doc comment), so recording a pending key here would do nothing but
  // confuse the next real edit's coalescing — do not "fix" this by adding one.
  const setBoardName = (next: string) =>
    setState((prev) => ({ ...prev, boardName: next, boardStarted: true, dirty: true }));

  // A discrete switch — see toggleTailHardEdge's comment above for why noteEdit(null).
  const setFinSystem = (next: FinSystem) => {
    noteEdit(null);
    setState((prev) => ({ ...prev, finSystem: next, boardStarted: true, dirty: true }));
  };

  // Not a design-mutating action — pointing the store at a different (or no) saved row doesn't
  // change the board itself, so this deliberately does NOT set boardStarted, and does NOT
  // noteEdit: it never changes historySnapshot's fields either.
  const setModelId = (next: string | null) => setState((prev) => ({ ...prev, modelId: next }));

  // The shaper's own first, deliberate save (D-08's "only does real work the first time") —
  // there was no modelId for the autosave effect to target until this moment, so it cannot have
  // run performSave/requestSave itself. Setting saveStatus "saved" here, not just modelId, is
  // what lets the nav show "Saved" on the very next render instead of falling back through the
  // plain "Save" button (modelId was null) or an unset "idle" status. No noteEdit call: bookkeeping
  // (modelId, boardName, saveStatus), not a design change — nothing here touches historySnapshot.
  const markSaved = (id: string, name: string) =>
    setState((prev) => ({ ...prev, modelId: id, boardName: name, dirty: false, saveStatus: "saved" }));

  const outlineGeometry = useMemo(() => buildOutline(state.outline), [state.outline]);

  // Derived-value equivalent of D-09's link: never an effect that mirrors the foil into
  // state.rails (that would let the two thicknesses drift apart), just a memo the RAILS screen's
  // own render reads. See deriveEffectiveRails's doc comment in lib/geometry/design.ts.
  const effectiveRails = useMemo(
    () => deriveEffectiveRails(state.rails, state.foil, state.railsImportFoilThickness),
    [state.rails, state.foil, state.railsImportFoilThickness],
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

  // The accurate path (D-13): real cross-sections along the board's own length, using the same
  // half-width sampler pattern `lib/geometry/design.ts`'s `summarizeDesign` builds, so a rack
  // card's number and this screen's number can never drift apart.
  const crossSectionVolume = useMemo(
    () =>
      computeCrossSectionVolume({
        halfWidthAt: (station) => sampleOutline(outlineGeometry, station),
        foil: state.foil,
        rails: effectiveRails,
        length: state.outline.length,
      }),
    [outlineGeometry, state.foil, effectiveRails, state.outline.length],
  );

  const quotedVolumeLitres = useMemo(
    () => deriveQuotedVolumeLitres(volumeResult, crossSectionVolume, volumeResult.importingTemplate),
    [volumeResult, crossSectionVolume],
  );

  // The prototype's own handoff semantics (Volume.dc.html lines 412-437) — the one place derived
  // values must be written back into stored state.
  // A discrete switch — see toggleTailHardEdge's comment (above, near the other RAILS/FINS
  // toggles) for why noteEdit(null).
  const toggleImportTemplateDimensions = () => {
    noteEdit(null);
    setState((prev) => {
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
    if (!state.volume.importTemplateDimensions) return;
    noteEdit(null);
    setState((prev) => {
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
      foil: state.foil,
      rails: state.rails,
      fins: state.fins,
      volume: state.volume,
      finsImportTemplate: state.finsImportTemplate,
      railsImportFoilThickness: state.railsImportFoilThickness,
      boardName: state.boardName,
      finSystem: state.finSystem,
    }),
    [
      state.outline,
      state.rocker,
      state.foil,
      state.rails,
      state.fins,
      state.volume,
      state.finsImportTemplate,
      state.railsImportFoilThickness,
      state.boardName,
      state.finSystem,
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
    });
    if (decision !== "save") return;

    const timer = setTimeout(performSave, autosaveDelayFor(consecutiveFailuresRef.current));
    return () => clearTimeout(timer);
    // performSave closes over state.modelId/state.boardName/designSnapshotFields/saveInFlight
    // freshly on every render, so it does not need to be listed itself — including it would
    // re-create the effect (and reset the debounce timer) on every render for no behavioural
    // difference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, state.modelId, state.dirty, saveInFlight, designSnapshotFields]);

  /** Steps the board back one entry, or does nothing on an empty past. Spreading exactly the nine
   * `DesignHistorySnapshot` fields into state — never the whole state object — is exactly why
   * `modelId`, `saveStatus` and `boardName` are left untouched by an undo. `dirty: true` is
   * deliberate, not an oversight: taking a change back IS a change, and the existing autosave
   * effect should write the undone board to the shaper's account exactly as it would any other
   * edit. `pendingEditKeyRef` is cleared first so this restoring setState is never mistaken by the
   * recording effect above for a new edit to file away. */
  const undoEdit = () => {
    const result = undo(history, historySnapshot);
    if (!result) return;
    pendingEditKeyRef.current = undefined;
    setHistory(result.history);
    setState((prev) => ({ ...prev, ...result.restored, boardStarted: true, dirty: true }));
  };

  /** The mirror of undoEdit — see its doc comment above for why each line is there. */
  const redoEdit = () => {
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
    foil: state.foil,
    rails: state.rails,
    fins: state.fins,
    volume: state.volume,
    finsImportTemplate: state.finsImportTemplate,
    railsImportFoilThickness: state.railsImportFoilThickness,
    boardName: state.boardName,
    finSystem: state.finSystem,
    modelId: state.modelId,
    hasBoardInProgress: state.boardStarted,
    designSnapshotFields,
    isDirty: state.dirty,
    saveStatus: state.saveStatus,
    requestSave: performSave,
    canUndo: canUndo(history),
    canRedo: canRedo(history),
    undoEdit,
    redoEdit,
    updateOutline,
    updateRocker,
    updateFoil,
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
    effectiveRails,
    railBands,
    templateValues,
    railValues,
    effectiveFins,
    finPlacement,
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
