"use client";

/**
 * The D-07 full datasheet view: five stations across, width/thickness/rocker down — the ROCKER
 * screen's own blank datasheet, ready to hold beside a real foam blank when ordering.
 *
 * Width is read-only, derived from the drawn outline through `sampleOutline` — it belongs to the
 * Template screen and is never typed here (D-07). Thickness stays a typed `ImperialField` (D-06),
 * so a shaper can copy a real blank's spec sheet straight in. The rocker row (quick task
 * 260829-rda): the Nose Tip / Tail Tip cells stay typed `ImperialField`s writing `noseLift`/
 * `tailLift`; the Nose @ 12" / Tail @ 12" cells and the Center cell are now ALL read-only derived
 * text — width, the two 12" rockers and the centre are every one of them derived-and-never-typed,
 * read straight off the `RockerGeometry` prop rather than a stored per-station value.
 */

import { ImperialField } from "./imperial-field";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec, type FoilStationKey } from "@/lib/geometry/foil";
import { sampleOutline, type OutlineGeometry } from "@/lib/geometry/outline";
import {
  ROCKER_LIFT_RANGE_IN,
  rockerStationPositions,
  type RockerGeometry,
  type RockerSpec,
} from "@/lib/geometry/rocker";
import { formatInchesFraction, mm, type Mm } from "@/lib/geometry/units";

interface RockerDatasheetProps {
  rocker: RockerSpec;
  foil: FoilSpec;
  geometry: RockerGeometry;
  outlineGeometry: OutlineGeometry;
  length: Mm;
  onChangeRocker: (patch: Partial<RockerSpec>) => void;
  onChangeFoil: (patch: Partial<FoilSpec>) => void;
}

/** Nose-to-tail reading order, matching Task 1's thickness sliders and the UI spec's fixed
 * column headings. */
const DATASHEET_STATIONS: { key: FoilStationKey; name: string }[] = [
  { key: "noseTip", name: "Nose Tip" },
  { key: "nose12", name: 'Nose @ 12"' },
  { key: "center", name: "Center" },
  { key: "tail12", name: 'Tail @ 12"' },
  { key: "tailTip", name: "Tail Tip" },
];

export function RockerDatasheet({
  rocker,
  foil,
  geometry,
  outlineGeometry,
  length,
  onChangeRocker,
  onChangeFoil,
}: RockerDatasheetProps) {
  // The one definition of where the five stations sit — reused here rather than re-deriving
  // station positions for the width row's outline sampling.
  const stationPositions = rockerStationPositions(length);
  const stationMmByKey = Object.fromEntries(
    stationPositions.map((p) => [p.key, p.station]),
  ) as Record<FoilStationKey, Mm>;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      <div className="text-sm text-surf-ink-muted font-normal">
        Your board&apos;s own blank datasheet — hold it beside a real foam blank when you order.
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[540px]">
          <div className="mb-2 flex gap-2 border-b-2 border-surf-line-faint pb-2">
            <div className="min-w-0 flex-[1.1]" />
            {DATASHEET_STATIONS.map((s) => (
              <div
                key={s.key}
                className="min-w-0 flex-1 text-right text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold"
              >
                {s.name}
              </div>
            ))}
          </div>

          {/* Width — read-only, derived from the drawn outline (D-07). Never typed here; it
              belongs to the Template screen. */}
          <div className="flex items-center gap-2 border-b border-surf-line-faint py-1.5">
            <div className="min-w-0 flex-[1.1] text-sm text-surf-ink-muted font-normal">Width</div>
            {DATASHEET_STATIONS.map((s) => {
              const halfWidth = sampleOutline(outlineGeometry, stationMmByKey[s.key]);
              return (
                <div key={s.key} className="min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal">
                  {formatInchesFraction(mm(halfWidth * 2))}
                </div>
              );
            })}
          </div>

          {/* Thickness — typed, D-06. */}
          <div className="flex items-center gap-2 border-b border-surf-line-faint py-1.5">
            <div className="min-w-0 flex-[1.1] text-sm text-surf-ink font-normal">Thickness</div>
            {DATASHEET_STATIONS.map((s) => (
              <div key={s.key} className="flex min-w-0 flex-1 justify-end">
                <ImperialField
                  value={foil[s.key]}
                  onCommit={(next) => onChangeFoil({ [s.key]: next })}
                  label={`Thickness — ${s.name}`}
                  min={FOIL_THICKNESS_RANGE_IN.min}
                  max={FOIL_THICKNESS_RANGE_IN.max}
                />
              </div>
            ))}
          </div>

          {/* Rocker — the Nose Tip / Tail Tip cells stay typed (D-06); the Nose @ 12" / Tail @
              12" cells and the Center cell are all read-only derived text (quick task
              260829-rda): the two 12" figures are measured off the built curve, and the center
              is the curve's own fixed zero. */}
          <div className="flex items-center gap-2 py-1.5">
            <div className="min-w-0 flex-[1.1] text-sm text-surf-ink font-normal">Rocker</div>
            {DATASHEET_STATIONS.map((s) => {
              if (s.key === "center") {
                return (
                  <div key={s.key} className="min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal">
                    {formatInchesFraction(mm(0))}
                  </div>
                );
              }
              if (s.key === "nose12" || s.key === "tail12") {
                const derived = s.key === "nose12" ? geometry.noseLiftAt12in : geometry.tailLiftAt12in;
                return (
                  <div key={s.key} className="min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal">
                    {formatInchesFraction(derived)}
                  </div>
                );
              }
              const field = s.key === "noseTip" ? "noseLift" : "tailLift";
              return (
                <div key={s.key} className="flex min-w-0 flex-1 justify-end">
                  <ImperialField
                    value={rocker[field]}
                    onCommit={(next) => onChangeRocker({ [field]: next })}
                    label={`Rocker — ${s.name}`}
                    min={ROCKER_LIFT_RANGE_IN.min}
                    max={ROCKER_LIFT_RANGE_IN.max}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
