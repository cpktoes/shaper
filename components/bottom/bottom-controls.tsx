"use client";

import { useDesign } from "@/components/design/design-store";
import { ImportedReadoutCard } from "@/components/design/imported-readout-card";
import { SliderRow } from "@/components/design/slider-row";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnits } from "@/components/units-provider";
import { bottomStationSlider, formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_SECTIONS,
  stationFromNearestTip,
  storeCutStation,
  type BottomBoard,
  type BottomCutName,
  type BottomCutSpec,
  type BottomSectionKey,
  type ResolvedCut,
} from "@/lib/geometry/bottom";
import type { BottomCutKey } from "@/lib/geometry/bottom-draw";
import { bottomImportedReadout } from "@/lib/geometry/imported-readout";
import { formatMark, measureSlider } from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";
import { cn } from "@/lib/utils";
import { BOTTOM_COPY, BOTTOM_SECTION_NAME } from "./bottom-copy";

/** RAILS' ruled heading (`components/rails/rail-controls.tsx`'s `RULED_HEADING`), the dress BOTTOM's panel wears
 * (D-08): the INPUTS heading and each section's heading share it. */
const RULED_HEADING =
  "mt-1.5 flex w-full items-center justify-between gap-2 border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold";

/** The cut's name echoed at a section heading's right end (the sketch's `.cutname`), truncating in a narrow panel. */
const HEADING_ECHO = "min-w-0 truncate text-xs font-normal normal-case tracking-normal text-surf-ink-muted";

/** The sidebar's Select trigger (FINS' own classes) plus the 44-dot touch height — `coarse:h-11` alone would lose to
 * the trigger's own attribute-qualified `h-8` (UI-SPEC § Already done). */
const CUT_TRIGGER =
  "w-full border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text coarse:data-[size=default]:h-11";

/** The mark sliders' inch ranges (UI-SPEC §1): 1/16" steps, 1 mm in Metric, through `measureSlider`. */
const OFF_RAIL_RANGE_IN = { min: 0, max: 6 };
const DEPTH_RANGE_IN = { min: 0, max: 0.5 };
const MARK_STEP_IN = 1 / 16;
/** Smoothness runs 0 to 100 in steps of 5. */
const SMOOTHNESS = { min: 0, max: 100, step: 5 } as const;

const STATION_FIELDS = ["start", "deepest", "end"] as const;
type StationField = (typeof STATION_FIELDS)[number];
const STATION_LABEL: Record<StationField, string> = { start: BOTTOM_COPY.start, deepest: BOTTOM_COPY.deepestAt, end: BOTTOM_COPY.end };

interface BottomControlsProps {
  /** The live cut — the last section touched (UI-SPEC §1). */
  live: BottomCutKey;
  /** A press anywhere in a section's card makes it live. */
  onLive: (key: BottomCutKey) => void;
  /** A name picked from a section's Cut menu (the editor writes the store and moves the section to the cut). */
  onPick: (section: BottomSectionKey, name: BottomCutName) => void;
}

/**
 * BOTTOM's side panel in RAILS' dress (Phase 17, D-04, D-08, UI-SPEC §1): the title block, INPUTS with the board's
 * size as the cut works from it, then NOSE, CENTER and TAIL, each a `Cut` menu of its six names echoing the cut's name
 * in its heading. A flat section says so in one line; a single concave shows its six rows. The other cuts' rows, the
 * Teardrop's tick box and the channels block are 17-09's; the WINGS row and the finished-rail tick box join with them.
 *
 * Every number is the store's: a slider writes the stored cut through `updateBottomCut` (one undo step per drag, Start
 * ≥ Deepest ≥ End kept in the same step), every figure is written through `measure-display.ts` or
 * `formatBottomStation` (CLAUDE.md Rule 2), and no number is worked out here (Rule 1). On a locked board every control
 * is greyed and still (the Selects `disabled={locked}`, each `SliderRow` reads the lock itself); the readout card is
 * information and keeps its strength.
 */
export function BottomControls({ live, onLive, onPick }: BottomControlsProps) {
  const { system } = useUnits();
  const { bottom, bottomBoard, resolvedBottom, updateBottomCut, outline, effectiveRails } = useDesign();

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">
          {BOTTOM_COPY.title}
        </div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">{BOTTOM_COPY.subtitle}</div>
      </div>

      <div>
        <div className={RULED_HEADING}>{BOTTOM_COPY.inputsHeading}</div>
        {/* D-25: the board's headline dims, as VOLUME's card reads them — the planed centre thickness a dim. */}
        <ImportedReadoutCard
          className="mt-2"
          readout={bottomImportedReadout(outline.length, outline.widePointWidth, effectiveRails.center.boardThickness, system)}
        />
      </div>

      {BOTTOM_SECTIONS.map((section) => (
        <BottomSectionCard
          key={section}
          section={section}
          spec={bottom[section]}
          resolved={resolvedBottom[section]}
          board={bottomBoard}
          system={system}
          live={live === section}
          onLive={() => onLive(section)}
          onPick={(name) => onPick(section, name)}
          onChange={(patch, changed) => updateBottomCut(section, patch, changed)}
        />
      ))}
    </div>
  );
}

interface BottomSectionCardProps {
  section: BottomSectionKey;
  spec: BottomCutSpec;
  resolved: ResolvedCut;
  board: BottomBoard;
  system: UnitsSystem;
  live: boolean;
  onLive: () => void;
  onPick: (name: BottomCutName) => void;
  onChange: (patch: Partial<BottomCutSpec>, changed?: StationField) => void;
}

/** One section's card: RAILS' group (`flex flex-col gap-3.5`), its heading echoing the cut, the `Cut` menu, then the
 * flat note or the cut's rows. A press anywhere in it makes it the live cut. */
function BottomSectionCard({ section, spec, resolved, board, system, live, onLive, onPick, onChange }: BottomSectionCardProps) {
  const locked = useControlsLocked();
  const items = BOTTOM_CUT_NAMES[section].map((name) => ({ value: name, label: name }));
  const name = BOTTOM_SECTION_NAME[section];

  return (
    <div
      data-bottom-card={section}
      data-live={live ? "" : undefined}
      className="flex flex-col gap-3.5"
      // A press, or the keyboard arriving, anywhere in the card makes this cut the live one (UI-SPEC §1).
      onPointerDownCapture={onLive}
      onFocusCapture={onLive}
    >
      <div className={RULED_HEADING}>
        <span className="shrink-0">{name}</span>
        <span data-bottom-cut-echo className={HEADING_ECHO}>
          {spec.name}
        </span>
      </div>

      <div className={cn(locked && "opacity-40")}>
        <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">{BOTTOM_COPY.cutLabel}</div>
        <Select items={items} value={spec.name} onValueChange={(value) => onPick(value as BottomCutName)} disabled={locked}>
          <SelectTrigger aria-label={BOTTOM_COPY.cutSelectName(section)} className={CUT_TRIGGER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {resolved.kind === "flat" && <p className="text-sm text-surf-ink-muted font-normal">{BOTTOM_COPY.flatNote}</p>}

      {resolved.kind === "single" && (
        <SingleConcaveRows section={section} spec={spec} resolved={resolved} board={board} system={system} onChange={onChange} />
      )}
    </div>
  );
}

/** A mark slider's right-hand hint: the slider's own maximum, written as a mark — never a separately formatted bound,
 * so Metric's Depth reads `12 mm` under a slider that stops at 12 (UI-SPEC § Already done). */
function maxHint(view: { max: number; toMm: (v: number) => Mm }, system: UnitsSystem): string {
  return formatMark(view.toMm(view.max), system);
}

/** A single concave's six rows, in D-04's order: Off Rail, Start, Deepest At, End, Depth, Smoothness. */
function SingleConcaveRows({
  section,
  spec,
  resolved,
  board,
  system,
  onChange,
}: {
  section: BottomSectionKey;
  spec: BottomCutSpec;
  resolved: ResolvedCut;
  board: BottomBoard;
  system: UnitsSystem;
  onChange: (patch: Partial<BottomCutSpec>, changed?: StationField) => void;
}) {
  const offRail = measureSlider(spec.offRail, OFF_RAIL_RANGE_IN, MARK_STEP_IN, 1, system);
  const depth = measureSlider(spec.depth, DEPTH_RANGE_IN, MARK_STEP_IN, 1, system);
  const offRailText = formatMark(spec.offRail, system);
  const depthText = formatMark(spec.depth, system);

  return (
    <>
      <SliderRow
        label={BOTTOM_COPY.offRail}
        displayValue={offRailText}
        value={offRail.value}
        min={offRail.min}
        max={offRail.max}
        step={offRail.step}
        leftHint={BOTTOM_COPY.offRailLeft}
        rightHint={maxHint(offRail, system)}
        sliderLabel={BOTTOM_COPY.sliderName(section, BOTTOM_COPY.offRail)}
        sliderValueText={offRailText}
        onValueChange={(v) => onChange({ offRail: offRail.toMm(v) })}
      />
      {STATION_FIELDS.map((field) => (
        <StationRow key={field} section={section} field={field} resolved={resolved} board={board} system={system} onChange={onChange} />
      ))}
      <SliderRow
        label={BOTTOM_COPY.depth}
        displayValue={depthText}
        value={depth.value}
        min={depth.min}
        max={depth.max}
        step={depth.step}
        leftHint={BOTTOM_COPY.depthLeft}
        rightHint={maxHint(depth, system)}
        sliderLabel={BOTTOM_COPY.sliderName(section, BOTTOM_COPY.depth)}
        sliderValueText={depthText}
        onValueChange={(v) => onChange({ depth: depth.toMm(v) })}
      />
      <SliderRow
        label={BOTTOM_COPY.smoothness}
        displayValue={`${spec.smoothness}%`}
        value={spec.smoothness}
        min={SMOOTHNESS.min}
        max={SMOOTHNESS.max}
        step={SMOOTHNESS.step}
        leftHint={BOTTOM_COPY.smoothnessLeft}
        rightHint={BOTTOM_COPY.smoothnessRight}
        sliderLabel={BOTTOM_COPY.sliderName(section, BOTTOM_COPY.smoothness)}
        sliderValueText={`${spec.smoothness}%`}
        onValueChange={(v) => onChange({ smoothness: v })}
      />
    </>
  );
}

/**
 * Start, Deepest At or End (D-07): the track runs nose (left) to tail (right) like the drawing, on the Thinning Start
 * grid (`bottomStationSlider`); the label reads the distance from the cut's nearest tip. A Center or Tail cut's track
 * fills from the thumb to the tail (`.slider-fill-end`); a Nose cut's from the nose to the thumb. A drag stores the
 * station in the cut's own form (`storeCutStation`) and the store keeps the three in order.
 */
function StationRow({
  section,
  field,
  resolved,
  board,
  system,
  onChange,
}: {
  section: BottomSectionKey;
  field: StationField;
  resolved: ResolvedCut;
  board: BottomBoard;
  system: UnitsSystem;
  onChange: (patch: Partial<BottomCutSpec>, changed?: StationField) => void;
}) {
  const slider = bottomStationSlider(resolved[field], board.length, system);
  const words = BOTTOM_COPY.fromTip(section, formatBottomStation(stationFromNearestTip(section, resolved[field], board), system));
  return (
    <SliderRow
      className={section === "nose" ? undefined : "slider-fill-end"}
      label={STATION_LABEL[field]}
      displayValue={words}
      value={slider.value}
      min={slider.min}
      max={slider.max}
      step={slider.step}
      leftHint={BOTTOM_COPY.stationLeft}
      rightHint={BOTTOM_COPY.stationRight}
      sliderLabel={BOTTOM_COPY.sliderName(section, STATION_LABEL[field])}
      sliderValueText={words}
      onValueChange={(v) => onChange(storeCutStation(section, field, slider.toMm(v), board), field)}
    />
  );
}
