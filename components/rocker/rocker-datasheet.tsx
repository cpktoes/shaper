"use client";

/**
 * The D-07 full datasheet view: five stations across, width/thickness/rocker down — the ROCKER
 * screen's own blank datasheet, ready to hold beside a real foam blank when ordering.
 *
 * Width is read-only, derived from the drawn outline through `sampleOutline` — it belongs to the
 * Template screen and is never typed here (D-07). Thickness and rocker are typed `ImperialField`s
 * (D-06), so a shaper can copy a real blank's spec sheet straight in. The rocker row's center
 * cell is the fixed zero every other rocker station is measured from (D-05) and stays read-only.
 */

import { ImperialField } from "./imperial-field";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec, type FoilStationKey } from "@/lib/geometry/foil";
import { sampleOutline, type OutlineGeometry } from "@/lib/geometry/outline";
import { ROCKER_LIFT_RANGE_IN, rockerStationPoints, type RockerSpec } from "@/lib/geometry/rocker";
import { formatInchesFraction, mm, type Mm } from "@/lib/geometry/units";

interface RockerDatasheetProps {
  rocker: RockerSpec;
  foil: FoilSpec;
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
  outlineGeometry,
  length,
  onChangeRocker,
  onChangeFoil,
}: RockerDatasheetProps) {
  // The one definition of where the five stations sit (D-05) — reused here rather than
  // re-deriving station positions for the width row's outline sampling.
  const stationPositions = rockerStationPoints(rocker, length);
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

          {/* Rocker — typed, D-06; the center cell is the fixed zero (D-05) and stays read-only. */}
          <div className="flex items-center gap-2 py-1.5">
            <div className="min-w-0 flex-[1.1] text-sm text-surf-ink font-normal">Rocker</div>
            {DATASHEET_STATIONS.map((s) =>
              s.key === "center" ? (
                <div key={s.key} className="min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal">
                  {formatInchesFraction(mm(0))}
                </div>
              ) : (
                <div key={s.key} className="flex min-w-0 flex-1 justify-end">
                  <ImperialField
                    value={rocker[s.key as Exclude<FoilStationKey, "center">]}
                    onCommit={(next) => onChangeRocker({ [s.key]: next })}
                    label={`Rocker — ${s.name}`}
                    min={ROCKER_LIFT_RANGE_IN.min}
                    max={ROCKER_LIFT_RANGE_IN.max}
                  />
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
