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
import { useControlsLocked } from "@/components/design/use-controls-locked";
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

// Fin Base Length runs 2 1/2" to 10 1/2" — the top raised from 7 1/2" on the founder's word (fast task 156,
// 2026-10-08) so a big keel or a longboard's single fin can be set on the slider.
const BASE_LEN_BOUNDS = { min: 2.5, max: 10.5, step: 0.125 };
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
      data-lock-exempt
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
  // Every pill here changes the board, so a locked board greys them all (quick 261008-lsy, Plan 02).
  const locked = useControlsLocked();
  const off = disabled || locked;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || locked}
      className={
        // 09-REVIEW.md WR-02: hand-rolled, not the shared Button component, so it never got
        // Button's own coarse:h-11 for free -- coarse:min-h-11 mirrors that same pointer-keyed
        // rule by hand (a finger needs 44px; a mouse at any width still gets today's height).
        `focus-ring-accent rounded-md border px-1 py-2.5 text-[11px] font-bold coarse:min-h-11 ${off ? "cursor-not-allowed opacity-40" : "cursor-pointer"} ${
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

/** The label over a Fin Base Length slider: the value, and "(standard)" until the shaper has moved
 * the slider — the base length then stays the shaper's own until they move it again. Fast task 155
 * (2026-10-08): the founder retired the text box and its Override button ("doesn't work well on a
 * phone … funny behaviour on a computer"); dragging the familiar slider is the override now. The
 * slider's domain is the caller's `measureSlider` view against `BASE_LEN_BOUNDS`, so nothing here
 * converts (CLAUDE.md Rule 2). */
function baseLengthLabel(label: string, value: Mm, overridden: boolean, system: UnitsSystem): string {
  return `${label} — ${formatMark(value, system)}${overridden ? "" : " (standard)"}`;
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
  const locked = useControlsLocked();
  // A locked board greys every label and caption beside a greyed control (the look SliderRow rows have).
  const dim = locked ? " opacity-40" : "";
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

  // Each Fin Base Length field's own display-domain bounds/step/toMm (D-06: 64-266mm stepping 1
  // in Metric, 2.5-10.5in stepping 1/8 in Imperial since fast task 156) — one measureSlider call per field,
  // computed here so the slider itself never converts (CLAUDE.md Rule 2).
  const baseLenCenterSlider = measureSlider(spec.advanced.baseLenCenter, BASE_LEN_BOUNDS, BASE_LEN_BOUNDS.step, 1, system);
  const baseLenForwardSlider = measureSlider(spec.advanced.baseLenForward, BASE_LEN_BOUNDS, BASE_LEN_BOUNDS.step, 1, system);
  const baseLenRearSlider = measureSlider(spec.advanced.baseLenRear, BASE_LEN_BOUNDS, BASE_LEN_BOUNDS.step, 1, system);

  const updateAdvanced = (patch: Partial<FinAdvancedSpec>) => onChange({ advanced: { ...spec.advanced, ...patch } });

  const applySetup = (setup: FinSetup) => {
    setEditingRearOffTail(false);
    onChange({ finSetup: setup, advanced: resetAdvanced(setup) });
  };

  const resetAdvancedSettings = () => {
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
    // No `h-full` here, on purpose: a column as tall as the scrolling box it sits in is harmless while
    // nothing follows it, but the Back and Next pair now follows it, and then the pair lands at the
    // box's own height with the rest of these controls (the fin model's own settings) spilling out
    // underneath it — seen as the pair drawn over "Thruster Model" on a computer.
    <div className="flex flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-ink uppercase tracking-architectural font-extrabold">Fin Setup &amp; Placement</div>
        <div className="mt-0.5 text-sm text-surf-ink-muted font-normal">
          Quantitative reference · trailing-edge convention
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5 border-b border-outline-sidebar-divider pb-1.5">
        <div className="text-xs font-display text-surf-ink uppercase tracking-architectural font-extrabold">Inputs</div>
        <label className={`flex cursor-pointer items-center gap-1.5 coarse:min-h-11 whitespace-nowrap text-xs text-surf-ink-muted font-normal${dim}`}>
          <Checkbox disabled={locked} checked={importTemplate} onCheckedChange={() => onToggleImportTemplate()} />
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
      <div style={{ opacity: locked || importTemplate ? 0.45 : 1 }}>
        <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>
          Board Length — {formatLength(spec.boardLength, system)}
        </div>
        <div className="mb-2 flex gap-2">
          {system === "imperial" ? (
            <>
              <Select
                value={lengthFeet}
                onValueChange={(v) => setLengthIn((v as number) * 12 + lengthInches)}
                disabled={locked || importTemplate}
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
                disabled={locked || importTemplate}
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
              disabled={locked || importTemplate}
            />
          )}
        </div>
        <Slider
          value={boardLength.value}
          min={boardLength.min}
          max={boardLength.max}
          step={boardLength.step}
          disabled={locked || importTemplate}
          onValueChange={(v) => onChange({ boardLength: boardLength.toMm(sliderValue(v)) })}
          className="slider-accent"
        />
      </div>

      <div style={{ opacity: locked || importTemplate ? 0.45 : 1 }}>
        <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>
          {`Tail Width @ ${stationLabel(system)} — ${formatDim(spec.tailWidth12, system)}`}
        </div>
        <Slider
          value={tailWidth12Slider.value}
          min={tailWidth12Slider.min}
          max={tailWidth12Slider.max}
          step={tailWidth12Slider.step}
          disabled={locked || importTemplate}
          onValueChange={(v) => onChange({ tailWidth12: tailWidth12Slider.toMm(sliderValue(v)) })}
          className="slider-accent"
        />
      </div>

      <div style={{ opacity: locked || importTemplate ? 0.45 : 1 }}>
        <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>
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
              disabled={locked}
              onClick={() => onChange({ tailShape: shape as FinTailShape })}
              className={
                "focus-ring-accent flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-2 coarse:min-h-11 disabled:cursor-default disabled:opacity-40 " +
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
        <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>Fin Setup</div>
        {/* 09-REVIEW.md WR-02: same hand-rolled coarse:min-h-11 as the tail-shape grid above. */}
        <div className="mt-2 mb-6 grid grid-cols-5 gap-2.5">
          {FIN_SETUP_ORDER.map((setup) => {
            const opt = FIN_SETUPS.find((o) => o.value === setup)!;
            return (
              <button
                key={setup}
                type="button"
                disabled={locked}
                onClick={() => applySetup(setup)}
                className={
                  "focus-ring-accent flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-2 coarse:min-h-11 disabled:cursor-default disabled:opacity-40 " +
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
          <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>Thruster Model</div>
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
            <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>Quad Model</div>
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
              <div className={`mt-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>
                McKee Longboard needs a board 8&apos;0&quot; or longer.
              </div>
            )}
          </div>
          {flags.quadCenterFinAvailable && (
            <label className={`flex cursor-pointer items-center gap-2 coarse:min-h-11 text-sm text-surf-ink-muted font-normal${dim}`}>
              <Checkbox disabled={locked} checked={spec.quadCenterFinOn} onCheckedChange={() => onChange({ quadCenterFinOn: !spec.quadCenterFinOn })} />
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
          <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>Twin Template</div>
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
                  <SliderRow
                    density="tight"
                    label={baseLengthLabel(flags.centerBaseLenFieldLabel, spec.advanced.baseLenCenter, spec.advanced.baseLenCenterOverridden, system)}
                    value={baseLenCenterSlider.value}
                    min={baseLenCenterSlider.min}
                    max={baseLenCenterSlider.max}
                    step={baseLenCenterSlider.step}
                    onValueChange={(v) => updateAdvanced({ baseLenCenter: baseLenCenterSlider.toMm(v), baseLenCenterOverridden: true })}
                  />
                </div>
                <SliderRow
                  density="tight"
                  label={`Aft/Forward position — ${formatMark(resolved.centerOffTail, system)}`}
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
                  <SliderRow
                    density="tight"
                    label={baseLengthLabel("Fin Base Length", spec.advanced.baseLenForward, spec.advanced.baseLenForwardOverridden, system)}
                    value={baseLenForwardSlider.value}
                    min={baseLenForwardSlider.min}
                    max={baseLenForwardSlider.max}
                    step={baseLenForwardSlider.step}
                    onValueChange={(v) => updateAdvanced({ baseLenForward: baseLenForwardSlider.toMm(v), baseLenForwardOverridden: true })}
                  />
                </div>
                <div className="mb-2.5">
                  <SliderRow
                    density="tight"
                    label={`Aft/Forward position — ${formatMark(
                      spec.finSetup === "2plus1" ? resolved.sideOffTail : spec.finSetup === "twin" ? resolved.twinOffTail : resolved.frontOffTail,
                      system,
                    )} (off-rail unchanged)`}
                    value={forwardPositionSlider.value}
                    min={forwardPositionSlider.min}
                    max={forwardPositionSlider.max}
                    step={forwardPositionSlider.step}
                    onValueChange={(v) => updateAdvanced({ forwardPositionOffset: forwardPositionSlider.toMm(v) })}
                    leftHint="Drivey (back)"
                    rightHint="Loose (fwd)"
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
                    data-lock-exempt
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
                  <SliderRow
                    density="tight"
                    label={baseLengthLabel("Fin Base Length", spec.advanced.baseLenRear, spec.advanced.baseLenRearOverridden, system)}
                    value={baseLenRearSlider.value}
                    min={baseLenRearSlider.min}
                    max={baseLenRearSlider.max}
                    step={baseLenRearSlider.step}
                    onValueChange={(v) => updateAdvanced({ baseLenRear: baseLenRearSlider.toMm(v), baseLenRearOverridden: true })}
                  />
                </div>
                {flags.showRearOffTailOverride && (
                  <div className="mb-2.5">
                    <div className={`mb-1.5 text-sm text-surf-ink-muted font-normal${dim}`}>
                      {`Rear Off-Tail Position (½ front off-tail + ${quarterInchRuleText})`}
                    </div>
                    {editingRearOffTail ? (
                      <input
                        type="number"
                        disabled={locked}
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
                        <span className={`text-sm font-bold${dim}`}>
                          {formatMark(resolved.quadRearOffTailBase, system)}
                          {spec.advanced.quadRearOffTailOverridden ? " override" : ` auto (½ front off-tail + ${quarterInchRuleText})`}
                        </span>
                        <button
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            setEditingRearOffTail(true);
                            updateAdvanced({
                              quadRearOffTailOverridden: true,
                              quadRearOffTailOverride: spec.advanced.quadRearOffTailOverride ?? resolved.quadRearOffTailBase,
                            });
                          }}
                          className="focus-ring-accent cursor-pointer rounded-md border border-surf-line px-2.5 py-1 text-[11px] text-outline-sidebar-text disabled:cursor-default disabled:opacity-40"
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
                    label={`Aft/Forward position — ${formatMark(resolved.pairOffTail, system)} (off-rail unchanged)`}
                    value={rearPositionSlider.value}
                    min={rearPositionSlider.min}
                    max={rearPositionSlider.max}
                    step={rearPositionSlider.step}
                    onValueChange={(v) => updateAdvanced({ rearPositionOffset: rearPositionSlider.toMm(v) })}
                    leftHint="Drivey (back)"
                    rightHint="Loose (fwd)"
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
                    data-lock-exempt
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
              disabled={locked}
              onClick={resetAdvancedSettings}
              className="focus-ring-accent cursor-pointer border-t border-surf-line-faint pt-4 text-left text-xs font-bold text-surf-accent-ink disabled:cursor-default disabled:opacity-40"
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
              <Checkbox data-lock-exempt checked={showCallouts} onCheckedChange={onToggleCallouts} />
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
