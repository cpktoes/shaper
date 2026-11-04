"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BoardNameTab } from "@/components/design/board-name-tab";
import { bandBoardName } from "@/components/design/board-name-copy";
import { DesignScreenShell } from "@/components/design/design-screen-shell";
import { useDesign } from "@/components/design/design-store";
import { TabbedPanel } from "@/components/viewer/tabbed-panel";
import { buildBoardSurface } from "@/lib/geometry/board-surface";
import { renderMesh, stringerLines } from "@/lib/geometry/board-surface-render";
import { designCrossSectionInput } from "@/lib/geometry/design";
import { framePointsOf } from "@/lib/geometry/view-3d";
import type { BoardSceneHandle, BoardSceneInput, BoardSceneState, SceneColours } from "./board-scene";
import { ThreeDControls } from "./three-d-controls";
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
  // What the scene last reported. Each mount's cleanup puts it back to `loading`, and a mount that has gone can
  // no longer report, so a scene that comes back (after the board could not be built and then could again) never
  // shows an old mount's state.
  const [sceneState, setSceneState] = useState<CanvasState>("loading");
  const buildable = built.ok;

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
        const fit = () => handle?.resize(host.clientWidth, host.clientHeight);
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
  }, [buildable]);

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

  return (
    <DesignScreenShell
      controls={<ThreeDControls />}
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
              aria-busy={state === "loading" ? true : undefined}
              className="focus-ring-accent absolute inset-0 touch-none overflow-hidden rounded-md bg-[var(--surf-3d-ground)]"
            />
            {message && <CanvasMessage line1={message.line1} line2={message.line2} />}
          </div>
        </TabbedPanel>
      }
    />
  );
}
