"use client";

import { useMemo } from "react";
import { useDesign } from "@/components/design/design-store";
import { ImportedReadoutCard } from "@/components/design/imported-readout-card";
import { SliderRow } from "@/components/design/slider-row";
import { useControlsLocked } from "@/components/design/use-controls-locked";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUnits } from "@/components/units-provider";
import { bottomStationSlider, formatBottomStation } from "@/lib/geometry/blank-reasons";
import {
  BOTTOM_CUT_NAMES,
  BOTTOM_SECTIONS,
  bottomFloorFlags,
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
import { BOTTOM_COPY, BOTTOM_SECTION_NAME, floorWarning } from "./bottom-copy";

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

/** A Select's label over it (FINS' label, `components/fins/fin-controls.tsx:427`). */
const SELECT_LABEL = "mb-1.5 text-sm text-surf-ink-muted font-normal";

/** The floor sentence under a Depth row: ROCKER's too-close line exactly (`components/rocker/rocker-controls.tsx:416`). */
const FLOOR_LINE = "mt-2 text-xs text-surf-warning-ink";

/** The mark sliders' step (UI-SPEC §1): 1/16", 1 mm in Metric, through `measureSlider`. */
const MARK_STEP_IN = 1 / 16;
/** Smoothness runs 0 to 100 in steps of 5. */
const SMOOTHNESS = { min: 0, max: 100, step: 5 } as const;

const STATION_FIELDS = ["start", "deepest", "end"] as const;
type StationField = (typeof STATION_FIELDS)[number];
const STATION_LABEL: Record<StationField, string> = { start: BOTTOM_COPY.start, deepest: BOTTOM_COPY.deepestAt, end: BOTTOM_COPY.end };

/** A cut's mark rows (UI-SPEC §1's slider table). */
type MarkField = "offRail" | "offStringer" | "troughAt" | "depth" | "veeLift";
interface MarkRowSpec {
  label: string;
  /** The slider's inch range; `measureSlider` rounds it inward onto whole millimetres in Metric. */
  rangeIn: { min: number; max: number };
  /** The left hint; with it, the right hint is the slider's own max. Absent, the row has no hints. */
  leftHint?: string;
  /** The words the value is read in (Trough At's `4" from the stringer`); absent, the mark alone. */
  words?: (mark: string) => string;
}
const MARK_ROWS: Record<MarkField, MarkRowSpec> = {
  offRail: { label: BOTTOM_COPY.offRail, rangeIn: { min: 0, max: 6 }, leftHint: BOTTOM_COPY.offRailLeft },
  offStringer: { label: BOTTOM_COPY.offStringer, rangeIn: { min: 0, max: 9 }, leftHint: BOTTOM_COPY.offStringerLeft },
  troughAt: { label: BOTTOM_COPY.troughAt, rangeIn: { min: 0.5, max: 8 }, words: BOTTOM_COPY.fromStringer },
  depth: { label: BOTTOM_COPY.depth, rangeIn: { min: 0, max: 0.5 }, leftHint: BOTTOM_COPY.depthLeft },
  veeLift: { label: BOTTOM_COPY.veeLift, rangeIn: { min: 0, max: 0.5 } },
};

/** One row of a cut's card. */
type CutRow = MarkField | StationField | "smoothness";

/**
 * Which rows a cut shows, in D-04's order (UI-SPEC § The side panel, the "Shown for" column): Off Rail on a single or a
 * double (the Spiral Vee is one), Off Stringer on a double and the Tri-Plane, Trough At on a double, then Start, Deepest
 * At, End and Depth on every cut but a flat (a vee's or belly's Depth is its lift at the rail, still labelled Depth),
 * Vee Lift on the Spiral Vee, and Smoothness. A flat shows none. Which rows to draw is the screen's question; every
 * number in them is the maths'.
 */
function cutRows(cut: Pick<ResolvedCut, "kind" | "name" | "spiral">): CutRow[] {
  if (cut.kind === "flat") return [];
  const rows: CutRow[] = [];
  if (cut.kind === "single" || cut.kind === "double") rows.push("offRail");
  if (cut.kind === "double" || cut.name === "Tri-Plane Hull Center") rows.push("offStringer");
  if (cut.kind === "double") rows.push("troughAt");
  rows.push(...STATION_FIELDS, "depth");
  if (cut.spiral) rows.push("veeLift");
  rows.push("smoothness");
  return rows;
}

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
 * in its heading, then that cut's own rows (17-09): Off Rail, Off Stringer, Trough At, Start, Deepest At, End, Depth,
 * Vee Lift and Smoothness as the cut has them, the Teardrop's tick box on a Nose single, and under Depth the floor in
 * words when the cut meets it.
 *
 * Every number is the store's: a slider writes the stored cut through `updateBottomCut` (one undo step per drag, Start
 * ≥ Deepest ≥ End kept in the same step), each row reads the RESOLVED cut — so a Tail cut's station pushed by the front
 * fins shows where it is (D-36) and nothing is written until the shaper moves a slider — every figure is written
 * through `measure-display.ts` or `formatBottomStation` (CLAUDE.md Rule 2), and no number is worked out here (Rule 1).
 * On a locked board every control is greyed and still (the Selects and the tick box `disabled={locked}`, each
 * `SliderRow` reads the lock itself); the readout card is information and keeps its strength.
 */
export function BottomControls({ live, onLive, onPick }: BottomControlsProps) {
  const { system } = useUnits();
  const { bottom, bottomBoard, resolvedBottom, bottomSections, updateBottomCut, setBottomClosesToPoint, outline, effectiveRails } = useDesign();
  // Where each cut meets the 1/4" floor (D-09, D-33 as amended by D-40): the stringer form from the maths' own scan, the
  // rail form from the litres' own sections — the store's memoised `bottomSections`, never built here (the checker's W1).
  const floorFlags = useMemo(() => bottomFloorFlags(resolvedBottom, bottomBoard, bottomSections), [resolvedBottom, bottomBoard, bottomSections]);

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
          floor={floorWarning(
            floorFlags.find((flag) => flag.section === section),
            bottomBoard,
            system,
          )}
          onLive={() => onLive(section)}
          onPick={(name) => onPick(section, name)}
          onChange={(patch, changed) => updateBottomCut(section, patch, changed)}
          onClosesToPoint={(on) => setBottomClosesToPoint(section, on)}
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
  /** The floor sentence under the Depth row (`floorWarning`), or null when this cut meets no floor. */
  floor: string | null;
  onLive: () => void;
  onPick: (name: BottomCutName) => void;
  onChange: (patch: Partial<BottomCutSpec>, changed?: StationField) => void;
  onClosesToPoint: (on: boolean) => void;
}

/** One section's card: RAILS' group (`flex flex-col gap-3.5`), its heading echoing the cut, the `Cut` menu, then the
 * flat note or the cut's own rows, then (on a Nose single) the tick box. A press anywhere in it makes it the live cut. */
function BottomSectionCard({ section, spec, resolved, board, system, live, floor, onLive, onPick, onChange, onClosesToPoint }: BottomSectionCardProps) {
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
        <div className={SELECT_LABEL}>{BOTTOM_COPY.cutLabel}</div>
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

      {cutRows(resolved).map((row) => {
        if (row === "smoothness") {
          return <SmoothnessRow key={row} name={BOTTOM_COPY.sliderName(section, BOTTOM_COPY.smoothness)} value={resolved.smoothness} onChange={(v) => onChange({ smoothness: v })} />;
        }
        if (row === "start" || row === "deepest" || row === "end") {
          return <StationRow key={row} section={section} field={row} resolved={resolved} board={board} system={system} onChange={onChange} />;
        }
        const mark = (
          <MarkRow
            key={row}
            name={BOTTOM_COPY.sliderName(section, MARK_ROWS[row].label)}
            field={row}
            value={resolved[row]}
            system={system}
            onChange={(value) => onChange({ [row]: value })}
          />
        );
        // The floor in words sits under the Depth row (UI-SPEC §7), in ROCKER's too-close line's place and voice; the
        // slider keeps showing the depth as set.
        return row === "depth" ? (
          <div key={row}>
            {mark}
            {floor && (
              <p data-bottom-floor className={FLOOR_LINE}>
                {floor}
              </p>
            )}
          </div>
        ) : (
          mark
        );
      })}

      {section === "nose" && resolved.kind === "single" && (
        // D-06 / D-32: a Nose single that closes to a point toward the center — RAILS' tick row exactly.
        <div className={cn(locked && "opacity-40")}>
          <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
            <Checkbox disabled={locked} checked={resolved.closesToPoint} onCheckedChange={(checked) => onClosesToPoint(checked === true)} />
            {BOTTOM_COPY.closesToPoint}
          </label>
        </div>
      )}
    </div>
  );
}

/** A mark slider's right-hand hint: the slider's own maximum, written as a mark — never a separately formatted bound,
 * so Metric's Depth reads `12 mm` under a slider that stops at 12 (UI-SPEC § Already done). */
function maxHint(view: { max: number; toMm: (v: number) => Mm }, system: UnitsSystem): string {
  return formatMark(view.toMm(view.max), system);
}

/**
 * One mark row — Off Rail, Off Stringer, Trough At, Depth or Vee Lift (UI-SPEC §1): 1/16" steps (1 mm in Metric) through
 * `measureSlider`, the value a mark (`formatMark`), its left hint and the slider's own max under the track, or none.
 * `name` is the slider's spoken name (`Center Off Rail`, `Channels Depth`).
 */
function MarkRow({
  name,
  field,
  value,
  system,
  label,
  onChange,
}: {
  name: string;
  field: MarkField;
  value: Mm;
  system: UnitsSystem;
  /** The label line in place of the plain `{label} — {mark}` (the channels' Width read-out). */
  label?: string;
  onChange: (value: Mm) => void;
}) {
  const row = MARK_ROWS[field];
  const slider = measureSlider(value, row.rangeIn, MARK_STEP_IN, 1, system);
  const mark = formatMark(value, system);
  const words = row.words ? row.words(mark) : mark;
  return (
    <SliderRow
      label={label ?? row.label}
      displayValue={label === undefined ? words : undefined}
      value={slider.value}
      min={slider.min}
      max={slider.max}
      step={slider.step}
      leftHint={row.leftHint}
      rightHint={row.leftHint ? maxHint(slider, system) : undefined}
      sliderLabel={name}
      sliderValueText={words}
      onValueChange={(v) => onChange(slider.toMm(v))}
    />
  );
}

/** Smoothness: 0 to 100 in steps of 5, `50%` (UI-SPEC §1). `words` replaces the plain value on the label line (the
 * channels' `0% · a straight ramp`); `hints` replaces the section rows' two hints. */
function SmoothnessRow({
  name,
  value,
  words,
  hints = [BOTTOM_COPY.smoothnessLeft, BOTTOM_COPY.smoothnessRight],
  onChange,
}: {
  name: string;
  value: number;
  words?: string;
  hints?: readonly [string, string];
  onChange: (value: number) => void;
}) {
  const percent = BOTTOM_COPY.percent(value);
  return (
    <SliderRow
      label={BOTTOM_COPY.smoothness}
      displayValue={words ?? percent}
      value={value}
      min={SMOOTHNESS.min}
      max={SMOOTHNESS.max}
      step={SMOOTHNESS.step}
      leftHint={hints[0]}
      rightHint={hints[1]}
      sliderLabel={name}
      sliderValueText={words ?? percent}
      onValueChange={onChange}
    />
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
