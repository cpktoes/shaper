"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SliderRow } from "@/components/design/slider-row";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { useUnits } from "@/components/units-provider";
import type { OutlineSpec } from "@/lib/geometry/board";
import type { FinMark } from "@/lib/geometry/fins";
import { formatDim, formatMark, formatSignedMark, measureSlider } from "@/lib/geometry/measure-display";
import type { OutlineGeometry } from "@/lib/geometry/outline";
import { lockedWingStation, wingFinBoxWarning } from "@/lib/geometry/wing-lock";
import { inchesToMm, mm, mmToInches } from "@/lib/geometry/units";
import {
  MAX_WINGS,
  WING_DEPTH_RANGE_IN,
  WING_FIN_BOX_TRIM_IN,
  WING_FIN_OFFSET_RANGE_IN,
  WING_POSITION_MIN_IN,
  WING_RUN_RANGE_IN,
  WING_STEP_IN,
  WING_STEP_MM,
  canAddSecondWing,
  effectiveWingRadius,
  removeWing,
  wingLockEdge,
  wingOrderGap,
  wingOrderState,
  wingPositionRangeForSlot,
  wingPositionTop,
  wingRadiusTop,
  type Wing,
  type WingFinEdges,
} from "@/lib/geometry/wings";
import { SectionHeading, TemplateSettings } from "./outline-controls";

/**
 * The WINGS tab's sidebar (quick 261014-wii, 2026-10-14, D2, D3, D8, D9, P8; sketch 014 B, "A,
 * sidebar swaps"). While the WINGS tab is open the sidebar holds ONLY these controls, in the
 * Template Builder's own dress — the same title block, ruled section headings, slider rows and
 * Settings block as `outline-controls.tsx` — and no board length or other template control.
 *
 * Per wing: its position from the tail (a DIM — centimetres to one decimal in Metric, the Thinning
 * Start precedent), its slot's lock with an offset from the fin, its depth and its run along the
 * stringer, and the corner radius, whose top moves with the run and depth (P8). Every
 * number moves in 1/16" (1 mm in Metric) through `measureSlider`, and every one reads through
 * `measure-display.ts` (CLAUDE.md Rule 2). Each slider reads the wing as the screen shows it — a
 * locked wing at its resolved station — and writes the whole wings list back, so the stored station
 * is always the last one shown (P2), which is what unlocking keeps.
 *
 * The founder's rulings of 2026-10-15 (quick 261015-hz7): each wing locks in its own slot only, at
 * the trailing edge — wing 1 "Lock to front fin", wing 2 "Lock to rear fin" on a quad and no lock at
 * all on any other setup — and the Fin edge picker is gone (D1). Wing 2 sits behind wing 1 by the
 * gap, so each position slider reads its slot's own range (D2), and no wing passes the centre or the
 * widepoint, whichever is nearer the tail (D3).
 *
 * `SliderRow` only, never a raw slider (`slider-row.test.ts`). A locked board greys every control.
 */
export interface WingControlsProps {
  /** The resolved outline — a locked wing at its fin edge plus offset. */
  outline: OutlineSpec;
  onChange: (patch: Partial<OutlineSpec>) => void;
  /** Adds the next wing (the dial-in pop-up opens with the first). The empty tab has no card of its own since quick 261015-hz7 (D6). */
  onAddWing: () => void;
  /** The board's outline, wings and all — for the position top (the centre or the widepoint). */
  geometry: OutlineGeometry;
  /** The fins' trailing edges as FINS places them: the front fins' and a quad's rear fins'. */
  finEdges: WingFinEdges;
  /** FINS' own marks, for the fin-box warning (D4). */
  finMarks: readonly FinMark[];
  showConstruction: boolean;
  onToggleConstruction: () => void;
  showFins: boolean;
  onToggleShowFins: () => void;
}

export function WingControls({
  outline,
  onChange,
  onAddWing,
  geometry,
  finEdges,
  finMarks,
  showConstruction,
  onToggleConstruction,
  showFins,
  onToggleShowFins,
}: WingControlsProps) {
  const { system } = useUnits();
  const boardLocked = useControlsLocked();
  const wings = outline.wings ?? [];
  // D3: the top is the centre or the widepoint, whichever is nearer the tail; the hint names which.
  const top = wingPositionTop(geometry);
  const topHint = `${top < geometry.length / 2 ? "Widepoint" : "Center"} ${formatDim(top, system)}`;
  // D2: where wing 2 may sit at most, and the gap behind wing 1 — explanations, so muted ink, never
  // the warning ink (that is for warnings only).
  const order = wingOrderState(wings, geometry);
  const gapText = wings[0] ? formatMark(wingOrderGap(wings[0]), system) : "";
  const floorText = formatDim(inchesToMm(WING_POSITION_MIN_IN), system);
  const canAddSecond = canAddSecondWing(wings, geometry);

  const setWing = (index: number, patch: Partial<Wing>) => {
    onChange({ wings: wings.map((w, i) => (i === index ? { ...w, ...patch } : w)) });
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Wings</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Up to two, locked to the fins or placed by hand
        </div>
      </div>

      {wings.map((wing, index) => {
        const n = index + 1;
        // D1: a lock its slot holds, with its fins present — wing 1 the front fins, wing 2 a quad's rear.
        const lockedToFin = wingLockEdge(wing, index, finEdges) !== null;
        const position = measureSlider(
          wing.station,
          wingPositionRangeForSlot(wings, index, geometry),
          WING_STEP_IN,
          WING_STEP_MM,
          system,
        );
        const offset = measureSlider(wing.finOffset, WING_FIN_OFFSET_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
        const depth = measureSlider(wing.depth, WING_DEPTH_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
        const run = measureSlider(wing.run, WING_RUN_RANGE_IN, WING_STEP_IN, WING_STEP_MM, system);
        const radiusTop = wingRadiusTop(wing, system);
        const radius = measureSlider(
          mm(Math.min(wing.radius, radiusTop)),
          { min: 0, max: mmToInches(radiusTop) },
          WING_STEP_IN,
          WING_STEP_MM,
          system,
        );
        // P8: a stored radius never sits above its slider's top — a depth or run change pulls it in.
        const withShape = (patch: Pick<Wing, "depth"> | Pick<Wing, "run">) => {
          const next = { ...wing, ...patch };
          setWing(index, { ...patch, radius: mm(Math.min(wing.radius, wingRadiusTop(next, system))) });
        };
        // D2: wing 2 with no room behind wing 1 sits on the 2" floor, its row disabled.
        const noRoom = index === 1 && order.noRoom;
        // D2: a rear-locked wing 2 whose own target breaks the order rule is held at the limit.
        const held =
          index === 1 &&
          lockedToFin &&
          !order.noRoom &&
          order.limit !== null &&
          lockedWingStation(wing, index, finEdges, geometry) > order.limit + 1e-9;
        // D4: the founder's scaling rule, for a deep wing too close behind a side fin's trailing edge.
        const finBox = wingFinBoxWarning(wing, finMarks);
        return (
          <div key={index} className="flex flex-col gap-4" data-wing-controls={n}>
            <SectionHeading
              action={
                <button
                  type="button"
                  disabled={boardLocked}
                  onClick={() => onChange({ wings: removeWing(wings, index) })}
                  className="cursor-pointer text-xs font-sans font-normal normal-case tracking-normal text-surf-ink-muted underline underline-offset-2 hover:text-surf-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>
              }
            >
              Wing {n}
            </SectionHeading>

            <SliderRow
              label="Position from tail"
              displayValue={formatDim(wing.station, system)}
              value={position.value}
              min={position.min}
              max={position.max}
              step={position.step}
              disabled={lockedToFin || noRoom}
              onValueChange={(v) => setWing(index, { station: position.toMm(v) })}
              leftHint={floorText}
              rightHint={topHint}
              sliderLabel={`Wing ${n} position from tail`}
              sliderValueText={formatDim(wing.station, system)}
            />
            {noRoom && (
              <p data-wing-no-room-note className="-mt-2 text-xs leading-[1.4] text-surf-ink-muted font-normal">
                {`No room behind wing 1: wing 2 needs ${gapText} behind it, so it stays at ${floorText}.`}
              </p>
            )}

            {/* D1: wing 1 locks to the front fins (disabled with its note on a single); wing 2 locks to a
                quad's rear fins and shows no lock row on any other fin setup. Both follow the
                trailing edge — "Fin edge should always be to trailing edge for the lock, so we can get
                rid of that selector" (the founder, 2026-10-15). */}
            {(index === 0 || finEdges.rear !== null) && (
              <div>
                <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
                  <Checkbox
                    checked={lockedToFin}
                    disabled={boardLocked || (index === 0 ? finEdges.front === null : finEdges.rear === null)}
                    // Ticking follows the slot's trailing edge; unticking keeps the station the screen shows (P2).
                    onCheckedChange={(checked) =>
                      setWing(
                        index,
                        checked
                          ? { lock: index === 0 ? "front-trailing" : "rear-trailing" }
                          : { lock: null, station: wing.station },
                      )
                    }
                  />
                  {index === 0 ? "Lock to front fin" : "Lock to rear fin"}
                  {index === 0 && finEdges.front === null && (
                    <span className="text-xs">(this fin setup has no front fin)</span>
                  )}
                </label>
              </div>
            )}

            {lockedToFin && (
              <SliderRow
                label="Offset from the fin"
                displayValue={formatSignedMark(wing.finOffset, system)}
                value={offset.value}
                min={offset.min}
                max={offset.max}
                step={offset.step}
                onValueChange={(v) => setWing(index, { finOffset: offset.toMm(v) })}
                leftHint="Toward tail"
                rightHint="Toward nose"
                sliderLabel={`Wing ${n} offset from the fin`}
              />
            )}
            {held && order.limit !== null && (
              <p data-wing-held-note className="-mt-2 text-xs leading-[1.4] text-surf-ink-muted font-normal">
                {`Held at ${formatDim(order.limit, system)} — wing 2 stays at least ${gapText} behind wing 1.`}
              </p>
            )}

            <div className="flex gap-4">
              <SliderRow
                className="flex-1"
                label="Depth"
                displayValue={formatMark(wing.depth, system)}
                value={depth.value}
                min={depth.min}
                max={depth.max}
                step={depth.step}
                onValueChange={(v) => withShape({ depth: depth.toMm(v) })}
                leftHint="Shallow"
                rightHint="Deep"
                sliderLabel={`Wing ${n} depth`}
              />
              <SliderRow
                className="flex-1"
                label="Run along the stringer"
                displayValue={formatMark(wing.run, system)}
                value={run.value}
                min={run.min}
                max={run.max}
                step={run.step}
                onValueChange={(v) => withShape({ run: run.toMm(v) })}
                leftHint="Square"
                rightHint={formatMark(inchesToMm(WING_RUN_RANGE_IN.max), system)}
                sliderLabel={`Wing ${n} run along the stringer`}
              />
            </div>
            {/* D4: the founder's scaling rule, full width under the Depth and Run row, in the warning
                ink (the palette keeps it for warnings only); the distances are MARKS (CLAUDE.md Rule 2). */}
            {finBox !== null && (
              <p data-wing-fin-box-warning={n} className="-mt-2 text-xs leading-[1.4] text-surf-warning-ink">
                {`Modern fin boxes: for a wing this deep, set its apex at least ${formatMark(finBox, system)} behind the fin's trailing-edge mark (twice the depth less ${formatMark(inchesToMm(WING_FIN_BOX_TRIM_IN), system)}). Check your fin box's spec too.`}
              </p>
            )}

            <SliderRow
              label="Corner radius"
              displayValue={formatMark(effectiveWingRadius(wing), system)}
              value={radius.value}
              min={radius.min}
              max={radius.max}
              step={radius.step}
              onValueChange={(v) => setWing(index, { radius: radius.toMm(v) })}
              leftHint="Sharp"
              rightHint={`Round · ${formatMark(radiusTop, system)} fits`}
              sliderLabel={`Wing ${n} corner radius`}
            />
          </div>
        );
      })}

      {wings.length < MAX_WINGS && (
        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            className="w-full"
            // D2: wing 2 needs room the gap behind wing 1 and 2" from the tail.
            disabled={boardLocked || (wings.length === 1 && !canAddSecond)}
            onClick={onAddWing}
          >
            {wings.length === 0 ? "+ Add a wing" : "+ Add wing 2"}
          </Button>
          {wings.length === 1 && !canAddSecond && (
            <p data-wing-add-note className="text-xs leading-[1.4] text-surf-ink-muted font-normal">
              {`No room for wing 2 — it sits at least ${gapText} behind wing 1 and ${floorText} from the tail.`}
            </p>
          )}
        </div>
      )}

      <TemplateSettings
        // P16: on the WINGS tab the construction setting also shows each wing's grab points.
        constructionNote="(the wing's grab points too)"
        showConstruction={showConstruction}
        onToggleConstruction={onToggleConstruction}
        showFins={showFins}
        onToggleShowFins={onToggleShowFins}
      />

      <p className="text-xs text-surf-ink-muted font-normal" data-wing-fin-note>
        {finEdges.front !== null
          ? `Front fins ${formatMark(finEdges.front, system)} off the tail at the trailing edge${
              finEdges.rear !== null ? `, rear fins ${formatMark(finEdges.rear, system)}` : ""
            }, from the FINS page. Edit fin placement on FINS, then come back here.`
          : "This fin setup has no front fins."}
      </p>
    </div>
  );
}
