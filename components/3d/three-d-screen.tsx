"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { BoardNameTab } from "@/components/design/board-name-tab";
import { bandBoardName } from "@/components/design/board-name-copy";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { useDesign } from "@/components/design/design-store";
import { useReducedMotion } from "@/components/design/use-viewer-media";
import {
  AT_ONE_CROP,
  cropLimit,
  cropPinch,
  cropRect,
  cropSlide,
  cropStep,
  cropZoomAt,
  isAtOneCrop,
  type CropView,
} from "@/components/viewer/crop-zoom";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { ViewerToolbar, ViewerToolbarButton } from "@/components/viewer/toolbar-button";
import {
  DEFAULT_MAX_ZOOM,
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SLOP_PX,
  normaliseWheelDelta,
  PINCH_WHEEL_RATE,
  snapZoom,
  stepZoom,
  wheelStep,
  type WheelAccumulator,
} from "@/components/viewer/zoom-math";
import { ViewerZoomRow } from "@/components/viewer/zoom-viewport";
import { buildBoardSurface, wireLines, wireSegments } from "@/lib/geometry/board-surface";
import { renderMesh, stringerLines } from "@/lib/geometry/board-surface-render";
import { designCrossSectionInput } from "@/lib/geometry/design";
import { buildBlankGhost, type BlankGhost } from "@/lib/geometry/blank-ghost";
import { buildBlankTopView } from "@/lib/geometry/blank-top-view";
import { placedFins, type PlacedFin } from "@/lib/geometry/fin-outline";
import { TOP_VIEW_SAMPLES } from "@/components/rocker/rocker-top-view";
import type { Vec3 } from "@/lib/geometry/board-surface";
import { easeOut } from "@/lib/models/rack-gesture";
import {
  anglesBetween,
  AT_REST,
  bayLens,
  BOTTOM_UP,
  clampLift,
  clampViewer,
  fillCrop,
  firstViewOutline,
  isBottomUp,
  liftOfRaise,
  rackAngles,
  rackSeat,
  rackTurn,
  REST_VIEWER,
  shownAngles,
  standAt,
  totalRoll,
  viewerLook,
  walkBetween,
  walkDrag,
  walkGlideAt,
  walkKey,
  WALK_VIEWS,
  type BayLens,
  type RackAngles,
  type Viewer,
} from "@/lib/geometry/shaping-bay";
import { cameraAxes, dragTurn, framePointsOf, glideAt, keyTurn, quatMultiply, REST_TURN, slerpShortest, VIEW_TURN_MS, type Quat, type ViewName } from "@/lib/geometry/view-3d";
import type { BoardSceneHandle, BoardSceneInput, BoardSceneState, SceneColours } from "./board-scene";
import { ThreeDControls, ThreeDTailRail, type ExportState } from "./three-d-controls";
import {
  ThreeDModeSwitch,
  ThreeDOnTheRacks,
  ThreeDSightAlong,
  makeRackStore,
  type DragMode,
  type RaisedEnd,
} from "./three-d-rack-controls";
import { THREE_D_COPY } from "./three-d-copy";
import { ThreeDShowButtons } from "./three-d-show-buttons";
import { exportForCnc } from "./export-cnc";

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
 * - `loading` — the ground colour on the server's paint; once the page is live, the loading picture (the first view's
 *   own outline, drawn where the board will land, and after a second a line under it) until the scene has drawn its
 *   first frame (16-11, §9);
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

/** How long the loading picture shows alone before its line appears under it (UI-SPEC §9). */
const LOADING_LINE_AFTER_MS = 1000;

/** The page is live — its script has run — on the client and never on the server's paint (UI-SPEC §9 steps 1–2). */
const subscribeNever = () => () => {};
const isLive = () => true;
const isServerPaint = () => false;

/** The theme's colours as one string, to tell a real theme change from any other change to the page's classes. */
function coloursKey(colours: SceneColours): string {
  return [colours.canvas, colours.foam, colours.onFoam, colours.inkMuted, colours.blankLine].join(" ");
}

/** The loading picture's drawing: the first view's outline and stringer in the canvas's own dots, and where it ends. */
interface LoadingArt {
  board: string;
  stringer: string;
  bottom: number;
  width: number;
  height: number;
}

/** How far under the board the loading line sits, and the room it needs from the canvas's bottom edge. */
const LOADING_LINE_GAP = 12;
const LOADING_LINE_ROOM = 24;

/**
 * The loading picture (UI-SPEC §9, §10): the first view's own outline and stringer, drawn in the canvas's dots where the
 * lit board will land. After a second still loading, one line under it says so. Drawn on the canvas's ground; never a
 * fade.
 */
function LoadingPicture({ art, slow }: { art: LoadingArt | null; slow: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md" data-loading-picture>
      {art && (
        <svg aria-hidden className="absolute inset-0 size-full" viewBox={`0 0 ${art.width} ${art.height}`}>
          <path
            d={art.board}
            fill="var(--outline-board-fill)"
            stroke="var(--outline-ink)"
            strokeWidth={1.4}
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={art.stringer}
            fill="none"
            stroke="var(--outline-blank-line)"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      {slow && (
        // In the ink, not the muted ink: the line sits on the 3D ground (darker than the canvas in the light themes),
        // where muted ink would fall to 2.26:1; ink reads 5.20 / 5.20 / 15.29 / 7.84 there.
        <p
          className="absolute inset-x-0 px-4 text-center text-xs font-normal text-surf-ink"
          style={{
            top: art ? Math.min(art.bottom + LOADING_LINE_GAP, art.height - LOADING_LINE_ROOM) : "50%",
          }}
          data-loading-line
        >
          {THREE_D_COPY.gettingReady}
        </p>
      )}
    </div>
  );
}

/** A development server's picture scripts and specs may start with the room off; a production build never reads it. */
function readBareRoom(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return (globalThis as { __shaper3dBareRoom?: unknown }).__shaper3dBareRoom === true;
}

/** What a move takes the screen to: the board's lie, which face is up, where the viewer stands, and the crop. */
interface Move {
  angles?: RackAngles;
  flipped?: boolean;
  viewer?: Viewer;
  crop?: CropView;
}

/** How far back a release looks for the drag's speed: a board held still this long before letting go doesn't glide. */
const GLIDE_SAMPLE_MS = 80;
/** A tap is shorter than this, and travels less than `TAP_MAX_TRAVEL_PX` — the 2D viewers' own double-tap rule. */
const TAP_MAX_MS = 250;
const TAP_MAX_TRAVEL_PX = 10;
/** A trackpad pinch's running level is re-read from the shown level after this much quiet (as the 2D viewers do). */
const PINCH_WHEEL_RESYNC_MS = 300;
/** Shift with an arrow key slides the board this share of the canvas (UI-SPEC §5). */
const KEY_SLIDE_SHARE = 1 / 20;

/** Safari's own pinch events (a Mac trackpad, and an iPhone's page pinch). Not in the DOM types. */
interface SafariGestureEvent extends UIEvent {
  scale: number;
  clientX: number;
  clientY: number;
}

/** A pointer's place on the canvas, in its own CSS dots from the top-left corner. */
function canvasPoint(host: HTMLElement, clientX: number, clientY: number) {
  const box = host.getBoundingClientRect();
  return { x: clientX - box.left, y: clientY - box.top };
}

/** Captures a pointer to the canvas, so a drag keeps working outside it. A pointer the browser no longer counts as
 * active can't be captured; the drag still works inside the canvas. */
function capture(host: HTMLElement, pointerId: number) {
  try {
    host.setPointerCapture(pointerId);
  } catch {
    // See above.
  }
}

/** The turn as the host's `data-turn` reports it to the tests: four numbers to 1e-4. */
function turnText(turn: Quat): string {
  return turn.map((v) => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4)).join(" ");
}

/** Where the viewer stands as the host's `data-viewer` reports it to the tests: azimuth, elevation and sight, to 0.01°. */
function viewerText(viewer: Viewer): string {
  return [viewer.azimuthDeg, viewer.elevationDeg, viewer.sightDeg].map((v) => (Math.round(v * 100) / 100 + 0).toFixed(2)).join(" ");
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
  const { outlineGeometry, sideProfile, effectiveRails, outline, boardName, modelId, finPlacement, effectiveFins } =
    useDesign();

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
        wire: wireSegments(wireLines(surface)),
      };
      return { ok: true as const, surface, board, triangles: surface.triangleCount };
    } catch (error) {
      return { ok: false as const, error };
    }
  }, [outlineGeometry, sideProfile, effectiveRails, outline.length]);

  useEffect(() => {
    if (!built.ok) console.error("The 3D board could not be built:", built.error);
  }, [built]);

  // How this board sits on its racks: the Raise controls measure from it and Nose and Tail frame by it.
  const seat = useMemo(() => (built.ok ? rackSeat(built.board.framePoints) : null), [built]);

  // The fins (16-10, D-06, D-21, D-25): FINS' own placement, each fin stood on the board's bottom with its generic
  // outline. Shown unless the shaper switches Fins off — a view switch, never stored, never part of the board (D-17).
  const fins = useMemo(
    () =>
      placedFins(
        finPlacement.marks,
        effectiveFins.finSetup,
        effectiveFins.twinTemplate,
        outline.length,
        sideProfile.rockerAt,
      ),
    [finPlacement.marks, effectiveFins.finSetup, effectiveFins.twinTemplate, outline.length, sideProfile.rockerAt],
  );
  const droppedFins = finPlacement.marks.length - fins.length;
  useEffect(() => {
    if (droppedFins > 0) console.error(`The 3D board left out ${droppedFins} fin(s) whose figures are not numbers.`);
  }, [droppedFins]);
  const [showFins, setShowFins] = useState(true);
  const finsRef = useRef<{ fins: readonly PlacedFin[]; visible: boolean }>({ fins, visible: showFins });

  // The blank's ghost (16-11, D-08): the blank ROCKER draws — its top view built exactly as ROCKER builds it, and its
  // side view's bottom and deck — as a see-through shell round the board. Off until the shaper presses Blank; a hand-set
  // board has none. A view switch only: never stored, never part of the board or the files (D-16, D-17).
  const ghost = useMemo(
    () =>
      buildBlankGhost(
        sideProfile.blank,
        buildBlankTopView({
          blank: sideProfile.blank,
          geometry: outlineGeometry,
          length: sideProfile.length,
          samples: TOP_VIEW_SAMPLES,
        }),
      ),
    [sideProfile.blank, outlineGeometry, sideProfile.length],
  );
  const [showBlank, setShowBlank] = useState(false);
  const ghostRef = useRef<{ ghost: BlankGhost | null; visible: boolean }>({ ghost, visible: showBlank });

  // Contour Stripes (16-11, D-12) and the wire view (D-42): each replaces the foam's shading, so the board has one look
  // at a time. Off until pressed; a view switch only, like the other two.
  const [look, setLook] = useState<"shaded" | "stripes" | "wire">("shaded");
  const stripes = look === "stripes";
  const wire = look === "wire";
  const stripesRef = useRef(stripes);
  const wireRef = useRef(wire);

  const pageLive = useSyncExternalStore(subscribeNever, isLive, isServerPaint);
  const [loadingSlow, setLoadingSlow] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<BoardSceneHandle | null>(null);
  const coloursRef = useRef<SceneColours | null>(null);
  const boardRef = useRef<Omit<BoardSceneInput, "colours"> | null>(null);
  // The board's turn (16-07, UI-SPEC §5): plain numbers (lib/geometry/view-3d.ts) kept in a ref, never in React
  // state (the rack's Pattern 7). Each change hands it to the scene, which turns the board's group alone and draws
  // one frame — the strips never move (D-10). Nothing is remembered between visits (D-17).
  const turnRef = useRef<Quat>(REST_TURN);
  /** Which face was last put up by Flip, Deck or Bottom: the Rotate on Side reading is taken from it (D-43). */
  const flippedRef = useRef(false);
  /** Where the viewer stands (D-43, D-44): moved by Nose, Tail, Side, Sight Along and a walk; never stored. */
  const viewerRef = useRef<Viewer>(REST_VIEWER);
  /** What a drag does, as the handlers read it: never Walk Around with the room off. */
  const walkingRef = useRef(false);
  /** Whether the room is drawn: off, the board spins freely with no racks and no limit. */
  const roomRef = useRef(true);
  /** The glide or move under way, if any: its animation frame. */
  const motionRef = useRef(0);
  /**
   * The move under way and how it lands: a second press of Flip the Board starts from where the first is going, and a
   * slider, a drag or a key finishes the move at once rather than leaving the viewer stranded halfway.
   */
  const landingRef = useRef<{ move: Move; land: () => void } | null>(null);
  // What the panel reads (the rack's Pattern 7): only the panel's own controls re-render during a drag.
  const [rackStore] = useState(makeRackStore);
  // The zoom and the slide (16-09, UI-SPEC §4–§5): a crop of the fixed camera's picture (crop-zoom.ts), kept in a
  // ref like the turn and handed straight to the scene, which draws one frame per change. React state holds only
  // what the zoom row shows — the level, and whether there is anything for Back to 1x to undo.
  const cropRef = useRef<CropView>(AT_ONE_CROP);
  const [zoomRow, setZoomRow] = useState<{ zoom: number; atOne: boolean }>({ zoom: 1, atOne: true });
  // What the scene last reported. Each mount's cleanup puts it back to `loading`, and a mount that has gone can
  // no longer report, so a scene that comes back (after the board could not be built and then could again) never
  // shows an old mount's state.
  const [sceneState, setSceneState] = useState<CanvasState>("loading");
  const buildable = built.ok;

  // Export for CNC… (16-12, D-14, D-16): the zip of the very surface drawn here, built and downloaded inside the tap
  // with nothing awaited first (Safari's rule). It reads the surface and the board's name only — never the Fins, Blank,
  // Contour Stripes or Wire View switches — and needs no 3D drawing. The done line stays until the next export or until the
  // shaper leaves the screen (this state goes with the screen); a board that can't be built has nothing to export.
  const [exportResult, setExportResult] = useState<ExportState>({ kind: "idle" });
  const exportState: ExportState = built.ok ? exportResult : { kind: "cant-build" };
  const onExport = () => {
    if (!built.ok) return;
    try {
      const { fileName, sliceCount } = exportForCnc(built.surface, boardName);
      setExportResult({ kind: "done", fileName, sliceCount });
    } catch (error) {
      console.error("The CNC files could not be made:", error);
      setExportResult({ kind: "failed" });
    }
  };

  /** Shows a crop in the scene for the canvas's size now. */
  const showCrop = useCallback((view: CropView) => {
    const host = hostRef.current;
    if (!host) return;
    host.dataset.crop = cropText(view);
    sceneRef.current?.setCrop(isAtOneCrop(view) ? null : cropRect(view, host.clientWidth, host.clientHeight));
  }, []);

  /** Hands the crop to the scene for the canvas's size now — a resized canvas keeps the same zoom and slide. */
  const pushCrop = useCallback(() => showCrop(cropRef.current), [showCrop]);

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

  // Hand the fins and the Fins switch to the scene that is drawing; a press made while it loads applies when it arrives.
  // Nothing else changes: the turn, the frame and the crop stay as they are.
  useEffect(() => {
    finsRef.current = { fins, visible: showFins };
    sceneRef.current?.setFins(fins, showFins);
  }, [fins, showFins]);

  // The same for the blank's ghost and the Blank switch.
  useEffect(() => {
    ghostRef.current = { ghost, visible: showBlank };
    sceneRef.current?.setGhost(ghost, showBlank);
  }, [ghost, showBlank]);

  // And for Contour Stripes.
  useEffect(() => {
    stripesRef.current = stripes;
    sceneRef.current?.setStripes(stripes);
  }, [stripes]);

  // And for the wire view.
  useEffect(() => {
    wireRef.current = wire;
    sceneRef.current?.setWire(wire);
  }, [wire]);

  // The Room switch (the founder, 2026-11-05): "we also need a toggle to turn the room off (plain background)". On
  // when the screen opens; a view switch only, like the other three, and Walk Around has no meaning without it.
  const bareRoom = useSyncExternalStore(subscribeNever, readBareRoom, isServerPaint);
  const [roomPick, setRoomPick] = useState<boolean | null>(null);
  const roomOn = roomPick ?? !bareRoom;
  const [mode, setMode] = useState<DragMode>("turn");
  const dragMode: DragMode = roomOn ? mode : "turn";

  // The colours follow the theme while the screen is open (UI-SPEC § Color, §16): a new theme class on the page, or the
  // computer's own light or dark setting changing under System, re-reads the theme's colours and repaints the scene in
  // place — the turn, the zoom and the slide untouched. One observer and one listener, gone with the screen (T-16-24).
  useEffect(() => {
    const recolour = () => {
      // Before the scene's code arrives there is nothing to repaint: the scene reads the colours itself as it starts.
      if (!coloursRef.current) return;
      const colours = readSceneColours();
      if (coloursKey(colours) === coloursKey(coloursRef.current)) return;
      coloursRef.current = colours;
      sceneRef.current?.setColours(colours);
    };
    const observer = new MutationObserver(recolour);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", recolour);
    return () => {
      observer.disconnect();
      scheme.removeEventListener("change", recolour);
    };
  }, []);

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
        handle.setFins(finsRef.current.fins, finsRef.current.visible);
        handle.setGhost(ghostRef.current.ghost, ghostRef.current.visible);
        handle.setStripes(stripesRef.current);
        handle.setWire(wireRef.current);
        handle.setRoom(roomRef.current);
        handle.setFree(roomRef.current ? 0 : 1);
        // A turn made or a view picked while the drawing was still loading is applied as the board appears (UI-SPEC §9).
        handle.setTurn(turnRef.current);
        handle.setViewer(viewerRef.current);
        // Every new size re-works the lens (the scene's resize) and keeps the zoom and the slide.
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

  /** The panel's readings for the turn and the viewer as they stand. */
  const readPanel = useCallback(() => {
    rackStore.set({ ...shownAngles(turnRef.current, flippedRef.current), sight: viewerRef.current.sightDeg });
  }, [rackStore]);

  const applyTurn = useCallback(
    (turn: Quat, read = true) => {
      turnRef.current = turn;
      const host = hostRef.current;
      if (host) host.dataset.turn = turnText(turn);
      sceneRef.current?.setTurn(turn);
      if (read) readPanel();
    },
    [readPanel],
  );

  const applyViewer = useCallback(
    (viewer: Viewer, read = true) => {
      viewerRef.current = viewer;
      const host = hostRef.current;
      if (host) host.dataset.viewer = viewerText(viewer);
      sceneRef.current?.setViewer(viewer);
      if (read) readPanel();
    },
    [readPanel],
  );

  /** A turn by hand stays on the racks: past the limit it stops, and with the room off nothing holds it. */
  const heldTurn = (turn: Quat) => (roomRef.current ? clampLift(turn) : turn);

  /** This board's lens for this window, worked out once for each (the sum is too long for every move of a drag). */
  const lensRef = useRef<{ points: readonly Vec3[]; aspect: number; lens: BayLens } | null>(null);
  const lensNow = (): BayLens | null => {
    const board = boardRef.current;
    const host = hostRef.current;
    if (!board || !seat || !host) return null;
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    const last = lensRef.current;
    if (last && last.points === board.framePoints && last.aspect === aspect) return last.lens;
    const lens = bayLens(board.framePoints, seat, aspect);
    lensRef.current = { points: board.framePoints, aspect, lens };
    return lens;
  };

  /** A viewer by hand stays in the room: `clampViewer` for this board and this window's lens. */
  const heldViewer = (viewer: Viewer) => {
    const lens = lensNow();
    return lens && seat ? clampViewer(viewer, seat, lens) : viewer;
  };

  const stopMotion = useCallback(() => {
    if (motionRef.current) cancelAnimationFrame(motionRef.current);
    motionRef.current = 0;
    landingRef.current = null;
  }, []);

  /** Stops a glide where it is, and lands a move where it was going. */
  const finishMotion = useCallback(() => {
    const landing = landingRef.current;
    stopMotion();
    landing?.land();
  }, [stopMotion]);

  // The host reports the turn and the crop from its first paint, and a motion under way stops when the screen goes.
  useEffect(() => {
    const host = hostRef.current;
    if (host) {
      host.dataset.turn = turnText(turnRef.current);
      host.dataset.viewer = viewerText(viewerRef.current);
      host.dataset.crop = cropText(cropRef.current);
    }
    return stopMotion;
  }, [stopMotion]);

  const shortSide = () => {
    const host = hostRef.current;
    return host ? Math.min(host.clientWidth, host.clientHeight) : 0;
  };

  /** What the hidden live region last said, and how many times — a new node each time, so a repeat is heard. */
  const [spoken, setSpoken] = useState<{ text: string; count: number }>({ text: "", count: 0 });
  const say = (text: string) => setSpoken((last) => ({ text, count: last.count + 1 }));
  /** Back to 1x (the button, a double-click or double-tap, the 0 key): the zoom and the slide undone, the turn kept,
   * and a screen reader hears it. At 1x already, nothing happens and nothing is said. */
  const backToOne = () => {
    if (isAtOneCrop(cropRef.current)) return;
    applyCrop(AT_ONE_CROP);
    say(THREE_D_COPY.oneXSpoken);
  };

  // Two fingers, a slide and a double-tap (16-09, UI-SPEC §5): touch points down on the canvas by pointer id, the
  // pinch under way (worked out from its start), the mouse's slide, and the taps a double-tap is read from.
  const touchesRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{ start: CropView; mid: { x: number; y: number }; dist: number } | null>(null);
  const slideRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const tapRef = useRef<{ t: number; x: number; y: number; far: boolean } | null>(null);
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  /** The two fingers' midpoint and spread, from the first two touch points down. */
  const fingers = () => {
    const [a, b] = [...touchesRef.current.values()];
    return { mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, dist: Math.hypot(b.x - a.x, b.y - a.y) };
  };
  const startPinch = () => {
    pinchRef.current = { start: cropRef.current, ...fingers() };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const host = event.currentTarget;
    if (event.pointerType === "touch") {
      const p = canvasPoint(host, event.clientX, event.clientY);
      touchesRef.current.set(event.pointerId, p);
      capture(host, event.pointerId);
      if (touchesRef.current.size === 2) {
        // A second finger: the turn under way stops where it is, with no glide, and the two fingers zoom about their
        // midpoint and slide (UI-SPEC §5). The board's turn is untouched; a twist does nothing.
        dragRef.current = null;
        stopMotion();
        tapRef.current = null;
        lastTapRef.current = null;
        startPinch();
        return;
      }
      if (touchesRef.current.size > 2) return;
      tapRef.current = { t: event.timeStamp, x: p.x, y: p.y, far: false };
    } else if (event.button === 1 || event.button === 2 || (event.button === 0 && event.shiftKey)) {
      // Right-drag, middle-drag, or Shift with the left button (a one-button trackpad): slide the board.
      if (slideRef.current || dragRef.current) return;
      // A middle press would otherwise start the browser's own autoscroll.
      if (event.button === 1) event.preventDefault();
      stopMotion();
      capture(host, event.pointerId);
      slideRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      if (event.pointerType === "mouse") host.style.cursor = "move";
      return;
    }
    // One primary pointer turns the board: the mouse's left button, one finger or a pen.
    if (!event.isPrimary || dragRef.current) return;
    if (event.pointerType === "mouse" && (event.button !== 0 || event.shiftKey)) return;
    finishMotion();
    capture(host, event.pointerId);
    const point = { t: performance.now(), x: event.clientX, y: event.clientY };
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, samples: [point] };
    if (event.pointerType === "mouse") host.style.cursor = "grabbing";
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const host = event.currentTarget;
    if (event.pointerType === "touch" && touchesRef.current.has(event.pointerId)) {
      const p = canvasPoint(host, event.clientX, event.clientY);
      touchesRef.current.set(event.pointerId, p);
      const tap = tapRef.current;
      if (tap && Math.hypot(p.x - tap.x, p.y - tap.y) > TAP_MAX_TRAVEL_PX) tap.far = true;
      const pinch = pinchRef.current;
      if (pinch && touchesRef.current.size >= 2) {
        const { mid, dist } = fingers();
        applyCrop(cropPinch(pinch.start, host.clientWidth, host.clientHeight, pinch.mid, pinch.dist, mid, dist));
        return;
      }
    }
    const slide = slideRef.current;
    if (slide && slide.id === event.pointerId) {
      const dx = event.clientX - slide.x;
      const dy = event.clientY - slide.y;
      slideRef.current = { id: slide.id, x: event.clientX, y: event.clientY };
      applyCrop(cropSlide(cropRef.current, host.clientWidth, host.clientHeight, dx, dy));
      return;
    }
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
    if (walkingRef.current) applyViewer(heldViewer(walkDrag(viewerRef.current, dx, dy, shortSide())));
    else applyTurn(heldTurn(dragTurn(turnRef.current, dx, dy, shortSide(), viewerLook(viewerRef.current))));
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>, glide: boolean) => {
    const host = event.currentTarget;
    if (event.pointerType === "touch" && touchesRef.current.delete(event.pointerId)) {
      if (pinchRef.current) {
        // A third finger lifted: carry on from the two still down. Down to one: the pinch ends, and that finger
        // doesn't turn the board until a new touch starts.
        if (touchesRef.current.size >= 2) startPinch();
        else pinchRef.current = null;
        return;
      }
      // A double-tap goes back to 1x: two short taps close together in time and place (the 2D viewers' rule).
      const tap = tapRef.current;
      tapRef.current = null;
      if (glide && tap && !tap.far && event.timeStamp - tap.t < TAP_MAX_MS) {
        const last = lastTapRef.current;
        if (last && tap.t - last.t <= DOUBLE_TAP_MS && Math.hypot(tap.x - last.x, tap.y - last.y) <= DOUBLE_TAP_SLOP_PX) {
          lastTapRef.current = null;
          backToOne();
        } else {
          lastTapRef.current = { t: event.timeStamp, x: tap.x, y: tap.y };
        }
      }
    }
    const slide = slideRef.current;
    if (slide && slide.id === event.pointerId) {
      slideRef.current = null;
      host.style.cursor = "";
      if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
      return;
    }
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
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
    if (walkingRef.current) {
      // A walk glides on as a turn does (D-13), in the same degrees a drag walks.
      const velocity = { azimuthDeg: (vx * 180) / Math.PI, elevationDeg: (vy * 180) / Math.PI };
      const start = viewerRef.current;
      const began = performance.now();
      const tick = () => {
        const { azimuthDeg, elevationDeg, done } = walkGlideAt(velocity, performance.now() - began);
        applyViewer(
          heldViewer({
            ...start,
            azimuthDeg: start.azimuthDeg + azimuthDeg,
            elevationDeg: start.elevationDeg + elevationDeg,
          }),
        );
        motionRef.current = done ? 0 : requestAnimationFrame(tick);
      };
      motionRef.current = requestAnimationFrame(tick);
      return;
    }
    // About the very axis `dragTurn` turns about: the picture's up for a sideways drag, its right for an up-down one.
    const { right, up } = cameraAxes(viewerLook(viewerRef.current));
    const velocity: Vec3 = [up[0] * vx + right[0] * vy, up[1] * vx + right[1] * vy, up[2] * vx + right[2] * vy];
    const start = turnRef.current;
    const began = performance.now();
    const tick = () => {
      const { turnSince, done } = glideAt(velocity, performance.now() - began);
      applyTurn(heldTurn(quatMultiply(turnSince, start)));
      motionRef.current = done ? 0 : requestAnimationFrame(tick);
    };
    motionRef.current = requestAnimationFrame(tick);
  };

  // ------------------------------------------------------------------------------------------------------------
  // The preset views, Reset View and the keys (16-07, UI-SPEC §3, §5, §13).
  // ------------------------------------------------------------------------------------------------------------
  const descriptionId = useId();

  /**
   * Takes the screen to a move's lie, face, viewer and crop, together: over VIEW_TURN_MS with the rack's settle curve, or
   * at once under reduced motion. Any glide or move under way stops first. Picked while the drawing is still loading,
   * the move is kept and shows when the board appears. The panel's readings hold still until it lands, so Flip the Board
   * leaves them reading what they read.
   */
  const moveTo = (move: Move, instant = false) => {
    stopMotion();
    dragRef.current = null;
    const land = () => {
      landingRef.current = null;
      if (move.flipped !== undefined) flippedRef.current = move.flipped;
      if (move.angles) applyTurn(rackTurn(move.angles), false);
      if (move.viewer) applyViewer(move.viewer, false);
      if (move.crop) {
        showCrop(move.crop);
        applyCrop(move.crop);
      }
      readPanel();
    };
    if (!sceneRef.current || sceneState !== "ready" || instant || reducedRef.current) {
      land();
      return;
    }
    landingRef.current = { move, land };
    const fromAngles = rackAngles(turnRef.current);
    const fromViewer = viewerRef.current;
    const fromCrop = cropRef.current;
    const began = performance.now();
    const tick = () => {
      const t = (performance.now() - began) / VIEW_TURN_MS;
      if (t >= 1) {
        motionRef.current = 0;
        land();
        return;
      }
      const k = easeOut(t);
      if (move.angles) applyTurn(rackTurn(anglesBetween(fromAngles, move.angles, k)), false);
      if (move.viewer) applyViewer(walkBetween(fromViewer, move.viewer, k), false);
      if (move.crop) {
        const to = move.crop;
        showCrop({
          zoom: fromCrop.zoom + (to.zoom - fromCrop.zoom) * k,
          cx: fromCrop.cx + (to.cx - fromCrop.cx) * k,
          cy: fromCrop.cy + (to.cy - fromCrop.cy) * k,
        });
      }
      motionRef.current = requestAnimationFrame(tick);
    };
    motionRef.current = requestAnimationFrame(tick);
  };

  /** The crop that shows the board at Nose's and Tail's share of the window, standing at `viewer` (the founder, D-44). */
  const endCrop = (viewer: Viewer): CropView => {
    const board = boardRef.current;
    const host = hostRef.current;
    const lens = lensNow();
    if (!board || !seat || !host || !lens) return AT_ONE_CROP;
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    const fit = fillCrop(board.framePoints, rackAngles(turnRef.current), viewer, lens, seat, aspect);
    const zoom = snapZoom(fit.zoom, DEFAULT_MAX_ZOOM);
    const limit = cropLimit(zoom);
    const hold = (v: number) => Math.min(Math.max(v, -limit), limit) + 0;
    return { zoom, cx: hold(fit.cx), cy: hold(fit.cy) };
  };

  /**
   * The five buttons (the founder, D-44). Deck and Bottom put the board that way up on the racks with every slider at
   * rest, straight overhead in Walk Around. Nose, Tail and Side stand the viewer there, moving neither the board nor the
   * racks. No button ever swings the racks by itself; Deck and Bottom bring a swing back to rest.
   */
  const onView = (name: ViewName) => {
    if (name === "deck" || name === "bottom") {
      moveTo({
        angles: name === "deck" ? AT_REST : BOTTOM_UP,
        flipped: name === "bottom",
        viewer: walkingRef.current ? WALK_VIEWS[name] : { ...viewerRef.current, sightDeg: 0 },
        crop: AT_ONE_CROP,
      });
    } else {
      const viewer = standAt(name, rackAngles(turnRef.current).swing);
      moveTo({ viewer, crop: name === "side" ? AT_ONE_CROP : endCrop(viewer) });
    }
    say(THREE_D_COPY.viewSpoken[name]);
  };
  const onReset = (instant = false) => {
    moveTo({ angles: AT_REST, flipped: false, viewer: REST_VIEWER, crop: AT_ONE_CROP }, instant);
    say(THREE_D_COPY.resetSpoken);
  };

  /** Flip the Board: half a turn about its long axis on the racks. One press, never a pressed state. */
  const onFlip = () => {
    const landing = landingRef.current?.move;
    const now = landing?.angles ?? rackAngles(turnRef.current);
    const flipped = !(landing?.flipped ?? flippedRef.current);
    moveTo({ angles: { ...now, roll: now.roll + 180 }, flipped });
    say(THREE_D_COPY.flipSpoken[flipped ? "bottom" : "deck"]);
  };

  // Each control writes its own plane. The other two come from the turn's exact angles, never from the rounded thumbs,
  // so a whole-degree reading can never creep them (the plan's trap 1).
  const setPlane = (change: Partial<RackAngles>) => {
    finishMotion();
    applyTurn(rackTurn({ ...rackAngles(turnRef.current), ...change }));
  };
  const onRaise = (end: RaisedEnd, heightMm: number) => {
    if (!seat) return;
    setPlane({ lift: liftOfRaise(heightMm, seat) * (end === "nose" ? 1 : -1) });
  };
  const onRoll = (shown: number) => setPlane({ roll: totalRoll(shown, flippedRef.current) });
  const onSwing = (swing: number) => setPlane({ swing });
  const onSight = (sightDeg: number) => {
    finishMotion();
    applyViewer({ ...viewerRef.current, sightDeg });
  };

  /** The keys the canvas takes while it has focus (UI-SPEC §5), each at once: the arrows turn 15°, Shift with an
   * arrow slides a twentieth of the canvas, plus (or =) and minus zoom one step, 0 goes back to 1x and Home resets.
   * Nothing else is taken — no key with Ctrl, Alt or the command key, so the browser's own zoom keys still work —
   * and Tab always leaves. */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || message) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const host = event.currentTarget;
    if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "\u2212") {
      event.preventDefault();
      onZoomStep(event.key === "+" || event.key === "=" ? 1 : -1);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      backToOne();
      return;
    }
    const arrow = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as const)[
      event.key as "ArrowLeft"
    ];
    if (arrow && event.shiftKey) {
      event.preventDefault();
      const w = host.clientWidth * KEY_SLIDE_SHARE;
      const h = host.clientHeight * KEY_SLIDE_SHARE;
      const [dx, dy] = { left: [-w, 0], right: [w, 0], up: [0, -h], down: [0, h] }[arrow];
      applyCrop(cropSlide(cropRef.current, host.clientWidth, host.clientHeight, dx, dy));
      return;
    }
    if (event.shiftKey) return;
    if (arrow) {
      event.preventDefault();
      finishMotion();
      if (walkingRef.current) applyViewer(heldViewer(walkKey(viewerRef.current, arrow)));
      else applyTurn(heldTurn(keyTurn(turnRef.current, arrow, viewerLook(viewerRef.current))));
    } else if (event.key === "Home") {
      event.preventDefault();
      onReset(true);
    }
  };

  // What a drag does (D-43): pressing the switch stops any motion and moves nothing.
  const onMode = (next: DragMode) => {
    finishMotion();
    dragRef.current = null;
    setMode(next);
  };
  useEffect(() => {
    walkingRef.current = dragMode === "walk";
  }, [dragMode]);

  // With the room off nothing holds the board, and it turns about its home in any direction (D-44). Turning the room back
  // on settles it onto its racks by the nearest pose, with a glide.
  useEffect(() => {
    const was = roomRef.current;
    roomRef.current = roomOn;
    const scene = sceneRef.current;
    scene?.setRoom(roomOn);
    if (was === roomOn) return;
    stopMotion();
    if (!roomOn) {
      scene?.setFree(1);
      return;
    }
    const from = turnRef.current;
    const to = clampLift(from);
    flippedRef.current = isBottomUp(rackAngles(to).roll);
    if (!scene || reducedRef.current) {
      scene?.setFree(0);
      applyTurn(to);
      return;
    }
    const began = performance.now();
    const tick = () => {
      const t = (performance.now() - began) / VIEW_TURN_MS;
      const k = easeOut(t);
      scene.setFree(1 - k);
      applyTurn(t >= 1 ? to : slerpShortest(from, to, k), t >= 1);
      motionRef.current = t >= 1 ? 0 : requestAnimationFrame(tick);
    };
    motionRef.current = requestAnimationFrame(tick);
  }, [roomOn, applyTurn, stopMotion]);

  // ------------------------------------------------------------------------------------------------------------
  // Zooming (16-09, UI-SPEC §4–§5): the zoom row, the wheel, a trackpad pinch and the keys, in the 2D viewers' half
  // steps, 1x to 10x; and Wide view, which hides the sidebar exactly as TEMPLATE's and ROCKER's does (§2, §4).
  // ------------------------------------------------------------------------------------------------------------
  const [wideView, setWideView] = useState(false);
  const onZoomStep = (steps: number) => {
    const host = hostRef.current;
    if (host) applyCrop(cropStep(cropRef.current, host.clientWidth, host.clientHeight, steps));
  };

  // The wheel: a native listener, not React's `onWheel`, which React attaches as passive and so can never stop the
  // page or the panel scrolling under the drawing. One notch is one half step toward the pointer (the 2D viewers'
  // wheel rule, zoom-math.ts).
  const zoomableRef = useRef(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let wheelAcc: WheelAccumulator = { sum: 0, lastMs: Number.NEGATIVE_INFINITY };
    let pinchWheel = { zoom: 1, lastMs: Number.NEGATIVE_INFINITY };
    const onWheel = (event: WheelEvent) => {
      if (!zoomableRef.current) return;
      event.preventDefault();
      const { x, y } = canvasPoint(host, event.clientX, event.clientY);
      const delta = normaliseWheelDelta(event.deltaY, event.deltaMode, window.innerHeight);
      const current = cropRef.current;
      let zoom: number;
      if (event.ctrlKey) {
        // A trackpad pinch in Chrome and Firefox: in proportion to the pinch, snapped to the half steps.
        if (event.timeStamp - pinchWheel.lastMs > PINCH_WHEEL_RESYNC_MS) pinchWheel = { zoom: current.zoom, lastMs: 0 };
        const running = Math.min(Math.max(pinchWheel.zoom * Math.exp(-delta * PINCH_WHEEL_RATE), 1), DEFAULT_MAX_ZOOM);
        pinchWheel = { zoom: running, lastMs: event.timeStamp };
        zoom = running;
      } else {
        const step = wheelStep(wheelAcc, delta, event.timeStamp);
        wheelAcc = step.acc;
        if (step.steps === 0) return;
        zoom = stepZoom(current.zoom, step.steps, DEFAULT_MAX_ZOOM);
      }
      applyCrop(cropZoomAt(current, host.clientWidth, host.clientHeight, zoom, x, y));
    };

    // Safari's own pinch events: always cancelled, so an iPhone never pinch-zooms the page over the drawing; and on a
    // Mac trackpad, where a pinch arrives as these rather than ctrl + wheel, they zoom toward the pinch. On a touch
    // screen the fingers' own pointer events do the zooming, so these are ignored while a finger is down.
    let gesture: { start: CropView } | null = null;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gesture = touchesRef.current.size > 0 || !zoomableRef.current ? null : { start: cropRef.current };
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      if (!gesture || touchesRef.current.size > 0) return;
      const e = event as SafariGestureEvent;
      const { x, y } = canvasPoint(host, e.clientX, e.clientY);
      const zoom = gesture.start.zoom * e.scale;
      applyCrop(cropZoomAt(cropRef.current, host.clientWidth, host.clientHeight, zoom, x, y));
    };
    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      gesture = null;
    };

    // The canvas carries `touch-action: none`; these are the backstop, so no browser scrolls or zooms the page from
    // a finger on the drawing.
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length >= 2 && event.cancelable) event.preventDefault();
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.cancelable) event.preventDefault();
    };

    const active = { passive: false } as const;
    host.addEventListener("wheel", onWheel, active);
    host.addEventListener("gesturestart", onGestureStart, active);
    host.addEventListener("gesturechange", onGestureChange, active);
    host.addEventListener("gestureend", onGestureEnd, active);
    host.addEventListener("touchstart", onTouchStart, active);
    host.addEventListener("touchmove", onTouchMove, active);
    return () => {
      host.removeEventListener("wheel", onWheel);
      host.removeEventListener("gesturestart", onGestureStart);
      host.removeEventListener("gesturechange", onGestureChange);
      host.removeEventListener("gestureend", onGestureEnd);
      host.removeEventListener("touchstart", onTouchStart);
      host.removeEventListener("touchmove", onTouchMove);
    };
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
  // The loading picture shows once the page is live and until the lit board is ready; after a second, its line too.
  const loading = state === "loading" && pageLive;
  // Its drawing is the first view's own, so it needs the canvas's size, and goes when the board has landed. A board with
  // no surface has no picture: the line alone.
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !loading) return;
    const observer = new ResizeObserver(() => setCanvasSize({ width: host.clientWidth, height: host.clientHeight }));
    observer.observe(host);
    return () => observer.disconnect();
  }, [loading]);
  const loadingArt = useMemo<LoadingArt | null>(() => {
    if (!loading || !built.ok || !seat || !canvasSize || !(canvasSize.width > 0) || !(canvasSize.height > 0)) return null;
    const { width, height } = canvasSize;
    const { framePoints, stringer, centre } = built.board;
    const deck = stringer.deck.map((p): Vec3 => [p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]]);
    const lens = bayLens(framePoints, seat, width / height);
    return { ...firstViewOutline(framePoints, deck, lens, seat, width, height), width, height };
  }, [loading, built, seat, canvasSize]);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoadingSlow(true), LOADING_LINE_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setLoadingSlow(false);
    };
  }, [loading]);

  return (
    <DesignScreenShell
      wideView={wideView}
      controls={
        <ThreeDControls
          onView={onView}
          onReset={() => onReset()}
          modeSwitch={<ThreeDModeSwitch mode={dragMode} onMode={onMode} disabled={message !== null || !roomOn} />}
          sightAlong={<ThreeDSightAlong store={rackStore} onSight={onSight} disabled={message !== null} />}
          drawingUnavailable={message !== null}
          exportState={exportState}
          onExport={onExport}
        >
          <ThreeDOnTheRacks
            store={rackStore}
            seat={seat}
            onFlip={onFlip}
            onRaise={onRaise}
            onRoll={onRoll}
            onSwing={onSwing}
            disabled={message !== null}
          />
          <ThreeDTailRail />
        </ThreeDControls>
      }
      canvas={
        <TabbedPanel
          bare={wideView}
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
              data-mode={dragMode}
              data-bay={roomOn ? "on" : "off"}
              aria-busy={state === "loading" ? true : undefined}
              onKeyDown={onKeyDown}
              onPointerDown={message ? undefined : onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={(event) => endDrag(event, true)}
              onPointerCancel={(event) => endDrag(event, false)}
              onLostPointerCapture={(event) => endDrag(event, false)}
              onDoubleClick={message ? undefined : backToOne}
              // Right-drag slides the board, so the right-click menu (`contextmenu`) is kept off the drawing — only here.
              onContextMenu={(event) => event.preventDefault()}
              className="focus-ring-accent absolute inset-0 cursor-grab touch-none overflow-hidden rounded-md bg-[var(--surf-3d-ground)] coarse:cursor-auto"
            />
            {/* Replaced by the lit board in the same render the scene reports it drawn: no fade (§9 step 4). */}
            {loading && <LoadingPicture art={loadingArt} slow={loadingSlow} />}
            {message && <CanvasMessage line1={message.line1} line2={message.line2} />}
            {/* The corner toolbar (UI-SPEC §4, D-35), there from the first paint: on a computer and a sideways phone,
                Wide view — exactly TEMPLATE's button — then the switches for what the picture includes; on an upright
                phone, which has no sidebar to hide, those switches alone, packed into the corner. No Rotate button
                (D-04). */}
            <ViewerToolbar>
              <ViewerToolbarButton
                onClick={() => setWideView(!wideView)}
                pressed={wideView}
                label={wideView ? "Show the sidebar" : "Hide the sidebar for a wider view"}
                title={wideView ? "Show the sidebar" : "Wide view"}
                className="max-shell:hidden"
              >
                {wideView ? <PanelLeftOpenIcon className="size-6" /> : <PanelLeftCloseIcon className="size-6" />}
              </ViewerToolbarButton>
              <ThreeDShowButtons
                showFins={showFins}
                onShowFins={setShowFins}
                showBlank={showBlank}
                onShowBlank={setShowBlank}
                hasBlank={ghost !== null}
                stripes={stripes}
                onStripes={(on) => setLook(on ? "stripes" : "shaded")}
                wire={wire}
                onWire={(on) => setLook(on ? "wire" : "shaded")}
                room={roomOn}
                onRoom={setRoomPick}
                disabled={message !== null}
              />
            </ViewerToolbar>
            {/* The zoom row every drawing has (UI-SPEC §4): under the corner toolbar at every width, since the corner
                always holds the switches (D-35). */}
            {zoomable && (
              <ViewerZoomRow
                zoom={zoomRow.zoom}
                maxZoom={DEFAULT_MAX_ZOOM}
                atOne={zoomRow.atOne}
                onStep={onZoomStep}
                onReset={backToOne}
                placement="under-toolbar"
              />
            )}
            {/* For a screen reader (UI-SPEC §13): how to move the board, and — always in the page, empty until a
                view is picked — which view it is now. Turning by hand is never announced. */}
            <p id={descriptionId} className="sr-only">
              {dragMode === "walk" ? THREE_D_COPY.canvasDescriptionWalk : THREE_D_COPY.canvasDescription}
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
