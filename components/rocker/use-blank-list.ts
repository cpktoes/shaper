"use client";

/**
 * The blank list's judging, in the browser (D-07, R14).
 *
 * The page streams the pickable catalogue once per visit; this hook fits every blank once
 * (`prepareBlank`, memoised on the catalogue itself) and judges the whole list (`listBlanks`)
 * against the board. The verdicts depend on the board's length and outline, its centre thickness,
 * its two tips, the two 12" fine-tunes and the shaper's three fit rules — and on NOTHING else.
 *
 * The placement is deliberately absent from every dependency list below: a verdict never takes a
 * placement (`judgeBlank` searches every placement itself), so sliding the board along its blank
 * never re-judges the list and never touches the network. Only the picked blank's own flag is
 * re-checked on a slider move, and that is one sample of one prepared blank (`blank-flag.tsx`).
 *
 * A hook, not a component: no markup, no copy. The math is all `lib/geometry/blank-fit.ts`.
 */

import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { isPickable } from "@/lib/blanks/catalog";
import type { BlankRecord } from "@/lib/geometry/blank";
import {
  listBlanks,
  prepareBlank,
  type BlankListResult,
  type BoardFitContext,
  type PreparedBlank,
} from "@/lib/geometry/blank-fit";
import { sampleOutline } from "@/lib/geometry/outline";
import { mm, type Mm } from "@/lib/geometry/units";

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
    const blank = prepareBlank(record);
    prepared.push(blank);
    recordOf.set(blank, record);
  }
  const result = { prepared, recordOf };
  preparedCache.set(records, result);
  return result;
}

export interface BlankListState extends PreparedCatalogue {
  /** Both groups, shortest first, and why the list is empty when it is. */
  list: BlankListResult;
  /** Everything about the board a verdict depends on — never the placement. */
  ctx: BoardFitContext;
  /** The board as the reason lines name places along it. */
  board: { length: Mm; widePointStation: Mm };
}

export function useBlankList(records: readonly BlankRecord[]): BlankListState {
  const { outline, outlineGeometry, foil, blank } = useDesign();
  const { settings } = useFitDefaults();

  const catalogue = useMemo(() => prepareCatalogue(records), [records]);

  // The two fine-tunes count toward a verdict (a tweak can push the board through the foam); with
  // no blank picked there is no tweak, so both read 0.
  const nose12Offset = blank?.nose12Offset ?? mm(0);
  const tail12Offset = blank?.tail12Offset ?? mm(0);

  // D-07: no placement in this dependency list, on purpose.
  const ctx = useMemo<BoardFitContext>(
    () => ({
      board: {
        length: outline.length,
        centerThickness: foil.center,
        noseTip: foil.noseTip,
        tailTip: foil.tailTip,
        nose12Offset,
        tail12Offset,
      },
      halfWidthAt: (station: Mm) => sampleOutline(outlineGeometry, station),
      widePointStation: outlineGeometry.widePointStation,
    }),
    [outline.length, outlineGeometry, foil.center, foil.noseTip, foil.tailTip, nose12Offset, tail12Offset],
  );

  const { extraLength, extraCenterThickness, widthMargin } = settings;
  // D-07: no placement here either — the list is judged on the board and the three fit rules only.
  const list = useMemo(
    () => listBlanks(catalogue.prepared, ctx, { extraLength, extraCenterThickness, widthMargin }),
    [catalogue.prepared, ctx, extraLength, extraCenterThickness, widthMargin],
  );

  const board = useMemo(
    () => ({ length: outline.length, widePointStation: outlineGeometry.widePointStation }),
    [outline.length, outlineGeometry.widePointStation],
  );

  return { ...catalogue, list, ctx, board };
}
