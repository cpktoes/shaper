"use client";

/**
 * The phone's and iPad's Board Rack (Phase 15, sketch 009 B — "turns as it passes"; R6, D-04, D-07).
 *
 * A finger swipes; a mouse hovers (D-04, `board-rack.tsx` picks which). This rack is the device's own
 * sideways scroller, edge to edge, that settles one board in the middle of the screen. Every board
 * stands on its tail at ONE scale on one floor line and turns by its distance from the middle,
 * following the thumb on every frame with no lag — fully turned in the middle, edge-on a slot away —
 * and the track opens around the turning boards so nothing overlaps. When the scroll stops (a 120 ms
 * timer: older Safari has no scroll-end event) the board in the middle finishes its turn, every other
 * board closes, and that board's caption shows under the rack. Tapping a board at the side brings it
 * to the middle; tapping the middle board opens it.
 *
 * Built as three layers and a caption: a fixed picture behind the scroller (the dashed height lines
 * and the floor line, across the full width); the scroller itself (one invisible snap point per
 * board, one SVG drawing every board, and one real transparent `<button>` per board over that board's
 * room — its name for a screen reader, its focus ring and its tap); and a fixed picture above the
 * scroller holding the height-line labels in the 28-dot gutter, so a board passing the left edge
 * slides UNDER its label, never through it. The scroller is native — `overflow-x: auto` with
 * mandatory snapping — and the first and last boards reach the middle through the track's own width,
 * never padding on the scroller (old WebKit reads a scroller whose content box is empty as clipped).
 * No CSS 3D, no scroll-driven animation.
 *
 * As on the computer's rack, React renders every element once with a stable key and one
 * animation-frame loop writes the per-frame values — each board's `d`, `transform`, opacities,
 * `data-turn` and its button's `left` / `width` — straight onto the elements through refs. Nothing
 * that changes per frame is React state, the one scroll listener is passive and only schedules a
 * frame, and no markup is ever built from a string: a board's name is only ever React text.
 *
 * Every path is worked out from the board's own numbers through `lib/geometry/rack-art.ts` and every
 * position through `lib/geometry/rack-layout.ts` — both pure and tested. Every programmatic scroll
 * lands on an exact slot multiple, itself a snap point (WebKit bug 160622).
 *
 * Moving a board (15-09, sketch 011 A — the founder's pick): a finger held still on a board for
 * `HOLD_MS` lifts it — 12 dots up, edge-on, its edge in accent ink — and from then on the finger
 * carries it: it follows the finger exactly, every other board closes to its side profile at slot
 * spacing and slides aside to open a gap, and an accent drop mark draws under the floor at the gap.
 * Letting go drops it there; the rack then brings it to the middle and turns it. A finger that moves
 * more than `TOUCH_SWIPE_THRESHOLD` before the hold completes is an ordinary swipe that moves
 * nothing. The unsaved board is never lifted, and nothing lands in front of it (R9). The page stops
 * scrolling under a carried board through ONE non-passive `touchmove` listener registered when the
 * rack mounts (older Safari ignores one added at the touch's start) that cancels a move only while a
 * board is carried; scroll snap is off while carrying and back on once the drop has settled. The
 * whole path runs only while `holdEnabled` is true (D-11's switch, `holdToMoveEnabled`).
 */

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useReducedMotion } from "@/components/design/use-viewer-media";
import { useUnits } from "@/components/units-provider";
import { RACK_COPY } from "@/components/setup/rack-config";
import type { RackBoard } from "@/components/setup/use-rack-boards";
import { halfExtent, spineAnchorX, stringerPath, turnedBoardPath } from "@/lib/geometry/rack-art";
import {
  CARRY_LIFT,
  DROP_MARK_WIDTH,
  LABEL_GUTTER,
  SPINE_HALO_WIDTH,
  SPINE_WORD_GAP,
  SWIPE_CAPTION_HEIGHT,
  SWIPE_TOP_PAD,
  SWIPE_WORD_SIZE,
  boardExtra,
  fitSpineWords,
  rackHeightLines,
  rackRoomOffsets,
  rackScale,
  spineWordColumn,
  swipeMiddleIndex,
  swipePadding,
  swipeRackHeightFromScroller,
  swipeScrollLeftFor,
  swipeSlotAt,
  swipeSlotCentre,
  swipeSlotFor,
  swipeTrackWidth,
  turnAngle,
  type SpineFit,
} from "@/lib/geometry/rack-layout";
import { formatSummaryLine } from "@/lib/geometry/summary-line";
import {
  DROP_MS,
  LIFT_MS,
  SETTLE_MS,
  SLOT_SLIDE_MS,
  SWELL_SCALE,
  SWIPE_SETTLE_MS,
  TOUCH_SWIPE_THRESHOLD,
  edgeScrollStep,
  swellScale,
  swipePressOutcome,
  tween,
} from "@/lib/models/rack-gesture";

/** A board fully turned, showing its outline. */
const HALF_TURN = Math.PI / 2;
/** The room a board's vertical words take beside it, at the phone's starting size — the most they
 * ever take. Every turning board makes this much room as well as its outline, because its neighbour
 * stands its words in the gap beside it; and the slot is wide enough to hold it at rest. */
const WORD_COLUMN = spineWordColumn(SWIPE_WORD_SIZE);
/** The words start this far above the floor and stop this far below the rack's top (R - 8). */
const WORD_END_ROOM = 4;
/** The height-line labels' size. */
const LABEL_SIZE = 10;
/** Room kept between a board's button and the scroller's top and bottom, so its 3-dot focus ring is
 * never clipped by the scroller. */
const RING_ROOM = 4;
/** The drop mark's centre, this far under the floor line (inside the drop strip). */
const DROP_MARK_DROP = 7;
/** A tap that arrives this soon after a carried board was let go is the end of that carry, never a
 * tap that opens or centres a board. */
const CLICK_AFTER_DROP_MS = 500;

interface SwipeRackProps {
  /** The boards, in the order the rack shows them. */
  boards: readonly RackBoard[];
  /** The board in the middle, turned, with its caption under the rack. */
  turnedKey: string | null;
  /** The board open in the editor, whose button says so (`aria-current`, D-07). */
  openKey: string | null;
  /** True while a dialog is open: the rack holds exactly still. */
  frozen: boolean;
  /** A board has settled in the middle and finished turning. */
  onTurn: (key: string) => void;
  /** The middle board was tapped to open. */
  onOpen: (key: string) => void;
  /** The caption to show under the rack for the turned board. */
  caption: (board: RackBoard) => ReactNode;
  /** Focus this board's button (and bring it to the middle) when it changes. */
  focusKey?: string | null;
  /** A carried board was let go at rack place `toRackIndex` (or the unsaved board was held, at 0):
   * the rack's owner moves it (`moved`), leaves it where it was (`same`) or refuses (`refused`). */
  onMove?: (key: string, toRackIndex: number) => "moved" | "same" | "refused";
  /** Whether holding a board picks it up (D-11's switch, `holdToMoveEnabled("swipe")`). */
  holdEnabled?: boolean;
  /** A board was lifted (its name) or let go (null): the caption becomes the carrying line. */
  onCarry?: (name: string | null) => void;
}

type MoveResult = "moved" | "same" | "refused";

/** The elements the frame loop writes to, one set per board. */
interface BoardNodes {
  group?: SVGGElement | null;
  body?: SVGPathElement | null;
  stringer?: SVGPathElement | null;
  words?: SVGTextElement | null;
  button?: HTMLButtonElement | null;
}

/** A finger on a board, before the hold has completed. */
interface Press {
  key: string;
  pointerId: number;
  x0: number;
  y0: number;
  t0: number;
  /** The farthest the finger has moved from where it went down. */
  moved: number;
  clientX: number;
  scrollLeft0: number;
}

/** A board lifted and following the finger. */
interface Carry {
  key: string;
  pointerId: number;
  /** Its place in the rack when it was lifted. */
  fromIndex: number;
  startClientX: number;
  startScrollLeft: number;
  clientX: number;
  /** The scroller's left edge on the screen, for edge scrolling. */
  scrollerLeft: number;
  liftAt: number;
  /** How far the drawn board stood from its resting place at the lift (the room a turned board had
   * opened); it closes with the rest of the rack. */
  residual: number;
  /** The rack place it would land on now. */
  target: number;
}

/** A board let go, descending to the floor. */
interface Landing {
  key: string;
  start: number;
  fromLift: number;
  fromSwell: number;
}

/** A board's resting place along the track, gliding when its place in the rack changes. */
interface Slide {
  index: number;
  from: number;
  to: number;
  start: number;
  duration: number;
}

/** A board's turn on its way from one angle to another. */
interface Turn {
  from: number;
  to: number;
  start: number;
  duration: number;
}

/** Everything the frame loop keeps between frames — never React state. */
interface FrameState {
  started: boolean;
  /** Each board's current angle, by key. */
  theta: Map<string, number>;
  /** Each board's turn in progress, by key. */
  turn: Map<string, Turn>;
  /** The board the rack has settled on (or is settling on) in the middle. */
  settledKey: string | null;
  /** The last `turnedKey` the parent handed in. */
  propKey: string | null;
  /** True from a scroll event until the scroller has been still for `SWIPE_SETTLE_MS`. */
  scrolling: boolean;
  settleTimer: number;
  raf: number;
  /** The width, slot and count the scroller was last placed for, so a rotation or a new slot
   * re-centres the settled board. */
  placedFor: string;
  /** What was last written per board, so a frame touches only what changed. */
  written: Map<string, Written>;
  press: Press | null;
  carry: Carry | null;
  landing: Landing | null;
  /** The rack's order while a board is carried, and after a drop until the new order arrives. */
  viewKeys: string[] | null;
  /** The boards' keys (joined) that `viewKeys` was made against. */
  viewFor: string;
  /** Each board's resting place, by key. */
  base: Map<string, Slide>;
  /** Scroll snap is off (a carry, or a drop still settling). */
  snapOff: boolean;
  /** The track gliding to a dropped board's place, written each frame (never a native smooth
   * scroll, which a browser can drop at the end of a touch). */
  glide: { from: number; to: number; start: number } | null;
  /** No board tap counts until then (the end of a carry). */
  suppressClickUntil: number;
}

interface Written {
  theta: number;
  x: number;
  lift: number;
  swell: number;
  carried: boolean;
}

/** What the frame loop reads from the latest render. */
interface Latest {
  boards: readonly RackBoard[];
  width: number;
  scale: number;
  slot: number;
  floorY: number;
  fits: SpineFit[];
  frozen: boolean;
  /** The shaper asked their device for less motion: only 0 and 90 degrees ever draw. */
  reduced: boolean;
  onTurn: (key: string) => void;
  onMove: (key: string, toRackIndex: number) => MoveResult;
  onCarry: (name: string | null) => void;
  holdEnabled: boolean;
  scroller: HTMLDivElement | null;
}

/** The refs the frame loop, the scroll listener and the settle timer share. */
interface RackRefs {
  frame: FrameState;
  latest: { current: Latest | null };
  nodes: Map<string, BoardNodes>;
  /** The accent drop mark under the floor. */
  mark: { current: SVGLineElement | null };
}

function newFrameState(): FrameState {
  return {
    started: false,
    theta: new Map(),
    turn: new Map(),
    settledKey: null,
    propKey: null,
    scrolling: false,
    settleTimer: 0,
    raf: 0,
    placedFor: "",
    written: new Map(),
    press: null,
    carry: null,
    landing: null,
    viewKeys: null,
    viewFor: "",
    base: new Map(),
    snapOff: false,
    glide: null,
    suppressClickUntil: 0,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** The boards in the order the rack draws them now: the carry's order while a board is carried (or
 * a drop's until the new order arrives), else the order handed in. */
function viewBoards(frame: FrameState, latest: Latest): readonly RackBoard[] {
  const keys = frame.viewKeys;
  if (keys === null || keys.length !== latest.boards.length) return latest.boards;
  const byKey = new Map(latest.boards.map((board) => [board.key, board] as const));
  const view: RackBoard[] = [];
  for (const key of keys) {
    const board = byKey.get(key);
    if (!board) return latest.boards;
    view.push(board);
  }
  return view;
}

/** The first place a saved board may stand: behind the unsaved board, which stays first (R9). */
function firstMovablePlace(boards: readonly RackBoard[]): number {
  return boards[0]?.kind === "in-progress" ? 1 : 0;
}

/** A board's resting place along the track at its place `index`: where it stands, gliding over
 * `SLOT_SLIDE_MS` when its place changes (the others opening a gap, a reverted order) — at once
 * when only the layout changed (a rotation, a new slot). Returns the place and whether it is there. */
function slideBase(frame: FrameState, key: string, index: number, target: number, now: number, reduced: boolean) {
  let slide = frame.base.get(key);
  if (!slide || (slide.index === index && slide.to !== target)) {
    slide = { index, from: target, to: target, start: now, duration: 0 };
    frame.base.set(key, slide);
  } else if (slide.index !== index) {
    const at = tween(slide.from, slide.to, now - slide.start, slide.duration, reduced);
    slide = { index, from: at, to: target, start: now, duration: SLOT_SLIDE_MS };
    frame.base.set(key, slide);
  }
  const value = tween(slide.from, slide.to, now - slide.start, slide.duration, reduced);
  return { value, done: value === slide.to };
}

/** The carried board's place this frame: it follows the finger exactly (and the rack scrolls along
 * near the screen's edge), and the gap opens at the place it would land on — never in front of the
 * unsaved board. Returns the carried board's x along the track. */
function advanceCarry(frame: FrameState, latest: Latest, now: number, edgeScroll: boolean): number {
  const carry = frame.carry as Carry;
  const { boards, width, slot, scroller, reduced } = latest;
  // Within `EDGE_ZONE` of the screen's left or right edge the rack scrolls along with the carried
  // board, faster the nearer the edge, so one carry can cross a rack of thirty boards.
  if (edgeScroll && scroller) {
    const step = edgeScrollStep(carry.clientX - carry.scrollerLeft, width);
    if (step !== 0) scroller.scrollLeft += step;
  }
  const scrollLeft = scroller ? scroller.scrollLeft : 0;
  const delta = carry.clientX - carry.startClientX + (scrollLeft - carry.startScrollLeft);
  const rest = swipeSlotCentre(carry.fromIndex, width, slot);
  const n = boards.length;
  const target = clamp(swipeSlotAt(rest + delta, n, width, slot), Math.min(firstMovablePlace(boards), n - 1), n - 1);
  carry.target = target;
  const order = boards.filter((board) => board.key !== carry.key).map((board) => board.key);
  order.splice(target, 0, carry.key);
  frame.viewKeys = order;
  frame.viewFor = boards.map((board) => board.key).join("\n");
  return rest + delta + tween(carry.residual, 0, now - carry.liftAt, SETTLE_MS, reduced);
}

let measureContext: CanvasRenderingContext2D | null | undefined;

/** The browser's own text measure for the vertical words (the fit RULE is pure: `fitSpineWords`). */
function measureWords(family: string) {
  if (measureContext === undefined) {
    measureContext = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  }
  const context = measureContext;
  return (text: string, fontSize: number, weight: 600 | 400) => {
    if (!context) return text.length * fontSize * 0.55;
    context.font = `${weight} ${fontSize}px ${family}`;
    return context.measureText(text).width;
  };
}

/**
 * One frame: works out every board's angle (straight from its distance to the middle of the screen
 * while the track is moving, else gliding to its resting angle), the room the track opens around the
 * turning boards, a carried board's place under the finger and the gap it opens, and writes it all
 * to the elements. Returns whether another frame is needed.
 */
function stepRack(
  frame: FrameState,
  latest: Latest,
  nodes: Map<string, BoardNodes>,
  mark: SVGLineElement | null,
  now: number,
  force: boolean,
): boolean {
  const { boards, width, scale, slot, floorY, fits, frozen, reduced, scroller } = latest;
  let busy = false;
  const carry = frame.carry;
  const carriedX = carry ? advanceCarry(frame, latest, now, !force) : 0;
  const press = frame.press;
  const carriedKey = carry ? carry.key : null;
  const view = viewBoards(frame, latest);
  const fitByKey = new Map(boards.map((board, k) => [board.key, fits[k]] as const));
  const middle = (scroller ? scroller.scrollLeft : 0) + width / 2;
  // With reduced motion a board is either its side profile or its outline, never between: swiping
  // changes nothing until the track settles (UI-SPEC §12). While a board is carried every board
  // closes to its side profile, so the gaps are predictable.
  const following = !frozen && !reduced && frame.scrolling && carriedKey === null;

  const thetas = view.map((board, k) => {
    const current = frame.theta.get(board.key) ?? 0;
    if (frozen) return current;
    if (following) {
      // Straight from the scroll position, never tweened, so it never lags the thumb.
      const theta = turnAngle(middle - swipeSlotCentre(k, width, slot), slot);
      frame.turn.set(board.key, { from: theta, to: theta, start: now, duration: 0 });
      frame.theta.set(board.key, theta);
      return theta;
    }
    const target = carriedKey === null && board.key === frame.settledKey ? HALF_TURN : 0;
    let turn = frame.turn.get(board.key);
    if (!turn || turn.to !== target) {
      turn = { from: current, to: target, start: now, duration: SETTLE_MS };
      frame.turn.set(board.key, turn);
    }
    const theta = tween(turn.from, turn.to, now - turn.start, turn.duration, reduced);
    if (theta !== turn.to) busy = true;
    frame.theta.set(board.key, theta);
    return theta;
  });

  // The room the track opens around its turning boards — the outline and a column of words — and
  // the neighbours step aside by half the extra each. A board at rest asks for none: the slot is
  // wide enough for the widest resting board and its words (`swipeSlotFor`, rack-room.test.ts). A
  // carried board follows the finger and is left out of the room-making.
  const extras = view.map((board, k) =>
    board.key !== carriedKey && thetas[k] > 0 ? boardExtra(halfExtent(board.art, thetas[k], scale), slot, WORD_COLUMN) : 0,
  );
  const offsets = rackRoomOffsets(extras);
  const landing = frame.landing;
  let landed = landing !== null;

  view.forEach((board, k) => {
    const theta = thetas[k];
    const base = slideBase(frame, board.key, k, swipeSlotCentre(k, width, slot), now, reduced);
    if (!base.done) busy = true;
    const carried = board.key === carriedKey;
    const x = carried ? carriedX : base.value + offsets[k];
    let lift = 0;
    let swell = 1;
    if (carried && carry) {
      lift = tween(0, CARRY_LIFT, now - carry.liftAt, LIFT_MS, reduced);
      swell = reduced ? 1 : SWELL_SCALE;
    } else if (press && press.key === board.key && board.kind !== "in-progress" && !reduced) {
      // A finger holding still: from `SWELL_FROM_MS` the board swells a little about its foot, so
      // the hold reads as "something is about to happen". The unsaved board never swells — it never
      // lifts — and nothing swells when the shaper asked for less motion.
      swell = swellScale(now - press.t0);
    } else if (landing && landing.key === board.key) {
      const t = now - landing.start;
      lift = tween(landing.fromLift, 0, t, DROP_MS, reduced);
      swell = tween(landing.fromSwell, 1, t, DROP_MS, reduced);
      if (lift !== 0 || swell !== 1) landed = false;
    }
    const last = frame.written.get(board.key);
    const turned = force || !last || Math.abs(last.theta - theta) >= 1e-4;
    const moved =
      force || !last || Math.abs(last.x - x) >= 0.01 || Math.abs(last.lift - lift) >= 0.01 || Math.abs(last.swell - swell) >= 1e-4;
    const restyled = force || !last || last.carried !== carried;
    if (!turned && !moved && !restyled) return;
    const node = nodes.get(board.key);
    if (!node) return;
    frame.written.set(board.key, { theta, x, lift, swell, carried });
    if (moved) {
      // Lifted `lift` dots, and swollen about its foot (the floor point under its axis).
      const swollen = swell === 1 ? "" : ` translate(0 ${floorY}) scale(${swell.toFixed(4)}) translate(0 ${-floorY})`;
      node.group?.setAttribute("transform", `translate(${x.toFixed(2)} ${(-lift).toFixed(2)})${swollen}`);
    }
    if (restyled) {
      if (carried) node.group?.setAttribute("data-carrying", "true");
      else node.group?.removeAttribute("data-carrying");
      if (node.body) {
        node.body.style.stroke = carried ? "var(--surf-accent-ink)" : "var(--surf-ink)";
        node.body.setAttribute("stroke-width", carried ? "1.8" : "1.1");
      }
    }
    if (turned) {
      node.group?.setAttribute("data-turn", String(Math.round((theta * 180) / Math.PI)));
      node.body?.setAttribute("d", turnedBoardPath(board.art, theta, scale, 0, floorY));
      if (node.stringer) {
        node.stringer.setAttribute("d", stringerPath(board.art, theta, scale, 0, floorY));
        node.stringer.setAttribute("opacity", Math.sin(theta).toFixed(3));
      }
      if (node.words) {
        const fontSize = fitByKey.get(board.key)?.fontSize ?? SWIPE_WORD_SIZE;
        const anchor = spineAnchorX(board.art, theta, scale, fontSize);
        node.words.setAttribute("transform", `translate(${anchor.toFixed(2)} ${floorY - WORD_END_ROOM}) rotate(-90)`);
        node.words.setAttribute("opacity", Math.max(0, Math.cos(theta)).toFixed(3));
      }
    }
    if (node.button) {
      // The button covers the board's own room: its slot plus the room it opens as it turns, so the
      // track's buttons tile it with no gap and no overlap.
      const room = slot + extras[k];
      node.button.style.left = `${(x - room / 2).toFixed(2)}px`;
      node.button.style.width = `${room.toFixed(2)}px`;
    }
  });
  if (landing && landed) frame.landing = null;
  else if (landing) busy = true;

  // The drop mark: an accent line under the floor, centred on the gap the carried board would
  // land in — drawn only while a board is carried.
  if (mark) {
    if (carry) {
      const centre = swipeSlotCentre(carry.target, width, slot);
      mark.setAttribute("x1", (centre - DROP_MARK_WIDTH / 2).toFixed(2));
      mark.setAttribute("x2", (centre + DROP_MARK_WIDTH / 2).toFixed(2));
      mark.setAttribute("y1", String(floorY + DROP_MARK_DROP));
      mark.setAttribute("y2", String(floorY + DROP_MARK_DROP));
      mark.setAttribute("opacity", "1");
    } else if (mark.getAttribute("opacity") !== "0") {
      mark.setAttribute("opacity", "0");
    }
  }

  return busy || frame.press !== null || frame.carry !== null || frame.glide !== null;
}

/** Schedules one frame (at most one is ever waiting), and keeps going while a board is gliding, a
 * finger is holding a board or a board is carried. */
function kickRack(refs: RackRefs) {
  const state = refs.frame;
  if (state.raf) return;
  state.raf = requestAnimationFrame(() => {
    state.raf = 0;
    const current = refs.latest.current;
    if (!current || current.width <= 0) return;
    const now = performance.now();
    advancePress(refs, current, now);
    if (advanceGlide(refs, current, now)) return;
    if (stepRack(state, current, refs.nodes, refs.mark.current, now, false)) kickRack(refs);
  });
}

/** The scroller has been still for `SWIPE_SETTLE_MS`: the board in the middle finishes turning, and
 * after a drop the scroll snap comes back on an exact slot. */
function settleRack(refs: RackRefs) {
  const state = refs.frame;
  state.settleTimer = 0;
  state.scrolling = false;
  if (state.carry || state.glide) return;
  const current = refs.latest.current;
  if (state.snapOff && current?.scroller) {
    const exact = swipeScrollLeftFor(swipeMiddleIndex(current.scroller.scrollLeft, current.boards.length, current.slot), current.slot);
    current.scroller.scrollLeft = exact;
    current.scroller.style.scrollSnapType = "";
    state.snapOff = false;
  }
  if (current && current.scroller && !current.frozen && current.boards.length > 0) {
    const view = viewBoards(state, current);
    const board = view[swipeMiddleIndex(current.scroller.scrollLeft, view.length, current.slot)];
    if (board) {
      state.settledKey = board.key;
      current.onTurn(board.key);
    }
  }
  kickRack(refs);
}

/** Starts (or restarts) the wait for the scroller to be still. */
function waitForSettle(refs: RackRefs) {
  const state = refs.frame;
  if (state.settleTimer) window.clearTimeout(state.settleTimer);
  state.settleTimer = window.setTimeout(() => settleRack(refs), SWIPE_SETTLE_MS);
}

/** A finger on a board, each frame: a swipe once it has moved too far before the hold completed (it
 * just scrolls the rack), held once it has stayed still for the whole hold. */
function advancePress(refs: RackRefs, latest: Latest, now: number) {
  const press = refs.frame.press;
  if (!press) return;
  const outcome = swipePressOutcome(now - press.t0, press.moved, latest.holdEnabled);
  if (outcome === "swipe") refs.frame.press = null;
  else if (outcome === "held") liftBoard(refs, latest, now);
}

/** The hold completed: the board lifts and the finger carries it — unless it is the unsaved board,
 * which is never lifted: the rack's owner refuses it and says so. */
function liftBoard(refs: RackRefs, latest: Latest, now: number) {
  const state = refs.frame;
  const press = state.press;
  state.press = null;
  const { boards, width, slot, scroller } = latest;
  if (!press || !scroller || latest.frozen) return;
  const index = boards.findIndex((board) => board.key === press.key);
  const board = boards[index];
  if (!board) return;
  // Whatever happens next, the finger's lift at the end of this hold is not a tap.
  state.suppressClickUntil = Number.POSITIVE_INFINITY;
  if (board.kind === "in-progress") {
    latest.onMove(board.key, 0);
    return;
  }
  const rest = swipeSlotCentre(index, width, slot);
  const drawn = state.written.get(board.key)?.x ?? rest;
  state.carry = {
    key: board.key,
    pointerId: press.pointerId,
    fromIndex: index,
    startClientX: press.clientX,
    startScrollLeft: scroller.scrollLeft,
    clientX: press.clientX,
    scrollerLeft: scroller.getBoundingClientRect().left,
    liftAt: now,
    residual: drawn - rest,
    target: index,
  };
  state.landing = null;
  // Snap off while carrying, so the edge scrolling is not fought; the track stops "moving".
  scroller.style.scrollSnapType = "none";
  state.snapOff = true;
  state.scrolling = false;
  if (state.settleTimer) window.clearTimeout(state.settleTimer);
  state.settleTimer = 0;
  latest.onCarry(board.name);
}

/** The finger let go (or the system took the touch, `cancelled`): the carried board drops into its
 * gap — moved, it comes to the middle and turns; dropped where it started, or cancelled, it goes back
 * to its place with nothing said. */
function dropBoard(refs: RackRefs, cancelled: boolean) {
  const state = refs.frame;
  const carry = state.carry;
  const latest = refs.latest.current;
  if (!carry || !latest) return;
  const now = performance.now();
  // Where the finger let go, not where the last frame saw it.
  if (!cancelled) advanceCarry(state, latest, now, false);
  const written = state.written.get(carry.key);
  state.carry = null;
  state.landing = { key: carry.key, start: now, fromLift: written?.lift ?? 0, fromSwell: written?.swell ?? 1 };
  state.suppressClickUntil = now + CLICK_AFTER_DROP_MS;
  const { boards, width, slot, scroller, reduced } = latest;
  const result: MoveResult =
    !cancelled && carry.target !== carry.fromIndex ? latest.onMove(carry.key, carry.target) : "same";
  const moved = result === "moved" && state.viewKeys !== null;
  const index = moved ? carry.target : carry.fromIndex;
  if (!moved) state.viewKeys = null;
  // The board glides down from under the finger to its place.
  state.base.set(carry.key, {
    index,
    from: written?.x ?? swipeSlotCentre(index, width, slot),
    to: swipeSlotCentre(index, width, slot),
    start: now,
    duration: DROP_MS,
  });
  latest.onCarry(null);
  if (!scroller) return;
  let goal: number;
  if (moved && state.viewKeys) {
    // The dropped board comes to the middle and turns; the new order arrives from the owner, so the
    // track is already placed for it.
    state.settledKey = carry.key;
    state.placedFor = `${width}:${slot}:${state.viewKeys.join("\n")}`;
    latest.onTurn(carry.key);
    goal = swipeScrollLeftFor(carry.target, slot);
  } else {
    goal = swipeScrollLeftFor(swipeMiddleIndex(scroller.scrollLeft, boards.length, slot), slot);
  }
  if (Math.abs(scroller.scrollLeft - goal) < 0.5) {
    scroller.scrollLeft = goal;
    scroller.style.scrollSnapType = "";
    state.snapOff = false;
    settleRack(refs);
    return;
  }
  state.glide = { from: scroller.scrollLeft, to: goal, start: now };
  if (reduced) advanceGlide(refs, latest, now);
  kickRack(refs);
}

/** One frame of the track's glide to a dropped board's place (instant with reduced motion); at its
 * end the rack settles there. Returns true when the glide ended this frame and the rack settled. */
function advanceGlide(refs: RackRefs, latest: Latest, now: number): boolean {
  const state = refs.frame;
  const glide = state.glide;
  const scroller = latest.scroller;
  if (!glide || !scroller) return false;
  const at = tween(glide.from, glide.to, now - glide.start, SETTLE_MS, latest.reduced);
  scroller.scrollLeft = at;
  if (at !== glide.to) {
    state.scrolling = true;
    return false;
  }
  state.glide = null;
  if (state.settleTimer) window.clearTimeout(state.settleTimer);
  settleRack(refs);
  return true;
}

/** A finger went down on a board: its hold starts now. */
function beginPress(refs: RackRefs, key: string, pointerId: number, clientX: number, clientY: number, scrollLeft: number) {
  refs.frame.press = {
    key,
    pointerId,
    x0: clientX,
    y0: clientY,
    t0: performance.now(),
    moved: 0,
    clientX,
    scrollLeft0: scrollLeft,
  };
  kickRack(refs);
}

/** True while a tap would only be the end of a hold, never a tap on a board. */
function clickSwallowed(frame: FrameState): boolean {
  return performance.now() < frame.suppressClickUntil;
}

/** Lets go of a finger on a board that never lifted (a tap, or a swipe the browser took over). */
function endPress(refs: RackRefs) {
  refs.frame.press = null;
  kickRack(refs);
}

/** Puts board `index` in the middle at once: an exact slot multiple, a snap point itself. */
function placeAt(scroller: HTMLDivElement, index: number, slot: number) {
  scroller.scrollLeft = swipeScrollLeftFor(Math.max(0, index), slot);
}

const refuseMoves = (): MoveResult => "same";
const ignoreCarry = () => {};

export function SwipeRack({
  boards,
  turnedKey,
  openKey,
  frozen,
  onTurn,
  onOpen,
  caption,
  focusKey = null,
  onMove = refuseMoves,
  holdEnabled = false,
  onCarry = ignoreCarry,
}: SwipeRackProps) {
  const { system } = useUnits();
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontFamily, setFontFamily] = useState("sans-serif");

  const refs = useRef<RackRefs>({
    frame: newFrameState(),
    latest: { current: null },
    nodes: new Map(),
    mark: { current: null },
  });
  /** True from a finger's or mouse's press on a board until its click (or cancel): the focus that
   * press brings is not a keyboard focus, so it never jumps the track. */
  const pointerPressed = useRef(false);
  const instructionsId = useId();

  // The scroller's own width and height, measured: its height comes from `--rack-swipe-r` in CSS,
  // and the drawn height follows the scroller, never `innerHeight` (RESEARCH Pitfall 6). Measured
  // once before the first paint, then whenever it changes (a rotation, Safari's bars).
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => {
      const width = scroller.clientWidth;
      const height = scroller.clientHeight;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      setFontFamily(getComputedStyle(scroller).fontFamily || "sans-serif");
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  const width = size.width;
  const rackHeight = swipeRackHeightFromScroller(size.height);
  const drawn = width > 0 && rackHeight > 0;
  const longestMm = Math.max(0, ...boards.map((board) => board.art.length));
  const scale = rackScale(rackHeight, longestMm);
  // The slot, worked out once per layout: 40 dots, or wider where the widest resting board and its
  // words would not fit 40 (a tall phone, an iPad). Every swipe layout function takes it.
  const slot = useMemo(
    () =>
      swipeSlotFor(
        boards.map((board) => halfExtent(board.art, 0, scale)),
        WORD_COLUMN,
      ),
    [boards, scale],
  );
  const floorY = SWIPE_TOP_PAD + rackHeight;
  const lines = useMemo(() => boards.map((board) => formatSummaryLine(board.summary, system)), [boards, system]);
  const fits = useMemo(() => {
    const measure = measureWords(fontFamily);
    return boards.map((board, k) =>
      fitSpineWords({ name: board.name, line: lines[k], maxLength: rackHeight - 2 * WORD_END_ROOM, baseSize: SWIPE_WORD_SIZE, measure }),
    );
  }, [boards, lines, rackHeight, fontFamily]);
  const heightLines = useMemo(() => rackHeightLines(system, longestMm), [system, longestMm]);

  const n = boards.length;
  const keys = boards.map((board) => board.key);
  const joinedKeys = keys.join("\n");

  // After every render: hand the frame loop the newest boards and layout, start the turned board
  // fully turned with no animation the first time (D-07), bring a board turned from outside the rack
  // (a removal, the computer's rack handing over) to the middle, re-centre the settled board when the
  // width, the slot or the boards change, and redraw everything at once so nothing paints stale.
  useLayoutEffect(() => {
    const { frame: state, latest, nodes, mark } = refs.current;
    const scroller = scrollerRef.current;
    latest.current = { boards, width, scale, slot, floorY, fits, frozen, reduced, onTurn, onMove, onCarry, holdEnabled, scroller };
    // A drop's order stands in until the new order arrives (or the boards change some other way).
    if (!state.carry && state.viewKeys !== null && state.viewFor !== joinedKeys) state.viewKeys = null;
    // A carried board that left the rack (another device, a reload of the list) is simply let go.
    if (state.carry && !keys.includes(state.carry.key)) dropBoard(refs.current, true);
    if (!state.started) {
      state.started = true;
      state.settledKey = turnedKey;
      state.propKey = turnedKey;
      if (turnedKey !== null) {
        state.theta.set(turnedKey, HALF_TURN);
        state.turn.set(turnedKey, { from: HALF_TURN, to: HALF_TURN, start: 0, duration: 0 });
      }
    } else if (turnedKey !== state.propKey) {
      state.propKey = turnedKey;
      if (turnedKey !== state.settledKey) {
        state.settledKey = turnedKey;
        state.placedFor = "";
      }
    }
    if (!drawn || !scroller) return;
    const placement = `${width}:${slot}:${joinedKeys}`;
    if (state.placedFor !== placement) {
      state.placedFor = placement;
      placeAt(scroller, state.settledKey === null ? 0 : keys.indexOf(state.settledKey), slot);
    }
    if (stepRack(state, latest.current, nodes, mark.current, performance.now(), true)) kickRack(refs.current);
  });

  // One passive scroll listener: it only marks the track as moving, restarts the settle timer and
  // schedules a frame — never more than one frame waiting, however fast the events come (T-15-20).
  useEffect(() => {
    const scroller = scrollerRef.current;
    const rack = refs.current;
    if (!scroller) return;
    const onScroll = () => {
      const state = rack.frame;
      // A carried board's own edge scrolling: the board follows, nothing settles.
      if (state.carry || state.glide) {
        kickRack(rack);
        return;
      }
      // The track moved under a finger that is still holding: that is a swipe, not a hold.
      const press = state.press;
      if (press && Math.abs(scroller.scrollLeft - press.scrollLeft0) > TOUCH_SWIPE_THRESHOLD) state.press = null;
      state.scrolling = true;
      waitForSettle(rack);
      kickRack(rack);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      const state = rack.frame;
      if (state.settleTimer) window.clearTimeout(state.settleTimer);
      if (state.raf) cancelAnimationFrame(state.raf);
      state.settleTimer = 0;
      state.raf = 0;
    };
  }, []);

  // Hold and slide (15-09). The finger is followed through pointer events on the window (a touch
  // keeps its pointer id whichever element is under it). ONE non-passive touchmove listener, added
  // here when the rack mounts — never at the touch's start, which older Safari ignores (RESEARCH
  // Pitfall 1) — stops the page scrolling under a carried board, and only while one is carried. The
  // long-press menu never opens on the rack. A system cancel, or the window losing focus, puts a
  // carried board back where it was (T-15-28: nothing can leave the page unable to scroll).
  useEffect(() => {
    const scroller = scrollerRef.current;
    const rack = refs.current;
    if (!scroller) return;
    const releaseClick = () => {
      if (rack.frame.suppressClickUntil === Number.POSITIVE_INFINITY) {
        rack.frame.suppressClickUntil = performance.now() + CLICK_AFTER_DROP_MS;
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      const { carry, press } = rack.frame;
      if (carry && event.pointerId === carry.pointerId) {
        carry.clientX = event.clientX;
        kickRack(rack);
      } else if (press && event.pointerId === press.pointerId) {
        press.clientX = event.clientX;
        press.moved = Math.max(press.moved, Math.hypot(event.clientX - press.x0, event.clientY - press.y0));
        kickRack(rack);
      }
    };
    const onPointerEnd = (cancelled: boolean) => (event: PointerEvent) => {
      const { carry, press } = rack.frame;
      if (carry && event.pointerId === carry.pointerId) dropBoard(rack, cancelled);
      else if (press && event.pointerId === press.pointerId) endPress(rack);
      releaseClick();
    };
    const onPointerUp = onPointerEnd(false);
    const onPointerCancel = onPointerEnd(true);
    const onTouchMove = (event: TouchEvent) => {
      if (rack.frame.carry && event.cancelable) event.preventDefault();
    };
    const onTouchCancel = () => {
      if (rack.frame.carry) dropBoard(rack, true);
      else if (rack.frame.press) endPress(rack);
      releaseClick();
    };
    const onContextMenu = (event: Event) => event.preventDefault();
    const onBlur = () => {
      if (rack.frame.carry) dropBoard(rack, true);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("blur", onBlur);
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    scroller.addEventListener("touchcancel", onTouchCancel);
    scroller.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("blur", onBlur);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("touchcancel", onTouchCancel);
      scroller.removeEventListener("contextmenu", onContextMenu);
      rack.frame.press = null;
      rack.frame.carry = null;
    };
  }, []);

  useEffect(() => {
    if (!focusKey) return;
    const rack = refs.current;
    const scroller = scrollerRef.current;
    const latest = rack.latest.current;
    rack.nodes.get(focusKey)?.button?.focus({ preventScroll: true });
    if (!scroller || !latest) return;
    const index = latest.boards.findIndex((board) => board.key === focusKey);
    if (index >= 0) placeAt(scroller, index, latest.slot);
  }, [focusKey]);

  /** A tap on a board: the middle board opens; any other comes to the middle (and turns there) —
   * the browser's own smooth scroll, or a jump when the shaper asked for less motion (UI-SPEC §12). */
  const handleBoardClick = (key: string, index: number) => {
    pointerPressed.current = false;
    // The end of a hold (a carried board let go, or the unsaved board refusing) is never a tap.
    if (clickSwallowed(refs.current.frame)) return;
    if (key === turnedKey) {
      onOpen(key);
      return;
    }
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const target = swipeScrollLeftFor(index, slot);
    if (Math.abs(scroller.scrollLeft - target) < 0.5) {
      // Already in the middle (the track never moves, so no scroll event will settle it).
      settleRack(refs.current);
      return;
    }
    if (reduced) scroller.scrollLeft = target;
    else scroller.scrollTo({ left: target, behavior: "smooth" });
  };

  /** Brings board `index` to the middle at once and turns it there (a keyboard move, a screen
   * reader's focus): the track jumps — never a smooth scroll — and the caption follows. */
  const bringToMiddleNow = (index: number) => {
    const scroller = scrollerRef.current;
    const board = boards[index];
    if (!scroller || !board) return;
    const rack = refs.current;
    rack.frame.settledKey = board.key;
    placeAt(scroller, index, slot);
    kickRack(rack);
    if (board.key !== turnedKey) onTurn(board.key);
  };

  /** UI-SPEC §11's keyboard map on the swipe rack: ← / → walk to the previous / next board, Home /
   * End to the first / last; focus moves, the board comes to the middle and turns at once. Enter and
   * Space are the focused button's own click (it is the middle board, so it opens). Alt with an arrow
   * is left alone — it moves a board (15-09). */
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = (event.target as HTMLElement).getAttribute("data-rack-board");
    const from = key === null ? -1 : boards.findIndex((board) => board.key === key);
    if (from < 0) return;
    let to = from;
    if (event.key === "ArrowLeft") to = from - 1;
    else if (event.key === "ArrowRight") to = from + 1;
    else if (event.key === "Home") to = 0;
    else if (event.key === "End") to = boards.length - 1;
    else return;
    event.preventDefault();
    pointerPressed.current = false;
    to = Math.min(boards.length - 1, Math.max(0, to));
    bringToMiddleNow(to);
    refs.current.nodes.get(boards[to].key)?.button?.focus({ preventScroll: true });
  };

  /** A board's button took the focus without a finger (Tab, a screen reader): bring it to the middle
   * and turn it (UI-SPEC §11, "focus scrolls it to the middle and turns it"). A finger's tap leaves
   * that to the click, which glides instead of jumping. */
  const handleBoardFocus = (index: number) => {
    if (pointerPressed.current) return;
    if (boards[index]?.key === refs.current.frame.settledKey) return;
    bringToMiddleNow(index);
  };

  /** A finger (or a mouse) went down on a board: with the hold switched on, its hold starts. */
  const startPress = (key: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    const rack = refs.current;
    rack.frame.suppressClickUntil = 0;
    if (!holdEnabled || frozen || rack.frame.carry || !event.isPrimary) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    beginPress(rack, key, event.pointerId, event.clientX, event.clientY, scroller.scrollLeft);
  };

  const bindMark = (element: SVGLineElement | null) => {
    refs.current.mark.current = element;
  };

  const bindNode = (key: string, part: keyof BoardNodes) => (element: Element | null) => {
    const map = refs.current.nodes;
    const entry = map.get(key) ?? {};
    (entry as Record<string, Element | null>)[part] = element;
    map.set(key, entry);
  };

  const trackWidth = swipeTrackWidth(n, width, slot);
  const padding = swipePadding(width, slot);
  const turnedBoard = turnedKey === null ? null : (boards.find((board) => board.key === turnedKey) ?? null);

  return (
    <div
      data-rack-kind="swipe"
      data-rack-slot={slot}
      // Edge to edge: the rack bleeds through the page's own side padding (32 on the desktop shell,
      // 16 on a phone and on a short screen), and its 16-dot top room tucks up into the heading's gap
      // (UI-SPEC §3's sums count that room as the gap; see globals.css `--rack-swipe-r`).
      className="relative -mx-8 max-shell:-mx-4 [@media(max-height:500px)]:-mx-4"
      style={{ marginTop: -SWIPE_TOP_PAD }}
    >
      {drawn && (
        <svg
          aria-hidden="true"
          focusable="false"
          width={width}
          height={size.height}
          className="pointer-events-none absolute top-0 left-0"
          style={{ overflow: "visible" }}
        >
          {heightLines.map((line) => {
            const y = floorY - line.heightMm * scale;
            return (
              <line
                key={line.label}
                x1={LABEL_GUTTER - 2}
                x2={width}
                y1={y}
                y2={y}
                strokeWidth={1}
                style={{ stroke: "var(--surf-line-faint)", strokeDasharray: "5 4" }}
              />
            );
          })}
          <line x1={0} x2={width} y1={floorY + 0.5} y2={floorY + 0.5} strokeWidth={1} style={{ stroke: "var(--surf-line)" }} />
        </svg>
      )}
      <div
        ref={scrollerRef}
        data-rack-scroller
        role="group"
        aria-label={RACK_COPY.groupName}
        aria-describedby={instructionsId}
        onKeyDown={handleKeyDown}
        className="relative overflow-x-auto overflow-y-hidden overscroll-x-contain select-none [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          height: "calc(var(--rack-swipe-r) + 40px)",
          touchAction: "pan-x pan-y",
          WebkitUserSelect: "none",
          WebkitTouchCallout: "none",
        }}
      >
        {drawn && (
          <div className="relative h-full" style={{ width: trackWidth }}>
            {boards.map((board, k) => (
              <div
                key={board.key}
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0"
                style={{ left: padding + k * slot, width: slot, scrollSnapAlign: "center" }}
              />
            ))}
            <svg
              aria-hidden="true"
              focusable="false"
              width={trackWidth}
              height={size.height}
              className="pointer-events-none absolute top-0 left-0"
              style={{ overflow: "visible", fontFamily: "var(--font-sans)" }}
            >
              {boards.map((board, k) => (
                <g key={board.key} ref={bindNode(board.key, "group")} data-rack-art={board.key}>
                  <path
                    ref={bindNode(board.key, "body")}
                    strokeWidth={1.1}
                    strokeLinejoin="round"
                    style={{ fill: "var(--surf-board-fill)", stroke: "var(--surf-ink)" }}
                  />
                  <path
                    ref={bindNode(board.key, "stringer")}
                    fill="none"
                    strokeWidth={1}
                    style={{ stroke: "var(--outline-station-line)", strokeDasharray: "var(--outline-stringer-dash)" }}
                  />
                  <text
                    ref={bindNode(board.key, "words")}
                    fontSize={fits[k]?.fontSize ?? SWIPE_WORD_SIZE}
                    style={{
                      paintOrder: "stroke",
                      stroke: "var(--surf-ground)",
                      strokeWidth: SPINE_HALO_WIDTH,
                      strokeLinejoin: "round",
                    }}
                  >
                    <tspan fontWeight={600} style={{ fill: "var(--surf-ink)" }}>
                      {fits[k]?.name ?? board.name}
                    </tspan>
                    <tspan dx={SPINE_WORD_GAP} fontWeight={400} style={{ fill: "var(--surf-ink-muted)" }}>
                      {lines[k]}
                    </tspan>
                  </text>
                </g>
              ))}
              <line
                ref={bindMark}
                data-drop-mark
                strokeWidth={3}
                strokeLinecap="round"
                opacity={0}
                style={{ stroke: "var(--surf-accent-ink)" }}
              />
            </svg>
            {boards.map((board, k) => (
              <button
                key={board.key}
                ref={bindNode(board.key, "button")}
                type="button"
                data-rack-board={board.key}
                aria-label={
                  board.kind === "in-progress"
                    ? RACK_COPY.unsavedBoardLabel(board.name, lines[k], n)
                    : RACK_COPY.boardLabel(board.name, lines[k], k + 1, n)
                }
                aria-current={board.key === openKey ? "true" : undefined}
                // Roving tabindex: the turned board is the rack's one tab stop.
                tabIndex={board.key === turnedKey || (turnedKey === null && k === 0) ? 0 : -1}
                className="focus-ring-accent absolute cursor-pointer rounded-sm bg-transparent p-0"
                style={{ top: RING_ROOM, height: Math.max(0, size.height - 2 * RING_ROOM) }}
                onPointerDown={(event) => {
                  pointerPressed.current = true;
                  startPress(board.key, event);
                }}
                onPointerCancel={() => {
                  pointerPressed.current = false;
                }}
                onFocus={() => handleBoardFocus(k)}
                onClick={() => handleBoardClick(board.key, k)}
              />
            ))}
          </div>
        )}
      </div>
      {drawn && (
        <svg
          aria-hidden="true"
          focusable="false"
          width={LABEL_GUTTER}
          height={size.height}
          className="pointer-events-none absolute top-0 left-0"
          style={{ overflow: "visible", fontFamily: "var(--font-sans)" }}
        >
          {heightLines.map((line) => (
            <text
              key={line.label}
              x={LABEL_GUTTER - 6}
              y={floorY - line.heightMm * scale + 3.5}
              textAnchor="end"
              fontSize={LABEL_SIZE}
              fontWeight={600}
              style={{
                fill: "var(--surf-ink-muted)",
                paintOrder: "stroke",
                stroke: "var(--surf-ground)",
                strokeWidth: 3,
                strokeLinejoin: "round",
              }}
            >
              {line.label}
            </text>
          ))}
        </svg>
      )}
      <span id={instructionsId} className="sr-only">
        {RACK_COPY.swipeInstructions}
      </span>
      <div style={{ height: SWIPE_CAPTION_HEIGHT }}>{turnedBoard && caption(turnedBoard)}</div>
    </div>
  );
}
