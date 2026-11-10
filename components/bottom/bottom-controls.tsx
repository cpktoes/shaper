"use client";

import { memo, type ReactNode } from "react";
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
  channelReadout,
  stationFromNearestTip,
  storeChannelStation,
  storeCutStation,
  type BottomBoard,
  type BottomChannelsSpec,
  type BottomCutName,
  type BottomCutSpec,
  type BottomFloorFlag,
  type BottomSectionKey,
  type BottomWingRule,
  type ResolvedChannels,
  type ResolvedCut,
} from "@/lib/geometry/bottom";
import type { BottomCutKey } from "@/lib/geometry/bottom-draw";
import { bottomImportedReadout } from "@/lib/geometry/imported-readout";
import { formatDim, formatMark, measureSlider } from "@/lib/geometry/measure-display";
import type { Mm, UnitsSystem } from "@/lib/geometry/units";
import { placedWings } from "@/lib/geometry/wings";
import { cn } from "@/lib/utils";
import {
  BOTTOM_COPY,
  BOTTOM_SECTION_NAME,
  CHANNELS_COPY,
  channelSmoothnessWords,
  channelWidthLabel,
  channelWidthWords,
  floorWarning,
  runOptionLabel,
  staggerLabel,
  staggerWords,
  wingWords,
} from "./bottom-copy";

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

/** WINGS' two rules, in the menu's order: the narrowest outline first, where every board opens (D-19). */
const WING_RULES: readonly BottomWingRule[] = ["narrowest", "natural"];

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
  /** A count picked from the CHANNELS block (the editor writes the store, makes the channels live and, opening a set,
   * moves the section to their Deepest). */
  onChannelCount: (count: BottomChannelsSpec["count"]) => void;
  /** Where each cut meets the 1/4" floor — the editor's one scan (`bottomFloorFlags`), shared with DATA. */
  floorFlags: BottomFloorFlag[];
  /** The finished rail from RAILS on the section (D-13): view state, off when the page opens, never saved. */
  showFinishedRail: boolean;
  onShowFinishedRail: (on: boolean) => void;
  /** Whether the floor scan behind `floorFlags` has caught up with the board as it is now. The scan trails a pick or a
   * drag by a moment (the editor defers it), so for that moment the sentences under the Depth rows and DATA's floor note
   * are still the last board's. Written on the panel as `data-bottom-floor-scan`, where a browser test can wait for it
   * before it says a warning is or is not there; nothing is drawn from it. */
  floorScanSettled: boolean;
  /** On an upright phone, VIEWER's NOSE · CENTER · TAIL row picks the one section whose card shows beneath the pinned
   * drawing (D-27, RAILS' rule); the other two are hidden below the layout's width line and nowhere else. Left out
   * (DATA and GUIDE carry no row), all three cards show on every width. */
  phoneSection?: BottomSectionKey;
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
export const BottomControls = memo(function BottomControls({
  live,
  onLive,
  onPick,
  onChannelCount,
  floorFlags,
  floorScanSettled,
  showFinishedRail,
  onShowFinishedRail,
  phoneSection,
}: BottomControlsProps) {
  const { system } = useUnits();
  const {
    bottom,
    bottomBoard,
    resolvedBottom,
    updateBottomCut,
    setBottomClosesToPoint,
    setBottomWingRule,
    setChannelRun,
    setChannelLongest,
    updateChannels,
    outline,
    outlineGeometry,
    effectiveRails,
  } = useDesign();
  const locked = useControlsLocked();
  const channelsCut = bottom.channels.count > 0;
  // The wings as the board draws them (D-19): the WINGS row is for a winged board only, and a wing with no depth is no
  // wing. Placing them is the maths' own (`placedWings`); this only asks whether there are any and reads their figures.
  const wings = wingWords(placedWings(outline.wings ?? [], outlineGeometry), system);
  const wingRuleItems = WING_RULES.map((rule) => ({ value: rule, label: BOTTOM_COPY.wingRuleOptions[rule] }));
  // Where each cut meets the 1/4" floor (D-09, D-33 as amended by D-40) comes from the editor's one scan: the stringer
  // form from the maths' own scan, the rail form from the litres' own sections — the store's memoised `bottomSections`,
  // never built here (the checker's W1). The scan (50–75 ms on a full bottom) reads deferred copies, so a drag keeps its
  // thumb under the finger and the sentence follows a moment after.

  return (
    <div data-bottom-floor-scan={floorScanSettled ? "settled" : "pending"} className="flex flex-col gap-5">
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
        {/* D-13: the finished rail from RAILS on the section — RAILS' tick row, view-only, so a locked board keeps it. */}
        <div data-lock-exempt className="pt-2">
          <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
            <Checkbox data-lock-exempt checked={showFinishedRail} onCheckedChange={(checked) => onShowFinishedRail(checked === true)} />
            {BOTTOM_COPY.showFinishedRail}
          </label>
        </div>
      </div>

      {/* WINGS (D-19, UI-SPEC §1): on a winged board only — which outline every cut's Off Rail is measured from. One
          setting for the whole bottom, saved with it; greyed and still on a locked board. */}
      {wings.length > 0 && (
        <div data-bottom-wings className="flex flex-col gap-3.5">
          <div className={RULED_HEADING}>
            <span className="shrink-0">{BOTTOM_COPY.wingsHeading}</span>
            <span data-bottom-wings-echo className={HEADING_ECHO}>
              {BOTTOM_COPY.wingsEcho(wings)}
            </span>
          </div>
          <div className={cn(locked && "opacity-40")}>
            <div className={SELECT_LABEL}>{BOTTOM_COPY.wingRuleLabel}</div>
            <Select items={wingRuleItems} value={bottom.wingRule} onValueChange={(value) => setBottomWingRule(value as BottomWingRule)} disabled={locked}>
              <SelectTrigger aria-label={BOTTOM_COPY.wingRuleLabel} className={CUT_TRIGGER}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {wingRuleItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p data-bottom-wing-note className="text-xs text-surf-ink-muted font-normal">
            {BOTTOM_COPY.wingRuleNotes[bottom.wingRule]}
          </p>
        </div>
      )}

      {BOTTOM_SECTIONS.map((section) => (
        <BottomSectionCard
          key={section}
          section={section}
          spec={bottom[section]}
          resolved={resolvedBottom[section]}
          board={bottomBoard}
          system={system}
          live={live === section}
          hiddenOnPhone={phoneSection !== undefined && phoneSection !== section}
          floor={floorWarning(
            floorFlags.find((flag) => flag.section === section),
            bottomBoard,
            system,
          )}
          flatNote={section === "tail" && channelsCut ? CHANNELS_COPY.flatNoteWithChannels : BOTTOM_COPY.flatNote}
          onLive={() => onLive(section)}
          onPick={(name) => onPick(section, name)}
          onChange={(patch, changed) => updateBottomCut(section, patch, changed)}
          onClosesToPoint={(on) => setBottomClosesToPoint(section, on)}
        >
          {section === "tail" && (
            <ChannelsBlock
              spec={bottom.channels}
              resolved={resolvedBottom.channels}
              board={bottomBoard}
              rule={resolvedBottom.wingRule}
              tailName={bottom.tail.name}
              system={system}
              floor={floorWarning(
                floorFlags.find((flag) => flag.section === "channels"),
                bottomBoard,
                system,
              )}
              onLive={() => onLive("channels")}
              onCount={onChannelCount}
              onRun={setChannelRun}
              onLongest={setChannelLongest}
              onChange={updateChannels}
            />
          )}
        </BottomSectionCard>
      ))}
    </div>
  );
});

interface BottomSectionCardProps {
  section: BottomSectionKey;
  spec: BottomCutSpec;
  resolved: ResolvedCut;
  board: BottomBoard;
  system: UnitsSystem;
  live: boolean;
  /** Not the section the phone's NOSE · CENTER · TAIL row has picked: hidden on an upright phone, by width alone. */
  hiddenOnPhone: boolean;
  /** The floor sentence under the Depth row (`floorWarning`), or null when this cut meets no floor. */
  floor: string | null;
  /** A flat section's one line (TAIL's names the channels when there are any). */
  flatNote: string;
  onLive: () => void;
  onPick: (name: BottomCutName) => void;
  onChange: (patch: Partial<BottomCutSpec>, changed?: StationField) => void;
  onClosesToPoint: (on: boolean) => void;
  /** Drawn under the card's last row: TAIL's CHANNELS block. */
  children?: ReactNode;
}

/** One section's card: RAILS' group (`flex flex-col gap-3.5`), its heading echoing the cut, the `Cut` menu, then the
 * flat note or the cut's own rows, then (on a Nose single) the tick box, then (TAIL) the CHANNELS block. A press
 * anywhere in it makes it the live cut. */
function BottomSectionCard({
  section,
  spec,
  resolved,
  board,
  system,
  live,
  hiddenOnPhone,
  floor,
  flatNote,
  onLive,
  onPick,
  onChange,
  onClosesToPoint,
  children,
}: BottomSectionCardProps) {
  const locked = useControlsLocked();
  const items = BOTTOM_CUT_NAMES[section].map((name) => ({ value: name, label: name }));
  const name = BOTTOM_SECTION_NAME[section];

  return (
    <div
      data-bottom-card={section}
      data-live={live ? "" : undefined}
      // RAILS' rule (`rail-controls.tsx`): below the layout's width line only the picked section's card is drawn.
      className={hiddenOnPhone ? "flex flex-col gap-3.5 max-shell:hidden" : "flex flex-col gap-3.5"}
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

      {resolved.kind === "flat" && <p className="text-sm text-surf-ink-muted font-normal">{flatNote}</p>}

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

      {children}
    </div>
  );
}

/** The CHANNELS sub-heading (UI-SPEC §2): 10/800 muted caps, its echo 12/400 at the right, truncating. */
const SUBHEADING =
  "flex w-full items-center justify-between gap-2 text-[10px] font-display text-surf-ink-muted uppercase tracking-architectural font-extrabold";

const CHANNEL_COUNTS = [0, 4, 6, 8] as const;
const CHANNEL_RUNS = ["parallel", "rail", "toe"] as const;
const CHANNEL_LONGEST = ["inner", "outer", "same"] as const;
/** Stagger, a dim along the board (UI-SPEC §1): 0–8" in 1/2" steps, 10 mm in Metric. */
const STAGGER = { rangeIn: { min: 0, max: 8 }, stepIn: 0.5, stepMm: 10 } as const;
/** Channel Width, a mark: 1/2–4" (UI-SPEC §1). */
const CHANNEL_WIDTH_RANGE_IN = { min: 0.5, max: 4 } as const;

interface ChannelsBlockProps {
  spec: BottomChannelsSpec;
  resolved: ResolvedChannels;
  board: BottomBoard;
  rule: BottomWingRule;
  tailName: BottomCutName;
  system: UnitsSystem;
  /** The floor sentence under the channels' Depth (the rail form only: the channels never touch the stringer). */
  floor: string | null;
  onLive: () => void;
  onCount: (count: BottomChannelsSpec["count"]) => void;
  onRun: (run: BottomChannelsSpec["run"]) => void;
  onLongest: (longest: BottomChannelsSpec["longest"]) => void;
  onChange: (patch: Partial<BottomChannelsSpec>, changed?: StationField) => void;
}

/**
 * The CHANNELS block, inside TAIL under its last row (D-10, D-11, UI-SPEC §2): a dashed rule, `CHANNELS` echoing the
 * set, then the count. With a count: Run and Longest on one row, then Channel Width — its ramp and last wall read out by
 * the maths' `channelReadout`, never set — Off Stringer, Start, Stagger (hidden, not dimmed, for All the same), Deepest
 * At, End, Depth (the floor under it) and Smoothness. `None` hides the rows and keeps their numbers. A press, or the
 * keyboard arriving, anywhere in it makes the channels the live cut — after the TAIL card's own capture, so it wins.
 * Every figure through the formatters (Rule 2), every number the maths' (Rule 1); no Wall control and nothing but the
 * starts staggers (D-10).
 */
function ChannelsBlock({ spec, resolved, board, rule, tailName, system, floor, onLive, onCount, onRun, onLongest, onChange }: ChannelsBlockProps) {
  const locked = useControlsLocked();
  const counts = CHANNEL_COUNTS.map((count) => ({ value: String(count), label: CHANNELS_COPY.countOption(count) }));
  const runs = CHANNEL_RUNS.map((run) => ({ value: run, label: runOptionLabel(run, board.toeDegrees) }));
  const longest = CHANNEL_LONGEST.map((value) => ({ value, label: CHANNELS_COPY.longestOption[value] }));
  const open = spec.count > 0;

  return (
    <div data-bottom-channels className="mt-2 border-t border-dashed border-surf-line-faint pt-3" onPointerDownCapture={onLive} onFocusCapture={onLive}>
      <div className={SUBHEADING}>
        <span className="shrink-0">{CHANNELS_COPY.heading}</span>
        <span data-bottom-channels-echo className={HEADING_ECHO}>
          {CHANNELS_COPY.echo(spec.count, tailName)}
        </span>
      </div>
      <div className="mt-3.5 flex flex-col gap-3.5">
        <div className={cn(locked && "opacity-40")}>
          <div className={SELECT_LABEL}>{CHANNELS_COPY.countLabel}</div>
          <Select
            items={counts}
            value={String(spec.count)}
            onValueChange={(value) => onCount(Number(value) as BottomChannelsSpec["count"])}
            disabled={locked}
          >
            <SelectTrigger aria-label={CHANNELS_COPY.countSelectName} className={CUT_TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {counts.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {open && (
          <>
            {/* Run and Longest share one row (UI-SPEC §2); each column may shrink, so a long option truncates with an
                ellipsis inside its trigger rather than pushing the row wider. */}
            <div className={cn("grid grid-cols-2 gap-2", locked && "opacity-40")}>
              <div className="min-w-0">
                <div className={SELECT_LABEL}>{CHANNELS_COPY.runLabel}</div>
                <Select items={runs} value={spec.run} onValueChange={(value) => onRun(value as BottomChannelsSpec["run"])} disabled={locked}>
                  <SelectTrigger aria-label={CHANNELS_COPY.runSelectName} className={cn(CUT_TRIGGER, TRUNCATING_VALUE)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {runs.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0">
                <div className={SELECT_LABEL}>{CHANNELS_COPY.longestLabel}</div>
                <Select
                  items={longest}
                  value={spec.longest}
                  onValueChange={(value) => onLongest(value as BottomChannelsSpec["longest"])}
                  disabled={locked}
                >
                  <SelectTrigger aria-label={CHANNELS_COPY.longestSelectName} className={cn(CUT_TRIGGER, TRUNCATING_VALUE)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {longest.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ChannelRows spec={spec} resolved={resolved} board={board} rule={rule} system={system} floor={floor} onChange={onChange} />
          </>
        )}
      </div>
    </div>
  );
}

/** A Select trigger whose value truncates with an ellipsis in a narrow column (the Run trigger's `Toe-in (no toe)` at
 * an 820 window, UI-SPEC § Already done): the value a block that may shrink, cut with `…`. */
const TRUNCATING_VALUE = "min-w-0 *:data-[slot=select-value]:block *:data-[slot=select-value]:min-w-0 *:data-[slot=select-value]:truncate";

/** The channels' sliders, in the UI-SPEC's order: Channel Width, Off Stringer, Start, Stagger, Deepest At, End, Depth,
 * Smoothness. */
function ChannelRows({
  spec,
  resolved,
  board,
  rule,
  system,
  floor,
  onChange,
}: {
  spec: BottomChannelsSpec;
  resolved: ResolvedChannels;
  board: BottomBoard;
  rule: BottomWingRule;
  system: UnitsSystem;
  floor: string | null;
  onChange: (patch: Partial<BottomChannelsSpec>, changed?: StationField) => void;
}) {
  const readout = channelReadout(resolved, board, rule);
  const widthSlider = measureSlider(spec.width, CHANNEL_WIDTH_RANGE_IN, MARK_STEP_IN, 1, system);
  const widthWords = channelWidthWords(readout, system);
  const staggerText = staggerLabel(spec, readout, system);
  const stagger = measureSlider(spec.stagger, STAGGER.rangeIn, STAGGER.stepIn, STAGGER.stepMm, system);
  const station = (field: StationField) => (
    <ChannelStationRow key={field} field={field} resolved={resolved} board={board} system={system} longest={spec.longest} onChange={onChange} />
  );

  return (
    <>
      {/* The Width label reads the set out — the width asked for, what it was cut to when squeezed, the ramp and the last
          wall — in the panel's muted ink: information, never the warning colour (the RAILS "trimmed to fit" rule). */}
      <div data-bottom-channel-width>
        <SliderRow
          label={channelWidthLabel(readout, system)}
          value={widthSlider.value}
          min={widthSlider.min}
          max={widthSlider.max}
          step={widthSlider.step}
          sliderLabel={CHANNELS_COPY.sliderName(CHANNELS_COPY.width)}
          sliderValueText={widthWords}
          onValueChange={(v) => onChange({ width: widthSlider.toMm(v) })}
        />
      </div>
      <MarkRow
        name={CHANNELS_COPY.sliderName(BOTTOM_COPY.offStringer)}
        field="offStringer"
        value={spec.offStringer}
        system={system}
        onChange={(value) => onChange({ offStringer: value })}
      />
      {station("start")}
      {staggerText !== null && (
        <SliderRow
          label={staggerText}
          value={stagger.value}
          min={stagger.min}
          max={stagger.max}
          step={stagger.step}
          leftHint={CHANNELS_COPY.staggerLeft}
          rightHint={formatDim(stagger.toMm(stagger.max), system)}
          sliderLabel={CHANNELS_COPY.sliderName(CHANNELS_COPY.stagger)}
          sliderValueText={staggerWords(spec, readout, system) ?? undefined}
          onValueChange={(v) => onChange({ stagger: stagger.toMm(v) })}
        />
      )}
      {station("deepest")}
      {station("end")}
      <div>
        <MarkRow
          name={CHANNELS_COPY.sliderName(BOTTOM_COPY.depth)}
          field="depth"
          value={spec.depth}
          system={system}
          onChange={(value) => onChange({ depth: value })}
        />
        {floor && (
          <p data-bottom-floor className={FLOOR_LINE}>
            {floor}
          </p>
        )}
      </div>
      <SmoothnessRow
        name={CHANNELS_COPY.sliderName(BOTTOM_COPY.smoothness)}
        value={spec.smoothness}
        words={channelSmoothnessWords(spec.smoothness)}
        hints={[CHANNELS_COPY.smoothnessLeft, CHANNELS_COPY.smoothnessRight]}
        onChange={(v) => onChange({ smoothness: v })}
      />
    </>
  );
}

/**
 * The channels' Start, Deepest At or End (D-03, D-07): the section rows' own track — nose (left) to tail (right), filling
 * from the dot to the tail — read from the tail, Start naming the longest pair; a drag stored the channels' way
 * (`storeChannelStation`) and kept in order by the store. Reads the RESOLVED channels, so a station the front fins
 * pushed shows where it is (D-36).
 */
function ChannelStationRow({
  field,
  resolved,
  board,
  system,
  longest,
  onChange,
}: {
  field: StationField;
  resolved: ResolvedChannels;
  board: BottomBoard;
  system: UnitsSystem;
  longest: BottomChannelsSpec["longest"];
  onChange: (patch: Partial<BottomChannelsSpec>, changed?: StationField) => void;
}) {
  const slider = bottomStationSlider(resolved[field], board.length, system);
  const fromTail = BOTTOM_COPY.fromTip("tail", formatBottomStation(resolved[field], system));
  const words = field === "start" ? CHANNELS_COPY.startWords(fromTail, longest) : fromTail;
  return (
    <SliderRow
      className="slider-fill-end"
      label={STATION_LABEL[field]}
      displayValue={words}
      value={slider.value}
      min={slider.min}
      max={slider.max}
      step={slider.step}
      leftHint={BOTTOM_COPY.stationLeft}
      rightHint={BOTTOM_COPY.stationRight}
      sliderLabel={CHANNELS_COPY.sliderName(STATION_LABEL[field])}
      sliderValueText={words}
      onValueChange={(v) => onChange(storeChannelStation(field, slider.toMm(v), board), field)}
    />
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
  onChange,
}: {
  name: string;
  field: MarkField;
  value: Mm;
  system: UnitsSystem;
  onChange: (value: Mm) => void;
}) {
  const row = MARK_ROWS[field];
  const slider = measureSlider(value, row.rangeIn, MARK_STEP_IN, 1, system);
  const mark = formatMark(value, system);
  const words = row.words ? row.words(mark) : mark;
  return (
    <SliderRow
      label={row.label}
      displayValue={words}
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
