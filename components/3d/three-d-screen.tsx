"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { BoardNameTab } from "@/components/design/board-name-tab";
import { bandBoardName } from "@/components/design/board-name-copy";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { useDesign } from "@/components/design/design-store";
import { useBelowShellWidth, useReducedMotion } from "@/components/design/use-viewer-media";
import { AT_ONE_CROP, cropRect, cropStep, cropZoomAt, isAtOneCrop, type CropView } from "@/components/viewer/crop-zoom";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { DEFAULT_MAX_ZOOM, normaliseWheelDelta, stepZoom, wheelStep, type WheelAccumulator } from "@/components/viewer/zoom-math";
import { ViewerZoomRow } from "@/components/viewer/zoom-viewport";
import { buildBoardSurface } from "@/lib/geometry/board-surface";
import { renderMesh, stringerLines } from "@/lib/geometry/board-surface-render";
import { designCrossSectionInput } from "@/lib/geometry/design";
import type { Vec3 } from "@/lib/geometry/board-surface";
import { easeOut } from "@/lib/models/rack-gesture";
import {
  cameraAxes,
  dragTurn,
  frameAtOne,
  framePointsOf,
  glideAt,
  keyTurn,
  quatMultiply,
  REST_TURN,
  slerpShortest,
  VIEW_TURN_MS,
  VIEW_TURNS,
  type Frame,
  type Quat,
  type ViewName,
} from "@/lib/geometry/view-3d";
import type { BoardSceneHandle, BoardSceneInput, BoardSceneState, SceneColours } from "./board-scene";
import { ThreeDControls, ThreeDHardEdge } from "./three-d-controls";
import { THREE_D_COPY } from "./three-d-copy";

/**
 * The 3D screen (Phase 16, R1–R3, UI-SPEC §1–§3, §8, §9, §13): the board the shaper designed, drawn as a lit solid
 * in the shaping room.
 *
 * The board is the litres' own (D-05): its surface is built from exactly the input VOLUME adds up
 * (`designCrossSectionInput`), so the 3D board and the litres beside it can never disagree about the shape, and it
 * is rebuilt whenever the design changes — including the tail's Hard Edge settings on RAILS.
 *
 * The drawing code (three.js) is fetched only here, by a dynamic `import()` of the scene module inside an effect (research
 * Pattern 5); `import type` above is erased from the bundle. What the canvas shows, in one place:
 * - `loading` — the ground colour until the scene has drawn its first frame (the loading picture is 16-11's);
 * - `ready` — the board;
 * - `lost` — the drawing context went away for a moment; the board and view are kept and come back with it;
 * - `no-webgl` — this browser offers no 3D drawing, or a lost context never came back;
 * - `cant-build` — the surface builder refused this board (logged with `console.error`);
 * - `didnt-load` — the drawing code never arrived (logged with `console.error`).
 * Each of the last three shows the contract's two-line message instead of a board.
 *
 * Nothing here is stored or saved, and nothing announces the screen (D-17, D-18).
 */

type CanvasState = "loading" | BoardSceneState | "cant-build" | "didnt-load";

/** The theme's colours as `#rrggbb` (any CSS colour a token holds, `color-mix` included), read once. */
function readSceneColours(): SceneColours {
  const style = getComputedStyle(document.documentElement);
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const resolve = (name: string, fallback: string) => {
    const value = style.getPropertyValue(name).trim() || fallback;
    if (!probe) return value;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = fallback;
    probe.fillStyle = value;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
  };
  return {
    canvas: resolve("--surf-3d-ground", "#9d9b95"),
    foam: resolve("--surf-foam", "#ffffff"),
    onFoam: resolve("--surf-on-foam", "#1f2a3b"),
    inkMuted: resolve("--surf-ink-muted", "#566171"),
    blankLine: resolve("--outline-blank-line", "#566171"),
  };
}

/** How far back a release looks for the drag's speed: a board held still this long before letting go doesn't glide. */
const GLIDE_SAMPLE_MS = 80;

/** The turn as the host's `data-turn` reports it to the tests: four numbers to 1e-4. */
function turnText(turn: Quat): string {
  return turn.map((v) => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4)).join(" ");
}

/** The crop as the host's `data-crop` reports it to the tests: the level, then the slide's two fractions to 1e-4. */
function cropText(view: CropView): string {
  const f = (v: number) => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4);
  return `${view.zoom} ${f(view.cx)} ${f(view.cy)}`;
}

/** A message centred on the canvas: what happened, then what to do (UI-SPEC §8). */
function CanvasMessage({ line1, line2 }: { line1: string; line2: string }) {
  return (
    // On the canvas's ground (`--surf-canvas`, not the darker ground behind the board: the muted second line needs
    // the canvas's 4.58:1 — on the 3D ground it would fall to 2.76:1), covering the host (and any canvas a lost context left behind), so the host keeps
    // its spoken name while the message shows.
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-surf-canvas"
      data-canvas-message
    >
      <div className="flex max-w-[280px] flex-col gap-1 px-4 text-center">
        <p className="text-sm font-normal text-surf-ink">{line1}</p>
        <p className="text-xs font-normal text-surf-ink-muted">{line2}</p>
      </div>
    </div>
  );
}

export function ThreeDScreen() {
  const { outlineGeometry, sideProfile, effectiveRails, outline, boardName, modelId } = useDesign();

  // The board's surface, from the litres' own input. A board the builder refuses (a value that isn't a number,
  // a length outside the app's range) gets the can't-build message rather than a half-built shape.
  const built = useMemo(() => {
    try {
      const surface = buildBoardSurface({
        sections: designCrossSectionInput(outlineGeometry, sideProfile, effectiveRails, outline.length),
        geometry: outlineGeometry,
        rockerAt: sideProfile.rockerAt,
      });
      const { centre, points } = framePointsOf(surface.positions);
      const board: Omit<BoardSceneInput, "colours"> = {
        mesh: renderMesh(surface),
        stringer: stringerLines(surface),
        framePoints: points,
        centre,
      };
      return { ok: true as const, board, triangles: surface.triangleCount };
    } catch (error) {
      return { ok: false as const, error };
    }
  }, [outlineGeometry, sideProfile, effectiveRails, outline.length]);

  useEffect(() => {
    if (!built.ok) console.error("The 3D board could not be built:", built.error);
  }, [built]);

  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BoardSceneHandle | null>(null);
  const coloursRef = useRef<SceneColours | null>(null);
  const boardRef = useRef<Omit<BoardSceneInput, "colours"> | null>(null);
  // The board's turn (16-07, UI-SPEC §5): plain numbers (lib/geometry/view-3d.ts) kept in a ref, never in React
  // state (the rack's Pattern 7). Each change hands it to the scene, which turns the board's group alone and draws
  // one frame — the camera and the lights never move (D-10). Nothing is remembered between visits (D-17).
  const turnRef = useRef<Quat>(REST_TURN);
  /** The glide or view turn under way, if any: its animation frame. */
  const motionRef = useRef(0);
  /** A view picked while the drawing was still loading: applied, framed at 1x, when the board appears (§9). */
  const pendingFrameRef = useRef(false);
  // The zoom and the slide (16-09, UI-SPEC §4–§5): a crop of the fixed camera's picture (crop-zoom.ts), kept in a
  // ref like the turn and handed straight to the scene, which draws one frame per change. React state holds only
  // what the zoom row shows — the level, and whether there is anything for Back to 1x to undo.
  const cropRef = useRef<CropView>(AT_ONE_CROP);
  const [zoomRow, setZoomRow] = useState<{ zoom: number; atOne: boolean }>({ zoom: 1, atOne: true });
  const belowShellWidth = useBelowShellWidth();
  // What the scene last reported. Each mount's cleanup puts it back to `loading`, and a mount that has gone can
  // no longer report, so a scene that comes back (after the board could not be built and then could again) never
  // shows an old mount's state.
  const [sceneState, setSceneState] = useState<CanvasState>("loading");
  const buildable = built.ok;

  /** Hands the crop to the scene for the canvas's size now — a resized canvas keeps the same zoom and slide. */
  const pushCrop = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const view = cropRef.current;
    host.dataset.crop = cropText(view);
    sceneRef.current?.setCrop(isAtOneCrop(view) ? null : cropRect(view, host.clientWidth, host.clientHeight));
  }, []);

  const applyCrop = useCallback(
    (view: CropView) => {
      const last = cropRef.current;
      if (view.zoom === last.zoom && view.cx === last.cx && view.cy === last.cy) return;
      cropRef.current = view;
      pushCrop();
      const atOne = isAtOneCrop(view);
      setZoomRow((row) => (row.zoom === view.zoom && row.atOne === atOne ? row : { zoom: view.zoom, atOne }));
    },
    [pushCrop],
  );

  // Hand every new board to the scene that is drawing (the turn and the room are kept).
  useEffect(() => {
    boardRef.current = built.ok ? built.board : null;
    if (built.ok && sceneRef.current && coloursRef.current) {
      sceneRef.current.setBoard({ ...built.board, colours: coloursRef.current });
    }
  }, [built]);

  // Fetch the drawing code and start the scene; one scene per mount, each with its own canvas (research
  // Pitfall 4: React's development double-mount must never re-use a canvas whose context was given up).
  useEffect(() => {
    const host = hostRef.current;
    if (!buildable || !host) return;
    let live = true;
    let handle: BoardSceneHandle | null = null;
    let observer: ResizeObserver | null = null;
    const report = (state: CanvasState) => {
      if (live) setSceneState(state);
    };
    import("./board-scene")
      .then(({ mountBoardScene }) => {
        const board = boardRef.current;
        if (!live || !board) return;
        // The theme's colours are read here, once the code has arrived, and never in the effect itself: on the
        // first load this effect runs before the theme provider's own (a parent's effects run after its
        // children's), while the page's theme class is briefly missing, so Slate and Phosphor read Daylight's
        // ground and foam. By the time the import has resolved, every effect of that first pass has run.
        const colours = readSceneColours();
        coloursRef.current = colours;
        handle = mountBoardScene(host, { ...board, colours }, { onState: report });
        sceneRef.current = handle;
        // A turn made or a view picked while the drawing was still loading is applied as the board appears (UI-SPEC
        // §9); a view is framed at 1x for its own turn, as its button would have.
        if (pendingFrameRef.current) {
          pendingFrameRef.current = false;
          const aspect = host.clientWidth / Math.max(1, host.clientHeight);
          handle.setTurn(turnRef.current, frameAtOne(board.framePoints, turnRef.current, aspect));
        } else if (turnRef.current !== REST_TURN) handle.setTurn(turnRef.current);
        // Every new size re-works 1x for the board's turn (the scene's resize) and keeps the zoom and the slide.
        const fit = () => {
          handle?.resize(host.clientWidth, host.clientHeight);
          pushCrop();
        };
        fit();
        observer = new ResizeObserver(fit);
        observer.observe(host);
      })
      .catch((error: unknown) => {
        console.error("The 3D view's drawing code did not load:", error);
        report("didnt-load");
      });
    return () => {
      live = false;
      observer?.disconnect();
      handle?.dispose();
      if (sceneRef.current === handle) sceneRef.current = null;
      setSceneState("loading");
    };
  }, [buildable, pushCrop]);

  // ------------------------------------------------------------------------------------------------------------
  // Turning the board by hand (16-07, UI-SPEC §5): a drag turns it like a ball under the hand, and letting go of a
  // moving drag lets it glide to rest — never under reduced motion, and the board never turns by itself (D-13).
  // ------------------------------------------------------------------------------------------------------------
  const reducedMotion = useReducedMotion();
  const reducedRef = useRef(reducedMotion);
  useEffect(() => {
    reducedRef.current = reducedMotion;
  }, [reducedMotion]);
  const dragRef = useRef<{ id: number; x: number; y: number; samples: { t: number; x: number; y: number }[] } | null>(
    null,
  );

  const applyTurn = useCallback((turn: Quat) => {
    turnRef.current = turn;
    const host = hostRef.current;
    if (host) host.dataset.turn = turnText(turn);
    sceneRef.current?.setTurn(turn);
  }, []);

  const stopMotion = useCallback(() => {
    if (motionRef.current) cancelAnimationFrame(motionRef.current);
    motionRef.current = 0;
  }, []);

  // The host reports the turn from its first paint, and a motion under way stops when the screen goes.
  useEffect(() => {
    const host = hostRef.current;
    if (host) host.dataset.turn = turnText(turnRef.current);
    return stopMotion;
  }, [stopMotion]);

  const shortSide = () => {
    const host = hostRef.current;
    return host ? Math.min(host.clientWidth, host.clientHeight) : 0;
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // One primary pointer turns the board: the mouse's left button, one finger or a pen. (Two fingers, the right
    // button and Shift are the slide and the pinch, 16-09's.)
    if (!event.isPrimary || dragRef.current) return;
    if (event.pointerType === "mouse" && (event.button !== 0 || event.shiftKey)) return;
    stopMotion();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer counts as active can't be captured; the drag still works inside the canvas.
    }
    const point = { t: performance.now(), x: event.clientX, y: event.clientY };
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, samples: [point] };
    if (event.pointerType === "mouse") event.currentTarget.style.cursor = "grabbing";
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (dx === 0 && dy === 0) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    const t = performance.now();
    drag.samples.push({ t, x: event.clientX, y: event.clientY });
    while (drag.samples.length > 2 && drag.samples[0].t < t - GLIDE_SAMPLE_MS) drag.samples.shift();
    applyTurn(dragTurn(turnRef.current, dx, dy, shortSide()));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, glide: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    const host = event.currentTarget;
    host.style.cursor = "";
    if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
    // The glide (D-13): the drag's speed over its last moment keeps the board turning, slowing to rest over
    // GLIDE_MS. Under reduced motion the board stops dead where it was let go.
    if (!glide || reducedRef.current) return;
    const now = performance.now();
    const recent = drag.samples.filter((s) => s.t >= now - GLIDE_SAMPLE_MS);
    const short = shortSide();
    if (recent.length < 2 || !(short > 0)) return;
    const first = recent[0];
    const last = recent[recent.length - 1];
    const k = Math.PI / short / Math.max(1, now - first.t);
    const vx = (last.x - first.x) * k;
    const vy = (last.y - first.y) * k;
    if (vx === 0 && vy === 0) return;
    // About the very axis `dragTurn` turns about: the picture's up for a sideways drag, its right for an up-down one.
    const { right, up } = cameraAxes();
    const velocity: Vec3 = [up[0] * vx + right[0] * vy, up[1] * vx + right[1] * vy, up[2] * vx + right[2] * vy];
    const start = turnRef.current;
    const began = performance.now();
    const tick = () => {
      const { turnSince, done } = glideAt(velocity, performance.now() - began);
      applyTurn(quatMultiply(turnSince, start));
      motionRef.current = done ? 0 : requestAnimationFrame(tick);
    };
    motionRef.current = requestAnimationFrame(tick);
  };

  // ------------------------------------------------------------------------------------------------------------
  // The preset views, Reset View and the keys (16-07, UI-SPEC §3, §5, §13).
  // ------------------------------------------------------------------------------------------------------------
  /** What the hidden live region last said, and how many times — a new node each time, so a repeat is heard. */
  const [spoken, setSpoken] = useState<{ text: string; count: number }>({ text: "", count: 0 });
  const say = (text: string) => setSpoken((last) => ({ text, count: last.count + 1 }));
  const descriptionId = useId();

  /**
   * Turns the board to `target` the short way round and re-frames it at 1x for that turn: over VIEW_TURN_MS with
   * the rack's settle curve, or at once under reduced motion. Any glide or turn under way stops first. Picked
   * while the drawing is still loading, the view is kept and applied when the board appears.
   */
  const turnTo = (target: Quat, instant = false) => {
    stopMotion();
    dragRef.current = null;
    const scene = sceneRef.current;
    const board = boardRef.current;
    const host = hostRef.current;
    if (!scene || !board || !host || sceneState !== "ready") {
      turnRef.current = target;
      if (host) host.dataset.turn = turnText(target);
      pendingFrameRef.current = true;
      return;
    }
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    const toFrame = frameAtOne(board.framePoints, target, aspect);
    if (instant || reducedRef.current) {
      turnRef.current = target;
      host.dataset.turn = turnText(target);
      scene.setTurn(target, toFrame);
      return;
    }
    const fromTurn = turnRef.current;
    const fromFrame = scene.frame();
    const began = performance.now();
    const between = (a: Frame, b: Frame, k: number): Frame => ({
      distance: a.distance + (b.distance - a.distance) * k,
      right: a.right + (b.right - a.right) * k,
      up: a.up + (b.up - a.up) * k,
    });
    const tick = () => {
      const t = (performance.now() - began) / VIEW_TURN_MS;
      const done = t >= 1;
      const k = easeOut(t);
      const turn = done ? target : slerpShortest(fromTurn, target, k);
      turnRef.current = turn;
      host.dataset.turn = turnText(turn);
      scene.setTurn(turn, done ? toFrame : between(fromFrame, toFrame, k));
      motionRef.current = done ? 0 : requestAnimationFrame(tick);
    };
    motionRef.current = requestAnimationFrame(tick);
  };

  const onView = (name: ViewName) => {
    turnTo(VIEW_TURNS[name]);
    say(THREE_D_COPY.viewSpoken[name]);
  };
  const onReset = (instant = false) => {
    turnTo(REST_TURN, instant);
    say(THREE_D_COPY.resetSpoken);
  };

  /** The keys the canvas takes while it has focus (UI-SPEC §5): the arrows turn 15° at once, Home resets. Nothing
   * else is taken, so Tab always leaves. (Shift with an arrow, plus, minus and 0 are 16-09's.) */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || message) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const arrow = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as const)[
      event.key as "ArrowLeft"
    ];
    if (arrow) {
      event.preventDefault();
      stopMotion();
      applyTurn(keyTurn(turnRef.current, arrow));
    } else if (event.key === "Home") {
      event.preventDefault();
      onReset(true);
    }
  };

  // ------------------------------------------------------------------------------------------------------------
  // Zooming (16-09, UI-SPEC §4–§5): the zoom row and the wheel, in the 2D viewers' half steps, 1x to 10x.
  // ------------------------------------------------------------------------------------------------------------
  const onZoomStep = (steps: number) => {
    const host = hostRef.current;
    if (host) applyCrop(cropStep(cropRef.current, host.clientWidth, host.clientHeight, steps));
  };
  const onBackToOne = () => {
    if (isAtOneCrop(cropRef.current)) return;
    applyCrop(AT_ONE_CROP);
    say(THREE_D_COPY.oneXSpoken);
  };

  // The wheel: a native listener, not React's `onWheel`, which React attaches as passive and so can never stop the
  // page or the panel scrolling under the drawing. One notch is one half step toward the pointer (the 2D viewers'
  // wheel rule, zoom-math.ts).
  const zoomableRef = useRef(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let wheelAcc: WheelAccumulator = { sum: 0, lastMs: Number.NEGATIVE_INFINITY };
    const onWheel = (event: WheelEvent) => {
      if (!zoomableRef.current) return;
      event.preventDefault();
      const box = host.getBoundingClientRect();
      const px = event.clientX - box.left;
      const py = event.clientY - box.top;
      const delta = normaliseWheelDelta(event.deltaY, event.deltaMode, window.innerHeight);
      const step = wheelStep(wheelAcc, delta, event.timeStamp);
      wheelAcc = step.acc;
      if (step.steps === 0) return;
      const current = cropRef.current;
      const zoom = stepZoom(current.zoom, step.steps, DEFAULT_MAX_ZOOM);
      applyCrop(cropZoomAt(current, host.clientWidth, host.clientHeight, zoom, px, py));
    };
    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, [applyCrop]);

  const state: CanvasState = built.ok ? sceneState : "cant-build";
  const message =
    state === "cant-build"
      ? THREE_D_COPY.boardCantBeDrawn
      : state === "no-webgl"
        ? THREE_D_COPY.browserCantDraw
        : state === "didnt-load"
          ? THREE_D_COPY.didntLoad
          : null;
  const name = bandBoardName(modelId, boardName);
  // The zoom row comes with the board and goes while a canvas message shows (UI-SPEC §4, §8).
  const zoomable = state === "ready" || state === "lost";
  useEffect(() => {
    zoomableRef.current = zoomable;
  }, [zoomable]);

  return (
    <DesignScreenShell
      controls={
        <ThreeDControls onView={onView} onReset={() => onReset()} drawingUnavailable={message !== null}>
          <ThreeDHardEdge />
        </ThreeDControls>
      }
      canvas={
        <TabbedPanel
          tabs={[{ id: "board", label: THREE_D_COPY.tab }]}
          active="board"
          compactOnPhone="drawing"
          trailing={(strip) => <BoardNameTab touchClearance={strip.touchClearance} />}
        >
          {/* The canvas box: it fills the card on a computer and a sideways phone, and on an upright phone it is
              exactly tall enough that the drawing column comes out at its 66dvh cap — 31 dots of rims and the tab
              strip (UI-SPEC §2). Never printed (§12). */}
          <div className="relative flex min-h-0 flex-1 max-shell:h-[calc(66dvh-31px)] max-shell:flex-none print:hidden">
            {/* The scene makes its own <canvas> inside this host; React puts nothing else in it. */}
            <div
              ref={hostRef}
              data-board-3d
              data-board-state={state}
              data-triangles={built.ok ? built.triangles : 0}
              tabIndex={0}
              role="application"
              aria-roledescription={THREE_D_COPY.canvasRole}
              aria-label={THREE_D_COPY.canvasName(name)}
              aria-describedby={descriptionId}
              aria-busy={state === "loading" ? true : undefined}
              onKeyDown={onKeyDown}
              onPointerDown={message ? undefined : onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => endDrag(event, true)}
              onPointerCancel={(event) => endDrag(event, false)}
              onLostPointerCapture={(event) => endDrag(event, false)}
              className="focus-ring-accent absolute inset-0 cursor-grab touch-none overflow-hidden rounded-md bg-[var(--surf-3d-ground)] coarse:cursor-auto"
            />
            {message && <CanvasMessage line1={message.line1} line2={message.line2} />}
            {/* The zoom row every drawing has (UI-SPEC §4): under the corner toolbar at the shell's width, in the
                corner below it, where there is no toolbar. */}
            {zoomable && (
              <ViewerZoomRow
                zoom={zoomRow.zoom}
                maxZoom={DEFAULT_MAX_ZOOM}
                atOne={zoomRow.atOne}
                onStep={onZoomStep}
                onReset={onBackToOne}
                placement={belowShellWidth ? "corner" : "under-toolbar"}
              />
            )}
            {/* For a screen reader (UI-SPEC §13): how to move the board, and — always in the page, empty until a
                view is picked — which view it is now. Turning by hand is never announced. */}
            <p id={descriptionId} className="sr-only">
              {THREE_D_COPY.canvasDescription}
            </p>
            <div role="status" aria-live="polite" className="sr-only" data-three-d-spoken>
              {spoken.text && <span key={spoken.count}>{spoken.text}</span>}
            </div>
          </div>
        </TabbedPanel>
      }
    />
  );
}
