"use client";

/**
 * The blank list's judging, in the browser (D-07, R14).
 *
 * The page streams the pickable catalogue once per visit; this hook fits every blank once
 * (`prepareBlank`, memoised on the catalogue itself) and judges the whole list (`listBlanks`)
 * against the board. Since quick 261015-ve9 the BLANK button and the PICK A BLANK popup share ONE
 * call of it (`blank-picker.tsx`), so opening the popup never re-judges the catalogue; it also hands
 * back the whole prepared catalogue (`allPrepared`) for the popup's counts. The verdicts depend on the board's length and outline, its centre thickness,
 * its two tips, the two 12" fine-tunes, each tip's Thinning Start (Phase 14), how it is cut from the blank (Deck Skin, Tip Style,
 * fine-tune surface — Phase 12) and the shaper's three fit rules — and on NOTHING else.
 *
 * Which blanks are judged at all is decided by the blank makers a shaper has ticked in the settings
 * menu (quick task 260926-wmf): an unticked maker's blanks are left out of the prepared catalogue
 * before judging, so they leave the list, the empty-list numbers and the flag's offer together. The
 * filter never re-fits a blank (the catalogue is still fitted once per visit), and with every maker
 * ticked it hands back the very same list, so nothing is re-judged. The board's own picked blank
 * never passes through here, so unticking its maker leaves it on the board.
 *
 * The placement is deliberately absent from every dependency list below: a verdict never takes a
 * placement (`judgeBlank` searches every placement itself), so sliding the board along its blank
 * never re-judges the list and never touches the network. Only the picked blank's own flag is
 * re-checked on a slider move, and that is one sample of one prepared blank (`blank-flag.tsx`).
 *
 * The shaper's saved blanks (quick 261016-mkb plan 03, D-09, P-19, 2026-10-16) are judged here too,
 * beside the catalogue and never mixed into it: each saved entry is prepared ONCE — its copy fitted
 * and bent by its own rocker (`withCustomRocker`), held in a WeakMap on the entry itself — has the
 * same makers filter applied, and is judged by `listBlanks` with the same board and fit rules, so a
 * saved blank too short for the board is not listed, exactly like a maker's. The catalogue's own
 * `list` is untouched by them, so the flag's offer and the button's count line never change (P-19),
 * and with no saved blanks nothing new is judged.
 *
 * A hook, not a component: no markup, no copy. The math is all `lib/geometry/blank-fit.ts`.
 */

import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import { useBlankMakers } from "@/components/blank-makers-provider";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { isPickable } from "@/lib/blanks/catalog";
import { filterShownBlanks } from "@/lib/blanks/vendors";
import { DEFAULT_BLANK_CUT, type BlankCut, type BlankRecord } from "@/lib/geometry/blank";
import {
  listBlanks,
  prepareBlank,
  thinningStartsOf,
  type BlankListResult,
  type BoardFitContext,
  type PreparedBlank,
} from "@/lib/geometry/blank-fit";
import type { CenterFloorRules } from "@/lib/geometry/blank-reasons";
import { withCustomRocker } from "@/lib/geometry/custom-rocker";
import { sampleOutline } from "@/lib/geometry/outline";
import { mm, type Mm } from "@/lib/geometry/units";
import type { SavedBlank } from "@/lib/saved-blanks-preference";

/** The catalogue fitted once: every pickable blank prepared, and the record each came from. */
interface PreparedCatalogue {
  prepared: PreparedBlank[];
  /** The catalogue's own record for a prepared blank — what `pickBlank` stores as the board's copy
   * (the store fits a copy once per record identity, so the list's own record is the one to pass). */
  recordOf: Map<PreparedBlank, BlankRecord>;
}

/**
 * Shared across every caller of this hook for the same streamed catalogue (the list and the flag's
 * offer both read it), so the 150-odd blanks are fitted once per visit, not once per consumer.
 */
const preparedCache = new WeakMap<readonly BlankRecord[], PreparedCatalogue>();

function prepareCatalogue(records: readonly BlankRecord[]): PreparedCatalogue {
  const cached = preparedCache.get(records);
  if (cached) return cached;
  const prepared: PreparedBlank[] = [];
  const recordOf = new Map<PreparedBlank, BlankRecord>();
  for (const record of records) {
    if (!isPickable(record)) continue;
    // Belt and braces (WR-04): the server read already drops a row the maths can't fit, but one
    // blank that still throws here must cost only its own line in the list, never the whole
    // ROCKER screen — this runs during render, and a throw would take the page down.
    let blank: PreparedBlank;
    try {
      blank = prepareBlank(record);
    } catch (error) {
      console.warn(`Shaper: skipped a blank that can't be drawn: ${record.vendor} ${record.name}`, error);
      continue;
    }
    prepared.push(blank);
    recordOf.set(blank, record);
  }
  const result = { prepared, recordOf };
  preparedCache.set(records, result);
  return result;
}

/**
 * Each saved blank prepared once, keyed on the saved entry itself (quick 261016-mkb, T-mkb-13): the
 * browser list re-reads its entries only when storage changes, and the account list only when the
 * shaper saves or removes one, so a surviving entry keeps its prepared blank. `null` records an
 * entry that can't be drawn, so it is tried once, not on every render.
 */
const savedPreparedCache = new WeakMap<SavedBlank, PreparedBlank | null>();

function prepareSaved(entry: SavedBlank): PreparedBlank | null {
  const cached = savedPreparedCache.get(entry);
  if (cached !== undefined) return cached;
  let blank: PreparedBlank | null = null;
  if (isPickable(entry.copy)) {
    // As for the catalogue (WR-04): a saved blank that throws costs only its own card.
    try {
      blank = withCustomRocker(prepareBlank(entry.copy), entry.rocker);
    } catch (error) {
      console.warn(`Shaper: skipped a saved blank that can't be drawn: ${entry.copy.vendor} ${entry.copy.name}`, error);
    }
  }
  savedPreparedCache.set(entry, blank);
  return blank;
}

/** The shaper's saved blanks, judged (quick 261016-mkb, D-09). */
export interface SavedBlankListState {
  /** Both groups, judged by the catalogue's own rule on each saved blank's bent copy. */
  list: BlankListResult;
  /** The saved entry each judged blank came from — its id, copy and rocker. */
  entryOf: Map<PreparedBlank, SavedBlank>;
}

export interface BlankListState extends Omit<PreparedCatalogue, "prepared"> {
  /** The prepared blanks from the makers the shaper shows — every one when all are ticked. */
  prepared: readonly PreparedBlank[];
  /**
   * The whole prepared catalogue, every maker, before the makers filter — what the PICK A BLANK
   * popup counts "of {m} blanks" over, and plan 02's maker chips count per maker (quick 261015-ve9,
   * P-4). Never judged: only `prepared` is.
   */
  allPrepared: readonly PreparedBlank[];
  /** Both groups, shortest first, and why the list is empty when it is. */
  list: BlankListResult;
  /** Everything about the board a verdict depends on — never the placement. */
  ctx: BoardFitContext;
  /** The board as the reason lines name places along it, and its centre (the D-18 sentence quotes it). */
  board: { length: Mm; widePointStation: Mm; centerThickness: Mm };
  /** The shaper's saved blanks, judged beside the catalogue — never inside `list` (quick 261016-mkb). */
  saved: SavedBlankListState;
}

const NO_SAVED_BLANKS: readonly SavedBlank[] = [];

/**
 * How the board is cut from its blank, as the verdicts judge it (Phase 12 D-01, D-04, D-13): the
 * picked blank's own Deck Skin, Tip Style and fine-tune surface; with no blank picked, the live
 * account defaults for the skin and the Tip Style (so a change in Fit & Tip Defaults re-judges the
 * list at once, D-09) and the out-of-the-box fine-tune surface. The ONE place the list, its
 * sentences and the flag read the board's cut from, so they can never disagree.
 */
export function useBoardCut(): BlankCut {
  const { blank } = useDesign();
  const { defaults } = useFitDefaults();
  const deckSkin = blank?.deckSkin ?? defaults.deckSkin;
  const tipStyle = blank?.tipStyle ?? defaults.tipStyle;
  const fineTuneSurface = blank?.fineTuneSurface ?? DEFAULT_BLANK_CUT.fineTuneSurface;
  return useMemo(() => ({ deckSkin, tipStyle, fineTuneSurface }), [deckSkin, tipStyle, fineTuneSurface]);
}

/**
 * The rules the list's centre floor and every sentence around it quote (D-10): Extra Length, the
 * Planer Max Depth, and the Deck Skin the verdicts use — the board's own with a blank picked, the
 * live account default without one. The list intro, the empty-list bodies and the F4 flag all take
 * their numbers from here and nowhere else.
 */
export function useCenterFloorRules(): CenterFloorRules {
  const { settings } = useFitDefaults();
  const { deckSkin } = useBoardCut();
  const { extraLength, planerMaxDepth } = settings;
  return useMemo(() => ({ extraLength, planerMaxDepth, deckSkin }), [extraLength, planerMaxDepth, deckSkin]);
}

export function useBlankList(
  records: readonly BlankRecord[],
  savedBlanks: readonly SavedBlank[] = NO_SAVED_BLANKS,
): BlankListState {
  const { outline, outlineGeometry, foil, blank } = useDesign();
  const { settings } = useFitDefaults();
  const { deckSkin, tipStyle, fineTuneSurface } = useBoardCut();
  const { hidden } = useBlankMakers();

  const catalogue = useMemo(() => prepareCatalogue(records), [records]);
  // Only the makers the shaper shows are judged. With every maker ticked this is the very same
  // array, so the list below is not re-judged.
  const shown = useMemo(
    () => filterShownBlanks(catalogue.prepared, hidden, (blank) => blank.record.vendor),
    [catalogue.prepared, hidden],
  );

  // The two fine-tunes count toward a verdict (a tweak can push the board through the foam); with
  // no blank picked there is no tweak, so both read 0.
  const nose12Offset = blank?.nose12Offset ?? mm(0);
  const tail12Offset = blank?.tail12Offset ?? mm(0);
  // Each tip's Thinning Start as the board stores it — absent means Automatic, which is decided
  // blank by blank and placement by placement inside the fit check itself (Phase 14 D-24).
  const noseThinningStart = blank?.noseThinningStart;
  const tailThinningStart = blank?.tailThinningStart;

  // D-07: no placement in this dependency list, on purpose. The cut is in it (Pitfall 8): a new
  // Deck Skin moves the centre floor, and a new Tip Style moves where the tips come off. Both
  // Thinning Starts are in it too (Phase 14 Pitfall 6): a start moves where each tip is thinned, so
  // the verdicts move with it — leave one out and the list would go stale after a start changes.
  const ctx = useMemo<BoardFitContext>(
    () => ({
      board: {
        length: outline.length,
        centerThickness: foil.center,
        noseTip: foil.noseTip,
        tailTip: foil.tailTip,
        nose12Offset,
        tail12Offset,
        deckSkin,
        tipStyle,
        fineTuneSurface,
        ...thinningStartsOf({ noseThinningStart, tailThinningStart }),
      },
      halfWidthAt: (station: Mm) => sampleOutline(outlineGeometry, station),
      widePointStation: outlineGeometry.widePointStation,
    }),
    [
      outline.length,
      outlineGeometry,
      foil.center,
      foil.noseTip,
      foil.tailTip,
      nose12Offset,
      tail12Offset,
      deckSkin,
      tipStyle,
      fineTuneSurface,
      noseThinningStart,
      tailThinningStart,
    ],
  );

  const { extraLength, planerMaxDepth, widthMargin } = settings;
  // D-07: no placement here either — the list is judged on the board and the three fit rules only.
  const list = useMemo(
    () => listBlanks(shown, ctx, { extraLength, planerMaxDepth, widthMargin }),
    [shown, ctx, extraLength, planerMaxDepth, widthMargin],
  );

  // The shaper's saved blanks (quick 261016-mkb, P-19): prepared once each, the same makers filter,
  // judged with the same board and rules — and never mixed into `list` above.
  const savedEntryOf = useMemo(() => {
    const entryOf = new Map<PreparedBlank, SavedBlank>();
    for (const entry of savedBlanks) {
      const blank = prepareSaved(entry);
      if (blank) entryOf.set(blank, entry);
    }
    return entryOf;
  }, [savedBlanks]);
  const savedShown = useMemo(
    () => filterShownBlanks([...savedEntryOf.keys()], hidden, (blank) => blank.record.vendor),
    [savedEntryOf, hidden],
  );
  const saved = useMemo<SavedBlankListState>(
    () => ({
      list:
        savedShown.length === 0
          ? { fits: [], wontFit: [], emptyReason: "length", tooThinReason: null }
          : listBlanks(savedShown, ctx, { extraLength, planerMaxDepth, widthMargin }),
      entryOf: savedEntryOf,
    }),
    [savedShown, savedEntryOf, ctx, extraLength, planerMaxDepth, widthMargin],
  );

  const board = useMemo(
    () => ({
      length: outline.length,
      widePointStation: outlineGeometry.widePointStation,
      centerThickness: foil.center,
    }),
    [outline.length, outlineGeometry.widePointStation, foil.center],
  );

  return { prepared: shown, allPrepared: catalogue.prepared, recordOf: catalogue.recordOf, list, ctx, board, saved };
}
