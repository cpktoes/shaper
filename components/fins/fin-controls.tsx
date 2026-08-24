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
import { formatFeetInches, formatInchesFraction, inchesToMm, mmToInches, type Mm } from "@/lib/geometry/units";
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
function sliderValue(v: number | readonly number[]): number {
  return typeof v === "number" ? v : (v[0] ?? 0);
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1.5 border-b border-surf-muted/20 pb-2 text-xs font-display text-surf-black uppercase tracking-architectural font-extrabold">
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
      className="flex w-full items-center justify-between border-b border-surf-muted/20 pb-2 pl-3 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold"
    >
      <span>{children}</span>
      <span>{open ? "▾" : "▸"}</span>
    </button>
  );
}

function RangeRow({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
  leftHint,
  rightHint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onValueChange: (value: number) => void;
  leftHint?: string;
  rightHint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-surf-muted font-normal">{label}</div>
      <Slider
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onValueChange(sliderValue(v))}
        className="slider-accent"
      />
      {(leftHint || rightHint) && (
        <div className="mt-0.5 flex justify-between text-xs text-surf-muted font-normal">
          <span>{leftHint}</span>
          <span>{rightHint}</span>
        </div>
      )}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        `cursor-pointer rounded-md border px-1 py-2.5 text-[11px] font-bold ${
          active
            ? "border-surf-black bg-surf-accent-blue text-surf-base"
            : "border-surf-muted/30 bg-surf-base text-surf-black"
        } ${className}`
      }
    >
      {children}
    </button>
  );
}

/** A base-length field: text + Override button until pressed, then a number input, matching the
 * prototype's baseLenXEditing toggle (Fins.dc.html lines 241-249 and onToggleBaseLenXEdit). */
function BaseLengthField({
  label,
  valueIn,
  overridden,
  editing,
  onOverride,
  onChangeIn,
}: {
  label: string;
  valueIn: number;
  overridden: boolean;
  editing: boolean;
  onOverride: () => void;
  onChangeIn: (valueIn: number) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-sm text-surf-muted font-normal">{label}</div>
      {editing ? (
        <input
          type="number"
          min={BASE_LEN_BOUNDS.min}
          max={BASE_LEN_BOUNDS.max}
          step={BASE_LEN_BOUNDS.step}
          value={valueIn}
          onChange={(e) => onChangeIn(clampFinite(parseFloat(e.target.value), BASE_LEN_BOUNDS.min, BASE_LEN_BOUNDS.max))}
          className="w-full rounded-md border border-outline-sidebar-input-border bg-outline-sidebar-input-bg px-2 py-1.5 text-[13px] text-outline-sidebar-text"
        />
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">
            {formatInchesFraction(inchesToMm(valueIn), 16)}
            {!overridden && " standard"}
          </span>
          <button
            type="button"
            onClick={onOverride}
            className="cursor-pointer rounded-md border border-surf-muted/30 px-2.5 py-1 text-[11px] text-outline-sidebar-text"
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
  const [editingForward, setEditingForward] = useState(false);
  const [editingRear, setEditingRear] = useState(false);
  const [editingCenter, setEditingCenter] = useState(false);
  const [editingRearOffTail, setEditingRearOffTail] = useState(false);

  const lengthIn = mmToInches(spec.boardLength);
  const lengthFeet = Math.floor(lengthIn / 12);
  const lengthInches = Math.round(lengthIn - lengthFeet * 12);
  const setLengthIn = (totalIn: number) => onChange({ boardLength: inchesToMm(clampFinite(totalIn, 48, 144)) });

  const w12In = mmToInches(spec.tailWidth12);

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

  return (
    <div className="flex h-full flex-col gap-5">
      <div>
        <div className="text-lg leading-tight font-display text-surf-black uppercase tracking-architectural font-extrabold">Fin Setup &amp; Placement</div>
        <div className="mt-0.5 text-sm text-surf-muted font-normal">
          Quantitative reference · trailing-edge convention
        </div>
      </div>

      <div className="flex items-center justify-between gap-2.5 border-b border-outline-sidebar-divider pb-1.5">
        <div className="text-xs font-display text-surf-black uppercase tracking-architectural font-extrabold">Inputs</div>
        <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-surf-muted font-normal">
          <Checkbox checked={importTemplate} onCheckedChange={() => onToggleImportTemplate()} />
          Import Template Values
        </label>
      </div>

      <div style={{ opacity: importTemplate ? 0.45 : 1 }}>
        <div className="mb-1.5 text-sm text-surf-muted font-normal">
          Board Length — {formatFeetInches(spec.boardLength)}
        </div>
        <div className="mb-2 flex gap-2">
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
        </div>
        <Slider
          value={lengthIn}
          min={48}
          max={144}
          step={1}
          disabled={importTemplate}
          onValueChange={(v) => setLengthIn(sliderValue(v))}
          className="slider-accent"
        />
      </div>

      <div style={{ opacity: importTemplate ? 0.45 : 1 }}>
        <div className="mb-1.5 text-sm text-surf-muted font-normal">
          Tail Width @ 12&quot; — {formatInchesFraction(spec.tailWidth12, 16)}
        </div>
        <Slider
          value={w12In}
          min={10}
          max={18}
          step={0.125}
          disabled={importTemplate}
          onValueChange={(v) => onChange({ tailWidth12: inchesToMm(clampFinite(sliderValue(v), 10, 18)) })}
          className="slider-accent"
        />
      </div>

      <div style={{ opacity: importTemplate ? 0.45 : 1 }}>
        <div className="mb-1.5 text-sm text-surf-muted font-normal">
          Tail Shape — {TAIL_SHAPE_LABEL[spec.tailShape as IconTailShape]}
        </div>
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
                "flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-2 " +
                (spec.tailShape === shape
                  ? "border-surf-black bg-surf-accent-blue text-surf-base"
                  : "border-surf-muted/30 bg-surf-base text-surf-black")
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
        <div className="mb-1.5 text-sm text-surf-muted font-normal">Fin Setup</div>
        <div className="mt-2 mb-6 grid grid-cols-5 gap-2.5">
          {FIN_SETUP_ORDER.map((setup) => {
            const opt = FIN_SETUPS.find((o) => o.value === setup)!;
            return (
              <button
                key={setup}
                type="button"
                onClick={() => applySetup(setup)}
                className={
                  "flex cursor-pointer flex-col items-center gap-0.5 rounded-lg border px-0.5 py-2 " +
                  (spec.finSetup === setup
                    ? "border-surf-black bg-surf-accent-blue text-surf-base"
                    : "border-surf-muted/30 bg-surf-base text-surf-black")
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
          <div className="mb-1.5 text-sm text-surf-muted font-normal">Thruster Model</div>
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
          <div>
            <div className="mb-1.5 text-sm text-surf-muted font-normal">Quad Model</div>
            <div className="mt-2 mb-6 grid grid-cols-2 gap-2.5">
              {QUAD_REAR_MODELS.map((opt) => (
                <PillButton
                  key={opt.value}
                  active={spec.quadRearModel === opt.value}
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
          </div>
          {flags.quadCenterFinAvailable && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-surf-muted font-normal">
              <Checkbox checked={spec.quadCenterFinOn} onCheckedChange={() => onChange({ quadCenterFinOn: !spec.quadCenterFinOn })} />
              Add 5th/Center fin
            </label>
          )}
          {flags.isLongboardQuad && (
            <div className="text-sm text-surf-muted font-normal">Longboard quad model has no center-fin option.</div>
          )}
        </>
      )}

      {spec.finSetup === "twin" && (
        <div>
          <div className="mb-1.5 text-sm text-surf-muted font-normal">Twin Template</div>
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
                <div className="mb-2.5 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold">{flags.centerSectionLabel}</div>
                <div className="mb-2.5">
                  <BaseLengthField
                    label={flags.centerBaseLenFieldLabel}
                    valueIn={mmToInches(spec.advanced.baseLenCenter)}
                    overridden={spec.advanced.baseLenCenterOverridden}
                    editing={editingCenter}
                    onOverride={() => {
                      setEditingCenter(true);
                      updateAdvanced({ baseLenCenterOverridden: true });
                    }}
                    onChangeIn={(v) => updateAdvanced({ baseLenCenter: inchesToMm(v), baseLenCenterOverridden: true })}
                  />
                </div>
                <RangeRow
                  label={`Forward/Aft position — ${formatInchesFraction(resolved.centerOffTail, 16)}`}
                  value={mmToInches(spec.advanced.centerPositionOffset)}
                  min={POS_BOUNDS.min}
                  max={POS_BOUNDS.max}
                  step={POS_BOUNDS.step}
                  onValueChange={(v) => updateAdvanced({ centerPositionOffset: inchesToMm(v) })}
                  leftHint="Drivey (near tail)"
                  rightHint="Loose (far from tail)"
                />
              </div>
            )}

            {flags.hasForwardSection && (
              <div className="border-t border-outline-sidebar-divider pt-4">
                <div className="mb-2.5 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold">
                  Forward Fins — {flags.forwardSectionLabel}
                </div>
                <div className="mb-2.5">
                  <BaseLengthField
                    label="Fin Base Length"
                    valueIn={mmToInches(spec.advanced.baseLenForward)}
                    overridden={spec.advanced.baseLenForwardOverridden}
                    editing={editingForward}
                    onOverride={() => {
                      setEditingForward(true);
                      updateAdvanced({ baseLenForwardOverridden: true });
                    }}
                    onChangeIn={(v) => updateAdvanced({ baseLenForward: inchesToMm(v), baseLenForwardOverridden: true })}
                  />
                </div>
                <div className="mb-2.5">
                  <RangeRow
                    label={`Forward/Aft position — ${formatInchesFraction(
                      spec.finSetup === "2plus1" ? resolved.sideOffTail : spec.finSetup === "twin" ? resolved.twinOffTail : resolved.frontOffTail,
                      16,
                    )} (off-rail unchanged)`}
                    value={mmToInches(spec.advanced.forwardPositionOffset)}
                    min={POS_BOUNDS.min}
                    max={POS_BOUNDS.max}
                    step={POS_BOUNDS.step}
                    onValueChange={(v) => updateAdvanced({ forwardPositionOffset: inchesToMm(v) })}
                    leftHint="Loose (fwd)"
                    rightHint="Drivey (back)"
                  />
                </div>
                <RangeRow
                  label={`Toe-in — ${formatInchesFraction(resolved.forwardToe, 16)}`}
                  value={mmToInches(resolved.forwardToe)}
                  min={TOE_BOUNDS.min}
                  max={TOE_BOUNDS.max}
                  step={TOE_BOUNDS.step}
                  onValueChange={(v) =>
                    updateAdvanced({ forwardToeOverride: inchesToMm(clampFinite(v, TOE_BOUNDS.min, TOE_BOUNDS.max)) })
                  }
                  leftHint="Drivey (less)"
                  rightHint="Loose (more)"
                />
                {flags.showFrontToeTableLink && (
                  <button
                    type="button"
                    onClick={onOpenToeTable}
                    className="mt-2 cursor-pointer bg-transparent p-0 text-[11px] font-bold text-surf-accent-blue underline"
                  >
                    View precise McKee toe-in aim tables ⤢
                  </button>
                )}
              </div>
            )}

            {flags.hasRearSection && (
              <div className="border-t border-outline-sidebar-divider pt-4">
                <div className="mb-2.5 text-[10px] font-display text-surf-black uppercase tracking-architectural font-extrabold">
                  Rear Fins — {flags.rearSectionLabel}
                </div>
                <div className="mb-2.5">
                  <BaseLengthField
                    label="Fin Base Length"
                    valueIn={mmToInches(spec.advanced.baseLenRear)}
                    overridden={spec.advanced.baseLenRearOverridden}
                    editing={editingRear}
                    onOverride={() => {
                      setEditingRear(true);
                      updateAdvanced({ baseLenRearOverridden: true });
                    }}
                    onChangeIn={(v) => updateAdvanced({ baseLenRear: inchesToMm(v), baseLenRearOverridden: true })}
                  />
                </div>
                {flags.showRearOffTailOverride && (
                  <div className="mb-2.5">
                    <div className="mb-1.5 text-sm text-surf-muted font-normal">
                      Rear Off-Tail Position (½ front off-tail + 1/4&quot;)
                    </div>
                    {editingRearOffTail ? (
                      <input
                        type="number"
                        min={OFF_TAIL_OVERRIDE_BOUNDS.min}
                        max={OFF_TAIL_OVERRIDE_BOUNDS.max}
                        step={OFF_TAIL_OVERRIDE_BOUNDS.step}
                        value={mmToInches(resolved.quadRearOffTailBase)}
                        onChange={(e) =>
                          updateAdvanced({
                            quadRearOffTailOverride: inchesToMm(
                              clampFinite(parseFloat(e.target.value), OFF_TAIL_OVERRIDE_BOUNDS.min, OFF_TAIL_OVERRIDE_BOUNDS.max),
                            ),
                            quadRearOffTailOverridden: true,
                          })
                        }
                        className="w-full rounded-md border border-outline-sidebar-input-border bg-outline-sidebar-input-bg px-2 py-1.5 text-[13px] text-outline-sidebar-text"
                      />
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">
                          {formatInchesFraction(resolved.quadRearOffTailBase, 16)}
                          {spec.advanced.quadRearOffTailOverridden ? " override" : ' auto (½ front off-tail + 1/4")'}
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
                          className="cursor-pointer rounded-md border border-surf-muted/30 px-2.5 py-1 text-[11px] text-outline-sidebar-text"
                        >
                          Override
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-2.5">
                  <RangeRow
                    label={`Forward/Aft position — ${formatInchesFraction(resolved.pairOffTail, 16)} (off-rail unchanged)`}
                    value={mmToInches(spec.advanced.rearPositionOffset)}
                    min={POS_BOUNDS.min}
                    max={POS_BOUNDS.max}
                    step={POS_BOUNDS.step}
                    onValueChange={(v) => updateAdvanced({ rearPositionOffset: inchesToMm(v) })}
                    leftHint="Loose (fwd)"
                    rightHint="Drivey (back)"
                  />
                </div>
                {flags.showRearOffRailSlider && (
                  <div className="mb-2.5">
                    <RangeRow
                      label={`Off-Rail — ${formatInchesFraction(resolved.quadRearOffRail, 16)}`}
                      value={mmToInches(resolved.quadRearOffRail)}
                      min={OFF_RAIL_BOUNDS.min}
                      max={OFF_RAIL_BOUNDS.max}
                      step={OFF_RAIL_BOUNDS.step}
                      onValueChange={(v) =>
                        updateAdvanced({
                          quadRearOffRailOverride: inchesToMm(clampFinite(v, OFF_RAIL_BOUNDS.min, OFF_RAIL_BOUNDS.max)),
                        })
                      }
                    />
                  </div>
                )}
                <RangeRow
                  label={`Toe-in — ${formatInchesFraction(resolved.rearToe, 16)}`}
                  value={mmToInches(resolved.rearToe)}
                  min={TOE_BOUNDS.min}
                  max={TOE_BOUNDS.max}
                  step={TOE_BOUNDS.step}
                  onValueChange={(v) =>
                    updateAdvanced({ rearToeOverride: inchesToMm(clampFinite(v, TOE_BOUNDS.min, TOE_BOUNDS.max)) })
                  }
                  leftHint="Drivey (less)"
                  rightHint="Loose (more)"
                />
                {flags.showRearToeTableLink && (
                  <button
                    type="button"
                    onClick={onOpenToeTable}
                    className="mt-2 cursor-pointer bg-transparent p-0 text-[11px] font-bold text-surf-accent-blue underline"
                  >
                    View precise McKee toe-in aim tables ⤢
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={resetAdvancedSettings}
              className="cursor-pointer border-t border-surf-muted/20 pt-4 text-left text-xs font-bold text-surf-accent-blue"
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
            <label className="mb-4 flex cursor-pointer items-center gap-1.5 text-sm text-surf-muted font-normal">
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
