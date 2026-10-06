"use client";

/**
 * The computer's Board Rack (Phase 15, sketch 010 A — "follows the cursor"; R2, R3, R5, R8).
 *
 * Every board stands on its tail at ONE scale on one floor line per row, showing its side profile,
 * with its name and card line running up beside it. As the mouse moves along a row each board
 * turns by its distance from the cursor — fully turned under it, edge-on a slot away — and the rack
 * opens around the turning boards so nothing overlaps. When the cursor rests for 180 ms the board
 * nearest it finishes its turn, every other board closes, and the caption moves under it.
 *
 * Built as one SVG for every row (height lines, labels, floor lines, the boards), aria-hidden, plus
 * one real transparent `<button>` per board laid over that board's room — the board's name for a
 * screen reader, its focus ring and its click — and the caption under the turned board, a sibling of
 * those buttons (never inside one). React renders every element once with a stable key; one
 * animation-frame loop then writes the per-frame values — each board's `d`, `transform`, opacities,
 * `data-turn` and its button's `left` / `top` / `width` — straight onto the elements through refs.
 * Nothing that changes per frame is React state (RESEARCH Pattern 7), and no markup is ever built
 * from a string: a board's name is only ever React text. Each board is drawn standing on a floor at
 * 0 and moved onto its row's floor by its group's `transform`, so a board can slide between places,
 * and be carried into another row, without redrawing its outline.
 *
 * Moving a board (15-11, sketch 010): a mouse or pen pressed on a board and moved more than 6 dots
 * (`hoverPressOutcome`) lifts it — 12 dots, edge-on, its edge in accent ink at 1.8 — and from then on
 * the pointer carries it (captured with `setPointerCapture`, so it follows anywhere, into another row
 * too). Every other board closes to its side profile and slides over to open a one-slot gap at the
 * place it would land, an accent drop mark draws under that row's floor at the gap, and the caption
 * band empties. Letting go drops it there and it turns like any resting board; Escape, or the system
 * taking the pointer, puts it back with nothing said. A press that never moved 6 dots is a click and
 * opens the board. The unsaved board is never lifted and nothing lands in front of it (R9). A finger
 * on this rack never drags (D-05).
 *
 * Every path is worked out from the board's own numbers through `lib/geometry/rack-art.ts` and every
 * position through `lib/geometry/rack-layout.ts` — both pure and tested. Nothing is a stored picture.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/components/design/use-viewer-media";
import { useUnits } from "@/components/units-provider";
import { RACK_COPY } from "@/components/setup/rack-config";
import type { RackBoard } from "@/components/setup/use-rack-boards";
import { halfExtent, spineAnchorX, stringerPath, turnedBoardPath } from "@/lib/geometry/rack-art";
import {
  CARRY_LIFT,
  DROP_MARK_WIDTH,
  HOVER_CAPTION_WIDTH,
  HOVER_ROW_TOP_ROOM,
  HOVER_SLOT,
  HOVER_WORD_SIZE,
  LABEL_GUTTER,
  SPINE_HALO_WIDTH,
  SPINE_WORD_GAP,
  boardExtra,
  fitSpineWords,
  hoverPointerZone,
  hoverRackHeight,
  hoverRackLayout,
  hoverSlotAt,
  hoverSlotPosition,
  rackHeightLines,
  rackRoomOffsets,
  spineWordColumn,
  turnAngle,
  type HoverRackLayout,
  type SpineFit,
} from "@/lib/geometry/rack-layout";
import { formatSummaryLine } from "@/lib/geometry/summary-line";
import {
  CAPTION_GLIDE_MS,
  DROP_MS,
  HOVER_REST_MS,
  LIFT_MS,
  SETTLE_MS,
  SLOT_SLIDE_MS,
  hoverPressOutcome,
  tween,
  type RackPointerType,
} from "@/lib/models/rack-gesture";

/** A board fully turned, showing its outline. */
const HALF_TURN = Math.PI / 2;
/** The room a board's vertical words take beside it, at their starting size — the most they ever
 * take, so a shrunken name is never given less. Every turning board makes this much room as well as
 * its outline, because its neighbour stands its words in the gap beside it. */
const WORD_COLUMN = spineWordColumn(HOVER_WORD_SIZE);
/** The words start this far above the floor and stop this far below the rack's top (R - 8). */
const WORD_END_ROOM = 4;
/** The height-line labels' size and their gap from the start of the line. */
const LABEL_SIZE = 10;
/** How far under the floor line the caption starts (the top of the 24-dot drop-mark strip). */
const CAPTION_DROP = 16;
/** The drop mark's centre, this far under the floor line (inside the drop strip). */
const DROP_MARK_DROP = 7;
/** The rack's first-paint height before it has measured its width: one row (24 + 380 + 116). */
const FIRST_PAINT_HEIGHT = 520;
/** A click that arrives this soon after a carried board was let go is the end of that carry, never a
 * click that opens a board. */
const CLICK_AFTER_DROP_MS = 500;

type MoveResult = "moved" | "same" | "refused";

interface HoverRackProps {
  /** The boards, in the order the rack shows them. */
  boards: readonly RackBoard[];
  /** The board turned with its caption under it. */
  turnedKey: string | null;
  /** The board open in the editor, whose button says so (`aria-current`, D-07). */
  openKey: string | null;
  /** True while a dialog or a ⋯ menu is open: the rack holds exactly still. */
  frozen: boolean;
  /** A board has finished turning (the cursor rested on it). */
  onTurn: (key: string) => void;
  /** A board was clicked to open. */
  onOpen: (key: string) => void;
  /** The caption to show under the turned board. */
  caption: (board: RackBoard) => ReactNode;
  /** Focus this board's button when it changes. */
  focusKey?: string | null;
  /** A carried board was let go at rack place `toRackIndex` (or the unsaved board was dragged, at 0):
   * the rack's owner moves it (`moved`), leaves it where it was (`same`) or refuses (`refused`). */
  onMove?: (key: string, toRackIndex: number) => MoveResult;
}

/** The elements the frame loop writes to, one set per board. */
interface BoardNodes {
  group?: SVGGElement | null;
  body?: SVGPathElement | null;
  stringer?: SVGPathElement | null;
  words?: SVGTextElement | null;
  button?: HTMLButtonElement | null;
}

/** A board's turn on its way from one angle to another. */
interface Turn {
  from: number;
  to: number;
  start: number;
  duration: number;
}

/** A board's resting place (its slot's centre and its row's floor), gliding when its place in the
 * rack changes. */
interface Slide {
  index: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  start: number;
  duration: number;
}

/** A mouse or pen pressed on a board, not yet moved far enough to be a drag. */
interface Press {
  key: string;
  pointerId: number;
  pointerType: RackPointerType;
  x0: number;
  y0: number;
}

/** A board lifted and following the pointer. */
interface Carry {
  key: string;
  pointerId: number;
  /** Its place in the rack when it was lifted. */
  fromIndex: number;
  /** Where the pointer went down, from the board's slot centre and its row's floor. */
  grabX: number;
  grabY: number;
  /** How far the drawn board stood from its slot at the lift (the room a turning board had opened,
   * or made for a neighbour); it closes with the rest of the rack. */
  residual: number;
  liftAt: number;
  /** The pointer now, in the rack's own dots. */
  point: { x: number; y: number };
  /** The rack place it would land on now. */
  target: number;
}

interface Written {
  theta: number;
  x: number;
  y: number;
  top: number;
  carried: boolean;
}

/** Everything the frame loop keeps between frames — never React state. */
interface FrameState {
  started: boolean;
  /** Each board's current angle, by key. */
  theta: Map<string, number>;
  /** Each board's turn in progress, by key. */
  turn: Map<string, Turn>;
  /** The board the rack has settled on (or is settling on). */
  settledKey: string | null;
  /** The last `turnedKey` the parent handed in. */
  propKey: string | null;
  /** The last place the cursor was over a row's drawing, in the rack's own dots. */
  pointer: { x: number; y: number } | null;
  /** When the cursor last moved over a drawing. */
  lastMove: number;
  /** True from a cursor move over a drawing until the rack has rested on a board. */
  awaitingRest: boolean;
  raf: number;
  /** What was last written per board, so a frame touches only what changed. */
  written: Map<string, Written>;
  press: Press | null;
  carry: Carry | null;
  /** The rack's order while a board is carried, and after a drop until the new order arrives. */
  viewKeys: string[] | null;
  /** The boards' keys (joined) that `viewKeys` was made against. */
  viewFor: string;
  /** Each board's resting place, by key. */
  base: Map<string, Slide>;
  /** No board click counts until then (the end of a carry, or the unsaved board refusing). */
  suppressClickUntil: number;
}

/** What the frame loop reads from the latest render. */
interface Latest {
  boards: readonly RackBoard[];
  layout: HoverRackLayout;
  fits: SpineFit[];
  frozen: boolean;
  /** The shaper asked their device for less motion: only 0 and 90 degrees ever draw. */
  reduced: boolean;
  onTurn: (key: string) => void;
  onMove: (key: string, toRackIndex: number) => MoveResult;
}

function newFrameState(): FrameState {
  return {
    started: false,
    theta: new Map(),
    turn: new Map(),
    settledKey: null,
    propKey: null,
    pointer: null,
    lastMove: 0,
    awaitingRest: false,
    raf: 0,
    written: new Map(),
    press: null,
    carry: null,
    viewKeys: null,
    viewFor: "",
    base: new Map(),
    suppressClickUntil: 0,
  };
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

/** Settles the rack on the board nearest the cursor's last place over a drawing. */
function restOnNearest(frame: FrameState, latest: Latest) {
  frame.awaitingRest = false;
  const point = frame.pointer;
  const view = viewBoards(frame, latest);
  if (!point || view.length === 0) return;
  const board = view[hoverSlotAt(latest.layout, point.x, point.y)];
  if (!board) return;
  frame.settledKey = board.key;
  latest.onTurn(board.key);
}

/** The carried board's landing place under the pointer now — over the whole rack, so another row
 * too, clamped to the rack's ends and never in front of the unsaved board — and the order the rack
 * shows around it. */
function advanceCarry(frame: FrameState, latest: Latest) {
  const carry = frame.carry as Carry;
  const { boards, layout } = latest;
  const n = boards.length;
  const place = hoverSlotAt(layout, carry.point.x - carry.grabX, carry.point.y);
  const target = Math.min(Math.max(place, Math.min(firstMovablePlace(boards), n - 1)), n - 1);
  carry.target = target;
  const order = boards.filter((board) => board.key !== carry.key).map((board) => board.key);
  order.splice(target, 0, carry.key);
  frame.viewKeys = order;
  frame.viewFor = boards.map((board) => board.key).join("\n");
}

/** A board's resting place at its place `index`: where it stands, sliding over `SLOT_SLIDE_MS` along
 * its row when its place changes (the others opening a gap, a new order) — at once when it changes
 * row, or when only the layout changed (a new width). */
function slideBase(frame: FrameState, key: string, index: number, toX: number, toY: number, now: number, reduced: boolean) {
  let slide = frame.base.get(key);
  if (!slide || (slide.index === index && (slide.toX !== toX || slide.toY !== toY))) {
    slide = { index, fromX: toX, fromY: toY, toX, toY, start: now, duration: 0 };
    frame.base.set(key, slide);
  } else if (slide.index !== index) {
    const t = now - slide.start;
    const atX = tween(slide.fromX, slide.toX, t, slide.duration, reduced);
    const atY = tween(slide.fromY, slide.toY, t, slide.duration, reduced);
    slide =
      atY === toY
        ? { index, fromX: atX, fromY: atY, toX, toY, start: now, duration: SLOT_SLIDE_MS }
        : { index, fromX: toX, fromY: toY, toX, toY, start: now, duration: 0 };
    frame.base.set(key, slide);
  }
  const t = now - slide.start;
  const x = tween(slide.fromX, slide.toX, t, slide.duration, reduced);
  const y = tween(slide.fromY, slide.toY, t, slide.duration, reduced);
  return { x, y, done: x === slide.toX && y === slide.toY };
}

/**
 * One frame: works out every board's angle (following the cursor's distance in the row it is over,
 * else gliding to its resting angle), the room the rack makes around turning boards, a carried
 * board's place under the pointer and the gap it opens, and writes it all to the elements. Returns
 * whether another frame is needed.
 */
function stepRack(
  frame: FrameState,
  latest: Latest,
  nodes: Map<string, BoardNodes>,
  mark: SVGLineElement | null,
  now: number,
  options: { force: boolean; allowRest: boolean },
): boolean {
  const { layout, fits, frozen, reduced } = latest;
  const carry = frame.carry;
  if (carry) advanceCarry(frame, latest);
  if (options.allowRest && !frozen && !carry && frame.awaitingRest && now - frame.lastMove >= HOVER_REST_MS) {
    restOnNearest(frame, latest);
  }
  const boards = viewBoards(frame, latest);
  const carriedKey = carry ? carry.key : null;
  const positions = boards.map((_, k) => hoverSlotPosition(layout, k));
  const fitByKey = new Map(latest.boards.map((board, k) => [board.key, fits[k]] as const));
  // With reduced motion a board is either its side profile or its outline, never between:
  // sweeping changes nothing until the cursor rests (UI-SPEC §12). While a board is carried every
  // board closes to its side profile, so the gaps are predictable.
  const following = !frozen && !reduced && carriedKey === null && frame.awaitingRest && frame.pointer !== null;
  const followRow = following && frame.pointer ? hoverPointerZone(layout, frame.pointer.y).row : -1;
  let busy = following || carry !== null;

  const thetas = boards.map((board, k) => {
    const position = positions[k];
    const current = frame.theta.get(board.key) ?? 0;
    if (frozen) return current;
    if (position.row === followRow && frame.pointer) {
      // Straight from the cursor's distance, never tweened, so it never lags the pointer.
      const theta = turnAngle(frame.pointer.x - position.x, HOVER_SLOT);
      frame.turn.set(board.key, { from: theta, to: theta, start: now, duration: 0 });
      frame.theta.set(board.key, theta);
      return theta;
    }
    const target = followRow < 0 && carriedKey === null && board.key === frame.settledKey ? HALF_TURN : 0;
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

  // The room each row makes around its turning boards — the outline and a column of words — and
  // the neighbours step aside by half the extra each. A carried board follows the pointer and is
  // left out of the room-making: its place is the one-slot gap.
  const scale = layout.scale;
  const extras = boards.map((board, k) =>
    board.key === carriedKey ? 0 : boardExtra(halfExtent(board.art, thetas[k], scale), HOVER_SLOT, WORD_COLUMN),
  );
  const offsets = new Array<number>(boards.length).fill(0);
  for (let row = 0; row < layout.rows; row++) {
    const members: number[] = [];
    positions.forEach((position, k) => {
      if (position.row === row) members.push(k);
    });
    const rowOffsets = rackRoomOffsets(members.map((k) => extras[k]));
    members.forEach((k, j) => {
      offsets[k] = rowOffsets[j];
    });
  }

  boards.forEach((board, k) => {
    const theta = thetas[k];
    const position = positions[k];
    const base = slideBase(frame, board.key, k, position.x, position.floorY, now, reduced);
    if (!base.done) busy = true;
    const carried = board.key === carriedKey;
    let x = base.x + offsets[k];
    let y = base.y;
    if (carried && carry) {
      // Under the pointer exactly, lifted 12 dots, the room it had opened closing with the rack.
      const lift = tween(0, CARRY_LIFT, now - carry.liftAt, LIFT_MS, reduced);
      x = carry.point.x - carry.grabX + tween(carry.residual, 0, now - carry.liftAt, SETTLE_MS, reduced);
      y = carry.point.y - carry.grabY - lift;
    }
    const top = carried ? base.y - layout.rackHeight : y - layout.rackHeight;
    const last = frame.written.get(board.key);
    const turned = options.force || !last || Math.abs(last.theta - theta) >= 1e-4;
    const moved = options.force || !last || Math.abs(last.x - x) >= 0.01 || Math.abs(last.y - y) >= 0.01 || last.top !== top;
    const restyled = options.force || !last || last.carried !== carried;
    if (!turned && !moved && !restyled) return;
    const node = nodes.get(board.key);
    if (!node) return;
    frame.written.set(board.key, { theta, x, y, top, carried });
    if (moved) node.group?.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
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
      node.body?.setAttribute("d", turnedBoardPath(board.art, theta, scale, 0, 0));
      if (node.stringer) {
        node.stringer.setAttribute("d", stringerPath(board.art, theta, scale, 0, 0));
        node.stringer.setAttribute("opacity", Math.sin(theta).toFixed(3));
      }
      if (node.words) {
        const fontSize = fitByKey.get(board.key)?.fontSize ?? HOVER_WORD_SIZE;
        const anchor = spineAnchorX(board.art, theta, scale, fontSize);
        node.words.setAttribute("transform", `translate(${anchor.toFixed(2)} ${-WORD_END_ROOM}) rotate(-90)`);
        node.words.setAttribute("opacity", Math.max(0, Math.cos(theta)).toFixed(3));
      }
    }
    if (node.button) {
      // The button covers the board's own room: its slot plus the room it opens as it turns, so the
      // row's buttons tile it with no gap and no overlap.
      const room = HOVER_SLOT + extras[k];
      node.button.style.left = `${(x - room / 2).toFixed(2)}px`;
      node.button.style.top = `${top.toFixed(2)}px`;
      node.button.style.width = `${room.toFixed(2)}px`;
    }
  });

  // The drop mark: an accent line just under the target row's floor, centred on the gap the carried
  // board would land in — drawn only while a board is carried.
  if (mark) {
    if (carry) {
      const at = positions[carry.target];
      const centre = at.x + offsets[carry.target];
      mark.setAttribute("x1", (centre - DROP_MARK_WIDTH / 2).toFixed(2));
      mark.setAttribute("x2", (centre + DROP_MARK_WIDTH / 2).toFixed(2));
      mark.setAttribute("y1", String(at.floorY + DROP_MARK_DROP));
      mark.setAttribute("y2", String(at.floorY + DROP_MARK_DROP));
      mark.setAttribute("opacity", "1");
    } else if (mark.getAttribute("opacity") !== "0") {
      mark.setAttribute("opacity", "0");
    }
  }

  return busy;
}

const refuseMoves = (): MoveResult => "same";

/** The clock the pointer handlers read (the frame loop's own clock). */
function nowMs(): number {
  return performance.now();
}

export function HoverRack({
  boards,
  turnedKey,
  openKey,
  frozen,
  onTurn,
  onOpen,
  caption,
  focusKey = null,
  onMove = refuseMoves,
}: HoverRackProps) {
  const { system } = useUnits();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [fontFamily, setFontFamily] = useState("sans-serif");
  /** True while a board is carried: the caption band empties and the cursor reads "grabbing". Set
   * once at the lift and once at the drop — never per frame. */
  const [dragging, setDragging] = useState(false);

  const nodes = useRef(new Map<string, BoardNodes>());
  const frame = useRef<FrameState>(newFrameState());
  const latest = useRef<Latest | null>(null);
  const markRef = useRef<SVGLineElement | null>(null);
  /** What pressed a board last (D-05): a finger's first tap turns a board, a mouse click opens it. */
  const pressedWith = useRef<RackPointerType | null>(null);

  // The rack's own width, measured (it lays itself out in whatever room the page gives it).
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? root.clientWidth;
      setWidth(Math.round(next * 100) / 100);
      setFontFamily(getComputedStyle(root).fontFamily || "sans-serif");
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () =>
      hoverRackLayout({
        count: boards.length,
        contentWidth: width,
        longestMm: Math.max(0, ...boards.map((board) => board.art.length)),
        // How far each board reaches from its axis fully turned, in millimetres (a scale of 1):
        // the very figure the room is worked from, so the reserve holds it exactly.
        widestHalfMm: Math.max(0, ...boards.map((board) => halfExtent(board.art, HALF_TURN, 1))),
        wordColumnPx: WORD_COLUMN,
      }),
    [boards, width],
  );
  const positions = useMemo(() => boards.map((_, k) => hoverSlotPosition(layout, k)), [boards, layout]);
  const lines = useMemo(() => boards.map((board) => formatSummaryLine(board.summary, system)), [boards, system]);
  const fits = useMemo(() => {
    const measure = measureWords(fontFamily);
    return boards.map((board, k) =>
      fitSpineWords({ name: board.name, line: lines[k], maxLength: layout.rackHeight - 2 * WORD_END_ROOM, baseSize: HOVER_WORD_SIZE, measure }),
    );
  }, [boards, lines, layout.rackHeight, fontFamily]);
  const heightLines = useMemo(
    () => rackHeightLines(system, Math.max(0, ...boards.map((board) => board.art.length))),
    [boards, system],
  );
  const joinedKeys = boards.map((board) => board.key).join("\n");

  const kick = () => {
    const state = frame.current;
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      const current = latest.current;
      if (!current) return;
      const busy = stepRack(state, current, nodes.current, markRef.current, nowMs(), { force: false, allowRest: true });
      if (busy || state.awaitingRest) kick();
    });
  };

  // After every render: hand the frame loop the newest boards and layout, start the turned board
  // fully turned with no animation the first time (D-07), ease in a board turned from outside the
  // rack (a removal, a tap), and redraw everything at once so nothing paints stale.
  useLayoutEffect(() => {
    const state = frame.current;
    latest.current = { boards, layout, fits, frozen, reduced, onTurn, onMove };
    // A drop's order stands in until the new order arrives (or the boards change some other way).
    if (!state.carry && state.viewKeys !== null && state.viewFor !== joinedKeys) state.viewKeys = null;
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
        state.awaitingRest = false;
      }
    }
    if (width <= 0) return;
    const busy = stepRack(state, latest.current, nodes.current, markRef.current, nowMs(), { force: true, allowRest: false });
    if (busy) kick();
  });

  useEffect(() => {
    const state = frame.current;
    return () => {
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
    };
  }, []);

  useEffect(() => {
    if (focusKey) nodes.current.get(focusKey)?.button?.focus();
  }, [focusKey]);

  /** Lets go of a carried board (or, `cancelled`, puts it back): moved, it drops into its gap and
   * turns; dropped where it started, or cancelled, it goes back to its place with nothing said. */
  const dropBoard = (cancelled: boolean) => {
    const state = frame.current;
    const carry = state.carry;
    const current = latest.current;
    if (!carry || !current) return;
    const now = nowMs();
    // Where the pointer let go, not where the last frame saw it.
    if (!cancelled) advanceCarry(state, current);
    const written = state.written.get(carry.key);
    state.carry = null;
    state.suppressClickUntil = now + CLICK_AFTER_DROP_MS;
    const root = rootRef.current;
    if (root?.hasPointerCapture(carry.pointerId)) root.releasePointerCapture(carry.pointerId);
    const result: MoveResult = !cancelled && carry.target !== carry.fromIndex ? current.onMove(carry.key, carry.target) : "same";
    const moved = result === "moved" && state.viewKeys !== null;
    const index = moved ? carry.target : carry.fromIndex;
    if (!moved) state.viewKeys = null;
    // The board descends from under the pointer to its place.
    const to = hoverSlotPosition(current.layout, index);
    state.base.set(carry.key, {
      index,
      fromX: written?.x ?? to.x,
      fromY: written?.y ?? to.floorY,
      toX: to.x,
      toY: to.floorY,
      start: now,
      duration: DROP_MS,
    });
    setDragging(false);
    if (moved) {
      // It turns like any resting board, with its caption under it.
      state.settledKey = carry.key;
      state.awaitingRest = false;
      current.onTurn(carry.key);
    }
    kick();
  };

  const dropBoardRef = useRef(dropBoard);
  useEffect(() => {
    dropBoardRef.current = dropBoard;
  });

  // Escape, or the window losing focus, puts a carried board back where it was.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !frame.current.carry) return;
      event.preventDefault();
      dropBoardRef.current(true);
    };
    const onBlur = () => {
      if (frame.current.carry) dropBoardRef.current(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const pointIn = (clientX: number, clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : null;
  };

  /** The press moved past the drag threshold: the board lifts and the pointer carries it — unless it
   * is the unsaved board, which is never lifted: the rack's owner refuses it and says so. */
  const liftBoard = (press: Press, point: { x: number; y: number }) => {
    const state = frame.current;
    const current = latest.current;
    state.press = null;
    if (!current || frozen) return;
    const index = current.boards.findIndex((board) => board.key === press.key);
    const board = current.boards[index];
    if (!board) return;
    // Whatever happens next, the click at the end of this press is not a click on a board.
    state.suppressClickUntil = Number.POSITIVE_INFINITY;
    if (board.kind === "in-progress") {
      current.onMove(board.key, 0);
      return;
    }
    const rest = hoverSlotPosition(current.layout, index);
    const drawn = state.written.get(board.key)?.x ?? rest.x;
    state.carry = {
      key: board.key,
      pointerId: press.pointerId,
      fromIndex: index,
      grabX: press.x0 - rest.x,
      grabY: press.y0 - rest.floorY,
      residual: drawn - rest.x,
      liftAt: nowMs(),
      point,
      target: index,
    };
    state.awaitingRest = false;
    const root = rootRef.current;
    try {
      root?.setPointerCapture(press.pointerId);
    } catch {
      // The pointer is already gone (released between the event and now): the carry ends at once.
      state.carry = null;
      return;
    }
    setDragging(true);
    kick();
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // A finger never turns boards by passing over them; only a mouse or a pen does.
    if (event.pointerType === "touch" || width <= 0) return;
    const point = pointIn(event.clientX, event.clientY);
    if (!point) return;
    const state = frame.current;
    if (state.carry) {
      if (event.pointerId === state.carry.pointerId) {
        state.carry.point = point;
        kick();
      }
      return;
    }
    const press = state.press;
    if (press && event.pointerId === press.pointerId) {
      if (event.buttons === 0) {
        // The button came up somewhere this rack never heard about.
        state.press = null;
      } else if (hoverPressOutcome(press.pointerType, Math.hypot(point.x - press.x0, point.y - press.y0)) === "drag") {
        liftBoard(press, point);
        return;
      }
    }
    if (frozen) return;
    if (hoverPointerZone(layout, point.y).zone === "band") {
      // Under a row's floor line (the strip, the caption, the ⋯) the rack holds still, so a shaper
      // can reach the caption without the neighbours turning on the way: leaving the drawing is a
      // rest on the last board the cursor was over.
      if (state.awaitingRest) {
        state.lastMove = Number.NEGATIVE_INFINITY;
        kick();
      }
      return;
    }
    state.pointer = point;
    state.lastMove = nowMs();
    state.awaitingRest = true;
    kick();
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = frame.current;
    if (state.carry && event.pointerId === state.carry.pointerId) {
      dropBoard(false);
      return;
    }
    if (state.press && event.pointerId === state.press.pointerId) state.press = null;
    // The unsaved board's refusal: the click this press ends with is still swallowed, briefly.
    if (state.suppressClickUntil === Number.POSITIVE_INFINITY) state.suppressClickUntil = nowMs() + CLICK_AFTER_DROP_MS;
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = frame.current;
    if (state.carry && event.pointerId === state.carry.pointerId) dropBoard(true);
    else if (state.press && event.pointerId === state.press.pointerId) state.press = null;
  };

  const handleLostPointerCapture = (event: ReactPointerEvent<HTMLDivElement>) => {
    // The system took the pointer away mid-carry: back where it was, nothing said.
    const carry = frame.current.carry;
    if (carry && event.pointerId === carry.pointerId) dropBoard(true);
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const state = frame.current;
    if (state.carry || !state.awaitingRest) return;
    // Leaving the rack counts as a rest.
    state.lastMove = Number.NEGATIVE_INFINITY;
    kick();
  };

  /** A mouse or pen pressed on a board: it may become a drag once it has moved 6 dots. */
  const handleBoardPointerDown = (key: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    const pointerType: RackPointerType = event.pointerType === "touch" || event.pointerType === "pen" ? event.pointerType : "mouse";
    pressedWith.current = pointerType;
    const state = frame.current;
    state.suppressClickUntil = 0;
    if (pointerType === "touch" || frozen || state.carry || !event.isPrimary || event.button !== 0) return;
    const point = pointIn(event.clientX, event.clientY);
    if (!point) return;
    state.press = { key, pointerId: event.pointerId, pointerType, x0: point.x, y0: point.y };
  };

  // D-05, a touch-screen laptop: on this rack a finger turns and opens, never drags. Its first tap on
  // a board turns it and shows its caption without opening; a second tap on the turned board (or
  // Open This Board) opens it. A mouse or pen click — or Enter on a focused board — opens at once.
  const handleBoardClick = (key: string) => {
    const pressed = pressedWith.current;
    pressedWith.current = null;
    // The end of a drag (or of the unsaved board's refusal) is never a click on a board.
    if (nowMs() < frame.current.suppressClickUntil) return;
    if (pressed === "touch" && key !== turnedKey) {
      const state = frame.current;
      state.settledKey = key;
      state.awaitingRest = false;
      kick();
      onTurn(key);
      return;
    }
    onOpen(key);
  };

  const bindNode = (key: string, part: keyof BoardNodes) => (element: Element | null) => {
    const map = nodes.current;
    const entry = map.get(key) ?? {};
    (entry as Record<string, Element | null>)[part] = element;
    map.set(key, entry);
  };

  const height = width > 0 ? hoverRackHeight(layout) : FIRST_PAINT_HEIGHT;
  const n = boards.length;
  const turnedIndex = turnedKey === null ? -1 : boards.findIndex((board) => board.key === turnedKey);
  const turnedBoard = turnedIndex >= 0 ? boards[turnedIndex] : null;
  const turnedPosition = turnedIndex >= 0 ? positions[turnedIndex] : null;
  const captionLeft = turnedPosition
    ? Math.min(Math.max(0, turnedPosition.x - HOVER_CAPTION_WIDTH / 2), Math.max(0, width - HOVER_CAPTION_WIDTH))
    : 0;

  return (
    <div
      ref={rootRef}
      data-rack-kind="hover"
      className={dragging ? "relative cursor-grabbing [&_button]:cursor-grabbing" : "relative"}
      style={{ height, touchAction: "pan-y" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onPointerLeave={handlePointerLeave}
    >
      {width > 0 && (
        <>
          <svg
            aria-hidden="true"
            focusable="false"
            width={width}
            height={height}
            className="absolute top-0 left-0 select-none"
            style={{ overflow: "visible", fontFamily: "var(--font-sans)" }}
          >
            {Array.from({ length: layout.rows }, (_, row) => {
              const rowFloor = row * layout.rowBlock + HOVER_ROW_TOP_ROOM + layout.rackHeight;
              return (
                <g key={`row-${row}`}>
                  {heightLines.map((line) => {
                    const y = rowFloor - line.heightMm * layout.scale;
                    return (
                      <g key={line.label}>
                        <line
                          x1={LABEL_GUTTER - 2}
                          x2={width}
                          y1={y}
                          y2={y}
                          strokeWidth={1}
                          style={{ stroke: "var(--surf-line-faint)", strokeDasharray: "5 4" }}
                        />
                        <text
                          x={LABEL_GUTTER - 6}
                          y={y + 3.5}
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
                      </g>
                    );
                  })}
                  <line x1={0} x2={width} y1={rowFloor + 0.5} y2={rowFloor + 0.5} strokeWidth={1} style={{ stroke: "var(--surf-line)" }} />
                </g>
              );
            })}
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
                  fontSize={fits[k]?.fontSize ?? HOVER_WORD_SIZE}
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
              ref={markRef}
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
              className="focus-ring-accent absolute cursor-pointer rounded-sm bg-transparent p-0"
              style={{ height: layout.rackHeight }}
              onPointerDown={(event) => handleBoardPointerDown(board.key, event)}
              onClick={() => handleBoardClick(board.key)}
            />
          ))}
          {turnedBoard && turnedPosition && !dragging && (
            <div
              className="absolute"
              style={{
                top: turnedPosition.floorY + CAPTION_DROP,
                left: captionLeft,
                transition: reduced ? "none" : `left ${CAPTION_GLIDE_MS}ms ease-out`,
              }}
            >
              {caption(turnedBoard)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
