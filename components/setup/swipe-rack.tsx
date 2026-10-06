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
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/components/design/use-viewer-media";
import { useUnits } from "@/components/units-provider";
import { RACK_COPY } from "@/components/setup/rack-config";
import type { RackBoard } from "@/components/setup/use-rack-boards";
import { halfExtent, spineAnchorX, stringerPath, turnedBoardPath } from "@/lib/geometry/rack-art";
import {
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
  swipeSlotCentre,
  swipeSlotFor,
  swipeTrackWidth,
  turnAngle,
  type SpineFit,
} from "@/lib/geometry/rack-layout";
import { formatSummaryLine } from "@/lib/geometry/summary-line";
import { SETTLE_MS, SWIPE_SETTLE_MS, tween } from "@/lib/models/rack-gesture";

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
  written: Map<string, { theta: number; x: number }>;
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
  scroller: HTMLDivElement | null;
}

/** The refs the frame loop, the scroll listener and the settle timer share. */
interface RackRefs {
  frame: FrameState;
  latest: { current: Latest | null };
  nodes: Map<string, BoardNodes>;
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

/**
 * One frame: works out every board's angle (straight from its distance to the middle of the screen
 * while the track is moving, else gliding to its resting angle), the room the track opens around the
 * turning boards, and writes it all to the elements. Returns whether another frame is needed.
 */
function stepRack(frame: FrameState, latest: Latest, nodes: Map<string, BoardNodes>, now: number, force: boolean): boolean {
  const { boards, width, scale, slot, floorY, fits, frozen, reduced, scroller } = latest;
  const middle = (scroller ? scroller.scrollLeft : 0) + width / 2;
  // With reduced motion a board is either its side profile or its outline, never between: swiping
  // changes nothing until the track settles (UI-SPEC §12).
  const following = !frozen && !reduced && frame.scrolling;
  let busy = false;

  const thetas = boards.map((board, k) => {
    const current = frame.theta.get(board.key) ?? 0;
    if (frozen) return current;
    if (following) {
      // Straight from the scroll position, never tweened, so it never lags the thumb.
      const theta = turnAngle(middle - swipeSlotCentre(k, width, slot), slot);
      frame.turn.set(board.key, { from: theta, to: theta, start: now, duration: 0 });
      frame.theta.set(board.key, theta);
      return theta;
    }
    const target = board.key === frame.settledKey ? HALF_TURN : 0;
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
  // wide enough for the widest resting board and its words (`swipeSlotFor`, rack-room.test.ts).
  const extras = boards.map((board, k) =>
    thetas[k] > 0 ? boardExtra(halfExtent(board.art, thetas[k], scale), slot, WORD_COLUMN) : 0,
  );
  const offsets = rackRoomOffsets(extras);

  boards.forEach((board, k) => {
    const theta = thetas[k];
    const x = swipeSlotCentre(k, width, slot) + offsets[k];
    const last = frame.written.get(board.key);
    const turned = force || !last || Math.abs(last.theta - theta) >= 1e-4;
    const moved = force || !last || Math.abs(last.x - x) >= 0.01;
    if (!turned && !moved) return;
    const node = nodes.get(board.key);
    if (!node) return;
    frame.written.set(board.key, { theta, x });
    if (moved) node.group?.setAttribute("transform", `translate(${x.toFixed(2)} 0)`);
    if (turned) {
      node.group?.setAttribute("data-turn", String(Math.round((theta * 180) / Math.PI)));
      node.body?.setAttribute("d", turnedBoardPath(board.art, theta, scale, 0, floorY));
      if (node.stringer) {
        node.stringer.setAttribute("d", stringerPath(board.art, theta, scale, 0, floorY));
        node.stringer.setAttribute("opacity", Math.sin(theta).toFixed(3));
      }
      if (node.words) {
        const fontSize = fits[k]?.fontSize ?? SWIPE_WORD_SIZE;
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

  return busy;
}

/** Schedules one frame (at most one is ever waiting), and keeps going while a board is gliding. */
function kickRack(refs: RackRefs) {
  const state = refs.frame;
  if (state.raf) return;
  state.raf = requestAnimationFrame(() => {
    state.raf = 0;
    const current = refs.latest.current;
    if (!current || current.width <= 0) return;
    if (stepRack(state, current, refs.nodes, performance.now(), false)) kickRack(refs);
  });
}

/** The scroller has been still for `SWIPE_SETTLE_MS`: the board in the middle finishes turning. */
function settleRack(refs: RackRefs) {
  const state = refs.frame;
  state.settleTimer = 0;
  state.scrolling = false;
  const current = refs.latest.current;
  if (current && current.scroller && !current.frozen && current.boards.length > 0) {
    const board = current.boards[swipeMiddleIndex(current.scroller.scrollLeft, current.boards.length, current.slot)];
    if (board) {
      state.settledKey = board.key;
      current.onTurn(board.key);
    }
  }
  kickRack(refs);
}

/** Puts board `index` in the middle at once: an exact slot multiple, a snap point itself. */
function placeAt(scroller: HTMLDivElement, index: number, slot: number) {
  scroller.scrollLeft = swipeScrollLeftFor(Math.max(0, index), slot);
}

export function SwipeRack({ boards, turnedKey, openKey, frozen, onTurn, onOpen, caption, focusKey = null }: SwipeRackProps) {
  const { system } = useUnits();
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [fontFamily, setFontFamily] = useState("sans-serif");

  const refs = useRef<RackRefs>({ frame: newFrameState(), latest: { current: null }, nodes: new Map() });

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
    const { frame: state, latest, nodes } = refs.current;
    const scroller = scrollerRef.current;
    latest.current = { boards, width, scale, slot, floorY, fits, frozen, reduced, onTurn, scroller };
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
    if (stepRack(state, latest.current, nodes, performance.now(), true)) kickRack(refs.current);
  });

  // One passive scroll listener: it only marks the track as moving, restarts the settle timer and
  // schedules a frame — never more than one frame waiting, however fast the events come (T-15-20).
  useEffect(() => {
    const scroller = scrollerRef.current;
    const rack = refs.current;
    if (!scroller) return;
    const onScroll = () => {
      const state = rack.frame;
      state.scrolling = true;
      if (state.settleTimer) window.clearTimeout(state.settleTimer);
      state.settleTimer = window.setTimeout(() => settleRack(rack), SWIPE_SETTLE_MS);
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

  /** A tap on a board: the middle board opens; any other comes to the middle (and turns there). */
  const handleBoardClick = (key: string, index: number) => {
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
    scroller.scrollTo({ left: target, behavior: "smooth" });
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
                style={{ top: RING_ROOM, height: Math.max(0, size.height - 2 * RING_ROOM) }}
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
      <div style={{ height: SWIPE_CAPTION_HEIGHT }}>{turnedBoard && caption(turnedBoard)}</div>
    </div>
  );
}
