"use client";

import { useSyncExternalStore } from "react";
import { SliderRow } from "@/components/design/slider-row";
import { Button } from "@/components/ui/button";
import { useUnits } from "@/components/units-provider";
import { TwoOptionToggle } from "@/components/viewer/two-option-toggle";
import { formatDim } from "@/lib/geometry/measure-display";
import {
  raiseOfLift,
  raiseSlider,
  SIGHT_LIMIT_DEG,
  SIGHT_STEP_DEG,
  type RackAngles,
  type RackSeat,
} from "@/lib/geometry/shaping-bay";
import { ThreeDSectionHeading } from "./three-d-controls";
import { THREE_D_COPY } from "./three-d-copy";

/**
 * The shaping bay's controls in the panel (Phase 16, D-43, D-44): "controls to make this happen, 1 per plane, as
 * dragging can be a bit of a challenge sometimes." They change only the picture: never the board, never saved, never
 * the files (D-16, D-17). So a locked board keeps them (`lockExempt`, `data-lock-exempt`), and they dim only while a
 * canvas message shows.
 *
 * The readings live in a small store the screen owns (`makeRackStore`), so during a drag only these components render
 * again, not the screen around them (the rack's Pattern 7). A thumb never feeds the turn: each control hands the screen
 * its own plane, and the screen writes it over the turn's exact angles.
 */

/** What the panel reads: the board's three planes as they are shown, and Look Down the Rail. */
export interface RackReading extends RackAngles {
  sight: number;
}

export interface RackStore {
  get(): RackReading;
  set(next: RackReading): void;
  subscribe(listener: () => void): () => void;
}

/** The store. `get` returns the same object between changes, as `useSyncExternalStore` asks. */
export function makeRackStore(): RackStore {
  let reading: RackReading = { swing: 0, lift: 0, roll: 0, sight: 0 };
  const listeners = new Set<() => void>();
  return {
    get: () => reading,
    set(next) {
      reading = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function useReading(store: RackStore): RackReading {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** Which end a Raise control lifts. */
export type RaisedEnd = "nose" | "tail";

/** One Raise control: how high that end stands off its rack, the other end pivoting on its own (D-44). */
function RaiseRow({
  end,
  liftDeg,
  seat,
  onRaise,
  disabled,
}: {
  end: RaisedEnd;
  /** This end's own lift: 0 unless this is the end that is up. */
  liftDeg: number;
  seat: Pick<RackSeat, "at">;
  onRaise: (end: RaisedEnd, heightMm: number) => void;
  disabled: boolean;
}) {
  const { system } = useUnits();
  const height = raiseOfLift(liftDeg, seat);
  const slider = raiseSlider(height, seat, system);
  const text = liftDeg > 0 ? formatDim(height, system) : THREE_D_COPY.onTheRack;
  return (
    <SliderRow
      lockExempt
      label={`${end === "nose" ? THREE_D_COPY.raiseNose : THREE_D_COPY.raiseTail} — ${text}`}
      value={slider.value}
      min={slider.min}
      max={slider.max}
      step={slider.step}
      onValueChange={(v) => onRaise(end, slider.toMm(v))}
      disabled={disabled}
      sliderLabel={end === "nose" ? THREE_D_COPY.raiseNose : THREE_D_COPY.raiseTail}
      sliderValueText={THREE_D_COPY.raiseSpoken(end, liftDeg > 0 ? text : null)}
    />
  );
}

/**
 * ON THE RACKS: Flip the Board, one press and never a pressed state, then one control per plane. A full turn of Rotate
 * on Side on every device: no switch decides its range, and a phone's slider is as long as a computer's.
 */
export function ThreeDOnTheRacks({
  store,
  seat,
  onFlip,
  onRaise,
  onRoll,
  disabled,
}: {
  store: RackStore;
  /** How the board sits on its racks; none while it can't be built. */
  seat: Pick<RackSeat, "at"> | null;
  onFlip: () => void;
  onRaise: (end: RaisedEnd, heightMm: number) => void;
  onRoll: (deg: number) => void;
  /** True while a canvas message shows instead of the board (UI-SPEC §8). */
  disabled: boolean;
}) {
  const reading = useReading(store);
  const roll = Math.round(reading.roll) + 0;
  return (
    <div className="flex flex-col gap-2" data-three-d-racks>
      <ThreeDSectionHeading>{THREE_D_COPY.racksHeading}</ThreeDSectionHeading>
      <Button type="button" variant="outline" className="w-full" data-lock-exempt disabled={disabled} onClick={onFlip}>
        {THREE_D_COPY.flip}
      </Button>
      <RaiseRow
        end="nose"
        liftDeg={Math.max(0, reading.lift)}
        seat={seat ?? { at: 0 }}
        onRaise={onRaise}
        disabled={disabled || !seat}
      />
      <RaiseRow
        end="tail"
        liftDeg={Math.max(0, -reading.lift)}
        seat={seat ?? { at: 0 }}
        onRaise={onRaise}
        disabled={disabled || !seat}
      />
      <SliderRow
        lockExempt
        label={THREE_D_COPY.rotateOnSide}
        displayValue={THREE_D_COPY.rollValue(roll)}
        value={roll}
        min={-180}
        max={180}
        step={1}
        onValueChange={onRoll}
        disabled={disabled}
        sliderLabel={THREE_D_COPY.rotateOnSide}
        sliderValueText={THREE_D_COPY.rollSpoken(roll)}
      />
    </div>
  );
}

/**
 * Look Down the Rail (the founder, D-44): "I want to be able to look down the rail of the board and shift my view slightly to
 * follow the curve of the outline." It moves the eye round the board, a little either way, and nothing else.
 */
export function ThreeDLookDownRail({
  store,
  onSight,
  disabled,
}: {
  store: RackStore;
  onSight: (deg: number) => void;
  disabled: boolean;
}) {
  const { sight } = useReading(store);
  return (
    <SliderRow
      lockExempt
      label={THREE_D_COPY.lookDownRail}
      displayValue={THREE_D_COPY.lookValue(sight)}
      value={sight}
      min={-SIGHT_LIMIT_DEG}
      max={SIGHT_LIMIT_DEG}
      step={SIGHT_STEP_DEG}
      onValueChange={onSight}
      disabled={disabled}
      leftHint={THREE_D_COPY.lookLeft}
      rightHint={THREE_D_COPY.lookRight}
      sliderLabel={THREE_D_COPY.lookDownRail}
      sliderValueText={THREE_D_COPY.lookSpoken(sight)}
    />
  );
}

/** What a drag does (D-43). */
export type DragMode = "turn" | "walk";

/** The two-way switch: a drag turns the board, or walks you round it. The sliders and the buttons work in both. */
export function ThreeDModeSwitch({
  mode,
  onMode,
  disabled,
}: {
  mode: DragMode;
  onMode: (mode: DragMode) => void;
  disabled: boolean;
}) {
  return (
    <div data-lock-exempt data-three-d-mode>
      <TwoOptionToggle
        data-lock-exempt
        options={["turn", "walk"]}
        labels={[THREE_D_COPY.modeTurn, THREE_D_COPY.modeWalk]}
        value={mode}
        onChange={onMode}
        ariaLabel={THREE_D_COPY.modeGroup}
        disabled={disabled}
        className="grid grid-cols-2"
      />
    </div>
  );
}
