"use client";

/**
 * Zooming a drawing viewer (quick 261007-fnz, 2026-10-07). The founder's brief: "Build and show me
 * the Rocker window first, then apply the same component to the others without re-implementing
 * anything per viewer." So this module is the one place the zoom lives — the level, the pan, every
 * way in and out, and the small control that shows the level — and each viewer only wires it.
 *
 * - `ViewerZoomProvider` owns the level and the pan, in component state only: never in the design
 *   store, never in the browser's storage, never in a saved board (D2). A caller starts again at 1x
 *   by changing the provider's React `key` (ROCKER keys it on the board's orientation, P9).
 * - `useViewerZoom` turns that state into the svg's `viewBox` and listens for the wheel.
 * - `ViewerZoomControl` shows the level under the toolbar icons (P2).
 *
 * Outside a provider every hook here returns zoom 1 and the viewer's own base `viewBox` string,
 * untouched, and listens to nothing — which is how the Summary order form's ROCKER box, drawn by
 * the same viewer, prints exactly as before (D11).
 *
 * The maths (where the view sits, how the wheel steps) is all in `zoom-math.ts`, tested on its own
 * (D10); this file only connects it to the screen.
 */

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";
import { useSvgClientSize } from "@/components/viewer/callout-primitives";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MAX_ZOOM,
  formatViewBox,
  formatZoomLevel,
  normaliseWheelDelta,
  parseViewBox,
  stepZoom,
  wheelStep,
  zoomAt,
  zoomedView,
  type ClientSize,
  type ViewRect,
  type ZoomState,
  type WheelAccumulator,
} from "./zoom-math";

const AT_ONE: ZoomState = { zoom: 1, center: null };

/** The drawing's base frame and its laid-out box. */
interface ZoomGeometry {
  base: ViewRect;
  client: ClientSize;
}

/**
 * The provider's one long-lived object, for the input listeners that run between renders (a burst
 * of wheel events, a pinch): it always holds the latest state, so the next event in the same frame
 * builds on this one, and it holds the drawing's geometry so the control's buttons zoom with
 * exactly the clamp the drawing uses.
 */
interface ZoomController {
  get(): ZoomState;
  apply(next: ZoomState): void;
  geometry(): ZoomGeometry | null;
  setGeometry(g: ZoomGeometry | null): void;
  maxZoom(): number;
  setMaxZoom(z: number): void;
}

function createController(setState: Dispatch<SetStateAction<ZoomState>>): ZoomController {
  let current = AT_ONE;
  let geometry: ZoomGeometry | null = null;
  let max = DEFAULT_MAX_ZOOM;
  return {
    get: () => current,
    apply(next) {
      if (current.zoom === next.zoom && current.center?.x === next.center?.x && current.center?.y === next.center?.y) {
        current = next; // keep the newest anchor, nothing on screen changes
        return;
      }
      current = next;
      setState(next);
    },
    geometry: () => geometry,
    setGeometry(g) {
      geometry = g;
    },
    maxZoom: () => max,
    setMaxZoom(z) {
      max = z;
    },
  };
}

interface ZoomContextValue {
  state: ZoomState;
  maxZoom: number;
  controller: ZoomController;
}

const ZoomContext = createContext<ZoomContextValue | null>(null);

/** Holds one viewer's zoom (D2). Change its `key` to go back to 1x. */
export function ViewerZoomProvider({ maxZoom = DEFAULT_MAX_ZOOM, children }: { maxZoom?: number; children: ReactNode }) {
  const [state, setState] = useState<ZoomState>(AT_ONE);
  const [controller] = useState(() => createController(setState));
  useLayoutEffect(() => {
    controller.setMaxZoom(maxZoom);
  }, [controller, maxZoom]);
  const value = useMemo(() => ({ state, maxZoom, controller }), [state, maxZoom, controller]);
  return <ZoomContext.Provider value={value}>{children}</ZoomContext.Provider>;
}

/** A pointer's place in the svg's own laid-out box, in CSS pixels. */
function pointInBox(svg: SVGSVGElement, client: ClientSize, clientX: number, clientY: number) {
  const rect = svg.getBoundingClientRect();
  const sx = rect.width > 0 ? client.width / rect.width : 1;
  const sy = rect.height > 0 ? client.height / rect.height : 1;
  return { x: (clientX - rect.left) * sx, y: (clientY - rect.top) * sy };
}

export interface ViewerZoom {
  zoom: number;
  /** `1 / zoom`: what a raw drawing size is multiplied by to keep its screen size. */
  zoomUnit: number;
  /** The svg's `viewBox`: the base string itself at 1x, never re-formatted. */
  viewBox: string;
  /** The part of the frame on screen, in the drawing's own units. */
  view: ViewRect | null;
}

/**
 * Wires one svg to the nearest `ViewerZoomProvider`. `baseViewBox` is the viewer's own frame; the
 * returned `viewBox` is that string untouched at 1x and the zoomed rectangle above it.
 */
export function useViewerZoom(svgRef: RefObject<SVGSVGElement | null>, baseViewBox: string): ViewerZoom {
  const ctx = useContext(ZoomContext);
  const client = useSvgClientSize(svgRef);
  const base = useMemo(() => parseViewBox(baseViewBox), [baseViewBox]);
  const state = ctx?.state ?? AT_ONE;
  const zoom = state.zoom;
  const view = base ? zoomedView(base, client, state) : null;
  const viewBox = view && base && view !== base ? formatViewBox(view) : baseViewBox;

  const controller = ctx?.controller ?? null;
  useLayoutEffect(() => {
    controller?.setGeometry(base ? { base, client } : null);
  }, [controller, base, client]);

  // One native wheel listener, not React's `onWheel`: React 19 attaches wheel listeners as passive,
  // so its handler cannot stop the page scrolling under the drawing (M4). Plain wheel steps half a
  // level per notch toward the pointer (D7, P6).
  useEffect(() => {
    const svg = svgRef.current;
    if (!controller || !svg) return;
    let acc: WheelAccumulator = { sum: 0, lastMs: Number.NEGATIVE_INFINITY };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const g = controller.geometry();
      if (!g) return;
      const p = pointInBox(svg, g.client, event.clientX, event.clientY);
      const delta = normaliseWheelDelta(event.deltaY, event.deltaMode, window.innerHeight);
      const step = wheelStep(acc, delta, event.timeStamp);
      acc = step.acc;
      if (step.steps === 0) return;
      const current = controller.get();
      const next = stepZoom(current.zoom, step.steps, controller.maxZoom());
      if (next === current.zoom) return;
      controller.apply(zoomAt(g.base, g.client, current, next, p.x, p.y));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [controller, svgRef]);

  return { zoom, zoomUnit: 1 / zoom, viewBox, view };
}

/**
 * The zoom level, in its own small row under the toolbar's icons (P2): measured inside the icon
 * row it ran under ROCKER's blank-from-above picture. `corner` is for a viewer with no icon row.
 */
export function ViewerZoomControl({ placement = "under-toolbar" }: { placement?: "under-toolbar" | "corner" }) {
  const ctx = useContext(ZoomContext);
  if (!ctx) return null;
  const { zoom } = ctx.state;
  return (
    <div
      data-viewer-zoom
      role="group"
      aria-label="Zoom"
      className={cn(
        "absolute right-0 z-10 flex flex-row-reverse items-center gap-1",
        placement === "corner" ? "top-0" : "top-10",
      )}
    >
      <div
        data-zoom-level={String(zoom)}
        aria-live="polite"
        className="flex h-[34px] min-w-12 flex-none items-center justify-center rounded-md border border-surf-line bg-surf-ground px-2 text-sm font-semibold tabular-nums text-surf-ink-muted"
      >
        {formatZoomLevel(zoom)}
      </div>
    </div>
  );
}
