"use client";

/**
 * The computer's Board Rack (Phase 15, sketch 010 A — "follows the cursor"; R2, R3, R5).
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
 * `data-turn` and its button's `left` / `width` — straight onto the elements through refs. Nothing
 * that changes per frame is React state (RESEARCH Pattern 7), and no markup is ever built from a
 * string: a board's name is only ever React text.
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
import { CAPTION_GLIDE_MS, HOVER_REST_MS, SETTLE_MS, tween, type RackPointerType } from "@/lib/models/rack-gesture";

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
/** The rack's first-paint height before it has measured its width: one row (24 + 380 + 116). */
const FIRST_PAINT_HEIGHT = 520;

interface HoverRackProps {
  /** The boards, in the order the rack shows them. */
  boards: readonly RackBoard[];
  /** The board turned with its caption under it. */
  turnedKey: string | null;
  /** The board open in the editor, whose button says so (`aria-current`, D-07). */
  openKey: string | null;
  /** True while a dialog is open: the rack holds exactly still. */
  frozen: boolean;
  /** A board has finished turning (the cursor rested on it). */
  onTurn: (key: string) => void;
  /** A board was clicked to open. */
  onOpen: (key: string) => void;
  /** The caption to show under the turned board. */
  caption: (board: RackBoard) => ReactNode;
  /** Focus this board's button when it changes. */
  focusKey?: string | null;
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
  written: Map<string, { theta: number; x: number }>;
}

/** What the frame loop reads from the latest render. */
interface Latest {
  boards: readonly RackBoard[];
  layout: HoverRackLayout;
  positions: ReturnType<typeof hoverSlotPosition>[];
  fits: SpineFit[];
  frozen: boolean;
  /** The shaper asked their device for less motion: only 0 and 90 degrees ever draw. */
  reduced: boolean;
  onTurn: (key: string) => void;
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

/** Settles the rack on the board nearest the cursor's last place over a drawing. */
function restOnNearest(frame: FrameState, latest: Latest) {
  frame.awaitingRest = false;
  const point = frame.pointer;
  if (!point || latest.boards.length === 0) return;
  const board = latest.boards[hoverSlotAt(latest.layout, point.x, point.y)];
  if (!board) return;
  frame.settledKey = board.key;
  latest.onTurn(board.key);
}

/**
 * One frame: works out every board's angle (following the cursor's distance in the row it is over,
 * else gliding to its resting angle), the room the rack makes around turning boards, and writes it
 * all to the elements. Returns whether another frame is needed.
 */
function stepRack(frame: FrameState, latest: Latest, nodes: Map<string, BoardNodes>, now: number, options: { force: boolean; allowRest: boolean }): boolean {
  const { boards, layout, positions, fits, frozen, reduced } = latest;
  if (options.allowRest && !frozen && frame.awaitingRest && now - frame.lastMove >= HOVER_REST_MS) {
    restOnNearest(frame, latest);
  }
  // With reduced motion a board is either its side profile or its outline, never between:
  // sweeping changes nothing until the cursor rests (UI-SPEC §12).
  const following = !frozen && !reduced && frame.awaitingRest && frame.pointer !== null;
  const followRow = following && frame.pointer ? hoverPointerZone(layout, frame.pointer.y).row : -1;
  let busy = following;

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
    const target = followRow < 0 && board.key === frame.settledKey ? HALF_TURN : 0;
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
  // the neighbours step aside by half the extra each.
  const scale = layout.scale;
  const extras = boards.map((board, k) => boardExtra(halfExtent(board.art, thetas[k], scale), HOVER_SLOT, WORD_COLUMN));
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
    const x = position.x + offsets[k];
    const last = frame.written.get(board.key);
    if (!options.force && last && Math.abs(last.theta - theta) < 1e-4 && Math.abs(last.x - x) < 0.01) return;
    const node = nodes.get(board.key);
    if (!node) return;
    frame.written.set(board.key, { theta, x });
    const floorY = position.floorY;
    if (node.group) {
      node.group.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
      node.group.setAttribute("data-turn", String(Math.round((theta * 180) / Math.PI)));
    }
    node.body?.setAttribute("d", turnedBoardPath(board.art, theta, scale, 0, floorY));
    if (node.stringer) {
      node.stringer.setAttribute("d", stringerPath(board.art, theta, scale, 0, floorY));
      node.stringer.setAttribute("opacity", Math.sin(theta).toFixed(3));
    }
    if (node.words) {
      const fontSize = fits[k]?.fontSize ?? HOVER_WORD_SIZE;
      const anchor = spineAnchorX(board.art, theta, scale, fontSize);
      node.words.setAttribute("transform", `translate(${anchor.toFixed(2)} ${floorY - WORD_END_ROOM}) rotate(-90)`);
      node.words.setAttribute("opacity", Math.max(0, Math.cos(theta)).toFixed(3));
    }
    if (node.button) {
      // The button covers the board's own room: its slot plus the room it opens as it turns, so the
      // row's buttons tile it with no gap and no overlap.
      const room = HOVER_SLOT + extras[k];
      node.button.style.left = `${(x - room / 2).toFixed(2)}px`;
      node.button.style.width = `${room.toFixed(2)}px`;
    }
  });

  return busy;
}

export function HoverRack({ boards, turnedKey, openKey, frozen, onTurn, onOpen, caption, focusKey = null }: HoverRackProps) {
  const { system } = useUnits();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [fontFamily, setFontFamily] = useState("sans-serif");

  const nodes = useRef(new Map<string, BoardNodes>());
  const frame = useRef<FrameState>(newFrameState());
  const latest = useRef<Latest | null>(null);
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

  const kick = () => {
    const state = frame.current;
    if (state.raf) return;
    state.raf = requestAnimationFrame(() => {
      state.raf = 0;
      const current = latest.current;
      if (!current) return;
      const busy = stepRack(state, current, nodes.current, performance.now(), { force: false, allowRest: true });
      if (busy || state.awaitingRest) kick();
    });
  };

  // After every render: hand the frame loop the newest boards and layout, start the turned board
  // fully turned with no animation the first time (D-07), ease in a board turned from outside the
  // rack (a removal, a tap), and redraw everything at once so nothing paints stale.
  useLayoutEffect(() => {
    const state = frame.current;
    latest.current = { boards, layout, positions, fits, frozen, reduced, onTurn };
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
    const busy = stepRack(state, latest.current, nodes.current, performance.now(), { force: true, allowRest: false });
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

  const pointIn = (clientX: number, clientY: number) => {
    const rect = rootRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : null;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    // A finger never turns boards by passing over them; only a mouse or a pen does.
    if (event.pointerType === "touch" || width <= 0) return;
    const point = pointIn(event.clientX, event.clientY);
    if (!point) return;
    const state = frame.current;
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
    state.lastMove = performance.now();
    state.awaitingRest = true;
    kick();
  };

  const handlePointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const state = frame.current;
    if (!state.awaitingRest) return;
    // Leaving the rack counts as a rest.
    state.lastMove = Number.NEGATIVE_INFINITY;
    kick();
  };

  // D-05, a touch-screen laptop: on this rack a finger turns and opens, never drags. Its first tap on
  // a board turns it and shows its caption without opening; a second tap on the turned board (or
  // Open This Board) opens it. A mouse or pen click — or Enter on a focused board — opens at once.
  const handleBoardClick = (key: string) => {
    const pressed = pressedWith.current;
    pressedWith.current = null;
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
      className="relative"
      style={{ height, touchAction: "pan-y" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {width > 0 && (
        <>
          <svg
            aria-hidden="true"
            focusable="false"
            width={width}
            height={height}
            className="absolute top-0 left-0"
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
              style={{ top: positions[k].topY, height: layout.rackHeight }}
              onPointerDown={(event) => {
                pressedWith.current = event.pointerType === "touch" || event.pointerType === "pen" ? event.pointerType : "mouse";
              }}
              onClick={() => handleBoardClick(board.key)}
            />
          ))}
          {turnedBoard && turnedPosition && (
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
