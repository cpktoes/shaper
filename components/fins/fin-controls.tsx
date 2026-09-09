"use client";

/**
 * The Fin Setup & Placement sidebar. Ported from reference/project/Fins.dc.html lines 100-370
 * (sidebar markup) and the advanced-control bounds in `renderVals` (lines 977-982). Reuses the
 * section-heading and slider-row styling from components/rails/rail-controls.tsx wholesale.
 */

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TailShapeIcon, type IconTailShape } from "@/components/outline/tail-shape-icon";
import {
  FIN_SETUPS,
  QUAD_REAR_MODELS,
  THRUSTER_FRONT_MODELS,
  TWIN_TEMPLATES,
  defaultCenterBaseLength,
  effectiveQuadRearModel,
  isQuadRearModelAvailable,
  resetAdvanced,
  type FinAdvancedSpec,
  type FinPlacementResult,
  type FinPlacementSpec,
  type FinSetup,
  type FinTailShape,
  type QuadRearModel,
  type ThrusterFrontModel,
  type TwinTemplate,
} from "@/lib/geometry/fins";
import { inchesToMm, mm, mmToInches, roundToWholeMm, type Mm, type UnitsSystem } from "@/lib/geometry/units";
import {
  formatDim,
  formatLength,
  formatMark,
  measureSlider,
  stationLabel,
  typedFieldBounds,
} from "@/lib/geometry/measure-display";
import { SliderRow, sliderValue } from "@/components/design/slider-row";
import { MeasureField } from "@/components/design/measure-field";
import { useUnits } from "@/components/units-provider";
import { FinSetupIcon, type FinSetupKind } from "./fin-setup-icon";

const TAIL_SHAPES: IconTailShape[] = ["pin", "round", "diamond", "squash", "swallow"];
const TAIL_SHAPE_LABEL: Record<IconTailShape, string> = {
  pin: "Pin",
  round: "Round",
  diamond: "Diamond",
  squash: "Squash",
  swallow: "Swallow",
};
const FIN_SETUP_ORDER: FinSetupKind[] = ["single", "twin", "thruster", "2plus1", "quad"];

const BASE_LEN_BOUNDS = { min: 2.5, max: 7.5, step: 0.125 };
const POS_BOUNDS = { min: -1.5, max: 1.5, step: 1 / 16 };
const TOE_BOUNDS = { min: 0, max: 0.5, step: 1 / 16 };
const OFF_RAIL_BOUNDS = { min: 1, max: 2, step: 1 / 16 };
const OFF_TAIL_OVERRIDE_BOUNDS = { min: 0.5, max: 12, step: 1 / 16 };

function clampFinite(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 border-b border-surf-line-faint pb-2 text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">
      {children}
    </div>
  );
}

function DisclosureHeading({
  children,
  open,
  onToggle,
}: {
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="focus-ring-accent flex w-full items-center justify-between border-b border-surf-line-faint pb-2 pl-3 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold"
    >
      <span>{children}</span>
      <span>{open ? "▾" : "▸"}</span>
    </button>
  );
}

function PillButton({
  active,
  onClick,
  children,
  className = "",
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        // 09-REVIEW.md WR-02: hand-rolled, not the shared Button component, so it never got
        // Button's own coarse:h-11 for free -- coarse:min-h-11 mirrors that same pointer-keyed
        // rule by hand (a finger needs 44px; a mouse at any width still gets today's height).
        `focus-ring-accent rounded-md border px-1 py-2.5 text-[11px] font-bold coarse:min-h-11 ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${
          active
            ? "border-surf-on-accent bg-surf-accent text-surf-on-accent"
            : "border-surf-line bg-surf-sidebar text-surf-ink"
        } ${className}`
      }
    >
      {children}
    </button>
  );
}

/** A base-length field: text + Override button until pressed, then a number input, matching the
 * prototype's baseLenXEditing toggle (Fins.dc.html lines 241-249 and onToggleBaseLenXEdit). The
 * number box's domain (inches stepping 1/8, or Metric's whole millimetres stepping 1) is decided
 * by the caller's own `measureSlider` call against `BASE_LEN_BOUNDS`, so this field never converts
 * on its own (CLAUDE.md Rule 2). */
function BaseLengthField({
  label,
  value,
  system,
  min,
  max,
  step,
  toMm,
  overridden,
  editing,
  onOverride,
  onChange,
}: {
  label: string;
  value: Mm;
  system: UnitsSystem;
  min: number;
  max: number;
  step: number;
  toMm: (dragged: number) => Mm;
  overridden: boolean;
  editing: boolean;
  onOverride: () => void;
  onChange: (next: Mm) => void;
}) {
  // Metric snaps the seed value onto the whole-millimetre grid, matching roundToWholeMm's
  // documented invariant and the read-only display above (formatMark rounds the same way) --
  // otherwise clicking "Override" opens the box on a raw stored value like 114.3 (WR-01).
  const displayValue = system === "metric" ? roundToWholeMm(value) : mmToInches(value);
  return (
    <div>
      <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">{label}</div>
      {editing ? (
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onChange={(e) => onChange(toMm(parseFloat(e.target.value)))}
          className="w-full rounded-md border border-outline-sidebar-input-border bg-outline-sidebar-input-bg px-2 py-1.5 text-[13px] text-outline-sidebar-text"
        />
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">
            {formatMark(value, system)}
            {!overridden && " standard"}
          </span>
          <button
            type="button"
            onClick={onOverride}
            className="focus-ring-accent cursor-pointer rounded-md border border-surf-line px-2.5 py-1 text-[11px] text-outline-sidebar-text"
          >
            Override
          </button>
        </div>
      )}
    </div>
  );
}

interface FinControlsProps {
  spec: FinPlacementSpec;
  result: FinPlacementResult;
  onChange: (patch: Partial<FinPlacementSpec>) => void;
  advancedOpen: boolean;
  onToggleAdvanced: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
  showCallouts: boolean;
  onToggleCallouts: () => void;
  onOpenToeTable: () => void;
  /** Whether board length, tail width @12" and tail shape are driven by the outline screen's
   * design (Fins.dc.html's `importTemplate`). */
  importTemplate: boolean;
  onToggleImportTemplate: () => void;
}

export function FinControls({
  spec,
  result,
  onChange,
  advancedOpen,
  onToggleAdvanced,
  settingsOpen,
  onToggleSettings,
  showCallouts,
  onToggleCallouts,
  onOpenToeTable,
  importTemplate,
  onToggleImportTemplate,
}: FinControlsProps) {
  const { system } = useUnits();
  const [editingForward, setEditingForward] = useState(false);
  const [editingRear, setEditingRear] = useState(false);
  const [editingCenter, setEditingCenter] = useState(false);
  const [editingRearOffTail, setEditingRearOffTail] = useState(false);

  const lengthIn = mmToInches(spec.boardLength);
  const lengthFeet = Math.floor(lengthIn / 12);
  const lengthInches = Math.round(lengthIn - lengthFeet * 12);
  const setLengthIn = (totalIn: number) => onChange({ boardLength: inchesToMm(clampFinite(totalIn, 48, 144)) });
  const boardLength = measureSlider(spec.boardLength, { min: 48, max: 144 }, 1, 10, system);
  // The typed field's own bounds are in ITS domain (centimetres in Metric, D-08) — never the
  // slider's raw millimetre bounds. See typedFieldBounds's doc comment / CR-01.
  const boardLengthFieldBounds = typedFieldBounds(boardLength, "length", system);

  // Tail Width @ 12" stays its own hand-rolled Slider (allowlisted in slider-row.test.ts) rather
  // than migrating to SliderRow — see the comment above this block's JSX for why.
  const tailWidth12Slider = measureSlider(spec.tailWidth12, { min: 10, max: 18 }, 0.125, 1, system);

  // Each Fin Base Length field's own display-domain bounds/step/toMm (D-06: 64-190mm stepping 1
  // in Metric, today's 2.5-7.5in stepping 1/8 in Imperial) — one measureSlider call per field,
  // computed here so BaseLengthField itself never converts (CLAUDE.md Rule 2).
  const baseLenCenterSlider = measureSlider(spec.advanced.baseLenCenter, BASE_LEN_BOUNDS, BASE_LEN_BOUNDS.step, 1, system);
  const baseLenForwardSlider = measureSlider(spec.advanced.baseLenForward, BASE_LEN_BOUNDS, BASE_LEN_BOUNDS.step, 1, system);
  const baseLenRearSlider = measureSlider(spec.advanced.baseLenRear, BASE_LEN_BOUNDS, BASE_LEN_BOUNDS.step, 1, system);

  const updateAdvanced = (patch: Partial<FinAdvancedSpec>) => onChange({ advanced: { ...spec.advanced, ...patch } });

  const applySetup = (setup: FinSetup) => {
    setEditingForward(false);
    setEditingRear(false);
    setEditingCenter(false);
    setEditingRearOffTail(false);
    onChange({ finSetup: setup, advanced: resetAdvanced(setup) });
  };

  const resetAdvancedSettings = () => {
    setEditingForward(false);
    setEditingRear(false);
    setEditingCenter(false);
    setEditingRearOffTail(false);
    onChange({ advanced: resetAdvanced(spec.finSetup) });
  };

  const { flags, resolved } = result;

  // Each remaining measurement control's own display-domain bounds/step/toMm — one measureSlider
  // call per control, feeding both its onValueChange and (for the placement labels below) the
  // resolved distance the label prints. A position slider's own domain is a signed offset from a
  // model default, while its label prints the resulting distance up from the tail — a different
  // value from the one the track holds, and the two must not be conflated.
  const centerPositionSlider = measureSlider(spec.advanced.centerPositionOffset, POS_BOUNDS, POS_BOUNDS.step, 1, system);
  const forwardPositionSlider = measureSlider(spec.advanced.forwardPositionOffset, POS_BOUNDS, POS_BOUNDS.step, 1, system);
  const rearPositionSlider = measureSlider(spec.advanced.rearPositionOffset, POS_BOUNDS, POS_BOUNDS.step, 1, system);
  const forwardToeSlider = measureSlider(resolved.forwardToe, TOE_BOUNDS, TOE_BOUNDS.step, 1, system);
  const rearToeSlider = measureSlider(resolved.rearToe, TOE_BOUNDS, TOE_BOUNDS.step, 1, system);
  const quadRearOffRailSlider = measureSlider(resolved.quadRearOffRail, OFF_RAIL_BOUNDS, OFF_RAIL_BOUNDS.step, 1, system);
  const quadRearOffTailSlider = measureSlider(
    resolved.quadRearOffTailBase,
    OFF_TAIL_OVERRIDE_BOUNDS,
    OFF_TAIL_OVERRIDE_BOUNDS.step,
    1,
    system,
  );
  // The quad rear off-tail rule's fixed quarter-inch term, read through the display boundary in
  // both systems (D-09) rather than a hand-typed literal — Metric rounds the model's exact quarter
  // inch to the nearest whole millimetre for this heading only; the field below it still shows the
  // actual computed value.
  const quarterInchRuleText = formatMark(inchesToMm(0.25), system);

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Fin Setup &amp; Placement</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Quantitative reference · trailing-edge convention
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5 border-b border-outline-sidebar-divider pb-1.5">
        <div className="text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">Inputs</div>
        <label className="flex cursor-pointer items-center gap-1.5 coarse:min-h-11 whitespace-nowrap text-xs text-surf-ink-muted font-normal">
          <Checkbox checked={importTemplate} onCheckedChange={() => onToggleImportTemplate()} />
          Import Template Values
        </label>
      </div>

      {/* Board Length and Tail Width @ 12" (below) both keep their own hand-rolled markup rather
          than migrating to SliderRow. Board Length's middle row branches per system — the
          feet/inches Select combo in Imperial, one typed centimetre field in Metric (D-08) —
          matching its TEMPLATE and VOLUME counterparts, named in slider-row.test.ts's allowlist.
          Tail Width @ 12" would fit the row on its own, but it shares this exact 0.45 opacity
          dimming with Board Length under the same importTemplate toggle; migrating only one would
          leave two adjacent sliders dimming to visibly different shades (SliderRow's own disabled
          state dims to Tailwind's 0.4, not 0.45), so both stay hand-rolled together and are named
          in the allowlist too. */}
      <div style={{ opacity: importTemplate ? 0.45 : 1 }}>
        <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">
          Board Length — {formatLength(spec.boardLength, system)}
        </div>
        <div className="mb-2 flex gap-2">
          {system === "imperial" ? (
            <>
              <Select
                value={lengthFeet}
                onValueChange={(v) => setLengthIn((v as number) * 12 + lengthInches)}
                disabled={importTemplate}
              >
                <SelectTrigger className="flex-1 border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}&apos;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={lengthInches}
                onValueChange={(v) => setLengthIn(lengthFeet * 12 + (v as number))}
                disabled={importTemplate}
              >
                <SelectTrigger className="flex-1 border-outline-sidebar-input-border bg-outline-sidebar-input-bg text-outline-sidebar-text">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}&quot;
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <MeasureField
              value={spec.boardLength}
              onCommit={(next) => onChange({ boardLength: next })}
              label="Board Length"
              family="length"
              min={boardLengthFieldBounds.min}
              max={boardLengthFieldBounds.max}
              system={system}
              disabled={importTemplate}
            />
          )}
        </div>
        <Slider
          value={boardLength.value}
          min={boardLength.min}
          max={boardLength.max}
          step={boardLength.step}
          disabled={importTemplate}
          onValueChange={(v) => onChange({ boardLength: boardLength.toMm(sliderValue(v)) })}
          className="slider-accent"
        />
      </div>

      <div style={{ opacity: importTemplate ? 0.45 : 1 }}>
        <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">
          {`Tail Width @ ${stationLabel(system)} — ${formatDim(spec.tailWidth12, system)}`}
        </div>
        <Slider
          value={tailWidth12Slider.value}
          min={tailWidth12Slider.min}
          max={tailWidth12Slider.max}
          step={tailWidth12Slider.step}
          disabled={importTemplate}
          onValueChange={(v) => onChange({ tailWidth12: tailWidth12Slider.toMm(sliderValue(v)) })}
          className="slider-accent"
        />
      </div>

      <div style={{ opacity: importTemplate ? 0.45 : 1 }}>
        <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">
          Tail Shape — {TAIL_SHAPE_LABEL[spec.tailShape as IconTailShape]}
        </div>
        {/* 09-REVIEW.md WR-02: hand-rolled <button>s, not PillButton or the shared Button
            component, so coarse:min-h-11 is added by hand -- same pointer-keyed rule, no effect
            on a mouse at any width. */}
        <div
          className="mt-2 mb-6 grid grid-cols-5 gap-2.5"
          style={{ pointerEvents: importTemplate ? "none" : "auto" }}
        >
          {TAIL_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              onClick={() => onChange({ tailShape: shape as FinTailShape })}
              className={
                "focus-ring-accent flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-2 coarse:min-h-11 " +
                (spec.tailShape === shape
                  ? "border-surf-on-accent bg-surf-accent text-surf-on-accent"
                  : "border-surf-line bg-surf-sidebar text-surf-ink")
              }
            >
              <TailShapeIcon shape={shape} active={spec.tailShape === shape} />
              <span className="text-[10px] font-bold">{TAIL_SHAPE_LABEL[shape]}</span>
            </button>
          ))}
        </div>
      </div>

      <SectionHeading>Fin Selection</SectionHeading>

      <div>
        <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">Fin Setup</div>
        {/* 09-REVIEW.md WR-02: same hand-rolled coarse:min-h-11 as the tail-shape grid above. */}
        <div className="mt-2 mb-6 grid grid-cols-5 gap-2.5">
          {FIN_SETUP_ORDER.map((setup) => {
            const opt = FIN_SETUPS.find((o) => o.value === setup)!;
            return (
              <button
                key={setup}
                type="button"
                onClick={() => applySetup(setup)}
                className={
                  "focus-ring-accent flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-2 coarse:min-h-11 " +
                  (spec.finSetup === setup
                    ? "border-surf-on-accent bg-surf-accent text-surf-on-accent"
                    : "border-surf-line bg-surf-sidebar text-surf-ink")
                }
              >
                <FinSetupIcon setup={setup} active={spec.finSetup === setup} />
                <span className="text-[10px] font-bold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {spec.finSetup === "thruster" && (
        <div>
          <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">Thruster Model</div>
          <div className="flex flex-wrap gap-1.5">
            {THRUSTER_FRONT_MODELS.map((opt) => (
              <PillButton
                key={opt.value}
                active={spec.frontModel === opt.value}
                onClick={() => onChange({ frontModel: opt.value as ThrusterFrontModel })}
                className="flex-1 basis-[45%]"
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>
      )}

      {spec.finSetup === "quad" && (
        <>
          <div className="mb-6">
            <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">Quad Model</div>
            <div className="mt-2 grid grid-cols-2 gap-2.5">
              {QUAD_REAR_MODELS.map((opt) => (
                <PillButton
                  key={opt.value}
                  active={effectiveQuadRearModel(spec.quadRearModel, spec.boardLength) === opt.value}
                  disabled={!isQuadRearModelAvailable(opt.value, spec.boardLength)}
                  onClick={() =>
                    onChange({
                      quadRearModel: opt.value as QuadRearModel,
                      quadCenterFinOn: opt.value === "mckeeLB" ? false : spec.quadCenterFinOn,
                    })
                  }
                >
                  {opt.label}
                </PillButton>
              ))}
            </div>
            {!isQuadRearModelAvailable("mckeeLB", spec.boardLength) && (
              <div className="mt-1.5 text-sm text-surf-ink-muted font-normal">
                McKee Longboard needs a board 8&apos;0&quot; or longer.
              </div>
            )}
          </div>
          {flags.quadCenterFinAvailable && (
            <label className="flex cursor-pointer items-center gap-2 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
              <Checkbox checked={spec.quadCenterFinOn} onCheckedChange={() => onChange({ quadCenterFinOn: !spec.quadCenterFinOn })} />
              Add 5th/Center fin
            </label>
          )}
          {flags.isLongboardQuad && (
            <div className="text-sm text-surf-ink-muted font-normal">Longboard quad model has no center-fin option.</div>
          )}
        </>
      )}

      {spec.finSetup === "twin" && (
        <div>
          <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">Twin Template</div>
          <div className="flex flex-wrap gap-1.5">
            {TWIN_TEMPLATES.map((opt) => (
              <PillButton
                key={opt.value}
                active={spec.twinTemplate === opt.value}
                onClick={() => onChange({ twinTemplate: opt.value as TwinTemplate })}
                className="flex-1 basis-[30%]"
              >
                {opt.label}
              </PillButton>
            ))}
          </div>
        </div>
      )}

      <div>
        <DisclosureHeading open={advancedOpen} onToggle={onToggleAdvanced}>
          Advanced
        </DisclosureHeading>
        {advancedOpen && (
          <div className="mt-3.5 flex flex-col gap-4.5 pl-3">
            {flags.hasCenterSection && (
              <div>
                <div className="mb-2.5 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">{flags.centerSectionLabel}</div>
                <div className="mb-2.5">
                  <BaseLengthField
                    label={flags.centerBaseLenFieldLabel}
                    value={spec.advanced.baseLenCenter}
                    system={system}
                    min={baseLenCenterSlider.min}
                    max={baseLenCenterSlider.max}
                    step={baseLenCenterSlider.step}
                    toMm={baseLenCenterSlider.toMm}
                    overridden={spec.advanced.baseLenCenterOverridden}
                    editing={editingCenter}
                    onOverride={() => {
                      setEditingCenter(true);
                      updateAdvanced({ baseLenCenterOverridden: true });
                    }}
                    onChange={(next) => updateAdvanced({ baseLenCenter: next, baseLenCenterOverridden: true })}
                  />
                </div>
                <SliderRow
                  density="tight"
                  label={`Forward/Aft position — ${formatMark(resolved.centerOffTail, system)}`}
                  value={centerPositionSlider.value}
                  min={centerPositionSlider.min}
                  max={centerPositionSlider.max}
                  step={centerPositionSlider.step}
                  onValueChange={(v) => updateAdvanced({ centerPositionOffset: centerPositionSlider.toMm(v) })}
                  leftHint="Drivey (near tail)"
                  rightHint="Loose (far from tail)"
                />
              </div>
            )}

            {flags.hasForwardSection && (
              <div className="border-t border-outline-sidebar-divider pt-4">
                <div className="mb-2.5 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
                  Forward Fins — {flags.forwardSectionLabel}
                </div>
                <div className="mb-2.5">
                  <BaseLengthField
                    label="Fin Base Length"
                    value={spec.advanced.baseLenForward}
                    system={system}
                    min={baseLenForwardSlider.min}
                    max={baseLenForwardSlider.max}
                    step={baseLenForwardSlider.step}
                    toMm={baseLenForwardSlider.toMm}
                    overridden={spec.advanced.baseLenForwardOverridden}
                    editing={editingForward}
                    onOverride={() => {
                      setEditingForward(true);
                      updateAdvanced({ baseLenForwardOverridden: true });
                    }}
                    onChange={(next) => updateAdvanced({ baseLenForward: next, baseLenForwardOverridden: true })}
                  />
                </div>
                <div className="mb-2.5">
                  <SliderRow
                    density="tight"
                    label={`Forward/Aft position — ${formatMark(
                      spec.finSetup === "2plus1" ? resolved.sideOffTail : spec.finSetup === "twin" ? resolved.twinOffTail : resolved.frontOffTail,
                      system,
                    )} (off-rail unchanged)`}
                    value={forwardPositionSlider.value}
                    min={forwardPositionSlider.min}
                    max={forwardPositionSlider.max}
                    step={forwardPositionSlider.step}
                    onValueChange={(v) => updateAdvanced({ forwardPositionOffset: forwardPositionSlider.toMm(v) })}
                    leftHint="Loose (fwd)"
                    rightHint="Drivey (back)"
                  />
                </div>
                <SliderRow
                  density="tight"
                  label={`Toe-in — ${formatMark(resolved.forwardToe, system)}`}
                  value={forwardToeSlider.value}
                  min={forwardToeSlider.min}
                  max={forwardToeSlider.max}
                  step={forwardToeSlider.step}
                  onValueChange={(v) => updateAdvanced({ forwardToeOverride: forwardToeSlider.toMm(v) })}
                  leftHint="Drivey (less)"
                  rightHint="Loose (more)"
                />
                {flags.showFrontToeTableLink && (
                  <button
                    type="button"
                    onClick={onOpenToeTable}
                    className="focus-ring-accent mt-2 cursor-pointer bg-transparent p-0 text-[11px] font-bold text-surf-accent-ink underline"
                  >
                    View precise McKee toe-in aim tables ⤢
                  </button>
                )}
              </div>
            )}

            {flags.hasRearSection && (
              <div className="border-t border-outline-sidebar-divider pt-4">
                <div className="mb-2.5 text-[10px] font-display text-surf-ink uppercase tracking-architectural font-extrabold">
                  Rear Fins — {flags.rearSectionLabel}
                </div>
                <div className="mb-2.5">
                  <BaseLengthField
                    label="Fin Base Length"
                    value={spec.advanced.baseLenRear}
                    system={system}
                    min={baseLenRearSlider.min}
                    max={baseLenRearSlider.max}
                    step={baseLenRearSlider.step}
                    toMm={baseLenRearSlider.toMm}
                    overridden={spec.advanced.baseLenRearOverridden}
                    editing={editingRear}
                    onOverride={() => {
                      setEditingRear(true);
                      updateAdvanced({ baseLenRearOverridden: true });
                    }}
                    onChange={(next) => updateAdvanced({ baseLenRear: next, baseLenRearOverridden: true })}
                  />
                </div>
                {flags.showRearOffTailOverride && (
                  <div className="mb-2.5">
                    <div className="mb-1.5 text-sm text-surf-ink-muted font-normal">
                      {`Rear Off-Tail Position (½ front off-tail + ${quarterInchRuleText})`}
                    </div>
                    {editingRearOffTail ? (
                      <input
                        type="number"
                        min={quadRearOffTailSlider.min}
                        max={quadRearOffTailSlider.max}
                        step={quadRearOffTailSlider.step}
                        // measureSlider's metric value clamps but never snaps -- the resolved
                        // off-tail base (½ front off-tail + a quarter inch) can land on a
                        // non-integer millimetre, so this seeds the same whole-millimetre grid
                        // BaseLengthField does above (WR-01).
                        value={
                          system === "metric"
                            ? roundToWholeMm(mm(quadRearOffTailSlider.value))
                            : quadRearOffTailSlider.value
                        }
                        onChange={(e) =>
                          updateAdvanced({
                            quadRearOffTailOverride: quadRearOffTailSlider.toMm(parseFloat(e.target.value)),
                            quadRearOffTailOverridden: true,
                          })
                        }
                        className="w-full rounded-md border border-outline-sidebar-input-border bg-outline-sidebar-input-bg px-2 py-1.5 text-[13px] text-outline-sidebar-text"
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">
                          {formatMark(resolved.quadRearOffTailBase, system)}
                          {spec.advanced.quadRearOffTailOverridden ? " override" : ` auto (½ front off-tail + ${quarterInchRuleText})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRearOffTail(true);
                            updateAdvanced({
                              quadRearOffTailOverridden: true,
                              quadRearOffTailOverride: spec.advanced.quadRearOffTailOverride ?? resolved.quadRearOffTailBase,
                            });
                          }}
                          className="focus-ring-accent cursor-pointer rounded-md border border-surf-line px-2.5 py-1 text-[11px] text-outline-sidebar-text"
                        >
                          Override
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-2.5">
                  <SliderRow
                    density="tight"
                    label={`Forward/Aft position — ${formatMark(resolved.pairOffTail, system)} (off-rail unchanged)`}
                    value={rearPositionSlider.value}
                    min={rearPositionSlider.min}
                    max={rearPositionSlider.max}
                    step={rearPositionSlider.step}
                    onValueChange={(v) => updateAdvanced({ rearPositionOffset: rearPositionSlider.toMm(v) })}
                    leftHint="Loose (fwd)"
                    rightHint="Drivey (back)"
                  />
                </div>
                {flags.showRearOffRailSlider && (
                  <div className="mb-2.5">
                    <SliderRow
                      density="tight"
                      label={`Off-Rail — ${formatMark(resolved.quadRearOffRail, system)}`}
                      value={quadRearOffRailSlider.value}
                      min={quadRearOffRailSlider.min}
                      max={quadRearOffRailSlider.max}
                      step={quadRearOffRailSlider.step}
                      onValueChange={(v) =>
                        updateAdvanced({ quadRearOffRailOverride: quadRearOffRailSlider.toMm(v) })
                      }
                    />
                  </div>
                )}
                <SliderRow
                  density="tight"
                  label={`Toe-in — ${formatMark(resolved.rearToe, system)}`}
                  value={rearToeSlider.value}
                  min={rearToeSlider.min}
                  max={rearToeSlider.max}
                  step={rearToeSlider.step}
                  onValueChange={(v) => updateAdvanced({ rearToeOverride: rearToeSlider.toMm(v) })}
                  leftHint="Drivey (less)"
                  rightHint="Loose (more)"
                />
                {flags.showRearToeTableLink && (
                  <button
                    type="button"
                    onClick={onOpenToeTable}
                    className="focus-ring-accent mt-2 cursor-pointer bg-transparent p-0 text-[11px] font-bold text-surf-accent-ink underline"
                  >
                    View precise McKee toe-in aim tables ⤢
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={resetAdvancedSettings}
              className="focus-ring-accent cursor-pointer border-t border-surf-line-faint pt-4 text-left text-xs font-bold text-surf-accent-ink"
            >
              ↺ Reset Advanced Settings
            </button>
          </div>
        )}
      </div>

      <div className="mt-auto">
        <DisclosureHeading open={settingsOpen} onToggle={onToggleSettings}>
          Settings
        </DisclosureHeading>
        {settingsOpen && (
          <div className="mt-3 pl-3">
            <label className="mb-4 flex cursor-pointer items-center gap-1.5 coarse:min-h-11 text-sm text-surf-ink-muted font-normal">
              <Checkbox checked={showCallouts} onCheckedChange={onToggleCallouts} />
              Fin Placement Callouts
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

// Re-exported for callers that only need the default base-length label, matching the
// prototype's centerDefaultFor usage in the sidebar caption text.
export { defaultCenterBaseLength };
export type { Mm };
