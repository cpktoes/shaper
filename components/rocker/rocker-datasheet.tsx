"use client";

/**
 * The D-07 full datasheet view: five stations across, width/thickness/rocker down — the ROCKER
 * screen's own blank datasheet, ready to hold beside a real foam blank when ordering.
 *
 * Width is read-only, derived from the drawn outline through `sampleOutline` — it belongs to the
 * Template screen and is never typed here (D-07). Thickness stays a typed field, so a shaper can
 * copy a real blank's spec sheet straight in — now `MeasureField` (`components/design/
 * measure-field.tsx`) in bare mode (D-12), the app's one typed measurement control, with the prior
 * datasheet-only typed control retired. The rocker row (quick task 260829-rda): the Nose Tip /
 * Tail Tip cells stay typed, writing `noseLift`/
 * `tailLift`; the Nose @ station / Tail @ station cells and the Center cell are now ALL read-only
 * derived text — width, the two station rockers and the centre are every one of them
 * derived-and-never-typed, read straight off the `RockerGeometry` prop rather than a stored
 * per-station value.
 *
 * Metric (D-01, D-03, D-10, D-12): the two station column headers name their station through
 * `stationLabel(system)` — the honest `30.5 cm` conversion, never a hand-typed `30 cm` — and the
 * row labels gain their family's unit suffix (`Width (cm)`, `Thickness (mm)`, `Rocker (mm)`)
 * through `columnUnitSuffix`, so the bare cells beneath them never need their own unit mark.
 * Imperial stays byte-identical: headers, labels and cells all read exactly as they did before
 * this plan.
 */

import { MeasureField } from "@/components/design/measure-field";
import { useUnits } from "@/components/units-provider";
import { FOIL_THICKNESS_RANGE_IN, type FoilSpec, type FoilStationKey } from "@/lib/geometry/foil";
import { columnUnitSuffix, formatDimBare, formatMarkBare, measureSlider, stationLabel } from "@/lib/geometry/measure-display";
import { sampleOutline, type OutlineGeometry } from "@/lib/geometry/outline";
import {
  ROCKER_LIFT_RANGE_IN,
  rockerStationPositions,
  type RockerGeometry,
  type RockerSpec,
} from "@/lib/geometry/rocker";
import { mm, type Mm, type UnitsSystem } from "@/lib/geometry/units";

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

export function RockerDatasheet({
  rocker,
  foil,
  geometry,
  outlineGeometry,
  length,
  onChangeRocker,
  onChangeFoil,
}: RockerDatasheetProps) {
  const { system } = useUnits();
  // The one definition of where the five stations sit — reused here rather than re-deriving
  // station positions for the width row's outline sampling.
  const stationPositions = rockerStationPositions(length);
  const stationMmByKey = Object.fromEntries(
    stationPositions.map((p) => [p.key, p.station]),
  ) as Record<FoilStationKey, Mm>;
  const stations = datasheetStations(system);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3">
      <div className="text-sm text-surf-ink-muted font-normal">
        Your board&apos;s own blank datasheet — hold it beside a real foam blank when you order.
      </div>
      {/* D-04: the box scrolls sideways on a narrow phone instead of re-stacking a single column
          per row, keeping every column. The trailing fade (24px, toward --surf-panel — the card
          this datasheet always sits inside, per TabbedPanel) is the "there's more, keep going"
          hint, chosen over a caption so nothing needs re-authoring per unit system (UI-SPEC,
          "Sideways-scrolling data tables"). Constant, not scroll-position-driven: on a fixed,
          five-station table the box either scrolls or it doesn't per viewport, so a static hint
          is enough and needs no extra scroll-tracking state. */}
      <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
        <div className="min-w-[540px]">
          <div className="mb-2 flex gap-2 border-b-2 border-surf-line-faint pb-2">
            <div className="min-w-0 flex-[1.1]" />
            {stations.map((s) => (
              <div
                key={s.key}
                className="min-w-0 flex-1 text-right text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold"
              >
                {s.name}
              </div>
            ))}
          </div>

          {/* Width — read-only, derived from the drawn outline (D-07). Never typed here; it
              belongs to the Template screen. Metric row label gains " (cm)"; cells read a bare
              one-decimal centimetre figure (D-10). */}
          <div className="flex items-center gap-2 border-b border-surf-line-faint py-1.5">
            <div className="min-w-0 flex-[1.1] text-sm text-surf-ink-muted font-normal">
              Width{columnUnitSuffix("dim", system)}
            </div>
            {stations.map((s) => {
              const halfWidth = sampleOutline(outlineGeometry, stationMmByKey[s.key]);
              return (
                <div key={s.key} className="min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal">
                  {formatDimBare(mm(halfWidth * 2), system)}
                </div>
              );
            })}
          </div>

          {/* Thickness — typed, D-06/D-12. Metric row label gains " (mm)"; the typed cell reads
              bare because the row label already carries the unit. */}
          <div className="flex items-center gap-2 border-b border-surf-line-faint py-1.5">
            <div className="min-w-0 flex-[1.1] text-sm text-surf-ink font-normal">
              Thickness{columnUnitSuffix("mark", system)}
            </div>
            {stations.map((s) => {
              const bounds = measureSlider(foil[s.key], FOIL_THICKNESS_RANGE_IN, FOIL_THICKNESS_RANGE_IN.step, 1, system);
              return (
                <div key={s.key} className="flex min-w-0 flex-1 justify-end">
                  <MeasureField
                    value={foil[s.key]}
                    onCommit={(next) => onChangeFoil({ [s.key]: next })}
                    label={`Thickness — ${s.name}`}
                    family="mark"
                    min={bounds.min}
                    max={bounds.max}
                    system={system}
                    bare
                  />
                </div>
              );
            })}
          </div>

          {/* Rocker — the Nose Tip / Tail Tip cells stay typed (D-06/D-12); the Nose/Tail station
              cells and the Center cell are all read-only derived text (quick task 260829-rda):
              the two station figures are measured off the built curve, and the center is the
              curve's own fixed zero. Metric row label gains " (mm)"; every cell reads bare. */}
          <div className="flex items-center gap-2 py-1.5">
            <div className="min-w-0 flex-[1.1] text-sm text-surf-ink font-normal">
              Rocker{columnUnitSuffix("mark", system)}
            </div>
            {stations.map((s) => {
              if (s.key === "center") {
                return (
                  <div key={s.key} className="min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal">
                    {formatMarkBare(mm(0), system)}
                  </div>
                );
              }
              if (s.key === "nose12" || s.key === "tail12") {
                const derived = s.key === "nose12" ? geometry.noseLiftAt12in : geometry.tailLiftAt12in;
                return (
                  <div key={s.key} className="min-w-0 flex-1 text-right text-sm text-surf-ink-muted font-normal">
                    {formatMarkBare(derived, system)}
                  </div>
                );
              }
              const field = s.key === "noseTip" ? "noseLift" : "tailLift";
              const bounds = measureSlider(rocker[field], ROCKER_LIFT_RANGE_IN, ROCKER_LIFT_RANGE_IN.step, 1, system);
              return (
                <div key={s.key} className="flex min-w-0 flex-1 justify-end">
                  <MeasureField
                    value={rocker[field]}
                    onCommit={(next) => onChangeRocker({ [field]: next })}
                    label={`Rocker — ${s.name}`}
                    family="mark"
                    min={bounds.min}
                    max={bounds.max}
                    system={system}
                    bare
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
