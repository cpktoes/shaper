"use client";

/**
 * The ROCKER screen's DATASHEET (D-07, Phase 11 D-16): five stations across, the board's numbers
 * down — the sheet a shaper holds beside a real foam blank, or takes to the supplier.
 *
 * Everything on it is read off the store's ONE side profile (`BoardSideProfile`, Pattern 5), the
 * same object the drawing, RAILS and VOLUME read, so the sheet can never disagree with them. Two
 * states:
 *
 * - NO BLANK (D-14, the hand-set fallback) — three rows. Width is read-only, derived from the drawn
 *   outline through `sampleOutline` (it belongs to the Template screen, D-07). Thickness is typed at
 *   all five stations. Rocker is typed at Nose Tip, Nose @ 12", Tail @ 12" and Tail Tip — the four
 *   hand-set stations, reversing quick task 260829-rda's read-only 12" cells — with Center a
 *   read-only 0, the flat the rocker is measured up from (Phase 4 D-06/D-07).
 * - A BLANK PICKED (D-16, Phase 12 D-06, Phase 14 D-12) — four blocks, nine rows: the blank's own Rocker, Thickness
 *   and Width under each of the board's five stations (read-only, from the board's own copy of the
 *   blank — never the blank table); YOUR BOARD's Rocker (read-only, the board's own curve, including
 *   the tip lift under Pin deck), Thickness (typed at Nose Tip, Center and Tail Tip — the values the
 *   sidebar writes — and read-only at the two 12" stations, whose fine-tune lives in the sidebar) and
 *   Width (read-only); and FOAM OFF, split by surface — Deck (the skin, plus the tip thinning under
 *   Bottom, less a Deck fine-tune) and Bottom (the centre gap, plus the tip lift under Pin deck, less
 *   a Bottom fine-tune) — with a value below zero (the board pokes out of the blank on that surface)
 *   in warning ink; and THINNING STARTS — one read-only `From tip` row with where each tip's thinning
 *   starts, in from that tip, under the NOSE TIP and TAIL TIP columns (the middle three empty), read
 *   off the profile's resolved starts and never in warning ink. Under the table: the catalogue footnote and one line per catalogue flag on the
 *   blank, verbatim.
 *
 * Typed cells are the app's one typed measurement control, `MeasureField`, in bare mode (D-12),
 * with its bounds taken from the matching slider's `measureSlider` range through `typedFieldBounds`
 * so a field and its slider can never disagree. Every number is formatted through
 * `measure-display.ts`: cells read bare, and in Metric the row label carries the unit
 * (`columnUnitSuffix`, D-10). The two station headers name their station through
 * `stationLabel(system)` — the honest `30.5 cm` conversion, never a hand-typed `30 cm`.
 *
 * On a phone the table scrolls sideways inside its box (Phase 9 D-04) and its label column is
 * sticky, so a row keeps its name mid-scroll (UI-SPEC §11); on a desktop nothing scrolls. Catalogue
 * text (vendor, name, flags) is rendered as React text only.
 */

import type { ReactNode } from "react";
import { MeasureField } from "@/components/design/measure-field";
import { useUnits } from "@/components/units-provider";
import { formatThinningStartBare } from "@/lib/geometry/blank-reasons";
import type { BoardSideProfile } from "@/lib/geometry/board-profile";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec, type FoilStationKey } from "@/lib/geometry/foil";
import {
  columnUnitSuffix,
  formatDimBare,
  formatMarkBare,
  measureSlider,
  stationLabel,
  typedFieldBounds,
} from "@/lib/geometry/measure-display";
import { sampleOutline, type OutlineGeometry } from "@/lib/geometry/outline";
import { ROCKER_LIFT_RANGE_IN, type FiveStationRocker } from "@/lib/geometry/rocker";
import { mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";

interface RockerDatasheetProps {
  /** The store's one side profile — every read-only number on the sheet comes from here. */
  profile: BoardSideProfile;
  /** The hand-set rocker (D-14) — what the fallback's typed Rocker row edits. */
  rocker: FiveStationRocker;
  foil: FoilSpec;
  outlineGeometry: OutlineGeometry;
  onChangeRocker: (patch: Partial<FiveStationRocker>) => void;
  onChangeFoil: (patch: Partial<FoilSpec>) => void;
}

/** Nose-to-tail reading order, matching the sidebar's thickness sliders and the UI spec's fixed
 * column headings. The two station names (`nose12`/`tail12`) are composed through
 * `stationLabel(system)` (D-03) rather than hand-typed, so the sidebar, this datasheet and the
 * viewer can never disagree about where the measuring station is. */
function datasheetStations(system: UnitsSystem): { key: FoilStationKey; name: string }[] {
  return [
    { key: "noseTip", name: "Nose Tip" },
    { key: "nose12", name: `Nose @ ${stationLabel(system)}` },
    { key: "center", name: "Center" },
    { key: "tail12", name: `Tail @ ${stationLabel(system)}` },
    { key: "tailTip", name: "Tail Tip" },
  ];
}

/** The label column: sticky on a sideways-scrolling phone so a row keeps its name (UI-SPEC §11),
 * painted in the panel colour so the scrolled cells pass beneath it. */
const LABEL_CELL = "sticky left-0 z-10 bg-surf-panel min-w-0 flex-[1.1]";
const READ_ONLY_CELL = "min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal";

/** One table row: its label cell and one cell per station. `typed` rows keep the full-ink label,
 * read-only rows the muted one (`rocker-datasheet.tsx`'s existing treatment). */
function Row({
  label,
  typed,
  className = "border-b border-surf-line-faint",
  "data-datasheet-thinning": thinning,
  children,
}: {
  label: string;
  typed: boolean;
  className?: string;
  /** Marks the THINNING STARTS row, for the browser tests. */
  "data-datasheet-thinning"?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex items-center gap-2 py-1.5 ${className}`} data-datasheet-thinning={thinning || undefined}>
      <div className={`${LABEL_CELL} text-sm font-normal ${typed ? "text-surf-ink" : "text-surf-ink-muted"}`}>
        {label}
      </div>
      {children}
    </div>
  );
}

/** A group label spanning the table (`BLANK — …`, `YOUR BOARD`), sticky-left with the label column
 * and wrapping for a long blank name. */
function GroupLabel({ children }: { children: ReactNode }) {
  return (
    <div className="sticky left-0 z-10 bg-surf-panel w-fit max-w-full pt-2 pb-1 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
      {children}
    </div>
  );
}

export function RockerDatasheet({
  profile,
  rocker,
  foil,
  outlineGeometry,
  onChangeRocker,
  onChangeFoil,
}: RockerDatasheetProps) {
  const { system } = useUnits();
  const stations = datasheetStations(system);
  // The one definition of where the five stations sit — the profile's own, never re-derived.
  const stationMm = Object.fromEntries(profile.stations.map((p) => [p.key, p.station])) as Record<FoilStationKey, Mm>;
  const blank = profile.blank;

  const markSuffix = columnUnitSuffix("mark", system);
  const dimSuffix = columnUnitSuffix("dim", system);

  /** A bare, read-only marks-family cell. */
  const markCell = (key: FoilStationKey, value: Mm) => (
    <div key={key} className={READ_ONLY_CELL}>
      {formatMarkBare(value, system)}
    </div>
  );

  /** A FOAM OFF cell (Deck or Bottom): a bare, read-only mark. A value that prints as zero reads as
   * zero, never as a warning "-0"; one below zero (the board would poke out of the blank on that
   * surface) reads in warning ink with its minus sign. */
  const foamOffCell = (key: FoilStationKey, value: Mm) => {
    const printed = formatMarkBare(value, system);
    const isZero = /^-?0"?$/.test(printed);
    const pokesOut = value < 0 && !isZero;
    return (
      <div
        key={key}
        className={`min-w-0 flex-1 text-right text-sm font-normal ${pokesOut ? "text-surf-warning-ink" : "text-surf-ink-muted"}`}
      >
        {isZero ? formatMarkBare(mm(0), system) : printed}
      </div>
    );
  };

  /** A typed marks-family cell: bare `MeasureField`, bounded by its matching slider's range. */
  const typedMarkCell = (
    key: FoilStationKey,
    value: Mm,
    rangeIn: { min: number; max: number; step: number },
    label: string,
    onCommit: (next: Mm) => void,
  ) => {
    const bounds = typedFieldBounds(measureSlider(value, rangeIn, rangeIn.step, 1, system), "mark", system);
    return (
      <div key={key} className="flex min-w-0 flex-1 justify-end">
        <MeasureField
          value={value}
          onCommit={onCommit}
          label={label}
          family="mark"
          min={bounds.min}
          max={bounds.max}
          system={system}
          bare
        />
      </div>
    );
  };

  /** The board's width at each station — read-only, from the drawn outline (D-07). */
  const widthRow = (
    <Row label={`Width${dimSuffix}`} typed={false}>
      {stations.map((s) => (
        <div key={s.key} className={READ_ONLY_CELL}>
          {formatDimBare(mm(sampleOutline(outlineGeometry, stationMm[s.key]) * 2), system)}
        </div>
      ))}
    </Row>
  );

  const header = (
    <div className="mb-2 flex gap-2 border-b-2 border-surf-line-faint pb-2">
      <div className={LABEL_CELL} />
      {stations.map((s) => (
        <div
          key={s.key}
          className="min-w-0 flex-1 text-right text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold"
        >
          {s.name}
        </div>
      ))}
    </div>
  );

  const flagged = blank ? blank.record.stations.filter((station) => station.flag !== null) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      <div className="text-sm text-surf-ink-muted font-normal">
        {blank
          ? "Your blank's numbers beside your board's, at the board's five stations — take it to the supplier."
          : "Your board's own blank datasheet — hold it beside a real foam blank when you order."}
      </div>
      {/* D-04: the box scrolls sideways on a narrow phone instead of re-stacking a single column
          per row, keeping every column. The trailing fade (24px, toward --surf-panel — the card
          this datasheet always sits inside, per TabbedPanel) is the "there's more, keep going"
          hint. Constant, not scroll-position-driven: on a fixed, five-station table the box
          either scrolls or it doesn't per viewport. */}
      <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
        <div className="min-w-[540px]">
          {header}

          {blank ? (
            <>
              <GroupLabel>{`BLANK — ${blank.record.vendor} ${blank.record.name}`.toUpperCase()}</GroupLabel>
              <Row label={`Rocker${markSuffix}`} typed={false}>
                {stations.map((s) => markCell(s.key, blank.blankAtStations[s.key].rocker))}
              </Row>
              <Row label={`Thickness${markSuffix}`} typed={false}>
                {stations.map((s) => markCell(s.key, blank.blankAtStations[s.key].thickness))}
              </Row>
              <Row label={`Width${dimSuffix}`} typed={false}>
                {stations.map((s) => (
                  <div key={s.key} className={READ_ONLY_CELL}>
                    {formatDimBare(blank.blankAtStations[s.key].width, system)}
                  </div>
                ))}
              </Row>

              <GroupLabel>YOUR BOARD</GroupLabel>
              <Row label={`Rocker${markSuffix}`} typed={false}>
                {stations.map((s) => markCell(s.key, profile.stationRocker[s.key]))}
              </Row>
              {/* Thickness: the centre and the two tips are the board's own stored values, typed
                  here exactly as the sidebar sets them; the 12" stations are the thickness cut
                  from the blank (its thickness less the Deck Skin and the centre gap) plus any
                  fine-tune, read-only (the fine-tune lives in the sidebar). */}
              <Row label={`Thickness${markSuffix}`} typed>
                {stations.map((s) =>
                  s.key === "nose12" || s.key === "tail12"
                    ? markCell(s.key, profile.effectiveFoil[s.key])
                    : typedMarkCell(s.key, foil[s.key], FOIL_THICKNESS_RANGE_IN, `Thickness — ${s.name}`, (next) =>
                        onChangeFoil({ [s.key]: next }),
                      ),
                )}
              </Row>
              {widthRow}

              {/* D-06: the foam to come off, split by surface. The blank's own rocker stays in its
                  block above and the board's in YOUR BOARD, so the sheet a shaper takes to the
                  supplier reads the blank, the board and the cut between them side by side. The
                  FOAM OFF label does the separating job the old single row's heavier rule did. */}
              <GroupLabel>FOAM OFF</GroupLabel>
              <Row label={`Deck${markSuffix}`} typed={false}>
                {stations.map((s) => foamOffCell(s.key, blank.foamOffDeck[s.key]))}
              </Row>
              <Row label={`Bottom${markSuffix}`} typed={false}>
                {stations.map((s) => foamOffCell(s.key, blank.foamOffBottom[s.key]))}
              </Row>

              {/* Phase 14 D-12: where each tip's thinning starts, in from that tip, under its own
                  tip's column so it sits beside the tip thickness it belongs to. Always the
                  profile's resolved start (Automatic's, or the hand-set one pulled inside the
                  slider's reach), never warning ink: a start is a setting. The table's last row,
                  so it drops the bottom rule. */}
              <GroupLabel>THINNING STARTS</GroupLabel>
              <Row label={`From tip${dimSuffix}`} typed={false} className="" data-datasheet-thinning>
                {stations.map((s) => (
                  <div key={s.key} className={READ_ONLY_CELL}>
                    {s.key === "noseTip"
                      ? formatThinningStartBare(blank.tips.nose.fromTip, system)
                      : s.key === "tailTip"
                        ? formatThinningStartBare(blank.tips.tail.fromTip, system)
                        : ""}
                  </div>
                ))}
              </Row>
            </>
          ) : (
            <>
              {widthRow}

              {/* Thickness — typed at all five stations (D-06/D-12). */}
              <Row label={`Thickness${markSuffix}`} typed>
                {stations.map((s) =>
                  typedMarkCell(s.key, foil[s.key], FOIL_THICKNESS_RANGE_IN, `Thickness — ${s.name}`, (next) =>
                    onChangeFoil({ [s.key]: next }),
                  ),
                )}
              </Row>

              {/* Rocker — typed at the four hand-set stations (D-14); the centre is the flat the
                  rocker is measured up from, always a read-only 0. */}
              <Row label={`Rocker${markSuffix}`} typed className="">
                {stations.map((s) =>
                  s.key === "center"
                    ? markCell(s.key, mm(0))
                    : typedMarkCell(s.key, rocker[s.key], ROCKER_LIFT_RANGE_IN, `Rocker — ${s.name}`, (next) =>
                        onChangeRocker({ [s.key]: next }),
                      ),
                )}
              </Row>
            </>
          )}
        </div>
      </div>

      {blank && (
        <div className="flex flex-col gap-1 text-xs text-surf-ink-muted font-normal">
          <p>
            {`From the ${blank.record.vendor} catalog, page ${blank.record.pdfPage}. Station names are the catalog's own — T12 is 12 inches from the tail, N12 is 12 inches from the nose.`}
          </p>
          {flagged.map((station, index) => (
            <p key={`${index}-${station.label}`}>{`At ${station.label}: ${station.flag}`}</p>
          ))}
        </div>
      )}
    </div>
  );
}
