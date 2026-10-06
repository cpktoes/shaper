/**
 * The Board Rack's timings and thresholds (Phase 15; sketches 010 and 011, UI-SPEC §5 and §12).
 *
 * How long a hold takes, how far a mouse moves before a press becomes a drag, how close to the
 * screen's edge a carried board scrolls the rack, and how long each glide lasts — all in ONE place,
 * so a figure the founder tunes on a real device moves once and every part of the rack follows.
 * The few small decisions built on them (is this press a drag, a swipe or a hold yet? how far
 * along is a glide?) live here too, as plain functions the rack's components call from their
 * pointer events.
 *
 * Pure TypeScript — no React, browser API or database import — so every rule here can be verified
 * in isolation, exactly like every module under lib/geometry/ (CLAUDE.md Rule 1).
 */

/** How long a finger must stay still on the phone's rack to pick a board up. */
export const HOLD_MS = 420;
/** When the held board starts to swell, showing the hold is on its way. */
export const SWELL_FROM_MS = 120;
/** How big the held board has swelled by the time the hold completes. */
export const SWELL_SCALE = 1.06;
/** How far a mouse or pen moves (in dots) before a press on a board becomes a drag. */
export const MOUSE_DRAG_THRESHOLD = 6;
/** How far a finger moves before the hold completes for the press to be a swipe instead. */
export const TOUCH_SWIPE_THRESHOLD = 8;
/** How close to the screen's edge a carried board scrolls the rack. */
export const EDGE_ZONE = 46;
/** The fastest the rack scrolls under a carried board, in dots a frame, right at the edge. */
export const EDGE_MAX_STEP = 12;
/** How long the cursor rests before the nearest board finishes turning (the hover rack). */
export const HOVER_REST_MS = 180;
/** How long the phone's track is still before its middle board finishes turning. */
export const SWIPE_SETTLE_MS = 120;
/** How long a board takes to settle fully turned. */
export const SETTLE_MS = 200;
/** How long the other boards take to slide into a carried board's gap. */
export const SLOT_SLIDE_MS = 110;
/** How long the hover rack's caption takes to glide under a newly turned board. */
export const CAPTION_GLIDE_MS = 160;
/** How long a picked-up board takes to lift. */
export const LIFT_MS = 100;
/** How long a dropped board takes to land. */
export const DROP_MS = 120;
/** A rack status line ("Moved to 3rd of 15", ...): fade in, stay, fade out. */
export const STATUS_IN_MS = 120;
export const STATUS_HOLD_MS = 4000;
export const STATUS_OUT_MS = 200;

/** What kind of pointer pressed a board, as the browser reports it. */
export type RackPointerType = "mouse" | "pen" | "touch";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * A press on the hover rack (a computer) after moving `movedPx` dots: still a possible click, or
 * a drag once a mouse or pen has moved past the threshold. A finger on the hover rack (a touch
 * laptop, an iPad with a trackpad that reads as a mouse) only ever taps — it never starts a drag
 * there (D-05).
 */
export function hoverPressOutcome(
  pointerType: RackPointerType,
  movedPx: number,
): "pending" | "drag" | "tap-only" {
  if (pointerType === "touch") return "tap-only";
  return movedPx > MOUSE_DRAG_THRESHOLD ? "drag" : "pending";
}

/**
 * A press on the swipe rack (a phone) `elapsedMs` into it, having moved `movedPx` dots: a swipe if
 * the finger moved past the threshold before the hold completed, held once it has stayed still for
 * the whole hold, else still undecided. With the hold switched off (`holdEnabled` false — D-11's
 * fallback, boards then move from the ⋯ menu) a still finger never picks a board up.
 */
export function swipePressOutcome(
  elapsedMs: number,
  movedPx: number,
  holdEnabled: boolean,
): "pending" | "swipe" | "held" {
  const holdComplete = holdEnabled && elapsedMs >= HOLD_MS;
  if (holdComplete) return "held";
  if (movedPx > TOUCH_SWIPE_THRESHOLD) return "swipe";
  return "pending";
}

/** How far through its swell a held board is, 0 to 1: nothing until 120 ms, full at the hold. */
export function holdSwell(elapsedMs: number): number {
  return clamp((elapsedMs - SWELL_FROM_MS) / (HOLD_MS - SWELL_FROM_MS), 0, 1);
}

/** The held board's drawn size, from 1 up to `SWELL_SCALE` as the hold completes. */
export function swellScale(elapsedMs: number): number {
  return 1 + (SWELL_SCALE - 1) * holdSwell(elapsedMs);
}

/** A glide that starts quickly and slows into place: 0 at the start, 1 at the end. */
export function easeOut(t: number): number {
  const progress = clamp(t, 0, 1);
  return 1 - (1 - progress) ** 3;
}

/**
 * A value `elapsedMs` into a glide of `durationMs` from `from` to `to`, eased out. With `reduced`
 * true (the shaper asked their device for less motion, SPEC constraint 8) it is at `to` at once.
 */
export function tween(
  from: number,
  to: number,
  elapsedMs: number,
  durationMs: number,
  reduced: boolean,
): number {
  if (reduced || !(durationMs > 0)) return to;
  return from + (to - from) * easeOut(elapsedMs / durationMs);
}

/**
 * How many dots a frame the rack scrolls under a board carried to `x`: negative within `zone` of
 * the left edge, positive within `zone` of the right, 0 elsewhere — ramping from 0 at the zone's
 * inner edge to `maxStep` at the screen's edge, and never faster than that past it.
 */
export function edgeScrollStep(
  x: number,
  viewportWidth: number,
  zone: number = EDGE_ZONE,
  maxStep: number = EDGE_MAX_STEP,
): number {
  if (!(zone > 0)) return 0;
  if (x < zone) return -maxStep * clamp((zone - x) / zone, 0, 1);
  const rightStart = viewportWidth - zone;
  if (x > rightStart) return maxStep * clamp((x - rightStart) / zone, 0, 1);
  return 0;
}
