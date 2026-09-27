"use client";

/**
 * The fit flag under the picked-blank card (Phase 11, D-08, R6; 11-UI-SPEC §6, F1–F5).
 *
 * When the board stops fitting the blank it sits in — a thicker centre, a longer board, a tip or a
 * fine-tune past the foam, or a slide to a place where it pokes out — the blank STAYS picked. This
 * block says why, with the station and the amount, and offers exactly one way out:
 *
 * - F3 / F4 — the blank no longer passes a floor (too short for the spare length asked for, or too
 *   thin at the centre to leave room for the board's Deck Skin and one bottom pass of the Planer
 *   Max Depth — Phase 12 D-10): the offer.
 * - F2 — it fits somewhere else along the blank, just not where the board sits now: Move to Where
 *   It Fits, which slides the board to the fitting placement nearest to where it is.
 * - F1 — it fits nowhere along the blank: the offer.
 * - The offer is the fitting blank of any vendor whose length is closest to this one, with Switch
 *   to This Blank. F5 — when no blank in any catalogue fits — says so and offers Change Fit Rules
 *   (the gear menu's Fit & Tip Defaults dialog) instead. With the catalogue unavailable there is
 *   no offer line at all; the flag's headline and reason never wait for the catalogue.
 * - Ahead of all of these: a 12" fine-tune on the Deck bigger than the board's Deck Skin
 *   (`tweakExceedsDeckSkin`, D-13) fits no blank anywhere, and nothing in Fit & Tip Defaults can
 *   change that — so the flag names the fixes on ROCKER and offers ↺ Reset Fine-Tune, never
 *   Change Fit Rules.
 *
 * Checked on every change, slider moves included — it is one sample of one prepared blank at one
 * placement (`fitAt`), never a list verdict and never a network request (R14). The "does it fit
 * anywhere" search (`judgeBlank`) is memoised on the board and the settings only, never the
 * placement. This component never calls a store move except on the shaper's own tap.
 *
 * Outlined in warning ink, never filled (`--surf-warning` is loud enough for a destructive action,
 * and this is a fit note). Every sentence comes from `lib/geometry/blank-reasons.ts`.
 */

import { Suspense, use, useMemo, type ReactNode } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { useDesign } from "@/components/design/design-store";
import { useFitDefaults } from "@/components/fit-defaults-provider";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/components/units-provider";
import type { BlankCatalogResult } from "@/lib/db/blanks";
import type { BlankRecord } from "@/lib/geometry/blank";
import {
  fitAt,
  floorCheck,
  judgeBlank,
  nearestFit,
  nearestFittingPlacement,
  tweakExceedsDeckSkin,
  type BoardFitContext,
  type PreparedBlank,
} from "@/lib/geometry/blank-fit";
import type { BlankSideView } from "@/lib/geometry/board-profile";
import {
  FLAG_HEADLINES,
  floorShortfallMessage,
  formatShortfall,
  NOTHING_FITS_SENTENCE,
  offerLine,
  tweakOverSkinLine,
} from "@/lib/geometry/blank-reasons";
import { sampleOutline } from "@/lib/geometry/outline";
import { mm, type Mm } from "@/lib/geometry/units";
import { useBlankList, useBoardCut, useCenterFloorRules } from "./use-blank-list";

/** A full-width button on a phone, its natural width on desktop. */
const ACTION_CLASS = "mt-1 self-start max-shell:w-full max-shell:self-stretch";

/** The warning-outlined block every flag state shares. `flag` names the state for a stable hook. */
function FlagBlock({
  headline,
  body,
  flag,
  children,
}: {
  headline: string;
  body: string;
  flag?: string;
  children?: ReactNode;
}) {
  return (
    <div role="status" data-blank-flag data-flag={flag} className="flex flex-col gap-1 rounded-md border border-surf-warning-ink p-2">
      <div className="flex items-start gap-1">
        <TriangleAlertIcon aria-hidden className="size-4 shrink-0 text-surf-warning-ink" />
        <span className="text-xs font-semibold text-surf-warning-ink">{headline}</span>
      </div>
      <p className="text-xs break-words text-surf-ink">{body}</p>
      {children}
    </div>
  );
}

/** The offer (or F5), once the list's verdicts are in. */
function OfferBody({ records, current }: { records: readonly BlankRecord[]; current: BlankRecord }) {
  const { system } = useUnits();
  const { foil, pickBlank } = useDesign();
  const { openDialog } = useFitDefaults();
  const { list, recordOf } = useBlankList(records);
  const offer = nearestFit(current, list.fits, foil.center);

  if (offer === null) {
    // F5: nothing in any catalogue fits this board right now.
    return (
      <>
        <p className="text-xs text-surf-ink">{NOTHING_FITS_SENTENCE}</p>
        <Button variant="outline" className={ACTION_CLASS} onClick={openDialog}>
          Change Fit Rules
        </Button>
      </>
    );
  }
  const record = recordOf.get(offer.prepared) ?? offer.prepared.record;
  return (
    <>
      <p data-blank-offer className="text-xs break-words text-surf-ink">
        {offerLine(record, system)}
      </p>
      <Button variant="outline" className={ACTION_CLASS} onClick={() => pickBlank(record, offer.placement)}>
        Switch to This Blank
      </Button>
    </>
  );
}

/** Waits for the catalogue (the offer is the only part of the flag that does). */
function Offer({ catalog, current }: { catalog: Promise<BlankCatalogResult>; current: BlankRecord }) {
  const result = use(catalog);
  if (result.status === "unavailable") return null;
  return <OfferBody records={result.blanks} current={current} />;
}

function PickedBlankFlag({
  catalog,
  prepared,
  view,
  placement,
  nose12Offset,
  tail12Offset,
}: {
  catalog: Promise<BlankCatalogResult>;
  prepared: PreparedBlank;
  view: BlankSideView;
  /** The stored placement — where "Move to Where It Fits" searches outward from. */
  placement: Mm;
  nose12Offset: Mm;
  tail12Offset: Mm;
}) {
  const { system } = useUnits();
  const { outline, outlineGeometry, foil, setPlacement, resetFineTune } = useDesign();
  const { settings } = useFitDefaults();
  const { extraLength, planerMaxDepth, widthMargin } = settings;
  // The picked board's own cut (its blank's Deck Skin, Tip Style and fine-tune surface), and the
  // rules the F4 sentence quotes — the same numbers the floor below is checked with (D-10).
  const { deckSkin, tipStyle, fineTuneSurface } = useBoardCut();
  const rules = useCenterFloorRules();

  // Everything about the board the "fits anywhere?" search depends on — never the placement.
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
    ],
  );
  const floor = floorCheck(prepared, ctx.board, settings);
  // D-07: judged on the board and the rules only, so a slider move never re-runs the search.
  const verdict = useMemo(
    () => (floor.passes ? judgeBlank(prepared, ctx, { extraLength, planerMaxDepth, widthMargin }) : null),
    [floor.passes, prepared, ctx, extraLength, planerMaxDepth, widthMargin],
  );

  const board = {
    length: outline.length,
    widePointStation: outlineGeometry.widePointStation,
    centerThickness: foil.center,
  };
  const offer = (
    <Suspense fallback={null}>
      <Offer catalog={catalog} current={prepared.record} />
    </Suspense>
  );

  // A Deck fine-tune bigger than the Deck Skin: no blank anywhere can take it, and only ROCKER's own
  // controls can fix it — so the one way out offered is ↺ Reset Fine-Tune, never Change Fit Rules.
  if (tweakExceedsDeckSkin(ctx.board)) {
    return (
      <FlagBlock
        flag="tweak-over-skin"
        headline={FLAG_HEADLINES.doesNotFit}
        body={`${tweakOverSkinLine(mm(Math.max(nose12Offset, tail12Offset)), deckSkin, system)}.`}
      >
        <Button variant="outline" className={ACTION_CLASS} onClick={resetFineTune}>
          ↺ Reset Fine-Tune
        </Button>
      </FlagBlock>
    );
  }

  // F3 / F4: the blank no longer passes a floor.
  if (floor.lengthShortBy !== null) {
    return (
      <FlagBlock
        headline={FLAG_HEADLINES.doesNotFit}
        body={floorShortfallMessage("length", floor.lengthShortBy, rules, system)}
      >
        {offer}
      </FlagBlock>
    );
  }
  if (floor.centerShortBy !== null) {
    return (
      <FlagBlock
        headline={FLAG_HEADLINES.doesNotFit}
        body={floorShortfallMessage("center", floor.centerShortBy, rules, system)}
      >
        {offer}
      </FlagBlock>
    );
  }

  // One sample at the current placement, on every change (slider moves included) — with the same
  // width margin and one-pass-at-the-centre rule the list judges by (D-15), so a board slid to where
  // less than one planer pass would come off the bottom at its centre reads F2 here.
  const current = fitAt(view.onBlank, ctx.halfWidthAt, ctx.widePointStation, { widthMargin, planerMaxDepth });
  if (current.fits || verdict === null) return null;

  if (verdict.fits) {
    // F2: it fits somewhere else along this blank.
    return (
      <FlagBlock headline={FLAG_HEADLINES.notHere} body={`${formatShortfall(current.worst, board, system)}.`}>
        <Button
          variant="outline"
          className={ACTION_CLASS}
          onClick={() => {
            const to = nearestFittingPlacement(prepared, ctx, { extraLength, planerMaxDepth, widthMargin }, placement);
            if (to !== null) setPlacement(to);
          }}
        >
          Move to Where It Fits
        </Button>
      </FlagBlock>
    );
  }

  // F1: it fits nowhere along this blank — the reason is its nearly-fits reading.
  return (
    <FlagBlock headline={FLAG_HEADLINES.doesNotFit} body={`${formatShortfall(verdict.worst, board, system)}.`}>
      {offer}
    </FlagBlock>
  );
}

export function BlankFlag({ catalog }: { catalog: Promise<BlankCatalogResult> }) {
  const { blank, preparedBlank, sideProfile } = useDesign();
  if (!blank || !preparedBlank || !sideProfile.blank) return null;
  return (
    <PickedBlankFlag
      catalog={catalog}
      prepared={preparedBlank}
      view={sideProfile.blank}
      placement={blank.placement}
      nose12Offset={blank.nose12Offset}
      tail12Offset={blank.tail12Offset}
    />
  );
}
